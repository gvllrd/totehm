-- 01/11 — Wah : « le système de sauvegarde automatique ne fonctionne plus ».
-- Depuis le 13/10 (les quatre niveaux d'audience), le déclencheur BEFORE INSERT `_totehm_audience_sync` — exécuté avec
-- les droits de l'appelant — contient `public._vis_shared()`, réservée à service_role depuis le 01/10. Postgres vérifie
-- le droit d'exécuter une fonction dès la préparation de l'expression, même quand la branche n'est pas prise : chaque
-- sauvegarde des Habits par un membre (l'upsert de `totehms`, qui passe par un INSERT … ON CONFLICT) partait en 403
-- « permission denied for function _vis_shared ». Mesuré : 0 écriture dans `totehms` du 13/10 09:45 au 01/11, 220 refus
-- sur la seule journée du 01/11.
-- `_vis_shared()` ne lit que la définition d'une contrainte (elle rend le mot « members » ou « subscribers ») : la
-- rendre exécutable par un membre connecté ne dévoile rien. anon n'en a pas besoin (il ne peut rien écrire dans `totehms`).
grant execute on function public._vis_shared() to authenticated;
