-- ═══════════════════════════════════════════════════════════════════════
-- LE TROISIÈME VERROU : PERSONNE N'APPELAIT LE BOT
-- 03/09/2026
--
-- `backend/README.md` dit : « pg_cron l'appelle chaque heure ».
-- Mesuré :  select jobname from cron.job;  →  cleanup-drafts,
--                                             prune_objective_cache
-- Il n'y a jamais eu de tâche pour `bot-tick`.
--
-- Trois verrous fermés sur la même porte, chacun suffisant à tout
-- arrêter : une fonction qui plantait, un interrupteur que personne
-- n'allumait, et aucune horloge. C'est pour ça que le bot n'a jamais
-- parlé et qu'aucune erreur ne le disait.
--
-- POURQUOI PAS LA CLÉ SERVICE_ROLE DANS LA COMMANDE CRON.
-- Le geste habituel est `net.http_post(..., headers => 'Bearer <service_role>')`.
-- Cette clé resterait en clair dans `cron.job.command`, lisible par
-- quiconque interroge la table, sauvegardée dans chaque dump, et
-- impossible à faire tourner sans rééditer la tâche. Règle
-- non négociable n°5 : aucun secret là où il n'a rien à faire.
--
-- CE QU'ON FAIT À LA PLACE : un jeton à usage unique, vivant deux
-- minutes, créé par la base au moment d'appeler et consommé par la
-- fonction au moment de répondre. Le secret ne quitte jamais Postgres,
-- il n'y a rien à poser dans un dashboard, et un jeton intercepté est
-- déjà mort.
--
--     cron (:07)  →  bot_tick_arm()  →  insert jeton
--                                    →  net.http_post(bot-tick, x-tick-token)
--                    bot-tick        →  bot_tick_consume(jeton)  →  true
--                                    →  push_decision par membre
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.bot_tick_tokens (
  token      text primary key,
  created_at timestamptz not null default now(),
  used_at    timestamptz
);

alter table public.bot_tick_tokens enable row level security;
revoke all on public.bot_tick_tokens from anon, authenticated;
-- RLS active, zéro policy : seul `service_role` y touche.

create or replace function public.bot_tick_consume(p_token text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_ok boolean;
begin
  -- Un jeton se consomme UNE fois. Le `used_at is null` dans le WHERE fait
  -- l'exclusion mutuelle : deux appels concurrents, un seul gagne.
  update public.bot_tick_tokens
     set used_at = now()
   where token = p_token
     and used_at is null
     and created_at > now() - interval '2 minutes'
  returning true into v_ok;

  delete from public.bot_tick_tokens where created_at < now() - interval '1 day';
  return coalesce(v_ok, false);
end $function$;

revoke all on function public.bot_tick_consume(text) from public, anon, authenticated;
grant execute on function public.bot_tick_consume(text) to service_role;

create or replace function public.bot_tick_arm()
returns bigint
language plpgsql
security definer
set search_path to 'public, extensions, net'
as $function$
declare
  v_token text;
  v_req   bigint;
begin
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.bot_tick_tokens(token) values (v_token);

  select net.http_post(
    url     := 'https://abujjbkbbiumxrokozph.supabase.co/functions/v1/bot-tick',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-tick-token',  v_token),
    body    := jsonb_build_object('source', 'pg_cron'),
    timeout_milliseconds := 25000
  ) into v_req;

  return v_req;
end $function$;

revoke all on function public.bot_tick_arm() from public, anon, authenticated;
grant execute on function public.bot_tick_arm() to service_role;

comment on function public.bot_tick_arm() is
  'Appelee par pg_cron chaque heure. Cree un jeton a usage unique (2 min)
   et POST bot-tick avec. Aucun secret dans la commande cron : la cle
   service_role n''a rien a faire dans cron.job.command.';

-- ── L'HORLOGE ───────────────────────────────────────────────────────────
-- :07 et pas :00 — les heures rondes sont les plus chargées chez tout le
-- monde, et `push_decision` reste de toute façon seul juge de l'envoi
-- (quiet hours, gap de 4 h, max 2/jour, decay). L'horloge propose,
-- la fonction dispose.
select cron.unschedule('bot-tick') where exists (select 1 from cron.job where jobname = 'bot-tick');
select cron.schedule('bot-tick', '7 * * * *', 'select public.bot_tick_arm();');
