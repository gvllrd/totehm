-- SPACE · Future Habit Spots · 01/10/2026
-- This DO always raises at the end: all fixtures and changes roll back.
-- Expected: FUTURE SELFTEST (rolled back): ... FAIL={}
DO $test$
DECLARE
  ua uuid; ub uuid; uc uuid; r jsonb; first_page jsonb; second_page jsonb;
  v_private uuid; v_off uuid; v_on uuid; v_at timestamptz := now() + interval '2 days';
  fails text[] := '{}'; habit text := 'Selftest future Habit';
BEGIN
  SELECT p.id INTO ua FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE p.pseudo IS NOT NULL ORDER BY u.created_at LIMIT 1;
  SELECT p.id INTO ub FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE p.pseudo IS NOT NULL AND p.id <> ua ORDER BY u.created_at LIMIT 1;
  SELECT p.id INTO uc FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE p.pseudo IS NOT NULL AND p.id NOT IN (ua,ub) ORDER BY u.created_at LIMIT 1;
  IF uc IS NULL THEN RAISE EXCEPTION 'FUTURE SELFTEST requires three profiles'; END IF;
  UPDATE public.totehms SET steps = jsonb_build_array(jsonb_build_object('t',habit,'is',array['love','fight'],'f','daily')) WHERE user_id = ua;
  IF NOT FOUND THEN INSERT INTO public.totehms(user_id,steps) VALUES (ua,jsonb_build_array(jsonb_build_object('t',habit,'is',array['love','fight'],'f','daily'))); END IF;
  UPDATE public.creator_subscriptions SET status = 'canceled' WHERE creator_id = ua AND fan_id IN (ub,uc);
  INSERT INTO public.creator_subscriptions(creator_id,fan_id,status,amount_cents,current_period_end) VALUES (ua,ub,'active',3600,now()+interval '1 year');
  PERFORM set_config('request.jwt.claims',json_build_object('sub',ua,'role','authenticated')::text,true);
  -- API rules since 05/10: only SHARED + ON; legacy rows still obey their privacy.
  r := public.spot_schedule(habit,'private',v_at,45,'Secret planned place',38.722345,-9.139345,'Lisbon');
  IF r->>'why' IS DISTINCT FROM 'visibility' THEN fails:=array_append(fails,'new_private_refused'); END IF;
  r := public.spot_schedule(habit,'shared',v_at,45,'Secret planned place',38.722345,-9.139345,'Lisbon',null,'silent','on'); v_private := (r->>'id')::uuid;
  UPDATE public.spot_plans SET visibility='private' WHERE spot_id=v_private AND user_id=ua;
  UPDATE public.spots SET active=false WHERE id=v_private AND user_id=ua;
  IF r->>'ok' IS DISTINCT FROM 'true' THEN fails := array_append(fails,'create_private_' || coalesce(r->>'why','null')); END IF;
  r := public.spot_schedule(habit,'shared',v_at,45,'Off meeting point',38.722346,-9.139346,'Lisbon',null,'silent','off');
  IF r->>'why' IS DISTINCT FROM 'location' THEN fails:=array_append(fails,'new_off_refused'); END IF;
  r := public.spot_schedule(habit,'shared',v_at,45,'Off meeting point',38.722346,-9.139346,'Lisbon',null,'silent','on'); v_off := (r->>'id')::uuid;
  UPDATE public.spot_plans SET shield='off' WHERE spot_id=v_off AND user_id=ua;
  IF r->>'ok' IS DISTINCT FROM 'true' THEN fails := array_append(fails,'create_off'); END IF;
  r := public.spot_schedule(habit,'shared',v_at,60,'On meeting point',38.722347,-9.139347,'Lisbon',null,'social','on'); v_on := (r->>'id')::uuid;
  IF r->>'ok' IS DISTINCT FROM 'true' THEN fails := array_append(fails,'create_on'); END IF;
  IF (SELECT count(*) FROM public.spot_plans WHERE spot_id IN (v_private,v_off,v_on) AND video IS NULL AND intentions = array['love','fight']) <> 3 THEN fails := array_append(fails,'video_optional_intentions_from_own_habit'); END IF;
  IF (SELECT lat FROM public.spots WHERE id = v_on) <> 38.7 THEN fails := array_append(fails,'coarse_legacy_row'); END IF;
  IF public.spot_schedule('Not my Habit','private',v_at,30,'x',38.7,-9.1)->>'why' IS DISTINCT FROM 'habit' THEN fails := array_append(fails,'reject_other_habit'); END IF;
  IF public.spot_schedule(habit,'shared',now()-interval '1 hour',30,'x',38.7,-9.1,'Lisbon',null,'silent','on')->>'why' IS DISTINCT FROM 'when' THEN fails := array_append(fails,'reject_past_start'); END IF;
  IF public.spot_schedule(habit,'shared',now()+interval '91 days',30,'x',38.7,-9.1,'Lisbon',null,'silent','on')->>'why' IS DISTINCT FROM 'when' THEN fails := array_append(fails,'future_horizon'); END IF;
  IF public.spot_schedule(habit,'shared','infinity'::timestamptz,30,'x',38.7,-9.1,'Lisbon',null,'silent','on')->>'why' IS DISTINCT FROM 'when' THEN fails := array_append(fails,'reject_infinite_time'); END IF;
  IF public.spot_schedule(habit,'shared',v_at,2,'x',38.7,-9.1,'Lisbon',null,'silent','on')->>'why' IS DISTINCT FROM 'duration' THEN fails := array_append(fails,'duration_bounds'); END IF;
  IF public.spot_schedule(habit,'shared',v_at,30,'x','NaN'::float8,-9.1,'Lisbon',null,'silent','on')->>'why' IS DISTINCT FROM 'position' THEN fails := array_append(fails,'reject_nan_coordinate'); END IF;
  IF public.spot_schedule(habit,'shared',v_at,30,'x',38.7,-9.1)->>'why' IS DISTINCT FROM 'location' THEN fails := array_append(fails,'shared_needs_location_first'); END IF;
  IF public.spot_schedule(habit,'shared',v_at,30,'x',38.7,-9.1,null,null,'social')->>'why' IS DISTINCT FROM 'location' THEN fails := array_append(fails,'shared_needs_location'); END IF;
  r := public.spots_list(habit,'love');
  IF jsonb_array_length(r->'spots') <> 2 OR EXISTS (SELECT 1 FROM jsonb_array_elements(r->'spots') e WHERE e->>'state' <> 'will' OR e->'exact' = 'null'::jsonb) THEN fails := array_append(fails,'owner_future_exact'); END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(r->'spots') e WHERE e->>'id'=v_off::text) THEN fails:=array_append(fails,'legacy_off_absent_future_list'); END IF;
  IF jsonb_array_length(public.spots_list(habit,'focus')->'spots') <> 0 THEN fails := array_append(fails,'intention_filter'); END IF;
  first_page := public.spots_list(habit,'love',null,null,1);
  second_page := public.spots_list(habit,'love',(first_page->'spots'->0->>'starts_at')::timestamptz,(first_page->'spots'->0->>'id')::uuid,1);
  IF first_page->>'more' IS DISTINCT FROM 'true' OR jsonb_array_length(second_page->'spots') <> 1 OR first_page->'spots'->0->>'id' = second_page->'spots'->0->>'id' THEN fails := array_append(fails,'equal_time_pagination'); END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(public.spots_feed(38.7,-9.1,habit)->'spots') e WHERE e->>'id' IN (v_private::text,v_off::text,v_on::text)) THEN fails := array_append(fails,'future_absent_city_video_feed'); END IF;
  IF public.spot_habit_context('Not my Habit')->>'why' IS DISTINCT FROM 'habit' OR public.spot_habit_context(habit)->>'ok' IS DISTINCT FROM 'true' THEN fails := array_append(fails,'context_own_habit'); END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(public._bot_memory(ua)->'spots') e WHERE e->'facts'->>'habit' = habit AND e->'facts'->>'state' = 'will') THEN fails := array_append(fails,'bot_future_is_plan'); END IF;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',ub,'role','authenticated')::text,true);
  r := public.spots_list(habit,'love');
  IF jsonb_array_length(r->'spots') <> 1 OR EXISTS (SELECT 1 FROM jsonb_array_elements(r->'spots') e WHERE e->>'id' IN (v_private::text,v_off::text)) THEN fails := array_append(fails,'subscriber_no_private'); END IF;
  IF public.spot_get(v_off)->'spot'->'exact' <> 'null'::jsonb OR public.spot_get(v_on)->'spot'->'exact'->>'place' IS DISTINCT FROM 'On meeting point' THEN fails := array_append(fails,'subscriber_on_place_off_city'); END IF;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',uc,'role','authenticated')::text,true);
  r := public.spots_list(habit,'love');
  IF jsonb_array_length(r->'spots') <> 1 OR EXISTS (SELECT 1 FROM jsonb_array_elements(r->'spots') e WHERE e->'exact' <> 'null'::jsonb OR e ? 'place' OR e ? 'lat' OR e ? 'distance' OR e->'context' <> 'null'::jsonb) THEN fails := array_append(fails,'other_city_only'); END IF;
  PERFORM set_config('request.jwt.claims',json_build_object('role','anon')::text,true);
  IF public.spot_schedule(habit,'private',v_at,30,'x',38.7,-9.1)->>'why' IS DISTINCT FROM 'signin' THEN fails := array_append(fails,'anonymous_cannot_write'); END IF;
  IF jsonb_array_length(public.spots_list(habit,'love')->'spots') <> 1 THEN fails := array_append(fails,'anonymous_future_discovery'); END IF;
  IF public.spot_get(v_private)->>'ok' IS DISTINCT FROM 'false' OR public.spot_get(v_on)->'spot'->'exact' <> 'null'::jsonb THEN fails := array_append(fails,'anonymous_no_private_no_exact'); END IF;
  UPDATE public.spot_plans SET starts_at = now() - interval '1 minute' WHERE spot_id = v_on;
  IF public.spot_get(v_on)->'spot'->>'state' IS DISTINCT FROM 'am' OR EXISTS (SELECT 1 FROM jsonb_array_elements(public.spots_list(habit)->'spots') e WHERE e->>'id' = v_on::text) THEN fails := array_append(fails,'will_to_am_leaves_future_list'); END IF;
  UPDATE public.spot_plans SET starts_at = now() - interval '2 hours' WHERE spot_id = v_on;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',ub,'role','authenticated')::text,true);
  IF public.spot_get(v_on)->'spot'->>'state' IS DISTINCT FROM 'was' OR public.spot_get(v_on)->'spot'->'exact' = 'null'::jsonb THEN fails := array_append(fails,'past_keeps_subscriber_exact'); END IF;
  UPDATE public.creator_subscriptions SET status = 'canceled' WHERE creator_id = ua AND fan_id = ub;
  IF public.spot_get(v_on)->'spot'->'exact' <> 'null'::jsonb THEN fails := array_append(fails,'expired_subscriber_loses_exact'); END IF;
  IF has_function_privilege('anon','public.spot_schedule(text,text,timestamptz,integer,text,double precision,double precision,text,text,text,text)','EXECUTE') OR NOT has_function_privilege('authenticated','public.spot_schedule(text,text,timestamptz,integer,text,double precision,double precision,text,text,text,text)','EXECUTE') THEN fails := array_append(fails,'writer_grants'); END IF;
  IF NOT has_function_privilege('anon','public.spots_list(text,text,timestamptz,uuid,integer)','EXECUTE') OR has_function_privilege('authenticated','public._spot_view(public.spot_plans,uuid)','EXECUTE') OR has_function_privilege('anon','public.spot_habit_context(text)','EXECUTE') THEN fails := array_append(fails,'reader_helper_grants'); END IF;
  RAISE EXCEPTION 'FUTURE SELFTEST (rolled back): creation, validation, pagination, filters, rights, transitions, bot, grants | FAIL=%',fails;
END $test$;
