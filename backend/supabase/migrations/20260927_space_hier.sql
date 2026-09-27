-- ════════════════════════════════════════════════════════════════════
-- 20260927 · TOTEHM.SPACE — YESTERDAY : L'HISTOIRE D'UN MEMBRE
-- ════════════════════════════════════════════════════════════════════
-- Wah, 27/09 : la vue de gauche devient YESTERDAY — « le panel des Spots
-- que j'ai créés et auxquels j'ai participé, avec la possibilité de les
-- remettre en vue par la création d'un nouveau Spot ».
--
--   `my_space()` v4 : mes Spots et mes candidatures remontent sur UN AN
--   (365 jours) au lieu de 30. Rien d'autre ne change — mêmes champs,
--   même forme, mêmes droits. Un Spot se refait à partir de ce qu'on a
--   déjà publié : il faut donc pouvoir le retrouver.
--
--   ⚠️ `create or replace` rétablit le GRANT à PUBLIC : les droits sont
--   redonnés EN FIN de fichier (règle du projet).
--
--   Retour arrière : rejouer `my_space` depuis 20260926_space_monde.sql.

create or replace function public.my_space()
returns jsonb
language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules();
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;
  perform public._spot_expire(v_uid);
  return jsonb_build_object(
    'signed_in', true,
    'limits', jsonb_build_object(
      'upcoming', (select count(*) from public.spot_plans
                    where user_id = v_uid and status = 'published'
                      and starts_at + make_interval(mins => duration_min) > now()),
      'max_upcoming', (v_r->>'max_upcoming')::int),
    'spots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.spot_id, 'habit', p.habit, 'intentions', to_jsonb(p.intentions),
        'starts_at', p.starts_at, 'duration_min', p.duration_min, 'mode', p.mode, 'venue', p.venue,
        'capacity', p.capacity, 'access', p.access, 'selection', p.selection,
        'status', p.status, 'place', p.place, 'comment', p.comment,
        'mood', p.snapshot->'mood'->>'title',
        'live', now() between p.starts_at and p.starts_at + make_interval(mins => p.duration_min),
        'past', now() > p.starts_at + make_interval(mins => p.duration_min),
        'taken',   (select count(*) from public.spot_applications a where a.spot_id = p.spot_id and a.status = 'accepted'),
        'pending', (select count(*) from public.spot_applications a where a.spot_id = p.spot_id and a.status = 'pending'),
        'lat', s.lat, 'lng', s.lng,
        'exact', jsonb_build_object('lat', p.lat, 'lng', p.lng),
        'freq', p.snapshot->>'freq', 'context', p.snapshot - 'at', 'demo', p.demo)
        order by p.starts_at desc)
      from public.spot_plans p join public.spots s on s.id = p.spot_id
     where p.user_id = v_uid and p.starts_at > now() - interval '365 days'), '[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'spot_id', a.spot_id, 'habit', p.habit, 'starts_at', p.starts_at,
        'intentions', to_jsonb(p.intentions), 'freq', p.snapshot->>'freq',
        'pseudo', pr.pseudo, 'compat', a.compat, 'note', a.note, 'at', a.created_at)
        order by a.compat desc nulls last, a.created_at)
      from public.spot_applications a
      join public.spot_plans p on p.spot_id = a.spot_id
      left join public.profiles pr on pr.id = a.user_id
     where p.user_id = v_uid and a.status = 'pending' and p.status = 'published'), '[]'::jsonb),
    'applications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'spot_id', a.spot_id, 'habit', p.habit, 'starts_at', p.starts_at,
        'duration_min', p.duration_min, 'mode', p.mode, 'venue', p.venue, 'status', a.status,
        'spot_status', p.status, 'creator', pr.pseudo,
        'intentions', to_jsonb(p.intentions), 'freq', p.snapshot->>'freq',
        'context', p.snapshot - 'at', 'demo', p.demo, 'capacity', p.capacity,
        'selection', p.selection, 'access', p.access, 'comment', p.comment,
        'mood', p.snapshot->'mood'->>'title',
        'taken', (select count(*) from public.spot_applications x where x.spot_id = p.spot_id and x.status = 'accepted'),
        'lat', s.lat, 'lng', s.lng,
        'place', case when a.status = 'accepted' and p.status = 'published' then p.place end,
        'exact', case when a.status = 'accepted' and p.status = 'published'
                      then jsonb_build_object('lat', p.lat, 'lng', p.lng) end)
        order by p.starts_at desc)
      from public.spot_applications a
      join public.spot_plans p on p.spot_id = a.spot_id
      join public.spots s on s.id = p.spot_id
      left join public.profiles pr on pr.id = p.user_id
     where a.user_id = v_uid and p.starts_at > now() - interval '365 days'), '[]'::jsonb));
end $function$;

revoke all on function public.my_space() from public, anon;
grant execute on function public.my_space() to authenticated, service_role;
