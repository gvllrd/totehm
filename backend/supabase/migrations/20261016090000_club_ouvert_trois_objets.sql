-- ══ LOT E · 16/10/2026 — LE CLUB EST LE PUBLIC, ET IL S'OUVRE À TROIS OBJETS ════════════════════
-- Wah : « y a pas de mode PUBLIC, le figher club c'est du public avec une inscription Totehm avec au
-- moins une repulsion, une habit et un objectif ».
--
-- Deux changements, tous les deux dans la base (la page ne recompose jamais une règle d'accès) :
--
-- 1 · L'ADHÉSION DESCEND DE CINQ VUES À TROIS OBJETS. `_figher().member` valait
--     `totehm_complete().complete` (une Box non vide dans CHACUNE des cinq vues). Elle vaut maintenant
--     habit ET objectif ET répulsion : les trois objets qui font une stratégie (ce que je fais, pourquoi,
--     ce qui me fait dérailler). Visions et MY STORY restent dans la réponse — ils ne décident plus.
--     `complete` garde son sens (les cinq vues) : d'autres lecteurs s'en servent pour dire ce qui manque.
--
-- 2 · IL N'Y A PLUS DE NIVEAU PUBLIC. Trois niveaux : PRIVATE · FIGHER CLUB · MY SUBSCRIBERS.
--     ⚠️ La contrainte `check` n'est PAS touchée (la changer demanderait un `drop`, impossible depuis le
--     cloud) : `public` reste une valeur LÉGALE en base, elle n'est simplement plus jamais produite ni
--     jamais plus permissive que `figher`. Trois verrous, dans cet ordre :
--       • les deux triggers de synchronisation normalisent `public` → `figher` — ils sont le SEUL chemin
--         vers les deux colonnes `audience`, donc tout écrivain est couvert, y compris une page en cache
--         qui n'écrirait encore que `visibility` ;
--       • `_audience_ok` / `_audience_listed` / `_point_ok` traitent `public` comme `figher` (ceinture :
--         une écriture `service_role` qui contournerait un trigger ne rouvrirait rien) ;
--       • les lignes existantes passent en `figher` (`update … where audience = 'public'`).
--     Conséquence assumée, dite à Wah : un visiteur SANS compte ne liste plus aucun space ni spot. Ce qui
--     reste ouvert à tous : les NOMS et les dos de papier (`totehm_galaxy`, `totehm_search`) et la page de
--     vente `/@nom` — de quoi acquérir, zéro contenu.
--     La projection historique à 0,1° (`spots.active/is_public`, lue par une politique « tout connecté »)
--     ne s'allume donc plus pour personne : le point d'un spot ne passe plus que par `_point_ok`.
--
-- Rien de destructif : aucun `drop`, aucun `update` sans `where`, aucun prix.

