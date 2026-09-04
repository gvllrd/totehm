-- ═══════════════════════════════════════════════════════════════════════
-- LA VILLE, LA RECHERCHE, ET LE TOTEHM DANS LA POCHE
-- 04/09/2026
--
-- Trois choses dans ce lot, et une seule idée derrière :
-- **ce qui est déclaré une fois se sert à l'infini.**
--
--   1. `live_sources` — les agendas d'une ville sont DÉCLARÉS en base,
--      pas codés en dur. Un parseur, N sources. Ajouter une salle, c'est
--      une ligne — pas un adaptateur de plus à maintenir.
--   2. `search_totehms()` — la recherche rendait UN résultat deviné par
--      `ilike('%q%').limit(1)`, et pour un invité elle rendait trois
--      profils INVENTÉS. Elle rend maintenant une liste, réelle, classée.
--   3. `higherself_state()` — tout ce que la mini-app Telegram doit
--      afficher, en UN appel. Six requêtes au chargement, c'est six fois
--      la latence d'un réseau mobile.
-- ═══════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════
-- 1 · LE JETON D'APPEL INTERNE — généralisé
--
-- `bot_tick_tokens` a été créée hier pour un seul usage. Deux usages
-- arrivent aujourd'hui (`agenda-ingest`). Deux tables de jetons, ou une
-- table mal nommée : les deux sont le piège que SYSTEM.md documente. On
-- renomme pendant qu'elle a un jour et une ligne.
--
-- ⚠️ `bot_tick_consume()` est CONSERVÉE en enveloppe : `bot-tick` v14 est
-- déployée et l'appelle. Renommer sans enveloppe casserait la production
-- entre la migration et le redéploiement.
-- ═══════════════════════════════════════════════════════════════════════
do $$
begin
  if to_regclass('public.bot_tick_tokens') is not null
     and to_regclass('public.edge_tokens') is null then
    alter table public.bot_tick_tokens rename to edge_tokens;
  end if;
end $$;

create table if not exists public.edge_tokens (
  token      text primary key,
  created_at timestamptz not null default now(),
  used_at    timestamptz
);
alter table public.edge_tokens add column if not exists purpose text;
alter table public.edge_tokens enable row level security;
revoke all on public.edge_tokens from anon, authenticated;

create or replace function public.edge_token_consume(p_token text, p_purpose text default null)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_ok boolean;
begin
  -- Un jeton se consomme UNE fois. Le `used_at is null` dans le WHERE fait
  -- l'exclusion mutuelle : deux appels concurrents, un seul gagne.
  update public.edge_tokens
     set used_at = now()
   where token = p_token
     and used_at is null
     and created_at > now() - interval '2 minutes'
     and (p_purpose is null or purpose is null or purpose = p_purpose)
  returning true into v_ok;

  delete from public.edge_tokens where created_at < now() - interval '1 day';
  return coalesce(v_ok, false);
end $function$;

revoke all on function public.edge_token_consume(text, text) from public, anon, authenticated;
grant execute on function public.edge_token_consume(text, text) to service_role;

-- L'enveloppe qui garde `bot-tick` v14 en vie.
create or replace function public.bot_tick_consume(p_token text)
returns boolean
language sql
security definer
set search_path to 'public'
as $function$
  select public.edge_token_consume(p_token, 'bot-tick');
$function$;

revoke all on function public.bot_tick_consume(text) from public, anon, authenticated;
grant execute on function public.bot_tick_consume(text) to service_role;

