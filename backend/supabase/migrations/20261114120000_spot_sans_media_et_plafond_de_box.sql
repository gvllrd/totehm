-- LOT · 14/11/2026 — UN SPOT PEUT NAÎTRE SANS MÉDIA, ET SA BOX RESTE SON PLAFOND
--
-- Wah : « il était obligatoire de poster une photo, une vidéo ou d'importer un média pour publier un spot
-- alors qu'un spot peut être sans media. Dans le questionnaire intelligent il faut rendre cela facultatif.
-- C'est subtilement différent des médias où là évidemment on doit ajouter un média. »
--
-- 1 · `spot_create` (I AM HERE) n'exige plus `p_video`. Vide ou nul = aucun média ; fourni = la MÊME
--     vérification qu'avant (`_space_video_owned` : la vidéo/photo est la mienne et libre). `spot_schedule`
--     (I WILL BE HERE) ne l'exigeait déjà pas. Un refus `why:'video'` ne tombe donc plus que sur un média
--     qui n'est pas à moi.
--
-- 2 · LE PLAFOND DE LA BOX, AU SERVEUR (Wah) : « Box Private → Spot forcément Private ; Box Visible to
--     subscribers → Spot Private / My subscribers / Figher club, au choix, sans changer la box. »
--     Le niveau d'un spot ne peut donc jamais dépasser celui de sa Habit : `_spot_plafond_ok`. Un refus
--     dit `why:'box_private'`, et c'est ce mot qui permet à la page de DEMANDER confirmation avant de
--     passer la Habit en « visible to subscribers » (jamais l'inverse : un spot remis en private ne fait
--     JAMAIS redescendre sa box).
--
-- Additif : aucun `drop`, aucune table, aucune colonne, aucune ligne touchée. Grants après le dernier
-- `create or replace`.

-- ── 1 · le plafond : le niveau d'un spot vaut-il pour la box de sa Habit ? ────────────────────────────
create or replace function public._spot_plafond_ok(p_owner uuid, p_habit text, p_audience text)
returns boolean language sql stable security definer set search_path to '' as $f$
  select case
    when p_owner is null then false
    when coalesce(btrim(p_audience), 'private') = 'private' then true
    -- une box ouverte à mes abonnés porte les trois niveaux de spot ; une box privée n'en porte qu'un
    else public._box_audience(p_owner, 'h', p_habit) <> 'private'
  end;
$f$;

