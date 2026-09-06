-- ═══════════════════════════════════════════════════════════════════════
-- LE RADAR CLASSE, IL NE FILTRE PAS — appliqué à l'intention
--
-- MESURÉ LE 06/09/2026, ET C'EST CE QUI COMMANDE TOUT LE RESTE :
--   « Faire 30 minutes d'exercice physique » → intention `fight` → 0 lieu.
--   Or la base contient TROIS lieux d'entraînement à moins d'un kilomètre :
--     Club 7 (gym) · Holmes Place (gym) · Street Workout Equipment (park)
--   … tous les trois étiquetés `flow`, aucun `fight`.
--
-- POURQUOI : `places.intentions` n'enregistre pas ce QU'EST un lieu, il
-- enregistre QUEL BALAYAGE l'a trouvé. On balaie `flow` (park, pool), Google
-- rend aussi les salles du quartier, et tout le lot hérite de `flow`.
-- Filtrer là-dessus, c'est filtrer sur un accident d'ingestion.
--
-- L'ancienne fonction posait DEUX verrous qui se cumulaient :
--   1. un lieu n'était candidat que si une de ses étiquettes matchait ;
--   2. il n'était comparé qu'aux habitudes de la MÊME étiquette.
-- Une salle `flow` était donc invisible à une habitude `fight`, deux fois.
--
-- CE QUI CHANGE — chaque couleur du Totehm fait UN travail, et un seul :
--   INTENTION   la clé d'INGESTION, et un BONUS au classement. Plus un
--               verrou : un lieu bien noté n'est jamais caché.
--   HABITUDE    la REQUÊTE. C'est le texte du membre, ses mots, qui
--               interroge le monde par similarité sémantique.
--   RÉPULSION   une RÉTROGRADATION, jamais une exclusion. Un lieu qui
--               ressemble à ce qu'on s'interdit part en périphérie du
--               radar — visible, en retrait. « Le radar CLASSE, il ne
--               filtre pas » (CLAUDE.md) : un filtre qui cache en silence
--               fait disparaître de bonnes réponses sans le dire.
--
-- `p_repulsions` a une valeur par défaut : la fonction déployée aujourd'hui
-- continue de marcher sans être redéployée en même temps.
-- ═══════════════════════════════════════════════════════════════════════

-- On DÉPOSE l'ancienne : `create or replace` ne peut changer ni le type
-- de retour ni la signature, et deux surcharges qui ne diffèrent que par
-- un paramètre à défaut sont ambiguës à l'appel.
drop function if exists public.places_matching_habits(
  double precision, double precision, integer, jsonb, boolean, integer);

