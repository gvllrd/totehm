-- LOT G (19/10/2026) : l'élément du Totehm se DÉPLACE sur le média.
-- Wah : « l'utilisateur doit pouvoir déplacer, sur sa photo, son image ou sa vidéo, l'élément du
-- Totehm sous la forme polaroid. Valable pour le mode Shorts de la vue de droite (les spots) ET
-- la vue de gauche (tous les médias du Totehm). »
--
-- ⚠️ UNE SEULE TABLE POUR LES TROIS SOURCES. Le feed mélange trois origines (un fichier
-- `element_media`, la photo d'un spot, l'image libre d'une VISION) ; leur donner chacune sa colonne
-- ferait trois mécanismes à tenir d'accord. La clé est celle que le feed utilise déjà pour se
-- repérer (`em:<id>` · `sp:<id>` · `vi:<id>`) : une chaîne, côté page comme côté base.
--
-- ⚠️ JAMAIS DANS `steps` NI DANS UN SNAPSHOT : `cloudSave()` réécrit le jsonb entier, et le snapshot
-- d'un spot est FIGÉ. Une position posée là se ferait écraser en silence (la leçon de `totehm_visibility`).
--
-- Additive : une table neuve, deux fonctions neuves, aucun `drop`, aucun prix.

create table if not exists public.feed_badges(
  user_id    uuid not null references auth.users(id) on delete cascade,
  ref        text not null,
  x          real not null default 50,
  y          real not null default 72,
  updated_at timestamptz not null default now(),
  primary key (user_id, ref),
  constraint feed_badges_ref_check check (char_length(ref) between 3 and 64),
  constraint feed_badges_x_check   check (x >= 0 and x <= 100),
  constraint feed_badges_y_check   check (y >= 0 and y <= 100)
);
-- RLS SANS POLITIQUE : la table se lit et s'écrit par fonction, jamais en REST.
alter table public.feed_badges enable row level security;

-- ── L'ÉCRIVAIN : le propriétaire seul, par sa session, bornes vérifiées EN BASE ──────────────────
create or replace function public.feed_badge_set(p_ref text, p_x real, p_y real)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  r text := nullif(btrim(coalesce(p_ref,'')),'');
  x real := greatest(0, least(100, coalesce(p_x, 50)));
  y real := greatest(0, least(100, coalesce(p_y, 72)));
begin
  if u is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if r is null or char_length(r) < 3 or char_length(r) > 64 then
    return jsonb_build_object('ok', false, 'why', 'ref');
  end if;
  insert into public.feed_badges(user_id, ref, x, y)
  values (u, r, x, y)
  on conflict (user_id, ref) do update
    set x = excluded.x, y = excluded.y, updated_at = now();
  return jsonb_build_object('ok', true, 'ref', r, 'x', x, 'y', y);
end $$;

-- ── MES POSITIONS EN UNE LECTURE : la page ne demande jamais une position à la fois ─────────────
create or replace function public.my_feed_badges()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  o jsonb;
begin
  if u is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select coalesce(jsonb_object_agg(ref, jsonb_build_array(x, y)), '{}'::jsonb)
    into o
    from public.feed_badges
   where user_id = u;
  return jsonb_build_object('ok', true, 'pos', o);
end $$;

-- ── LES DROITS, APRÈS LE DERNIER `create` (un `create or replace` rend le GRANT à PUBLIC) ───────
revoke all on function public.feed_badge_set(text, real, real) from public, anon;
revoke all on function public.my_feed_badges() from public, anon;
grant execute on function public.feed_badge_set(text, real, real) to authenticated;
grant execute on function public.my_feed_badges() to authenticated;
