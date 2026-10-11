-- SPACE · réseau social (11/10/2026) : fil filtré par une Habit Box, vibes, profil,
-- activité, pouls, refus des invités. Fixtures créées puis annulées par l'exception.
-- Attendu : « FAIL={} ».
DO $t$
declare ua uuid; ub uuid; pa text; pb text; i int; v_id uuid; ids uuid[] := '{}'; r jsonb; fails text[] := '{}';
begin
  select p.id, p.pseudo into ua, pa from public.profiles p join auth.users u on u.id = p.id where p.pseudo is not null order by u.created_at limit 1;
  select p.id, p.pseudo into ub, pb from public.profiles p join auth.users u on u.id = p.id where p.pseudo is not null and p.id <> ua order by u.created_at limit 1;
  if ub is null then raise exception 'SOCIAL SELFTEST requires two profiles'; end if;
  -- 1 Run the hill (objectifs MONTRÉS, photo) · 2 Run the hill (objectifs CACHÉS) · 3 Read at dawn · 4 privé
  for i in 1..4 loop
    insert into public.spots(user_id, intention, activite, lat, lng, duration_min, expires_at, is_public, required_role, active)
    values (ua, 'fight', 'x', 38.7, -9.1, 5, now(), false, 'public', false) returning id into v_id;
    insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at, duration_min, mode, place,
                                  lat, lng, clat, clng, visibility, shield, city, capacity, access, selection, kind, format, status, photo, show_why)
    values (v_id, ua, case when i in (1,2,4) then 'Run the hill' else 'Read at dawn' end,
            case when i = 3 then array['focus'] else array['fight','love'] end,
            jsonb_build_object('freq', case when i = 3 then 'every_evening' else 'every_morning' end,
                               'objectives', jsonb_build_array(jsonb_build_object('text', case when i = 2 then 'Secret marathon plan' else 'Run the Lisbon marathon' end)),
                               'repulsions', jsonb_build_array(jsonb_build_object('text', 'Staying indoors all weekend')),
                               'show_objectives', i = 1, 'show_repulsions', i in (1,3)),
            now() - make_interval(hours => i), 5, 'silent', 'Lisbon', 38.72, -9.14, 38.7, -9.1,
            case when i = 4 then 'private' else 'shared' end, 'off', 'Lisbon', 1, 'club', 'manual', 'experience', 'space', 'published',
            case when i = 1 then ua::text || '/' || gen_random_uuid()::text || '.jpg' end, false);
    ids := ids || v_id;
  end loop;

  -- anon : partagés seulement, avec vibes
  perform set_config('request.jwt.claims', '{}', true);
  r := public.space_feed('{}'::jsonb, null, null, 0, 40);
  if exists(select 1 from jsonb_array_elements(r->'spots') e where (e->>'id')::uuid = ids[4]) then fails := fails || 'anon_private'; end if;
  if (select count(*) from jsonb_array_elements(r->'spots') e where (e->>'id')::uuid = any(ids[1:3])) <> 3 then fails := fails || 'anon_shared'; end if;
  if exists(select 1 from jsonb_array_elements(r->'spots') e where (e->>'id')::uuid = any(ids) and (e->'vibes') is null) then fails := fails || 'vibes_key'; end if;
  if exists(select 1 from jsonb_array_elements(r->'spots') e where e->>'format' <> 'space' or e->'exact' <> 'null'::jsonb) then fails := fails || 'feed_format_point'; end if;

  -- filtre : même Habit en premier, rythme, objectif MONTRÉ seulement
  r := public.space_feed(jsonb_build_object('habit', 'run the hill'), null, null, 0, 40);
  if (select count(*) from jsonb_array_elements(r->'spots') e where (e->>'id')::uuid = any(ids)) <> 2
     or not (r->>'filtered')::boolean then fails := fails || 'habit_filter'; end if;
  r := public.space_feed(jsonb_build_object('objectives', jsonb_build_array('Lisbon marathon this year')), null, null, 0, 40);
  if not exists(select 1 from jsonb_array_elements(r->'spots') e where (e->>'id')::uuid = ids[1] and e->'matched' ? 'objective')
     or exists(select 1 from jsonb_array_elements(r->'spots') e where (e->>'id')::uuid = ids[2]) then fails := fails || 'objective_visible_only'; end if;
  r := public.space_feed(jsonb_build_object('repulsions', jsonb_build_array('indoors')), null, null, 0, 40);
  if (select count(*) from jsonb_array_elements(r->'spots') e where (e->>'id')::uuid = any(ids)) <> 2 then fails := fails || 'repulsion_filter'; end if;
  r := public.space_feed(jsonb_build_object('freq', 'every_evening', 'ints', jsonb_build_array('fight')), null, null, 0, 40);
  if (select count(*) from jsonb_array_elements(r->'spots') e where (e->>'id')::uuid = any(ids)) <> 3 then fails := fails || 'or_semantics'; end if;
  r := public.space_feed(jsonb_build_object('shows', 'photo'), null, null, 0, 40);
  if (select count(*) from jsonb_array_elements(r->'spots') e where (e->>'id')::uuid = any(ids)) <> 1 then fails := fails || 'shows_photo'; end if;
  r := public.space_feed('{}'::jsonb, null, null, 0, 1);
  if jsonb_array_length(r->'spots') <> 1 or not (r->>'more')::boolean then fails := fails || 'pagination'; end if;

  -- vibes : B sur A
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  r := public.space_vibe(ids[1], true);
  if r->>'ok' <> 'true' or (r->>'vibes')::int <> 1 then fails := fails || ('vibe_on ' || r::text); end if;
  r := public.space_vibe(ids[1], true);
  if (r->>'vibes')::int <> 1 then fails := fails || 'vibe_idempotent'; end if;
  r := public.space_vibe(ids[1], false);
  if (r->>'vibes')::int <> 0 then fails := fails || 'vibe_off'; end if;
  perform public.space_vibe(ids[1], true);
  if public.space_vibe(ids[4], true)->>'why' <> 'nothing' then fails := fails || 'vibe_private'; end if;
  r := public.space_feed('{}'::jsonb, null, null, 0, 40);
  if not exists(select 1 from jsonb_array_elements(r->'spots') e where (e->>'id')::uuid = ids[1] and (e->>'vibed')::boolean and (e->>'vibes')::int = 1) then fails := fails || 'vibed_flag'; end if;
  r := public.my_vibes(10);
  if not exists(select 1 from jsonb_array_elements(r->'given') e where (e->>'id')::uuid = ids[1]) then fails := fails || 'given'; end if;
  r := public.space_profile(pa, 0, 30);
  if (r->>'spaces_total')::int < 3 or exists(select 1 from jsonb_array_elements(r->'spaces') e where (e->>'id')::uuid = ids[4])
     or (r->>'mine')::boolean then fails := fails || 'profile_other'; end if;

  -- A : son propre profil (privé compris), ses vibes reçues, pas sur le sien
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  if public.space_vibe(ids[1], true)->>'why' <> 'own' then fails := fails || 'vibe_own'; end if;
  r := public.space_profile(null, 0, 60);
  if not exists(select 1 from jsonb_array_elements(r->'spaces') e where (e->>'id')::uuid = ids[4]) or not (r->>'mine')::boolean then fails := fails || 'profile_mine'; end if;
  r := public.my_vibes(10);
  if not exists(select 1 from jsonb_array_elements(r->'received') e where (e->>'space')::uuid = ids[1] and e->>'by' = pb) then fails := fails || 'received'; end if;
  if (public.space_pulse()->>'spaces_week')::int < 3 then fails := fails || 'pulse'; end if;

  -- un invité (compte anonyme) : ni vibe, ni space, ni Higher Self
  update auth.users set is_anonymous = true where id = ub;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  if public.space_vibe(ids[3], true)->>'why' <> 'email' then fails := fails || 'guest_vibe'; end if;
  if public.space_post('Run the hill', 'x.jpg', 38.7, -9.1, 'Lisbon', null)->>'why' <> 'email' then fails := fails || 'guest_post'; end if;
  if public.sm_begin(ub, 'say')->>'why' <> 'email' then fails := fails || 'guest_sm'; end if;

  -- droits
  if has_function_privilege('anon', 'public.space_vibe(uuid,boolean)', 'EXECUTE')
     or has_function_privilege('anon', 'public.my_vibes(integer)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.space_feed(jsonb,double precision,double precision,integer,integer)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.space_profile(text,integer,integer)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.space_pulse()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.sm_begin(uuid,text)', 'EXECUTE')
     or has_table_privilege('authenticated', 'public.space_vibes', 'SELECT') then fails := fails || 'grants'; end if;
  raise exception 'SPACE SOCIAL SELFTEST (rolled back) | FAIL=%', fails;
end $t$;
