-- trips -> totehms
--
-- La table portait trois générations de noms : `triplets` dans ses contraintes
-- et ses index, `trips` comme nom de table, `Totehm` dans le produit. Elle
-- traînait aussi six colonnes que `cloudSave` écrivait en dur à vide à chaque
-- enregistrement, et une fonction `copy_count` pointant sur une table
-- `triplets` qui n'existe plus depuis le renommage précédent.
--
-- Vérifié avant écriture, sur les 3 lignes présentes :
--   letter=0, position=0, objective='', habits='', repulsions='', copied_from=null
--   sur 100 % des lignes. Aucune donnée n'est perdue.
--   28 habitudes vivent dans `steps`, seule colonne réellement porteuse.
--   Aucune vue, aucun trigger, aucune autre fonction ne référence la table.
--   `copy_count` n'est appelée par aucun fichier du front.

begin;

-- 1. Le nom du produit, partout
alter table public.trips rename to totehms;
alter table public.totehms rename column visibility to totehm_visibility;

-- 2. Les colonnes mortes
alter table public.totehms
  drop column if exists letter,
  drop column if exists "position",
  drop column if exists objective,
  drop column if exists habits,
  drop column if exists repulsions,
  drop column if exists copied_from;

-- 3. Vocabulaire de visibilité : private | members, comme dans CLAUDE.md.
--    L'interface disait déjà « Visible to members » en stockant 'network'.
alter table public.totehms drop constraint if exists triplets_visibility_check;
update public.totehms set totehm_visibility = 'members' where totehm_visibility = 'network';
alter table public.totehms alter column totehm_visibility set default 'private';
alter table public.totehms
  add constraint totehms_visibility_check
  check (totehm_visibility in ('private','members'));

-- 4. Plus aucun `triplets` dans les noms d'objets.
--    triplets_position_idx et triplets_copied_from_fkey sont tombés avec
--    leurs colonnes à l'étape 2.
alter table public.totehms rename constraint triplets_pkey to totehms_pkey;
alter table public.totehms rename constraint triplets_user_id_fkey to totehms_user_id_fkey;
alter index public.triplets_user_idx       rename to totehms_user_idx;
alter index public.triplets_visibility_idx rename to totehms_visibility_idx;

-- 5. Policies. Le filtre de visibilité vit ici et nulle part ailleurs.
drop policy if exists "triplets network read" on public.totehms;
drop policy if exists "triplets owner all"    on public.totehms;

create policy "totehms members read" on public.totehms
  for select to authenticated
  using (totehm_visibility = 'members');

create policy "totehms owner all" on public.totehms
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Fonction morte : `select count(*) from triplets where copied_from = t`.
--    La table n'existe plus, la colonne non plus, personne ne l'appelle.
drop function if exists public.copy_count(uuid);

commit;