-- ── 2 · I AM HERE : le média devient facultatif ───────────────────────────────────────────────────────
create or replace function public.spot_create(p_habit text, p_visibility text, p_duration_min integer, p_video text, p_lat double precision, p_lng double precision, p_city text DEFAULT NULL::text, p_comment text DEFAULT NULL::text, p_mode text DEFAULT NULL::text, p_location text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules(); v_steps jsonb; v_s jsonb;
  v_is text[]; v_objs jsonb; v_reps jsonb; v_id uuid; v_mode text; v_loc text; v_city text;
  v_med text := nullif(btrim(coalesce(p_video, '')), '');
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;

  select coalesce(t.steps,'[]'::jsonb) into v_steps from public.totehms t where t.user_id = v_uid limit 1;
  select s into v_s from jsonb_array_elements(coalesce(v_steps,'[]'::jsonb)) s
   where s->>'t' = p_habit and btrim(coalesce(s->>'t','')) <> '' limit 1;
  if v_s is null then return jsonb_build_object('ok', false, 'why', 'habit'); end if;
  v_is := public._step_intentions(v_s);

  if coalesce(p_visibility, '') <> 'shared' then return jsonb_build_object('ok', false, 'why', 'visibility'); end if;
  if p_visibility = 'shared' then
    if coalesce(p_location, '') not in ('on','off') then return jsonb_build_object('ok', false, 'why', 'location'); end if;
    if p_location = 'on' and coalesce(p_mode, '') not in ('social','silent') then return jsonb_build_object('ok', false, 'why', 'mode'); end if;
    v_mode := case when p_location = 'on' then p_mode end; v_loc := p_location;
  end if;
  if p_duration_min is null or p_duration_min < (v_r->>'duration_min')::int
     or p_duration_min > (v_r->>'duration_max')::int then
    return jsonb_build_object('ok', false, 'why', 'duration');
  end if;
  -- 14/11 : le média est FACULTATIF. S'il y en a un, il doit être à moi et libre, comme avant.
  if v_med is not null and not coalesce(public._space_video_owned(v_uid, v_med), false) then
    return jsonb_build_object('ok', false, 'why', 'video');
  end if;
  if p_lat is null or p_lng is null or not (p_lat between -90 and 90) or not (p_lng between -180 and 180) then
    return jsonb_build_object('ok', false, 'why', 'position');
  end if;
  if (select count(*) from public.spot_plans where user_id = v_uid
        and created_at > now() - interval '24 hours') >= (v_r->>'max_day')::int then
    return jsonb_build_object('ok', false, 'why', 'too_many');
  end if;
  v_city := nullif(left(btrim(coalesce(p_city, '')), 80), '');
  if p_location='off' and v_city is null then return jsonb_build_object('ok', false, 'why', 'city'); end if;

  select coalesce(jsonb_agg(jsonb_build_object('text', o.text, 'is', to_jsonb(o."is"))), '[]'::jsonb) into v_objs
    from public.objectives o
   where o.user_id = v_uid and btrim(o.text) <> ''
     and coalesce(o.status,'active') not in ('achieved','abandoned','converted')
     and (o.id::text = v_s->>'o' or exists (select 1 from public.objective_habits oh
           where oh.user_id = v_uid and oh.objective_id = o.id and oh.habit_text = p_habit));
  select coalesce(jsonb_agg(jsonb_build_object('text', r.repulsion)), '[]'::jsonb) into v_reps
    from public.repulsions r
   where r.user_id = v_uid and r.active and btrim(r.repulsion) <> ''
     and (r.habit_text = p_habit or exists (select 1 from public.repulsion_habits rh
           where rh.user_id = v_uid and rh.repulsion_id = r.id and rh.habit_text = p_habit));

  insert into public.spots(user_id, intention, activite, commentaire, lat, lng,
                           duration_min, expires_at, is_public, required_role, energy_mode, active)
  values (v_uid, coalesce(v_is[1], 'focus'), left(p_habit, 80), null,
          round(p_lat::numeric, 1)::double precision, round(p_lng::numeric, 1)::double precision,
          p_duration_min, now() + make_interval(mins => p_duration_min), false, 'public', v_mode,
          p_visibility = 'shared')
  returning id into v_id;

  insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at,
                                duration_min, mode, place, lat, lng, clat, clng, comment,
                                visibility, shield, video, photo, city, capacity, access, selection, kind)
  values (v_id, v_uid, p_habit, v_is,
          jsonb_build_object('habit', p_habit, 'intentions', to_jsonb(v_is),
                             'objectives', v_objs, 'repulsions', v_reps,
                             'freq', v_s->>'f', 'step', v_s, 'place', (select h.place from public.habit_spots h where h.user_id=v_uid and h.habit_text=p_habit), 'at', now()),
          now(), p_duration_min, coalesce(v_mode, 'silent'), coalesce(v_city, 'here'), p_lat, p_lng,
          round(p_lat::numeric, 1)::double precision, round(p_lng::numeric, 1)::double precision,
          nullif(left(btrim(coalesce(p_comment,'')), 400), ''),
          p_visibility, coalesce(v_loc, 'off'),
          case when v_med is null or v_med like 'bunny:%' or v_med like '%.jpg' then null else v_med end,
          case when v_med like '%.jpg' then v_med end,
          v_city, 1, 'club', 'manual', 'experience');

  if v_med like 'bunny:%' then update public.spot_plans set video_id = substring(v_med from 7)::uuid where spot_id = v_id; end if;

  return jsonb_build_object('ok', true, 'id', v_id,
                            'ends_at', now() + make_interval(mins => p_duration_min));
end $function$;

