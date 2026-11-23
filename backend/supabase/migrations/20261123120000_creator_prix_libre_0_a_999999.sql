-- [COM] 23/11/2026 (Wah) : « on peut choisir n'importe quel montant concernant la souscription à un membre,
-- 1 000 000 € par an étant la limite » et « on doit pouvoir mettre 0 euro (notamment pour les tests) ».
-- Mesuré avant : trois bornes qui se contredisaient — la contrainte de table 3 € → 500 €, `monetization_set`
-- 3 € → 1 000 €, la page 3 € → 200 € (curseur). Un prix entre 500 et 1 000 € passait la fonction et cassait
-- sur la contrainte (« try again »). Maintenant UNE borne : 0 → 99 999 999 centimes (999 999,99 €), le
-- plafond d'un montant Stripe (8 chiffres) — 1 000 000 € pile n'est pas facturable par Stripe.

alter table public.creator_profiles drop constraint creator_price_chk;
alter table public.creator_profiles add constraint creator_price_chk
  check (custom_sub_price is null or (custom_sub_price >= 0 and custom_sub_price <= 99999999));

create or replace function public.monetization_set(p_enabled boolean, p_price_cents integer default null::integer, p_benefits text[] default null::text[])
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_prix int; v_meth text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if p_price_cents is not null and (p_price_cents < 0 or p_price_cents > 99999999) then
    return jsonb_build_object('ok', false, 'why', 'price', 'min', 0, 'max', 99999999);
  end if;

  insert into public.creator_profiles as cp (user_id, custom_sub_price, benefits)
  values (v_uid, p_price_cents, array['totehm','spots']::text[])
  on conflict (user_id) do update
    set custom_sub_price = coalesce(p_price_cents, cp.custom_sub_price),
        benefits         = array['totehm','spots']::text[];

  select custom_sub_price, payout_method into v_prix, v_meth
    from public.creator_profiles where user_id = v_uid;
  if p_enabled then
    if v_prix is null then return jsonb_build_object('ok', false, 'why', 'price_first'); end if;
    if v_meth is null then return jsonb_build_object('ok', false, 'why', 'payout_first'); end if;
  end if;
  update public.creator_profiles set monetized = coalesce(p_enabled, monetized) where user_id = v_uid;
  if p_enabled then
    update public.totehms set totehm_visibility = public._vis_shared() where user_id = v_uid;
  end if;
  return jsonb_build_object('ok', true, 'monetized', p_enabled, 'open', public._offer_open(v_uid));
end $function$;

create or replace function public.creator_dashboard()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
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
    'price_cents', v_cp.custom_sub_price, 'min_cents', 0, 'max_cents', 99999999,
    'enabled', coalesce(v_cp.monetized, false), 'open', public._offer_open(v_uid));
end $function$;
