-- 08/10/2026 — Streetwear immersif : nom repris (brouillon), Decode complet, œuvre après expédition.
-- Attendu : une erreur « SELFTEST (rolled back) | FAIL={} » (c'est le succès : tout est annulé).
do $$
declare u uuid; o uuid; g uuid; s uuid; c uuid; r jsonb; r2 jsonb; fails text[] := '{}';
        nm text := '0.selftest-' || substr(md5(random()::text), 1, 8);
        snap jsonb := '{"text":"Run the hill","view":"habits","palette":["#E24B4A"],"is":["fight"],"matter":{"objectives":[{"text":"Marathon"}]}}';
begin
  select user_id into u from public.boutique_admins limit 1;
  select id into o from public.profiles where id <> u limit 1;
  select id into g from public.totehm_cloth_support order by active desc limit 1;
  select id into s from public.artistic_styles where active limit 1;

  -- 1. un brouillon neuf
  r := public._cloth_draft_put(u, 'selftest@example.test', nm, g, 'L', s, 170, false, 'habit', 'Run the hill', snap);
  if not coalesce((r->>'ok')::boolean, false) then fails := fails || 'put_new'; end if;
  c := (r->>'id')::uuid;
  update public.totehm_clothes set stripe_session_id = 'cs_selftest_old' where id = c;

  -- 2. le nom : libre pour son auteur (son brouillon), pris pour tout autre
  if not public._cloth_name_free(nm, u) then fails := fails || 'free_owner'; end if;
  if public._cloth_name_free(nm, o) then fails := fails || 'taken_other'; end if;
  if public._cloth_name_free(upper(nm), null) then fails := fails || 'taken_case'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  if not public.name_available(nm) then fails := fails || 'available_owner'; end if;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  if public.name_available(nm) then fails := fails || 'available_anon'; end if;

  -- 3. reprise : la même pièce, choix remplacés, l'ancienne session rendue
  r2 := public._cloth_draft_put(u, 'selftest@example.test', upper(nm), g, 'XL', s, 170, false, 'habit', 'Run the hill', snap);
  if not coalesce((r2->>'ok')::boolean, false) or (r2->>'id')::uuid <> c or r2->>'old_session' <> 'cs_selftest_old' then fails := fails || 'put_reuse'; end if;
  if (select size from public.totehm_clothes where id = c) <> 'XL' or (select stripe_session_id from public.totehm_clothes where id = c) is not null then fails := fails || 'reuse_fields'; end if;
  if (select count(*) from public.totehm_clothes where lower(name) = lower(nm)) <> 1 then fails := fails || 'one_draft'; end if;

  -- 4. un autre membre ne prend pas ce nom
  r2 := public._cloth_draft_put(o, 'other@example.test', nm, g, 'L', s, 170, false, 'habit', 'X', '{"text":"X"}'::jsonb);
  if coalesce((r2->>'ok')::boolean, true) then fails := fails || 'put_other'; end if;

  -- 5. un brouillon ne se décode pas
  if coalesce((public.reveal_cloth(nm)->>'found')::boolean, true) then fails := fails || 'draft_hidden'; end if;

  -- 6. payée : se décode ; l'invité voit le vêtement, l'étape, le rang — pas l'élément ni la taille
  update public.totehm_clothes set status = 'production', paid_at = now(), stripe_payment_intent = 'pi_selftest' where id = c;
  r := public.reveal_cloth(nm);
  if not coalesce((r->>'found')::boolean, false) or r->>'level' <> 'locked' or r->>'text' is not null or r->>'size' is not null then fails := fails || 'reveal_locked'; end if;
  if r->>'garment' is null or r->>'stage' <> 'production' or coalesce((r->>'art')::boolean, true) or r->>'view' <> 'habits' then fails := fails || 'reveal_details'; end if;
  if coalesce((r->>'edition')::int, 0) < 1 then fails := fails || 'edition'; end if;
  if not coalesce((public.reveal_cloth(substr(nm, 3))->>'found')::boolean, false) then fails := fails || 'bare_name'; end if;
  -- son auteur : tout, la taille comprise
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  r := public.reveal_cloth(nm);
  if r->>'level' <> 'full' or r->>'text' <> 'Run the hill' or r->>'size' <> 'XL' or not (r->>'mine')::boolean or r->'matter' is null then fails := fails || 'reveal_full'; end if;

  -- 7. l'œuvre : seulement une fois expédiée, jamais avant, jamais une pièce de test
  update public.totehm_clothes set artwork_storage_path = c::text || '/final.png' where id = c;
  if public._cloth_art_path(nm) is not null or (public.reveal_cloth(nm)->>'art')::boolean then fails := fails || 'art_early'; end if;
  update public.totehm_clothes set status = 'shipped' where id = c;
  if public._cloth_art_path(nm) is distinct from c::text || '/final.png' or not (public.reveal_cloth(nm)->>'art')::boolean
     or public.reveal_cloth(nm)->>'stage' <> 'shipped' then fails := fails || 'art_shipped'; end if;
  update public.totehm_clothes set test = true where id = c;
  if public._cloth_art_path(nm) is not null then fails := fails || 'art_test'; end if;

  raise exception 'SELFTEST (rolled back) | FAIL=%', fails;
end $$;
