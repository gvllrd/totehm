-- La box telle quelle, un élément éteint d'un tap (12/10/2026) : `spot_box_set`, `_spot_view`, `space_feed`.
-- Un space naît caché ; l'auteur éteint UN objectif et le rythme : ils ne sortent plus, ne se comparent plus.
-- Fixtures créées puis annulées par l'exception finale. Attendu : « FAIL={} ».
DO $t$
declare ua uuid; ub uuid; v_id uuid; r jsonb; s jsonb; fails text[] := '{}';
begin
  select p.id into ua from public.profiles p join auth.users u on u.id = p.id where p.pseudo is not null order by u.created_at limit 1;
  select p.id into ub from public.profiles p join auth.users u on u.id = p.id where p.pseudo is not null and p.id <> ua order by u.created_at limit 1;
  if ub is null then raise exception 'BOX ELEMENTS SELFTEST requires two profiles'; end if;
  insert into public.spots(user_id, intention, activite, lat, lng, duration_min, expires_at, is_public, required_role, active)
  values (ua, 'fight', 'x', 38.7, -9.1, 5, now(), false, 'public', false) returning id into v_id;
  insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at, duration_min, mode, place,
                                lat, lng, clat, clng, visibility, shield, city, capacity, access, selection, kind, format, status, show_why)
  values (v_id, ua, 'Selftest box habit', array['fight'],
          jsonb_build_object('freq', 'every_dawn_selftest',
                             'objectives', jsonb_build_array(jsonb_build_object('text', 'Climb the zebra peak'), jsonb_build_object('text', 'Secret quokka plan')),
                             'repulsions', jsonb_build_array(jsonb_build_object('text', 'Lazy narwhal mornings'))),
          now() - interval '1 hour', 5, 'silent', 'Lisbon', 38.72, -9.14, 38.7, -9.1, 'shared', 'off', 'Lisbon', 1, 'club', 'manual', 'experience', 'space', 'published', false);

  -- né caché
  perform set_config('request.jwt.claims', '{}', true);
  select e into s from jsonb_array_elements(public.space_feed('{}'::jsonb, null, null, 0, 40)->'spots') e where (e->>'id')::uuid = v_id;
  if s is null or s->'why' <> 'null'::jsonb then fails := fails || ('born_hidden ' || coalesce(s->>'why', 'absent')); end if;
  if public.spot_box_set(v_id, '{}'::jsonb)->>'why' <> 'signin' then fails := fails || 'anon_refused'; end if;

  -- un autre ne touche à rien
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  if public.spot_box_set(v_id, '{}'::jsonb)->>'why' <> 'not_mine' then fails := fails || 'other_refused'; end if;

  -- l'auteur éteint un objectif (casse indifférente) et le rythme
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  r := public.spot_box_set(v_id, jsonb_build_object('objectives', jsonb_build_array('secret QUOKKA plan'), 'freq', true));
  if not (r->>'ok')::boolean or not (r->>'objectives')::boolean or not (r->>'repulsions')::boolean or (r->>'hidden')::int <> 2 then fails := fails || ('set ' || r::text); end if;
  if public.spot_box_set(v_id, '[]'::jsonb)->>'why' <> 'hide' then fails := fails || 'bad_hide'; end if;

  perform set_config('request.jwt.claims', '{}', true);
  select e into s from jsonb_array_elements(public.space_feed('{}'::jsonb, null, null, 0, 40)->'spots') e where (e->>'id')::uuid = v_id;
  if jsonb_array_length(s->'why'->'objectives') <> 1 or s->'why'->'objectives'->0->>'text' <> 'Climb the zebra peak'
     or jsonb_array_length(s->'why'->'repulsions') <> 1 then fails := fails || ('shown ' || coalesce((s->'why')::text, 'null')); end if;
  if s::text like '%quokka%' then fails := fails || 'hidden_leaks'; end if;
  if s->'freq' <> 'null'::jsonb then fails := fails || 'freq_leaks'; end if;
  -- ce qui est éteint ne se compare plus (sinon le filtre le révélerait)
  if exists(select 1 from jsonb_array_elements(public.space_feed(jsonb_build_object('objectives', jsonb_build_array('quokka plan')), null, null, 0, 40)->'spots') e where (e->>'id')::uuid = v_id)
    then fails := fails || 'hidden_matches'; end if;
  if not exists(select 1 from jsonb_array_elements(public.space_feed(jsonb_build_object('objectives', jsonb_build_array('zebra peak')), null, null, 0, 40)->'spots') e where (e->>'id')::uuid = v_id and e->'matched' ? 'objective')
    then fails := fails || 'shown_matches'; end if;
  if exists(select 1 from jsonb_array_elements(public.space_feed(jsonb_build_object('freq', 'every_dawn_selftest'), null, null, 0, 40)->'spots') e where (e->>'id')::uuid = v_id)
    then fails := fails || 'hidden_freq_matches'; end if;

  -- tout éteint → plus de why ; rien d'éteint → tout, rythme compris
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  r := public.spot_box_set(v_id, jsonb_build_object('objectives', jsonb_build_array('Climb the zebra peak', 'Secret quokka plan'), 'repulsions', jsonb_build_array('Lazy narwhal mornings')));
  if (r->>'objectives')::boolean or (r->>'repulsions')::boolean then fails := fails || ('all_off ' || r::text); end if;
  perform set_config('request.jwt.claims', '{}', true);
  select e into s from jsonb_array_elements(public.space_feed('{}'::jsonb, null, null, 0, 40)->'spots') e where (e->>'id')::uuid = v_id;
  if s->'why' <> 'null'::jsonb then fails := fails || 'all_off_why'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform public.spot_box_set(v_id, '{}'::jsonb);
  perform set_config('request.jwt.claims', '{}', true);
  select e into s from jsonb_array_elements(public.space_feed('{}'::jsonb, null, null, 0, 40)->'spots') e where (e->>'id')::uuid = v_id;
  if jsonb_array_length(s->'why'->'objectives') <> 2 or s->>'freq' <> 'every_dawn_selftest' then fails := fails || 'all_on'; end if;

  -- droits
  if has_function_privilege('anon', 'public.spot_box_set(uuid,jsonb)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.spot_box_set(uuid,jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public._spot_view(public.spot_plans,uuid)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.space_feed(jsonb,double precision,double precision,integer,integer)', 'EXECUTE')
     then fails := fails || 'grants'; end if;
  raise exception 'BOX ELEMENTS SELFTEST (rolled back) | FAIL=%', fails;
end $t$;
