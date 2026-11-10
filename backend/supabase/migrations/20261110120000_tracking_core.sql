-- [COM] The same private practice data feeds Telegram, the dashboard and consented Higher context.
-- Additive sidecars; no new reference or lock on auth.users. No automatic edits to the five views.
create table public.tracking_settings (
  user_id uuid primary key,
  share_chatgpt boolean not null default false,
  updated_at timestamptz not null default now()
);
comment on table public.tracking_settings is '[COM] Explicit sharing preference for private practice summaries; disabled by default.';
alter table public.tracking_settings enable row level security;

create table public.tracking_checkins (
  outcome_id bigint primary key references public.habit_outcomes(id) on delete cascade,
  user_id uuid not null,
  status text not null check (status in ('done','partial','missed','skipped')),
  barrier text check (barrier in ('time','energy','place','overload','other')),
  energy integer check (energy between 1 and 5),
  minutes integer check (minutes between 0 and 1440),
  note text check (length(note) <= 1000),
  reported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.tracking_checkins is '[COM] Explicit self reports and optional context. Silence is unknown; notes never become TOTEHM elements automatically.';
alter table public.tracking_checkins enable row level security;
create index tracking_checkins_owner on public.tracking_checkins(user_id, reported_at desc);

create table public.tracking_deliveries (
  push_id bigint primary key references public.pushes(id) on delete cascade,
  user_id uuid not null,
  lease uuid not null unique default gen_random_uuid(),
  status text not null default 'reserved' check (status in ('reserved','sent','failed','uncertain')),
  timezone text not null,
  frequency text,
  intentions text[] not null default '{}',
  message_id bigint,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  error_code text check (length(error_code) <= 80)
);
comment on table public.tracking_deliveries is '[COM] Reserved and confirmed Telegram deliveries. Failed/uncertain delivery is not an unanswered habit or a missed practice.';
alter table public.tracking_deliveries enable row level security;
create index tracking_deliveries_owner on public.tracking_deliveries(user_id, created_at desc);

create function public.tracking_habits(p_user uuid)
returns table (ordinal integer, habit text, frequency text, intentions text[], key text)
language sql stable security definer set search_path = '' as $$
  select distinct on(s.item->>'t') s.ord::integer, s.item->>'t', nullif(s.item->>'f',''),
    coalesce(public._step_intentions(s.item),'{}'::text[]), md5(s.item->>'t')
  from (select t.steps from public.totehms t where t.user_id=p_user order by t.updated_at desc nulls last limit 1) t,
    jsonb_array_elements(coalesce(t.steps,'[]'::jsonb)) with ordinality s(item,ord)
  where length(coalesce(s.item->>'t','')) between 1 and 500
  order by s.item->>'t',s.ord
$$;

create function public.tracking_settings_for(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare t public.totehms%rowtype; z text;
begin
  select * into t from public.totehms where user_id=p_user order by updated_at desc nulls last limit 1;
  z:=coalesce(t.tz,'UTC');
  begin perform now() at time zone z; exception when others then z:='UTC'; end;
  return jsonb_build_object('timezone',z,'quiet_from',coalesce(t.quiet_from,22),'quiet_to',coalesce(t.quiet_to,8),
    'max_daily',least(6,greatest(0,coalesce(t.max_daily,2))), 'paused',not coalesce(t.bot,false),
    'linked',exists(select 1 from public.profiles where id=p_user and telegram_id is not null),
    'share_chatgpt',coalesce((select share_chatgpt from public.tracking_settings where user_id=p_user),false));
end $$;

create function public.tracking_settings_get()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'why','signin'); end if;
  return jsonb_build_object('ok',true,'settings',public.tracking_settings_for(auth.uid()));
end $$;

create function public.tracking_setup_timezone(p_timezone text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid();
begin
  if u is null then return jsonb_build_object('ok',false,'why','signin'); end if;
  perform pg_advisory_xact_lock(hashtextextended('tracking-settings:'||u::text,0));
  if exists(select 1 from public.tracking_settings where user_id=u) then
    return jsonb_build_object('ok',true,'settings',public.tracking_settings_for(u)); end if;
  if p_timezone is null or length(p_timezone) not between 1 and 80 then return jsonb_build_object('ok',false,'why','timezone'); end if;
  perform now() at time zone p_timezone;
  update public.totehms set tz=p_timezone where user_id=u;
  if not found then return jsonb_build_object('ok',false,'why','no_totehm'); end if;
  insert into public.tracking_settings(user_id) values(u) on conflict(user_id) do nothing;
  return jsonb_build_object('ok',true,'settings',public.tracking_settings_for(u));
exception when invalid_parameter_value then return jsonb_build_object('ok',false,'why','timezone');
end $$;

create function public.tracking_settings_set(p_changes jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); z text; qf integer; qt integer; mx integer;
begin
  if u is null then return jsonb_build_object('ok',false,'why','signin'); end if;
  perform pg_advisory_xact_lock(hashtextextended('tracking-settings:'||u::text,0));
  if jsonb_typeof(p_changes) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_changes) k
    where k not in ('timezone','quiet_from','quiet_to','max_daily','paused','share_chatgpt')) then
    return jsonb_build_object('ok',false,'why','settings'); end if;
  if not exists(select 1 from public.totehms where user_id=u) then return jsonb_build_object('ok',false,'why','no_totehm'); end if;
  if p_changes ? 'timezone' then
    z:=p_changes->>'timezone';
    if jsonb_typeof(p_changes->'timezone')<>'string' or length(z)>80 then raise exception 'Invalid timezone'; end if;
    perform now() at time zone z;
  end if;
  if p_changes ? 'quiet_from' then
    if jsonb_typeof(p_changes->'quiet_from')<>'number' or (p_changes->>'quiet_from')!~'^[0-9]{1,2}$' then raise exception 'Invalid hour'; end if;
    qf:=(p_changes->>'quiet_from')::integer; if qf not between 0 and 23 then raise exception 'Invalid hour'; end if;
  end if;
  if p_changes ? 'quiet_to' then
    if jsonb_typeof(p_changes->'quiet_to')<>'number' or (p_changes->>'quiet_to')!~'^[0-9]{1,2}$' then raise exception 'Invalid hour'; end if;
    qt:=(p_changes->>'quiet_to')::integer; if qt not between 0 and 23 then raise exception 'Invalid hour'; end if;
  end if;
  if p_changes ? 'max_daily' then
    if jsonb_typeof(p_changes->'max_daily')<>'number' or (p_changes->>'max_daily')!~'^[0-6]$' then raise exception 'Invalid limit'; end if;
    mx:=(p_changes->>'max_daily')::integer;
  end if;
  if (p_changes ? 'paused' and jsonb_typeof(p_changes->'paused')<>'boolean') or
     (p_changes ? 'share_chatgpt' and jsonb_typeof(p_changes->'share_chatgpt')<>'boolean') then raise exception 'Invalid choice'; end if;
  update public.totehms set tz=coalesce(z,tz), quiet_from=coalesce(qf,quiet_from), quiet_to=coalesce(qt,quiet_to),
    max_daily=coalesce(mx,max_daily), bot=case when p_changes ? 'paused' then not (p_changes->>'paused')::boolean else bot end
    where user_id=u;
  insert into public.tracking_settings(user_id,share_chatgpt)
    values(u,coalesce((p_changes->>'share_chatgpt')::boolean,(select share_chatgpt from public.tracking_settings where user_id=u),false))
    on conflict(user_id) do update set share_chatgpt=excluded.share_chatgpt,updated_at=now();
  return jsonb_build_object('ok',true,'settings',public.tracking_settings_for(u));
