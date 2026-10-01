-- TOTEHM · les droits d'un Spot et d'un Totehm, EN PRODUCTION, SANS RIEN LAISSER · 01/10/2026
-- Trois comptes réels : A (créateur), B (abonné vivant de A), C (personne).
-- Tout se passe dans un bloc qui finit par RAISE EXCEPTION : Postgres annule
-- tout. Le résultat EST le message « SELFTEST (rolled back): … ».
-- Chaque ligne vaut 1 si la règle tient ; « FAIL » liste celles qui cassent.
-- Attendu : FAIL=[] et toutes les valeurs à true.
do $t$
declare ua uuid; ub uuid; uc uuid; pa text; r jsonb; v_p uuid; v_off uuid; v_on uuid;
        clip_p text; clip_off text; clip_on text; out text := ''; fails text[] := '{}';
        lis_lat double precision := 38.7223; lis_lng double precision := -9.1393;
  -- vrai si l'id est dans r->'spots'
begin
  select p.id into ua from public.profiles p join auth.users u on u.id = p.id where p.pseudo is not null order by u.created_at limit 1;
  select p.id into ub from public.profiles p join auth.users u on u.id = p.id where p.pseudo is not null and p.id <> ua order by u.created_at limit 1;
  select p.id into uc from public.profiles p join auth.users u on u.id = p.id where p.pseudo is not null and p.id not in (ua, ub) order by u.created_at limit 1;
  select pseudo into pa from public.profiles where id = ua;

  -- A a une Habit ; B est abonné vivant de A ; C rien.
  update public.totehms set steps = '[{"t":"Selftest sprint","i":"fight","is":["fight","flow"],"f":"daily"}]'::jsonb,
                            totehm_visibility = public._vis_shared() where user_id = ua;
  if not found then
    insert into public.totehms(user_id, steps, totehm_visibility)
    values (ua, '[{"t":"Selftest sprint","i":"fight","is":["fight","flow"],"f":"daily"}]'::jsonb, public._vis_shared());
  end if;
  insert into public.creator_subscriptions(creator_id, fan_id, status, amount_cents, current_period_end)
  values (ua, ub, 'active', 3600, now() + interval '1 year');

  -- Trois vidéos déposées par A.
  clip_p   := ua::text || '/' || gen_random_uuid()::text || '.webm';
  clip_off := ua::text || '/' || gen_random_uuid()::text || '.webm';
  clip_on  := ua::text || '/' || gen_random_uuid()::text || '.webm';
  insert into storage.objects(bucket_id, name, owner, owner_id)
  values ('moments', clip_p, ua, ua::text), ('moments', clip_off, ua, ua::text), ('moments', clip_on, ua, ua::text);

  -- ── A crée (gratuit, sans passeport) ──
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  r := public.spot_create('Selftest sprint', 'private', 45, clip_p, lis_lat, lis_lng, 'Lisbon', 'mine only');
  v_p := (r->>'id')::uuid;
  out := out || 'create_private=' || coalesce(r->>'ok','null');
  r := public.spot_create('Selftest sprint', 'shared', 45, clip_off, lis_lat, lis_lng, 'Lisbon', null, 'silent', 'off');
  v_off := (r->>'id')::uuid;
  out := out || ' | create_shared_off=' || coalesce(r->>'ok','null');
  r := public.spot_create('Selftest sprint', 'shared', 60, clip_on, lis_lat + 0.001, lis_lng, 'Lisbon', null, 'social', 'on');
  v_on := (r->>'id')::uuid;
  out := out || ' | create_shared_on=' || coalesce(r->>'ok','null');
  r := public.spot_create('Selftest sprint', 'shared', 45, clip_on, lis_lat, lis_lng, 'Lisbon');
  if r->>'why' <> 'location' then fails := array_append(fails, 'shared_needs_location'); end if;
  r := public.spot_create('Selftest sprint', 'private', 2, clip_p, lis_lat, lis_lng);
  if r->>'why' <> 'duration' then fails := array_append(fails, 'duration_bounds'); end if;
  r := public.spot_create('Not my habit', 'private', 45, clip_p, lis_lat, lis_lng);
  if r->>'why' <> 'habit' then fails := array_append(fails, 'habit_from_my_totehm'); end if;
  if (select intentions from public.spot_plans where spot_id = v_on) <> array['fight','flow'] then fails := array_append(fails, 'intentions_from_habit'); end if;
  if (select active from public.spots where id = v_p) then fails := array_append(fails, 'private_row_inactive'); end if;
  if (select lat from public.spots where id = v_on) <> round(lis_lat::numeric, 1)::double precision then fails := array_append(fails, 'spots_row_coarse'); end if;

  -- Le propriétaire voit tout, exact.
  r := public.spots_exact();
  if (select count(*) from jsonb_array_elements(r->'spots') e where e->>'id' in (v_p::text, v_off::text, v_on::text) and e->'exact' is not null and e->'exact' <> 'null'::jsonb) <> 3
    then fails := array_append(fails, 'owner_exact_all'); end if;
  r := public.spots_feed(lis_lat, lis_lng);
  if not exists (select 1 from jsonb_array_elements(r->'spots') e where e->>'id' = v_p::text) then fails := array_append(fails, 'owner_feed_private'); end if;
  if (public.spot_get(v_p)->'spot'->'context') is null then fails := array_append(fails, 'owner_context'); end if;
  if (public.spot_get(v_p)->'spot'->>'mode') is not null then fails := array_append(fails, 'private_no_mode'); end if;

  -- ── B, abonné de A ──
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  r := public.spots_feed(lis_lat + 0.03, lis_lng - 0.02);
  if exists (select 1 from jsonb_array_elements(r->'spots') e where e->>'id' = v_p::text) then fails := array_append(fails, 'B_sees_private'); end if;
  if not exists (select 1 from jsonb_array_elements(r->'spots') e where e->>'id' = v_off::text and e->'exact' = 'null'::jsonb and e->>'city' = 'Lisbon') then fails := array_append(fails, 'B_off_city_only'); end if;
  if not exists (select 1 from jsonb_array_elements(r->'spots') e where e->>'id' = v_on::text and e->'exact' <> 'null'::jsonb) then fails := array_append(fails, 'B_on_exact'); end if;
  if exists (select 1 from jsonb_array_elements(r->'spots') e where e ? 'dist_m'
             or (e->>'id' in (v_off::text, v_on::text) and e->'context' <> 'null'::jsonb)) then fails := array_append(fails, 'B_no_distance_no_context'); end if;
  r := public.spots_exact();
  if (select count(*) from jsonb_array_elements(r->'spots') e where e->>'id' in (v_p::text, v_off::text, v_on::text)) <> 1
     or not exists (select 1 from jsonb_array_elements(r->'spots') e where e->>'id' = v_on::text) then fails := array_append(fails, 'B_radar_on_only'); end if;
  if coalesce((public.spot_get(v_p)->>'ok')::boolean, false) then fails := array_append(fails, 'B_get_private'); end if;
  if public._clip_readable(clip_p) then fails := array_append(fails, 'B_clip_private'); end if;
  if not public._clip_readable(clip_on) then fails := array_append(fails, 'B_clip_shared'); end if;
  if not coalesce((public.totehm_of(pa)->>'ok')::boolean, false) then fails := array_append(fails, 'B_reads_totehm'); end if;
  -- loin de Lisbonne : rien de A (le rayon se calcule sur la ville)
  r := public.spots_feed(48.85, 2.35);
  if exists (select 1 from jsonb_array_elements(r->'spots') e where e->>'id' in (v_off::text, v_on::text)) then fails := array_append(fails, 'B_far_feed'); end if;

  -- ── I AM HERE → I WAS THERE, droits identiques ──
  update public.spot_plans set starts_at = now() - interval '3 hours' where spot_id in (v_on, v_off);
  r := public.spots_exact();
  if not exists (select 1 from jsonb_array_elements(r->'spots') e where e->>'id' = v_on::text and e->>'state' = 'was' and e->'exact' <> 'null'::jsonb) then fails := array_append(fails, 'B_was_exact_kept'); end if;
  out := out || ' | state_now=' || (public.spot_get(v_off)->'spot'->>'state');

  -- ── C, personne ──
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  r := public.spots_feed(lis_lat, lis_lng);
  if exists (select 1 from jsonb_array_elements(r->'spots') e where e->>'id' = v_p::text) then fails := array_append(fails, 'C_sees_private'); end if;
  if exists (select 1 from jsonb_array_elements(r->'spots') e where e->>'id' in (v_off::text, v_on::text) and e->'exact' <> 'null'::jsonb) then fails := array_append(fails, 'C_exact_leak'); end if;
  if exists (select 1 from jsonb_array_elements(public.spots_exact()->'spots') e where e->>'id' in (v_p::text, v_off::text, v_on::text)) then fails := array_append(fails, 'C_radar_leak'); end if;
  if coalesce((public.totehm_of(pa)->>'ok')::boolean, false) then fails := array_append(fails, 'C_reads_totehm'); end if;
  if public._clip_readable(clip_p) then fails := array_append(fails, 'C_clip_private'); end if;
  out := out || ' | C_totehm=' || (public.totehm_of(pa)->>'why');

  -- ── Anonyme ──
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  r := public.spots_feed(lis_lat, lis_lng);
  if not exists (select 1 from jsonb_array_elements(r->'spots') e where e->>'id' = v_off::text) then fails := array_append(fails, 'anon_feed'); end if;
  if exists (select 1 from jsonb_array_elements(r->'spots') e where e->>'id' = v_p::text or (e->>'id' = v_on::text and e->'exact' <> 'null'::jsonb)) then fails := array_append(fails, 'anon_leak'); end if;
  if public._clip_readable(clip_p) or not public._clip_readable(clip_off) then fails := array_append(fails, 'anon_clip'); end if;
  out := out || ' | page_period=' || (public.creator_page(pa)->'sale'->>'period');
  if exists (select 1 from public.totehm_search(pa, 5) s where s.pseudo = pa) is not true then fails := array_append(fails, 'search_by_name'); end if;
  if exists (select 1 from public.totehm_search('Selftest sprint', 5)) then fails := array_append(fails, 'search_by_content'); end if;

  -- ── A repasse en PRIVATE : B ne lit plus ──
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  out := out || ' | vis_private=' || (public.visibility_set('private')->>'ok');
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  if coalesce((public.totehm_of(pa)->>'ok')::boolean, false) then fails := array_append(fails, 'B_reads_private_totehm'); end if;
  -- l'abonnement ne donne pas le bot
  if coalesce((public.totehmbot_access()->>'active')::boolean, false)
     and not coalesce((public.totehmbot_access()->>'comp')::boolean, false) then fails := array_append(fails, 'B_bot_from_sub'); end if;

  -- ── La mémoire du bot survit à l'arrêt ──
  insert into public.bot_subscriptions(user_id, status) values (ua, 'canceled')
    on conflict (user_id) do update set status = 'canceled';
  r := public._bot_memory(ua);
  out := out || ' | memory_spots=' || (select count(*) from jsonb_array_elements(r->'spots') e where e->'facts'->>'habit' = 'Selftest sprint');
  if exists (select 1 from public.spot_plans where spot_id = v_p and visibility <> 'private') then fails := array_append(fails, 'private_stays_private'); end if;

  raise exception 'SELFTEST (rolled back): % | FAIL=%', out, fails;
end $t$;

