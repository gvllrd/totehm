-- SPACE · la vidéo d'un space futur · 03/10/2026 — spot_video_attach
-- This DO always raises at the end: all fixtures and changes roll back.
-- Expected: FUTURE VIDEO SELFTEST (rolled back): ... FAIL={}
DO $test$
DECLARE
  ua uuid; ub uuid; r jsonb; v_a uuid; v_b uuid; v_c uuid; vid uuid; vid_b uuid;
  v_at timestamptz := now() + interval '2 days'; fails text[] := '{}'; habit text := 'Selftest future video Habit';
BEGIN
  SELECT p.id INTO ua FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE p.pseudo IS NOT NULL ORDER BY u.created_at LIMIT 1;
  SELECT p.id INTO ub FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE p.pseudo IS NOT NULL AND p.id <> ua ORDER BY u.created_at LIMIT 1;
  IF ub IS NULL THEN RAISE EXCEPTION 'FUTURE VIDEO SELFTEST requires two profiles'; END IF;
  UPDATE public.totehms SET steps = jsonb_build_array(jsonb_build_object('t',habit,'is',array['love'],'f','daily')) WHERE user_id = ua;
  IF NOT FOUND THEN INSERT INTO public.totehms(user_id,steps) VALUES (ua,jsonb_build_array(jsonb_build_object('t',habit,'is',array['love'],'f','daily'))); END IF;
  INSERT INTO public.videos(user_id,status,byte_length,length_seconds) VALUES (ua,'processing',1000,12) RETURNING id INTO vid;
  INSERT INTO public.videos(user_id,status,byte_length,length_seconds) VALUES (ub,'ready',1000,12) RETURNING id INTO vid_b;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',ua,'role','authenticated')::text,true);
  -- City only (SHARED·OFF): the city centre stands for the place.
  r := public.spot_schedule(habit,'shared',v_at,30,'Porto',41.152,-8.622,'Porto',null,null,'off'); v_a := (r->>'id')::uuid;
  IF r->>'ok' IS DISTINCT FROM 'true' THEN fails := array_append(fails,'schedule_city_only'); END IF;
  v_b := (public.spot_schedule(habit,'private',v_at,30,'Porto',41.152,-8.622,'Porto')->>'id')::uuid;
  r := public.spot_video_attach(v_a,'bunny:'||vid);
  IF r->>'ok' IS DISTINCT FROM 'true' OR (SELECT video_id FROM public.spot_plans WHERE spot_id=v_a) IS DISTINCT FROM vid THEN fails := array_append(fails,'attach_own_bunny'); END IF;
  IF public.spot_video_attach(v_a,'bunny:'||vid)->>'ok' IS DISTINCT FROM 'true' THEN fails := array_append(fails,'idempotent'); END IF;
  IF public.spot_video_attach(v_b,'bunny:'||vid)->>'why' IS DISTINCT FROM 'video' THEN fails := array_append(fails,'one_video_one_space'); END IF;
  IF public.spot_video_attach(v_b,'bunny:'||vid_b)->>'why' IS DISTINCT FROM 'video' THEN fails := array_append(fails,'not_my_video'); END IF;
  IF public.spot_video_attach(v_b,'../etc/passwd')->>'why' IS DISTINCT FROM 'video' THEN fails := array_append(fails,'path_rejected'); END IF;
  IF (SELECT spot->'clip'->>'id' FROM (SELECT public.spot_get(v_a)->'spot' spot) x) IS DISTINCT FROM vid::text THEN fails := array_append(fails,'owner_reads_clip'); END IF;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',ub,'role','authenticated')::text,true);
  IF public.spot_video_attach(v_b,'bunny:'||vid_b)->>'why' IS DISTINCT FROM 'not_mine' THEN fails := array_append(fails,'not_my_space'); END IF;
  PERFORM set_config('request.jwt.claims','{}',true);
  IF public.spot_video_attach(v_a,'bunny:'||vid)->>'why' IS DISTINCT FROM 'signin' THEN fails := array_append(fails,'signin'); END IF;
  IF has_function_privilege('anon','public.spot_video_attach(uuid,text)','execute') THEN fails := array_append(fails,'anon_cannot_execute'); END IF;
  IF NOT has_function_privilege('authenticated','public.spot_video_attach(uuid,text)','execute') THEN fails := array_append(fails,'authenticated_executes'); END IF;
  RAISE EXCEPTION 'FUTURE VIDEO SELFTEST (rolled back): FAIL=%', fails;
END $test$;
