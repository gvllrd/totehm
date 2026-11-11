-- TOTEHM · 11/11/2026 — L'ÉTUDE DE MATIÈRE DU LUXE : réservée, écrite, fermée.
-- Attendu : une erreur « SELFTEST (rolled back) | FAIL={} » — c'est le succès,
-- et TOUT est annulé (la ligne d'essai ne reste jamais en base).
do $$
declare u uuid; q uuid; d jsonb; r jsonb; m jsonb; acc jsonb; fails text[] := '{}';
begin
  select user_id into u from public.luxury_quotes limit 1;
  if u is null then select id into u from public.profiles limit 1; end if;

  insert into public.luxury_quotes(user_id, email, piece, brand, product, city, status,
                                   photo_path, media_path, media_kind, budget_cents, quote_cents, paid_at)
  values (u, 'selftest@example.test', 'bag', 'Hermès', 'Birkin 30', 'Los Angeles', 'quoted',
          u::text || '/selftest.jpg', u::text || '/selftest.webm', 'video', 1000000, 77000, now())
  returning id into q;

  -- 1 · LA RÉSERVATION rend le travail à faire, et marque la ligne
  d := public.luxury_material_due(3);
  if not exists (select 1 from jsonb_array_elements(d->'jobs') e where e->>'id' = q::text) then
    fails := fails || 'due_manque';
  end if;
  if not exists (select 1 from jsonb_array_elements(d->'jobs') e
                  where e->>'id' = q::text and e->>'media_kind' = 'video'
                    and e->>'product' = 'Birkin 30' and e->>'city' = 'Los Angeles') then
    fails := fails || 'due_champs';
  end if;
  select material into m from public.luxury_quotes where id = q;
  if coalesce(m->>'status','') <> 'running' then fails := fails || 'pas_reservee'; end if;

  -- 2 · DEUX PASSAGES NE PAIENT PAS DEUX FOIS LA MÊME IMAGE
  d := public.luxury_material_due(3);
  if exists (select 1 from jsonb_array_elements(d->'jobs') e where e->>'id' = q::text) then
    fails := fails || 'reservee_deux_fois';
  end if;

  -- 3 · L'ÉTUDE S'ÉCRIT, et elle est marquée faite
  r := public.luxury_material_set(q, '{"material":"calfskin","confidence":0.9}'::jsonb);
  if not (r->>'ok')::boolean then fails := fails || 'set_ko'; end if;
  select material into m from public.luxury_quotes where id = q;
  if m->>'material' <> 'calfskin' or m->>'status' <> 'done' then fails := fails || 'etude'; end if;
  if (select material_at is null from public.luxury_quotes where id = q) then fails := fails || 'heure'; end if;

  -- 4 · UNE PANNE DIT POURQUOI (et ne laisse pas la pièce coincée)
  perform public.luxury_material_set(q, null, 'openai 429');
  select material into m from public.luxury_quotes where id = q;
  if m->>'status' <> 'error' or m->>'why' <> 'openai 429' then fails := fails || 'panne'; end if;

  -- 5 · LE MEMBRE LIT SON ÉTUDE ET SES ÉCHÉANCES, jamais la réservation
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  acc := public.luxury_access();
  if (acc->>'price_cents')::int <> 77000 then fails := fails || 'acompte_770'; end if;
  if not exists (select 1 from jsonb_array_elements(acc->'quotes') e
                  where e->>'id' = q::text and (e->>'studied')::boolean
                    and e->>'artist_due_at' is not null and e->>'city' = 'Los Angeles'
                    and (e->>'budget_cents')::bigint = 1000000) then
    fails := fails || 'lecture_membre';
  end if;
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);

  -- 6 · PERSONNE D'AUTRE QUE LE SERVICE N'APPELLE UN FLUX PAYANT
  if has_function_privilege('anon', 'public.luxury_material_due(int)', 'execute')
     or has_function_privilege('authenticated', 'public.luxury_material_due(int)', 'execute')
     or has_function_privilege('anon', 'public.luxury_material_set(uuid,jsonb,text)', 'execute')
     or has_function_privilege('authenticated', 'public.luxury_material_set(uuid,jsonb,text)', 'execute') then
    fails := fails || 'droits_ouverts';
  end if;
  if not has_function_privilege('service_role', 'public.luxury_material_due(int)', 'execute') then
    fails := fails || 'service_ferme';
  end if;

  raise exception 'SELFTEST (rolled back) | FAIL=%', fails;
end $$;
