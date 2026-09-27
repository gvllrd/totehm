-- ════════════════════════════════════════════════════════════════════
-- 20260928 · TOTEHM.SPACE — YESTERDAY : TOUS LES ANCIENS SPOTS
-- ════════════════════════════════════════════════════════════════════
-- Wah, 28/09 : « La partie YESTERDAY c'est tous les anciens Spots. » Le
-- 27/09 j'y avais mis MON histoire (mes Spots, ceux que j'ai rejoints) :
-- c'était le contenu de l'espace membre, pas celui de la vue. Mon
-- histoire repart dans le coin membre (`my_space`, inchangée) ; la vue de
-- gauche lit désormais ce qui s'est passé AUTOUR de la carte.
--
--   `spots_past(lat, lng, radius, q, limit)` — le miroir de `spots_radar`
--   tourné vers le passé : Spots publiés et TERMINÉS depuis moins d'un an,
--   dans la portée, du plus récent au plus ancien, 60 au plus.
--
--   ⚠️ MÊMES RÈGLES DE LECTURE QUE LE RADAR. Tout le monde voit la
--   position publique arrondie (~110 m / ~1,1 km), l'habitude, les
--   intentions, le mode, le lieu public, la date, les places prises.
--   Le pseudo du créateur, son contexte et son mot : membre ou créateur.
--   Le point exact : créateur ou accepté. La compatibilité : un total,
--   jamais en morceaux (MASTER §38). La recherche par mots suit la même
--   frontière — un invité ne cherche pas dans ce qu'on lui cache.
--
--   `again` dit si CE lecteur peut refaire ce Spot (membre du Club) : la
--   page ne recompose pas le passeport.
--
--   ⚠️ `create or replace` rétablit le GRANT à PUBLIC : les droits sont
--   posés EN FIN de fichier (règle du projet).
--
--   Retour arrière : `drop function public.spots_past(double precision,
--   double precision, integer, text, integer);`

create or replace function public.spots_past(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius integer default 5000,
  p_q text default null,
  p_limit integer default 60)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_f jsonb; v_member boolean; v_res jsonb;
        v_q text := lower(btrim(coalesce(p_q, '')));
        v_r int := greatest(200, least(coalesce(p_radius, 5000), 60000));
begin
  v_f := public._figher(v_uid);
  v_member := coalesce((v_f->>'member')::boolean, false);

  with c as (
    select p.*, s.lat as rlat, s.lng as rlng,
           case when p_lat is null or p_lng is null then null
                else earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng))::int end as dist_m,
           p.starts_at + make_interval(mins => p.duration_min) as ends_at,
           (select pr.pseudo from public.profiles pr where pr.id = p.user_id) as creator
      from public.spot_plans p join public.spots s on s.id = p.spot_id
     where p.status = 'published'
       and p.starts_at + make_interval(mins => p.duration_min) <= now()
       and p.starts_at > now() - interval '365 days'
       and (p_lat is null or p_lng is null or
            (earth_box(ll_to_earth(p_lat, p_lng), v_r) @> ll_to_earth(s.lat, s.lng)
             and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng)) <= v_r))
  ), h as (
    select c.*, lower(concat_ws(' ',
             c.habit, array_to_string(c.intentions, ' '),
             (select string_agg(public._pillar(x), ' ') from unnest(c.intentions) x),
             c.mode, c.venue, replace(coalesce(c.snapshot->>'freq', ''), '_', ' '),
             c.snapshot->'mood'->>'title',
             case when c.demo then 'demo' end,
             case when v_member or c.user_id = v_uid then concat_ws(' ',
               c.creator, c.comment,
               (select string_agg(e->>'text', ' ') from jsonb_array_elements(coalesce(c.snapshot->'objectives', '[]'::jsonb)) e),
               (select string_agg(e->>'text', ' ') from jsonb_array_elements(coalesce(c.snapshot->'repulsions', '[]'::jsonb)) e))
             end)) as hay
      from c
  ), f as (
    select h.* from h
     where v_q = ''
        or not exists (select 1 from regexp_split_to_table(v_q, '\s+') w
                        where w <> '' and strpos(h.hay, w) = 0)
     order by h.starts_at desc
     limit greatest(1, least(coalesce(p_limit, 60), 60))
  ), k as (
    select f.*,
           (select count(*) from public.spot_applications a
             where a.spot_id = f.spot_id and a.status = 'accepted')::int as taken,
           (select a.status from public.spot_applications a
             where a.spot_id = f.spot_id and a.user_id = v_uid) as my_status,
           (f.user_id = v_uid) as mine
      from f
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', k.spot_id, 'habit', k.habit, 'intentions', to_jsonb(k.intentions),
      'freq', k.snapshot->>'freq',
      'mode', k.mode, 'venue', k.venue, 'starts_at', k.starts_at, 'ends_at', k.ends_at,
      'duration_min', k.duration_min, 'past', true,
      'lat', k.rlat, 'lng', k.rlng, 'dist_m', k.dist_m,
      'capacity', k.capacity, 'taken', k.taken, 'access', k.access, 'selection', k.selection,
      'mine', k.mine, 'my_status', k.my_status, 'demo', k.demo,
      'mood',     k.snapshot->'mood'->>'title',
      'creator',  case when v_member or k.mine then k.creator end,
      'context',  case when v_member or k.mine then k.snapshot - 'at' end,
      'comment',  case when v_member or k.mine then k.comment end,
      'compat',   k.score,
      'place',    case when k.mine or k.my_status = 'accepted' then k.place end,
      'exact',    case when k.mine or k.my_status = 'accepted'
                       then jsonb_build_object('lat', k.lat, 'lng', k.lng) end,
      'again',    v_member)
    order by k.starts_at desc), '[]'::jsonb)
  into v_res
  from (select k.*,
               case when v_member and not k.mine then public._spot_compat(v_uid, k.spot_id) end as score
          from k) k;

  return jsonb_build_object('member', v_member, 'signed_in', v_uid is not null, 'spots', v_res);
end $function$;

revoke all on function public.spots_past(double precision, double precision, integer, text, integer) from public;
grant execute on function public.spots_past(double precision, double precision, integer, text, integer)
  to anon, authenticated, service_role;
