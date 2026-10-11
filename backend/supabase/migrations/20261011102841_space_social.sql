-- TOTEHM · SPACE devient un réseau social · 11/10/2026
-- why : Wah — « faire de totehm.space un Instagram / TikTok de l'habitude
--       stratégique » : échanger des vibes, un fil filtré par TOUT ce qui compose
--       une Habit Box (intentions, humeur, rythme, et surtout objectifs et
--       répulsions), un profil, une activité. Et un mode sans email sur COM
--       (compte invité Supabase) : il ne doit ni publier, ni « viber », ni
--       consommer les réponses offertes du Higher Self.
-- how : additif. Une table `space_vibes` (RLS sans politique ; une vibe se
--       retire par `active = false`, la ligne reste) ; des fonctions
--       neuves ; `_spot_view` gagne `vibes`/`vibed` ; `space_post` et
--       `sm_begin` refusent un invité (`why = 'email'`). Signatures inchangées.
-- what : space_vibes · _space_words · _spot_view · space_post · sm_begin ·
--        space_feed · space_vibe · space_profile · my_vibes · space_pulse.

create table if not exists public.space_vibes (
  space_id   uuid not null references public.spot_plans(spot_id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
alter table public.space_vibes enable row level security;
create index if not exists space_vibes_user_idx on public.space_vibes (user_id, created_at desc);
revoke all on table public.space_vibes from anon, authenticated;

-- Les mots qui comptent d'un texte de membre : minuscules, 4 lettres et plus,
-- sans les mots vides. Mécanique, gratuit, déterministe.
create or replace function public._space_words(p_text text)
 returns text[]
 language sql
 immutable
 set search_path to ''
as $function$
  select coalesce(array_agg(distinct w), '{}'::text[])
    from regexp_split_to_table(lower(coalesce(p_text, '')), '[^[:alnum:]]+') w
   where length(w) >= 4
     and w not in ('with','that','this','from','have','your','mine','more','less','into','what','when','them','they',
                   'than','then','every','each','just','about','être','pour','dans','avec','sans','plus','moins',
                   'tous','tout','toute','faire','mais','mon','mes','notre','votre','leur','chaque','jour','days','time')
$function$;

-- _spot_view (+ vibes, vibed)
CREATE OR REPLACE FUNCTION public._spot_view(p spot_plans, p_viewer uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'id', p.spot_id,
    'format', p.format,
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
    'why', case when p.visibility = 'shared' and (coalesce((p.snapshot->>'show_objectives')::boolean,p.show_why) or coalesce((p.snapshot->>'show_repulsions')::boolean,p.show_why)) then jsonb_build_object(
        'objectives', (select coalesce(jsonb_agg(jsonb_build_object('text', o->>'text')), '[]'::jsonb)
                         from jsonb_array_elements(coalesce(p.snapshot->'objectives', '[]'::jsonb)) o where btrim(coalesce(o->>'text','')) <> '' and coalesce((p.snapshot->>'show_objectives')::boolean,p.show_why)),
        'repulsions', (select coalesce(jsonb_agg(jsonb_build_object('text', r->>'text')), '[]'::jsonb)
                         from jsonb_array_elements(coalesce(p.snapshot->'repulsions', '[]'::jsonb)) r where btrim(coalesce(r->>'text','')) <> '' and coalesce((p.snapshot->>'show_repulsions')::boolean,p.show_why))) end,
    'exact', case when p.format = 'spot' and public._spot_exact(p.user_id, p_viewer, p.visibility, p.shield)
                  then jsonb_build_object('lat', p.lat, 'lng', p.lng, 'place', p.place) end,
    -- 11/10 : les vibes d'un space (compte public, et le mien).
    'vibes', case when p.format = 'space' then (select count(*) from public.space_vibes v where v.space_id = p.spot_id and v.active) end,
    'vibed', case when p.format = 'space' and p_viewer is not null
                  then exists(select 1 from public.space_vibes v where v.space_id = p.spot_id and v.user_id = p_viewer and v.active) end);
$function$
;

-- space_post (+ refus invité)
CREATE OR REPLACE FUNCTION public.space_post(p_habit text, p_video text, p_lat double precision, p_lng double precision, p_city text, p_comment text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  p_visibility constant text := 'shared'; p_duration_min constant integer := 5;
  p_mode constant text := 'silent'; p_location constant text := 'off';
  v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules(); v_steps jsonb; v_s jsonb;
  v_is text[]; v_objs jsonb; v_reps jsonb; v_id uuid; v_mode text; v_loc text; v_city text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  -- 11/10 : un invité (compte anonyme, sans email) ne publie pas.
  if exists(select 1 from auth.users u where u.id = v_uid and u.is_anonymous) then return jsonb_build_object('ok', false, 'why', 'email'); end if;

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
  if not coalesce(public._space_video_owned(v_uid, p_video),false) then return jsonb_build_object('ok', false, 'why', 'video'); end if;
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
                                visibility, shield, video, photo, city, capacity, access, selection, kind, format)
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
          v_city, 1, 'club', 'manual', 'experience', 'space');

  if p_video like 'bunny:%' then update public.spot_plans set video_id = substring(p_video from 7)::uuid where spot_id = v_id; end if;

  return jsonb_build_object('ok', true, 'id', v_id,
                            'ends_at', now() + make_interval(mins => p_duration_min));
end $function$
;

-- sm_begin : un invité (sans email) ne consomme pas les réponses offertes.
create or replace function public.sm_begin(p_user uuid, p_kind text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_s jsonb; v_r jsonb := public._sm_rules(); v_id bigint;
begin
  if p_user is null or p_kind is null or p_kind not in ('say', 'telegram') then
    return jsonb_build_object('ok', false, 'why', 'bad');
  end if;
  if exists(select 1 from auth.users u where u.id = p_user and u.is_anonymous) then
    return jsonb_build_object('ok', false, 'why', 'email');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('sm:' || p_user::text, 0));
  v_s := public._sm_state(p_user);
  if p_kind = 'say' then
    if not (v_s->>'ready')::boolean then return jsonb_build_object('ok', false, 'why', 'totehm', 'state', v_s); end if;
    if (v_s->>'left')::int <= 0 then
      return jsonb_build_object('ok', false, 'why',
        case when (v_s->>'higher')::boolean then 'quota' else 'higher_required' end, 'state', v_s);
    end if;
  else
    if not (v_s->>'higher')::boolean then return jsonb_build_object('ok', false, 'why', 'higher_required', 'state', v_s); end if;
    if public._sm_count(p_user, 'telegram', now() - interval '24 hours') >= (v_r->>'telegram_day')::int then
      return jsonb_build_object('ok', false, 'why', 'quota', 'state', v_s);
    end if;
  end if;
  insert into public.sm_uses (user_id, kind) values (p_user, p_kind) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'higher', (v_s->>'higher')::boolean,
    'left', case when p_kind = 'say' then greatest(0, (v_s->>'left')::int - 1) end);
