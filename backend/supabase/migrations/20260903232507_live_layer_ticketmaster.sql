-- ═══════════════════════════════════════════════════════════════════════
-- LA COUCHE LIVE — TICKETMASTER, MONDIALE, CACHÉE
-- 03/09/2026
--
-- POURQUOI.
-- La Higher Map répondait « pourquoi ce lieu compte pour toi ». Elle ne
-- répondait pas « qu'est-ce qui se passe ce soir ». Google Maps sans
-- Ticketmaster, c'est une carte de bâtiments : elle ne périme jamais,
-- donc elle ne fait jamais bouger personne.
--
-- MESURÉ AVANT D'ÉCRIRE (logs edge du 03/09/2026) :
--   · eventbrite → 404 sur CHAQUE requête utilisateur. API publique morte
--     depuis 2021, la clé est posée, l'appel part quand même. Supprimé.
--   · songkick / meetup → aucune trace. APIs fermées aux nouveaux comptes
--     (Songkick) ou réservées au plan Pro payant (Meetup). Supprimés.
--   · Ticketmaster Discovery → seule API événementielle mondiale gratuite
--     et ouverte. 5 000 requêtes/jour. C'est la couche LIVE.
--
-- LA DOCTRINE DE COÛT, APPLIQUÉE ICI.
-- L'ancien code appelait quatre APIs à CHAQUE ouverture du radar, sans
-- cache et sans plafond. 1 000 membres × 10 ouvertures/jour = 40 000
-- appels/jour, soit huit fois le quota gratuit — le radar se coupait tout
-- seul au bout d'une heure.
--
-- Ici : une cellule de 0,1° (~11 km), un balayage toutes les 12 h, un
-- plafond quotidien. Une ville = ~4 cellules = 8 appels/jour, quel que
-- soit le nombre de membres qui l'ouvrent. Le deuxième membre d'une ville
-- ne coûte RIEN. Calculer une fois, stocker, interroger à l'infini.
--
-- CE QUI EST STOCKÉ, ET POURQUOI.
-- `intentions[]` et pas `intention` : un concert est Express ET Celebrate.
-- Une ligne par événement, pas une par couple — sinon le même concert
-- apparaît deux fois sur le radar.
-- `embedding` : le même traitement que les places. Le radar CLASSE, il ne
-- filtre pas — un événement doit pouvoir être rangé par correspondance
-- avec l'habitude précise du membre, pas seulement par son intention.
-- ═══════════════════════════════════════════════════════════════════════

-- ── LA TABLE ────────────────────────────────────────────────────────────
create table if not exists public.live_events (
  event_id     text primary key,                    -- 'tm_<id>' — la source est dans le préfixe
  source       text        not null default 'ticketmaster',
  name         text        not null,
  url          text,                                -- la billetterie. C'est l'action.
  image_url    text,
  segment      text,                                -- Music · Sports · Arts & Theatre…
  genre        text,
  intentions   text[]      not null default '{}',   -- déduites du segment/genre, jamais stockées côté API
  venue_name   text,
  city         text,
  country      text,                                -- ISO-2 — la carte est mondiale
  lat          double precision not null,
  lng          double precision not null,
  starts_at    timestamptz,
  ends_at      timestamptz,
  price_min    numeric,
  price_max    numeric,
  currency     text,
  embedding    vector(1536),
  first_seen   timestamptz not null default now(),
  refreshed_at timestamptz not null default now()
);

-- earth_box a besoin de l'index GiST pour ne pas balayer la table entière.
create index if not exists live_events_earth_idx
  on public.live_events using gist (ll_to_earth(lat, lng));
create index if not exists live_events_starts_idx
  on public.live_events (starts_at);
create index if not exists live_events_intentions_idx
  on public.live_events using gin (intentions);

-- IVFFlat cosine, lists=10 : même réglage que places. Au-delà de ~10 000
-- lignes il faudra remonter `lists` — noté dans SYSTEM.md, pas avant.
do $$
begin
  if not exists (select 1 from pg_class where relname = 'live_events_embedding_idx') then
    execute 'create index live_events_embedding_idx on public.live_events
             using ivfflat (embedding vector_cosine_ops) with (lists = 10)';
  end if;
exception when others then
  raise notice 'ivfflat index skipped: %', sqlerrm;
