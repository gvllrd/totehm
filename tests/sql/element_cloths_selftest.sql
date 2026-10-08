-- 08/10/2026 (ter) — `element_cloths` : les Cloths d'une leçon ou d'une vision, dans COM.
-- Attendu : une erreur « SELFTEST (rolled back) | FAIL={} » (c'est le succès : tout est annulé).
do $$
declare u uuid; o uuid; g uuid; s uuid; pu text; r jsonb; e jsonb; fails text[] := '{}';
        w text := gen_random_uuid()::text; v text := gen_random_uuid()::text;
        n1 text := '0.selftest-a' || substr(md5(random()::text), 1, 6);
        n2 text := '0.selftest-b' || substr(md5(random()::text), 1, 6);
        n3 text := '0.selftest-c' || substr(md5(random()::text), 1, 6);
        n4 text := '0.selftest-d' || substr(md5(random()::text), 1, 6);
        c1 uuid; c2 uuid; c3 uuid;
begin
  select t.user_id, p.pseudo into u, pu from public.totehms t join public.profiles p on p.id = t.user_id
   where btrim(coalesce(p.pseudo, '')) <> '' limit 1;
  select id into o from public.profiles where id <> u limit 1;
  select id into g from public.totehm_cloth_support order by active desc limit 1;
  select id into s from public.artistic_styles where active limit 1;

  -- 0. sans session : signin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  if public.element_cloths(null)->>'why' is distinct from 'signin' then fails := fails || 'signin'; end if;

  -- 1. un brouillon ne compte pas
  c1 := (public._cloth_draft_put(u, 'selftest@example.test', n1, g, 'L', s, 170, false, 'wisdom', w,
         '{"text":"Slow is smooth","view":"wisdom"}'::jsonb)->>'id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  if exists (select 1 from jsonb_array_elements(public.element_cloths(null)->'elements') x where x->>'ref' = w) then
    fails := fails || 'draft_listed'; end if;

  -- 2. payée : sous SON élément, son nom, son étape
  update public.totehm_clothes set status = 'paid', paid_at = now() where id = c1;
  r := public.element_cloths(null);
  select x into e from jsonb_array_elements(r->'elements') x where x->>'kind' = 'wisdom' and x->>'ref' = w;
  if e is null or (e->>'total')::int <> 1 or e->'cloths'->0->>'name' <> n1 or e->'cloths'->0->>'stage' <> 'making'
     or e->'cloths'->0->>'line' <> 'streetwear' or not (r->>'mine')::boolean then fails := fails || 'paid_mine'; end if;

  -- 3. deux pièces sur la même vision, la plus récente d'abord ; la mienne de test, marquée
  c2 := (public._cloth_draft_put(u, 'selftest@example.test', n2, g, 'M', s, 170, true, 'vision', v,
         '{"text":"A studio by the sea","view":"visions"}'::jsonb)->>'id')::uuid;
  update public.totehm_clothes set status = 'shipped', paid_at = now() where id = c2;
  c3 := (public._cloth_draft_put(u, 'selftest@example.test', n3, g, 'S', s, 170, false, 'vision', v,
         '{"text":"A studio by the sea","view":"visions"}'::jsonb)->>'id')::uuid;
  update public.totehm_clothes set status = 'production', paid_at = now() - interval '1 day' where id = c3;
  select x into e from jsonb_array_elements(public.element_cloths(null)->'elements') x where x->>'kind' = 'vision' and x->>'ref' = v;
  if e is null or (e->>'total')::int <> 2 or e->'cloths'->0->>'name' <> n2 or not (e->'cloths'->0->>'test')::boolean
     or e->'cloths'->0->>'stage' <> 'shipped' or e->'cloths'->1->>'stage' <> 'production' then fails := fails || 'order_test'; end if;

  -- 4. une pièce annulée disparaît
  update public.totehm_clothes set status = 'cancelled' where id = c3;
  select x into e from jsonb_array_elements(public.element_cloths(null)->'elements') x where x->>'ref' = v;
  if (e->>'total')::int <> 1 then fails := fails || 'cancelled'; end if;
  update public.totehm_clothes set status = 'production' where id = c3;

  -- 5. Luxury : un devis payé et nommé rejoint son élément
  insert into public.luxury_quotes(user_id, email, piece, brand, box_kind, box_ref, name, status, paid_at)
  values (u, 'selftest@example.test', 'jacket', 'Selftest', 'wisdom', w, n4, 'paid', now() + interval '1 minute');
  select x into e from jsonb_array_elements(public.element_cloths(null)->'elements') x where x->>'ref' = w;
  if (e->>'total')::int <> 2 or e->'cloths'->0->>'line' <> 'luxury' then fails := fails || 'luxury'; end if;

  -- 6. un autre membre SANS accès à ce Totehm : rien
  perform set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);
  r := public.element_cloths(pu);
  if jsonb_array_length(r->'elements') <> 0 or (r->>'mine')::boolean then fails := fails || 'stranger'; end if;

  -- 7. son abonné vivant, Totehm visible aux abonnés : les pièces réelles, jamais un test
  update public.totehms set totehm_visibility = public._vis_shared() where user_id = u;
  insert into public.creator_subscriptions(creator_id, fan_id, status) values (u, o, 'active');
  r := public.element_cloths(pu);
  if exists (select 1 from jsonb_array_elements(r->'elements') x, jsonb_array_elements(x->'cloths') c where c->>'name' = n2)
     or (select (x->>'total')::int from jsonb_array_elements(r->'elements') x where x->>'ref' = w) <> 2
     or (select (x->>'total')::int from jsonb_array_elements(r->'elements') x where x->>'ref' = v) <> 1
     or (r->>'mine')::boolean then fails := fails || 'subscriber'; end if;

  -- 8. un nom inconnu
  if public.element_cloths('nobody-' || md5(random()::text))->>'why' is distinct from 'nobody' then fails := fails || 'nobody'; end if;

  raise exception 'SELFTEST (rolled back) | FAIL=%', fails;
end $$;
