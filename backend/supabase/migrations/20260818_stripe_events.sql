-- Idempotence des webhooks Stripe
-- Un event_id déjà vu → conflit PK → webhook renvoie 200 et sort.
-- Évite les doubles écritures Printful et les doublons d'accès.

create table if not exists public.stripe_events (
  event_id    text        primary key,
  type        text        not null,
  received_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
-- Aucune policy : seul service_role y écrit, depuis le webhook.