end $$;

-- ── LA CELLULE ──────────────────────────────────────────────────────────
-- 0,1° ≈ 11 km. Volontairement dix fois plus grosse que `places_cells`
-- (0,01°) : le rayon événementiel est de 50 km, une cellule de 1 km y
-- serait absurde — 2 000 balayages pour couvrir une ville.
create table if not exists public.live_cells (
  cell     text primary key,
  swept_at timestamptz not null default now(),
  found    integer     not null default 0
);

-- ── LE PLAFOND ──────────────────────────────────────────────────────────
create table if not exists public.live_budget (
  day   date primary key default current_date,
  calls integer not null default 0
);

alter table public.live_events enable row level security;
alter table public.live_cells  enable row level security;
alter table public.live_budget enable row level security;
-- RLS active, zéro policy : seul `service_role` y accède. Le membre ne
-- lit jamais la table directement — il passe par live_near via l'edge
-- function, qui vérifie l'abonnement. Même modèle que `places`.

revoke all on public.live_events from anon, authenticated;
revoke all on public.live_cells  from anon, authenticated;
revoke all on public.live_budget from anon, authenticated;

-- ── LE COMPTEUR D'APPELS ────────────────────────────────────────────────
-- Copie exacte de places_budget_take : incrémente s'il reste de la place,
-- renvoie false sinon. La décision est en base, jamais dans le process —
-- deux instances edge concurrentes ne peuvent pas doubler le budget.
create or replace function public.live_budget_take(p_max integer)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_calls integer;
begin
  insert into public.live_budget(day, calls) values (current_date, 0)
    on conflict (day) do nothing;

  update public.live_budget
     set calls = calls + 1
   where day = current_date and calls < p_max
  returning calls into v_calls;

  return v_calls is not null;
end;
$function$;

revoke all on function public.live_budget_take(integer) from public, anon, authenticated;
grant execute on function public.live_budget_take(integer) to service_role;

-- ── LE MÉNAGE ───────────────────────────────────────────────────────────
-- Un événement passé n'est pas un événement. On garde deux jours de marge
-- pour les fuseaux et les dates de fin absentes, puis on efface.
create or replace function public.live_events_sweep_expired()
returns integer
language sql
security definer
set search_path to 'public'
as $function$
  with gone as (
    delete from public.live_events
     where coalesce(ends_at, starts_at) < now() - interval '2 days'
    returning 1
  )
  select count(*)::integer from gone;
$function$;

revoke all on function public.live_events_sweep_expired() from public, anon, authenticated;
grant execute on function public.live_events_sweep_expired() to service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- live_near — LE RADAR CLASSE AUSSI LES ÉVÉNEMENTS
--
-- Même contrat que places_matching_habits, à trois colonnes près (url,
-- starts_at, venue). Le classement suit la même règle : cosine similarity
-- entre l'embedding de l'événement et l'habitude du membre pour la même
-- intention, bucketisée en trois terciles.
--
-- Un événement sans embedding tombe en tier 3 — il reste visible. Le
-- radar n'a jamais de trou.
--
-- L'ORDRE FINAL N'EST PAS CELUI DES PLACES. Une place ne périme pas ; un
-- événement, si. À tier et score égaux, c'est la DATE qui tranche, pas la
-- distance : « ce soir à 8 km » vaut mieux que « dans trois semaines à
-- 800 m ».
-- ═══════════════════════════════════════════════════════════════════════
drop function if exists public.live_near(
  double precision, double precision, integer, jsonb, text[], integer, integer);

