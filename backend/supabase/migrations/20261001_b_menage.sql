-- ════════════════════════════════════════════════════════════════════
-- 20261001_b · LE MÉNAGE DU LOT « UN SPOT, DEUX RÉGLAGES »
-- ════════════════════════════════════════════════════════════════════
-- DESTRUCTIF — appliqué par CLAUDE CODE depuis le terminal de Wah (MCP
-- `apply_migration`, nom `20261001_b_menage`) : depuis la session cloud,
-- un `drop` attend une approbation qui n'arrive jamais (mesuré le 01/10).
-- À appliquer APRÈS `20261001_un_spot_deux_reglages.sql` (déjà en base).
-- Rien de vivant ne dépend de ce qui part : les pages du 01/10 n'appellent
-- plus aucune de ces fonctions (elles sont révoquées depuis le 01/10), et
-- `_vis_shared()` écrit la bonne valeur avant ET après la bascule.
-- Contrôle : `tests/sql/spots_selftest.sql` → « FAIL={} ».
-- ════════════════════════════════════════════════════════════════════

-- 1 · « VISIBLE TO MY SUBSCRIBERS » prend son vrai nom en base.
alter table public.totehms drop constraint if exists totehms_visibility_check;
update public.totehms set totehm_visibility = 'subscribers' where totehm_visibility = 'members';
alter table public.totehms add constraint totehms_visibility_check
  check (totehm_visibility in ('private', 'subscribers'));

-- 2 · Une seule politique de lecture du Totehm d'un autre (`_shared_with_me`).
drop policy if exists "subscribers read the creator totehm" on public.totehms;

-- 3 · L'ancien Espace, l'ancienne recherche, l'ancienne console.
drop function if exists public.spot_publish(text,text[],uuid[],bigint[],boolean,timestamptz,integer,text,double precision,double precision,text,integer,text,text,text,text,text,text,text);
drop function if exists public.moment_publish(text, text[], text, text, double precision, double precision, text, text, text);
drop function if exists public.spot_video_set(uuid, text);
drop function if exists public.spots_radar(double precision,double precision,integer,text,text,boolean,integer,text,text);
drop function if exists public.spots_past(double precision, double precision, integer, text, integer);
drop function if exists public.spots_globe(text,text,text,text);
drop function if exists public.moments_feed(double precision, double precision, integer, integer);
drop function if exists public.my_space();
drop function if exists public.spot_apply(uuid, text);
drop function if exists public.spot_decide(bigint, boolean);
drop function if exists public.spot_withdraw(uuid);
drop function if exists public.spot_cancel(uuid);
drop function if exists public._exact_ok(uuid, uuid, text, boolean);
drop function if exists public._spot_compat(uuid, uuid);
drop function if exists public._spot_expire(uuid);
drop function if exists public._spots_subscriber(uuid, uuid);
drop function if exists public.demo_seed();
drop function if exists public._demo_seed_world();
drop function if exists public.demo_purge();
drop function if exists public.search_totehms(text, integer);
drop function if exists public.club_console();
drop function if exists public.creator_card(text);
