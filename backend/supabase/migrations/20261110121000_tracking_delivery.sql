-- [COM] Calendar-aware, bounded check-ins and atomic delivery reservations. No new outbound channel.
create function public.tracking_due(p_frequency text,p_previous timestamptz,p_now timestamptz,p_timezone text,p_check_hour integer default 20)
returns boolean language plpgsql stable set search_path = '' as $$
declare d date:=(p_now at time zone p_timezone)::date; prior date:=(p_previous at time zone p_timezone)::date;
  hr integer:=extract(hour from p_now at time zone p_timezone); wd integer:=extract(isodow from p_now at time zone p_timezone);
  mins integer:=public._freq_minutes(p_frequency); need integer; threshold integer:=p_check_hour;
begin
  if mins is null or p_frequency='every_birthday' then return false; end if;
  if p_frequency='every_weekday' and wd>5 then return false; end if;
  if p_frequency='every_weekend' and wd<6 then return false; end if;
  need:=case p_frequency when 'every_monday' then 1 when 'every_tuesday' then 2 when 'every_wednesday' then 3
    when 'every_thursday' then 4 when 'every_friday' then 5 when 'every_saturday' then 6 when 'every_sunday' then 7 else null end;
  if need is not null and wd<>need then return false; end if;
  if p_frequency='every_newyear' and to_char(d,'MM-DD')<>'01-01' then return false; end if;
  threshold:=case p_frequency when 'every_morning' then least(11,p_check_hour) when 'every_afternoon' then least(17,p_check_hour)
    when 'every_evening' then least(21,p_check_hour) when 'every_night' then least(21,p_check_hour) else p_check_hour end;
  if mins>=1436 and hr<threshold then return false; end if;
  if p_previous is null then return true; end if;
  if mins<1436 then return p_previous<=p_now-make_interval(mins=>mins); end if;
  if p_frequency in ('daily','every_morning','every_afternoon','every_evening','every_night','every_weekday','every_weekend') or need is not null then return prior<d; end if;
  if p_frequency='weekly' then return date_trunc('week',prior::timestamp)<date_trunc('week',d::timestamp); end if;
  if p_frequency='monthly' then return date_trunc('month',prior::timestamp)<date_trunc('month',d::timestamp); end if;
  if p_frequency in ('quarterly','seasonal') then return date_trunc('quarter',prior::timestamp)<date_trunc('quarter',d::timestamp); end if;
  if p_frequency in ('yearly','every_newyear') then return extract(year from prior)<extract(year from d); end if;
  return p_previous<=p_now-make_interval(mins=>mins);
end $$;

create function public.tracking_next(p_user uuid,p_now timestamptz default now())
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
      where o.user_id=p_user and o.habit_text=hh.habit and (o.source<>'system' or o.answered_at is not null) and (d.status is null or d.status in ('reserved','sent','uncertain'))) last on true
    where not coalesce(last.waiting,false) and public.tracking_due(hh.frequency,last.asked,p_now,z,
      case when qf>qt then greatest(qt,qf-1) else 20 end)
    order by (last.asked is null) desc,
      extract(epoch from (p_now-last.asked))/greatest(1,public._freq_minutes(hh.frequency)) desc nulls first,hh.ordinal limit 1;
  if h.habit is null then return jsonb_build_object('send',false,'why','nothing_due'); end if;
  return jsonb_build_object('send',true,'habit',h.habit,'frequency',h.frequency,'intentions',h.intentions,'timezone',z);
end $$;

create function public.tracking_claim(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare d jsonb; pid bigint; oid bigint; token uuid; chat bigint;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('tracking:'||p_user::text,0)) then return jsonb_build_object('send',false,'why','busy'); end if;
  d:=public.tracking_next(p_user);
  if not coalesce((d->>'send')::boolean,false) then return d; end if;
  select telegram_id into chat from public.profiles where id=p_user;
  if chat is null then return jsonb_build_object('send',false,'why','unlinked'); end if;
  pid:=public.record_push(p_user,d->>'habit',(d->>'habit')||' — où en es-tu ?',null);
  select outcome_id into oid from public.pushes where id=pid;
  update public.habit_outcomes set intention=d->'intentions'->>0 where id=oid;
  insert into public.tracking_deliveries(push_id,user_id,timezone,frequency,intentions)
    values(pid,p_user,d->>'timezone',d->>'frequency',array(select jsonb_array_elements_text(d->'intentions'))) returning lease into token;
  return d||jsonb_build_object('lease',token,'id',oid::text,'chat_id',chat::text);
end $$;

create function public.tracking_delivered(p_lease uuid,p_status text,p_message bigint default null,p_code text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare d public.tracking_deliveries%rowtype;
begin
  if p_status is null or p_status not in ('sent','failed','uncertain') or (p_status='sent' and (p_message is null or p_message<=0)) then return false; end if;
  select * into d from public.tracking_deliveries where lease=p_lease for update;
  if not found then return false; end if;
  if d.status<>'reserved' then return d.status=p_status; end if;
  update public.tracking_deliveries set status=p_status,message_id=p_message,delivered_at=case when p_status='sent' then now() else null end,
    error_code=left(p_code,80) where lease=p_lease;
  if p_status='sent' then
    update public.pushes set sent_at=now() where id=d.push_id;
    update public.habit_outcomes set asked_at=now() where id=(select outcome_id from public.pushes where id=d.push_id);
  end if;
  return true;
end $$;

revoke all on function public.tracking_due(text,timestamptz,timestamptz,text,integer),public.tracking_next(uuid,timestamptz),
  public.tracking_claim(uuid),public.tracking_delivered(uuid,text,bigint,text) from public,anon,authenticated;
grant execute on function public.tracking_due(text,timestamptz,timestamptz,text,integer),public.tracking_next(uuid,timestamptz),
  public.tracking_claim(uuid),public.tracking_delivered(uuid,text,bigint,text) to service_role;
