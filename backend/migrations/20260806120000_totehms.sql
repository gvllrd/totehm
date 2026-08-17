-- trips -> totehms
--
-- v2 — la v1 échouait sur `relation "totehms_pkey" already exists`.
-- Cause : `totehm_clothes` (boutique) porte encore trois objets nommés
-- d'après une génération où elle s'appelait `totehms`. Le nom était squatté.
-- On libère d'abord, on renomme ensuite.
--
-- Vérifié avant écriture :
--   trips : letter=0, position=0, objective='', habits='', repulsions='',
--   copied_from=null sur 100 % des 3 lignes. 28 habitudes dans `steps`,
--   seule colonne porteuse. Aucune vue, aucun trigger, aucune fonction hors
--   `copy_count` ne référence la table, et personne n'appelle `copy_count`.
--   totehm_clothes : aucun `on conflict on constraint` dans create-checkout,
--   qui teste `error.code === '23505'` — le nom de contrainte ne sert à rien.

begin;

-- 0. Libérer le nom, squatté par la table de la boutique.
--    Renommages purs : aucune donnée, aucun index reconstruit.
alter table public.totehm_clothes rename constraint totehms_pkey to totehm_clothes_pkey;
alter table public.totehm_clothes rename constraint totehms_garment_id_fkey to totehm_clothes_garment_id_fkey;
--    Index nu sur lower(name) : le garde-fou de Decode, insensible à la casse.
--    Le nouveau nom le dit, l'ancien laissait croire à un doublon.
alter index public.totehms_name_unique rename to totehm_clothes_lower_name_unique;

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
