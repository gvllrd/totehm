-- ═══════════════════════════════════════════════════════════════════════
-- LA VIDÉO MEMBRE VIT CHEZ TELEGRAM — appliquée en production le 06/09/2026
--
-- Voir backend/SYSTEM.md §7 « Le lien Telegram expire, le file_id non ».
-- Reproduite ici pour que le dépôt et la base racontent la même histoire.
--
-- LE CALCUL QUI TRANCHE. Une photo Google coûte 7 $/1 000 requêtes et ses
-- conditions interdisent de la conserver : on paierait À CHAQUE VUE, à vie
-- — ≈ 1 050 $/mois à 10 000 ouvertures de carte, un quart du revenu à 148
-- abonnés, pour des images que Google affiche déjà gratuitement chez lui.
-- La vidéo d'un membre inverse le modèle : il paie la capture, Telegram
-- paie le stockage, on paie ~2,70 $/mois de transport. Quatre cents fois
-- moins cher, et c'est du contenu que Google n'a pas.
--
-- LE PIÈGE : `file_id` est PERMANENT, le lien rendu par `getFile` EXPIRE
-- (~1 h). On garde donc les deux — `tg_file_id` fait foi, `video_url` n'est
-- qu'un cache daté par `video_url_at`.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.spots
  add column if not exists tg_file_id   text,
  add column if not exists video_kind   text
    check (video_kind is null or video_kind in ('video','video_note')),
  add column if not exists video_url_at timestamptz,
  add column if not exists video_secs   smallint;

comment on column public.spots.tg_file_id is
  'Handle Telegram permanent. Source de verite du media : le lien getFile expire, pas lui.';
comment on column public.spots.video_url is
  'Cache du lien getFile, perime au bout d''une heure. Ne jamais le traiter comme durable.';

-- Index partiel : on ne cherche que les spots QUI ONT une vidéo, et ils
-- seront longtemps une minorité.
create index if not exists spots_video_idx
  on public.spots (tg_file_id) where tg_file_id is not null;

-- Ce que la carte demande. Elle ne doit jamais voir le token du bot : elle
-- demande une URL, le résolveur la lui donne. C'est aussi ce qui permet de
-- changer d'hébergeur de média sans toucher au front.
create or replace function public.spot_video(p_spot uuid)
returns table (file_id text, kind text, url text, fresh boolean, secs smallint)
language sql stable security definer set search_path = public as $$
  select s.tg_file_id, s.video_kind, s.video_url,
         (s.video_url is not null and s.video_url_at is not null
          and s.video_url_at > now() - interval '55 minutes') as fresh,
         s.video_secs
  from public.spots s
  where s.id = p_spot and s.active and s.tg_file_id is not null;
$$;

-- Le résolveur repose le cache. Réservé au service : un client qui pourrait
-- écrire une URL de média pourrait faire pointer un spot n'importe où.
create or replace function public.spot_video_cache(p_spot uuid, p_url text)
returns void
language sql volatile security definer set search_path = public as $$
  update public.spots set video_url = p_url, video_url_at = now() where id = p_spot;
$$;

-- `create or replace` rétablit le GRANT à PUBLIC : tout `revoke` suit le
-- dernier `create`, jamais l'inverse.
revoke all on function public.spot_video(uuid) from public;
grant execute on function public.spot_video(uuid) to anon, authenticated, service_role;
revoke all on function public.spot_video_cache(uuid, text) from public, anon, authenticated;
grant execute on function public.spot_video_cache(uuid, text) to service_role;
