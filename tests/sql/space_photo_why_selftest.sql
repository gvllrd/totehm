-- SPACE · photo + WHY · TRIGGER · 03/10/2026 (ter)
-- This DO always raises at the end: all fixtures and changes roll back.
-- Expected: PHOTO WHY SELFTEST (rolled back): FAIL={}
DO $test$
DECLARE
  ua uuid; ub uuid; r jsonb; v_s uuid; v_p uuid; photo text; fails text[] := '{}'; habit text := 'Selftest photo Habit';
BEGIN
  SELECT p.id INTO ua FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE p.pseudo IS NOT NULL ORDER BY u.created_at LIMIT 1;
  SELECT p.id INTO ub FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE p.pseudo IS NOT NULL AND p.id <> ua ORDER BY u.created_at LIMIT 1;
  IF ub IS NULL THEN RAISE EXCEPTION 'PHOTO WHY SELFTEST requires two profiles'; END IF;
  UPDATE public.totehms SET steps = jsonb_build_array(jsonb_build_object('t',habit,'is',array['flow'],'f','daily')) WHERE user_id = ua;
  IF NOT FOUND THEN INSERT INTO public.totehms(user_id,steps) VALUES (ua,jsonb_build_array(jsonb_build_object('t',habit,'is',array['flow'],'f','daily'))); END IF;
  INSERT INTO public.repulsions(user_id,obstacle,repulsion,habit_text,active) VALUES (ua,'Selftest',  'Selftest alcohol',habit,true);
  photo := ua::text || '/' || gen_random_uuid()::text || '.jpg';
  INSERT INTO storage.objects(bucket_id,name,owner,owner_id) VALUES ('moments',photo,ua,ua::text);
  IF NOT (SELECT 'image/jpeg' = ANY(allowed_mime_types) FROM storage.buckets WHERE id='moments') THEN fails := array_append(fails,'bucket_jpeg'); END IF;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',ua,'role','authenticated')::text,true);
  r := public.spot_create(habit,'shared',30,photo,38.72,-9.14,'Lisbon',null,null,'off'); v_s := (r->>'id')::uuid;
  IF r->>'ok' IS DISTINCT FROM 'true' THEN fails := array_append(fails,'photo_space_'||coalesce(r->>'why','null')); END IF;
  IF public.spot_create(habit,'shared',30,ua::text||'/'||gen_random_uuid()::text||'.png',38.72,-9.14,'Lisbon',null,null,'off')->>'why' IS DISTINCT FROM 'video' THEN fails := array_append(fails,'png_refused'); END IF;
  v_p := (public.spot_schedule(habit,'private',now()+interval '1 day',30,'Lisbon',38.72,-9.14,'Lisbon')->>'id')::uuid;
  IF public.spot_get(v_s)->'spot'->'why' <> 'null'::jsonb THEN fails := array_append(fails,'why_hidden_by_default'); END IF;
  IF public.spot_why_set(v_s,true)->>'ok' IS DISTINCT FROM 'true' THEN fails := array_append(fails,'owner_shows_why'); END IF;
  PERFORM public.spot_why_set(v_p,true);
  PERFORM set_config('request.jwt.claims',json_build_object('sub',ub,'role','authenticated')::text,true);
  r := public.spot_get(v_s)->'spot';
  IF r->'why'->'repulsions'->0->>'text' IS DISTINCT FROM 'Selftest alcohol' OR r->'context' <> 'null'::jsonb OR r->'show_why' <> 'null'::jsonb THEN fails := array_append(fails,'reader_sees_only_why'); END IF;
  IF r->>'photo' IS DISTINCT FROM photo OR r->>'video' IS NOT NULL THEN fails := array_append(fails,'photo_in_its_column'); END IF;
  IF NOT public._clip_readable(photo) THEN fails := array_append(fails,'reader_can_sign_photo'); END IF;
  IF public.spot_why_set(v_s,false)->>'why' IS DISTINCT FROM 'not_mine' THEN fails := array_append(fails,'not_my_space'); END IF;
  IF (public.spot_get(v_p)->>'ok') = 'true' THEN fails := array_append(fails,'private_stays_private'); END IF;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',ua,'role','authenticated')::text,true);
  PERFORM public.spot_why_set(v_s,false);
  IF public.spot_get(v_s)->'spot'->'why' <> 'null'::jsonb OR (public.spot_get(v_s)->'spot'->>'show_why') IS DISTINCT FROM 'false' THEN fails := array_append(fails,'owner_hides_again'); END IF;
  PERFORM set_config('request.jwt.claims','{}',true);
  IF public.spot_why_set(v_s,true)->>'why' IS DISTINCT FROM 'signin' THEN fails := array_append(fails,'signin'); END IF;
  IF has_function_privilege('anon','public.spot_why_set(uuid,boolean)','execute') OR has_function_privilege('authenticated','public._spot_view(spot_plans,uuid)','execute') OR has_function_privilege('authenticated','public._clip_ok(uuid,text)','execute') OR has_function_privilege('anon','public.spot_create(text,text,integer,text,double precision,double precision,text,text,text,text)','execute') THEN fails := array_append(fails,'grants'); END IF;
  RAISE EXCEPTION 'PHOTO WHY SELFTEST (rolled back): FAIL=%', fails;
END $test$;
