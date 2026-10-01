-- SPACE · compass / faithful Habit Boxes / progressive privacy / Bunny video.
-- Additive only. Existing clips, subscriber rights and private history survive.
create table if not exists public.videos (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 bunny_video_id uuid unique, status text not null default 'uploading' check(status in ('uploading','processing','ready','failed')),
 title text not null default 'Spot', byte_length bigint not null check(byte_length between 1 and 33554432),
 length_seconds double precision not null check(length_seconds > 0 and length_seconds <= 34),
 actual_seconds double precision, width integer, height integer, resolutions text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.videos enable row level security;
revoke all on public.videos from anon, authenticated;
grant all on public.videos to service_role;
create index if not exists videos_owner_created on public.videos(user_id,created_at desc);
alter table public.spot_plans add column if not exists video_id uuid references public.videos(id);
create unique index if not exists spot_plans_video_id on public.spot_plans(video_id) where video_id is not null;
create table if not exists public.video_backend (
 id boolean primary key default true check(id),
 status text not null default 'pending', diagnostics jsonb not null default '{}'::jsonb,
 checked_at timestamptz not null default now()
);
alter table public.video_backend enable row level security;
revoke all on public.video_backend from anon, authenticated;
grant all on public.video_backend to service_role;
insert into public.video_backend(id) values(true) on conflict(id) do nothing;

create or replace function public._space_video_owned(p_uid uuid,p_ref text)
returns boolean language plpgsql stable security definer set search_path=public as $$
begin
 if p_ref ~ '^bunny:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  return exists(select 1 from public.videos v where v.id=substring(p_ref from 7)::uuid and v.user_id=p_uid
   and v.status in ('processing','ready') and not exists(select 1 from public.spot_plans p where p.video_id=v.id));
 end if;
 return public._clip_ok(p_uid,p_ref);
end $$;

create or replace function public._space_habit_box(p_uid uuid,p_step jsonb)
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('name',p_step->>'t','freq',p_step->>'f','step',p_step,'ints',to_jsonb(public._step_intentions(p_step)),
  'place',(select h.place from public.habit_spots h where h.user_id=p_uid and h.habit_text=p_step->>'t'),
  'objectives',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'text',o.text,'is',o."is") order by o.created_at)
    from public.objectives o where o.user_id=p_uid and btrim(o.text)<>'' and coalesce(o.status,'active') not in ('achieved','abandoned','converted')
     and (o.id::text=p_step->>'o' or exists(select 1 from public.objective_habits oh where oh.user_id=p_uid and oh.objective_id=o.id and oh.habit_text=p_step->>'t'))),'[]'::jsonb),
  'repulsions',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'text',r.repulsion,'is',r."is") order by r.created_at)
    from public.repulsions r where r.user_id=p_uid and r.active and btrim(r.repulsion)<>''
     and (r.habit_text=p_step->>'t' or exists(select 1 from public.repulsion_habits rh where rh.user_id=p_uid and rh.repulsion_id=r.id and rh.habit_text=p_step->>'t'))),'[]'::jsonb));
$$;
create or replace function public.space_habits()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_h jsonb;
begin
 if v_uid is null then return jsonb_build_object('ok',false,'why','signin','habits','[]'::jsonb); end if;
 select coalesce(jsonb_agg(public._space_habit_box(v_uid,s) order by ord),'[]'::jsonb) into v_h
 from public.totehms t, jsonb_array_elements(t.steps) with ordinality a(s,ord)
 where t.user_id=v_uid and btrim(coalesce(s->>'t',''))<>'';
 return jsonb_build_object('ok',true,'habits',v_h);
end $$;

