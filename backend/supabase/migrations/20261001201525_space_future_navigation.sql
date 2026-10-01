-- SPACE · 01/10/2026 · Latest request supersedes the no-future rule.
-- Additive: retain live/private clips and subscriber rights, restore future
-- Habit Spots without an obligatory video. RIGHT lists future Spots only.
-- No table, content, money, subscription or legacy grant is changed.
-- Exact coordinates AND place name remain inside the authorized exact object.
CREATE OR REPLACE FUNCTION public.spot_rules()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'clip_seconds', 33,
    'clip_max_bytes', 20971520,
    'countdown', 3,
    'duration_min', 5, 'duration_max', 720,
    'max_day', 24,
    'radius_km', 60,
    'coarse_decimals', 1,
    'feed_days', 90, 'horizon_days', 90, 'max_upcoming', 10);
$function$;


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
    'mode', case when p.visibility = 'shared' then p.mode end,
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
    'context', case when p.user_id = p_viewer then p.snapshot - 'at' end,
    'exact', case when public._spot_exact(p.user_id, p_viewer, p.visibility, p.shield)
                  then jsonb_build_object('lat', p.lat, 'lng', p.lng, 'place', p.place) end);
$function$;


CREATE OR REPLACE FUNCTION public._bot_memory(p_user uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'rules', jsonb_build_object(
      'spot_end_is_not_completion', true,
      'mode_is_not_mood', true,
      'facts_vs_words', 'facts = what the base recorded; words = what the member wrote'),
    'totehm', jsonb_build_object(
      'habits', coalesce((select jsonb_agg(jsonb_build_object('text', s->>'t', 'is', to_jsonb(public._step_intentions(s)), 'freq', s->>'f'))
                            from public.totehms t, jsonb_array_elements(t.steps) s
                           where t.user_id = p_user and btrim(coalesce(s->>'t','')) <> ''), '[]'::jsonb),
      'objectives', coalesce((select jsonb_agg(jsonb_build_object('text', o.text, 'is', to_jsonb(o."is"), 'target_at', o.target_at, 'status', o.status))
                                from public.objectives o where o.user_id = p_user and btrim(o.text) <> ''), '[]'::jsonb),
      'repulsions', coalesce((select jsonb_agg(jsonb_build_object('text', r.repulsion, 'is', to_jsonb(r."is")))
                                from public.repulsions r where r.user_id = p_user and r.active and btrim(r.repulsion) <> ''), '[]'::jsonb),
      'visions', coalesce((select jsonb_agg(jsonb_build_object('text', v.text, 'is', to_jsonb(v."is")))
                             from public.visions v where v.user_id = p_user and btrim(v.text) <> ''), '[]'::jsonb),
      'wisdom', coalesce((select jsonb_agg(jsonb_build_object('text', w.text, 'is', to_jsonb(w."is")))
                            from public.wisdom w where w.user_id = p_user and btrim(w.text) <> ''), '[]'::jsonb)),
    'spots', coalesce((select jsonb_agg(jsonb_build_object(
        'facts', jsonb_build_object(
          'habit', p.habit, 'intentions', to_jsonb(p.intentions), 'visibility', p.visibility,
          'declared_mode', case when p.visibility = 'shared' then p.mode end,
          'location', case when p.visibility = 'shared' then p.shield end, 'city', p.city,
          'started_at', p.starts_at, 'planned_minutes', p.duration_min,
          'state', case when p.starts_at > now() then 'will' when now() < p.starts_at + make_interval(mins => p.duration_min) then 'am' else 'was' end,
          'has_video', p.video is not null),
        'words', jsonb_build_object('comment', p.comment),
        'unknown', jsonb_build_array('completion', 'mood'))
        order by p.starts_at desc)
      from public.spot_plans p where p.user_id = p_user and p.status = 'published'), '[]'::jsonb));
$function$;


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
           where p.status = 'published'
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
end $function$;


