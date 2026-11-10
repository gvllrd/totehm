-- [COM] Quiet check-ins retain complete Habit references and immutable target periods.
-- No backfill: existing observations keep their legacy question-date interpretation.
alter table public.tracking_deliveries add column period_start timestamptz,
  add column period_end timestamptz, add column period_day date,
  add column period_label text, add column habit_key text;
create unique index tracking_delivery_occurrence on public.tracking_deliveries(user_id,habit_key,period_start,period_end)
  where status in ('reserved','sent','uncertain') and period_start is not null;

create or replace function public.tracking_habits(p_user uuid)
returns table (ordinal integer, habit text, frequency text, intentions text[], key text)
language sql stable security definer set search_path = '' as $$
  select distinct on(s.item->>'t') s.ord::integer, s.item->>'t', nullif(s.item->>'f',''),
    coalesce(public._step_intentions(s.item),'{}'::text[]), md5(s.item->>'t')
  from (select t.steps from public.totehms t where t.user_id=p_user order by t.updated_at desc nulls last limit 1) t,
    jsonb_array_elements(coalesce(t.steps,'[]'::jsonb)) with ordinality s(item,ord)
  where length(coalesce(s.item->>'t',''))>0
  order by s.item->>'t',s.ord
$$;

create function public.tracking_period(p_frequency text,p_now timestamptz,p_timezone text)
returns jsonb language plpgsql stable set search_path = '' as $$
declare local_at timestamp:=p_now at time zone p_timezone; first_at timestamp; final_at timestamp;
  mins integer:=public._freq_minutes(p_frequency); label text; first_utc timestamptz; final_utc timestamptz;
begin
  if p_frequency='weekly' then
    first_at:=date_trunc('week',local_at);final_at:=first_at+interval '1 week';label:='Week of '||to_char(first_at,'DD Mon YYYY');
  elsif p_frequency='monthly' then
    first_at:=date_trunc('month',local_at);final_at:=first_at+interval '1 month';label:=to_char(first_at,'Mon YYYY');
  elsif p_frequency in ('quarterly','seasonal') then
    first_at:=date_trunc('quarter',local_at);final_at:=first_at+interval '3 months';label:='Quarter starting '||to_char(first_at,'DD Mon YYYY');
  elsif p_frequency='semiannual' then
    first_at:=date_trunc('year',local_at)+case when extract(month from local_at)>6 then interval '6 months' else interval '0 months' end;
    final_at:=first_at+interval '6 months';label:='Six months starting '||to_char(first_at,'DD Mon YYYY');
  elsif p_frequency='yearly' then
    first_at:=date_trunc('year',local_at);final_at:=first_at+interval '1 year';label:=to_char(first_at,'YYYY');
  elsif p_frequency in ('daily','every_morning','every_afternoon','every_evening','every_night','every_weekday','every_weekend',
    'every_monday','every_tuesday','every_wednesday','every_thursday','every_friday','every_saturday','every_sunday','every_birthday','every_newyear') then
    first_at:=date_trunc('day',local_at);final_at:=first_at+interval '1 day';label:=to_char(first_at,'DD Mon YYYY');
  else
    -- Fixed intervals are anchored in UTC, so a repeated DST hour cannot duplicate an occurrence.
    first_utc:=to_timestamp(floor(extract(epoch from p_now)/greatest(60,coalesce(mins,1440)*60))*greatest(60,coalesce(mins,1440)*60));
    final_utc:=first_utc+make_interval(mins=>greatest(1,coalesce(mins,1440)));
    return jsonb_build_object('period_start',first_utc,'period_end',final_utc,'period_day',local_at::date,
      'period_label',to_char(first_utc at time zone p_timezone,'DD Mon YYYY HH24:MI')||' – '||
        to_char(final_utc at time zone p_timezone,'DD Mon YYYY HH24:MI')||' · '||p_timezone);
  end if;
  return jsonb_build_object('period_start',first_at at time zone p_timezone,'period_end',final_at at time zone p_timezone,
    'period_day',local_at::date,'period_label',label||' · '||p_timezone);
end $$;

create or replace function public.tracking_next(p_user uuid,p_now timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s jsonb:=public.tracking_settings_for(p_user); z text:=s->>'timezone'; hr integer; qf integer; qt integer;
  day_start timestamptz; sent integer; recent timestamptz; ignored integer; h record; gap integer;
begin
  if (s->>'paused')::boolean then return jsonb_build_object('send',false,'why','paused'); end if;
  if not (s->>'linked')::boolean then return jsonb_build_object('send',false,'why','unlinked'); end if;
  hr:=extract(hour from p_now at time zone z); qf:=(s->>'quiet_from')::integer; qt:=(s->>'quiet_to')::integer;
  if (qf<qt and hr>=qf and hr<qt) or (qf>qt and (hr>=qf or hr<qt)) then return jsonb_build_object('send',false,'why','quiet_hours'); end if;
  day_start:=((p_now at time zone z)::date)::timestamp at time zone z;
  select count(*) filter(where p.sent_at>=day_start),max(p.sent_at) into sent,recent
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
    order by (last.asked is null) desc,
      extract(epoch from (p_now-last.asked))/greatest(1,public._freq_minutes(hh.frequency)) desc nulls first,hh.ordinal limit 1;
  if h.habit is null then return jsonb_build_object('send',false,'why','nothing_due'); end if;
  return jsonb_build_object('send',true,'habit',h.habit,'frequency',h.frequency,'intentions',h.intentions,'timezone',z)||public.tracking_period(h.frequency,p_now,z);
end $$;

create or replace function public.tracking_claim(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare d jsonb; pid bigint; oid bigint; token uuid; chat bigint;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('tracking:'||p_user::text,0)) then return jsonb_build_object('send',false,'why','busy'); end if;
  d:=public.tracking_next(p_user);
  if not coalesce((d->>'send')::boolean,false) then return d; end if;
  select telegram_id into chat from public.profiles where id=p_user;
  if chat is null then return jsonb_build_object('send',false,'why','unlinked'); end if;
  pid:=public.record_push(p_user,d->>'habit',(d->>'habit')||' — how did it go?',null);
  select outcome_id into oid from public.pushes where id=pid;
  update public.habit_outcomes set intention=d->'intentions'->>0 where id=oid;
  insert into public.tracking_deliveries(push_id,user_id,timezone,frequency,intentions,period_start,period_end,period_day,period_label,habit_key)
    values(pid,p_user,d->>'timezone',d->>'frequency',array(select jsonb_array_elements_text(d->'intentions')),(d->>'period_start')::timestamptz,(d->>'period_end')::timestamptz,(d->>'period_day')::date,d->>'period_label',md5(d->>'habit')) returning lease into token;
  return d||jsonb_build_object('lease',token,'id',oid::text,'chat_id',chat::text);
end $$;

revoke all on function public.tracking_period(text,timestamptz,text),public.tracking_habits(uuid),public.tracking_next(uuid,timestamptz),public.tracking_claim(uuid) from public,anon,authenticated;
grant execute on function public.tracking_period(text,timestamptz,text),public.tracking_habits(uuid),public.tracking_next(uuid,timestamptz),public.tracking_claim(uuid) to service_role;
