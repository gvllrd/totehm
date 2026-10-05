-- 05/10/2026 — le luxe sur devis : accès, liste admin, devis payé, commande reliée, anonyme.
-- Attendu : une erreur « SELFTEST (rolled back) | FAIL={} » (c'est le succès : tout est annulé).
do $$
declare u uuid; q uuid; r jsonb; acc jsonb; fails text[] := '{}';
begin
  select user_id into u from public.boutique_admins limit 1;
  insert into public.luxury_quotes(user_id,email,piece,brand,note,status) values (u,'selftest@example.test','bag','Hermès','t','requested') returning id into q;
  update public.luxury_quotes set status='quoted', quote_cents=80000 where id=q;
  perform set_config('request.jwt.claims', json_build_object('sub',u,'role','authenticated')::text, true);
  acc := public.luxury_access();
  if not (acc->>'admin')::boolean then fails := fails || 'admin'; end if;
  if not exists (select 1 from jsonb_array_elements(acc->'quotes') e where e->>'id' = q::text and e->>'status'='quoted') then fails := fails || 'quote_visible'; end if;
  if jsonb_array_length(public.luxury_quotes_admin()->'quotes') < 1 then fails := fails || 'admin_list'; end if;
  insert into public.luxury_orders(session_id,user_id,email,piece,amount_cents,currency) values ('cs_selftest',u,'selftest@example.test','bag',80000,'eur');
  r := public.luxury_quote_paid(q,'cs_selftest',true);
  if not (r->>'ok')::boolean then fails := fails || 'paid'; end if;
  if not exists (select 1 from public.luxury_orders where session_id='cs_selftest' and quote_id=q and test) then fails := fails || 'order_link'; end if;
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  acc := public.luxury_access();
  if (acc->>'signed_in')::boolean or jsonb_array_length(acc->'quotes') <> 0 then fails := fails || 'anon'; end if;
  raise exception 'SELFTEST (rolled back) | FAIL=%', fails;
end $$;
