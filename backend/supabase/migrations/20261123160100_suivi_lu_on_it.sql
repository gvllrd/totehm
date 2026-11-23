-- [COM] 23/11/2026 — suite de 20261123160000 : les LECTURES du suivi parlent les mots de Wah.
-- tracking_summary (dashboard, /review de TotehmBot, ChatGPT si share_chatgpt) : on_it · no_time · no_energy · not_on_it ·
-- unanswered · pending ; « answered » = les quatre réponses ; la tendance compare la part de « on it » (more_on_it /
-- fewer_on_it) ; un jour se dit o · t · e · n · w (pending) · a (unanswered).
-- my_board, habit_stats, higherself_state : le résultat binaire on_it / not_on_it (leurs clés JSON ne bougent pas).

create or replace function public.tracking_summary(p_user uuid, p_days integer default 28, p_now timestamp with time zone default now(), p_habits text[] default null::text[])
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
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
  counts as (select count(*) reports,count(*) filter(where status='on_it') on_it,
    count(*) filter(where status='no_time') no_time,count(*) filter(where status='no_energy') no_energy,
    count(*) filter(where status='not_on_it') not_on_it,count(*) filter(where status='unanswered') unanswered,count(*) filter(where status='pending') pending,
    count(*) filter(where status in ('on_it','no_time','no_energy','not_on_it')) answered,
    count(*) filter(where delivery_verified) verified,
    count(*) filter(where energy is not null) energy_reports,
    case when count(energy)>=3 then round(avg(energy),1) else null end energy_mean,
    count(*) filter(where minutes is not null) duration_reports,coalesce(sum(minutes),0) reported_minutes from evidence),
  periods as (select count(*) filter(where day_key>=today-13 and status in ('on_it','no_time','no_energy','not_on_it')) recent,
    count(*) filter(where day_key>=today-13 and status='on_it') recent_on_it,
    count(*) filter(where day_key between today-27 and today-14 and status in ('on_it','no_time','no_energy','not_on_it')) prior,
    count(*) filter(where day_key between today-27 and today-14 and status='on_it') prior_on_it from evidence),
  barriers as (select barrier,count(*) n from evidence where barrier is not null group by barrier),
  per_habit as (
    select h.*,count(e.id) reports,count(e.id) filter(where e.status='on_it') on_it,
      count(e.id) filter(where e.status='no_time') no_time,count(e.id) filter(where e.status='no_energy') no_energy,
      count(e.id) filter(where e.status='not_on_it') not_on_it,count(e.id) filter(where e.status='unanswered') unanswered,count(e.id) filter(where e.status='pending') pending,
      count(e.id) filter(where e.status in ('on_it','no_time','no_energy','not_on_it')) answered
    from habits h left join evidence e on e.habit=h.habit group by h.ordinal,h.habit,h.frequency,h.intentions,h.key
  ),
  days as (select g::date as day_key from generate_series((today-span+1)::timestamp,today::timestamp,interval '1 day') g),
  intentions as (select i,count(*) filter(where e.status='on_it') on_it from habits h join evidence e on e.habit=h.habit,
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
    'trend',(select jsonb_build_object('recent_answered',recent,'recent_on_it',recent_on_it,'previous_answered',prior,'previous_on_it',prior_on_it,
      'state',case when span<28 or recent<3 or prior<3 then 'insufficient'
        when recent_on_it::numeric/recent-prior_on_it::numeric/prior>=0.25 then 'more_on_it'
        when prior_on_it::numeric/prior-recent_on_it::numeric/recent>=0.25 then 'fewer_on_it' else 'similar' end) from periods),
    'barriers',coalesce((select jsonb_agg(jsonb_build_object('kind',barrier,'count',n) order by n desc,barrier) from barriers),'[]'::jsonb),
    'habits',coalesce((select jsonb_agg(jsonb_build_object('ref',h.habit,'key',h.key,'habit',h.habit,'frequency',h.frequency,
      'intentions',h.intentions,'reports',h.reports,'on_it',h.on_it,'no_time',h.no_time,'no_energy',h.no_energy,'not_on_it',h.not_on_it,
      'unanswered',h.unanswered,'pending',h.pending,'answered',h.answered,
      'day_counts',(select jsonb_agg(jsonb_build_object('day',days.day_key,
        'on_it',(select count(*) from evidence e where e.habit=h.habit and e.day_key=days.day_key and e.status='on_it'),
        'no_time',(select count(*) from evidence e where e.habit=h.habit and e.day_key=days.day_key and e.status='no_time'),
        'no_energy',(select count(*) from evidence e where e.habit=h.habit and e.day_key=days.day_key and e.status='no_energy'),
        'not_on_it',(select count(*) from evidence e where e.habit=h.habit and e.day_key=days.day_key and e.status='not_on_it'),
        'unanswered',(select count(*) from evidence e where e.habit=h.habit and e.day_key=days.day_key and e.status='unanswered'),
        'pending',(select count(*) from evidence e where e.habit=h.habit and e.day_key=days.day_key and e.status='pending')) order by days.day_key) from days),
      'days',(select jsonb_agg(coalesce((select case when bool_or(e.status='on_it') then 'o'
        when bool_or(e.status='no_time') then 't' when bool_or(e.status='no_energy') then 'e'
        when bool_or(e.status='not_on_it') then 'n' when bool_or(e.status='pending') then 'w' else 'a' end from evidence e where e.habit=h.habit and e.day_key=days.day_key having count(*)>0),'') order by days.day_key) from days)
      ) order by h.ordinal) from per_habit h),'[]'::jsonb),
    'days',(select jsonb_agg(jsonb_build_object('day',day_key,'on_it',(select count(*) from evidence e where e.day_key=days.day_key and e.status='on_it'),
      'answered',(select count(*) from evidence e where e.day_key=days.day_key and e.status in ('on_it','no_time','no_energy','not_on_it')),
      'not_on_it',(select count(*) from evidence e where e.day_key=days.day_key and e.status in ('no_time','no_energy','not_on_it')),
      'pending',(select count(*) from evidence e where e.day_key=days.day_key and e.status='pending'),
      'unanswered',(select count(*) from evidence e where e.day_key=days.day_key and e.status='unanswered')) order by day_key) from days),
    'intentions',coalesce((select jsonb_object_agg(i,jsonb_build_object('on_it',on_it)) from intentions),'{}'::jsonb),
    'delivery',jsonb_build_object('failed',(select count(*) from public.tracking_deliveries where user_id=p_user and created_at>=((today-span+1)::timestamp at time zone z) and created_at<=p_now and status='failed'),
      'unconfirmed',(select count(*) from public.tracking_deliveries where user_id=p_user and created_at>=((today-span+1)::timestamp at time zone z) and created_at<=p_now and status in ('reserved','uncertain'))),
    'interpretation','Self-reported answers to « am I practising this Habit right now? », not proof of practice: on it · no time · no energy · not on it (an answer without a reason). New notifications retain their target date and timezone. A pending target period is not yet unanswered. No answer is unknown, never a failure. A response time is not a practice time. Multiple intentions can describe the same report. No objective completion is inferred.'
  ) into result;
  return result;
end $function$;

-- le résultat binaire : 'done' → 'on_it', 'missed' → 'not_on_it' dans les trois lectures (corps inchangés par ailleurs)
do $$
declare f text; d text;
begin
  foreach f in array array['public.my_board(text)','public.habit_stats(uuid,text)','public.higherself_state(uuid)'] loop
    d := pg_get_functiondef(f::regprocedure);
    d := replace(d, 'outcome = ''done''', 'outcome = ''on_it''');
    d := replace(d, 'outcome = ''missed''', 'outcome = ''not_on_it''');
    d := replace(d, 'outcome <> ''done''', 'outcome <> ''on_it''');
    if d ~ 'outcome\s*(=|<>|in)\s*\(?''(done|missed)''' then raise exception 'unexpected outcome comparison left in %', f; end if;   -- les CLÉS JSON 'done' restent
    execute d;
  end loop;
end $$;
