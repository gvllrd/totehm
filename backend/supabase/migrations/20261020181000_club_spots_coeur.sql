-- LOT K (20/10/2026 sexies) — POUR CLAUDE CODE (terminal) : `club_spots` délègue à `_club_spots_core`.
-- Un `create or replace` sur une fonction EXISTANTE ne passe pas depuis le cloud (mesuré le 18/10). Tant que ce
-- fichier n'est pas appliqué, `club_spots` et `_club_spots_core` portent DEUX copies du même corps (voir
-- `20261020180000_ecosysteme_membre.sql`) ; après, il n'y en a plus qu'une. Même signature, mêmes droits.
create or replace function public.club_spots(p_period text default 'now', p_filters jsonb default '{}'::jsonb,
  p_lat double precision default null, p_lng double precision default null, p_limit integer default 40,
  p_offset integer default 0, p_as_of timestamp with time zone default null)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select public._club_spots_core(null, p_period, p_filters, p_lat, p_lng, p_limit, p_offset, p_as_of);
$$;

-- Les droits APRÈS le dernier `create` (un `create or replace` rend l'exécution à PUBLIC).
revoke all on function public.club_spots(text, jsonb, double precision, double precision, integer, integer, timestamp with time zone) from public;
grant execute on function public.club_spots(text, jsonb, double precision, double precision, integer, integer, timestamp with time zone) to anon, authenticated, service_role;
