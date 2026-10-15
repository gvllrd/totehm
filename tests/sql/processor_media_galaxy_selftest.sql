-- LOT PROCESSEUR (15/10/2026) : `element_media_*` (les fichiers rattachés à un élément de MON Totehm) et
-- `totehm_galaxy` (les Totehms présentables). Fixtures annulées par l'exception. Attendu : « FAIL={} ».
DO $t$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  o uuid := gen_random_uuid(); p1 text; p2 text; px text; r jsonb; fails text[] := '{}'; n int;
begin
  insert into auth.users(id, email) values (ua, 'zzpm_a_' || left(ua::text, 8) || '@example.invalid'),
    (ub, 'zzpm_b_' || left(ub::text, 8) || '@example.invalid'), (uc, 'zzpm_c_' || left(uc::text, 8) || '@example.invalid');
  insert into public.profiles(id, pseudo) values (ua, 'zzpma' || left(ua::text, 6)), (ub, 'zzpmb' || left(ub::text, 6)), (uc, 'zzpmc' || left(uc::text, 6))
    on conflict (id) do update set pseudo = excluded.pseudo;
  insert into public.totehms(user_id, steps) values (ua, '[{"t":"Run the hill","is":["fight"]}]'::jsonb), (ub, '[]'::jsonb), (uc, '[]'::jsonb)
    on conflict (user_id) do update set steps = excluded.steps;
  update public.totehms set audience = 'subscribers' where user_id in (ua, ub);
  update public.totehms set audience = 'private' where user_id = uc;
  insert into public.objectives(id, user_id, text, target_at, "is", i) values (o, ua, 'Ship the collection', now() + interval '60 days', array['express'], 'express');
  p1 := ua::text || '/m-' || gen_random_uuid()::text || '.jpg';
  p2 := ua::text || '/m-' || gen_random_uuid()::text || '.pdf';
  px := ub::text || '/m-' || gen_random_uuid()::text || '.jpg';
  insert into storage.objects(bucket_id, name, owner, owner_id, metadata) values
    ('element-media', p1, ua, ua::text, '{"mimetype":"image/jpeg","size":120000}'::jsonb),
    ('element-media', p2, ua, ua::text, '{"mimetype":"application/pdf","size":80000}'::jsonb),
    ('element-media', px, ub, ub::text, '{"mimetype":"image/jpeg","size":1000}'::jsonb);

  -- sans session
  perform set_config('request.jwt.claims', '{}', true);
  if public.element_media_add('h', 'Run the hill', p1)->>'why' <> 'signin' or public.element_media_list()->>'why' <> 'signin'
     or public.element_media_remove(gen_random_uuid())->>'why' <> 'signin' then fails := fails || 'anon'; end if;
  r := public.totehm_galaxy(400);
  if not (r->'totehms' @> jsonb_build_array(jsonb_build_object('pseudo', 'zzpma' || left(ua::text, 6))))
     or r->'totehms' @> jsonb_build_array(jsonb_build_object('pseudo', 'zzpmc' || left(uc::text, 6))) then fails := fails || 'galaxy_anon'; end if;

  -- A : ses éléments
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ua, 'role', 'authenticated')::text, true);
  if public.element_media_add('h', 'Not my habit', p1)->>'why' <> 'not_mine' then fails := fails || 'habit_unknown'; end if;
  if public.element_media_add('h', 'Run the hill', px)->>'why' <> 'path' then fails := fails || 'other_folder'; end if;
  if public.element_media_add('h', 'Run the hill', ua::text || '/m-' || gen_random_uuid()::text || '.jpg')->>'why' <> 'file' then fails := fails || 'no_file'; end if;
  if public.element_media_add('x', 'Run the hill', p1)->>'why' <> 'kind' then fails := fails || 'kind'; end if;
  r := public.element_media_add('h', ' Run the hill ', p1, 'image/png', 5, 'hill.jpg');
  if r->>'ok' <> 'true' or r->>'mime' <> 'image/jpeg' or (r->>'bytes')::int <> 120000 then fails := fails || ('add_h ' || r::text); end if;
  if public.element_media_add('h', 'Run the hill', p1)->>'why' <> 'exists' then fails := fails || 'twice'; end if;
  r := public.element_media_add('o', o::text, p2, null, null, 'plan.pdf');
  if r->>'ok' <> 'true' then fails := fails || ('add_o ' || r::text); end if;
  r := public.element_media_list();
  if jsonb_array_length(r->'items') <> 2 then fails := fails || ('list ' || r::text); end if;
  r := public.element_media_list('h', 'Run the hill');
  if jsonb_array_length(r->'items') <> 1 or r->'items'->0->>'name' <> 'hill.jpg' then fails := fails || ('list_h ' || r::text); end if;
  -- renommer l'Habit : ses fichiers suivent
  if public.element_media_rekey('Run the hill', 'Run the big hill') <> 1 then fails := fails || 'rekey'; end if;
  if jsonb_array_length(public.element_media_list('h', 'Run the big hill')->'items') <> 1 then fails := fails || 'rekey_list'; end if;
  -- la galaxie ne me montre pas
  r := public.totehm_galaxy(400);
  if r->'totehms' @> jsonb_build_array(jsonb_build_object('pseudo', 'zzpma' || left(ua::text, 6)))
     or not (r->'totehms' @> jsonb_build_array(jsonb_build_object('pseudo', 'zzpmb' || left(ub::text, 6)))) then fails := fails || 'galaxy_me'; end if;

  -- B ne voit ni ne retire rien de A
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ub, 'role', 'authenticated')::text, true);
  if jsonb_array_length(public.element_media_list()->'items') <> 0 then fails := fails || 'b_sees'; end if;
  select count(*) into n from public.element_media m where m.user_id = ua;
  if public.element_media_remove((select m.id from public.element_media m where m.user_id = ua limit 1))->>'why' <> 'not_mine' then fails := fails || 'b_removes'; end if;
  if public.element_media_add('o', o::text, px)->>'why' <> 'not_mine' then fails := fails || 'b_attaches'; end if;

  -- A retire : marqué, le chemin rendu, absent de la liste
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ua, 'role', 'authenticated')::text, true);
  r := public.element_media_remove((select m.id from public.element_media m where m.user_id = ua and m.kind = 'o'));
  if r->>'ok' <> 'true' or r->>'path' <> p2 then fails := fails || ('remove ' || r::text); end if;
  if jsonb_array_length(public.element_media_list()->'items') <> 1 then fails := fails || 'remove_list'; end if;
  if public.element_media_remove((select m.id from public.element_media m where m.user_id = ua and m.kind = 'o'))->>'why' <> 'not_mine' then fails := fails || 'remove_twice'; end if;

  -- droits
  if has_function_privilege('anon', 'public.element_media_add(text,text,text,text,bigint,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.element_media_list(text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public._element_ok(uuid,text,text)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.totehm_galaxy(integer)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.element_media_rekey(text,text)', 'EXECUTE') then fails := fails || 'grants'; end if;
  if (select count(*) from pg_policies where tablename = 'element_media') <> 0
     or not (select relrowsecurity from pg_class where oid = 'public.element_media'::regclass) then fails := fails || 'rls'; end if;
  raise exception 'PROCESSOR MEDIA GALAXY SELFTEST (rolled back) | FAIL=%', fails;
end $t$;
