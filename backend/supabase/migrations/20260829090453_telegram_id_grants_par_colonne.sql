-- La migration précédente a échoué en silence, et c'est instructif :
-- on ne retire PAS une colonne d'un GRANT posé au niveau table.
-- PostgreSQL accepte la commande, émet un WARNING, et ne change rien.
-- Il faut retirer le droit de table, puis le rendre colonne par colonne.

-- ── LECTURE ──
revoke select on public.profiles from authenticated;
grant  select (id, pseudo, nft_holder, created_at, verified)
  on public.profiles to authenticated;

-- ── ÉCRITURE ──
-- Un membre renomme son Totehm. Il ne touche à rien d'autre.
revoke update on public.profiles from authenticated;
grant  update (pseudo) on public.profiles to authenticated;

-- Il crée sa ligne avec son id et son nom. telegram_id n'y est pas.
revoke insert on public.profiles from authenticated;
grant  insert (id, pseudo) on public.profiles to authenticated;

-- anon garde ses droits de table : la RLS ne lui donne aucune policy
-- sur profiles, donc il ne lit déjà aucune ligne. Lui retirer le GRANT
-- changerait la réponse de « 0 ligne » à « 403 » et casserait les
-- chemins qui comptent sur un tableau vide.

-- service_role : intact. C'est bot-reply, et lui seul, qui écrit telegram_id.
