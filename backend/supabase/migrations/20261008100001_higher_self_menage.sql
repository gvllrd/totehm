-- TOTEHM · ménage TotehmSM · 08/10/2026 — POUR CLAUDE CODE (terminal de Wah).
-- why : depuis TotehmSM v2 (`20261008100000_higher_self_freemium.sql`), aucune
--       conversation n'est gardée (Wah, 08/10 : « pas besoin de garder un
--       historique ») ; `sm_messages` et `sm_thread` (07/10) ne sont plus lus
--       ni écrits par personne (la page et `higher-self` v3 les ignorent).
-- how : DESTRUCTIF (drop) : la session cloud ne peut pas le faire approuver.
--       Appliquer UNE fois par le MCP Supabase (`apply_migration`, nom
--       `higher_self_menage`), après avoir vérifié la première requête.
-- what : la table et sa fonction disparaissent ; rien d'autre n'en dépend.

-- 1 · vérifier (attendu : 0 fonction qui cite sm_messages hors sm_thread)
-- select proname from pg_proc where prosrc ilike '%sm_messages%' and proname <> 'sm_thread';

drop function if exists public.sm_thread(bigint, int);
drop table if exists public.sm_messages;
