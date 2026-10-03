-- SPACE · 03/10/2026 (ter, suite) — la photo a SA colonne.
-- `spot_plans_video_check` n'accepte que webm|mp4|mov et le relâcher exigerait
-- un `drop constraint` (interdit depuis le cloud). Une colonne `photo` typée par
-- sa propre contrainte est d'ailleurs plus nette : le média se lit par colonne.
-- `spot_create` (même signature) range un `.jpg` dans `photo` ; `spot_video_attach`
-- aussi ; `_clip_readable` ouvre la photo d'un space lisible ; `_spot_view` la rend.
alter table public.spot_plans add column if not exists photo text
  constraint spot_plans_photo_check check (photo is null or photo ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$');

create or replace function public.spot_create(p_habit text, p_visibility text, p_duration_min integer, p_video text, p_lat double precision, p_lng double precision, p_city text DEFAULT NULL::text, p_comment text DEFAULT NULL::text, p_mode text DEFAULT NULL::text, p_location text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules(); v_steps jsonb; v_s jsonb;
  v_is text[]; v_objs jsonb; v_reps jsonb; v_id uuid; v_mode text; v_loc text; v_city text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;

  select coalesce(t.steps,'[]'::jsonb) into v_steps from public.totehms t where t.user_id = v_uid limit 1;
  select s into v_s from jsonb_array_elements(coalesce(v_steps,'[]'::jsonb)) s
   where s->>'t' = p_habit and btrim(coalesce(s->>'t','')) <> '' limit 1;
  if v_s is null then return jsonb_build_object('ok', false, 'why', 'habit'); end if;
  v_is := public._step_intentions(v_s);

  if coalesce(p_visibility, '') not in ('private','shared') then return jsonb_build_object('ok', false, 'why', 'visibility'); end if;
  if p_visibility = 'shared' then
    if coalesce(p_location, '') not in ('on','off') then return jsonb_build_object('ok', false, 'why', 'location'); end if;
    if p_location = 'on' and coalesce(p_mode, '') not in ('social','silent') then return jsonb_build_object('ok', false, 'why', 'mode'); end if;
    v_mode := case when p_location = 'on' then p_mode end; v_loc := p_location;
  end if;
  if p_duration_min is null or p_duration_min < (v_r->>'duration_min')::int
     or p_duration_min > (v_r->>'duration_max')::int then
    return jsonb_build_object('ok', false, 'why', 'duration');
  end if;
  if not coalesce(public._space_video_owned(v_uid, p_video),false) then return jsonb_build_object('ok', false, 'why', 'video'); end if;
  if p_lat is null or p_lng is null or not (p_lat between -90 and 90) or not (p_lng between -180 and 180) then
    return jsonb_build_object('ok', false, 'why', 'position');
  end if;
  if (select count(*) from public.spot_plans where user_id = v_uid
        and created_at > now() - interval '24 hours') >= (v_r->>'max_day')::int then
    return jsonb_build_object('ok', false, 'why', 'too_many');
  end if;
  v_city := nullif(left(btrim(coalesce(p_city, '')), 80), '');

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
          case when p_video like 'bunny:%' or p_video like '%.jpg' then null else p_video end,
          case when p_video like '%.jpg' then p_video end,
          v_city, 1, 'club', 'manual', 'experience');

  if p_video like 'bunny:%' then update public.spot_plans set video_id = substring(p_video from 7)::uuid where spot_id = v_id; end if;

  return jsonb_build_object('ok', true, 'id', v_id,
                            'ends_at', now() + make_interval(mins => p_duration_min));
end $function$;

create or replace function public.spot_video_attach(p_spot uuid, p_video text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid(); v_plan public.spot_plans;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if p_spot is null or btrim(coalesce(p_video, '')) = '' then return jsonb_build_object('ok', false, 'why', 'video'); end if;
  select * into v_plan from public.spot_plans where spot_id = p_spot and user_id = v_uid for update;
  if not found then return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  if p_video like 'bunny:%' and v_plan.video_id is not null and 'bunny:' || v_plan.video_id::text = p_video
     or p_video like '%.jpg' and v_plan.photo = p_video
     or p_video not like 'bunny:%' and v_plan.video = p_video then
    return jsonb_build_object('ok', true);
  end if;
  if not coalesce(public._space_video_owned(v_uid, p_video), false) then
    return jsonb_build_object('ok', false, 'why', 'video');
  end if;
  begin
    if p_video like 'bunny:%' then
      update public.spot_plans set video_id = substring(p_video from 7)::uuid, video = null, photo = null where spot_id = p_spot;
    elsif p_video like '%.jpg' then
      update public.spot_plans set photo = p_video, video = null, video_id = null where spot_id = p_spot;
    else
      update public.spot_plans set video = p_video, video_id = null, photo = null where spot_id = p_spot;
    end if;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'why', 'video');
  end;
  return jsonb_build_object('ok', true);
end $function$;

create or replace function public._clip_readable(p_name text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select (auth.uid() is not null and split_part(p_name, '/', 1) = auth.uid()::text)
      or exists (select 1 from public.spot_plans p
                  where (p.video = p_name or p.photo = p_name) and p.status = 'published'
                    and (p.visibility = 'shared' or p.user_id = auth.uid()));
$function$;

create or replace function public._spot_view(p spot_plans, p_viewer uuid)
returns jsonb
language sql
stable security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'id', p.spot_id,
    'habit', p.habit,
    'intentions', to_jsonb(p.intentions),
    'freq', p.snapshot->>'freq',
    'visibility', p.visibility,
    'mode', case when p.visibility = 'shared' and p.shield='on' then p.mode end,
    'location', case when p.visibility = 'shared' then p.shield end,
    'city', p.city,
    'comment', p.comment,
    'starts_at', p.starts_at,
    'ends_at', p.starts_at + make_interval(mins => p.duration_min),
    'duration_min', p.duration_min,
    'state', case when p.starts_at > now() then 'will' when now() < p.starts_at + make_interval(mins => p.duration_min) then 'am' else 'was' end,
    'creator', (select pr.pseudo from public.profiles pr where pr.id = p.user_id),
    'mine', p.user_id = p_viewer,
    'video', p.video,
    'photo', p.photo,
    'clip', case when p.video_id is not null then (select jsonb_build_object('id',v.id,'status',v.status) from public.videos v where v.id=p.video_id) end,
    'context', case when p.user_id = p_viewer then p.snapshot - 'at' end,
    'show_why', case when p.user_id = p_viewer then p.show_why end,
    'why', case when p.visibility = 'shared' and p.show_why then jsonb_build_object(
        'objectives', (select coalesce(jsonb_agg(jsonb_build_object('text', o->>'text')), '[]'::jsonb)
                         from jsonb_array_elements(coalesce(p.snapshot->'objectives', '[]'::jsonb)) o where btrim(coalesce(o->>'text','')) <> ''),
        'repulsions', (select coalesce(jsonb_agg(jsonb_build_object('text', r->>'text')), '[]'::jsonb)
                         from jsonb_array_elements(coalesce(p.snapshot->'repulsions', '[]'::jsonb)) r where btrim(coalesce(r->>'text','')) <> '')) end,
    'exact', case when public._spot_exact(p.user_id, p_viewer, p.visibility, p.shield)
                  then jsonb_build_object('lat', p.lat, 'lng', p.lng, 'place', p.place) end);
$function$;

revoke all on function public.spot_create(text,text,integer,text,double precision,double precision,text,text,text,text) from public, anon;
grant execute on function public.spot_create(text,text,integer,text,double precision,double precision,text,text,text,text) to authenticated, service_role;
revoke all on function public.spot_video_attach(uuid, text) from public, anon;
grant execute on function public.spot_video_attach(uuid, text) to authenticated, service_role;
revoke all on function public._clip_readable(text) from public;
grant execute on function public._clip_readable(text) to anon, authenticated, service_role;
revoke all on function public._spot_view(spot_plans, uuid) from public, anon, authenticated;
grant execute on function public._spot_view(spot_plans, uuid) to service_role;