end $function$;

-- LE FIL : tous les spaces lisibles du monde (ou près de moi), filtrés par ce
-- qui compose une Habit Box. Sans critère : le plus récent d'abord. Avec des
-- critères : un space doit en partager AU MOINS UN ; les plus proches d'abord
-- (même Habit 3 · objectif 2 · répulsion 2 · intention 1 · rythme 1), puis
-- le plus récent. Les objectifs/répulsions comparés sont ceux que l'auteur
-- MONTRE (jamais un texte caché : sinon le filtre le révélerait).
-- p_filter : {habit, ints[], freq, objectives[], repulsions[], shows: video|photo|why, near}
create or replace function public.space_feed(p_filter jsonb default '{}'::jsonb, p_lat double precision default null,
  p_lng double precision default null, p_offset integer default 0, p_limit integer default 20)
 returns jsonb
 language plpgsql
 stable security definer
 -- 'public' : earthdistance/cube y vivent et s'appellent sans préfixe entre elles.
 set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid(); v_r jsonb := public.spot_rules(); f jsonb := coalesce(p_filter, '{}'::jsonb);
  v_habit text := nullif(lower(btrim(coalesce(f->>'habit', ''))), '');
  v_ints text[]; v_freq text := nullif(btrim(coalesce(f->>'freq', '')), '');
  v_ow text[]; v_rw text[]; v_shows text := nullif(f->>'shows', '');
  v_near boolean := coalesce((f->>'near')::boolean, false) and p_lat is not null and p_lng is not null
                    and abs(p_lat) <= 90 and abs(p_lng) <= 180;
  v_lim int := greatest(1, least(coalesce(p_limit, 20), 40)); v_off int := greatest(0, least(coalesce(p_offset, 0), 2000));
  v_crit boolean; v_list jsonb; v_more boolean;
