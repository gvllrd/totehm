-- ═══════════════════════════════════════════════════════════════════════
-- LE TRIP · 1/5 — L'INTENTION SE DÉDUIT, LA SÉRIE SE CALCULE UNE FOIS
-- 04/09/2026
--
-- Le Trip n'est pas une nouveauté : c'est le modèle d'origine de TOTEHM,
-- aplati en juin quand `trips` a été renommée `totehms`. `totehm.html`
-- porte encore le fossile, ligne 1396 :
--     « migration depuis le Grind v5 : on aplatit les steps de tous les trips »
-- Aplatir a coûté la seule chose qui donnait un SENS à une habitude : ce
-- qu'elle sert. On la lui rend.
--
--   TRIP  =  un objectif                    WHY     bleu clair
--              └─ des habitudes             HOW     navy
--                   └─ des répulsions       WISDOM  rouge-violet
--
-- ON NE CRÉE PAS DE TABLE `trips`. Tout est déjà là, et une table de plus
-- c'est une vérité de plus à synchroniser :
--   · `objectives` porte text/target_at/status → la TÊTE du trip.
--     `target_at` EST le TIME ACHIEVEMENT. Rien à ajouter.
--   · `repulsions.habit_text` relie déjà une répulsion à une habitude.
--   · il ne manquait QU'UN lien : habitude → trip. C'est une clé `o` dans
--     `totehms.steps`, à côté de `t` (texte) et `f` (fréquence).
--
-- ⚠️⚠️ LE PIÈGE QUI AURAIT VIDÉ LA CARTE
-- Wah demande « plus d'intentions ». Côté produit, oui. Côté plomberie,
-- l'intention est la CLÉ DE JOINTURE entre le membre et le monde :
--     places_matching_habits :
--       where exists (select 1 from intents i where i.intention = s.intention)
-- Une habitude sans intention ne rend pas la carte moins fine : elle rend
-- ZÉRO ligne. Écran vide, aucune erreur, aucun log.
-- L'intention ne disparaît donc pas — elle cesse d'être CHOISIE. Elle est
-- DÉDUITE du texte. Zéro appel IA : Seed reste gratuit et déterministe.
--
-- ⚠️ La version du classifieur écrite dans CE fichier a été MESURÉE MAUVAISE
--    (7 habitudes réelles sur 11 tombaient sur le défaut). Elle est
--    remplacée par la migration 5/5, `intentions_of`. On garde ce fichier
--    tel qu'appliqué : l'historique dit ce qui s'est passé, pas ce qu'on
--    aurait aimé faire.
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.intention_of(p_text text)
returns text
language sql immutable parallel safe as $$
  with t as (select lower(coalesce(p_text, '')) as s)
  select case
    when (select s from t) ~ '(sport|gym|muscu|boxe|box|run|cours|courir|traine|train|workout|lift|fight|combat|spar|push|discipline|froid|cold|jeûne|jeune|fast)'
      then 'fight'
    when (select s from t) ~ '(marche|walk|nage|swim|yoga|stretch|respir|breath|dors|dormir|sleep|repos|rest|nature|surf|vélo|velo|bike|flow|balade)'
      then 'flow'
    when (select s from t) ~ '(lis|lire|read|livre|book|appren|learn|étud|etud|study|cours|langue|langua|écris|ecris|writ|note|podcast|doc)'
      then 'enrich'
    when (select s from t) ~ '(aime|amour|love|famille|family|ami|friend|appel|call|mère|mere|père|pere|enfant|couple|donne|give|merci|gratitude|prie|pray|médit|medit)'
      then 'love'
    when (select s from t) ~ '(joue|jouer|play|musique|music|chante|sing|danse|dance|dessin|draw|peins|paint|crée|cree|creat|studio|morceau|track|beat|art)'
      then 'express'
    when (select s from t) ~ '(fête|fete|party|sors|sortir|out|club|concert|verre|drink|célèb|celeb|anniv|dj|bar|show)'
      then 'celebrate'
    when (select s from t) ~ '(travail|work|bosse|deep|concentr|focus|code|projet|project|client|business|mail|admin|plan|objectif|deadline|sans téléphone|no phone)'
      then 'focus'
    else 'focus'
  end;
$$;

comment on function public.intention_of(text) is
  'Déduit l''intention d''une habitude à partir de son texte. Déterministe, zéro coût. L''intention n''est plus choisie par le membre : elle sert de clé de jointure entre ses habitudes et le monde (places/spots/live_events).';

grant execute on function public.intention_of(text) to anon, authenticated, service_role;


-- ── LA SÉRIE ET LA CONSISTANCE, SORTIES DE `higherself_state` ──────────
-- Ce bloc y existait déjà, à l'identique. Le copier une troisième fois dans
-- `my_trips`, c'est la garantie qu'un jour l'écran des trips et la mini-app
-- annonceront deux séries différentes pour la même habitude, le même jour.
-- On le sort ici, et les DEUX l'appellent.
create or replace function public.habit_stats(p_user uuid, p_habit text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'asked',    (select count(*) from public.habit_outcomes o
                  where o.user_id = p_user and o.habit_text = p_habit),
    'answered', (select count(*) from public.habit_outcomes o
                  where o.user_id = p_user and o.habit_text = p_habit
                    and o.answered_at is not null),
    'done',     (select count(*) from public.habit_outcomes o
                  where o.user_id = p_user and o.habit_text = p_habit
                    and o.outcome = 'done'),
    -- La consistance se lit sur 30 jours, et sur les questions RÉPONDUES.
    -- Compter les questions ignorées comme des échecs punirait quelqu'un
    -- d'avoir été en avion.
    'consistency', (
      select case when count(*) filter (where o.answered_at is not null) > 0
                  then round(100.0 * count(*) filter (where o.outcome = 'done')
                                   / count(*) filter (where o.answered_at is not null))::int
                  else null end
      from public.habit_outcomes o
      where o.user_id = p_user and o.habit_text = p_habit
        and o.asked_at > now() - interval '30 days'),
    'last_done', (select max(o.answered_at) from public.habit_outcomes o
                   where o.user_id = p_user and o.habit_text = p_habit
                     and o.outcome = 'done'),
    'pending_id',(select o.id from public.habit_outcomes o
                   where o.user_id = p_user and o.habit_text = p_habit
                     and o.answered_at is null
                   order by o.asked_at desc limit 1),
    -- LA SÉRIE, sans boucle : on remonte les réponses de la plus récente à la
    -- plus ancienne en cumulant les ratés, et on compte les lignes où le cumul
    -- vaut encore zéro. Le premier raté clôt la série.
    'streak', (
      select count(*) from (
        select sum(case when o.outcome <> 'done' then 1 else 0 end)
                 over (order by o.answered_at desc
                       rows between unbounded preceding and current row) as breaks
        from public.habit_outcomes o
        where o.user_id = p_user and o.habit_text = p_habit
          and o.answered_at is not null
      ) r where r.breaks = 0)
  );
$$;

revoke all on function public.habit_stats(uuid, text) from public, anon;
grant execute on function public.habit_stats(uuid, text) to authenticated, service_role;
