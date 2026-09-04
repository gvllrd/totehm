-- ═══════════════════════════════════════════════════════════════════════
-- LE BOT N'A JAMAIS ENVOYÉ UN SEUL MESSAGE — VOICI POURQUOI
-- 03/09/2026
--
-- MESURÉ, pas supposé :
--
--   select to_regclass('public.outcomes');   →  NULL
--   select count(*) from pushes;             →  0
--   select count(*) from habit_outcomes;     →  0
--   select count(*) from totehms where bot;  →  0
--
-- La table `outcomes` a été renommée `habit_outcomes` le 18/08/2026
-- (journal des décisions, SYSTEM.md §10). Quatre fonctions n'ont jamais
-- suivi le renommage et interrogent encore la table disparue :
--
--   push_decision    3 références   ← LE CŒUR DU BOT
--   next_push        6 références   ← mort, remplacé par push_decision
--   chapter_material 2 références   ← mort, remplacé par chapter_full_material
--   log_asked        1 référence
--
-- En PL/pgSQL une table absente ne se voit pas à la création : elle lève
-- à l'EXÉCUTION. `push_decision` plantait donc à chaque appel horaire,
-- `bot-tick` recevait `undefined`, comptait la raison « unknown » et
-- passait au membre suivant. Zéro erreur visible, zéro message envoyé,
-- pendant seize jours.
--
-- LA LEÇON, à écrire dans SYSTEM.md : un `alter table ... rename` ne
-- touche PAS le corps des fonctions PL/pgSQL. Après tout renommage :
--
--   select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and p.prosrc like '%<ancien_nom>%';
--
-- DEUXIÈME VERROU SUR LA MÊME PORTE : `totehms.bot` vaut `false` pour
-- tout le monde, et RIEN dans le produit ne le passe à `true` —
-- `profile.bot` n'est jamais coché nulle part dans `totehm.html`. Même
-- réparée, la fonction n'aurait eu personne à servir. La liaison
-- TotehmBot allume désormais le bot (voir `bot-reply`), et `/pause` le
-- rendort. On ne demande pas deux fois la même permission.
-- ═══════════════════════════════════════════════════════════════════════