begin
  select coalesce(array_agg(distinct x), '{}'::text[]) into v_ints
    from jsonb_array_elements_text(case when jsonb_typeof(f->'ints') = 'array' then f->'ints' else '[]'::jsonb end) x
   where x in ('fight','flow','enrich','love','express','focus','celebrate');
  select coalesce(array_agg(distinct w), '{}'::text[]) into v_ow
    from jsonb_array_elements_text(case when jsonb_typeof(f->'objectives') = 'array' then f->'objectives' else '[]'::jsonb end) o,
         unnest(public._space_words(left(o, 200))) w;
  select coalesce(array_agg(distinct w), '{}'::text[]) into v_rw
    from jsonb_array_elements_text(case when jsonb_typeof(f->'repulsions') = 'array' then f->'repulsions' else '[]'::jsonb end) o,
         unnest(public._space_words(left(o, 200))) w;
  v_crit := v_habit is not null or cardinality(v_ints) > 0 or v_freq is not null or cardinality(v_ow) > 0 or cardinality(v_rw) > 0;

  with base as (
    select p,
      (p.user_id = v_me or (p.visibility = 'shared' and coalesce((p.snapshot->>'show_objectives')::boolean, p.show_why))) as show_o,
      (p.user_id = v_me or (p.visibility = 'shared' and coalesce((p.snapshot->>'show_repulsions')::boolean, p.show_why))) as show_r
      from public.spot_plans p
     where p.status = 'published' and p.format = 'space' and p.starts_at <= now()
       and ((v_me is not null and p.user_id = v_me)
            or (p.visibility = 'shared' and p.starts_at > now() - make_interval(days => (v_r->>'feed_days')::int)))
       and (not v_near or earth_distance(ll_to_earth(round(p_lat::numeric, 1)::double precision, round(p_lng::numeric, 1)::double precision),
                                          ll_to_earth(p.clat, p.clng)) <= (v_r->>'radius_km')::int * 1000)
       and (v_shows is null
            or (v_shows = 'video' and (p.video is not null or p.video_id is not null))
            or (v_shows = 'photo' and p.photo is not null)
            or (v_shows = 'why' and p.visibility = 'shared'
                and (coalesce((p.snapshot->>'show_objectives')::boolean, p.show_why) or coalesce((p.snapshot->>'show_repulsions')::boolean, p.show_why))))
  ), scored as (
    select b.p,
      (v_habit is not null and lower(btrim((b.p).habit)) = v_habit) as m_habit,
      (cardinality(v_ints) > 0 and (b.p).intentions && v_ints) as m_int,
      (v_freq is not null and (b.p).snapshot->>'freq' = v_freq) as m_freq,
      (cardinality(v_ow) > 0 and b.show_o and exists(
         select 1 from jsonb_array_elements(coalesce((b.p).snapshot->'objectives', '[]'::jsonb)) o
          where public._space_words(o->>'text') && v_ow)) as m_obj,
      (cardinality(v_rw) > 0 and b.show_r and exists(
         select 1 from jsonb_array_elements(coalesce((b.p).snapshot->'repulsions', '[]'::jsonb)) r
          where public._space_words(r->>'text') && v_rw)) as m_rep
      from base b
  ), ranked as (
    select s.*, (case when m_habit then 3 else 0 end) + (case when m_obj then 2 else 0 end) + (case when m_rep then 2 else 0 end)
              + (case when m_int then 1 else 0 end) + (case when m_freq then 1 else 0 end) as score
      from scored s
  ), numbered as (
    select r.*, row_number() over (order by case when v_crit then r.score else 0 end desc,
                                            (r.p).starts_at desc, (r.p).spot_id desc) as ord
      from ranked r
     where not v_crit or r.score > 0
  )
  select coalesce(jsonb_agg(public._spot_view(n.p, v_me) || jsonb_build_object('matched',
           to_jsonb(array_remove(array[case when n.m_habit then 'habit' end, case when n.m_obj then 'objective' end,
                                        case when n.m_rep then 'repulsion' end, case when n.m_int then 'intention' end,
                                        case when n.m_freq then 'rhythm' end], null)))
           order by n.ord), '[]'::jsonb),
         coalesce(bool_or(n.ord > v_off + v_lim), false)
    into v_list, v_more
    from numbered n
   where n.ord > v_off and n.ord <= v_off + v_lim + 1;
  -- la ligne « + 1 » ne sert qu'à savoir s'il y a une suite : on la retire.
  if v_more then v_list := v_list - (jsonb_array_length(v_list) - 1); end if;

  return jsonb_build_object('ok', true, 'signed_in', v_me is not null, 'spots', v_list, 'more', v_more, 'filtered', v_crit);
