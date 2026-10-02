-- TOTEHM · 02/10/2026 — luxury_settle : idempotent sur la session, bornes tenues.
-- Auto-annulé : se termine TOUJOURS par une exception. « SELFTEST_OK » = réussi.
do $$
declare a jsonb; b jsonb; n int;
begin
  a := public.luxury_settle('cs_selftest_lux', null, 'Test@Example.com', 'bag', 'note', 50000, 'EUR');
  b := public.luxury_settle('cs_selftest_lux', null, 'test@example.com', 'bag', 'note', 50000, 'eur');
  select count(*) into n from public.luxury_orders where session_id = 'cs_selftest_lux';
  if not (a->>'new')::boolean or (b->>'new')::boolean or n <> 1 then raise exception 'ECHEC idempotence % % %', a, b, n; end if;
  perform public.luxury_settle('cs_selftest_lux2', null, 'x@y.z', 'rocket', repeat('a', 400), 50000, 'eur');
  if (select piece <> 'other' or char_length(note) <> 280 from public.luxury_orders where session_id = 'cs_selftest_lux2') then
    raise exception 'ECHEC bornes';
  end if;
  if (public.market_view(null, null)->'door') is null then raise exception 'ECHEC market_view.door'; end if;
  if (public.luxury_access()->>'price_cents') is null then raise exception 'ECHEC luxury_access prix'; end if;
  raise exception 'SELFTEST_OK (annulé)';
end $$;
