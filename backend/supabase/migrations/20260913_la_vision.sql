-- ══ LA VISION · 13/09/2026 ═══════════════════════════════════════════
-- APPLIQUÉE EN PRODUCTION le 13/09/2026, RLS vérifiée sous
-- `set local role authenticated` : 0 ligne lisible sans session.
--
-- TOTEHM est un réseau social PRIVÉ : on n'y consomme pas du contenu, on
-- en écrit. `vision.html` remplace le générateur d'habitudes — on ne
-- propose plus, on demande. Le côté visionnaire, et il est optimiste par
-- définition : une vision qu'on écrit, c'est un futur qu'on choisit.
--
-- La table est le JUMEAU de `wisdom` : mêmes colonnes, mêmes droits, même
-- classement par importance. Deux formes d'une seule chose — ce que j'ai
-- appris (le passé) et ce que je vois venir (le futur).
create table if not exists public.visions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  text       text not null,
  i          text,
  importance smallint,
  created_at timestamptz not null default now()
);

create index if not exists visions_user_idx on public.visions(user_id, importance nulls last, created_at);

alter table public.visions enable row level security;

-- Mêmes deux politiques que `wisdom` : la sienne en écriture, et la
-- lecture par les membres quand le Totehm est partagé. Un Totehm privé
-- ne laisse rien voir, ici comme ailleurs.
drop policy if exists "own visions" on public.visions;
create policy "own visions" on public.visions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "visions members read" on public.visions;
create policy "visions members read" on public.visions
  for select using (exists (
    select 1 from public.totehms t
    where t.user_id = visions.user_id and t.totehm_visibility = 'members'));

grant select, insert, update, delete on public.visions to authenticated;
