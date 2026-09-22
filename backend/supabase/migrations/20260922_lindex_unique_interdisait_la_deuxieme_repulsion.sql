-- ══ L'INDEX UNIQUE INTERDISAIT LA DEUXIÈME RÉPULSION · 22/09/2026 ═══
-- DÉJÀ APPLIQUÉE EN PRODUCTION. Ce fichier existe pour que le repo dise
-- la vérité. Ne pas relancer `db push`.
--
-- LA CAUSE, APRÈS CINQ SIGNALEMENTS.
--
--   repulsions_one_active : UNIQUE (user_id, habit_text) WHERE active
--
-- Et `repulsion_create` insère TOUJOURS `habit_text = ''`, parce que les
-- cinq objets naissent vides puis s'écrivent dedans (création optimiste,
-- 17/09). Donc :
--   · la PREMIÈRE répulsion créée passe — ('', user) est libre ;
--   · LA DEUXIÈME viole l'index, la fonction lève, la RPC rend une
--     erreur, la page annule la boîte. « Je ne peux pas ajouter de
--     répulsion. »
--
-- Mesuré : une ligne active portait déjà habit_text='' sur le compte.
-- À partir de cet instant, plus aucune création ne pouvait aboutir.
-- Contre-épreuve : deux repulsion_create d'affilée, le premier passe,
-- le second lève. Après correction, cinq d'affilée passent.
--
-- L'index protège une vraie règle métier : une seule répulsion ACTIVE
-- par habitude. Mais `habit_text = ''` ne désigne AUCUNE habitude — la
-- règle ne s'y applique pas. C'est le même défaut conceptuel que le
-- trigger `repulsion_seed_link` corrigé le matin même : un texte
-- d'habitude vide n'est pas une habitude, et rien ne doit le traiter
-- comme telle.
--
-- ⚠️ ET C'EST UN TROU DANS LA RÈGLE DU 17/09. « Lire les contraintes de
-- la table » ne suffit pas : un index unique partiel n'est PAS dans
-- `pg_constraint`, il est dans `pg_index`. Un index unique partiel est
-- une contrainte qui ne se déclare pas comme telle — un trigger aussi.
drop index if exists public.repulsions_one_active;
create unique index repulsions_one_active
  on public.repulsions (user_id, habit_text)
  where active and btrim(habit_text) <> '';

-- L'index de lecture suit la même logique : il ne sert qu'à retrouver
-- une répulsion PAR SON HABITUDE.
drop index if exists public.repulsions_lookup;
create index repulsions_lookup
  on public.repulsions (user_id, habit_text)
  where active and btrim(habit_text) <> '';
