-- Product checks, in one transaction. The final exception rolls back EVERY fixture.
-- Expected: SPACE BOXES SELFTEST (rolled back) | FAIL={}
DO $test$
DECLARE ua uuid; ub uuid; s uuid; off_s uuid; empty_s uuid; legacy_s uuid; v uuid; oid uuid; rid bigint;
 r jsonb; h jsonb; fails text[]:='{}'; habit text:='Selftest spaces October'; start_at timestamptz:=now()+interval '2 days';
BEGIN
 SELECT p.id INTO ua FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE p.pseudo IS NOT NULL ORDER BY u.created_at LIMIT 1;
 SELECT p.id INTO ub FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE p.pseudo IS NOT NULL AND p.id<>ua ORDER BY u.created_at LIMIT 1;
 IF ub IS NULL THEN RAISE EXCEPTION 'SPACE BOXES SELFTEST needs two profiles'; END IF;
 UPDATE public.totehms SET steps=jsonb_build_array(jsonb_build_object('id','selftest-october','t',habit,'is',array['focus']),jsonb_build_object('t',habit||' empty','is',array['focus'])) WHERE user_id=ua;
 INSERT INTO public.objectives(user_id,text,"is") VALUES(ua,'Visible objective fixture',array['focus']) RETURNING id INTO oid;
 INSERT INTO public.objective_habits(user_id,objective_id,habit_text) VALUES(ua,oid,habit);
 INSERT INTO public.repulsions(user_id,habit_text,obstacle,problem,repulsion,active) VALUES(ua,habit,'Test obstacle','Test problem','Hidden repulsion fixture',true) RETURNING id INTO rid;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',ua,'role','authenticated')::text,true);
 SELECT x INTO h FROM jsonb_array_elements(public.space_habits()->'habits') x WHERE x->>'name'=habit;
 IF h->>'freq' IS NOT NULL OR h->>'place' IS NOT NULL OR h->'step' ? 'f' THEN fails:=array_append(fails,'missing_attributes_not_invented'); END IF;
 r:=public.spot_schedule(habit,'shared',start_at,45,'Meeting point',38.722347,-9.139347,'Lisbon',null,'social','on');s:=(r->>'id')::uuid;
 IF r->>'ok' IS DISTINCT FROM 'true' THEN fails:=array_append(fails,'schedule_ON'); END IF;
 IF public.spot_schedule(habit,'shared',start_at,45,'No off plans',38.72,-9.14,'Lisbon',null,null,'off')->>'why' IS DISTINCT FROM 'location' THEN fails:=array_append(fails,'reject_future_OFF'); END IF;
 IF public.spot_schedule(habit,'private',start_at,45,'No private plans',38.72,-9.14,'Lisbon',null,'silent','on')->>'why' IS DISTINCT FROM 'visibility' THEN fails:=array_append(fails,'reject_new_private'); END IF;
 IF public.spot_get(s)->'spot'->'why' IS DISTINCT FROM 'null'::jsonb THEN fails:=array_append(fails,'mini_boxes_hidden_by_default'); END IF;
 IF public.spot_box_visibility_set(s,true,false)->>'ok' IS DISTINCT FROM 'true' THEN fails:=array_append(fails,'enable_objective'); END IF;
 r:=public.spot_get(s)->'spot';
 IF jsonb_array_length(r->'why'->'objectives')<>1 OR jsonb_array_length(r->'why'->'repulsions')<>0 THEN fails:=array_append(fails,'independent_objective'); END IF;
 PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
 r:=public.spot_get(s)->'spot';
 IF r->'context' IS DISTINCT FROM 'null'::jsonb OR r->'exact' IS DISTINCT FROM 'null'::jsonb OR r::text LIKE '%Hidden repulsion fixture%' OR r::text LIKE '%Meeting point%' THEN fails:=array_append(fails,'public_hides_context_repulsion_exact'); END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(r->'why'->'objectives') x WHERE x->>'text'='Visible objective fixture') THEN fails:=array_append(fails,'public_selected_objective'); END IF;
 IF public.spot_box_visibility_set(s,false,true)->>'why' IS DISTINCT FROM 'signin' THEN fails:=array_append(fails,'anon_cannot_toggle'); END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',ub,'role','authenticated')::text,true);
 IF public.spot_box_visibility_set(s,false,true)->>'why' IS DISTINCT FROM 'not_mine' THEN fails:=array_append(fails,'other_cannot_toggle'); END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',ua,'role','authenticated')::text,true);
 PERFORM public.spot_box_visibility_set(s,false,true);
 r:=public.spot_get(s)->'spot';
 IF jsonb_array_length(r->'why'->'objectives')<>0 OR jsonb_array_length(r->'why'->'repulsions')<>1 THEN fails:=array_append(fails,'independent_repulsion'); END IF;
 PERFORM public.spot_why_set(s,false);
 IF public.spot_get(s)->'spot'->'why' IS DISTINCT FROM 'null'::jsonb THEN fails:=array_append(fails,'legacy_hide_remains_effective'); END IF;
 r:=public.spot_schedule(habit||' empty','shared',start_at,30,'Empty box point',38.72,-9.14,'Lisbon',null,'silent','on');empty_s:=(r->>'id')::uuid;
 IF public.spot_box_visibility_set(empty_s,true,false)->>'why' IS DISTINCT FROM 'empty' THEN fails:=array_append(fails,'cannot_enable_empty_group'); END IF;
 r:=public.video_reserve(ua,1024,20);v:=(r->>'id')::uuid;
 UPDATE public.videos SET bunny_video_id=gen_random_uuid(),status='processing' WHERE id=v;
 IF public.spot_create(habit,'shared',30,'bunny:'||v,38.72,-9.14,null,null,null,'off')->>'why' IS DISTINCT FROM 'city' THEN fails:=array_append(fails,'OFF_requires_city'); END IF;
 IF public.spot_create(habit,'shared',30,null,38.72,-9.14,'Lisbon',null,null,'off')->>'why' IS DISTINCT FROM 'video' THEN fails:=array_append(fails,'OFF_requires_content'); END IF;
 r:=public.spot_create(habit,'shared',30,'bunny:'||v,38.72,-9.14,'Lisbon',null,null,'off');off_s:=(r->>'id')::uuid;
 IF r->>'ok' IS DISTINCT FROM 'true' OR public.spot_get(off_s)->'spot'->>'city' IS DISTINCT FROM 'Lisbon' THEN fails:=array_append(fails,'OFF_current_city'); END IF;
 -- Simulate retained historical rows, never changing any actual content.
 UPDATE public.spot_plans SET starts_at=start_at WHERE spot_id=off_s;
 r:=public.spot_schedule(habit||' empty','shared',start_at,30,'Legacy place',38.72,-9.14,'Lisbon',null,'silent','on');legacy_s:=(r->>'id')::uuid;
 UPDATE public.spot_plans SET visibility='private' WHERE spot_id=legacy_s;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.spots_list(habit)->'spots') x WHERE x->>'id'=off_s::text) THEN fails:=array_append(fails,'RIGHT_excludes_legacy_OFF_owner'); END IF;
 IF public.spot_get(legacy_s)->'spot'->'exact'='null'::jsonb THEN fails:=array_append(fails,'historical_private_owner_access'); END IF;
 PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.spots_list(habit)->'spots') x WHERE x->>'id' IN(off_s::text,legacy_s::text)) OR public.spot_get(legacy_s)->>'ok' IS DISTINCT FROM 'false' THEN fails:=array_append(fails,'historical_private_stays_private'); END IF;
 IF has_function_privilege('anon','public.spot_box_visibility_set(uuid,boolean,boolean)','EXECUTE') OR NOT has_function_privilege('authenticated','public.spot_box_visibility_set(uuid,boolean,boolean)','EXECUTE') OR has_function_privilege('authenticated','public._spot_view(public.spot_plans,uuid)','EXECUTE') THEN fails:=array_append(fails,'RPC_grants'); END IF;
 IF (SELECT proc.proconfig FROM pg_proc proc WHERE proc.oid='public.spot_box_visibility_set(uuid,boolean,boolean)'::regprocedure) IS DISTINCT FROM array['search_path=""'] THEN fails:=array_append(fails,'fixed_search_path'); END IF;
 RAISE EXCEPTION 'SPACE BOXES SELFTEST (rolled back): configured attributes, independent visibility, ownership, exact privacy, ON plans, OFF city/content, legacy privacy, grants | FAIL=%',fails;
END $test$;