-- ── LE CŒUR DU BOT, RÉPARÉ ──────────────────────────────────────────────
-- Contrat inchangé : { send, why, habit, body, repulsion_id }.
-- NOTHING domine toujours : la fonction dit non par défaut.
create or replace function public.push_decision(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_tz text; v_qf int; v_qt int; v_max int;
  v_hour int; v_today int; v_last timestamptz;
  v_day_start timestamptz;
  v_ignored int; v_habit text; v_rep record; v_body text;
begin
  select tz, quiet_from, quiet_to, max_daily
    into v_tz, v_qf, v_qt, v_max
    from public.totehms where user_id = p_user and bot = true limit 1;

  -- Bot non activé : silence. NOTHING est le défaut.
  if v_tz is null then
    return jsonb_build_object('send', false, 'why', 'bot_off');
  end if;

  v_hour := extract(hour from (now() at time zone v_tz))::int;

  -- Passage de minuit géré : 22h→8h est un intervalle qui enjambe le jour.
  if (v_qf < v_qt and v_hour >= v_qf and v_hour < v_qt)
     or (v_qf > v_qt and (v_hour >= v_qf or v_hour < v_qt)) then
    return jsonb_build_object('send', false, 'why', 'quiet_hours');
  end if;

  -- « Aujourd'hui » est le jour DU MEMBRE, pas celui du serveur. La v3
  -- comparait un timestamptz à une date sans fuseau : un membre à Lisbonne
  -- et un membre à Los Angeles n'avaient pas le même minuit.
  v_day_start := ((now() at time zone v_tz)::date)::timestamp at time zone v_tz;

  select count(*), max(sent_at) into v_today, v_last
    from public.pushes
   where user_id = p_user and sent_at >= v_day_start;

  if v_today >= v_max then
    return jsonb_build_object('send', false, 'why', 'max_daily');
  end if;

  if v_last is not null and v_last > now() - interval '4 hours' then
    return jsonb_build_object('send', false, 'why', 'min_gap');
  end if;

  -- DECAY : trois silences d'affilée, on se tait une semaine.
  -- Un bot qui insiste quand on l'ignore se fait couper, pas obéir.
  select count(*) into v_ignored
    from (select answered_at from public.habit_outcomes
           where user_id = p_user order by asked_at desc limit 3) s
   where answered_at is null;

  if v_ignored >= 3 and v_last is not null and v_last > now() - interval '7 days' then
    return jsonb_build_object('send', false, 'why', 'decay_silence');
  end if;

  -- L'habitude à servir : la plus fréquente, la moins servie récemment,
  -- et pas déjà en attente de réponse. Lue depuis STEPS — `my_habits()`
  -- est la vérité, `totehm_events` est un journal incomplet.
  select h.habit into v_habit
  from public.my_habits(p_user) h
  where h.ready                                   -- sans fréquence, on ignore
    and not exists (
      select 1 from public.habit_outcomes o
       where o.user_id = p_user and o.habit_text = h.habit
         and o.answered_at is null
         and o.asked_at > now() - interval '20 hours')
  order by case h.freq
             when 'several_daily' then 0
             when 'every_morning' then 1 when 'daily' then 1
             when 'every_night'   then 1
             when 'every_weekday' then 2 when 'every_other_day' then 3
             when 'twice_week'    then 4 when 'weekly' then 5
             else 9 end,
           (select max(asked_at) from public.habit_outcomes o
             where o.user_id = p_user and o.habit_text = h.habit) nulls first
  limit 1;

  if v_habit is null then
    return jsonb_build_object('send', false, 'why', 'nothing_due');
  end if;

  -- La Repulsion n'a PAS décidé de ce push : il était déjà autorisé.
  -- Elle en change les mots — et ce sont SES mots. Zéro appel IA.
  select id, repulsion into v_rep
    from public.repulsions
   where user_id = p_user and habit_text = v_habit and active limit 1;

  if v_rep.id is not null then
    v_body := 'Tu avais choisi de ' || v_rep.repulsion || '.';
  else
    v_body := v_habit || ' — tu l''as fait ?';
  end if;

  return jsonb_build_object(
    'send', true, 'habit', v_habit, 'body', v_body,
    'repulsion_id', v_rep.id, 'hour', v_hour, 'today', v_today);
end $function$;

-- ⚠️ Tout `revoke` suit le dernier `create` — jamais l'inverse.
-- `create or replace function` rétablit le GRANT à PUBLIC (SYSTEM.md §7).
revoke all on function public.push_decision(uuid) from public, anon, authenticated;
grant execute on function public.push_decision(uuid) to service_role;

-- ── log_asked : même renommage, même correction ─────────────────────────
-- `create or replace` refuse de retirer un DEFAULT de paramètre existant
-- (42P13). On dépose la signature avant de la reposer.
drop function if exists public.log_asked(uuid, text, text);
create function public.log_asked(p_user uuid, p_habit text, p_intention text)
returns bigint
language sql
security definer
set search_path to 'public'
as $function$
  insert into public.habit_outcomes(user_id, habit_text, intention, asked_at, source)
  values (p_user, p_habit, nullif(p_intention, ''), now(), 'bot')
  returning id;
$function$;

revoke all on function public.log_asked(uuid, text, text) from public, anon, authenticated;
grant execute on function public.log_asked(uuid, text, text) to service_role;

-- ── LES DEUX MORTES ─────────────────────────────────────────────────────
-- `next_push` est l'ancêtre de `push_decision` ; `chapter_material` celui
-- de `chapter_full_material`. Aucune n'est appelée par le front ni par une
-- Edge Function (vérifié par grep sur tout le repo). Elles interrogent une
-- table disparue : les garder, c'est garder deux pièges armés.
drop function if exists public.next_push(uuid);
drop function if exists public.chapter_material(text);

-- ── LE MEMBRE PEUT ALLUMER ET ÉTEINDRE ──────────────────────────────────
-- `totehms.bot` était écrit uniquement par le snapshot d'habitudes de
-- `totehm.html`, avec `bot: !!profile.bot` — un champ qu'aucun bouton ne
-- coche. Résultat : allumer le bot ailleurs (par la liaison Telegram) était
-- annulé au prochain enregistrement d'habitude.
--
-- Une fonction dédiée, et le snapshot ne touche plus à cette colonne.
create or replace function public.set_bot(p_on boolean)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.totehms set bot = p_on, updated_at = now() where user_id = auth.uid();
  if not found then
    insert into public.totehms(user_id, steps, bot) values (auth.uid(), '[]'::jsonb, p_on);
  end if;
  return p_on;
end $function$;

revoke all on function public.set_bot(boolean) from public, anon;
grant execute on function public.set_bot(boolean) to authenticated, service_role;

comment on function public.set_bot(boolean) is
  'Interrupteur du bot pour le membre connecte. Separe du snapshot
   d''habitudes : cloudSave() ne doit plus ecrire la colonne `bot`, sinon
   il eteint ce que la liaison Telegram vient d''allumer.';

-- ── L'ÉTAT DU BOT, EN UN APPEL ──────────────────────────────────────────
-- Le front avait besoin de trois choses (lié ? actif ? combien de
-- questions en attente ?) et n'avait de fonction que pour la première.
create or replace function public.bot_state()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'linked',  exists (select 1 from public.profiles
                        where id = auth.uid() and telegram_id is not null),
    'on',      coalesce((select bot from public.totehms where user_id = auth.uid() limit 1), false),
    'pending', (select count(*) from public.habit_outcomes
                 where user_id = auth.uid() and answered_at is null),
    'ready',   (select count(*) from public.my_habits(auth.uid()) where ready)
  );
$function$;

revoke all on function public.bot_state() from public, anon;
grant execute on function public.bot_state() to authenticated, service_role;
