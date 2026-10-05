-- 05/10/2026: new spaces are shared; planned spaces are always ON.
-- Existing private records remain private. No row migration or deletion.


CREATE OR REPLACE FUNCTION public.spot_create(p_habit text, p_visibility text, p_duration_min integer, p_video text, p_lat double precision, p_lng double precision, p_city text DEFAULT NULL::text, p_comment text DEFAULT NULL::text, p_mode text DEFAULT NULL::text, p_location text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
                                visibility, shield, video, photo, city, capacity, access, selection, kind)
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
          v_city, 1, 'club', 'manual', 'experience');

  if p_video like 'bunny:%' then update public.spot_plans set video_id = substring(p_video from 7)::uuid where spot_id = v_id; end if;

  return jsonb_build_object('ok', true, 'id', v_id,
                            'ends_at', now() + make_interval(mins => p_duration_min));
end $function$
;

CREATE OR REPLACE FUNCTION public.spot_schedule(p_habit text, p_visibility text, p_starts_at timestamp with time zone, p_duration_min integer, p_place text, p_lat double precision, p_lng double precision, p_city text DEFAULT NULL::text, p_comment text DEFAULT NULL::text, p_mode text DEFAULT NULL::text, p_location text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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

  if coalesce(p_visibility, '') <> 'shared' then return jsonb_build_object('ok', false, 'why', 'visibility'); end if;
  if p_visibility = 'shared' then
    if coalesce(p_location, '') <> 'on' then return jsonb_build_object('ok', false, 'why', 'location'); end if;
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
end $function$
;

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
     where p.status = 'published' and p.starts_at > now() and p.shield = 'on'
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

CREATE OR REPLACE FUNCTION public._spot_view(p public.spot_plans, p_viewer uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
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
    'photo', p.photo,
    'clip', case when p.video_id is not null then (select jsonb_build_object('id',v.id,'status',v.status) from public.videos v where v.id=p.video_id) end,
    'context', case when p.user_id = p_viewer then p.snapshot - 'at' end,
    'show_why', case when p.user_id = p_viewer then p.show_why end,
    'why', case when p.visibility = 'shared' and (coalesce((p.snapshot->>'show_objectives')::boolean,p.show_why) or coalesce((p.snapshot->>'show_repulsions')::boolean,p.show_why)) then jsonb_build_object(
        'objectives', (select coalesce(jsonb_agg(jsonb_build_object('text', o->>'text')), '[]'::jsonb)
                         from jsonb_array_elements(coalesce(p.snapshot->'objectives', '[]'::jsonb)) o where btrim(coalesce(o->>'text','')) <> '' and coalesce((p.snapshot->>'show_objectives')::boolean,p.show_why)),
        'repulsions', (select coalesce(jsonb_agg(jsonb_build_object('text', r->>'text')), '[]'::jsonb)
                         from jsonb_array_elements(coalesce(p.snapshot->'repulsions', '[]'::jsonb)) r where btrim(coalesce(r->>'text','')) <> '' and coalesce((p.snapshot->>'show_repulsions')::boolean,p.show_why))) end,
    'exact', case when public._spot_exact(p.user_id, p_viewer, p.visibility, p.shield)
                  then jsonb_build_object('lat', p.lat, 'lng', p.lng, 'place', p.place) end);
$function$
;

CREATE OR REPLACE FUNCTION public.spot_box_visibility_set(p_spot uuid,p_objectives boolean,p_repulsions boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_uid uuid:=auth.uid(); v_snap jsonb; v_obj boolean:=coalesce(p_objectives,false); v_rep boolean:=coalesce(p_repulsions,false);
BEGIN
 IF v_uid IS NULL THEN RETURN jsonb_build_object('ok',false,'why','signin'); END IF;
 SELECT snapshot INTO v_snap FROM public.spot_plans WHERE spot_id=p_spot AND user_id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'why','not_mine'); END IF;
 IF (v_obj AND jsonb_array_length(coalesce(v_snap->'objectives','[]'::jsonb))=0)
    OR (v_rep AND jsonb_array_length(coalesce(v_snap->'repulsions','[]'::jsonb))=0)
 THEN RETURN jsonb_build_object('ok',false,'why','empty'); END IF;
 UPDATE public.spot_plans SET snapshot=snapshot||jsonb_build_object('show_objectives',v_obj,'show_repulsions',v_rep),show_why=v_obj OR v_rep
 WHERE spot_id=p_spot AND user_id=v_uid;
 RETURN jsonb_build_object('ok',true,'objectives',v_obj,'repulsions',v_rep);
END $function$;


CREATE OR REPLACE FUNCTION public.spot_why_set(p_spot uuid, p_show boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_snap jsonb;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select snapshot into v_snap from public.spot_plans where spot_id = p_spot and user_id = v_uid for update;
  if not found then return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  if coalesce(p_show, false) and jsonb_array_length(coalesce(v_snap->'objectives','[]'::jsonb)) = 0
     and jsonb_array_length(coalesce(v_snap->'repulsions','[]'::jsonb)) = 0 then
    return jsonb_build_object('ok', false, 'why', 'empty');
  end if;
  update public.spot_plans set show_why = coalesce(p_show, false), snapshot=snapshot||jsonb_build_object('show_objectives',coalesce(p_show,false),'show_repulsions',coalesce(p_show,false)) where spot_id = p_spot and user_id = v_uid;
  return jsonb_build_object('ok', true, 'show_why', coalesce(p_show, false));
end $function$
;

-- API operations have explicit user checks; render helpers are internal only.
revoke all on function public._spot_view(public.spot_plans,uuid) from public,anon,authenticated;
revoke all on function public.spot_box_visibility_set(uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.spot_box_visibility_set(uuid,boolean,boolean) to authenticated,service_role;
revoke all on function public.spot_why_set(uuid,boolean) from public,anon;
grant execute on function public.spot_why_set(uuid,boolean) to authenticated,service_role;
revoke all on function public.spot_create(text,text,integer,text,double precision,double precision,text,text,text,text) from public,anon;
grant execute on function public.spot_create(text,text,integer,text,double precision,double precision,text,text,text,text) to authenticated,service_role;
revoke all on function public.spot_schedule(text,text,timestamptz,integer,text,double precision,double precision,text,text,text,text) from public,anon;
grant execute on function public.spot_schedule(text,text,timestamptz,integer,text,double precision,double precision,text,text,text,text) to authenticated,service_role;
revoke all on function public.spots_list(text,text,timestamptz,uuid,integer) from public;
grant execute on function public.spots_list(text,text,timestamptz,uuid,integer) to anon,authenticated,service_role;
notify pgrst,'reload schema';