create function public.live_near(
  p_lat           double precision,
  p_lng           double precision,
  p_radius        integer default 50000,
  p_habits        jsonb   default '[]'::jsonb,   -- [{intention, text, embedding}]
  p_intentions    text[]  default null,          -- fallback quand aucun embedding
  p_limit         integer default 20,
  p_horizon_days  integer default 45
)
returns table(
  source        text,
  ref           text,
  name          text,
  intention     text,
  kind          text,
  lieu_type     text,
  why           text,
  lat           double precision,
  lng           double precision,
  dist_m        integer,
  starts_at     timestamptz,
  ends_at       timestamptz,
  url           text,
  venue         text,
  city          text,
  country       text,
  price_min     numeric,
  price_max     numeric,
  currency      text,
  score         real,
  matched_habit text,
  rank_tier     smallint
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
  -- Les intentions demandées : celles des habits si on en a, sinon la
  -- liste passée en clair. Jamais les deux — une seule source de vérité.
  intents as (
    select distinct intention from habits
    union
    select unnest(coalesce(p_intentions, '{}'::text[]))
  ),

  candidates as (
    select e.event_id, e.name, e.url, e.image_url, e.segment, e.genre,
           e.venue_name, e.city, e.country, e.lat, e.lng,
           e.starts_at, e.ends_at, e.price_min, e.price_max, e.currency,
           e.embedding, i.intention
    from public.live_events e
    cross join lateral unnest(e.intentions) as i(intention)
    where exists (select 1 from intents x where x.intention = i.intention)
      and e.starts_at is not null
      and e.starts_at >= now() - interval '3 hours'   -- commencé il y a peu = encore joignable
      and e.starts_at <= now() + (p_horizon_days || ' days')::interval
      and earth_box(ll_to_earth(p_lat, p_lng), p_radius) @> ll_to_earth(e.lat, e.lng)
      and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(e.lat, e.lng)) <= p_radius
  ),

  scored as (
    select c.*,
           (
             select h.text from habits h
             where h.intention = c.intention and c.embedding is not null
             order by c.embedding <=> h.emb asc limit 1
           ) as matched_habit,
           (
             select 1.0 - (c.embedding <=> h.emb) from habits h
             where h.intention = c.intention and c.embedding is not null
             order by c.embedding <=> h.emb asc limit 1
           )::real as score_raw
    from candidates c
  ),

  ranked as (
    select s.*,
           case when s.score_raw is null then 3::smallint
                else ntile(3) over (partition by s.intention
                                    order by s.score_raw desc)::smallint
           end as rank_tier
    from scored s
  ),

  -- Un événement porte souvent deux intentions (un concert est Express ET
  -- Celebrate). On ne garde que sa MEILLEURE, sinon il occupe deux T sur
  -- le radar et vole une place à un autre événement.
  best as (
    select distinct on (event_id) *
    from ranked
    order by event_id, rank_tier asc, score_raw desc nulls last
  )

  select
    'ticketmaster'::text as source,
    b.event_id           as ref,
    b.name,
    b.intention,
    'LIVE_EVENT'::text   as kind,
    lower(coalesce(nullif(b.genre, ''), nullif(b.segment, ''), 'event')) as lieu_type,
    nullif(b.venue_name, '') as why,
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
$function$;

revoke all on function public.live_near(
  double precision, double precision, integer, jsonb, text[], integer, integer)
  from public, anon, authenticated;
grant execute on function public.live_near(
  double precision, double precision, integer, jsonb, text[], integer, integer)
  to service_role;

comment on function public.live_near(
  double precision, double precision, integer, jsonb, text[], integer, integer) is
  'Couche LIVE du radar TOTEHM. Meme contrat que places_matching_habits +
   url/starts_at/venue/prix. Classe par cosine similarity contre les
   habitudes du membre (rank_tier 1-3), puis par DATE — un evenement
   perime, une place non. Un evenement multi-intentions n''apparait
   qu''une fois. service_role uniquement : l''abonnement est verifie dans
   higher-map, jamais ici.';

-- ═══════════════════════════════════════════════════════════════════════
-- LE TROU LAISSÉ OUVERT LE 29/08 — profiles.telegram_id vs `anon`
--
-- Le lot du 29/08 a retiré `telegram_id` des GRANT de `authenticated`.
-- Il ne l'a PAS retiré de `anon`. Mesuré aujourd'hui :
--   SELECT(telegram_id)->anon · UPDATE(telegram_id)->anon · INSERT(...)->anon
--
-- Aucune policy RLS ne vise `anon` sur `profiles` aujourd'hui, donc le
-- trou n'est pas exploitable EN L'ÉTAT. Il le devient à la seconde où
-- quelqu'un ajoute une policy de lecture publique — et une policy se pose
-- en une ligne, sans penser aux GRANT. On ferme la porte, pas seulement
-- le couloir.
-- ═══════════════════════════════════════════════════════════════════════
revoke select, insert, update on public.profiles from anon;
grant  select (id, pseudo, created_at, verified, nft_holder) on public.profiles to anon;
