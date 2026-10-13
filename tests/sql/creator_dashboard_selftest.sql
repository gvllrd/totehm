-- LOT B (13/10/2026) : `creator_dashboard()` — trois chiffres (abonnés vivants · gagné ce mois-ci · prochain versement)
-- et le prix, pour la session seule. Fixtures annulées par l'exception. Attendu : « FAIL={} ».
DO $t$
declare uc uuid := gen_random_uuid(); uf uuid := gen_random_uuid(); ug uuid := gen_random_uuid(); r jsonb; fails text[] := '{}';
begin
  insert into auth.users(id, email) values (uc, 'zzdash_c_' || left(uc::text, 8) || '@example.invalid'),
    (uf, 'zzdash_f_' || left(uf::text, 8) || '@example.invalid'), (ug, 'zzdash_g_' || left(ug::text, 8) || '@example.invalid');
  insert into public.creator_subscriptions(creator_id, fan_id, status) values (uc, uf, 'active'), (uc, ug, 'canceled');
  insert into public.member_ledger(user_id, kind, amount_cents, currency, source) values
    (uc, 'earning', 1920, 'eur', 'zzdash:' || uc::text || ':1'), (uc, 'earning', 480, 'usd', 'zzdash:' || uc::text || ':2');

  perform set_config('request.jwt.claims', '{}', true);
  if public.creator_dashboard()->>'why' <> 'signin' then fails := fails || 'anon'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', uc, 'role', 'authenticated')::text, true);
  r := public.creator_dashboard();
  if r->>'ok' <> 'true' or (r->>'subscribers')::int <> 1 then fails := fails || ('subs ' || r::text); end if;
  if (r->>'month_cents')::int <> 1920 or r->>'currency' <> 'eur' then fails := fails || ('month ' || r::text); end if;
  if (r->>'next_payout')::date <= current_date or extract(day from (r->>'next_payout')::date)::int <> (public.payout_rules()->>'day')::int then fails := fails || 'next'; end if;
  if (r->>'min_cents')::int <> 300 or (r->>'max_cents')::int <> 100000 or r->>'period' <> 'year' or (r->>'enabled')::boolean then fails := fails || 'bounds'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', uf, 'role', 'authenticated')::text, true);
  r := public.creator_dashboard();
  if (r->>'subscribers')::int <> 0 or (r->>'month_cents')::int <> 0 then fails := fails || 'fan_sees_own_only'; end if;

  if has_function_privilege('anon', 'public.creator_dashboard()', 'EXECUTE') or not has_function_privilege('authenticated', 'public.creator_dashboard()', 'EXECUTE') then fails := fails || 'grants'; end if;
  raise exception 'CREATOR DASHBOARD SELFTEST (rolled back) | FAIL=%', fails;
end $t$;
