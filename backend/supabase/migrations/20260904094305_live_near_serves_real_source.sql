-- ═══════════════════════════════════════════════════════════════════════
-- `live_near` DIT D'OÙ VIENT L'ÉVÉNEMENT
-- 04/09/2026
--
-- La fonction a été écrite hier, quand il n'y avait qu'une source au
-- monde : elle renvoyait `'ticketmaster'::text as source`, en dur.
-- Aujourd'hui `live_events` est aussi alimentée par `agenda-ingest`, qui
-- pose `source = 'lx_<agenda>'`. Une colonne écrite par l'ingestion et
-- ignorée par la lecture, c'est une donnée qui ment : la carte aurait
-- affiché « ticketmaster » sous un concert publié par la mairie de
-- Lisbonne, et l'onglet Tickets aurait promis une billetterie qui
-- n'existe pas.
--
-- ⚠️ RÈGLE GÉNÉRALE, celle qui compte plus que ce correctif : dès qu'une
-- table gagne une deuxième source, tout littéral posé au temps de la
-- source unique devient un bug. On grep les littéraux avant d'ajouter une
-- source, pas après.
--
-- Au passage, `why` (la ligne qui explique pourquoi ce point est là)
-- retombait sur rien quand la source ne donne pas de nom de salle. Elle
-- retombe maintenant sur le `segment` — « Music », « Arts & Theatre » —
-- qui est toujours renseigné. Une carte sans description est une carte
-- qu'on ne clique pas.
--
-- Signature INCHANGÉE : `higher-map` v26 est déployée et appelle cette
-- fonction. Seul le corps bouge.
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.live_near(
  p_lat           double precision,
  p_lng           double precision,
  p_radius        integer default 50000,
  p_habits        jsonb   default '[]'::jsonb,
  p_intentions    text[]  default null,
  p_limit         integer default 20,
  p_horizon_days  integer default 45
)
returns table(
  source text, ref text, name text, intention text, kind text,
  lieu_type text, why text,
  lat double precision, lng double precision, dist_m integer,
  starts_at timestamptz, ends_at timestamptz, url text,
  venue text, city text, country text,
  price_min numeric, price_max numeric, currency text,
  score real, matched_habit text, rank_tier smallint
)
language sql stable security definer set search_path = public as $$
  with habits as (
    select h->>'intention' as intention,
           h->>'text'      as text,
           (h->>'embedding')::vector(1536) as emb
    from jsonb_array_elements(coalesce(p_habits, '[]'::jsonb)) as h
  ),
  intents as (
    select distinct intention from habits
    union
    select unnest(coalesce(p_intentions, '{}'::text[]))
  ),
  candidates as (
    select e.event_id, e.source, e.name, e.url, e.image_url, e.segment, e.genre,
           e.venue_name, e.city, e.country, e.lat, e.lng,
           e.starts_at, e.ends_at, e.price_min, e.price_max, e.currency,
           e.embedding, i.intention
    from public.live_events e
    cross join lateral unnest(e.intentions) as i(intention)
    where exists (select 1 from intents x where x.intention = i.intention)
      and e.starts_at is not null
      -- Trois heures de tolérance : un concert commencé à 21 h se rejoint
      -- encore à 22 h. Couper à `now()` pile, c'est vider la carte au
      -- moment exact où elle sert.
      and e.starts_at >= now() - interval '3 hours'
      and e.starts_at <= now() + (p_horizon_days || ' days')::interval
      -- `earth_box` d'abord : c'est lui qui utilise l'index GiST. La
      -- distance exacte ne filtre ensuite que les coins de la boîte.
      and earth_box(ll_to_earth(p_lat, p_lng), p_radius) @> ll_to_earth(e.lat, e.lng)
      and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(e.lat, e.lng)) <= p_radius
  ),
  scored as (
    select c.*,
           (select h.text from habits h
             where h.intention = c.intention and c.embedding is not null
             order by c.embedding <=> h.emb asc limit 1) as matched_habit,
           (select 1.0 - (c.embedding <=> h.emb) from habits h
             where h.intention = c.intention and c.embedding is not null
             order by c.embedding <=> h.emb asc limit 1)::real as score_raw
    from candidates c
  ),
  ranked as (
    -- Le radar CLASSE, il ne filtre pas : un événement sans embedding
    -- tombe en périphérie (tier 3), il ne disparaît jamais.
    select s.*,
           case when s.score_raw is null then 3::smallint
                else ntile(3) over (partition by s.intention
                                    order by s.score_raw desc)::smallint
           end as rank_tier
    from scored s
  ),
  best as (
    select distinct on (event_id) *
    from ranked
    order by event_id, rank_tier asc, score_raw desc nulls last
  )
  select
    b.source,                       -- ← la vraie source, plus un littéral
    b.event_id as ref,
    b.name,
    b.intention,
    'LIVE_EVENT'::text as kind,
    lower(coalesce(nullif(b.genre, ''), nullif(b.segment, ''), 'event')) as lieu_type,
    coalesce(nullif(b.venue_name, ''), nullif(b.segment, '')) as why,
    b.lat, b.lng,
    earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(b.lat, b.lng))::integer as dist_m,
    b.starts_at, b.ends_at, b.url,
    b.venue_name as venue, b.city, b.country,
    b.price_min, b.price_max, b.currency,
    b.score_raw as score,
    b.matched_habit,
    b.rank_tier
  from best b
  order by b.rank_tier asc, b.score_raw desc nulls last, b.starts_at asc
  limit p_limit;
$$;

-- ⚠️ `create or replace` REND le GRANT à PUBLIC. Le revoke suit toujours
-- le dernier create, jamais l'inverse — c'est l'erreur qui avait exposé
-- `record_push` à `anon`.
revoke all on function public.live_near(double precision, double precision, integer, jsonb, text[], integer, integer)
  from public, anon, authenticated;
grant execute on function public.live_near(double precision, double precision, integer, jsonb, text[], integer, integer)
  to service_role;

comment on function public.live_near(double precision, double precision, integer, jsonb, text[], integer, integer) is
  'Événements live proches, rangés par fit sémantique. Sert la vraie colonne source (ticketmaster ou lx_*). service_role seul : appelée par higher-map et bot-reply.';