exception when invalid_parameter_value or invalid_text_representation or raise_exception then
  return jsonb_build_object('ok',false,'why','settings');
end $$;

-- Atomic, single-use linking; private Telegram identity comes from a verified webhook.
create function public.tracking_link(p_code text,p_telegram bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if p_telegram is null or p_telegram<=0 or p_code !~ '^[A-Za-z0-9_-]{10,64}$' then return jsonb_build_object('ok',false); end if;
  perform pg_advisory_xact_lock(hashtextextended('tracking-link:'||p_telegram::text,0));
  select user_id into v_user from public.bot_link_codes where code=p_code and used_at is null
    and created_at>now()-interval '10 minutes' for update;
  if v_user is null then return jsonb_build_object('ok',false); end if;
  update public.profiles set telegram_id=null where telegram_id=p_telegram and id<>v_user;
  update public.profiles set telegram_id=p_telegram where id=v_user;
  if not found then return jsonb_build_object('ok',false); end if;
  update public.bot_link_codes set used_at=now() where code=p_code;
  update public.totehms set bot=true where user_id=v_user;
  return jsonb_build_object('ok',true,'settings',public.tracking_settings_for(v_user));
end $$;

create function public.tracking_list(p_telegram bigint,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid;
begin
  select id into u from public.profiles where telegram_id=p_telegram;
  if u is null then return jsonb_build_object('ok',false,'why','unlinked'); end if;
  return jsonb_build_object('ok',true,'items',coalesce((select jsonb_agg(jsonb_build_object('habit',h.habit,'key',h.key)
    order by h.ordinal) from (select * from public.tracking_habits(u) order by ordinal limit least(12,400-greatest(0,least(p_offset,400))) offset greatest(0,least(p_offset,400))) h),'[]'::jsonb),
    'has_more',(select least(count(*),400)>greatest(0,least(p_offset,400))+12 from public.tracking_habits(u)),
    'next_offset',greatest(0,least(p_offset,400))+12);
end $$;

create function public.tracking_open(p_telegram bigint,p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid; h record; oid bigint;
begin
  select id into u from public.profiles where telegram_id=p_telegram;
  if u is null then return jsonb_build_object('ok',false,'why','unlinked'); end if;
  perform pg_advisory_xact_lock(hashtextextended('tracking:'||u::text,0));
  select * into h from public.tracking_habits(u) where key=p_key limit 1;
  if h.habit is null then return jsonb_build_object('ok',false,'why','unavailable'); end if;
  select o.id into oid from public.habit_outcomes o where o.user_id=u and o.habit_text=h.habit
    and o.answered_at is null and o.asked_at>now()-interval '36 hours'
    and not exists(select 1 from public.pushes p join public.tracking_deliveries d on d.push_id=p.id
      where p.outcome_id=o.id and d.status<>'sent') order by o.asked_at desc limit 1;
  if oid is null then
    insert into public.habit_outcomes(user_id,habit_text,intention,source) values(u,h.habit,h.intentions[1],'system') returning id into oid;
  end if;
  return jsonb_build_object('ok',true,'id',oid::text,'habit',h.habit);
end $$;

create function public.tracking_answer(p_telegram bigint,p_outcome bigint,p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid; o public.habit_outcomes%rowtype; current_status text;
begin
  if p_status is null or p_status not in ('done','partial','missed','skipped') then return jsonb_build_object('ok',false,'why','status'); end if;
  select id into u from public.profiles where telegram_id=p_telegram;
  if u is null then return jsonb_build_object('ok',false,'why','unlinked'); end if;
  select * into o from public.habit_outcomes where id=p_outcome and user_id=u for update;
  if not found or o.asked_at<now()-interval '7 days' then return jsonb_build_object('ok',false,'why','unavailable'); end if;
  current_status:=coalesce((select status from public.tracking_checkins where outcome_id=o.id),o.outcome);
  if o.answered_at is not null then return jsonb_build_object('ok',true,'already',true,'status',current_status,'id',o.id::text); end if;
  insert into public.tracking_checkins(outcome_id,user_id,status) values(o.id,u,p_status);
  update public.habit_outcomes set source='telegram',outcome=case when p_status in ('done','missed') then p_status else null end,answered_at=now() where id=o.id;
  return jsonb_build_object('ok',true,'status',p_status,'id',o.id::text,'habit',o.habit_text);
end $$;

create function public.tracking_correct(p_telegram bigint,p_outcome bigint,p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid; c public.tracking_checkins%rowtype;
begin
  if p_status is null or p_status not in ('done','partial','missed','skipped') then return jsonb_build_object('ok',false,'why','status'); end if;
  select id into u from public.profiles where telegram_id=p_telegram;
  select * into c from public.tracking_checkins where outcome_id=p_outcome and user_id=u for update;
  if not found or c.reported_at<now()-interval '72 hours' then return jsonb_build_object('ok',false,'why','unavailable'); end if;
  if c.status=p_status then return jsonb_build_object('ok',true,'already',true,'status',c.status); end if;
  update public.tracking_checkins set status=p_status,updated_at=now() where outcome_id=c.outcome_id;
  update public.habit_outcomes set outcome=case when p_status in ('done','missed') then p_status else null end where id=c.outcome_id and user_id=u;
  return jsonb_build_object('ok',true,'status',p_status,'id',c.outcome_id::text);
end $$;

create function public.tracking_detail(p_telegram bigint,p_outcome bigint,p_field text,p_value text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid; c public.tracking_checkins%rowtype; n integer;
begin
  select id into u from public.profiles where telegram_id=p_telegram;
  select * into c from public.tracking_checkins where outcome_id=p_outcome and user_id=u for update;
  if not found or c.reported_at<now()-interval '72 hours' then return jsonb_build_object('ok',false,'why','unavailable'); end if;
  if p_field='inspect' then return jsonb_build_object('ok',true);
  elsif p_field='barrier' and p_value in ('time','energy','place','overload','other') then
    update public.tracking_checkins set barrier=p_value,updated_at=now() where outcome_id=c.outcome_id;
  elsif p_field='energy' and p_value ~ '^[1-5]$' then
    update public.tracking_checkins set energy=p_value::integer,updated_at=now() where outcome_id=c.outcome_id;
  elsif p_field='minutes' and p_value ~ '^[0-9]{1,4}$' then
    n:=p_value::integer; if n>1440 then return jsonb_build_object('ok',false,'why','value'); end if;
    update public.tracking_checkins set minutes=n,updated_at=now() where outcome_id=c.outcome_id;
  elsif p_field='note' and length(p_value) between 0 and 1000 then
    update public.tracking_checkins set note=nullif(p_value,''),updated_at=now() where outcome_id=c.outcome_id;
  else return jsonb_build_object('ok',false,'why','value'); end if;
  return jsonb_build_object('ok',true);
end $$;

create function public.tracking_bot_pause(p_telegram bigint,p_paused boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  select id into u from public.profiles where telegram_id=p_telegram;
  if u is null or p_paused is null then return jsonb_build_object('ok',false); end if;
  update public.totehms set bot=not p_paused where user_id=u;
  return jsonb_build_object('ok',true,'settings',public.tracking_settings_for(u));
end $$;

create function public.tracking_forget_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin delete from public.tracking_settings where user_id=old.id; return old; end $$;
create trigger tracking_forget_profile after delete on public.profiles for each row execute function public.tracking_forget_profile();

-- Keep explicit reports from the pre-existing authenticated Higher Self surface coherent.
create function public.tracking_sync_outcome() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.outcome in ('done','missed') and new.answered_at is not null then
    insert into public.tracking_checkins(outcome_id,user_id,status,reported_at)
      values(new.id,new.user_id,new.outcome,new.answered_at)
      on conflict(outcome_id) do update set status=excluded.status,updated_at=now()
        where public.tracking_checkins.status is distinct from excluded.status;
  end if;
  return null;
end $$;
create trigger tracking_sync_outcome after insert or update of outcome,answered_at on public.habit_outcomes
  for each row execute function public.tracking_sync_outcome();
revoke all on function public.tracking_sync_outcome() from public,anon,authenticated;

create function public.tracking_journal_checkin() returns trigger language plpgsql security definer set search_path = '' as $$
declare o public.habit_outcomes%rowtype;
begin
  if new.status in ('partial','skipped') and (tg_op='INSERT' or old.status is distinct from new.status) then
    select * into o from public.habit_outcomes where id=new.outcome_id and user_id=new.user_id;
    perform public._journal(new.user_id,'track','tracked_'||new.status,o.habit_text,o.intention,new.outcome_id::text||':'||new.status,'{}'::jsonb,new.reported_at);
  end if;
  return null;
exception when others then return null;
end $$;
create trigger tracking_journal_checkin after insert or update on public.tracking_checkins for each row execute function public.tracking_journal_checkin();
revoke all on function public.tracking_journal_checkin() from public,anon,authenticated;

revoke all on public.tracking_settings,public.tracking_checkins,public.tracking_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.tracking_settings,public.tracking_checkins,public.tracking_deliveries to service_role;
revoke all on function public.tracking_habits(uuid),public.tracking_settings_for(uuid),public.tracking_link(text,bigint),
  public.tracking_list(bigint,integer),public.tracking_open(bigint,text),public.tracking_answer(bigint,bigint,text),
  public.tracking_correct(bigint,bigint,text),public.tracking_detail(bigint,bigint,text,text),public.tracking_bot_pause(bigint,boolean),public.tracking_forget_profile() from public,anon,authenticated;
grant execute on function public.tracking_habits(uuid),public.tracking_settings_for(uuid),public.tracking_link(text,bigint),
  public.tracking_list(bigint,integer),public.tracking_open(bigint,text),public.tracking_answer(bigint,bigint,text),
  public.tracking_correct(bigint,bigint,text),public.tracking_detail(bigint,bigint,text,text),public.tracking_bot_pause(bigint,boolean) to service_role;
revoke all on function public.tracking_settings_get(),public.tracking_setup_timezone(text),public.tracking_settings_set(jsonb) from public,anon;
grant execute on function public.tracking_settings_get(),public.tracking_setup_timezone(text),public.tracking_settings_set(jsonb) to authenticated;
