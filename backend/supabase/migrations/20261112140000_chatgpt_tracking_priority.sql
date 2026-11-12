-- [COM] Respect the saved Habit order in ordinary due selections, with a bounded fairness turn.
-- Existing eligibility, periods, silence pauses, caps, transport and consent stay unchanged.
-- No new table, model call, notification or reclassification of self reports.
create or replace function public.tracking_next(p_user uuid,p_now timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s jsonb:=public.tracking_settings_for(p_user); z text:=s->>'timezone'; hr integer; qf integer; qt integer;
  day_start timestamptz; sent integer; recent timestamptz; ignored integer; h record; gap integer; turns bigint; rotate boolean;
begin
  if (s->>'paused')::boolean then return jsonb_build_object('send',false,'why','paused'); end if;
  if not (s->>'linked')::boolean then return jsonb_build_object('send',false,'why','unlinked'); end if;
  hr:=extract(hour from p_now at time zone z); qf:=(s->>'quiet_from')::integer; qt:=(s->>'quiet_to')::integer;
  if (qf<qt and hr>=qf and hr<qt) or (qf>qt and (hr>=qf or hr<qt)) then return jsonb_build_object('send',false,'why','quiet_hours'); end if;
  day_start:=((p_now at time zone z)::date)::timestamp at time zone z;
  select count(*) filter(where p.sent_at>=day_start),max(p.sent_at),count(*) into sent,recent,turns
    from public.pushes p left join public.tracking_deliveries d on d.push_id=p.id
    where p.user_id=p_user and (d.status is null or d.status in ('reserved','sent','uncertain'));
  if sent >= (s->>'max_daily')::integer then return jsonb_build_object('send',false,'why','max_daily'); end if;
  select greatest(20,least(240,coalesce(min(public._freq_minutes(frequency))/2,240))) into gap from public.tracking_habits(p_user);
  if recent>p_now-make_interval(mins=>gap) then return jsonb_build_object('send',false,'why','min_gap'); end if;
  if exists(select 1 from public.tracking_deliveries where user_id=p_user and status='failed' and created_at>p_now-interval '30 minutes') then
    return jsonb_build_object('send',false,'why','delivery_retry'); end if;
  select count(*) filter(where x.answered_at is null) into ignored from (
    select o.answered_at from public.habit_outcomes o left join public.pushes p on p.outcome_id=o.id
      left join public.tracking_deliveries d on d.push_id=p.id
    where o.user_id=p_user and (o.source<>'system' or o.answered_at is not null) and (d.status is null or d.status='sent') order by o.asked_at desc limit 3) x;
  if ignored>=3 and recent>p_now-interval '7 days' then return jsonb_build_object('send',false,'why','quiet_after_silence','until',recent+interval '7 days'); end if;
  -- Two priority selections, then one fair rotation; caps and due checks above stay authoritative.
  -- Failed deliveries do not spend a turn; reserved/uncertain deliveries prevent duplicate sends.
  rotate := mod(turns,3)=2;
  select hh.*,last.asked into h from public.tracking_habits(p_user) hh
    left join lateral (select max(o.asked_at) asked,
      bool_or(o.answered_at is null and o.asked_at>p_now-interval '36 hours') waiting
      from public.habit_outcomes o left join public.pushes p on p.outcome_id=o.id left join public.tracking_deliveries d on d.push_id=p.id
      where o.user_id=p_user and md5(o.habit_text)=hh.key and o.habit_text=hh.habit and (o.source<>'system' or o.answered_at is not null) and (d.status is null or d.status in ('reserved','sent','uncertain'))) last on true
    where not coalesce(last.waiting,false) and not exists (
      select 1 from public.tracking_deliveries td join public.pushes pp on pp.id=td.push_id
      where td.user_id=p_user and pp.habit_text=hh.habit and td.status in ('reserved','sent','uncertain')
        and td.period_start=(public.tracking_period(hh.frequency,p_now,z)->>'period_start')::timestamptz
        and td.period_end=(public.tracking_period(hh.frequency,p_now,z)->>'period_end')::timestamptz
    ) and public.tracking_due(hh.frequency,last.asked,p_now,z,
      case when qf>qt then greatest(qt,qf-1) else 20 end)
    order by case when not rotate then hh.ordinal end asc nulls last,
      (last.asked is null) desc,
      extract(epoch from (p_now-last.asked))/greatest(1,public._freq_minutes(hh.frequency)) desc nulls first,hh.ordinal limit 1;
  if h.habit is null then return jsonb_build_object('send',false,'why','nothing_due'); end if;
  return jsonb_build_object('send',true,'habit',h.habit,'frequency',h.frequency,'intentions',h.intentions,'timezone',z,
    'selection',jsonb_build_object('basis',case when rotate then 'rotation' else 'totehm_order' end,'rank',h.ordinal,'scope','habits'))||public.tracking_period(h.frequency,p_now,z);
end $$;

revoke all on function public.tracking_next(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.tracking_next(uuid,timestamptz) to service_role;
