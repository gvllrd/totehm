-- ══ VAGUE 5B ══  DÉJÀ APPLIQUÉE EN PRODUCTION le 24/08/2026.
-- Ce fichier existe pour que le repo dise la vérité, pas pour être rejoué.
--
-- LE VIEWER PUBLIC EN TRIPLE VOLET
--
-- Pour montrer le Passé et le Futur d'un autre membre, il faut pouvoir les
-- LIRE. `wisdom` et `objectives` disaient `auth.uid() = user_id` : personne
-- ne lisait personne.
--
-- UN SEUL INTERRUPTEUR, celui que le membre connaît déjà :
-- `totehms.totehm_visibility = 'members'`. Il commandait les habitudes ; il
-- commande maintenant les trois volets. Inventer une visibilité par table,
-- c'est demander à quelqu'un de tenir trois réglages cohérents — et c'est
-- ainsi qu'on publie ses leçons privées sans l'avoir voulu.
--
-- `to authenticated` : un visiteur non connecté ne lit NI les leçons NI les
-- objectifs. Plus strict que `totehms`, qui reste lisible par anon.
--
-- Policies PERMISSIVES, elles s'ajoutent aux policies « own » : le
-- propriétaire garde tout, les autres n'obtiennent que la lecture, et
-- seulement si le Totehm est ouvert aux membres.
--
-- ÉTANCHÉITÉ PROUVÉE EN BASE le 24/08/2026, sous rôle simulé :
--   MEMBRE connecté  → voit les leçons/objectifs d'un Totehm 'members',
--                      PAS ceux d'un Totehm 'private'
--   ANONYME          → ne voit rien du tout, dans aucune des deux tables

create policy "wisdom members read" on public.wisdom
  for select to authenticated
  using (
    exists (select 1 from public.totehms t
            where t.user_id = wisdom.user_id
              and t.totehm_visibility = 'members')
  );

create policy "objectives members read" on public.objectives
  for select to authenticated
  using (
    exists (select 1 from public.totehms t
            where t.user_id = objectives.user_id
              and t.totehm_visibility = 'members')
  );

comment on policy "wisdom members read" on public.wisdom is
  'Lecture seule des lecons d''un membre dont le Totehm est ouvert aux
   membres. Aucune ecriture. Anonyme exclu.';
comment on policy "objectives members read" on public.objectives is
  'Lecture seule des objectifs d''un membre dont le Totehm est ouvert aux
   membres. Aucune ecriture. Anonyme exclu.';
