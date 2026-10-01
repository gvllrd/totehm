-- One transaction, always rolled back; no upload, no real data persists.
DO $test$
DECLARE ua uuid;ub uuid;r jsonb;h jsonb;v uuid;v_spot uuid;v_future uuid;v_off uuid;fails text[]:='{}';habit text:='Selftest exact Box';fallback text:='Selftest fallback Box';oid uuid;rid bigint;
BEGIN
 SELECT p.id into ua from public.profiles p join auth.users u on u.id=p.id where p.pseudo is not null order by u.created_at limit 1;
 SELECT p.id into ub from public.profiles p join auth.users u on u.id=p.id where p.pseudo is not null and p.id<>ua order by u.created_at limit 1;
 UPDATE public.totehms set steps=jsonb_build_array(jsonb_build_object('id','test-h','t',habit,'f','every_sunday','is',array['love','fight']),jsonb_build_object('t',fallback,'f','weekly','is',array['love']),jsonb_build_object('t',habit||' extra','f','daily','is',array['love'])) where user_id=ua;
 INSERT into public.habit_spots(user_id,habit_text,place,lat,lng) values(ua,habit,'Secret habitual place',38.72,-9.14) on conflict(user_id,habit_text) do update set place=excluded.place;
 INSERT into public.objectives(user_id,text,"is") values(ua,'Selftest WHY',array['love']) returning id into oid;
 INSERT into public.objective_habits(user_id,objective_id,habit_text) values(ua,oid,habit);
 INSERT into public.repulsions(user_id,habit_text,obstacle,problem,repulsion,active) values(ua,habit,'Test obstacle','Test problem','Selftest TRIGGER',true) returning id into rid;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',ua,'role','authenticated')::text,true);
 h:=public.space_habits()->'habits'->0;
 IF h->>'name'<>habit OR h->>'freq'<>'every_sunday' OR h->>'place'<>'Secret habitual place' OR h->'step'->>'id'<>'test-h'
  OR NOT EXISTS(select 1 from jsonb_array_elements(h->'objectives') x where x->>'text'='Selftest WHY')
  OR NOT EXISTS(select 1 from jsonb_array_elements(h->'repulsions') x where x->>'text'='Selftest TRIGGER') THEN fails:=array_append(fails,'closed_COM_box');END IF;
 r:=public.video_reserve(ua,1024,20);v:=(r->>'id')::uuid;
 IF r->>'ok' IS DISTINCT FROM 'true' THEN fails:=array_append(fails,'video_reserve');END IF;
 r:=public.spot_create(habit,'private',30,'bunny:'||v,38.72,-9.14,'Lisbon');
 IF r->>'why' IS DISTINCT FROM 'video' THEN fails:=array_append(fails,'uploading_cannot_publish');END IF;
 UPDATE public.videos set bunny_video_id=gen_random_uuid(),status='processing' where id=v;
 r:=public.spot_create(habit,'shared',30,'bunny:'||v,38.72,-9.14,'Lisbon',null,null,'off');v_spot:=(r->>'id')::uuid;
 IF r->>'ok' IS DISTINCT FROM 'true' THEN fails:=array_append(fails,'shared_off_no_mode');END IF;
 r:=public.spot_get(v_spot);
 IF r->'spot'->>'video' IS NOT NULL OR r->'spot'->'clip'->>'id'<>v::text OR r->'spot'->>'mode' IS NOT NULL OR r->'spot'->'context'->>'freq'<>'every_sunday' THEN fails:=array_append(fails,'bunny_ref_and_snapshot');END IF;
 r:=public.spot_schedule(habit,'shared',now()+interval '2 days',30,'Chosen point',38.73,-9.15,'Lisbon',null,null,'off');v_future:=(r->>'id')::uuid;
 IF r->>'ok' IS DISTINCT FROM 'true' THEN fails:=array_append(fails,'future_off_no_mode');END IF;
 r:=public.spot_schedule(habit||' extra','shared',now()+interval '3 days',30,'Other point',38.73,-9.15,'Lisbon',null,null,'off');
 IF EXISTS(select 1 from jsonb_array_elements(public.space_discover('list',habit)->'spots') x where x->>'habit'<>habit) THEN fails:=array_append(fails,'whole_habit_name');END IF;
 r:=public.spot_schedule(habit,'shared',now()+interval '2 days',30,'Chosen point',38.73,-9.15,'Lisbon',null,null,'on');
 IF r->>'why' IS DISTINCT FROM 'mode' THEN fails:=array_append(fails,'on_requires_mode');END IF;
 FOR r IN SELECT public.space_discover(x,habit,38.7,-9.1) from unnest(array['feed','radar','list']) x LOOP
  IF r->>'match' IS DISTINCT FROM 'habit' OR jsonb_array_length(r->'spots')=0 THEN fails:=array_append(fails,'exact_first');END IF;
 END LOOP;
 FOR r IN SELECT public.space_discover(x,fallback,38.7,-9.1) from unnest(array['feed','radar','list']) x LOOP
  IF r->>'match' IS DISTINCT FROM 'intention' OR jsonb_array_length(r->'spots')=0 THEN fails:=array_append(fails,'intention_fallback');END IF;
 END LOOP;
 r:=public.spot_create(habit,'private',30,'bunny:'||v,38.72,-9.14);
 IF r->>'why' IS DISTINCT FROM 'video' THEN fails:=array_append(fails,'same_video_not_reused');END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',ub,'role','authenticated')::text,true);
 r:=public.spot_create('Not my habit','private',30,'bunny:'||v,38.72,-9.14);
 IF r->>'why' IS DISTINCT FROM 'habit' OR public._space_video_owned(ub,'bunny:'||v) THEN fails:=array_append(fails,'owner_validation');END IF;
 r:=public.spot_get(v_spot);
 IF r->'spot'->'context'<>'null'::jsonb OR r->'spot'->'exact'<>'null'::jsonb OR r->'spot'->>'mode' IS NOT NULL THEN fails:=array_append(fails,'public_box_does_not_leak_private_totehm');END IF;
 PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
 IF public.space_habits()->>'why'<>'signin' OR public.space_discover('radar',habit)->>'why'<>'habit' THEN fails:=array_append(fails,'own_habits_auth');END IF;
 IF has_function_privilege('anon','public.space_habits()','EXECUTE') OR has_function_privilege('authenticated','public.video_reserve(uuid,bigint,double precision)','EXECUTE')
  OR has_table_privilege('authenticated','public.videos','SELECT') OR has_table_privilege('anon','public.video_backend','SELECT') THEN fails:=array_append(fails,'grants');END IF;
 IF NOT (select relrowsecurity from pg_class c where c.oid='public.videos'::regclass) THEN fails:=array_append(fails,'video_RLS');END IF;
 RAISE EXCEPTION 'HABITS VIDEO SELFTEST (rolled back): boxes, fallback, progressive choices, video ownership, rights, grants | FAIL=%',fails;
END $test$;