-- ── 1 · l'adhésion : une habit, un objectif, une répulsion ────────────────────────────────────────
create or replace function public._figher(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $f$
declare
  v_pass jsonb; v_email text; v_num int; v_thp boolean; v_st text; v_comp boolean := false;
  v_h boolean; v_o boolean; v_r boolean;
begin
  if p_user is null then
    return jsonb_build_object('signed_in', false, 'complete', false, 'remplies', 0, 'habit', false,
      'thp', false, 'number', null, 'annual', false, 'trial', false, 'comp', false, 'member', false);
  end if;
  v_pass := public.totehm_complete(p_user);
  v_h := coalesce((v_pass->>'habits')::boolean, false);
  v_o := coalesce((v_pass->>'objectives')::boolean, false);
  v_r := coalesce((v_pass->>'repulsions')::boolean, false);
  select lower(u.email) into v_email from auth.users u where u.id = p_user;
  v_num := public._thp_number(p_user);
  v_thp := v_num is not null or (v_email is not null and exists (
    select 1 from public.stoner_access s where lower(s.email) = v_email));
  if v_email is not null then
    select exists(select 1 from public.figher_comps c where c.email = v_email
                   and (c.expires_at is null or c.expires_at > now())) into v_comp;
  end if;
  select s.status into v_st from public.subscriptions s where s.user_id = p_user;
  return jsonb_build_object(
    'signed_in', true, 'complete', coalesce((v_pass->>'complete')::boolean, false),
    'remplies', coalesce((v_pass->>'remplies')::int, 0),
    'habit', v_h,
    'views', jsonb_build_object('habits', v_h, 'objectives', v_o, 'repulsions', v_r,
      'wisdom', coalesce((v_pass->>'wisdom')::boolean, false),
      'visions', coalesce((v_pass->>'visions')::boolean, false)),
    -- Ce qui MANQUE pour entrer, pour que la page le dise sans recomposer la règle.
    'needs', (case when v_h then '[]'::jsonb else '["habit"]'::jsonb end)
          || (case when v_o then '[]'::jsonb else '["objective"]'::jsonb end)
          || (case when v_r then '[]'::jsonb else '["repulsion"]'::jsonb end),
    -- Métadonnées conservées pour les consommateurs anciens : aucune de ces clés n'est une
    -- condition Club ; le numéro reste celui du THP possédé.
    'thp', v_thp, 'number', v_num, 'annual', coalesce(v_st in ('active','trialing'), false),
    'trial', coalesce(v_st = 'trialing', false), 'comp', v_comp,
    -- ⚠️ LA RÈGLE, ICI ET NULLE PART AILLEURS : trois objets.
    'member', v_h and v_o and v_r);
end $f$;

-- ── 2 · plus de PUBLIC : les deux triggers sont le chemin obligé vers `audience` ───────────────────
create or replace function public._spot_audience_sync()
returns trigger language plpgsql set search_path to '' as $f$
begin
  if tg_op = 'INSERT' then
    if new.audience is null then new.audience := case when new.visibility = 'private' then 'private' else 'figher' end; end if;
  elsif new.audience is distinct from old.audience then
    null;
  elsif new.visibility is distinct from old.visibility then
    new.audience := case when new.visibility = 'private' then 'private'
                         when old.audience = 'private' then 'figher' else old.audience end;
  end if;
  -- 16/10 : le niveau le plus ouvert est FIGHER CLUB. `public` reste légal pour la contrainte, jamais produit.
  if new.audience = 'public' then new.audience := 'figher'; end if;
  new.visibility := case when new.audience = 'private' then 'private' else 'shared' end;
  return new;
end $f$;

create or replace function public._totehm_audience_sync()
returns trigger language plpgsql set search_path to '' as $f$
begin
  if tg_op = 'INSERT' then
    if new.audience is null then new.audience := case when coalesce(new.totehm_visibility, 'private') = 'private' then 'private' else 'subscribers' end; end if;
  elsif new.audience is distinct from old.audience then
    null;
  elsif new.totehm_visibility is distinct from old.totehm_visibility then
    new.audience := case when new.totehm_visibility = 'private' then 'private'
                         when old.audience = 'private' then 'subscribers' else old.audience end;
  end if;
  if new.audience = 'public' then new.audience := 'figher'; end if;
  -- `members` = le nom que la contrainte accepte pour « partagé » (voir backend/CLAUDE.md, 01/10).
  new.totehm_visibility := case when new.audience = 'private' then 'private' else public._vis_shared() end;
  return new;
end $f$;

-- La ceinture : même si une ligne `public` survivait, elle ne serait pas plus ouverte qu'un FIGHER CLUB.
create or replace function public._audience_ok(p_owner uuid, p_audience text, p_viewer uuid, p_fig boolean)
returns boolean language sql stable security definer set search_path to '' as $f$
  select (p_viewer is not null and p_owner = p_viewer)
      or (p_audience in ('figher','public') and coalesce(p_fig, false))
      or (p_audience in ('figher','public','subscribers') and public._subscriber_of(p_owner, p_viewer));
$f$;
create or replace function public._audience_listed(p_owner uuid, p_audience text, p_viewer uuid, p_fig boolean)
returns boolean language sql stable security definer set search_path to '' as $f$
  select (p_viewer is not null and p_owner = p_viewer)
      or (p_audience in ('figher','public') and coalesce(p_fig, false));
$f$;
create or replace function public._point_ok(p_owner uuid, p_audience text, p_shield text, p_viewer uuid, p_fig boolean)
returns boolean language sql stable security definer set search_path to '' as $f$
  select p_viewer is not null
     and (p_owner = p_viewer
          or (p_shield = 'on' and p_audience <> 'private'
              and ((coalesce(p_fig, false) and p_audience in ('public','figher'))
                   or public._subscriber_of(p_owner, p_viewer))));
$f$;

-- L'écrivain d'audience d'un space/spot : il normalise AVANT d'écrire la projection historique,
-- sinon `spots.is_public` dirait « public » là où `spot_plans.audience` dit « figher ».
create or replace function public._audience_put(p_spot uuid, p_audience text)
returns void language plpgsql security definer set search_path to '' as $f$
declare a text := case when p_audience = 'public' then 'figher' else p_audience end;
begin
  update public.spot_plans set audience = a where spot_id = p_spot and user_id = auth.uid();
  -- 16/10 : plus aucun niveau n'allume la projection à 0,1° (politique « tout connecté »).
  -- Le lieu d'un spot ne se lit plus que par `_point_ok` / `_spot_view`.
  update public.spots set active = false, is_public = false
   where id = p_spot and user_id = auth.uid();
end $f$;

-- Les écrivains rendent la VRAIE audience : sans ça la page afficherait « public » là où la base,
-- par le trigger, a écrit « figher ». Même normalisation, un seul sens.
create or replace function public.visibility_set(p_visibility text)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_n int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  -- `members` (l'ancien nom) = mes abonnés ; `public` (16/10) = le FIGHER CLUB.
  if p_visibility = 'members' then p_visibility := 'subscribers'; end if;
  if p_visibility = 'public'  then p_visibility := 'figher'; end if;
  if coalesce(p_visibility, '') not in ('private','figher','subscribers') then return jsonb_build_object('ok', false, 'why', 'value'); end if;
  update public.totehms set audience = p_visibility where user_id = v_uid;
  if not found then return jsonb_build_object('ok', false, 'why', 'no_totehm'); end if;
  select count(*) into v_n from public.creator_subscriptions
   where creator_id = v_uid and status in ('active','trialing');
  return jsonb_build_object('ok', true, 'visibility', p_visibility, 'subscribers', v_n,
                            'open', public._offer_open(v_uid));
end $f$;

create or replace function public.spot_audience_set(p_spot uuid, p_audience text)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare v_me uuid := auth.uid(); v_owner uuid; a text := case when p_audience = 'public' then 'figher' else p_audience end;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if coalesce(a, '') not in ('private','figher','subscribers') then return jsonb_build_object('ok', false, 'why', 'audience'); end if;
  select p.user_id into v_owner from public.spot_plans p where p.spot_id = p_spot and p.status = 'published' for update;
  if v_owner is null or v_owner <> v_me then return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  perform public._audience_put(p_spot, a);
  return jsonb_build_object('ok', true, 'audience', a);
end $f$;

create or replace function public.space_post_audience(p_habit text, p_video text, p_lat double precision, p_lng double precision,
  p_city text, p_comment text, p_audience text default 'figher')
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare r jsonb; a text := coalesce(nullif(btrim(p_audience), ''), 'figher');
begin
  if a = 'public' then a := 'figher'; end if;
  if a not in ('private','figher','subscribers') then return jsonb_build_object('ok', false, 'why', 'audience'); end if;
  r := public.space_post(p_habit, p_video, p_lat, p_lng, p_city, p_comment);
  if coalesce((r->>'ok')::boolean, false) then perform public._audience_put((r->>'id')::uuid, a); r := r || jsonb_build_object('audience', a); end if;
  return r;
end $f$;

create or replace function public.spot_create_audience(p_habit text, p_duration_min integer, p_video text, p_lat double precision,
  p_lng double precision, p_city text default null, p_comment text default null, p_mode text default null,
  p_location text default null, p_audience text default 'figher')
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare r jsonb; a text := coalesce(nullif(btrim(p_audience), ''), 'figher');
begin
  if a = 'public' then a := 'figher'; end if;
  if a not in ('private','figher','subscribers') then return jsonb_build_object('ok', false, 'why', 'audience'); end if;
  r := public.spot_create(p_habit, 'shared', p_duration_min, p_video, p_lat, p_lng, p_city, p_comment, p_mode, p_location);
  if coalesce((r->>'ok')::boolean, false) then perform public._audience_put((r->>'id')::uuid, a); r := r || jsonb_build_object('audience', a); end if;
  return r;
end $f$;

create or replace function public.spot_schedule_audience(p_habit text, p_starts_at timestamp with time zone, p_duration_min integer,
  p_place text, p_lat double precision, p_lng double precision, p_city text default null, p_comment text default null,
  p_mode text default null, p_location text default null, p_audience text default 'figher')
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare r jsonb; a text := coalesce(nullif(btrim(p_audience), ''), 'figher');
begin
  if a = 'public' then a := 'figher'; end if;
  if a not in ('private','figher','subscribers') then return jsonb_build_object('ok', false, 'why', 'audience'); end if;
  r := public.spot_schedule(p_habit, 'shared', p_starts_at, p_duration_min, p_place, p_lat, p_lng, p_city, p_comment, p_mode, p_location);
  if coalesce((r->>'ok')::boolean, false) then perform public._audience_put((r->>'id')::uuid, a); r := r || jsonb_build_object('audience', a); end if;
  return r;
end $f$;

-- ── 3 · les lignes existantes ─────────────────────────────────────────────────────────────────────
update public.spot_plans set audience = 'figher' where audience = 'public';
update public.totehms    set audience = 'figher' where audience = 'public';
update public.spots      set active = false, is_public = false where is_public = true;

-- ── 4 · les droits, APRÈS le dernier `create or replace` ──────────────────────────────────────────
revoke all on function public._figher(uuid) from public, anon, authenticated;
grant execute on function public._figher(uuid) to service_role;
revoke all on function public._audience_ok(uuid,text,uuid,boolean) from public, anon, authenticated;
grant execute on function public._audience_ok(uuid,text,uuid,boolean) to service_role;
revoke all on function public._audience_listed(uuid,text,uuid,boolean) from public, anon, authenticated;
grant execute on function public._audience_listed(uuid,text,uuid,boolean) to service_role;
revoke all on function public._point_ok(uuid,text,text,uuid,boolean) from public, anon, authenticated;
grant execute on function public._point_ok(uuid,text,text,uuid,boolean) to service_role;
revoke all on function public._audience_put(uuid,text) from public, anon, authenticated;
grant execute on function public._audience_put(uuid,text) to service_role;
revoke all on function public._spot_audience_sync() from public, anon, authenticated;
revoke all on function public._totehm_audience_sync() from public, anon, authenticated;
revoke all on function public.visibility_set(text) from public, anon;
grant execute on function public.visibility_set(text) to authenticated, service_role;
revoke all on function public.spot_audience_set(uuid,text) from public, anon;
grant execute on function public.spot_audience_set(uuid,text) to authenticated, service_role;
revoke all on function public.space_post_audience(text,text,double precision,double precision,text,text,text) from public, anon;
grant execute on function public.space_post_audience(text,text,double precision,double precision,text,text,text) to authenticated, service_role;
revoke all on function public.spot_create_audience(text,integer,text,double precision,double precision,text,text,text,text,text) from public, anon;
grant execute on function public.spot_create_audience(text,integer,text,double precision,double precision,text,text,text,text,text) to authenticated, service_role;
revoke all on function public.spot_schedule_audience(text,timestamp with time zone,integer,text,double precision,double precision,text,text,text,text,text) from public, anon;
grant execute on function public.spot_schedule_audience(text,timestamp with time zone,integer,text,double precision,double precision,text,text,text,text,text) to authenticated, service_role;
