-- TRIP EST DU VOCABULAIRE, PAS UNE ENTITÉ · 13/09/2026
--
-- « Trip » désigne un TRIPLET lu depuis n'importe quel angle :
--   · depuis une habitude → elle + ses objectifs + ses répulsions
--   · depuis un objectif  → lui + ses habitudes + leurs répulsions
--   · depuis une répulsion (trigger) → elle + les habitudes à faire
--     à la place + les objectifs qu'elles servent
--
-- Ce n'est pas une table, pas une fonction — c'est un mode de lecture.
-- Le seul endroit en base où le mot est juste, c'est `my_trips()` : elle
-- rend PLUSIEURS triplets, centrés sur les objectifs, plus les habitudes
-- non rattachées (`loose`) et les triplets terminés (`done`).
--
-- Les cinq autres fonctions qui portaient le préfixe `trip_` agissaient
-- en fait sur la table `objectives` — un seul objectif à la fois. Le mot
-- prêtait à confusion. On les renomme.
--
--   trip_create      → objective_create
--   trip_rename      → objective_rename
--   trip_set_target  → objective_set_target
--   trip_close       → objective_close   (avec le mapping abandonné/atteint
--                                          du fix du matin, 20260913140000)
--   habit_set_trip   → DROP              (jamais appelée par le code servi
--                                          depuis que `objective_link`
--                                          existe — 07/09/2026)
--
-- Ce lot CRÉE les nouveaux noms. Les anciens sont conservés le temps que
-- Vercel serve la nouvelle version du front qui appelle les nouveaux ;
-- ils sont supprimés par la seconde partie de ce fichier, à appliquer
-- APRÈS le déploiement du front.
--
-- Une future porte pour le bot : composer des affirmations neuro-
-- linguistiques par notification à la fréquence de l'habitude, depuis un
-- triplet lu autour de N'IMPORTE quelle pièce. Ça demandera une fonction
-- `trip_at(kind, id)` symétrique — on l'écrit le jour où le bot l'appelle,
-- pas avant.


-- ══ PARTIE 1 · Nouveaux noms ═════════════════════════════════════════

-- Un objectif se crée VIDE, comme une habitude ou une répulsion — c'est
-- le pattern du produit depuis le 08/09 : on ouvre une boîte, on écrit
-- dedans. `trip_create` levait `un trip a besoin d'un objectif` sur
-- p_text='', ce qui rendait `[+ Add an Objective]` du front totalement
-- silencieux depuis toujours. `objective_create` accepte la chaîne vide :
-- le premier `objective_rename` posera le vrai texte, comme pour les
-- autres pièces. `text NOT NULL` accepte `''`.
create or replace function public.objective_create(p_text text, p_target timestamptz default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  insert into public.objectives(user_id, text, target_at, status)
  values (v_uid, left(btrim(coalesce(p_text,'')), 300), p_target, 'active')
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.objective_rename(p_obj uuid, p_text text)
returns boolean
language sql security definer set search_path = public as $$
  with u as (
    update public.objectives set text = left(btrim(p_text), 300)
    where id = p_obj and user_id = auth.uid() and btrim(coalesce(p_text,'')) <> ''
    returning 1)
  select exists (select 1 from u);
$$;

create or replace function public.objective_set_target(p_obj uuid, p_target timestamptz)
returns boolean
language sql security definer set search_path = public as $$
  with u as (
    update public.objectives set target_at = p_target
    where id = p_obj and user_id = auth.uid()
    returning 1)
  select exists (select 1 from u);
$$;

-- ⚠️ Mapping du vocabulaire vers celui de la contrainte
-- `objectives_status_check` — cf. 20260913140000.
create or replace function public.objective_close(p_obj uuid, p_outcome text default 'done')
returns boolean
language sql security definer set search_path = public as $$
  with u as (
    update public.objectives
       set status  = case when p_outcome = 'dropped' then 'abandoned' else 'achieved' end,
           outcome = case when p_outcome = 'dropped' then 'no'         else 'yes'      end,
           outcome_at = now()
     where id = p_obj and user_id = auth.uid()
    returning 1)
  select exists (select 1 from u);
$$;

revoke all on function public.objective_create(text, timestamptz)      from public, anon;
revoke all on function public.objective_rename(uuid, text)             from public, anon;
revoke all on function public.objective_set_target(uuid, timestamptz)  from public, anon;
revoke all on function public.objective_close(uuid, text)              from public, anon;
grant execute on function public.objective_create(text, timestamptz)     to authenticated, service_role;
grant execute on function public.objective_rename(uuid, text)            to authenticated, service_role;
grant execute on function public.objective_set_target(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.objective_close(uuid, text)             to authenticated, service_role;


-- ══ PARTIE 2 · Retrait des anciens noms ═══════════════════════════════
-- À appliquer APRÈS que Vercel a mis en ligne la nouvelle version du
-- front. `if exists` : idempotent, aucun ordre de recette dépendant.

drop function if exists public.trip_create(text, timestamptz);
drop function if exists public.trip_rename(uuid, text);
drop function if exists public.trip_set_target(uuid, timestamptz);
drop function if exists public.trip_close(uuid, text);
drop function if exists public.habit_set_trip(text, uuid);
