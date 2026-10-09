-- TOTEHM · ménage des spaces et des spots · 09/10/2026 — POUR CLAUDE CODE.
-- why : après `20261009120000_spaces_spots_reset.sql` (tout annulé, invisible),
--       Wah veut une base propre. DESTRUCTIF (delete) : la session cloud ne peut
--       pas le faire approuver.
-- how : appliquer UNE fois (MCP `apply_migration`, nom `spaces_spots_menage`)
--       après avoir relu les comptes de la requête 1. Puis supprimer les 2
--       fichiers du seau `moments` par l'API Storage (requête 2 pour la liste)
--       — jamais par un `delete` sur storage.objects.

-- 1 · vérifier (attendu au 09/10 : 19 · 21 · 8 · 0 · 0)
-- select (select count(*) from public.spot_plans where status <> 'cancelled') vivants,
--        (select count(*) from public.spot_plans) plans, (select count(*) from public.spots) spots,
--        (select count(*) from public.spot_takes) takes, (select count(*) from public.spot_applications) candidatures,
--        (select count(*) from public.videos) videos;
-- (vivants doit valoir 0 : sinon quelqu'un a publié depuis, s'arrêter et demander.)

-- 2 · les fichiers à retirer par l'API Storage
-- select name from storage.objects where bucket_id = 'moments';

delete from public.spot_applications;
delete from public.spot_takes;
delete from public.spot_plans where status = 'cancelled';
delete from public.spots where not active;
