-- ═══════════════════════════════════════════════════════════════════════
-- UNE HABITUDE SERT PLUSIEURS OBJECTIFS — appliquée en production le
-- 07/09/2026. Symétrique de `repulsion_habits`.
--
-- CE QUI MANQUAIT. `steps.o` ne portait qu'UN objectif. « Dormir 7 heures »
-- sert la performance ET la lucidité : il fallait écrire l'habitude deux
-- fois, et deux copies divergent toujours.
--
-- `steps.o` reste le PREMIER lien — celui que le bot et l'ancien code
-- lisent déjà. Rien à réécrire ailleurs. Le front le tient à jour à chaque
-- attache ou détache.
--
-- « LIBRE » CHANGE DE SENS dans `my_trips` : ce n'est plus « dont steps.o
-- est vide », c'est « rattachée à AUCUN objectif ». Une habitude peut être
-- liée sans que `steps.o` le sache.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.objective_habits(
  objective_id uuid        not null references public.objectives(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  habit_text   text        not null,
  created_at   timestamptz not null default now(),
  primary key (objective_id, habit_text)
);
create index if not exists objective_habits_habit_idx
  on public.objective_habits (user_id, habit_text);
alter table public.objective_habits enable row level security;
drop policy if exists oh_owner on public.objective_habits;
create policy oh_owner on public.objective_habits for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Le passé rejoint le présent.
insert into public.objective_habits(objective_id, user_id, habit_text)
select (s->>'o')::uuid, t.user_id, s->>'t'
from public.totehms t, jsonb_array_elements(coalesce(t.steps,'[]'::jsonb)) s
where nullif(s->>'o','') is not null and nullif(s->>'t','') is not null
  and exists (select 1 from public.objectives o
              where o.id = (s->>'o')::uuid and o.user_id = t.user_id)
on conflict do nothing;

-- Attacher / détacher. `auth.uid()` et jamais un paramètre : une fonction
-- qui prend l'utilisateur en argument attache au Totehm de quelqu'un d'autre.
-- Et DÉTACHER N'EST PAS EFFACER : on retire le lien, pas la pensée.
create or replace function public.objective_link(p_obj uuid, p_habit text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or p_habit is null or btrim(p_habit) = '' then return false; end if;
  if not exists (select 1 from public.objectives o
                 where o.id = p_obj and o.user_id = v_uid) then return false; end if;
  insert into public.objective_habits(objective_id, user_id, habit_text)
  values (p_obj, v_uid, p_habit) on conflict do nothing;
  return true;
end $$;

create or replace function public.objective_unlink(p_obj uuid, p_habit text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;
  delete from public.objective_habits
   where objective_id = p_obj and habit_text = p_habit and user_id = v_uid;
  return true;
end $$;

-- Les objectifs d'une habitude. Écrite UNE fois : `my_trips` l'appelle
-- deux fois, et deux copies du même SQL divergent toujours.
create or replace function public.objectives_of(p_user uuid, p_habit text)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(oh.objective_id), '[]'::jsonb)
  from public.objective_habits oh
  where oh.user_id = p_user and oh.habit_text = p_habit;
$fn$;

-- Renommer une habitude suit MAINTENANT les trois tables.
create or replace function public.habit_rename_links(p_old text, p_new text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or p_old is null or p_new is null or p_old = p_new then return false; end if;
  update public.repulsions       set habit_text = p_new where user_id = v_uid and habit_text = p_old;
  update public.repulsion_habits set habit_text = p_new where user_id = v_uid and habit_text = p_old;
  update public.objective_habits set habit_text = p_new where user_id = v_uid and habit_text = p_old;
  return true;
end $$;

-- `create or replace function` rétablit le GRANT à PUBLIC : tout `revoke`
-- suit le dernier `create`, jamais l'inverse.
revoke all on function public.objective_link(uuid, text)     from public, anon;
revoke all on function public.objective_unlink(uuid, text)   from public, anon;
revoke all on function public.objectives_of(uuid, text)      from public, anon, authenticated;
revoke all on function public.habit_rename_links(text, text) from public, anon;
grant execute on function public.objective_link(uuid, text)     to authenticated, service_role;
grant execute on function public.objective_unlink(uuid, text)   to authenticated, service_role;
grant execute on function public.objectives_of(uuid, text)      to service_role;
grant execute on function public.habit_rename_links(text, text) to authenticated, service_role;

-- `my_trips` lit les DEUX tables de liens : voir la migration appliquée
-- `my_trips_lit_les_deux_tables_de_liens`.
