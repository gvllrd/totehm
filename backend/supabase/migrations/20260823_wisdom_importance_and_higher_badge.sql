-- ══ VAGUE 5A ══  DÉJÀ APPLIQUÉE EN PRODUCTION le 23/08/2026.
-- Ce fichier existe pour que le repo dise la vérité, pas pour être rejoué.

-- 1 · WISDOM : le POIDS remplace l'INTENTION
--
-- Une leçon ne « sert » pas une intention : elle pèse. Trois niveaux.
-- EXPAND puis CONTRACT : on AJOUTE `importance` maintenant, on garde `i`
-- jusqu'à ce que le déploiement soit confirmé. Sans ça, le front encore en
-- ligne écrirait dans une colonne disparue entre le `git push` et le build.
-- `i` se retire au lot suivant : alter table wisdom drop column i;
alter table public.wisdom
  add column if not exists importance smallint
  check (importance is null or importance between 1 and 3);

comment on column public.wisdom.importance is
  '1 Worth keeping · 2 Holds up · 3 Changed me. Remplace `i` (intention),
   qui n''avait pas de sens sur une leçon. `i` sera retiré au lot suivant.';

update public.wisdom set importance = 2 where importance is null and i is not null;

-- 2 · HIGHER_BADGES : DEUX conditions, pas une
--
-- La vue ne testait que `stoner_access` : un achat isolé sur totehm.com
-- suffisait à porter le badge. Le badge dit « engagement complet dans
-- l'écosystème » — il exige donc AUSSI un abonnement vivant.
create or replace view public.higher_badges as
  select p.id, p.pseudo
  from public.stoner_access sa
  join auth.users u on lower(u.email::text) = lower(sa.email)
  join public.profiles p on p.id = u.id
  join public.subscriptions s on s.user_id = p.id
  where sa.granted_at is not null
    and s.status in ('active','trialing');

comment on view public.higher_badges is
  'Membres portant le badge Higher : methode Stoner faite sur totehm.com
   (stoner_access) ET abonnement vivant (subscriptions). Les deux, jamais un
   seul — c''est l''engagement complet que le badge valorise.';
