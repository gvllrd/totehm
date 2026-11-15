-- ══════════════════════════════════════════════════════════════════════
-- TOTEHM · 12/11/2026 — CONQUER THE WORLD : LES PROSPECTS, LES ENVOIS, LES MOTS
-- ══════════════════════════════════════════════════════════════════════
-- Wah : « il faut que je puisse avoir un superbe dashboard Commercial et
-- communication — Conquer the world, gamifié, où ça envoie automatiquement en
-- appuyant sur des boutons, un cockpit commercial ».
--
-- Une ville est CONQUISE quand une galerie y a signé : sans galerie ni artiste
-- local, un acompte encaissé n'est qu'un remboursement dans 30 jours. Le
-- cockpit compte donc des villes, pas des emails.
--
-- Trois tables, une seule fonctionnalité (`outreach_`), RLS SANS POLITIQUE :
-- tout se lit et s'écrit par fonction, jamais depuis une page.
--   · `outreach_prospects`  qui on va voir, où, et où ça en est ;
--   · `outreach_sends`      ce qui est PARTI, en ajout seul (le grand livre
--                           des emails : on ne réécrit jamais un envoi) ;
--   · `outreach_templates`  les mots, en base — Wah les change sans déployer.
-- Et `outreach_applications` : ce qui ARRIVE de la page partenaire.
-- ══════════════════════════════════════════════════════════════════════

create table if not exists public.outreach_prospects (
  id          uuid primary key default gen_random_uuid(),
  segment     text not null default 'gallery'
              check (segment in ('gallery', 'hotel', 'concierge', 'leather', 'other')),
  name        text not null check (char_length(name) between 1 and 120),
  city        text not null check (char_length(city) between 1 and 80),
  country     text,
  email       text,
  site        text,
  social      text,
  note        text check (note is null or char_length(note) <= 500),
  -- Le PRESTIGE, de 0 à 3 : Wah veut « la plus prestigieuse avec des clients
  -- fortunés ». On écrit donc à qui compte d'abord, pas à qui répond vite.
  rank        int not null default 1 check (rank between 0 and 3),
  status      text not null default 'to_contact'
              check (status in ('to_contact', 'contacted', 'followed', 'replied',
                                'meeting', 'signed', 'refused', 'bounced', 'stopped')),
  contacted_at  timestamptz,
  followed_at   timestamptz,
  replied_at    timestamptz,
  signed_at     timestamptz,
  last_error    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.outreach_prospects enable row level security;
comment on table public.outreach_prospects is
  '[BOUTIQUE] Qui on va voir pour ouvrir une ville : galeries d''abord (l''offre), puis hôtels, conciergeries et spécialistes du cuir (la demande). Lu et écrit par fonction seulement.';
create unique index if not exists outreach_prospects_unique
  on public.outreach_prospects (lower(coalesce(email, name)), lower(city));
create index if not exists outreach_prospects_file
  on public.outreach_prospects (status, rank desc, created_at);

create table if not exists public.outreach_sends (
  id          uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.outreach_prospects(id) on delete cascade,
  kind        text not null check (kind in ('first', 'followup')),
  subject     text,
  ok          boolean not null default false,
  error       text,
  sent_at     timestamptz not null default now()
);
alter table public.outreach_sends enable row level security;
comment on table public.outreach_sends is
  '[BOUTIQUE] Le grand livre des emails de prospection, en AJOUT SEUL : ce qui est parti ne se réécrit pas. Il garde aussi les échecs, qui disent pourquoi.';
create index if not exists outreach_sends_prospect on public.outreach_sends (prospect_id, sent_at desc);

create table if not exists public.outreach_templates (
  slug      text primary key,
  subject   text not null,
  body      text not null,
  updated_at timestamptz not null default now()
);
alter table public.outreach_templates enable row level security;
comment on table public.outreach_templates is
  '[BOUTIQUE] Les mots de la prospection, en base : Wah les réécrit sans déployer. Les champs {{name}}, {{city}}, {{first_name}} sont remplacés à l''envoi — rien d''autre, et JAMAIS une phrase inventée sur le prospect.';

create table if not exists public.outreach_applications (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('gallery', 'artist')),
  name       text not null check (char_length(name) between 1 and 120),
  city       text not null check (char_length(city) between 1 and 80),
  email      text not null check (char_length(email) between 3 and 160),
  link       text check (link is null or char_length(link) <= 300),
  word       text check (word is null or char_length(word) <= 600),
  status     text not null default 'new' check (status in ('new', 'read', 'kept', 'refused')),
  created_at timestamptz not null default now()
);
alter table public.outreach_applications enable row level security;
comment on table public.outreach_applications is
  '[BOUTIQUE] Ce qui ARRIVE de la page partenaire : une galerie ou un artiste qui se présente. Écrit par fonction (la page ne touche jamais la table), lu par l''administrateur.';
create index if not exists outreach_applications_file on public.outreach_applications (status, created_at desc);
