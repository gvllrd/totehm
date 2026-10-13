-- 13/10/2026 — LOT A : la console dit le niveau du Totehm parmi les quatre (`totehms.audience`),
-- plus l'ancienne traduction private / subscribers. Même signature, mêmes droits.
CREATE OR REPLACE FUNCTION public.my_console()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_cp public.creator_profiles%rowtype;
        v_rules jsonb := public.payout_rules(); v_next date; v_vis text;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;
  select * into v_cp from public.creator_profiles where user_id = v_uid;
  select audience into v_vis from public.totehms where user_id = v_uid limit 1;
  v_next := make_date(extract(year from now())::int, extract(month from now())::int, (v_rules->>'day')::int);
  if v_next <= current_date then v_next := (v_next + interval '1 month')::date; end if;

  return jsonb_build_object(
    'signed_in', true,
    'pseudo', (select pseudo from public.profiles where id = v_uid),
    'visibility', coalesce(v_vis, 'private'),
    'offer', jsonb_build_object(
      'enabled', coalesce(v_cp.monetized, false),
      'open', public._offer_open(v_uid),
      'price_cents', v_cp.custom_sub_price, 'currency', coalesce(v_cp.currency, 'eur'),
      'period', 'year',
      'payout_method', v_cp.payout_method,
      'payout_fin', case when v_cp.payout_handle is null then null else right(v_cp.payout_handle, 4) end,
      'part', (v_rules->>'member_part')::int),
    'subscribers', jsonb_build_object(
      'count', (select count(*) from public.creator_subscriptions
                 where creator_id = v_uid and status in ('active','trialing')),
      'list', coalesce((
        select jsonb_agg(jsonb_build_object('pseudo', pr.pseudo, 'status', cs.status,
                 'since', cs.created_at, 'renews', cs.current_period_end, 'ending', cs.ending)
               order by cs.created_at desc)
          from public.creator_subscriptions cs left join public.profiles pr on pr.id = cs.fan_id
         where cs.creator_id = v_uid), '[]'::jsonb)),
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'creator', pr.pseudo, 'price_cents', cs.amount_cents, 'currency', cs.currency,
        'status', cs.status, 'renews', cs.current_period_end, 'since', cs.created_at,
        'ending', cs.ending) order by cs.created_at desc)
      from public.creator_subscriptions cs left join public.profiles pr on pr.id = cs.creator_id
     where cs.fan_id = v_uid), '[]'::jsonb),
    'earnings', jsonb_build_object(
      'balances', public._balances(v_uid),
      'threshold_cents', (v_rules->>'threshold_cents')::int,
      'next_payout', v_next,
      'recent', coalesce((
        select jsonb_agg(jsonb_build_object('at', l.created_at, 'kind', l.kind,
                  'amount_cents', l.amount_cents, 'currency', l.currency) order by l.created_at desc)
          from (select * from public.member_ledger where user_id = v_uid
                 order by created_at desc limit 12) l), '[]'::jsonb)),
    'payouts', coalesce((
      select jsonb_agg(jsonb_build_object('period', mp.period, 'amount_cents', mp.amount_cents,
                'currency', mp.currency, 'status', mp.status, 'paid_at', mp.paid_at,
                'method', mp.method, 'fin', mp.handle_fin) order by mp.created_at desc)
        from public.member_payouts mp where mp.user_id = v_uid), '[]'::jsonb),
    'bot', public.totehmbot_access(),
    'membership', (select jsonb_build_object('status', s.status, 'since', s.started_at, 'until', s.current_period_end,
                     'ending', coalesce(s.cancel_at_period_end, false), 'price_cents', s.member_locked_price,
                     'portal', s.stripe_customer_id is not null)
                     from public.subscriptions s where s.user_id = v_uid),
    'rules', v_rules);
end $function$;

revoke all on function public.my_console() from public, anon;
grant execute on function public.my_console() to authenticated, service_role;
