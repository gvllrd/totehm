-- ══ LES SPOTS DE CLUB DEVIENNENT VISIBLES — POUR LE CLUB ══
--
-- `places_near` filtrait sur `s.active and s.is_public`. Un spot posé en
-- « Club » n'apparaissait donc nulle part : le proposer dans le bot sans
-- ça, c'était offrir un choix qui ne fait rien.
--
-- ⚠️ ON REMPLACE, ON N'AJOUTE PAS. `create or replace` avec un paramètre
-- supplémentaire crée une SURCHARGE, pas un remplacement — et l'appel de
-- `higher-map` à six arguments nommés deviendrait ambigu ; Postgres
-- répondrait « function is not unique » et la carte tomberait. On supprime
-- l'ancienne et on recrée, dans la même transaction.
drop function if exists public.places_near(
  double precision, double precision, integer, text[], integer, boolean);

create function public.places_near(
  p_lat          double precision,
  p_lng          double precision,
  p_radius       integer,
  p_intentions   text[],
  p_limit        integer default 60,
  p_places       boolean default true,
  p_include_club boolean default false   -- ← nouveau, défaut = comportement d'avant
)
returns table(source text, ref text, name text, intention text, kind text,
              lieu_type text, why text, state_of_mind text, vibe text,
              tags text[], member_count integer, ends_at timestamptz,
              lat double precision, lng double precision,
              dist_m integer, duration_min integer)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with mine as (
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
           /* Un spot posé par un membre passe devant un lieu générique :
              c'est une action réelle du Club, pas une adresse. */
           case when s.user_id is not null then 0 else 1 end as rank_tier
      from public.spots s
     where s.active
       and (s.is_public or p_include_club)
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
           2
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
$function$;

-- Le revoke suit le create, jamais l'inverse — leçon de l'audit du 28/08.
revoke all on function public.places_near(
  double precision, double precision, integer, text[], integer, boolean, boolean)
  from public, anon;
grant execute on function public.places_near(
  double precision, double precision, integer, text[], integer, boolean, boolean)
  to service_role;

comment on function public.places_near(
  double precision, double precision, integer, text[], integer, boolean, boolean) is
  'Lieux et spots autour d''un point. p_include_club=true ajoute les spots
   reserves au Club — higher-map ne le passe qu''APRES avoir verifie
   l''abonnement (402). Un spot pose par un membre passe devant un lieu.';
