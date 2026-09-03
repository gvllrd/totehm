-- ══ places_matching_habits — LE RADAR CLASSE PAR CORRESPONDANCE ══
--
-- La promesse : les cartes du radar ne sont plus filtrées par intention
-- (« tout ce qui touche à FIGHT »), elles sont **classées** par match
-- entre chaque lieu et LES habitudes du membre pour cette intention.
--
--     habit "5h squat rack solo"       →  Ginásio 24h avec rack isolé
--     habit "trail 15km dimanche"      →  Trail Sintra dénivelé
--     habit "sparring Muay Thai jeudi" →  Dojo combat rings
--
-- Cosine similarity entre `places.embedding` et l'embedding de chaque
-- habit (calculé côté edge function, passé ici en JSONB pour éviter un
-- roundtrip). `rank_tier` = bucketisation en 3 niveaux qui pilote la
-- luminosité du T sur le radar (tier 1 = bright/proche du centre,
-- tier 3 = dim/périphérie).
--
-- Les MEMBER_DROP (spots posés par un membre) court-circuitent toujours
-- le ranking : tier 0, en tête. Un humain a validé ce lieu — ça vaut
-- plus qu'un cosinus.

drop function if exists public.places_matching_habits(
  double precision, double precision, integer, jsonb, boolean, integer);

create function public.places_matching_habits(
  p_lat          double precision,
  p_lng          double precision,
  p_radius       integer,
  p_habits       jsonb,        -- [{intention, text, embedding:[1536 floats]}]
  p_include_club boolean default false,
  p_limit        integer default 30
)
returns table(
  source          text,
  ref             text,
  name            text,
  intention       text,
  kind            text,
  lieu_type       text,
  why             text,
  state_of_mind   text,
  vibe            text,
  tags            text[],
  member_count    integer,
  ends_at         timestamptz,
  lat             double precision,
  lng             double precision,
  dist_m          integer,
  duration_min    integer,
  energy_mode     text,
  score           real,
  matched_habit   text,
  rank_tier       smallint
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with habits as (
    select h->>'intention' as intention,
           h->>'text'      as text,
           (h->>'embedding')::vector(1536) as emb
    from jsonb_array_elements(coalesce(p_habits, '[]'::jsonb)) as h
  ),
  intents as (
    select distinct intention from habits
  ),

  -- SPOTS : passent devant, jamais rankés par similarité
  spot_rows as (
    select
      'spot'::text  as source,
      s.id::text    as ref,
      s.activite    as name,
      s.intention   as intention,
      case when s.user_id    is not null then 'MEMBER_DROP'
           when s.expires_at is not null then 'LIVE_EVENT'
           else 'PLACE' end            as kind,
      s.lieu_type,
      nullif(s.commentaire, '')        as why,
      nullif(s.state_of_mind, '')      as state_of_mind,
      nullif(s.vibe, '')               as vibe,
      s.tags,
      nullif(s.member_count, 0)        as member_count,
      s.expires_at                     as ends_at,
      s.lat, s.lng,
      earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng))::integer as dist_m,
      s.duration_min,
      s.energy_mode,
      null::real                       as score,
      null::text                       as matched_habit,
      0::smallint                      as rank_tier
    from public.spots s
    where s.active
      and (s.is_public or p_include_club)
      and s.lat is not null and s.lng is not null
      and exists (select 1 from intents i where i.intention = s.intention)
      and (s.expires_at is null or s.expires_at > now())
      and earth_box(ll_to_earth(p_lat, p_lng), p_radius) @> ll_to_earth(s.lat, s.lng)
      and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng)) <= p_radius
  ),

  -- PLACES × INTENTIONS : chaque lieu peut porter plusieurs intents.
  -- Pour chaque combinaison (place, intent), on cherche la meilleure habit
  -- du membre POUR CETTE INTENT. Si aucune habit n'existe pour l'intent,
  -- score=null (le lieu passe quand même, tier 3).
  place_candidates as (
    select p.place_id, p.name, p.lieu_type, p.address, p.lat, p.lng,
           p.descriptions, p.embedding,
           i.intention
    from public.places p
    cross join lateral unnest(p.intentions) as i(intention)
    where exists (select 1 from intents x where x.intention = i.intention)
      and earth_box(ll_to_earth(p_lat, p_lng), p_radius) @> ll_to_earth(p.lat, p.lng)
      and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(p.lat, p.lng)) <= p_radius
  ),

  place_scored as (
    select c.*,
           (
             select h.text
             from habits h
             where h.intention = c.intention and c.embedding is not null
             order by c.embedding <=> h.emb asc
             limit 1
           ) as matched_habit,
           (
             select 1.0 - (c.embedding <=> h.emb)
             from habits h
             where h.intention = c.intention and c.embedding is not null
             order by c.embedding <=> h.emb asc
             limit 1
           )::real as score_raw
    from place_candidates c
  ),

  -- Bucket en 3 tiers via percentile intra-intention. Sans embedding =
  -- tier 3 par défaut (le lieu apparaît quand même, en périphérie).
  -- ntile(3) partition les places de chaque intention en 3 buckets
  -- par score décroissant : 1 = top tercile, 2 = moyen, 3 = bas.
  -- Sans embedding = 3 par défaut (le lieu apparaît, mais en périphérie).
  place_ranked as (
    select ps.*,
           case
             when ps.score_raw is null then 3::smallint
             else ntile(3) over (
               partition by ps.intention
               order by ps.score_raw desc
             )::smallint
           end as rank_tier
    from place_scored ps
  ),

  place_rows as (
    select
      'place'::text                       as source,
      pr.place_id                         as ref,
      pr.name                             as name,
      pr.intention                        as intention,
      'PLACE'::text                       as kind,
      pr.lieu_type,
      coalesce(nullif(pr.descriptions->>pr.intention, ''), nullif(pr.address, '')) as why,
      null::text                          as state_of_mind,
      null::text                          as vibe,
      null::text[]                        as tags,
      null::integer                       as member_count,
      null::timestamptz                   as ends_at,
      pr.lat, pr.lng,
      earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(pr.lat, pr.lng))::integer as dist_m,
      null::integer                       as duration_min,
      null::text                          as energy_mode,
      pr.score_raw                        as score,
      pr.matched_habit,
      pr.rank_tier
    from place_ranked pr
  )

  select * from spot_rows
  union all
  select * from place_rows
  order by rank_tier asc, score desc nulls last, dist_m asc
  limit p_limit;
$function$;

revoke all on function public.places_matching_habits(
  double precision, double precision, integer, jsonb, boolean, integer)
  from public, anon;
grant execute on function public.places_matching_habits(
  double precision, double precision, integer, jsonb, boolean, integer)
  to service_role;

comment on function public.places_matching_habits(
  double precision, double precision, integer, jsonb, boolean, integer) is
  'Radar TOTEHM : classe places par correspondance semantique avec les
   habitudes du membre. p_habits = JSON array {intention, text, embedding}.
   Renvoie rank_tier (0=MEMBER_DROP top, 1=fit fort, 2=fit moyen, 3=fit faible
   ou sans embedding) + score cosine + matched_habit pour attribution. Les
   spots court-circuitent le ranking (tier 0). places_near reste dispo pour
   l''ancien flow intention-only, mais higher-map bascule sur cette RPC.';
