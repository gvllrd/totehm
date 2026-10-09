-- why: one published object previously mixed inspiration and real-world meetings.
-- how: keep one table, its media and rights; split readers with a constrained format.
-- what: space_post/my_spots, fixed signatures, direct space feed, spot-only radar/list.
-- Source: production definitions read 09/10/2026; brief deviations authorized by Wah.

alter table public.spot_plans
  add column if not exists format text not null default 'spot'
  constraint spot_plans_format_check check (format in ('space','spot'));

-- space_post
CREATE OR REPLACE FUNCTION public.space_post(p_habit text, p_video text, p_lat double precision, p_lng double precision, p_city text, p_comment text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  p_visibility constant text := 'shared'; p_duration_min constant integer := 5;
  p_mode constant text := 'silent'; p_location constant text := 'off';
  v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules(); v_steps jsonb; v_s jsonb;
  v_is text[]; v_objs jsonb; v_reps jsonb; v_id uuid; v_mode text; v_loc text; v_city text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;

  select coalesce(t.steps,'[]'::jsonb) into v_steps from public.totehms t where t.user_id = v_uid limit 1;
  select s into v_s from jsonb_array_elements(coalesce(v_steps,'[]'::jsonb)) s
   where s->>'t' = p_habit and btrim(coalesce(s->>'t','')) <> '' limit 1;
  if v_s is null then return jsonb_build_object('ok', false, 'why', 'habit'); end if;
  v_is := public._step_intentions(v_s);

  if coalesce(p_visibility, '') <> 'shared' then return jsonb_build_object('ok', false, 'why', 'visibility'); end if;
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
  if p_location='off' and v_city is null then return jsonb_build_object('ok', false, 'why', 'city'); end if;

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
                                visibility, shield, video, photo, city, capacity, access, selection, kind, format)
  values (v_id, v_uid, p_habit, v_is,
          jsonb_build_object('habit', p_habit, 'intentions', to_jsonb(v_is),
                             'objectives', v_objs, 'repulsions', v_reps,
                             'freq', v_s->>'f', 'step', v_s, 'place', (select h.place from public.habit_spots h where h.user_id=v_uid and h.habit_text=p_habit), 'at', now()),
          now(), p_duration_min, coalesce(v_mode, 'silent'), coalesce(v_city, 'here'), p_lat, p_lng,
          round(p_lat::numeric, 1)::double precision, round(p_lng::numeric, 1)::double precision,
          nullif(left(btrim(coalesce(p_comment,'')), 400), ''),
          p_visibility, coalesce(v_loc, 'off'),
          case when p_video like 'bunny:%' or p_video like '%.jpg' then null else p_video end,
          case when p_video like '%.jpg' then p_video end,
          v_city, 1, 'club', 'manual', 'experience', 'space');

  if p_video like 'bunny:%' then update public.spot_plans set video_id = substring(p_video from 7)::uuid where spot_id = v_id; end if;

  return jsonb_build_object('ok', true, 'id', v_id,
                            'ends_at', now() + make_interval(mins => p_duration_min));
end $function$
;

