-- ══ LES CRÉATEURS · 15/09/2026 ═══════════════════════════════════════
-- APPLIQUÉE EN PRODUCTION le 15/09/2026. RLS vérifiée sous
-- `set local role authenticated` : 0 ligne visible sans session sur les
-- deux tables. `is_subscribed_to` : security definer, EXECUTE accordé au
-- seul rôle `authenticated` (relu dans `pg_proc`).
--
-- Un influenceur ouvre son HigherSelf à l'abonnement. Il fixe son prix,
-- il encaisse 80 %, TOTEHM garde 20 % — automatiquement, à chaque
-- renouvellement, sans personne au milieu.
--
-- ⚠️ LE KYC N'EST PAS CHEZ NOUS ET NE LE SERA JAMAIS. Stripe Connect
-- Express héberge l'identité, les pièces, la conformité et les virements.
-- On ne stocke QUE l'identifiant du compte connecté : jamais un IBAN,
-- jamais une pièce d'identité, jamais une date de naissance.
create table if not exists public.creator_profiles (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  stripe_account_id text unique,
  -- Miroir local de l'état Stripe, écrit par le webhook `account.updated`.
  -- On ne s'en sert que pour AFFICHER : la vérité reste chez Stripe.
  charges_enabled   boolean not null default false,
  payouts_enabled   boolean not null default false,
  details_submitted boolean not null default false,
  -- Le prix que le créateur fixe, en centimes. Verrouillé par une
  -- contrainte : un prix négatif ou absurde ne doit jamais atteindre
  -- Stripe, et un prix côté client se modifie en deux clics.
  custom_sub_price  integer,
  currency          text not null default 'eur',
  handle            text,
  created_at        timestamptz not null default now(),
  constraint creator_price_chk
    check (custom_sub_price is null
           or (custom_sub_price >= 300 and custom_sub_price <= 50000))
);

-- ══ QUI EST ABONNÉ À QUI ═════════════════════════════════════════════
-- C'est cette table qui ouvre la lecture du Totehm d'un créateur à son
-- fan. Une jointure, pas un drapeau : un drapeau ne dit pas QUAND ça
-- s'arrête.
create table if not exists public.creator_subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  creator_id             uuid not null references auth.users(id) on delete cascade,
  fan_id                 uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text unique,
  status                 text not null default 'incomplete',
  amount_cents           integer,
  currency               text not null default 'eur',
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  unique (creator_id, fan_id)
);

create index if not exists cs_creator_idx on public.creator_subscriptions(creator_id, status);
create index if not exists cs_fan_idx     on public.creator_subscriptions(fan_id, status);

alter table public.creator_profiles      enable row level security;
alter table public.creator_subscriptions enable row level security;

-- Le créateur lit et écrit SA fiche. `stripe_account_id` n'est jamais
-- écrit par le front : seule l'Edge Function (service_role) le pose.
drop policy if exists "own creator profile" on public.creator_profiles;
create policy "own creator profile" on public.creator_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Un fan doit pouvoir lire la fiche PUBLIQUE d'un créateur pour
-- s'abonner : son prix, et le fait qu'il encaisse. Rien d'autre.
drop policy if exists "creator card is public" on public.creator_profiles;
create policy "creator card is public" on public.creator_profiles
  for select using (charges_enabled = true);

-- Chacun voit ses propres lignes : le créateur les siennes, le fan les
-- siennes. Personne ne voit la liste d'abonnés d'un autre.
drop policy if exists "my creator subscriptions" on public.creator_subscriptions;
create policy "my creator subscriptions" on public.creator_subscriptions
  for select using (auth.uid() = creator_id or auth.uid() = fan_id);

grant select, insert, update on public.creator_profiles      to authenticated;
grant select                 on public.creator_subscriptions to authenticated;

-- ══ LE FAN LIT LE TOTEHM DE SON CRÉATEUR ═════════════════════════════
-- `security definer` et `stable` : la politique l'appelle une fois par
-- ligne, et sans `definer` elle rappellerait la RLS de la table qu'elle
-- interroge — récursion garantie.
create or replace function public.is_subscribed_to(p_creator uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.creator_subscriptions cs
    where cs.creator_id = p_creator
      and cs.fan_id = auth.uid()
      and cs.status in ('active','trialing')
  );
$$;
-- ⚠️ `create or replace` rétablit le GRANT à PUBLIC : le revoke suit
-- toujours le dernier create, jamais l'inverse.
revoke all on function public.is_subscribed_to(uuid) from public, anon;
grant execute on function public.is_subscribed_to(uuid) to authenticated;

drop policy if exists "subscribers read the creator totehm" on public.totehms;
create policy "subscribers read the creator totehm" on public.totehms
  for select using (public.is_subscribed_to(user_id));
