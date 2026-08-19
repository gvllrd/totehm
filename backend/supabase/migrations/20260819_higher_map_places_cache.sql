-- ════════════════════════════════════════════════════════════════
-- TOTEHM · 2026-08-19 · higher_map_places_cache
-- DÉJÀ APPLIQUÉE EN PRODUCTION (abujjbkbbiumxrokozph).
-- Ce fichier existe pour que le repo dise la vérité, pas pour être
-- rejoué. Il est idempotent si tu dois le rejouer sur une branche.
--
-- Doctrine : on paie un lieu UNE fois, on l'interroge à l'infini.
-- ════════════════════════════════════════════════════════════════

-- 1. UN SEUL TOTEHM PAR MEMBRE ------------------------------------
-- cloudSave() faisait delete+insert : une course entre deux onglets
-- a créé un doublon. maybeSingle() renvoyait alors une erreur, donc
-- zéro intention, donc une carte vide.
delete from public.totehms a
using public.totehms b
where a.user_id = b.user_id
  and (a.updated_at, a.id) < (b.updated_at, b.id);

create unique index if not exists totehms_user_id_uniq
  on public.totehms(user_id);

-- 2. PLACES — le cache Google ------------------------------------
create table if not exists public.places (
  place_id      text primary key,
  name          text not null,
  intentions    text[] not null default '{}',
  lieu_type     text,
  address       text,
  lat           double precision not null,
  lng           double precision not null,
  rating        numeric,
  user_ratings  integer,
  first_seen    timestamptz not null default now(),
  refreshed_at  timestamptz not null default now()
);

create index if not exists places_earth_idx
  on public.places using gist (ll_to_earth(lat, lng));
create index if not exists places_intentions_idx
  on public.places using gin (intentions);

alter table public.places enable row level security;

-- 3. PLACES_CELLS — quelles cellules ont déjà été balayées --------
-- cell = lat/lng arrondis à 2 décimales ≈ 1,1 km × 0,87 km
create table if not exists public.places_cells (
  cell       text not null,
  intention  text not null,
  swept_at   timestamptz not null default now(),
  found      integer not null default 0,
  primary key (cell, intention)
);
alter table public.places_cells enable row level security;

-- 4. PLACES_BUDGET — plafond de dépense Google, par jour ---------
create table if not exists public.places_budget (
  day    date primary key,
  calls  integer not null default 0
);
alter table public.places_budget enable row level security;

-- Aucune policy sur ces trois tables : seul service_role y accède,
-- et service_role contourne RLS. anon et authenticated ne voient rien.

-- ════════════════════════════════════════════════════════════════
-- places_budget_take : incrémente si sous le plafond.
-- Renvoie true si l'appel Google est autorisé.
-- C'est le seul garde-fou entre un bug et une facture à 3 000 €.
-- ════════════════════════════════════════════════════════════════
create or replace function public.places_budget_take(p_max integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_calls integer;
begin
  insert into public.places_budget(day, calls) values (current_date, 0)
  on conflict (day) do nothing;

  update public.places_budget
     set calls = calls + 1
   where day = current_date and calls < p_max
  returning calls into v_calls;

  return v_calls is not null;
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- places_near : spots éditoriaux + places Google, fusionnés,
-- filtrés par intention, triés par distance réelle.
-- Une seule requête indexée. Zéro appel externe.
-- Les spots passent devant : un lieu écrit vaut mieux qu'un lieu
-- scrapé.
-- ════════════════════════════════════════════════════════════════
create or replace function public.places_near(
  p_lat        double precision,
  p_lng        double precision,
  p_radius     integer,
  p_intentions text[],
  p_limit      integer default 60
)
returns table (
  source       text,
  ref          text,
  name         text,
  intention    text,
  lieu_type    text,
  why          text,
  lat          double precision,
  lng          double precision,
  dist_m       integer,
  duration_min integer
)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select 'spot'::text          as source,
           s.id::text            as ref,
           s.activite            as name,
           s.intention           as intention,
           s.lieu_type           as lieu_type,
           s.commentaire         as why,
           s.lat, s.lng,
           earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng))::integer as dist_m,
           s.duration_min,
           0 as rank_tier
      from public.spots s
     where s.active and s.is_public
       and s.lat is not null and s.lng is not null
       and s.intention = any(p_intentions)
       and (s.expires_at is null or s.expires_at > now())
       and earth_box(ll_to_earth(p_lat, p_lng), p_radius) @> ll_to_earth(s.lat, s.lng)

    union all

    select 'place'::text,
           p.place_id,
           p.name,
           i.intention,
           p.lieu_type,
           p.address,
           p.lat, p.lng,
           earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(p.lat, p.lng))::integer,
           null::integer,
           1
      from public.places p
      cross join lateral unnest(p.intentions) as i(intention)
     where i.intention = any(p_intentions)
       and earth_box(ll_to_earth(p_lat, p_lng), p_radius) @> ll_to_earth(p.lat, p.lng)
  )
  select source, ref, name, intention, lieu_type, why, lat, lng, dist_m, duration_min
    from mine
   order by rank_tier, dist_m
   limit p_limit;
$$;

revoke all on function public.places_near(double precision, double precision, integer, text[], integer) from public, anon, authenticated;
revoke all on function public.places_budget_take(integer) from public, anon, authenticated;
