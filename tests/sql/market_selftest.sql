-- TOTEHM · le cycle complet du marché, EN PRODUCTION, SANS RIEN LAISSER · 30/09/2026
-- Premier achat → webhook rejoué (idempotence) → mise en vente à 120 →
-- revente → 93 % au grand livre du vendeur, 7 % à TOTEHM.
-- Tout se passe dans un bloc qui finit par RAISE EXCEPTION : Postgres annule
-- tout. Le résultat EST le message d'erreur « SELFTEST (rolled back): … ».
-- Attendu : primary=true · replay_new=false · list=true · resale_reserve=true ·
--           resale=true seller=11160 royalty=840 · ledger=11160 ·
--           owner_is_b=true · incidents=0
-- Relevé le 30/09/2026 : exactement ça.
do $t$
declare ua uuid; ub uuid; ma text; mb text; s text; r jsonb; p jsonb; e uuid; out text := '';
begin
  select owner_id into ua from public.art_editions where owner_id is not null order by edition_no limit 1;
  if ua is null then select id into ua from auth.users where email is not null order by created_at limit 1; end if;
  select id into ub from auth.users where id <> ua and email is not null order by created_at limit 1;
  select lower(email) into ma from auth.users where id = ua;
  select lower(email) into mb from auth.users where id = ub;
  -- le THP pour les deux comptes, dans la transaction seulement
  insert into public.stoner_access(email, source, note) values (ma, 'grant', 'selftest') on conflict (email) do nothing;
  insert into public.stoner_access(email, source, note) values (mb, 'grant', 'selftest') on conflict (email) do nothing;
  select slug into s from public.artworks where collection = 'quantum' and edition_sold < edition_total order by sort_order limit 1;
  r := public.art_primary_reserve(s, ua);
  if not coalesce((r->>'ok')::boolean, false) then raise exception 'reserve failed: %', r; end if;
  p := public.art_settle('cs_selftest_1', 'pi_selftest_1', (r->>'reservation')::uuid, ua, ma, (r->>'price_cents')::bigint, r->>'currency');
  out := out || 'primary=' || (p->>'ok') || ' #' || (p->>'edition') || ' ' || (r->>'price_cents') || ' ' || (r->>'currency');
  p := public.art_settle('cs_selftest_1', 'pi_selftest_1', (r->>'reservation')::uuid, ua, ma, (r->>'price_cents')::bigint, r->>'currency');
  out := out || ' | replay_new=' || (p->>'new');
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  insert into public.creator_profiles(user_id, payout_method, payout_handle) values (ua, 'iban', 'SELFTEST0000')
    on conflict (user_id) do update set payout_method = coalesce(public.creator_profiles.payout_method, 'iban'),
                                         payout_handle = coalesce(public.creator_profiles.payout_handle, 'SELFTEST0000');
  select e2.id into e from public.art_editions e2 join public.artworks a on a.id = e2.artwork_id where a.slug = s and e2.owner_id = ua;
  p := public.art_list(e, 12000);
  out := out || ' | list=' || (p->>'ok');
  r := public.art_resale_reserve(e, ub);
  out := out || ' | resale_reserve=' || (r->>'ok');
  p := public.art_settle('cs_selftest_2', 'pi_selftest_2', (r->>'reservation')::uuid, ub, mb, 12000, r->>'currency');
  out := out || ' | resale=' || (p->>'ok') || ' seller=' || (p->>'seller_cents') || ' royalty=' || (p->>'royalty_cents');
  out := out || ' | ledger=' || coalesce((select amount_cents::text from public.member_ledger where source = 'stripe:cs_selftest_2' and kind = 'earning'), 'none');
  out := out || ' | owner_is_b=' || ((select owner_id from public.art_editions where id = e) = ub);
  out := out || ' | incidents=' || (select count(*) from public.market_incidents where stripe_session like 'cs_selftest_%');
  raise exception 'SELFTEST (rolled back): %', out;
end $t$;
-- Contrôle qu'il ne reste rien :
-- select count(*) from public.member_ledger where source like 'stripe:cs_selftest%';  → 0
