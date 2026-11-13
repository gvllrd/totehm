-- [COM] Read-only locators for explicit practice preparation. IDs are never credentials.
-- Native site authentication or the verified linked Telegram identity owns every read.
create function public.tracking_practice_for_me(p_outcome bigint)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=auth.uid(); h text;
begin
  if u is null then return jsonb_build_object('ok',false); end if;
  select o.habit_text into h from public.habit_outcomes o
    where o.id=p_outcome and o.user_id=u and o.asked_at>now()-interval '7 days'
      and exists(select 1 from public.tracking_habits(u) x where x.habit=o.habit_text);
  if h is null then return jsonb_build_object('ok',false); end if;
  return jsonb_build_object('ok',true,'habit',h);
end $$;

create function public.tracking_practice_target(p_telegram bigint,p_outcome bigint)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid; h text;
begin
  if p_telegram is null or p_telegram<=0 then return jsonb_build_object('ok',false); end if;
  select id into u from public.profiles where telegram_id=p_telegram;
  if u is null then return jsonb_build_object('ok',false); end if;
  select o.habit_text into h from public.habit_outcomes o
    where o.id=p_outcome and o.user_id=u and o.asked_at>now()-interval '7 days'
      and exists(select 1 from public.tracking_habits(u) x where x.habit=o.habit_text);
  if h is null then return jsonb_build_object('ok',false); end if;
  return jsonb_build_object('ok',true,'habit',h,'user_id',u);
end $$;
revoke all on function public.tracking_practice_for_me(bigint),public.tracking_practice_target(bigint,bigint) from public,anon,authenticated;
grant execute on function public.tracking_practice_for_me(bigint) to authenticated,service_role;
grant execute on function public.tracking_practice_target(bigint,bigint) to service_role;