end $function$;

-- UNE VIBE : un geste, un membre, un space. Pas sur le sien, pas sans email.
create or replace function public.space_vibe(p_space uuid, p_on boolean default true)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_me uuid := auth.uid(); v_owner uuid; v_vis text; v_n bigint;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if exists(select 1 from auth.users u where u.id = v_me and u.is_anonymous) then
    return jsonb_build_object('ok', false, 'why', 'email');
  end if;
  select p.user_id, p.visibility into v_owner, v_vis from public.spot_plans p
   where p.spot_id = p_space and p.status = 'published' and p.format = 'space';
  if v_owner is null or (v_vis <> 'shared' and v_owner <> v_me) then return jsonb_build_object('ok', false, 'why', 'nothing'); end if;
  if v_owner = v_me then return jsonb_build_object('ok', false, 'why', 'own'); end if;
  insert into public.space_vibes as v (space_id, user_id, active, created_at)
  values (p_space, v_me, coalesce(p_on, true), now())
  on conflict (space_id, user_id) do update
     set active = excluded.active,
         created_at = case when excluded.active and not v.active then now() else v.created_at end;
  select count(*) into v_n from public.space_vibes where space_id = p_space and active;
  return jsonb_build_object('ok', true, 'vibed', coalesce(p_on, true), 'vibes', v_n);
end $function$;

-- UN PROFIL : mes spaces (tous), ou ceux d'un membre (partagés). Grille.
create or replace function public.space_profile(p_pseudo text default null, p_offset integer default 0, p_limit integer default 30)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_me uuid := auth.uid(); v_uid uuid; v_pseudo text; v_mine boolean; v_list jsonb; v_more boolean;
  v_lim int := greatest(1, least(coalesce(p_limit, 30), 60)); v_off int := greatest(0, coalesce(p_offset, 0));
  v_n bigint; v_vibes bigint;
begin
  if nullif(btrim(coalesce(p_pseudo, '')), '') is null then
    if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
    v_uid := v_me;
  else
    select pr.id into v_uid from public.profiles pr where lower(pr.pseudo) = lower(btrim(p_pseudo)) limit 1;
    if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;
  end if;
  select pr.pseudo into v_pseudo from public.profiles pr where pr.id = v_uid;
  v_mine := v_uid = v_me;
  select count(*), coalesce(sum((select count(*) from public.space_vibes v where v.space_id = p.spot_id and v.active)), 0)
    into v_n, v_vibes
    from public.spot_plans p
   where p.user_id = v_uid and p.status = 'published' and p.format = 'space' and (v_mine or p.visibility = 'shared');
  select coalesce(jsonb_agg(public._spot_view(x.p, v_me) order by (x.p).starts_at desc, (x.p).spot_id desc), '[]'::jsonb)
    into v_list
    from (select p from public.spot_plans p
           where p.user_id = v_uid and p.status = 'published' and p.format = 'space' and (v_mine or p.visibility = 'shared')
           order by p.starts_at desc, p.spot_id desc offset v_off limit v_lim) x;
  v_more := v_n > v_off + v_lim;
  return jsonb_build_object('ok', true, 'pseudo', v_pseudo, 'mine', v_mine, 'spaces_total', v_n,
                            'vibes_total', v_vibes, 'spaces', v_list, 'more', v_more);
