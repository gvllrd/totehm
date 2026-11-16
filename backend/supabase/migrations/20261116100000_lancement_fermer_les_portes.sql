-- 16/11/2026 · LANCEMENT — FERMER LES PORTES QUI RESTAIENT OUVERTES.
-- Appliquée en CINQ morceaux (`lancement_1_…` à `lancement_5_…`, règle « un gros lot se passe en morceaux ») ;
-- ce fichier en est la somme, dans l'ordre. Mesuré APRÈS : la sonde anonyme ne reçoit plus que des refus (42501),
-- la boutique lit toujours ses 6 styles, et un membre qui passe l'identifiant d'un autre reçoit SES données.
-- Audit du 16/11 (avis Supabase + sonde anonyme, `tests/prod/sonde_anonyme.sh`). Mesuré AVANT, sans compte, avec la
-- seule clé publique des pages : `my_habits(p_user)` rendait les 6 Habits privées d'un membre ; trois vues internes
-- et la colonne des prompts de style étaient lisibles ; n'importe qui pouvait écrire dans le seau privé `play-signals`.
--
-- La règle (CLAUDE.md) : le compte vient TOUJOURS de la session, jamais d'un paramètre. Une fonction qui prend
-- `p_user` est une fonction INTERNE : elle n'est exécutable que par le serveur (service_role) et par les fonctions
-- qui l'appellent (elles tournent avec les droits de leur propriétaire).

-- ── 1 · `my_habits(p_user)` : appelée par un membre ou un visiteur, elle ne lit QUE la session ──────────────────────
-- Ses appelants internes passent tous `auth.uid()` (bot_state, higherself_state, habits_incomplete,
-- chapter_full_material) ou tournent en service (push_decision) : le garde ne change rien pour eux.
create or replace function public.my_habits(p_user uuid default null::uuid)
 returns table(habit text, freq text, intention text, ready boolean)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select
    trim(s->>'t')                       as habit,
    nullif(trim(s->>'f'), '')           as freq,
    nullif(trim(s->>'i'), '')           as intention,
    -- Une habitude sans fréquence ne peut pas être suivie : le bot ne
    -- sait pas quand demander. C'est ce drapeau que le front doit
    -- utiliser pour réclamer la donnée manquante.
    (nullif(trim(s->>'f'),'') is not null) as ready
  from public.totehms t,
       jsonb_array_elements(coalesce(t.steps, '[]'::jsonb)) s
  where t.user_id = case when coalesce(auth.role(), '') in ('anon', 'authenticated')
                         then auth.uid()                       -- un membre, un visiteur : SA session, rien d'autre
                         else coalesce(p_user, auth.uid()) end -- le serveur (service_role, cron) : qui il nomme
    and nullif(trim(s->>'t'), '') is not null;
$function$;
revoke all on function public.my_habits(uuid) from public, anon;
grant execute on function public.my_habits(uuid) to authenticated, service_role;

-- ── 2 · `totehm_complete(p_user)` : l'interne garde `p_user`, la porte publique ne lit que la session ───────────────
-- `_figher(p_user)` l'appelle pour un AUTRE membre (creator_card : le créateur est-il du Club ?) : on ne peut donc pas
-- garder le corps. L'ancienne devient `_totehm_complete` (interne), ses quatre appelants sont repointés tels quels
-- (même texte, un mot remplacé), et `totehm_complete` devient une porte qui ne connaît que la session.
alter function public.totehm_complete(uuid) rename to _totehm_complete;

do $do$
declare r record; v text;
begin
  for r in select p.oid, p.proname from pg_proc p
            where p.pronamespace = 'public'::regnamespace
              and p.proname in ('_art_passport', '_figher', '_sm_state', 'creator_cercle') loop
    v := pg_get_functiondef(r.oid);
    if position('public.totehm_complete(' in v) = 0 then
      raise exception 'lancement: appel introuvable dans %', r.proname;
    end if;
    execute replace(v, 'public.totehm_complete(', 'public._totehm_complete(');
  end loop;
end $do$;

