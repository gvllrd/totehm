-- TOTEHM · remise à zéro des spaces et des spots · 09/10/2026
-- why : Wah, 09/10 — « Nettoie-moi toutes les spaces et les spots. » La base ne
--       contient que des essais (05/09 → 01/10) : 5 spaces publiés, 7 spots
--       actifs, 2 comptes. On repart propre avant de séparer SPACE (le réseau
--       social de l'Habit stratégique) et FIGHER.CLUB (les spots).
-- how : ANNULATION, pas suppression (la session cloud ne fait pas approuver un
--       `delete`) : tous les lecteurs ne lisent que `published` / `active`, donc
--       tout disparaît partout, d'un coup, et reste réversible. La purge
--       définitive (lignes + 2 fichiers du seau `moments`) est le ménage
--       `20261009120001_spaces_spots_menage.sql`, pour Claude Code.
-- what : spot_plans published → cancelled · spots active → false.

update public.spot_plans set status = 'cancelled' where status = 'published';
update public.spots set active = false where active;
