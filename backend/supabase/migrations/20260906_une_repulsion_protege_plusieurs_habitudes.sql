-- ═══════════════════════════════════════════════════════════════════════
-- UNE RÉPULSION PROTÈGE PLUSIEURS HABITUDES — le lookup, côté serveur
--
-- CE QUI MANQUAIT. `repulsions.habit_text` porte UNE habitude, en texte.
-- « Pas de téléphone dans la chambre » protège le sommeil ET la lecture ET
-- le réveil : avec une seule colonne, il fallait écrire la même répulsion
-- trois fois. Trois copies divergent toujours — on en retire une, les deux
-- autres restent ; on en renomme une, les trois ne disent plus la même
-- chose. C'est exactement ce qu'un lookup Airtable évite.
--
-- CE QU'ON POSE. Une table de liens, et `habit_text` reste — c'est le
-- PREMIER lien, celui que le bot lit déjà. Rien à réécrire côté bot.
--
-- LE TRIGGER N'EST PAS DU CONFORT. Il garantit qu'une répulsion écrite par
-- N'IMPORTE QUI — le bot, la carte, un admin, une insertion à la main —
-- naît avec son lien. Une table de liens alimentée seulement par le front
-- serait vide pour tout ce qui n'est pas le front, et le jour où elle sert
-- de source de vérité, la moitié des répulsions auraient disparu.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.repulsion_habits(
  repulsion_id bigint      not null references public.repulsions(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  habit_text   text        not null,
  created_at   timestamptz not null default now(),
  primary key (repulsion_id, habit_text)
);

comment on table public.repulsion_habits is
  'Les habitudes qu''une repulsion protege. repulsions.habit_text reste le PREMIER lien (celui que le bot lit) ; cette table porte les autres.';

create index if not exists repulsion_habits_habit_idx
  on public.repulsion_habits (user_id, habit_text);

alter table public.repulsion_habits enable row level security;

-- Le propriétaire, et personne d'autre. Une répulsion dit ce qu'on
-- s'interdit : c'est la donnée la plus intime du produit.
drop policy if exists rh_owner on public.repulsion_habits;
create policy rh_owner on public.repulsion_habits
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Le premier lien naît avec la répulsion, quel que soit l'écrivain.
create or replace function public.repulsion_seed_link()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.repulsion_habits(repulsion_id, user_id, habit_text)
  values (new.id, new.user_id, new.habit_text)
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists repulsion_seed_link_t on public.repulsions;
create trigger repulsion_seed_link_t after insert on public.repulsions
  for each row execute function public.repulsion_seed_link();

-- Le passé rejoint le présent : tout ce qui existe déjà reçoit son lien.
insert into public.repulsion_habits(repulsion_id, user_id, habit_text)
select r.id, r.user_id, r.habit_text from public.repulsions r
on conflict do nothing;

-- ── ATTACHER / DÉTACHER ────────────────────────────────────────────────
-- `auth.uid()` et jamais un paramètre : une fonction qui prend l'identité
-- en argument attache une répulsion au Totehm de quelqu'un d'autre.
create or replace function public.repulsion_link(p_id bigint, p_habit text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or p_habit is null or btrim(p_habit) = '' then return false; end if;
  if not exists (select 1 from public.repulsions r
                 where r.id = p_id and r.user_id = v_uid) then return false; end if;
  insert into public.repulsion_habits(repulsion_id, user_id, habit_text)
  values (p_id, v_uid, p_habit) on conflict do nothing;
  return true;
end $$;

create or replace function public.repulsion_unlink(p_id bigint, p_habit text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;
  delete from public.repulsion_habits
   where repulsion_id = p_id and habit_text = p_habit and user_id = v_uid;
  -- Détacher la DERNIÈRE habitude ne supprime pas la répulsion : elle a
  -- été écrite, elle se rattache ailleurs. On retire le lien, pas la pensée.
  return true;
end $$;

-- Renommer une habitude ne doit pas orpheliner ce qui la protège. Le lien
-- est du TEXTE parce que `steps` est du texte — tant que l'habitude n'a pas
-- d'identifiant en base, c'est la seule jointure possible, et elle se
-- répare ici plutôt que dans quatre endroits du front.
create or replace function public.habit_rename_links(p_old text, p_new text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or p_old is null or p_new is null or p_old = p_new then return false; end if;
  update public.repulsions      set habit_text = p_new where user_id = v_uid and habit_text = p_old;
  update public.repulsion_habits set habit_text = p_new where user_id = v_uid and habit_text = p_old;
  return true;
end $$;

-- `create or replace function` rétablit le GRANT à PUBLIC : tout `revoke`
-- suit le dernier `create`, jamais l'inverse.
revoke all on function public.repulsion_seed_link()                from public;
revoke all on function public.repulsion_link(bigint, text)         from public, anon;
revoke all on function public.repulsion_unlink(bigint, text)       from public, anon;
revoke all on function public.habit_rename_links(text, text)       from public, anon;
grant execute on function public.repulsion_link(bigint, text)      to authenticated, service_role;
grant execute on function public.repulsion_unlink(bigint, text)    to authenticated, service_role;
grant execute on function public.habit_rename_links(text, text)    to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- CE QUE LE FRONT LIT — appliqué en production le 06/09/2026
--
-- `my_trips` appelait DEUX FOIS le même sous-select de répulsions : une
-- fois pour les habitudes d'un objectif, une fois pour les habitudes
-- libres. Deux copies du même SQL divergent toujours. Il n'y en a plus
-- qu'une, et elle lit la table de liens.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.repulsions_of(p_user uuid, p_habit text)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id, 'obstacle', r.obstacle,
           'repulsion', r.repulsion, 'problem', r.problem,
           -- `habits` porte TOUTES les habitudes protégées : c'est ce qui
           -- permet au front de n'afficher la répulsion QU'UNE FOIS.
           'habits', coalesce((select jsonb_agg(rh2.habit_text)
                               from public.repulsion_habits rh2
                               where rh2.repulsion_id = r.id), '[]'::jsonb))), '[]'::jsonb)
  from public.repulsions r
  where r.user_id = p_user and r.active
    and exists (select 1 from public.repulsion_habits rh
                where rh.repulsion_id = r.id and rh.habit_text = p_habit);
$fn$;

revoke all on function public.repulsions_of(uuid, text) from public, anon, authenticated;
grant execute on function public.repulsions_of(uuid, text) to service_role;

-- `my_trips` : seule la clé 'repulsions' change, dans les deux branches.
-- Le corps complet est reproduit — une fonction ne se patche pas.
-- (voir la migration appliquée `my_trips_lit_la_table_de_liens`)