end $function$;

-- MES VIBES : reçues sur mes spaces (qui, quoi, quand) et données (à revoir).
create or replace function public.my_vibes(p_limit integer default 40)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_me uuid := auth.uid(); v_lim int := greatest(1, least(coalesce(p_limit, 40), 100)); v_in jsonb; v_out jsonb; v_n bigint;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('space', x.space_id, 'habit', x.habit, 'by', x.pseudo, 'at', x.created_at)
                            order by x.created_at desc), '[]'::jsonb)
    into v_in
    from (select v.space_id, p.habit, pr.pseudo, v.created_at
            from public.space_vibes v
            join public.spot_plans p on p.spot_id = v.space_id and p.user_id = v_me and p.status = 'published' and p.format = 'space'
            left join public.profiles pr on pr.id = v.user_id
           where v.active and v.user_id <> v_me
           order by v.created_at desc limit v_lim) x;
  select count(*) into v_n
    from public.space_vibes v join public.spot_plans p on p.spot_id = v.space_id and p.user_id = v_me and p.status = 'published'
   where v.active and v.user_id <> v_me;
  select coalesce(jsonb_agg(public._spot_view(x.p, v_me) order by x.created_at desc), '[]'::jsonb)
    into v_out
    from (select p, v.created_at from public.space_vibes v
            join public.spot_plans p on p.spot_id = v.space_id and p.status = 'published' and p.format = 'space'
                                    and (p.visibility = 'shared' or p.user_id = v_me)
           where v.user_id = v_me and v.active
           order by v.created_at desc limit v_lim) x;
  return jsonb_build_object('ok', true, 'received', v_in, 'received_total', v_n, 'given', v_out);
end $function$;

-- LE POULS : ce qui vit sur SPACE cette semaine (des nombres, jamais un nom).
create or replace function public.space_pulse()
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'spaces_week', (select count(*) from public.spot_plans p where p.status = 'published' and p.format = 'space'
                      and p.visibility = 'shared' and p.starts_at > now() - interval '7 days'),
    'members_week', (select count(distinct p.user_id) from public.spot_plans p where p.status = 'published' and p.format = 'space'
                      and p.visibility = 'shared' and p.starts_at > now() - interval '7 days'),
    'vibes_week', (select count(*) from public.space_vibes v where v.active and v.created_at > now() - interval '7 days'))
$function$;

-- Droits : APRÈS le dernier create.
revoke all on function public._space_words(text) from public, anon, authenticated;
grant execute on function public._space_words(text) to service_role;
revoke all on function public._spot_view(public.spot_plans, uuid) from public, anon, authenticated, service_role;
grant execute on function public._spot_view(public.spot_plans, uuid) to service_role;
revoke all on function public.space_post(text,text,double precision,double precision,text,text) from public, anon, authenticated, service_role;
grant execute on function public.space_post(text,text,double precision,double precision,text,text) to authenticated, service_role;
revoke all on function public.sm_begin(uuid,text) from public, anon, authenticated;
grant execute on function public.sm_begin(uuid,text) to service_role;
revoke all on function public.space_feed(jsonb,double precision,double precision,integer,integer) from public, anon, authenticated;
grant execute on function public.space_feed(jsonb,double precision,double precision,integer,integer) to anon, authenticated, service_role;
revoke all on function public.space_vibe(uuid,boolean) from public, anon, authenticated;
grant execute on function public.space_vibe(uuid,boolean) to authenticated, service_role;
revoke all on function public.space_profile(text,integer,integer) from public, anon, authenticated;
grant execute on function public.space_profile(text,integer,integer) to anon, authenticated, service_role;
revoke all on function public.my_vibes(integer) from public, anon, authenticated;
grant execute on function public.my_vibes(integer) to authenticated, service_role;
revoke all on function public.space_pulse() from public, anon, authenticated;
grant execute on function public.space_pulse() to anon, authenticated, service_role;