create or replace function public.places_matching_habits(
  p_lat           double precision,
  p_lng           double precision,
  p_radius        integer,
  p_habits        jsonb,
  p_include_club  boolean default false,
  p_limit         integer default 40,
  p_repulsions    jsonb   default '[]'::jsonb
)
returns table (
  source text, ref text, name text, intention text, kind text,
  lieu_type text, why text, state_of_mind text, vibe text, tags text[],
  member_count integer, ends_at timestamptz, lat double precision,
  lng double precision, dist_m integer, duration_min integer,
  energy_mode text, score real, matched_habit text, rank_tier smallint,
  against text, matched_rank integer
)
language sql
stable
as $$
  with habits as (
    select h->>'intention' as intention,
           h->>'text'      as text,
           (h->>'embedding')::vector(1536) as emb,
           coalesce((h->>'rank')::int, 999) as rank
    from jsonb_array_elements(coalesce(p_habits, '[]'::jsonb)) as h
  ),
  reps as (
    select r->>'text' as text, (r->>'embedding')::vector(1536) as emb
    from jsonb_array_elements(coalesce(p_repulsions, '[]'::jsonb)) as r
    where r ? 'embedding'
  ),

  -- Les spots membres gardent leur priorité absolue : un humain a été là.
  spot_rows as (
    select 'spot'::text as source, s.id::text as ref, s.activite as name,
      s.intention,
      case when s.user_id    is not null then 'MEMBER_DROP'
           when s.expires_at is not null then 'LIVE_EVENT'
           else 'PLACE' end as kind,
      s.lieu_type, nullif(s.commentaire,'') as why,
      nullif(s.state_of_mind,'') as state_of_mind, nullif(s.vibe,'') as vibe,
      s.tags, nullif(s.member_count,0) as member_count,
      s.expires_at as ends_at, s.lat, s.lng,
      earth_distance(ll_to_earth(p_lat,p_lng), ll_to_earth(s.lat,s.lng))::integer as dist_m,
      s.duration_min, s.energy_mode,
      null::real as score, null::text as matched_habit,
      0::smallint as rank_tier, null::text as against, 0 as matched_rank
    from public.spots s
    where s.active
      and (s.is_public or p_include_club)
      and s.lat is not null and s.lng is not null
      and (s.expires_at is null or s.expires_at > now())
      and earth_box(ll_to_earth(p_lat,p_lng), p_radius) @> ll_to_earth(s.lat,s.lng)
      and earth_distance(ll_to_earth(p_lat,p_lng), ll_to_earth(s.lat,s.lng)) <= p_radius
  ),

  -- PLUS DE VERROU : tout ce qui est dans le rayon est candidat. C'est le
  -- classement qui décide, pas une étiquette posée par l'ingestion.
  cand as (
    select p.place_id, p.name, p.lieu_type, p.address, p.lat, p.lng,
           p.descriptions, p.embedding, p.intentions
    from public.places p
    where earth_box(ll_to_earth(p_lat,p_lng), p_radius) @> ll_to_earth(p.lat,p.lng)
      and earth_distance(ll_to_earth(p_lat,p_lng), ll_to_earth(p.lat,p.lng)) <= p_radius
  ),

  -- LA MEILLEURE HABITUDE, toutes intentions confondues. C'est le texte du
  -- membre qui interroge le monde — pas une catégorie Google.
  best as (
    select c.*,
           (select h.text from habits h
             where c.embedding is not null
             order by c.embedding <=> h.emb asc limit 1) as matched_habit,
           (select h.intention from habits h
             where c.embedding is not null
             order by c.embedding <=> h.emb asc limit 1) as matched_intention,
           (select h.rank from habits h
             where c.embedding is not null
             order by c.embedding <=> h.emb asc limit 1) as matched_rank,
           (select 1.0 - (c.embedding <=> h.emb) from habits h
             where c.embedding is not null
             order by c.embedding <=> h.emb asc limit 1)::real as sim,
           -- LA RÉPULSION LA PLUS PROCHE : elle rétrograde, elle n'exclut pas.
           (select r.text from reps r
             where c.embedding is not null
             order by c.embedding <=> r.emb asc limit 1) as near_rep,
           (select 1.0 - (c.embedding <=> r.emb) from reps r
             where c.embedding is not null
             order by c.embedding <=> r.emb asc limit 1)::real as rep_sim
    from cand c
  ),
  scored as (
    select b.*,
           -- L'INTENTION EST UN BONUS, PAS UN VERROU. Un lieu déjà étiqueté
           -- de l'intention de l'habitude trouvée remonte un peu : c'est un
           -- signal faible, on le traite comme tel.
           (coalesce(b.sim,0)
            + case when b.matched_intention = any(b.intentions) then 0.06 else 0 end
           )::real as score_final
    from best b
  ),
  ranked as (
    select s.*,
           case
             -- Ce qui ressemble à une répulsion part en périphérie. Le seuil
             -- est haut (0.82) : on rétrograde sur une ressemblance FORTE,
             -- jamais sur un écho lointain.
             when s.rep_sim is not null and s.rep_sim > 0.82
                  and s.rep_sim > coalesce(s.sim,0) then 3::smallint
             when s.score_final is null then 3::smallint
             else ntile(3) over (order by s.score_final desc)::smallint
           end as tier
    from scored s
  ),
  place_rows as (
    select 'place'::text as source, r.place_id as ref, r.name, 
      coalesce(r.matched_intention, r.intentions[1]) as intention,
      'PLACE'::text as kind, r.lieu_type,
      coalesce(nullif(r.descriptions->>coalesce(r.matched_intention,''),''),
               nullif(r.address,'')) as why,
      null::text, null::text, null::text[], null::integer, null::timestamptz,
      r.lat, r.lng,
      earth_distance(ll_to_earth(p_lat,p_lng), ll_to_earth(r.lat,r.lng))::integer,
      null::integer, null::text,
      r.score_final as score, r.matched_habit, r.tier as rank_tier,
      -- `against` porte la répulsion qui a fait rétrograder : la carte peut
      -- le DIRE au membre au lieu de cacher le lieu sans explication.
      case when r.rep_sim is not null and r.rep_sim > 0.82
                and r.rep_sim > coalesce(r.sim,0) then r.near_rep end as against,
      r.matched_rank
    from ranked r
  )
  select * from spot_rows
  union all
  select * from place_rows
  -- L'ORDRE D'IMPORTANCE TRIE LA CARTE. À classement égal, l'habitude que
  -- le membre a placée en premier passe devant : ce n'est pas la note sur
  -- cinq de Google qui décide, c'est ce qu'il a dit qui comptait le plus.
  order by rank_tier asc, matched_rank asc nulls last, score desc nulls last, dist_m asc
  limit p_limit;
$$;

-- `create or replace` rétablit le GRANT à PUBLIC : tout `revoke` suit le
-- dernier `create`, jamais l'inverse.
revoke all on function public.places_matching_habits(
  double precision, double precision, integer, jsonb, boolean, integer, jsonb) from public;
grant execute on function public.places_matching_habits(
  double precision, double precision, integer, jsonb, boolean, integer, jsonb)
  to anon, authenticated, service_role;