CREATE OR REPLACE FUNCTION public.spot_schedule(
  p_habit text, p_visibility text, p_starts_at timestamptz,
  p_duration_min integer, p_place text, p_lat double precision, p_lng double precision,
  p_city text DEFAULT NULL, p_comment text DEFAULT NULL,
  p_mode text DEFAULT NULL, p_location text DEFAULT NULL)
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
    if coalesce(p_mode, '') not in ('social','silent') then return jsonb_build_object('ok', false, 'why', 'mode'); end if;
    if coalesce(p_location, '') not in ('on','off') then return jsonb_build_object('ok', false, 'why', 'location'); end if;
    v_mode := p_mode; v_loc := p_location;
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
                             'freq', v_s->>'f', 'at', now()),
          p_starts_at, p_duration_min, coalesce(v_mode, 'silent'), left(btrim(p_place), 120), p_lat, p_lng,
          round(p_lat::numeric, 1)::double precision, round(p_lng::numeric, 1)::double precision,
          nullif(left(btrim(coalesce(p_comment,'')), 400), ''),
          p_visibility, coalesce(v_loc, 'off'), null, v_city, 1, 'club', 'manual', 'experience');

  return jsonb_build_object('ok', true, 'id', v_id, 'state', 'will', 'starts_at', p_starts_at,
                            'ends_at', p_starts_at + make_interval(mins => p_duration_min));
end $function$;


CREATE OR REPLACE FUNCTION public.spots_list(
  p_q text DEFAULT NULL, p_intention text DEFAULT NULL,
  p_before timestamptz DEFAULT NULL, p_before_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
declare
  v_uid uuid := auth.uid(); v_res jsonb; v_more boolean;
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  -- RIGHT is the future list. Cursor uses both timestamp and id so equal
  -- start times cannot silently lose a Spot on the next page.
  with readable as materialized (
    select p from public.spot_plans p
     where p.status = 'published' and p.starts_at > now()
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
end $function$;


CREATE OR REPLACE FUNCTION public.spot_habit_context(p_habit text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
declare v_uid uuid := auth.uid(); v_s jsonb; v_objs jsonb; v_reps jsonb;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select s into v_s from public.totehms t, jsonb_array_elements(coalesce(t.steps, '[]'::jsonb)) s
   where t.user_id = v_uid and s->>'t' = p_habit and btrim(coalesce(s->>'t','')) <> '' limit 1;
  if v_s is null then return jsonb_build_object('ok', false, 'why', 'habit'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('text', o.text, 'is', to_jsonb(o."is"))), '[]'::jsonb) into v_objs
    from public.objectives o where o.user_id = v_uid and btrim(o.text) <> ''
     and coalesce(o.status, 'active') not in ('achieved','abandoned','converted')
     and (o.id::text = v_s->>'o' or exists (select 1 from public.objective_habits oh
       where oh.user_id = v_uid and oh.objective_id = o.id and oh.habit_text = p_habit));
  select coalesce(jsonb_agg(jsonb_build_object('text', r.repulsion)), '[]'::jsonb) into v_reps
    from public.repulsions r where r.user_id = v_uid and r.active and btrim(r.repulsion) <> ''
     and (r.habit_text = p_habit or exists (select 1 from public.repulsion_habits rh
       where rh.user_id = v_uid and rh.repulsion_id = r.id and rh.habit_text = p_habit));
  return jsonb_build_object('ok', true, 'objectives', v_objs, 'repulsions', v_reps);
end $function$;


-- Revoke only after the final CREATE. No legacy writer is re-enabled.
REVOKE ALL ON FUNCTION public.spot_schedule(text,text,timestamptz,integer,text,double precision,double precision,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spot_schedule(text,text,timestamptz,integer,text,double precision,double precision,text,text,text,text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.spots_list(text,text,timestamptz,uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spots_list(text,text,timestamptz,uuid,integer) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.spot_habit_context(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spot_habit_context(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public._spot_view(public.spot_plans,uuid), public._bot_memory(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._spot_view(public.spot_plans,uuid), public._bot_memory(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.spot_rules(), public.spots_feed(double precision,double precision,text,text,timestamptz,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spot_rules(), public.spots_feed(double precision,double precision,text,text,timestamptz,integer) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
