-- COM: the member's own SPACE history. No arbitrary creator/user argument.
-- Minimal metadata only; video and precise coordinates are read by spot_get on SPACE.
create or replace function public.my_spaces(
  p_before timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 30
) returns jsonb
language plpgsql stable security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_n integer := greatest(1, least(coalesce(p_limit, 30), 100));
  v_result jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'why', 'signin');
  end if;
  with page as materialized (
    select p.spot_id, p.habit, p.visibility, p.starts_at, p.duration_min, p.place, p.city
    from public.spot_plans p
    where p.user_id = v_uid and p.status = 'published'
      and (p_before is null or p.starts_at < p_before
           or p.starts_at = p_before and p_before_id is not null and p.spot_id < p_before_id)
    order by p.starts_at desc, p.spot_id desc
    limit v_n + 1
  ), visible as (
    select * from page order by starts_at desc, spot_id desc limit v_n
  )
  select jsonb_build_object(
    'ok', true,
    'spaces', coalesce((select jsonb_agg(jsonb_build_object(
      'id', spot_id, 'habit', habit, 'visibility', visibility,
      'starts_at', starts_at, 'ends_at', starts_at + make_interval(mins => duration_min),
      'place', place, 'city', city
    ) order by starts_at desc, spot_id desc) from visible), '[]'::jsonb),
    'more', exists(select 1 from page offset v_n)
  ) into v_result;
  return v_result;
end
$function$;
revoke all on function public.my_spaces(timestamptz, uuid, integer) from public, anon, authenticated;
grant execute on function public.my_spaces(timestamptz, uuid, integer) to authenticated;
comment on function public.my_spaces(timestamptz, uuid, integer) is 'Paginated owner-only SPACE metadata for COM. auth.uid() determines ownership; no video or precise coordinates.';
