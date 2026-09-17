-- ═══════════════════════════════════════════════════════════════════════
-- TOTEHM · 17/09/2026 · CE QUI BLOQUAIT, ET LE PONT
-- Appliqué en production le 17/09 depuis cette session. Ce fichier est
-- l'historique : ne pas rejouer.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1 · LA LEÇON VIDE ─────────────────────────────────────────────────
-- ⚠️ C'EST LA CAUSE DE « IMPOSSIBLE D'AJOUTER DES TEACHING », signalée
--    quatre fois. Elle n'était pas dans le code : elle était dans une
--    contrainte.
--    `wisdom_text_check` exigeait `char_length(text) >= 1`. Or les cinq
--    objets du Totehm se créent VIDES puis s'écrivent dedans — c'est la
--    règle du produit depuis le 16/09. `teaching_create('')` violait donc
--    la contrainte, la fonction levait, la console affichait l'erreur, et
--    la leçon n'existait jamais.
--    `objectives` et `visions` n'ont AUCUNE borne basse : c'est pour ça
--    que ces deux-là marchaient. `wisdom` était la seule table à dire non.
--    La borne haute reste : 400 caractères, c'est une leçon, pas un essai.
alter table public.wisdom drop constraint if exists wisdom_text_check;
alter table public.wisdom add constraint wisdom_text_check
  check (char_length(text) <= 400);

-- ── 2 · LE PONT SSO ───────────────────────────────────────────────────
-- Quatre domaines, quatre localStorage, quatre sessions. Le compte est
-- unique — l'email est l'identité universelle — mais la session ne l'est
-- pas et ne peut pas l'être : un navigateur ne partage rien entre deux
-- origines. On ne le contourne pas, on le TRAVERSE.
--
-- ⚠️ LE CODE DE PASSAGE N'EST PAS UN JETON DE SESSION, et la distinction
--    est toute la sécurité du système. La règle « jamais un jeton de
--    session dans une URL » tient parce qu'un jeton de session vit des
--    heures et ouvre tout. Ce code-ci vit SOIXANTE SECONDES, ne sert
--    QU'UNE FOIS, n'est valable que pour UN domaine cible, est stocké
--    HACHÉ, et n'ouvre rien par lui-même — il faut l'échanger côté
--    serveur contre un jeton Supabase. C'est un code d'autorisation.
--    Le confondre avec une clé, ce serait s'interdire tout SSO.
create table if not exists public.sso_handoff (
  code_hash   text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  target      text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);
create index if not exists sso_handoff_expires_idx on public.sso_handoff(expires_at);

-- ⚠️ RLS ACTIVE, AUCUNE POLITIQUE. C'est voulu, ce n'est pas un oubli :
--    seul le `service_role` (les deux Edge Functions) touche cette table.
--    Un membre n'a aucune raison de lire les codes de passage, même les
--    siens.
alter table public.sso_handoff enable row level security;
revoke all on table public.sso_handoff from anon, authenticated;

create or replace function public.sso_menage()
returns void language sql security definer set search_path = public as $$
  delete from public.sso_handoff where expires_at < now() - interval '5 minutes';
$$;
revoke all on function public.sso_menage() from public, anon, authenticated;

-- ── 3 · LE TOTEHM D'UN AUTRE, EN ENTIER ───────────────────────────────
-- ⚠️ C'EST LA CAUSE DE « le système de recherche est fucked up ».
--    Le mode lecture ne chargeait QUE `steps` — les habitudes. Les quatre
--    autres vues restaient vides, et pire : changer de vue appelait
--    `my_trips()`, qui rend l'arbre DU DEMANDEUR. On voyait donc ses
--    PROPRES objectifs à l'intérieur du Totehm de quelqu'un d'autre.
--    Un Totehm en lecture est le même objet, avec les mêmes cinq vues.
--
-- ⚠️ LA VISIBILITÉ EST VÉRIFIÉE ICI, PAS À L'ÉCRAN. `security definer`
--    court-circuite RLS : c'est donc CETTE fonction qui porte toute la
--    règle. Elle ne rend rien si le Totehm n'est pas partagé, et rien du
--    tout à un visiteur non connecté.
-- (Corps complet : voir la fonction en base — `totehm_of(text)`.)

-- ── 4 · LES DROITS · TOUJOURS APRÈS LE DERNIER `create` ───────────────
-- ⚠️ `create or replace function` rétablit le GRANT à PUBLIC.
revoke all on function public.totehm_of(text) from public, anon;
grant execute on function public.totehm_of(text) to authenticated;
