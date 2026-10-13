-- LOT B (13/10/2026) : l'image libre d'une VISION, et `my_visions()` (la vue de droite de totehm.com).
-- Fixtures annulées par l'exception. Attendu : « FAIL={} ».
DO $t$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); v uuid := gen_random_uuid(); o uuid := gen_random_uuid();
  p text; r jsonb; fails text[] := '{}';
begin
  insert into auth.users(id, email) values (ua, 'zzvis_a_' || left(ua::text, 8) || '@example.invalid'), (ub, 'zzvis_b_' || left(ub::text, 8) || '@example.invalid');
  insert into public.visions(id, user_id, text, "is", i) values (v, ua, 'A quiet house by the sea', array['love'], 'love');
  insert into public.objectives(id, user_id, text, target_at, "is", i) values (o, ua, 'Save for the house', now() + interval '90 days', array['enrich'], 'enrich');
  insert into public.objective_visions(user_id, objective_id, vision_id) values (ua, o, v);
  p := ua::text || '/vision-' || gen_random_uuid()::text || '.jpg';

  perform set_config('request.jwt.claims', '{}', true);
  if public.my_visions()->>'why' <> 'signin' or public.vision_image_set(v, p)->>'why' <> 'signin' then fails := fails || 'anon'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', ub, 'role', 'authenticated')::text, true);
  if public.vision_image_set(v, ub::text || '/vision-' || gen_random_uuid()::text || '.jpg')->>'why' <> 'not_mine' then fails := fails || 'not_mine'; end if;
  if jsonb_array_length(public.my_visions()->'visions') <> 0 then fails := fails || 'b_sees_nothing'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', ua, 'role', 'authenticated')::text, true);
  if public.vision_image_set(v, ub::text || '/vision-' || gen_random_uuid()::text || '.jpg')->>'why' <> 'path' then fails := fails || 'other_folder'; end if;
  if public.vision_image_set(v, ua::text || '/x.jpg')->>'why' <> 'path' then fails := fails || 'bad_name'; end if;
  r := public.vision_image_set(v, p);
  if r->>'ok' <> 'true' or r->>'image' <> p or r ? 'old' and r->>'old' is not null then fails := fails || ('set ' || r::text); end if;
  r := public.my_visions();
  if r->'visions'->0->>'image' <> p or r->'visions'->0->'objectives'->0->>'text' <> 'Save for the house' then fails := fails || ('list ' || r::text); end if;
  r := public.vision_image_set(v, null);
  if r->>'ok' <> 'true' or r->>'old' <> p or (select image from public.visions where id = v) is not null then fails := fails || 'remove'; end if;

  if has_function_privilege('anon', 'public.my_visions()', 'EXECUTE') or has_function_privilege('anon', 'public.vision_image_set(uuid,text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.vision_image_set(uuid,text)', 'EXECUTE') then fails := fails || 'grants'; end if;
  raise exception 'VISION IMAGE SELFTEST (rolled back) | FAIL=%', fails;
end $t$;