create function public.totehm_complete(p_user uuid default null::uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select public._totehm_complete(
    case when coalesce(auth.role(), '') in ('anon', 'authenticated') then auth.uid()
         else coalesce(p_user, auth.uid()) end);
$function$;
comment on function public.totehm_complete(uuid) is
  '[COM+CLUB+BOUTIQUE] Les cinq vues sont-elles remplies ? Un membre ne lit que les siennes (la session) ; le serveur nomme qui il veut.';
revoke all on function public._totehm_complete(uuid) from public, anon, authenticated;
grant execute on function public._totehm_complete(uuid) to service_role;
revoke all on function public.totehm_complete(uuid) from public, anon;
grant execute on function public.totehm_complete(uuid) to authenticated, service_role;

-- ── 3 · Les fonctions INTERNES qui prennent un identifiant : plus exécutables de l'extérieur ───────────────────────
revoke all on function public._box_shots(uuid, text, text) from public, anon, authenticated;
grant execute on function public._box_shots(uuid, text, text) to service_role;
revoke all on function public._habit_ints(uuid, text) from public, anon, authenticated;
grant execute on function public._habit_ints(uuid, text) to service_role;
revoke all on function public.habit_stats(uuid, text) from public, anon, authenticated;
grant execute on function public.habit_stats(uuid, text) to service_role;

-- ── 4 · Une fonction morte, ouverte sans compte, qui écrivait dans `totehms` des colonnes disparues ────────────────
drop function if exists public.engrave_totehm(uuid, text, text, text, text);

-- ── 5 · Les vues internes : le serveur seul ───────────────────────────────────────────────────────────────────────
-- `higher_badges` lit `auth.users` (bot-reply, service) ; les trois autres sont des comptes de pilotage. Aucune page
-- ne les lit. Les trois qui n'ont pas besoin de `auth.users` passent aux droits de l'appelant.
revoke all on public.higher_badges, public.figher_cohort, public.runs_by_mode, public.signature_styles
  from public, anon, authenticated;
alter view public.figher_cohort    set (security_invoker = true);
alter view public.runs_by_mode     set (security_invoker = true);
alter view public.signature_styles set (security_invoker = true);

-- ── 6 · `creator_profiles` porte l'IBAN ou l'email PayPal (`payout_handle`) : lue par son propriétaire, écrite par ──
--        le serveur seul (`monetization_set`, `creator_payout_set`, `creator-price`, le webhook).
-- « creator card is public » montrait TOUTE la ligne dès que `charges_enabled` passait à vrai ; « own creator profile »
-- laissait le créateur écrire lui-même son prix et ses drapeaux, hors de toute validation.
drop policy if exists "creator card is public" on public.creator_profiles;
drop policy if exists "own creator profile" on public.creator_profiles;
create policy "creator profile own read" on public.creator_profiles
  for select to authenticated using (auth.uid() = user_id);
revoke all on public.creator_profiles from public, anon, authenticated;
grant select on public.creator_profiles to authenticated;

-- ── 7 · Les prompts des styles artistiques (`system_prompt_prefix`, `negative_prompt`) sont le savoir-faire de la ──
--        boutique : la page ne lit que la fiche du style.
revoke all on public.artistic_styles from public, anon, authenticated;
grant select (id, name, image_url, position, active, created_at, status, total_capacity, remaining_capacity, scope)
  on public.artistic_styles to anon, authenticated;

-- ── 8 · L'ancienne table `spots` : un membre lisait TOUS les spots actifs, privés compris ─────────────────────────
drop policy if exists "members read all spots" on public.spots;

-- ── 9 · Le seau privé `play-signals` : n'importe qui pouvait y envoyer un fichier ─────────────────────────────────
drop policy if exists "Auth upload play-signals" on storage.objects;

-- ── 10 · `search_path` fixé sur les huit fonctions qui en étaient dépourvues (avis Supabase) ───────────────────────
do $do$
declare r record;
begin
  for r in select p.oid::regprocedure as f from pg_proc p
            where p.pronamespace = 'public'::regnamespace
              and p.proname in ('intention_of', 'intentions_of', '_ledger_append_only', 'habits_intentions',
                                'places_matching_habits', 'sync_style_status', 'freq_minutes', '_art_append_only')
              and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%') loop
    execute format('alter function %s set search_path to ''public''', r.f);
  end loop;
end $do$;
