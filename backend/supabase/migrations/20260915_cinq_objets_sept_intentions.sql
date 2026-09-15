-- ══ LES 5 OBJETS, LES 7 INTENTIONS · 15/09/2026 ═══════════════════════
-- APPLIQUÉE EN PRODUCTION le 15/09/2026. RLS vérifiée sous
-- `set local role authenticated` : 0 ligne lisible sans session sur les
-- trois tables de liens. Contraintes `check` relues dans `pg_constraint`.
--
-- La taxonomie est FERMÉE : habits · objectives · repulsions · visions ·
-- teachings (table `wisdom`). Aucune sixième catégorie.
alter table public.objectives add column if not exists i text;
alter table public.repulsions add column if not exists i text;

-- La liste est verrouillée EN BASE, pas seulement à l'écran : un front
-- peut se tromper, une contrainte non. `null` reste permis — un objet
-- s'écrit avant de se qualifier, et forcer l'intention à la création
-- empêcherait d'écrire.
do $$ begin
  alter table public.objectives add constraint objectives_i_chk
    check (i is null or i in ('fight','flow','enrich','love','express','focus','celebrate'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.repulsions add constraint repulsions_i_chk
    check (i is null or i in ('fight','flow','enrich','love','express','focus','celebrate'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.visions add constraint visions_i_chk
    check (i is null or i in ('fight','flow','enrich','love','express','focus','celebrate'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.wisdom add constraint wisdom_i_chk
    check (i is null or i in ('fight','flow','enrich','love','express','focus','celebrate'));
exception when duplicate_object then null; end $$;

-- ══ LES TROIS LIENS CROISÉS ══════════════════════════════════════════
--   un OBJECTIF   porte des VISIONS     [Add a Vision]
--   une RÉPULSION porte des TEACHINGS   [Add a Teaching]
--   un TEACHING   porte des OBJECTIFS   [Add an Objective]
-- Toujours des tables de jointure, jamais une colonne : un lien qui n'en
-- accepte qu'un finit toujours par en accepter plusieurs, et c'est là
-- qu'on réécrit la moitié du produit.
create table if not exists public.objective_visions (
  user_id      uuid not null references auth.users(id) on delete cascade,
  objective_id uuid not null references public.objectives(id) on delete cascade,
  vision_id    uuid not null references public.visions(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (objective_id, vision_id)
);
create table if not exists public.repulsion_teachings (
  user_id      uuid not null references auth.users(id) on delete cascade,
  repulsion_id bigint not null references public.repulsions(id) on delete cascade,
  wisdom_id    uuid not null references public.wisdom(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (repulsion_id, wisdom_id)
);
create table if not exists public.teaching_objectives (
  user_id      uuid not null references auth.users(id) on delete cascade,
  wisdom_id    uuid not null references public.wisdom(id) on delete cascade,
  objective_id uuid not null references public.objectives(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (wisdom_id, objective_id)
);

create index if not exists ov_user_idx on public.objective_visions(user_id);
create index if not exists rt_user_idx on public.repulsion_teachings(user_id);
create index if not exists to_user_idx on public.teaching_objectives(user_id);

alter table public.objective_visions    enable row level security;
alter table public.repulsion_teachings  enable row level security;
alter table public.teaching_objectives  enable row level security;

drop policy if exists "own objective_visions" on public.objective_visions;
create policy "own objective_visions" on public.objective_visions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own repulsion_teachings" on public.repulsion_teachings;
create policy "own repulsion_teachings" on public.repulsion_teachings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own teaching_objectives" on public.teaching_objectives;
create policy "own teaching_objectives" on public.teaching_objectives
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.objective_visions   to authenticated;
grant select, insert, update, delete on public.repulsion_teachings to authenticated;
grant select, insert, update, delete on public.teaching_objectives to authenticated;
