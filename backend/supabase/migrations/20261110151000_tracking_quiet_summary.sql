-- [COM] One evidence model for the dashboard, Telegram and explicitly shared personal Higher context.
create or replace function public.tracking_summary(p_user uuid,p_days integer default 28,p_now timestamptz default now(),p_habits text[] default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare z text:=public.tracking_settings_for(p_user)->>'timezone'; today date; span integer:=least(90,greatest(7,coalesce(p_days,28))); result jsonb;
begin
  if p_user is null then return jsonb_build_object('ok',false,'why','signin'); end if;
  today:=(p_now at time zone z)::date;
  with
  habits as (select * from public.tracking_habits(p_user) where p_habits is null or habit=any(p_habits) order by ordinal limit 400),
  evidence as (
    select o.id,o.habit_text habit,coalesce(d.period_day,(o.asked_at at time zone z)::date) as day_key,o.asked_at,o.answered_at,
      coalesce(c.status,o.outcome,case when d.period_end>p_now then 'pending' else 'unanswered' end) status,c.barrier,c.energy,c.minutes,
      coalesce(d.status='sent',false) delivery_verified,coalesce(d.status,'legacy') delivery
    from public.habit_outcomes o join habits h on h.habit=o.habit_text
      left join public.tracking_checkins c on c.outcome_id=o.id
      left join lateral (select td.* from public.pushes p join public.tracking_deliveries td on td.push_id=p.id
        where p.outcome_id=o.id order by td.created_at desc limit 1) d on true
    where o.user_id=p_user and (o.source<>'system' or c.status is not null or o.outcome is not null) and coalesce(d.period_day,(o.asked_at at time zone z)::date) between today-span+1 and today and o.asked_at<=p_now
      and (d.status is null or d.status='sent' or c.status is not null or o.outcome is not null)
  ),
  counts as (select count(*) reports,count(*) filter(where status='done') done,
    count(*) filter(where status='partial') partial,count(*) filter(where status='missed') missed,
    count(*) filter(where status='skipped') skipped,count(*) filter(where status='unanswered') unanswered,count(*) filter(where status='pending') pending,
    count(*) filter(where status in ('done','partial','missed')) attempts,
    count(*) filter(where status in ('done','partial','missed','skipped')) answered,
    count(*) filter(where delivery_verified) verified,
    count(*) filter(where energy is not null) energy_reports,
    case when count(energy)>=3 then round(avg(energy),1) else null end energy_mean,
    count(*) filter(where minutes is not null) duration_reports,coalesce(sum(minutes),0) reported_minutes from evidence),
  periods as (select count(*) filter(where day_key>=today-13 and status in ('done','partial','missed')) recent,
    count(*) filter(where day_key>=today-13 and status='done') recent_done,
    count(*) filter(where day_key between today-27 and today-14 and status in ('done','partial','missed')) prior,
    count(*) filter(where day_key between today-27 and today-14 and status='done') prior_done from evidence),
  barriers as (select barrier,count(*) n from evidence where barrier is not null group by barrier),
  per_habit as (
    select h.*,count(e.id) reports,count(e.id) filter(where e.status='done') done,
      count(e.id) filter(where e.status='partial') partial,count(e.id) filter(where e.status='missed') missed,
      count(e.id) filter(where e.status='skipped') skipped,count(e.id) filter(where e.status='unanswered') unanswered,count(e.id) filter(where e.status='pending') pending,
      count(e.id) filter(where e.status in ('done','partial','missed')) attempts
    from habits h left join evidence e on e.habit=h.habit group by h.ordinal,h.habit,h.frequency,h.intentions,h.key
  ),
  days as (select g::date as day_key from generate_series((today-span+1)::timestamp,today::timestamp,interval '1 day') g),
  intentions as (select i,count(*) filter(where e.status='done') done from habits h join evidence e on e.habit=h.habit,
    unnest(h.intentions) i group by i)
  select jsonb_build_object(
    'ok',true,'as_of',p_now,'timezone',z,'today',today,'days_count',span,'source','self_report',
    'source_complete',(select count(*)<=400 from public.tracking_habits(p_user) where p_habits is null or habit=any(p_habits)),
    'period',jsonb_build_object('start',today-span+1,'end',today,'timezone',z,'days',span),
    'coverage',jsonb_build_object('total_habits',(select count(*) from public.tracking_habits(p_user) where p_habits is null or habit=any(p_habits)),
      'observed_habits',(select count(distinct habit) from evidence),'answered',(select answered from counts),
      'delivered',(select verified from counts),'unanswered',(select unanswered from counts),'pending',(select pending from counts),
      'interpretation','Coverage of recorded observations, not all planned practice. Delivery does not prove a notification was displayed or read.'),
    'counts',(select to_jsonb(c) from counts c),
    'trend',(select jsonb_build_object('recent_attempts',recent,'recent_done',recent_done,'previous_attempts',prior,'previous_done',prior_done,
      'state',case when span<28 or recent<3 or prior<3 then 'insufficient'
        when recent_done::numeric/recent-prior_done::numeric/prior>=0.25 then 'more_done'
        when prior_done::numeric/prior-recent_done::numeric/recent>=0.25 then 'fewer_done' else 'similar' end) from periods),
    'barriers',coalesce((select jsonb_agg(jsonb_build_object('kind',barrier,'count',n) order by n desc,barrier) from barriers),'[]'::jsonb),
    'habits',coalesce((select jsonb_agg(jsonb_build_object('ref',h.habit,'key',h.key,'habit',h.habit,'frequency',h.frequency,
      'intentions',h.intentions,'reports',h.reports,'done',h.done,'partial',h.partial,'missed',h.missed,'skipped',h.skipped,
      'unanswered',h.unanswered,'pending',h.pending,'attempts',h.attempts,
      'day_counts',(select jsonb_agg(jsonb_build_object('day',days.day_key,
        'done',(select count(*) from evidence e where e.habit=h.habit and e.day_key=days.day_key and e.status='done'),
        'missed',(select count(*) from evidence e where e.habit=h.habit and e.day_key=days.day_key and e.status='missed'),
        'partial',(select count(*) from evidence e where e.habit=h.habit and e.day_key=days.day_key and e.status='partial'),
        'skipped',(select count(*) from evidence e where e.habit=h.habit and e.day_key=days.day_key and e.status='skipped'),
        'unanswered',(select count(*) from evidence e where e.habit=h.habit and e.day_key=days.day_key and e.status='unanswered'),
        'pending',(select count(*) from evidence e where e.habit=h.habit and e.day_key=days.day_key and e.status='pending')) order by days.day_key) from days),
      'days',(select jsonb_agg(coalesce((select case when bool_or(e.status='done') then 'd'
        when bool_or(e.status='partial') then 'p' when bool_or(e.status='missed') then 'm'
        when bool_or(e.status='skipped') then 's' when bool_or(e.status='pending') then 'w' else 'a' end from evidence e where e.habit=h.habit and e.day_key=days.day_key having count(*)>0),'') order by days.day_key) from days)
      ) order by h.ordinal) from per_habit h),'[]'::jsonb),
    'days',(select jsonb_agg(jsonb_build_object('day',day_key,'done',(select count(*) from evidence e where e.day_key=days.day_key and e.status='done'),
      'attempts',(select count(*) from evidence e where e.day_key=days.day_key and e.status in ('done','partial','missed')),
      'missed',(select count(*) from evidence e where e.day_key=days.day_key and e.status='missed'),
      'pending',(select count(*) from evidence e where e.day_key=days.day_key and e.status='pending'),
      'unanswered',(select count(*) from evidence e where e.day_key=days.day_key and e.status='unanswered')) order by day_key) from days),
    'intentions',coalesce((select jsonb_object_agg(i,jsonb_build_object('done',done)) from intentions),'{}'::jsonb),
    'delivery',jsonb_build_object('failed',(select count(*) from public.tracking_deliveries where user_id=p_user and created_at>=((today-span+1)::timestamp at time zone z) and created_at<=p_now and status='failed'),
      'unconfirmed',(select count(*) from public.tracking_deliveries where user_id=p_user and created_at>=((today-span+1)::timestamp at time zone z) and created_at<=p_now and status in ('reserved','uncertain'))),
    'interpretation','Self-reported observations, not proof of practice. New notifications retain their target date and timezone; historical observations retain the question-date interpretation. A pending target period is not yet unanswered. Day counts preserve every report; legacy day symbols are a lossy compatibility view. A response time is not a practice time. No answer is unknown; skipped is a choice. Multiple intentions can describe the same report. No objective completion is inferred.'
  ) into result;
  return result;
end $$;

revoke all on function public.tracking_summary(uuid,integer,timestamptz,text[]) from public,anon,authenticated;
grant execute on function public.tracking_summary(uuid,integer,timestamptz,text[]) to service_role;
create function public.chatgpt_tracking_period(p_grant uuid,p_days integer default 28,p_habits text[] default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid; result jsonb;
begin
  if p_days is null or p_days not in (7,28) then return jsonb_build_object('available',false,'why','period'); end if;
  select g.user_id into u from public.chatgpt_grants g where g.id=p_grant and g.revoked_at is null
    and g.scope=array['totehm:read']::text[] and g.resource='https://www.totehm.com/mcp';
  if u is null then return jsonb_build_object('available',false,'why','unavailable'); end if;
  if not coalesce((select share_chatgpt from public.tracking_settings where user_id=u),false) then
    return jsonb_build_object('available',false,'why','not_enabled'); end if;
  if p_habits is not null and cardinality(p_habits)>12 then return jsonb_build_object('available',false,'why','filter'); end if;
  result:=public.tracking_summary(u,p_days,now(),p_habits);
  return jsonb_build_object('available',true,'summary',result);
end $$;

revoke all on function public.chatgpt_tracking_period(uuid,integer,text[]) from public,anon,authenticated;
grant execute on function public.chatgpt_tracking_period(uuid,integer,text[]) to service_role;