-- Appeler UNE de nos fonctions, sans jamais mettre un secret dans une
-- commande cron. Le nom est validé contre une liste blanche : cette
-- fonction ne doit pas devenir un proxy HTTP ouvert.
create or replace function public.edge_call(p_fn text, p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path to 'public, extensions, net'
as $function$
declare
  v_token text;
  v_req   bigint;
begin
  if p_fn not in ('bot-tick', 'agenda-ingest') then
    raise exception 'edge_call: fonction non autorisee (%)', p_fn;
  end if;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.edge_tokens(token, purpose) values (v_token, p_fn);

  select net.http_post(
    url     := 'https://abujjbkbbiumxrokozph.supabase.co/functions/v1/' || p_fn,
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-tick-token', v_token),
    body    := coalesce(p_body, '{}'::jsonb),
    timeout_milliseconds := 55000
  ) into v_req;

  return v_req;
end $function$;

revoke all on function public.edge_call(text, jsonb) from public, anon, authenticated;
grant execute on function public.edge_call(text, jsonb) to service_role;

create or replace function public.bot_tick_arm()
returns bigint
language sql
security definer
set search_path to 'public'
as $function$
  select public.edge_call('bot-tick', jsonb_build_object('source', 'pg_cron'));
$function$;

revoke all on function public.bot_tick_arm() from public, anon, authenticated;
grant execute on function public.bot_tick_arm() to service_role;


-- ═══════════════════════════════════════════════════════════════════════
-- 2 · LES AGENDAS D'UNE VILLE — DÉCLARÉS, PAS CODÉS
--
-- Ticketmaster couvre le monde et ne couvre PAS le Portugal. La couche
-- locale ne se règle pas en ajoutant un adaptateur par site : un site
-- change de HTML tous les six mois, une API privée ferme sans prévenir
-- (Eventbrite l'a fait, Songkick aussi).
--
-- Ce qui ne change pas, ce sont les FORMATS. Un agenda sérieux publie
-- soit un `.ics` (norme RFC 5545), soit un flux RSS, soit du JSON-LD
-- `schema.org/Event` dans sa page. Trois parseurs couvrent tout, pour
-- toujours. Une salle de plus = UNE LIGNE ici, zéro ligne de code.
--
-- `lat`/`lng` sont portés par la SOURCE, pas par l'événement : un lieu
-- fixe n'a pas besoin d'être géocodé mille fois. Zéro appel payant.
-- ═══════════════════════════════════════════════════════════════════════
create table if not exists public.live_sources (
  id           text primary key,              -- 'lx_culturgest'
  city         text not null,                 -- 'lisbon' — la zone servie
  name         text not null,                 -- affiché comme `venue`
  kind         text not null,                 -- ics | rss | jsonld | agendalx
  url          text not null,
  lat          double precision,              -- le lieu, une fois pour toutes
  lng          double precision,
  intentions   text[] not null default '{}',  -- indice, jamais une vérité
  active       boolean not null default false,-- on n'allume qu'une source qui répond
  last_ok_at   timestamptz,
  last_count   integer,
  last_error   text,
  created_at   timestamptz not null default now()
);

alter table public.live_sources enable row level security;
revoke all on public.live_sources from anon, authenticated;
-- RLS active, aucune policy : `service_role` seul. Le membre ne lit jamais
-- la liste des sources — il lit `live_events`, à travers `live_near`.

create index if not exists live_sources_city_idx on public.live_sources (city, active);

-- ── LISBONNE ────────────────────────────────────────────────────────────
-- Semées INACTIVES. `agenda-ingest` en mode `probe` les essaie une par une
-- et n'allume que celles qui rendent des événements analysables. On ne
-- déclare jamais qu'une source marche : on la mesure.
--
-- Coordonnées : relevées sur la salle elle-même, pas géocodées.
insert into public.live_sources (id, city, name, kind, url, lat, lng, intentions) values
  ('lx_agendalx',    'lisbon', 'Agenda Cultural de Lisboa', 'agendalx',
   'https://www.agendalx.pt/api/events', 38.7223, -9.1393, '{}'),
  ('lx_agendalx_wp', 'lisbon', 'Agenda Cultural de Lisboa (WP)', 'jsonld',
   'https://www.agendalx.pt/wp-json/wp/v2/evento?per_page=100', 38.7223, -9.1393, '{}'),
  ('lx_culturgest',  'lisbon', 'Culturgest', 'jsonld',
   'https://www.culturgest.pt/en/whats-on/', 38.7276, -9.1487, '{express,love}'),
  ('lx_gulbenkian',  'lisbon', 'Gulbenkian', 'jsonld',
   'https://gulbenkian.pt/agenda/', 38.7370, -9.1540, '{love,express}'),
  ('lx_ccb',         'lisbon', 'Centro Cultural de Belém', 'jsonld',
   'https://www.ccb.pt/agenda', 38.6957, -9.2080, '{express,love}'),
  ('lx_maat',        'lisbon', 'MAAT', 'jsonld',
   'https://www.maat.pt/en/calendar', 38.6957, -9.1966, '{express}'),
  ('lx_lux',         'lisbon', 'Lux Frágil', 'jsonld',
   'https://luxfragil.com/agenda', 38.7136, -9.1216, '{celebrate}'),
  ('lx_musicbox',    'lisbon', 'Musicbox', 'jsonld',
   'https://www.musicboxlisboa.com/', 38.7079, -9.1443, '{celebrate,express}'),
  ('lx_hangar',      'lisbon', 'Hangar', 'jsonld',
   'https://hangar.com.pt/en/agenda/', 38.7229, -9.1338, '{express}'),
  ('lx_zdb',         'lisbon', 'Galeria Zé dos Bois', 'jsonld',
   'https://zdb.pt/agenda/', 38.7113, -9.1450, '{express,celebrate}')
on conflict (id) do nothing;

-- ── L'HORLOGE DES AGENDAS ───────────────────────────────────────────────
-- Une fois par jour, à 5h07. Un agenda municipal ne change pas d'heure en
-- heure, et chaque ingestion est une poignée de requêtes HTTP gratuites.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'agenda-ingest') then
    perform cron.unschedule('agenda-ingest');
  end if;
  perform cron.schedule('agenda-ingest', '7 5 * * *',
                        $cron$select public.edge_call('agenda-ingest', '{"mode":"run"}'::jsonb);$cron$);
end $$;

