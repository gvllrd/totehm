-- LOT A (13/10/2026) : quatre niveaux — PRIVATE · FIGHER CLUB · MY SUBSCRIBERS · PUBLIC.
-- Lecteurs : l'auteur (A), un membre FIGHER CLUB (F, Totehm complet), un abonné de A (S), personne (N), anonyme.
-- Fixtures créées puis annulées par l'exception. Attendu : « FAIL={} ».
DO $t$
declare
  ua uuid := gen_random_uuid(); uf uuid := gen_random_uuid(); us uuid := gen_random_uuid(); un uuid := gen_random_uuid();
  pa text := 'zzaud_' || left(ua::text, 8);
  aud text[] := array['private','subscribers','figher','public'];
  sp uuid[] := '{}'; st uuid[] := '{}'; v_id uuid; i int; r jsonb; e jsonb; fails text[] := '{}'; v_photo text;
begin
  insert into auth.users(id, email) values (ua, pa || '_a@example.invalid'), (uf, pa || '_f@example.invalid'),
                                           (us, pa || '_s@example.invalid'), (un, pa || '_n@example.invalid');
  insert into public.profiles(id, pseudo) values (ua, pa), (uf, pa || '_f'), (us, pa || '_s'), (un, pa || '_n');
  insert into public.totehms(user_id, steps) values (uf, '[{"t":"Selftest habit"}]');
  insert into public.objectives(user_id, text) values (uf, 'Selftest objective');
  insert into public.repulsions(user_id, repulsion, active) values (uf, 'Selftest repulsion', true);
  insert into public.wisdom(user_id, text) values (uf, 'Selftest story');
  insert into public.visions(user_id, text) values (uf, 'Selftest vision');
  insert into public.creator_subscriptions(creator_id, fan_id, status) values (ua, us, 'active');
  insert into public.totehms(user_id, totehm_visibility, steps)
  values (ua, 'members', '[{"t":"Run the hill","f":"daily","is":["fight"]}]');
  if (select audience from public.totehms where user_id = ua) <> 'subscribers' then fails := fails || 'totehm_legacy_insert'; end if;
  if not public._is_figher(uf) or public._is_figher(un) or public._is_figher(us) then fails := fails || 'fixture_fig'; end if;

  -- 4 spaces (passés) et 4 spots (à venir, ON), un par niveau ; `audience` posée, `visibility` doit suivre.
  for i in 1..4 loop
    v_photo := ua::text || '/' || gen_random_uuid()::text || '.jpg';
    insert into public.spots(user_id, intention, activite, lat, lng, duration_min, expires_at, is_public, required_role, active)
    values (ua, 'fight', 'x', 38.7, -9.1, 5, now(), false, 'public', false) returning id into v_id;
    insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at, duration_min, mode, place,
                                  lat, lng, clat, clng, visibility, audience, shield, city, capacity, access, selection, kind, format, status, photo, show_why)
    values (v_id, ua, 'Run the hill', array['fight'], '{"freq":"daily"}'::jsonb, now() - make_interval(hours => i), 5, 'silent', 'Lisbon',
            38.72, -9.14, 38.7, -9.1, 'shared', aud[i], 'off', 'Lisbon', 1, 'club', 'manual', 'experience', 'space', 'published', v_photo, false);
    sp := sp || v_id;
    insert into public.spots(user_id, intention, activite, lat, lng, duration_min, expires_at, is_public, required_role, active)
    values (ua, 'fight', 'x', 38.7, -9.1, 60, now() + interval '2 days', false, 'public', false) returning id into v_id;
    insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at, duration_min, mode, place,
                                  lat, lng, clat, clng, visibility, audience, shield, city, capacity, access, selection, kind, format, status, show_why)
    values (v_id, ua, 'Run the hill', array['fight'], '{"freq":"daily"}'::jsonb, now() + make_interval(days => 1, hours => i), 60, 'silent', 'Spot ' || i,
            38.72, -9.14, 38.7, -9.1, 'shared', aud[i], 'on', 'Lisbon', 4, 'club', 'manual', 'experience', 'spot', 'published', false);
    st := st || v_id;
  end loop;

  -- triggers : l'ancienne colonne suit, un ancien écrivain reste juste
  if exists(select 1 from public.spot_plans where spot_id = any(sp || st)
             and visibility <> case when audience = 'private' then 'private' else 'shared' end) then fails := fails || 'sync_visibility'; end if;
  update public.spot_plans set visibility = 'shared' where spot_id = sp[1];
  if (select audience from public.spot_plans where spot_id = sp[1]) <> 'public' then fails := fails || 'legacy_unprivate'; end if;
  update public.spot_plans set visibility = 'private' where spot_id = sp[1];
  if (select audience from public.spot_plans where spot_id = sp[1]) <> 'private' then fails := fails || 'legacy_private'; end if;
  update public.spot_plans set visibility = 'shared' where spot_id = sp[3];
  if (select audience from public.spot_plans where spot_id = sp[3]) <> 'figher' then fails := fails || 'legacy_keeps_level'; end if;

  -- anonyme : le public seul ; jamais un point
  perform set_config('request.jwt.claims', '{}', true);
  r := public.space_feed('{}'::jsonb, null, null, 0, 40);
  if array(select (x->>'id')::uuid from jsonb_array_elements(r->'spots') x where (x->>'id')::uuid = any(sp)) <> array[sp[4]] then fails := fails || 'anon_feed'; end if;
  r := public.spots_list(null, null, null, null, 100);
  if array(select (x->>'id')::uuid from jsonb_array_elements(r->'spots') x where (x->>'id')::uuid = any(st)) <> array[st[4]] then fails := fails || 'anon_list'; end if;
  if exists(select 1 from jsonb_array_elements(r->'spots') x where (x->>'id')::uuid = any(st) and x->'exact' <> 'null'::jsonb) then fails := fails || 'anon_point'; end if;
  if public.spot_get(sp[2])->>'why' <> 'nothing' or public.spot_get(sp[4])->>'ok' <> 'true' then fails := fails || 'anon_get'; end if;
  if public._clip_readable((select p.photo from public.spot_plans p where p.spot_id = sp[2])) then fails := fails || 'anon_clip'; end if;
  r := public.creator_universe(pa);
  if jsonb_array_length(r->'spaces') <> 3 or jsonb_array_length(r->'spots') <> 3 then fails := fails || 'uni_anon_count'; end if;
  if (select count(*) from jsonb_array_elements(r->'spaces') x where (x->>'locked')::boolean) <> 2 then fails := fails || 'uni_anon_locked'; end if;
  if exists(select 1 from jsonb_array_elements((r->'spaces') || (r->'spots')) x
             where (x->>'locked')::boolean and (x ? 'id' or x ? 'habit' or x ? 'photo' or x ? 'exact' or x ? 'city' or x ? 'creator')) then fails := fails || 'uni_locked_leak'; end if;
  if r->'totehm'->>'audience' <> 'subscribers' or (r->'totehm'->>'can_read')::boolean or (r->'totehm'->'counts'->>'habits')::int <> 1 then fails := fails || 'uni_totehm'; end if;

  -- N (connecté, rien) : comme l'anonyme, sans point
  perform set_config('request.jwt.claims', jsonb_build_object('sub', un, 'role', 'authenticated')::text, true);
  if exists(select 1 from jsonb_array_elements(public.spots_exact(null, null)->'spots') x where (x->>'id')::uuid = any(st)) then fails := fails || 'n_exact'; end if;
  if public.space_vibe(sp[2], true)->>'why' <> 'nothing' then fails := fails || 'n_vibe_reserved'; end if;
  if public._shared_with_me(ua) then fails := fails || 'n_totehm'; end if;

  -- F (FIGHER CLUB) : public + figher listés ; point des spots public + figher ; pas le réservé aux abonnés
  perform set_config('request.jwt.claims', jsonb_build_object('sub', uf, 'role', 'authenticated')::text, true);
  r := public.space_feed('{}'::jsonb, null, null, 0, 40);
  if array(select (x->>'id')::uuid from jsonb_array_elements(r->'spots') x where (x->>'id')::uuid = any(sp) order by x->>'starts_at') <> array[sp[4], sp[3]] then fails := fails || 'f_feed'; end if;
  r := public.spots_exact(null, null);
  if array(select (x->>'id')::uuid from jsonb_array_elements(r->'spots') x where (x->>'id')::uuid = any(st) order by x->>'starts_at') <> array[st[3], st[4]] then fails := fails || 'f_exact'; end if;
  if public.spot_get(sp[2])->>'why' <> 'nothing' or public.spot_get(sp[3])->>'ok' <> 'true' then fails := fails || 'f_get'; end if;
  if public._shared_with_me(ua) then fails := fails || 'f_totehm_subscribers'; end if;

  -- S (abonné de A, pas FIGHER) : lit tout sauf le privé ; les vitrines ne lui LISTENT que le public
  perform set_config('request.jwt.claims', jsonb_build_object('sub', us, 'role', 'authenticated')::text, true);
  r := public.space_feed('{}'::jsonb, null, null, 0, 40);
  if array(select (x->>'id')::uuid from jsonb_array_elements(r->'spots') x where (x->>'id')::uuid = any(sp)) <> array[sp[4]] then fails := fails || 's_feed_listed'; end if;
  if public.spot_get(sp[1])->>'why' <> 'nothing' or public.spot_get(sp[2])->>'ok' <> 'true' or public.spot_get(sp[3])->>'ok' <> 'true' then fails := fails || 's_get'; end if;
  r := public.spots_exact(null, null);
  if array(select (x->>'id')::uuid from jsonb_array_elements(r->'spots') x where (x->>'id')::uuid = any(st) order by x->>'starts_at') <> array[st[2], st[3], st[4]] then fails := fails || 's_exact'; end if;
  if not public._clip_readable((select p.photo from public.spot_plans p where p.spot_id = sp[2])) then fails := fails || 's_clip'; end if;
  if not public._shared_with_me(ua) then fails := fails || 's_totehm'; end if;
  r := public.creator_universe(pa);
  if exists(select 1 from jsonb_array_elements((r->'spaces') || (r->'spots')) x where (x->>'locked')::boolean)
     or jsonb_array_length(r->'spaces') <> 3 or not (r->'totehm'->>'can_read')::boolean then fails := fails || 'uni_s'; end if;
  if public.space_vibe(sp[2], true)->>'ok' <> 'true' then fails := fails || 's_vibe'; end if;
  if not exists(select 1 from jsonb_array_elements(public.my_vibes(40)->'given') x where (x->>'id')::uuid = sp[2]) then fails := fails || 's_my_vibes'; end if;
  update public.creator_subscriptions set status = 'canceled' where creator_id = ua and fan_id = us;
  if exists(select 1 from jsonb_array_elements(public.my_vibes(40)->'given') x where (x->>'id')::uuid = sp[2]) then fails := fails || 's_my_vibes_after_end'; end if;
  if public.spot_audience_set(sp[4], 'private')->>'why' <> 'not_mine' then fails := fails || 'set_not_mine'; end if;

  -- A : tout ; change une audience ; son Totehm passe FIGHER CLUB
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ua, 'role', 'authenticated')::text, true);
  if (select count(*) from jsonb_array_elements(public.space_feed('{}'::jsonb, null, null, 0, 40)->'spots') x where (x->>'id')::uuid = any(sp)) <> 4 then fails := fails || 'a_feed'; end if;
  if public.spot_audience_set(st[4], 'subscribers')->>'ok' <> 'true'
     or (select is_public from public.spots where id = st[4])
     or (select visibility from public.spot_plans where spot_id = st[4]) <> 'shared' then fails := fails || 'a_set'; end if;
  if public.spot_audience_set(st[4], 'nobody')->>'why' <> 'audience' then fails := fails || 'a_set_value'; end if;
  if public.visibility_set('figher')->>'ok' <> 'true'
     or (select totehm_visibility from public.totehms where user_id = ua) <> public._vis_shared() then fails := fails || 'a_totehm_set'; end if;
  if public.visibility_set('members')->>'visibility' <> 'subscribers' then fails := fails || 'a_totehm_legacy_name'; end if;
  perform public.visibility_set('figher');
  if public.creator_page(pa)->>'audience' <> 'figher' or public.my_landing()->>'visibility' <> 'figher' then fails := fails || 'a_page'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', uf, 'role', 'authenticated')::text, true);
  if not public._shared_with_me(ua) then fails := fails || 'f_totehm_figher'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', un, 'role', 'authenticated')::text, true);
  if public._shared_with_me(ua) then fails := fails || 'n_totehm_figher'; end if;

  -- droits
  if has_function_privilege('anon', 'public._audience_ok(uuid,text,uuid,boolean)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public._audience_listed(uuid,text,uuid,boolean)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public._point_ok(uuid,text,text,uuid,boolean)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public._audience_put(uuid,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.spot_audience_set(uuid,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.space_post_audience(text,text,double precision,double precision,text,text,text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.spot_schedule_audience(text,timestamp with time zone,integer,text,double precision,double precision,text,text,text,text,text)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.creator_universe(text,integer)', 'EXECUTE')
     or has_function_privilege('anon', 'public.my_vibes(integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public._spot_view(public.spot_plans,uuid)', 'EXECUTE') then fails := fails || 'grants'; end if;
  raise exception 'AUDIENCE SELFTEST (rolled back) | FAIL=%', fails;
end $t$;
