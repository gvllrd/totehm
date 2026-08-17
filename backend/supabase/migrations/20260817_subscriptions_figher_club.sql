-- Figher Club — price lock + Stripe fields + 7j trial
-- tier reste en base pour l'historique (nullable, jamais affiché)

-- 1. tier nullable (le CHECK l'autorise déjà, la colonne est NOT NULL → on lève)
alter table public.subscriptions
  alter column tier drop not null,
  alter column tier set default null;

-- 2. Champs Stripe manquants
alter table public.subscriptions
  add column if not exists stripe_customer_id      text,
  add column if not exists stripe_subscription_id  text,
  add column if not exists member_locked_price      integer,    -- centimes, ex: 7700
  add column if not exists trial_started_at         timestamptz,
  add column if not exists trial_ends_at            timestamptz;

-- 3. Index unique sur stripe_subscription_id (partial : ignore les NULL)
create unique index if not exists subscriptions_stripe_sub_id_uidx
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- 4. my_membership() — ajoute price + trial_ends_at
-- RÈGLE : create or replace AVANT revoke (sinon GRANT à PUBLIC persiste)
create or replace function public.my_membership()
returns jsonb
language sql
stable security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object(
       'member',        s.status in ('active', 'trialing'),
       'trial',         s.status = 'trialing',
       'status',        s.status,
       'until',         s.current_period_end,
       'ending',        coalesce(s.cancel_at_period_end, false),
       'since',         s.started_at,
       'price',         s.member_locked_price,
       'trial_ends_at', s.trial_ends_at)
     from public.subscriptions s
     where s.user_id = auth.uid()
     limit 1),
    jsonb_build_object(
       'member', false, 'trial',  false,  'status', null,
       'until',  null,  'ending', false,  'since',  null,
       'price',  null,  'trial_ends_at', null));
$$;

-- revoke APRÈS create (règle absolue)
revoke execute on function public.my_membership() from anon;
grant  execute on function public.my_membership() to authenticated;