-- ── 3 · les trois portes d'audience refusent ce qui dépasse la box ────────────────────────────────────
create or replace function public.spot_create_audience(p_habit text, p_duration_min integer, p_video text, p_lat double precision,
  p_lng double precision, p_city text default null, p_comment text default null, p_mode text default null,
  p_location text default null, p_audience text default 'figher')
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare r jsonb; a text := coalesce(nullif(btrim(p_audience), ''), 'figher'); v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if a = 'public' then a := 'figher'; end if;
  if a not in ('private','figher','subscribers') then return jsonb_build_object('ok', false, 'why', 'audience'); end if;
  if not public._spot_plafond_ok(v_uid, p_habit, a) then return jsonb_build_object('ok', false, 'why', 'box_private'); end if;
  r := public.spot_create(p_habit, 'shared', p_duration_min, p_video, p_lat, p_lng, p_city, p_comment, p_mode, p_location);
  if coalesce((r->>'ok')::boolean, false) then perform public._audience_put((r->>'id')::uuid, a); r := r || jsonb_build_object('audience', a); end if;
  return r;
end $f$;

create or replace function public.spot_schedule_audience(p_habit text, p_starts_at timestamp with time zone, p_duration_min integer,
  p_place text, p_lat double precision, p_lng double precision, p_city text default null, p_comment text default null,
  p_mode text default null, p_location text default null, p_audience text default 'figher')
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare r jsonb; a text := coalesce(nullif(btrim(p_audience), ''), 'figher'); v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if a = 'public' then a := 'figher'; end if;
  if a not in ('private','figher','subscribers') then return jsonb_build_object('ok', false, 'why', 'audience'); end if;
  if not public._spot_plafond_ok(v_uid, p_habit, a) then return jsonb_build_object('ok', false, 'why', 'box_private'); end if;
  r := public.spot_schedule(p_habit, 'shared', p_starts_at, p_duration_min, p_place, p_lat, p_lng, p_city, p_comment, p_mode, p_location);
  if coalesce((r->>'ok')::boolean, false) then perform public._audience_put((r->>'id')::uuid, a); r := r || jsonb_build_object('audience', a); end if;
  return r;
end $f$;

-- Changer le niveau d'un spot existant : même plafond. Redescendre en `private` est toujours permis, et
-- ne touche JAMAIS la box (Wah : « ne jamais faire redescendre une box parce qu'un spot est mis en Private »).
create or replace function public.spot_audience_set(p_spot uuid, p_audience text)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare v_me uuid := auth.uid(); v_owner uuid; v_habit text;
        a text := case when p_audience = 'public' then 'figher' else p_audience end;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if coalesce(a, '') not in ('private','figher','subscribers') then return jsonb_build_object('ok', false, 'why', 'audience'); end if;
  select p.user_id, p.habit into v_owner, v_habit from public.spot_plans p
   where p.spot_id = p_spot and p.status = 'published' for update;
  if v_owner is null or v_owner <> v_me then return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  if not public._spot_plafond_ok(v_owner, v_habit, a) then
    return jsonb_build_object('ok', false, 'why', 'box_private', 'habit', v_habit);
  end if;
  perform public._audience_put(p_spot, a);
  return jsonb_build_object('ok', true, 'audience', a);
end $f$;

-- ── 4 · les droits, APRÈS le dernier `create or replace` ─────────────────────────────────────────────
revoke all on function public._spot_plafond_ok(uuid, text, text) from public, anon, authenticated;
grant execute on function public._spot_plafond_ok(uuid, text, text) to service_role;
revoke all on function public.spot_create(text,text,integer,text,double precision,double precision,text,text,text,text) from public, anon;
grant execute on function public.spot_create(text,text,integer,text,double precision,double precision,text,text,text,text) to authenticated, service_role;
revoke all on function public.spot_create_audience(text,integer,text,double precision,double precision,text,text,text,text,text) from public, anon;
grant execute on function public.spot_create_audience(text,integer,text,double precision,double precision,text,text,text,text,text) to authenticated, service_role;
revoke all on function public.spot_schedule_audience(text,timestamptz,integer,text,double precision,double precision,text,text,text,text,text) from public, anon;
grant execute on function public.spot_schedule_audience(text,timestamptz,integer,text,double precision,double precision,text,text,text,text,text) to authenticated, service_role;
revoke all on function public.spot_audience_set(uuid,text) from public, anon;
grant execute on function public.spot_audience_set(uuid,text) to authenticated, service_role;