-- my_spaces
CREATE OR REPLACE FUNCTION public.my_spaces(p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_before_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    where p.user_id = v_uid and p.status = 'published' and p.format = 'space'
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
$function$
;

-- my_spots
CREATE OR REPLACE FUNCTION public.my_spots(p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_before_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    where p.user_id = v_uid and p.status = 'published' and p.format = 'spot'
      and (p_before is null or p.starts_at < p_before
           or p.starts_at = p_before and p_before_id is not null and p.spot_id < p_before_id)
    order by p.starts_at desc, p.spot_id desc
    limit v_n + 1
  ), visible as (
    select * from page order by starts_at desc, spot_id desc limit v_n
  )
  select jsonb_build_object(
    'ok', true,
    'spots', coalesce((select jsonb_agg(jsonb_build_object(
      'id', spot_id, 'habit', habit, 'visibility', visibility,
      'starts_at', starts_at, 'ends_at', starts_at + make_interval(mins => duration_min),
      'place', place, 'city', city
    ) order by starts_at desc, spot_id desc) from visible), '[]'::jsonb),
    'more', exists(select 1 from page offset v_n)
  ) into v_result;
  return v_result;
end
$function$
;

-- _spot_view
CREATE OR REPLACE FUNCTION public._spot_view(p spot_plans, p_viewer uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'id', p.spot_id,
    'format', p.format,
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
    'photo', p.photo,
    'clip', case when p.video_id is not null then (select jsonb_build_object('id',v.id,'status',v.status) from public.videos v where v.id=p.video_id) end,
    'context', case when p.user_id = p_viewer then p.snapshot - 'at' end,
    'show_why', case when p.user_id = p_viewer then p.show_why end,
    'why', case when p.visibility = 'shared' and (coalesce((p.snapshot->>'show_objectives')::boolean,p.show_why) or coalesce((p.snapshot->>'show_repulsions')::boolean,p.show_why)) then jsonb_build_object(
        'objectives', (select coalesce(jsonb_agg(jsonb_build_object('text', o->>'text')), '[]'::jsonb)
                         from jsonb_array_elements(coalesce(p.snapshot->'objectives', '[]'::jsonb)) o where btrim(coalesce(o->>'text','')) <> '' and coalesce((p.snapshot->>'show_objectives')::boolean,p.show_why)),
        'repulsions', (select coalesce(jsonb_agg(jsonb_build_object('text', r->>'text')), '[]'::jsonb)
                         from jsonb_array_elements(coalesce(p.snapshot->'repulsions', '[]'::jsonb)) r where btrim(coalesce(r->>'text','')) <> '' and coalesce((p.snapshot->>'show_repulsions')::boolean,p.show_why))) end,
    'exact', case when p.format = 'spot' and public._spot_exact(p.user_id, p_viewer, p.visibility, p.shield)
                  then jsonb_build_object('lat', p.lat, 'lng', p.lng, 'place', p.place) end);
$function$
;

-- spots_feed
CREATE OR REPLACE FUNCTION public.spots_feed(p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_q text DEFAULT NULL::text, p_intention text DEFAULT NULL::text, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules(); v_res jsonb;
        v_lat double precision; v_lng double precision;
begin
  if p_lat is not null and p_lng is not null and abs(p_lat) <= 90 and abs(p_lng) <= 180 then
    v_lat := round(p_lat::numeric, 1)::double precision;
    v_lng := round(p_lng::numeric, 1)::double precision;
  end if;
  select coalesce(jsonb_agg(public._spot_view(x.p, v_uid) order by (x.p).starts_at desc), '[]'::jsonb) into v_res
    from (select p from public.spot_plans p
           where p.status = 'published' and p.format = 'spot'
             and p.starts_at <= now()
             and (p_before is null or p.starts_at < p_before)
             and public._spot_match(p, p_q, p_intention)
             and ((v_uid is not null and p.user_id = v_uid)
                  or (p.visibility = 'shared'
                      and p.starts_at > now() - make_interval(days => (v_r->>'feed_days')::int)
                      and (v_lat is null
                           or earth_distance(ll_to_earth(v_lat, v_lng), ll_to_earth(p.clat, p.clng))
                              <= (v_r->>'radius_km')::int * 1000)))
           order by p.starts_at desc
           limit greatest(1, least(coalesce(p_limit, 20), 40))) x;
  return jsonb_build_object('signed_in', v_uid is not null, 'spots', v_res);
end $function$
;

-- spots_exact
CREATE OR REPLACE FUNCTION public.spots_exact(p_q text DEFAULT NULL::text, p_intention text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules(); v_res jsonb;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false, 'spots', '[]'::jsonb); end if;
  select coalesce(jsonb_agg(public._spot_view(x.p, v_uid) order by (x.p).starts_at desc), '[]'::jsonb) into v_res
    from (select p from public.spot_plans p
           where p.status = 'published' and p.format = 'spot'
             and public._spot_match(p, p_q, p_intention)
             and (p.user_id = v_uid
                  or (p.visibility = 'shared' and p.shield = 'on'
                      and p.starts_at > now() - make_interval(days => (v_r->>'feed_days')::int)
                      and public._subscriber_of(p.user_id, v_uid)))
           order by p.starts_at desc limit 300) x;
  return jsonb_build_object('signed_in', true, 'spots', v_res);
end $function$
;

-- spots_list
CREATE OR REPLACE FUNCTION public.spots_list(p_q text DEFAULT NULL::text, p_intention text DEFAULT NULL::text, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_before_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid(); v_res jsonb; v_more boolean;
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  -- RIGHT is the future list. Cursor uses both timestamp and id so equal
  -- start times cannot silently lose a Spot on the next page.
  with readable as materialized (
    select p from public.spot_plans p
     where p.status = 'published' and p.format = 'spot' and p.starts_at > now() and p.shield = 'on'
       and (p.visibility = 'shared' or p.user_id = v_uid)
       and public._spot_match(p, p_q, p_intention)
       and (p_before is null or p.starts_at < p_before
            or (p.starts_at = p_before and p_before_id is not null and p.spot_id < p_before_id))
     order by p.starts_at desc, p.spot_id desc limit v_limit + 1
  ), numbered as (
    select p, row_number() over (order by (p).starts_at desc, (p).spot_id desc) as n from readable
  )
  select coalesce(jsonb_agg(public._spot_view(p, v_uid) order by (p).starts_at desc, (p).spot_id desc)
                    filter (where n <= v_limit), '[]'::jsonb), count(*) > v_limit
    into v_res, v_more from numbered;
  return jsonb_build_object('signed_in', v_uid is not null, 'spots', v_res, 'more', v_more);
end $function$
;

-- space_discover
CREATE OR REPLACE FUNCTION public.space_discover(p_view text, p_habit text DEFAULT NULL::text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_before_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_step jsonb; v_ints text[]; v_i text; v_one jsonb; v_all jsonb:='[]'::jsonb;v_list jsonb;v_more boolean:=false;v_match text:='all';
 v_lat double precision; v_lng double precision; v_rules jsonb := public.spot_rules();
 v_cap integer:=greatest(1,least(coalesce(p_limit,20),case when p_view='radar' then 300 else 100 end));
begin
 if p_lat is not null and p_lng is not null and abs(p_lat) <= 90 and abs(p_lng) <= 180 then
  v_lat := round(p_lat::numeric, 1)::double precision; v_lng := round(p_lng::numeric, 1)::double precision;
 end if;
 if p_view not in ('feed','radar','list') then return jsonb_build_object('ok',false,'why','view','spots','[]'::jsonb); end if;
 if nullif(p_habit,'') is not null then
  select s into v_step from public.totehms t,jsonb_array_elements(t.steps) s where t.user_id=auth.uid() and s->>'t'=p_habit limit 1;
  if v_step is null then return jsonb_build_object('ok',false,'why','habit','spots','[]'::jsonb); end if;
  v_match:='habit';
  v_one:=case p_view when 'feed' then (select jsonb_build_object('signed_in', auth.uid() is not null, 'spots',
      coalesce(jsonb_agg(public._spot_view(x.p, auth.uid()) order by (x.p).starts_at desc), '[]'::jsonb))
      from (select p from public.spot_plans p
        where p.status = 'published' and p.format = 'space'
          and p.starts_at <= now()
          and (null::timestamptz is null or p.starts_at < null::timestamptz)
          and public._spot_match(p, p_habit, null::text)
          and ((auth.uid() is not null and p.user_id = auth.uid())
               or (p.visibility = 'shared'
                   and p.starts_at > now() - make_interval(days => (v_rules->>'feed_days')::int)
                   and (v_lat is null or earth_distance(ll_to_earth(v_lat, v_lng), ll_to_earth(p.clat, p.clng))
                        <= (v_rules->>'radius_km')::int * 1000)))
        order by p.starts_at desc
        limit greatest(1, least(coalesce(1, 20), 40))) x)
    when 'radar' then public.spots_exact(p_habit,null) else public.spots_list(p_habit,null,null,null,1) end;
  if jsonb_array_length(coalesce(v_one->'spots','[]'::jsonb))=0 then v_match:='intention';v_ints:=public._step_intentions(v_step);end if;
 end if;
 if v_match <> 'intention' then
  v_one:=case p_view when 'feed' then (select jsonb_build_object('signed_in', auth.uid() is not null, 'spots',
      coalesce(jsonb_agg(public._spot_view(x.p, auth.uid()) order by (x.p).starts_at desc), '[]'::jsonb))
      from (select p from public.spot_plans p
        where p.status = 'published' and p.format = 'space'
          and p.starts_at <= now()
          and (p_before is null or p.starts_at < p_before)
          and public._spot_match(p, p_habit, null::text)
          and ((auth.uid() is not null and p.user_id = auth.uid())
               or (p.visibility = 'shared'
                   and p.starts_at > now() - make_interval(days => (v_rules->>'feed_days')::int)
                   and (v_lat is null or earth_distance(ll_to_earth(v_lat, v_lng), ll_to_earth(p.clat, p.clng))
                        <= (v_rules->>'radius_km')::int * 1000)))
        order by p.starts_at desc
        limit greatest(1, least(coalesce(v_cap, 20), 40))) x)
    when 'radar' then public.spots_exact(p_habit,null) else public.spots_list(p_habit,null,p_before,p_before_id,v_cap) end;
  return v_one||jsonb_build_object('match',v_match);
 end if;
 foreach v_i in array coalesce(v_ints,'{}'::text[]) loop
  v_one:=case p_view when 'feed' then (select jsonb_build_object('signed_in', auth.uid() is not null, 'spots',
      coalesce(jsonb_agg(public._spot_view(x.p, auth.uid()) order by (x.p).starts_at desc), '[]'::jsonb))
      from (select p from public.spot_plans p
        where p.status = 'published' and p.format = 'space'
          and p.starts_at <= now()
          and (p_before is null or p.starts_at < p_before)
          and public._spot_match(p, null::text, v_i)
          and ((auth.uid() is not null and p.user_id = auth.uid())
               or (p.visibility = 'shared'
                   and p.starts_at > now() - make_interval(days => (v_rules->>'feed_days')::int)
                   and (v_lat is null or earth_distance(ll_to_earth(v_lat, v_lng), ll_to_earth(p.clat, p.clng))
                        <= (v_rules->>'radius_km')::int * 1000)))
        order by p.starts_at desc
        limit greatest(1, least(coalesce(v_cap, 20), 40))) x)
    when 'radar' then public.spots_exact(null,v_i) else public.spots_list(null,v_i,p_before,p_before_id,v_cap) end;
  v_all:=v_all||coalesce(v_one->'spots','[]'::jsonb);v_more:=v_more or coalesce((v_one->>'more')::boolean,false);
 end loop;
 select coalesce(jsonb_agg(x order by x->>'starts_at' desc,x->>'id' desc),'[]'::jsonb) into v_list from (select distinct x from jsonb_array_elements(v_all) x) d;
 v_more:=v_more or jsonb_array_length(v_list)>v_cap;
 select coalesce(jsonb_agg(x order by ord),'[]'::jsonb) into v_list from jsonb_array_elements(v_list) with ordinality a(x,ord) where ord<=v_cap;
 return jsonb_build_object('spots',v_list,'more',v_more,'match',v_match);
end $function$
;

-- habit_spaces
CREATE OR REPLACE FUNCTION public.habit_spaces(p_pseudo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me  uuid := auth.uid();
  v_uid uuid;
  v_out jsonb;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'why', 'signin');
  end if;

  if p_pseudo is null or btrim(p_pseudo) = '' then
    v_uid := v_me;
  else
    select id into v_uid from public.profiles
     where lower(pseudo) = lower(btrim(p_pseudo)) limit 1;
    if v_uid is null then
      return jsonb_build_object('ok', false, 'why', 'nobody');
    end if;
  end if;

  with s as (
    select p as r,
           lower(btrim(p.habit)) as k,
           p.habit,
           count(*) over (partition by lower(btrim(p.habit))) as n,
           row_number() over (
             partition by lower(btrim(p.habit))
             order by case
                        when now() >= p.starts_at
                         and now() <  p.starts_at + make_interval(mins => p.duration_min) then 0
                        when p.starts_at > now() then 1
                        else 2
                      end,
                      case when p.starts_at > now() then p.starts_at end asc nulls last,
                      p.starts_at desc,
                      p.spot_id desc) as rn
      from public.spot_plans p
     where p.user_id = v_uid
       and p.status = 'published'
       and btrim(coalesce(p.habit, '')) <> ''
       and (v_uid = v_me or p.visibility = 'shared')
  ), g as (
    select k,
           min(habit) as habit,
           max(n)     as total,
           jsonb_agg(public._spot_view(r, v_me) order by rn) filter (where rn <= 3) as spaces
      from s
     group by k
  )
  select coalesce(jsonb_agg(jsonb_build_object('habit', habit, 'total', total, 'spaces', spaces)
                            order by k), '[]'::jsonb)
    into v_out
    from g;

  return jsonb_build_object('ok', true, 'mine', v_uid = v_me, 'habits', v_out);
end
$function$
;

-- spot_get
CREATE OR REPLACE FUNCTION public.spot_get(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); p public.spot_plans%rowtype;
begin
  select * into p from public.spot_plans where spot_id = p_id and status = 'published';
  if p.spot_id is null or (p.visibility <> 'shared' and p.user_id is distinct from v_uid) then
    return jsonb_build_object('ok', false, 'why', 'nothing');
  end if;
  return jsonb_build_object('ok', true, 'spot', public._spot_view(p, v_uid));
end $function$
;

-- All permissions follow the last CREATE; existing anonymous readers are preserved.
revoke all on function public.space_post(text,text,double precision,double precision,text,text) from public, anon, authenticated, service_role;
grant execute on function public.space_post(text,text,double precision,double precision,text,text) to authenticated, service_role;
revoke all on function public.my_spaces(timestamptz,uuid,integer) from public, anon, authenticated, service_role;
grant execute on function public.my_spaces(timestamptz,uuid,integer) to authenticated, service_role;
revoke all on function public.my_spots(timestamptz,uuid,integer) from public, anon, authenticated, service_role;
grant execute on function public.my_spots(timestamptz,uuid,integer) to authenticated;
revoke all on function public._spot_view(public.spot_plans,uuid) from public, anon, authenticated, service_role;
grant execute on function public._spot_view(public.spot_plans,uuid) to service_role;
revoke all on function public.spots_feed(double precision,double precision,text,text,timestamptz,integer) from public, anon, authenticated, service_role;
grant execute on function public.spots_feed(double precision,double precision,text,text,timestamptz,integer) to anon, authenticated, service_role;
revoke all on function public.spots_exact(text,text) from public, anon, authenticated, service_role;
grant execute on function public.spots_exact(text,text) to authenticated, service_role;
revoke all on function public.spots_list(text,text,timestamptz,uuid,integer) from public, anon, authenticated, service_role;
grant execute on function public.spots_list(text,text,timestamptz,uuid,integer) to anon, authenticated, service_role;
revoke all on function public.space_discover(text,text,double precision,double precision,timestamptz,uuid,integer) from public, anon, authenticated, service_role;
grant execute on function public.space_discover(text,text,double precision,double precision,timestamptz,uuid,integer) to anon, authenticated, service_role;
revoke all on function public.habit_spaces(text) from public, anon, authenticated, service_role;
grant execute on function public.habit_spaces(text) to authenticated, service_role;
revoke all on function public.spot_get(uuid) from public, anon, authenticated, service_role;
grant execute on function public.spot_get(uuid) to anon, authenticated, service_role;

