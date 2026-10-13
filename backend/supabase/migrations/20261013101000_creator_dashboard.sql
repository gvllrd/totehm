-- 13/10/2026 — LOT B : le tableau de bord du créateur, dans l'espace membre de totehm.com — TROIS chiffres
-- (abonnés vivants · gagné ce mois-ci · prochain versement) et le prix (le curseur). Lecture seule, la session décide.
-- Le prix s'écrit toujours par `monetization_set` (bornes 3 € – 1 000 € / an, inchangées).
create or replace function public.creator_dashboard()
returns jsonb language plpgsql stable security definer set search_path to '' as $f$
declare v_uid uuid := auth.uid(); v_r jsonb; v_next date; v_cp public.creator_profiles%rowtype; v_cur text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  v_r := public.payout_rules();
  select * into v_cp from public.creator_profiles where user_id = v_uid;
  v_cur := coalesce(v_cp.currency, 'eur');
  v_next := make_date(extract(year from now())::int, extract(month from now())::int, (v_r->>'day')::int);
  if v_next <= current_date then v_next := (v_next + interval '1 month')::date; end if;
  return jsonb_build_object('ok', true,
    'subscribers', (select count(*) from public.creator_subscriptions cs where cs.creator_id = v_uid and cs.status in ('active','trialing')),
    'month_cents', (select coalesce(sum(l.amount_cents), 0) from public.member_ledger l
                     where l.user_id = v_uid and l.kind = 'earning' and l.currency = v_cur and l.created_at >= date_trunc('month', now())),
    'pending_cents', coalesce((select (b->>'pending_cents')::int from jsonb_array_elements(public._balances(v_uid)) b where b->>'currency' = v_cur), 0),
    'currency', v_cur, 'next_payout', v_next, 'threshold_cents', (v_r->>'threshold_cents')::int,
    'part', (v_r->>'member_part')::int, 'period', 'year',
    'price_cents', v_cp.custom_sub_price, 'min_cents', 300, 'max_cents', 100000,
    'enabled', coalesce(v_cp.monetized, false), 'open', public._offer_open(v_uid));
end $f$;
revoke all on function public.creator_dashboard() from public, anon;
grant execute on function public.creator_dashboard() to authenticated, service_role;
