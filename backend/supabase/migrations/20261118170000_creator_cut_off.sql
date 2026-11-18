-- ══ 18/11/2026 · UN CRÉATEUR COUPE UN ABONNÉ ═══════════════════════════════════════════════════════════════════════
-- Wah : « your subscribers play by your rules or get cut off instantly » · « if it's marked SILENCE, you respect it
-- strictly, or one report gets your subscription revoked » (le texte des deux Discover de la creator economy) — et ses
-- trois décisions du 18/11 : c'est le CRÉATEUR qui coupe, depuis la liste de ses abonnés ; AUCUN remboursement (l'accès
-- s'arrête tout de suite, l'abonnement Stripe ne se renouvelle plus ; un remboursement reste possible à la main dans
-- Stripe) ; un abonné coupé ne peut JAMAIS se réabonner à ce créateur (les autres ne sont pas concernés).
--
--   1 · `creator_bans` : (créateur, abonné coupé), lue et écrite par fonction seulement (RLS sans politique). Aucune clé
--       étrangère vers `auth.users` (règle de la base : sa POSE verrouille la table d'authentification).
--   2 · `creator_subscribers()` : la liste de MES abonnés actifs, pour le créateur connecté — leur nom TOTEHM et leurs
--       dates, rien d'autre (jamais un email, jamais un identifiant).
--   3 · `creator_cut_off(p_creator, p_pseudo)` : réservée au serveur (`creator-cut-off`, qui lit le créateur dans la
--       SESSION) ; bannit et coupe l'accès dans la même transaction, rend l'identifiant Stripe à arrêter.
--   4 · `_creator_ban_guard` : un abonnement banni ne peut JAMAIS redevenir actif, quoi qu'écrive le webhook. Si Stripe
--       encaisse quand même (une page de paiement ouverte avant la coupure), la ligne reste coupée et un incident
--       `creator_sub_banned` dit de l'arrêter et de le rembourser à la main.
--   5 · `creator_offer` : un abonné banni se voit refuser l'offre (`why:'banned'`) — le paiement ne s'ouvre jamais.
-- Rien de destructif : aucun `drop`, aucun `update` sans `where`, aucun prix.

-- ── 1 · les bannis ──────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.creator_bans (
  creator_id uuid not null,
  fan_id     uuid not null,
  reason     text not null default 'cut_off',
  created_at timestamptz not null default now(),
  primary key (creator_id, fan_id)
);
alter table public.creator_bans enable row level security;
comment on table public.creator_bans is '[COM] Un créateur a coupé cet abonné (18/11) : son accès s''est arrêté, il ne peut plus jamais s''abonner à ce créateur. Écrite par creator_cut_off (serveur), lue par creator_offer et _creator_ban_guard.';

-- ── 2 · mes abonnés ─────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.creator_subscribers()
returns jsonb language sql stable security definer set search_path to 'public'
as $f$
  select case when auth.uid() is null then jsonb_build_object('ok', false, 'why', 'signin') else
    jsonb_build_object('ok', true, 'items', coalesce((
      select jsonb_agg(jsonb_build_object('pseudo', p.pseudo, 'since', cs.created_at, 'until', cs.current_period_end,
                                          'ending', cs.ending) order by cs.created_at desc)
        from public.creator_subscriptions cs join public.profiles p on p.id = cs.fan_id
       where cs.creator_id = auth.uid() and cs.status in ('active','trialing') and nullif(btrim(p.pseudo), '') is not null
    ), '[]'::jsonb)) end;
$f$;

-- ── 3 · couper ──────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.creator_cut_off(p_creator uuid, p_pseudo text)
returns jsonb language plpgsql security definer set search_path to 'public'
as $f$
declare v_fan uuid; v_sub public.creator_subscriptions%rowtype;
begin
  if p_creator is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select id into v_fan from public.profiles where lower(pseudo) = lower(btrim(coalesce(p_pseudo, ''))) limit 1;
  if v_fan is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;
  if v_fan = p_creator then return jsonb_build_object('ok', false, 'why', 'self'); end if;
  select * into v_sub from public.creator_subscriptions where creator_id = p_creator and fan_id = v_fan;
  if not found then return jsonb_build_object('ok', false, 'why', 'not_subscriber'); end if;
  insert into public.creator_bans (creator_id, fan_id, reason) values (p_creator, v_fan, 'cut_off')
    on conflict (creator_id, fan_id) do nothing;
  update public.creator_subscriptions set status = 'canceled', ending = true where id = v_sub.id;
  return jsonb_build_object('ok', true, 'pseudo', (select pseudo from public.profiles where id = v_fan),
    'stripe_subscription_id', v_sub.stripe_subscription_id, 'was', v_sub.status);
end $f$;

-- ── 4 · la garde : un abonnement banni ne redevient jamais actif ───────────────────────────────────────────────
create or replace function public._creator_ban_guard()
returns trigger language plpgsql security definer set search_path to 'public'
as $f$
begin
  if new.status in ('active', 'trialing')
     and exists (select 1 from public.creator_bans b where b.creator_id = new.creator_id and b.fan_id = new.fan_id) then
    if new.stripe_subscription_id is not null
       and (tg_op = 'INSERT' or old.stripe_subscription_id is distinct from new.stripe_subscription_id
            or old.status not in ('active', 'trialing')) then
      insert into public.market_incidents (kind, detail) values ('creator_sub_banned', jsonb_build_object(
        'creator_id', new.creator_id, 'fan_id', new.fan_id, 'stripe_subscription_id', new.stripe_subscription_id,
        'note', 'a banned fan paid again: cancel this subscription and refund it in Stripe'));
    end if;
    new.status := 'canceled'; new.ending := true;
  end if;
  return new;
end $f$;
create or replace trigger creator_subscriptions_ban_guard before insert or update on public.creator_subscriptions
  for each row execute function public._creator_ban_guard();

-- ── 5 · l'offre refuse un banni ────────────────────────────────────────────────────────────────────────────────
create or replace function public.creator_offer(p_pseudo text, p_fan uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_uid uuid; v_cp public.creator_profiles%rowtype;
begin
  if p_fan is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select id into v_uid from public.profiles where lower(pseudo) = lower(btrim(p_pseudo)) limit 1;
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;
  if v_uid = p_fan then return jsonb_build_object('ok', false, 'why', 'self'); end if;
  -- 18/11 : coupé par ce créateur, jamais réabonné (`creator_bans`)
  if exists (select 1 from public.creator_bans b where b.creator_id = v_uid and b.fan_id = p_fan) then
    return jsonb_build_object('ok', false, 'why', 'banned'); end if;
  if not public._offer_open(v_uid) then return jsonb_build_object('ok', false, 'why', 'closed'); end if;
  if public._subscriber_of(v_uid, p_fan) then return jsonb_build_object('ok', false, 'why', 'already'); end if;
  select * into v_cp from public.creator_profiles where user_id = v_uid;
  return jsonb_build_object('ok', true, 'creator_id', v_uid, 'period', 'year',
    'price_cents', v_cp.custom_sub_price, 'currency', coalesce(v_cp.currency, 'eur'));
end $function$;

-- ── les droits, APRÈS le dernier `create` ──────────────────────────────────────────────────────────────────────
revoke all on public.creator_bans from public, anon, authenticated;
revoke all on function public.creator_subscribers() from public, anon;
grant execute on function public.creator_subscribers() to authenticated, service_role;
revoke all on function public.creator_cut_off(uuid, text) from public, anon, authenticated;
grant execute on function public.creator_cut_off(uuid, text) to service_role;
revoke all on function public._creator_ban_guard() from public, anon, authenticated;
revoke all on function public.creator_offer(text, uuid) from public, anon, authenticated;
grant execute on function public.creator_offer(text, uuid) to service_role;
