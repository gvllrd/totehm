-- ════════════════════════════════════════════════════════════════
-- TOTEHM · 2026-08-19 · places_near — unified spot model + rayon réel
-- DÉJÀ APPLIQUÉE EN PRODUCTION (abujjbkbbiumxrokozph).
-- Versionnée pour l'historique, idempotente si rejouée.
--
-- 1. Le kind se DÉDUIT, il ne se stocke pas :
--      user_id renseigné    → MEMBER_DROP
--      expires_at renseigné → LIVE_EVENT
--      sinon                → PLACE
--    Une colonne `kind` devrait être tenue cohérente à chaque
--    écriture ; un spot marqué LIVE_EVENT sans date de fin serait un
--    mensonge que rien n'empêche. Déduit, c'est vrai par construction.
--
-- 2. CORRECTION DU RAYON. earth_box est une BOÎTE, pas un cercle :
--    dans les coins elle laissait passer jusqu'à √2 × rayon, soit
--    5 657 m pour un rayon annoncé à 4 000. Mesuré avant correction :
--    des spots à 5 033 m étaient servis, et l'échelle du radar était
--    calculée dessus. earth_box reste en tête pour l'index GiST,
--    earth_distance tranche derrière.
--
-- 3. p_places : interrupteur du cache Google, coupé côté Edge Function.
-- ════════════════════════════════════════════════════════════════

drop function if exists public.places_near(double precision, double precision, integer, text[], integer);

create or replace function public.places_near(
  p_lat        double precision,
  p_lng        double precision,
  p_radius     integer,
  p_intentions text[],
  p_limit      integer default 60,
  p_places     boolean default true
)
returns table (
  source        text,
  ref           text,
  name          text,
  intention     text,
  kind          text,
  lieu_type     text,
  why           text,
  state_of_mind text,
  vibe          text,
  tags          text[],
  member_count  integer,
  ends_at       timestamptz,
  lat           double precision,
  lng           double precision,
  dist_m        integer,
  duration_min  integer
)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    -- Les spots éditoriaux passent devant : un lieu écrit vaut plus
    -- qu'un lieu trouvé.
    select 'spot'::text  as source,
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
           0 as rank_tier
      from public.spots s
     where s.active and s.is_public
       and s.lat is not null and s.lng is not null
       and s.intention = any(p_intentions)
       and (s.expires_at is null or s.expires_at > now())
       and earth_box(ll_to_earth(p_lat, p_lng), p_radius) @> ll_to_earth(s.lat, s.lng)
       and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng)) <= p_radius

    union all

    select 'place'::text,
           p.place_id, p.name, i.intention, 'PLACE'::text, p.lieu_type,
           nullif(p.address, ''),
           null::text, null::text, null::text[], null::integer, null::timestamptz,
           p.lat, p.lng,
           earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(p.lat, p.lng))::integer,
           null::integer,
           1
      from public.places p
      cross join lateral unnest(p.intentions) as i(intention)
     where p_places
       and i.intention = any(p_intentions)
       and earth_box(ll_to_earth(p_lat, p_lng), p_radius) @> ll_to_earth(p.lat, p.lng)
       and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(p.lat, p.lng)) <= p_radius
  )
  select source, ref, name, intention, kind, lieu_type, why, state_of_mind,
         vibe, tags, member_count, ends_at, lat, lng, dist_m, duration_min
    from mine
   order by rank_tier, dist_m
   limit p_limit;
$$;

revoke all on function public.places_near(double precision, double precision, integer, text[], integer, boolean)
  from public, anon, authenticated;