-- One query contract for the three discovery views. The exact habit always wins.
-- Fallback uses its own intentions, within the same server-authorized view.
create or replace function public.space_discover(p_view text,p_habit text default null,
 p_lat double precision default null,p_lng double precision default null,p_before timestamptz default null,
 p_before_id uuid default null,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_step jsonb; v_ints text[]; v_i text; v_one jsonb; v_all jsonb:='[]'::jsonb;v_list jsonb;v_more boolean:=false;v_match text:='all';
 v_cap integer:=greatest(1,least(coalesce(p_limit,20),case when p_view='radar' then 300 else 100 end));
begin
 if p_view not in ('feed','radar','list') then return jsonb_build_object('ok',false,'why','view','spots','[]'::jsonb); end if;
 if nullif(p_habit,'') is not null then
  select s into v_step from public.totehms t,jsonb_array_elements(t.steps) s where t.user_id=auth.uid() and s->>'t'=p_habit limit 1;
  if v_step is null then return jsonb_build_object('ok',false,'why','habit','spots','[]'::jsonb); end if;
  v_match:='habit';
  v_one:=case p_view when 'feed' then public.spots_feed(p_lat,p_lng,p_habit,null,null,1)
    when 'radar' then public.spots_exact(p_habit,null) else public.spots_list(p_habit,null,null,null,1) end;
  if jsonb_array_length(coalesce(v_one->'spots','[]'::jsonb))=0 then v_match:='intention';v_ints:=public._step_intentions(v_step);end if;
 end if;
 if v_match <> 'intention' then
  v_one:=case p_view when 'feed' then public.spots_feed(p_lat,p_lng,p_habit,null,p_before,v_cap)
    when 'radar' then public.spots_exact(p_habit,null) else public.spots_list(p_habit,null,p_before,p_before_id,v_cap) end;
  return v_one||jsonb_build_object('match',v_match);
 end if;
 foreach v_i in array coalesce(v_ints,'{}'::text[]) loop
  v_one:=case p_view when 'feed' then public.spots_feed(p_lat,p_lng,null,v_i,p_before,v_cap)
    when 'radar' then public.spots_exact(null,v_i) else public.spots_list(null,v_i,p_before,p_before_id,v_cap) end;
  v_all:=v_all||coalesce(v_one->'spots','[]'::jsonb);v_more:=v_more or coalesce((v_one->>'more')::boolean,false);
 end loop;
 select coalesce(jsonb_agg(x order by x->>'starts_at' desc,x->>'id' desc),'[]'::jsonb) into v_list from (select distinct x from jsonb_array_elements(v_all) x) d;
 v_more:=v_more or jsonb_array_length(v_list)>v_cap;
 select coalesce(jsonb_agg(x order by ord),'[]'::jsonb) into v_list from jsonb_array_elements(v_list) with ordinality a(x,ord) where ord<=v_cap;
 return jsonb_build_object('spots',v_list,'more',v_more,'match',v_match);
end $$;

CREATE OR REPLACE FUNCTION public.spot_create(p_habit text, p_visibility text, p_duration_min integer, p_video text, p_lat double precision, p_lng double precision, p_city text DEFAULT NULL::text, p_comment text DEFAULT NULL::text, p_mode text DEFAULT NULL::text, p_location text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules(); v_steps jsonb; v_s jsonb;
  v_is text[]; v_objs jsonb; v_reps jsonb; v_id uuid; v_mode text; v_loc text; v_city text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;

  select coalesce(t.steps,'[]'::jsonb) into v_steps from public.totehms t where t.user_id = v_uid limit 1;
  select s into v_s from jsonb_array_elements(coalesce(v_steps,'[]'::jsonb)) s
   where s->>'t' = p_habit and btrim(coalesce(s->>'t','')) <> '' limit 1;
  if v_s is null then return jsonb_build_object('ok', false, 'why', 'habit'); end if;
  v_is := public._step_intentions(v_s);

  if coalesce(p_visibility, '') not in ('private','shared') then return jsonb_build_object('ok', false, 'why', 'visibility'); end if;
  if p_visibility = 'shared' then
    if coalesce(p_location, '') not in ('on','off') then return jsonb_build_object('ok', false, 'why', 'location'); end if;
    if p_location = 'on' and coalesce(p_mode, '') not in ('social','silent') then return jsonb_build_object('ok', false, 'why', 'mode'); end if;
    v_mode := case when p_location = 'on' then p_mode end; v_loc := p_location;
  end if;
  if p_duration_min is null or p_duration_min < (v_r->>'duration_min')::int
     or p_duration_min > (v_r->>'duration_max')::int then
    return jsonb_build_object('ok', false, 'why', 'duration');
  end if;
  if not coalesce(public._space_video_owned(v_uid, p_video),false) then return jsonb_build_object('ok', false, 'why', 'video'); end if;
  if p_lat is null or p_lng is null or not (p_lat between -90 and 90) or not (p_lng between -180 and 180) then
    return jsonb_build_object('ok', false, 'why', 'position');
  end if;
  if (select count(*) from public.spot_plans where user_id = v_uid
        and created_at > now() - interval '24 hours') >= (v_r->>'max_day')::int then
    return jsonb_build_object('ok', false, 'why', 'too_many');
  end if;
  v_city := nullif(left(btrim(coalesce(p_city, '')), 80), '');

  select coalesce(jsonb_agg(jsonb_build_object('text', o.text, 'is', to_jsonb(o."is"))), '[]'::jsonb) into v_objs
    from public.objectives o
   where o.user_id = v_uid and btrim(o.text) <> ''
     and coalesce(o.status,'active') not in ('achieved','abandoned','converted')
     and (o.id::text = v_s->>'o' or exists (select 1 from public.objective_habits oh
           where oh.user_id = v_uid and oh.objective_id = o.id and oh.habit_text = p_habit));
  select coalesce(jsonb_agg(jsonb_build_object('text', r.repulsion)), '[]'::jsonb) into v_reps
    from public.repulsions r
   where r.user_id = v_uid and r.active and btrim(r.repulsion) <> ''
     and (r.habit_text = p_habit or exists (select 1 from public.repulsion_habits rh
           where rh.user_id = v_uid and rh.repulsion_id = r.id and rh.habit_text = p_habit));

  insert into public.spots(user_id, intention, activite, commentaire, lat, lng,
                           duration_min, expires_at, is_public, required_role, energy_mode, active)
  values (v_uid, coalesce(v_is[1], 'focus'), left(p_habit, 80), null,
          round(p_lat::numeric, 1)::double precision, round(p_lng::numeric, 1)::double precision,
          p_duration_min, now() + make_interval(mins => p_duration_min), false, 'public', v_mode,
          p_visibility = 'shared')
  returning id into v_id;

  insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at,
                                duration_min, mode, place, lat, lng, clat, clng, comment,
                                visibility, shield, video, city, capacity, access, selection, kind)
  values (v_id, v_uid, p_habit, v_is,
          jsonb_build_object('habit', p_habit, 'intentions', to_jsonb(v_is),
                             'objectives', v_objs, 'repulsions', v_reps,
                             'freq', v_s->>'f', 'step', v_s, 'place', (select h.place from public.habit_spots h where h.user_id=v_uid and h.habit_text=p_habit), 'at', now()),
          now(), p_duration_min, coalesce(v_mode, 'silent'), coalesce(v_city, 'here'), p_lat, p_lng,
          round(p_lat::numeric, 1)::double precision, round(p_lng::numeric, 1)::double precision,
          nullif(left(btrim(coalesce(p_comment,'')), 400), ''),
          p_visibility, coalesce(v_loc, 'off'), case when p_video like 'bunny:%' then null else p_video end, v_city, 1, 'club', 'manual', 'experience');

  if p_video like 'bunny:%' then update public.spot_plans set video_id = substring(p_video from 7)::uuid where spot_id = v_id; end if;

  return jsonb_build_object('ok', true, 'id', v_id,
                            'ends_at', now() + make_interval(mins => p_duration_min));
end $function$;


CREATE OR REPLACE FUNCTION public.spot_schedule(p_habit text, p_visibility text, p_starts_at timestamp with time zone, p_duration_min integer, p_place text, p_lat double precision, p_lng double precision, p_city text DEFAULT NULL::text, p_comment text DEFAULT NULL::text, p_mode text DEFAULT NULL::text, p_location text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules(); v_steps jsonb; v_s jsonb;
  v_is text[]; v_objs jsonb; v_reps jsonb; v_id uuid; v_mode text; v_loc text; v_city text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;

  select coalesce(t.steps,'[]'::jsonb) into v_steps from public.totehms t where t.user_id = v_uid limit 1;
  select s into v_s from jsonb_array_elements(coalesce(v_steps,'[]'::jsonb)) s
   where s->>'t' = p_habit and btrim(coalesce(s->>'t','')) <> '' limit 1;
  if v_s is null then return jsonb_build_object('ok', false, 'why', 'habit'); end if;
  v_is := public._step_intentions(v_s);

  if coalesce(p_visibility, '') not in ('private','shared') then return jsonb_build_object('ok', false, 'why', 'visibility'); end if;
  if p_visibility = 'shared' then
    if coalesce(p_location, '') not in ('on','off') then return jsonb_build_object('ok', false, 'why', 'location'); end if;
    if p_location = 'on' and coalesce(p_mode, '') not in ('social','silent') then return jsonb_build_object('ok', false, 'why', 'mode'); end if;
    v_mode := case when p_location = 'on' then p_mode end; v_loc := p_location;
  end if;
  if p_duration_min is null or p_duration_min < (v_r->>'duration_min')::int
     or p_duration_min > (v_r->>'duration_max')::int then
    return jsonb_build_object('ok', false, 'why', 'duration');
  end if;
  if p_starts_at is null or not isfinite(p_starts_at) or p_starts_at <= now()
     or p_starts_at > now() + make_interval(days => (v_r->>'horizon_days')::int) then
    return jsonb_build_object('ok', false, 'why', 'when');
  end if;
  if btrim(coalesce(p_place,'')) = '' then
    return jsonb_build_object('ok', false, 'why', 'place');
  end if;
  if p_lat is null or p_lng is null or not (p_lat between -90 and 90) or not (p_lng between -180 and 180) then
    return jsonb_build_object('ok', false, 'why', 'position');
  end if;
  -- Serialize future quotas per owner, including simultaneous requests.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  if (select count(*) from public.spot_plans where user_id = v_uid
        and status = 'published' and starts_at > now()) >= (v_r->>'max_upcoming')::int then
    return jsonb_build_object('ok', false, 'why', 'too_many');
  end if;
  if (select count(*) from public.spot_plans where user_id = v_uid
        and created_at > now() - interval '24 hours') >= (v_r->>'max_day')::int then
    return jsonb_build_object('ok', false, 'why', 'too_many');
  end if;
  v_city := nullif(left(btrim(coalesce(p_city, '')), 80), '');

  select coalesce(jsonb_agg(jsonb_build_object('text', o.text, 'is', to_jsonb(o."is"))), '[]'::jsonb) into v_objs
    from public.objectives o
   where o.user_id = v_uid and btrim(o.text) <> ''
     and coalesce(o.status,'active') not in ('achieved','abandoned','converted')
     and (o.id::text = v_s->>'o' or exists (select 1 from public.objective_habits oh
           where oh.user_id = v_uid and oh.objective_id = o.id and oh.habit_text = p_habit));
  select coalesce(jsonb_agg(jsonb_build_object('text', r.repulsion)), '[]'::jsonb) into v_reps
    from public.repulsions r
   where r.user_id = v_uid and r.active and btrim(r.repulsion) <> ''
     and (r.habit_text = p_habit or exists (select 1 from public.repulsion_habits rh
           where rh.user_id = v_uid and rh.repulsion_id = r.id and rh.habit_text = p_habit));

  insert into public.spots(user_id, intention, activite, commentaire, lat, lng,
                           duration_min, expires_at, is_public, required_role, energy_mode, active)
  values (v_uid, coalesce(v_is[1], 'focus'), left(p_habit, 80), null,
          round(p_lat::numeric, 1)::double precision, round(p_lng::numeric, 1)::double precision,
          p_duration_min, p_starts_at + make_interval(mins => p_duration_min), false, 'public', v_mode,
          p_visibility = 'shared')
  returning id into v_id;

  insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at,
                                duration_min, mode, place, lat, lng, clat, clng, comment,
                                visibility, shield, video, city, capacity, access, selection, kind)
  values (v_id, v_uid, p_habit, v_is,
          jsonb_build_object('habit', p_habit, 'intentions', to_jsonb(v_is),
                             'objectives', v_objs, 'repulsions', v_reps,
                             'freq', v_s->>'f', 'step', v_s, 'place', (select h.place from public.habit_spots h where h.user_id=v_uid and h.habit_text=p_habit), 'at', now()),
          p_starts_at, p_duration_min, coalesce(v_mode, 'silent'), left(btrim(p_place), 120), p_lat, p_lng,
          round(p_lat::numeric, 1)::double precision, round(p_lng::numeric, 1)::double precision,
          nullif(left(btrim(coalesce(p_comment,'')), 400), ''),
          p_visibility, coalesce(v_loc, 'off'), null, v_city, 1, 'club', 'manual', 'experience');

  return jsonb_build_object('ok', true, 'id', v_id, 'state', 'will', 'starts_at', p_starts_at,
                            'ends_at', p_starts_at + make_interval(mins => p_duration_min));
end $function$;


CREATE OR REPLACE FUNCTION public._spot_view(p spot_plans, p_viewer uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'id', p.spot_id,
    'habit', p.habit,
    'intentions', to_jsonb(p.intentions),
    'freq', p.snapshot->>'freq',
    'visibility', p.visibility,
    'mode', case when p.visibility = 'shared' and p.shield='on' then p.mode end,
    'location', case when p.visibility = 'shared' then p.shield end,
    'city', p.city,
    'comment', p.comment,
    'starts_at', p.starts_at,
    'ends_at', p.starts_at + make_interval(mins => p.duration_min),
    'duration_min', p.duration_min,
    'state', case when p.starts_at > now() then 'will' when now() < p.starts_at + make_interval(mins => p.duration_min) then 'am' else 'was' end,
    'creator', (select pr.pseudo from public.profiles pr where pr.id = p.user_id),
    'mine', p.user_id = p_viewer,
    'video', p.video,
    'clip', case when p.video_id is not null then (select jsonb_build_object('id',v.id,'status',v.status) from public.videos v where v.id=p.video_id) end,
    'context', case when p.user_id = p_viewer then p.snapshot - 'at' end,
    'exact', case when public._spot_exact(p.user_id, p_viewer, p.visibility, p.shield)
                  then jsonb_build_object('lat', p.lat, 'lng', p.lng, 'place', p.place) end);
$function$;


create or replace function public.spot_rules() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('clip_seconds',33,'clip_max_bytes',33554432,'countdown',3,'duration_min',5,'duration_max',720,
  'max_day',24,'radius_km',60,'coarse_decimals',1,'feed_days',90,'horizon_days',90,'max_upcoming',10,
  'video_provider',case when exists(select 1 from public.video_backend where id and status='ready') then 'bunny' else 'storage' end);
$$;

revoke all on function public.space_habits() from public,anon;
grant execute on function public.space_habits() to authenticated,service_role;
revoke all on function public.space_discover(text,text,double precision,double precision,timestamptz,uuid,integer) from public;
grant execute on function public.space_discover(text,text,double precision,double precision,timestamptz,uuid,integer) to anon,authenticated,service_role;
revoke all on function public.spot_rules() from public;
grant execute on function public.spot_rules() to anon,authenticated,service_role;
revoke all on function public._space_video_owned(uuid,text),public._space_habit_box(uuid,jsonb),public._spot_view(public.spot_plans,uuid) from public,anon,authenticated;
grant execute on function public._space_video_owned(uuid,text),public._space_habit_box(uuid,jsonb),public._spot_view(public.spot_plans,uuid) to service_role;
revoke all on function public.spot_create(text,text,integer,text,double precision,double precision,text,text,text,text),public.spot_schedule(text,text,timestamptz,integer,text,double precision,double precision,text,text,text,text) from public,anon;
grant execute on function public.spot_create(text,text,integer,text,double precision,double precision,text,text,text,text),public.spot_schedule(text,text,timestamptz,integer,text,double precision,double precision,text,text,text,text) to authenticated,service_role;
