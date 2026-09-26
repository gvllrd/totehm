-- ════════════════════════════════════════════════════════════════════
-- 20260926 · TOTEHM.SPACE — LE MONDE · LA NATURE D'UN SPOT
-- ════════════════════════════════════════════════════════════════════
-- Wah, 26/09 : « la plateforme doit fonctionner à l'international — le
-- zoom va à l'échelle de la planète Terre » ; « on a oublié la NATURE du
-- Spot : privé (dans l'infrastructure du membre) ou espace public (un
-- parc, un coffee-shop) ».
--
--   A · `spot_plans.venue` — 'public' | 'private'.
--       ⚠️ UN SPOT PRIVÉ EST CHEZ QUELQU'UN. Sa position publique est
--       arrondie à ~1,1 km (2 décimales) au lieu de ~110 m : le radar dit
--       « dans ce quartier », jamais « à cette porte ». L'adresse exacte
--       reste aux acceptés, comme pour tout Spot.
--   B · `spot_rules()` porte les arrondis (3 / 2 décimales).
--   C · `spot_publish` v3 — `+ p_venue text default 'public'`. Le défaut
--       garde la page du 25/09 en état de marche (appel par NOMS, quinze
--       arguments) ; la page du 26/09 le rend OBLIGATOIRE à l'écran.
--       ⚠️ La signature change : on SUPPRIME l'ancienne (sinon surcharge
--       ambiguë) et on redonne les droits en fin de fichier.
--   D · `spots_radar`, `my_space` rendent `venue`.
--   E · `spots_globe()` — NOUVELLE : les Spots du monde entier, regroupés
--       en cellules d'un demi-degré (~55 km). C'est ce que dessine le radar
--       quand on dézoome au-delà de 60 km : un nombre et une couleur par
--       cellule, jamais un Spot. Mêmes filtres que `spots_radar`
--       (quand · intention · mode · mots — les mots publics seulement).
--   F · la démo : dix Spots hors de Lisbonne (New York, Tokyo, Berlin,
--       Rio, Paris, Londres, Le Cap, Sydney, Mexico, Bali) et quatre
--       Spots PRIVÉS, pour que le globe et la nature se testent.
--       `demo_seed()` appelle `_demo_seed_world()` (patch par REMPLACEMENT
--       d'un repère exact dans la définition déployée ; s'il manque, la
--       migration S'ARRÊTE au lieu de coller du code à côté).


-- ════════════════════════════════════════════════════════════════════
-- A · LA NATURE
-- ════════════════════════════════════════════════════════════════════
alter table public.spot_plans add column if not exists venue text not null default 'public';
alter table public.spot_plans drop constraint if exists spot_plans_venue_check;
alter table public.spot_plans add constraint spot_plans_venue_check check (venue in ('public','private'));


-- ════════════════════════════════════════════════════════════════════
-- B · LES RÈGLES
-- ════════════════════════════════════════════════════════════════════
create or replace function public.spot_rules()
returns jsonb language sql immutable set search_path to 'public'
as $f$
  select jsonb_build_object(
    'max_upcoming', 10,
    'capacity_min', 1,  'capacity_max', 50,
    'duration_min', 5,  'duration_max', 720,
    'horizon_days', 90,
    'round_public', 3,     -- ~110 m : « c'est par là »
    'round_private', 2,    -- ~1,1 km : « dans ce quartier »
    'local_radius_km', 60);
$f$;


-- ════════════════════════════════════════════════════════════════════
-- C · `spot_publish` v3
-- ════════════════════════════════════════════════════════════════════
drop function if exists public.spot_publish(text,text[],uuid[],bigint[],boolean,timestamptz,integer,text,double precision,double precision,text,integer,text,text,text);

create function public.spot_publish(
  p_habit text, p_intentions text[], p_objectives uuid[], p_repulsions bigint[], p_mood boolean,
  p_starts_at timestamptz, p_duration_min integer, p_place text, p_lat double precision,
  p_lng double precision, p_mode text, p_capacity integer, p_access text, p_selection text,
  p_comment text, p_venue text default 'public')
returns jsonb
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid(); v_steps jsonb; v_s jsonb; v_his text[]; v_is text[];
  v_objs jsonb; v_reps jsonb; v_mood jsonb; v_id uuid; v_cp public.creator_profiles%rowtype;
  v_r jsonb := public.spot_rules(); v_round int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if not public._is_figher(v_uid) then return jsonb_build_object('ok', false, 'why', 'figher'); end if;

  select coalesce(t.steps,'[]'::jsonb) into v_steps from public.totehms t where t.user_id = v_uid limit 1;
  select s into v_s from jsonb_array_elements(coalesce(v_steps,'[]'::jsonb)) s
   where s->>'t' = p_habit and btrim(coalesce(s->>'t','')) <> '' limit 1;
  if v_s is null then return jsonb_build_object('ok', false, 'why', 'habit'); end if;

  v_his := public._step_intentions(v_s);
  v_is := array(select distinct x from unnest(coalesce(p_intentions, '{}')) x
                 where x in ('fight','flow','enrich','love','express','focus','celebrate')
                   and (cardinality(v_his) = 0 or x = any(v_his)));
  if cardinality(v_is) = 0 then v_is := v_his; end if;

  select coalesce(jsonb_agg(jsonb_build_object('text', o.text, 'is', to_jsonb(o."is"))), '[]'::jsonb) into v_objs
    from public.objectives o
   where o.user_id = v_uid and o.id = any(coalesce(p_objectives, '{}'))
     and btrim(o.text) <> ''
     and (o.id::text = v_s->>'o' or exists (select 1 from public.objective_habits oh
           where oh.user_id = v_uid and oh.objective_id = o.id and oh.habit_text = p_habit));
  select coalesce(jsonb_agg(jsonb_build_object('text', r.repulsion)), '[]'::jsonb) into v_reps
    from public.repulsions r
   where r.user_id = v_uid and r.id = any(coalesce(p_repulsions, '{}')) and r.active
     and btrim(r.repulsion) <> ''
     and (r.habit_text = p_habit or exists (select 1 from public.repulsion_habits rh
           where rh.user_id = v_uid and rh.repulsion_id = r.id and rh.habit_text = p_habit));
  if coalesce(p_mood, false) then
    select jsonb_build_object('title', m.title, 'url', m.url, 'intention', m.intention) into v_mood
      from public.intention_music m
     where m.user_id = v_uid and m.active and m.intention = any(v_is)
     order by array_position(v_is, m.intention) limit 1;
  end if;

  if p_starts_at is null or p_starts_at < now() - interval '10 minutes'
     or p_starts_at > now() + make_interval(days => (v_r->>'horizon_days')::int) then
    return jsonb_build_object('ok', false, 'why', 'when');
  end if;
  if coalesce(p_duration_min, 0) not between (v_r->>'duration_min')::int and (v_r->>'duration_max')::int then
    return jsonb_build_object('ok', false, 'why', 'duration'); end if;
  if coalesce(p_capacity, 0) not between (v_r->>'capacity_min')::int and (v_r->>'capacity_max')::int then
    return jsonb_build_object('ok', false, 'why', 'capacity'); end if;
  if p_mode not in ('social','silent') then return jsonb_build_object('ok', false, 'why', 'mode'); end if;
  if p_selection not in ('manual','auto') then return jsonb_build_object('ok', false, 'why', 'selection'); end if;
  if p_access not in ('club','subscribers') then return jsonb_build_object('ok', false, 'why', 'access'); end if;
  if coalesce(p_venue, '') not in ('public','private') then return jsonb_build_object('ok', false, 'why', 'venue'); end if;
  if p_access = 'subscribers' then
    select * into v_cp from public.creator_profiles where user_id = v_uid;
    if not (coalesce(v_cp.monetized, false) and 'spots' = any(coalesce(v_cp.benefits, '{}'))) then
      return jsonb_build_object('ok', false, 'why', 'subscribers');
    end if;
  end if;
  if btrim(coalesce(p_place,'')) = '' then return jsonb_build_object('ok', false, 'why', 'place'); end if;
  if p_lat is null or p_lng is null or abs(p_lat) > 90 or abs(p_lng) > 180 then
    return jsonb_build_object('ok', false, 'why', 'position');
  end if;
  if (select count(*) from public.spot_plans where user_id = v_uid and status = 'published'
        and starts_at + make_interval(mins => duration_min) > now()) >= (v_r->>'max_upcoming')::int then
    return jsonb_build_object('ok', false, 'why', 'too_many');
  end if;

  -- ⚠️ CHEZ QUELQU'UN, LE RADAR NE MONTRE QUE LE QUARTIER.
  v_round := case when p_venue = 'private' then (v_r->>'round_private')::int else (v_r->>'round_public')::int end;

  insert into public.spots(user_id, intention, activite, commentaire, lat, lng,
                           duration_min, expires_at, is_public, required_role,
                           energy_mode, active)
  values (v_uid, coalesce(v_is[1], 'focus'), left(p_habit, 80), null,
          round(p_lat::numeric, v_round)::double precision, round(p_lng::numeric, v_round)::double precision,
          p_duration_min, p_starts_at + make_interval(mins => p_duration_min),
          false, 'figher', p_mode, true)
  returning id into v_id;

  insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at,
                                duration_min, capacity, mode, access, selection, place,
                                lat, lng, comment, venue)
  values (v_id, v_uid, p_habit, v_is,
          jsonb_build_object('habit', p_habit, 'intentions', to_jsonb(v_is),
                             'objectives', v_objs, 'repulsions', v_reps, 'mood', v_mood,
                             'freq', v_s->>'f', 'at', now()),
          p_starts_at, p_duration_min, p_capacity, p_mode, p_access, p_selection,
          left(btrim(p_place), 120), p_lat, p_lng, nullif(left(btrim(coalesce(p_comment,'')), 400), ''), p_venue);

  return jsonb_build_object('ok', true, 'id', v_id,
    'lat', round(p_lat::numeric, v_round), 'lng', round(p_lng::numeric, v_round));
end $function$;


-- ════════════════════════════════════════════════════════════════════
-- D · `spots_radar` et `my_space` rendent la nature
-- ════════════════════════════════════════════════════════════════════
create or replace function public.spots_radar(
  p_lat double precision, p_lng double precision, p_radius int,
  p_q text default null, p_mode text default null, p_live boolean default false,
  p_limit int default 40, p_when text default null, p_intention text default null)
returns jsonb
language plpgsql volatile security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_f jsonb; v_member boolean; v_res jsonb;
        v_q text := lower(btrim(coalesce(p_q, '')));
        v_day0 timestamp := date_trunc('day', now() at time zone 'Europe/Lisbon');
        v_day_end  timestamptz := (v_day0 + interval '1 day') at time zone 'Europe/Lisbon';
        v_day2_end timestamptz := (v_day0 + interval '2 day') at time zone 'Europe/Lisbon';
        v_day8_end timestamptz := (v_day0 + interval '8 day') at time zone 'Europe/Lisbon';
begin
  v_f := public._figher(v_uid);
  v_member := coalesce((v_f->>'member')::boolean, false);
  if v_uid is not null then perform public._spot_expire(v_uid); end if;

  with c as (
    select p.*, s.lat as rlat, s.lng as rlng,
           case when p_lat is null or p_lng is null then null
                else earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng))::int end as dist_m,
           p.starts_at + make_interval(mins => p.duration_min) as ends_at,
           (select pr.pseudo from public.profiles pr where pr.id = p.user_id) as creator
      from public.spot_plans p join public.spots s on s.id = p.spot_id
     where p.status = 'published' and s.active
       and p.starts_at + make_interval(mins => p.duration_min) > now()
       and p.starts_at < now() + interval '45 days'
       and (p_lat is null or p_lng is null or
            (earth_box(ll_to_earth(p_lat, p_lng), greatest(200, least(coalesce(p_radius, 5000), 60000)))
               @> ll_to_earth(s.lat, s.lng)
             and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng))
               <= greatest(200, least(coalesce(p_radius, 5000), 60000))))
       and (p_mode is null or p.mode = p_mode)
       and (p_intention is null or p_intention = any(p.intentions))
       and (not coalesce(p_live, false) or now() between p.starts_at and p.starts_at + make_interval(mins => p.duration_min))
       and (p_when is null
            or (p_when = 'now'      and now() between p.starts_at and p.starts_at + make_interval(mins => p.duration_min))
            or (p_when = 'today'    and p.starts_at < v_day_end)
            or (p_when = 'week'     and p.starts_at < now() + interval '7 days')
            or (p_when = 'tomorrow' and p.starts_at >= v_day_end and p.starts_at < v_day2_end)
            or (p_when = 'next7'    and p.starts_at >= v_day_end and p.starts_at < v_day8_end)
            or (p_when = 'later'    and p.starts_at >= v_day_end))
  ), h as (
    select c.*, lower(concat_ws(' ',
             c.habit, array_to_string(c.intentions, ' '),
             (select string_agg(public._pillar(x), ' ') from unnest(c.intentions) x),
             c.mode, c.venue, replace(coalesce(c.snapshot->>'freq', ''), '_', ' '),
             c.snapshot->'mood'->>'title',
             case when c.demo then 'demo' end,
             case when v_member or c.user_id = v_uid then concat_ws(' ',
               c.creator, c.comment,
               (select string_agg(e->>'text', ' ') from jsonb_array_elements(coalesce(c.snapshot->'objectives', '[]'::jsonb)) e),
               (select string_agg(e->>'text', ' ') from jsonb_array_elements(coalesce(c.snapshot->'repulsions', '[]'::jsonb)) e))
             end)) as hay
      from c
  ), f as (
    select h.* from h
     where v_q = ''
        or not exists (select 1 from regexp_split_to_table(v_q, '\s+') w
                        where w <> '' and strpos(h.hay, w) = 0)
     order by (now() >= h.starts_at) desc, h.starts_at
     limit greatest(1, least(coalesce(p_limit, 40), 60))
  ), k as (
    select f.*,
           (select count(*) from public.spot_applications a
             where a.spot_id = f.spot_id and a.status = 'accepted')::int as taken,
           (select a.status from public.spot_applications a
             where a.spot_id = f.spot_id and a.user_id = v_uid) as my_status,
           (f.user_id = v_uid) as mine
      from f
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', k.spot_id, 'habit', k.habit, 'intentions', to_jsonb(k.intentions),
      'freq', k.snapshot->>'freq',
      'mode', k.mode, 'venue', k.venue, 'starts_at', k.starts_at, 'ends_at', k.ends_at,
      'duration_min', k.duration_min, 'live', now() >= k.starts_at,
      'lat', k.rlat, 'lng', k.rlng, 'dist_m', k.dist_m,
      'capacity', k.capacity, 'taken', k.taken, 'access', k.access, 'selection', k.selection,
      'mine', k.mine, 'my_status', k.my_status, 'demo', k.demo,
      'mood',     k.snapshot->'mood'->>'title',
      'creator',  case when v_member or k.mine then k.creator end,
      'context',  case when v_member or k.mine then k.snapshot - 'at' end,
      'comment',  case when v_member or k.mine then k.comment end,
      'compat',   k.score,
      'place',    case when k.mine or k.my_status = 'accepted' then k.place end,
      'exact',    case when k.mine or k.my_status = 'accepted'
                       then jsonb_build_object('lat', k.lat, 'lng', k.lng) end,
      'why_not',  case
         when v_uid is null then 'signin'
         when k.mine then 'mine'
         when not v_member then case
              when not coalesce((v_f->>'complete')::boolean, false) then 'passport'
              when not coalesce((v_f->>'thp')::boolean, false) then 'thp'
              else 'club' end
         when k.my_status in ('pending','accepted') then 'applied'
         when k.my_status = 'rejected' then 'rejected'
         when now() >= k.starts_at then 'started'
         when k.taken >= k.capacity then 'full'
         when k.access = 'subscribers' and not exists (
               select 1 from public.creator_subscriptions cs
                join public.creator_profiles cp on cp.user_id = cs.creator_id
               where cs.creator_id = k.user_id and cs.fan_id = v_uid
                 and cs.status in ('active','trialing') and 'spots' = any(cp.benefits)) then 'subscribers'
         else null end)
    order by k.live_first desc, k.starts_at), '[]'::jsonb)
  into v_res
  from (select k.*, (now() >= k.starts_at) as live_first,
               case when v_member and not k.mine then public._spot_compat(v_uid, k.spot_id) end as score
          from k) k;

  return jsonb_build_object('member', v_member, 'signed_in', v_uid is not null, 'spots', v_res);
end $f$;

create or replace function public.my_space()
returns jsonb
language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules();
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;
  perform public._spot_expire(v_uid);
  return jsonb_build_object(
    'signed_in', true,
    'limits', jsonb_build_object(
      'upcoming', (select count(*) from public.spot_plans
                    where user_id = v_uid and status = 'published'
                      and starts_at + make_interval(mins => duration_min) > now()),
      'max_upcoming', (v_r->>'max_upcoming')::int),
    'spots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.spot_id, 'habit', p.habit, 'intentions', to_jsonb(p.intentions),
        'starts_at', p.starts_at, 'duration_min', p.duration_min, 'mode', p.mode, 'venue', p.venue,
        'capacity', p.capacity, 'access', p.access, 'selection', p.selection,
        'status', p.status, 'place', p.place, 'comment', p.comment,
        'mood', p.snapshot->'mood'->>'title',
        'live', now() between p.starts_at and p.starts_at + make_interval(mins => p.duration_min),
        'past', now() > p.starts_at + make_interval(mins => p.duration_min),
        'taken',   (select count(*) from public.spot_applications a where a.spot_id = p.spot_id and a.status = 'accepted'),
        'pending', (select count(*) from public.spot_applications a where a.spot_id = p.spot_id and a.status = 'pending'),
        'lat', s.lat, 'lng', s.lng,
        'exact', jsonb_build_object('lat', p.lat, 'lng', p.lng),
        'freq', p.snapshot->>'freq', 'context', p.snapshot - 'at', 'demo', p.demo)
        order by p.starts_at desc)
      from public.spot_plans p join public.spots s on s.id = p.spot_id
     where p.user_id = v_uid and p.starts_at > now() - interval '30 days'), '[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'spot_id', a.spot_id, 'habit', p.habit, 'starts_at', p.starts_at,
        'intentions', to_jsonb(p.intentions), 'freq', p.snapshot->>'freq',
        'pseudo', pr.pseudo, 'compat', a.compat, 'note', a.note, 'at', a.created_at)
        order by a.compat desc nulls last, a.created_at)
      from public.spot_applications a
      join public.spot_plans p on p.spot_id = a.spot_id
      left join public.profiles pr on pr.id = a.user_id
     where p.user_id = v_uid and a.status = 'pending' and p.status = 'published'), '[]'::jsonb),
    'applications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'spot_id', a.spot_id, 'habit', p.habit, 'starts_at', p.starts_at,
        'duration_min', p.duration_min, 'mode', p.mode, 'venue', p.venue, 'status', a.status,
        'spot_status', p.status, 'creator', pr.pseudo,
        'intentions', to_jsonb(p.intentions), 'freq', p.snapshot->>'freq',
        'context', p.snapshot - 'at', 'demo', p.demo, 'capacity', p.capacity,
        'selection', p.selection, 'access', p.access, 'comment', p.comment,
        'mood', p.snapshot->'mood'->>'title',
        'taken', (select count(*) from public.spot_applications x where x.spot_id = p.spot_id and x.status = 'accepted'),
        'lat', s.lat, 'lng', s.lng,
        'place', case when a.status = 'accepted' and p.status = 'published' then p.place end,
        'exact', case when a.status = 'accepted' and p.status = 'published'
                      then jsonb_build_object('lat', p.lat, 'lng', p.lng) end)
        order by p.starts_at desc)
      from public.spot_applications a
      join public.spot_plans p on p.spot_id = a.spot_id
      join public.spots s on s.id = p.spot_id
      left join public.profiles pr on pr.id = p.user_id
     where a.user_id = v_uid and p.starts_at > now() - interval '30 days'), '[]'::jsonb));
end $function$;


-- ════════════════════════════════════════════════════════════════════
-- E · LE GLOBE — des cellules, jamais un Spot
-- ════════════════════════════════════════════════════════════════════
-- ⚠️ ZÉRO IDENTITÉ, ZÉRO CONTEXTE : une position moyenne (déjà publique,
-- déjà arrondie), un nombre, un nombre de LIVE, l'intention la plus
-- fréquente. Les mots cherchent dans ce qu'un INVITÉ peut lire, rien
-- d'autre (même règle que `spots_radar`). Aucune session requise.
create or replace function public.spots_globe(
  p_when text default null, p_intention text default null, p_q text default null, p_mode text default null)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_q text := lower(btrim(coalesce(p_q, '')));
        v_day0 timestamp := date_trunc('day', now() at time zone 'Europe/Lisbon');
        v_day_end  timestamptz := (v_day0 + interval '1 day') at time zone 'Europe/Lisbon';
        v_day2_end timestamptz := (v_day0 + interval '2 day') at time zone 'Europe/Lisbon';
        v_day8_end timestamptz := (v_day0 + interval '8 day') at time zone 'Europe/Lisbon';
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('lat', c.lat, 'lng', c.lng, 'n', c.n, 'live', c.live, 'i', c.i) order by c.n desc)
      from (select round(avg(s.lat)::numeric, 2) as lat, round(avg(s.lng)::numeric, 2) as lng,
                   count(*)::int as n,
                   (count(*) filter (where now() >= p.starts_at))::int as live,
                   mode() within group (order by p.intentions[1]) as i
              from public.spot_plans p join public.spots s on s.id = p.spot_id
             where p.status = 'published' and s.active
               and p.starts_at + make_interval(mins => p.duration_min) > now()
               and p.starts_at < now() + interval '45 days'
               and (p_mode is null or p.mode = p_mode)
               and (p_intention is null or p_intention = any(p.intentions))
               and (p_when is null
                    or (p_when = 'now'      and now() between p.starts_at and p.starts_at + make_interval(mins => p.duration_min))
                    or (p_when = 'today'    and p.starts_at < v_day_end)
                    or (p_when = 'week'     and p.starts_at < now() + interval '7 days')
                    or (p_when = 'tomorrow' and p.starts_at >= v_day_end and p.starts_at < v_day2_end)
                    or (p_when = 'next7'    and p.starts_at >= v_day_end and p.starts_at < v_day8_end)
                    or (p_when = 'later'    and p.starts_at >= v_day_end))
               and (v_q = '' or not exists (
                     select 1 from regexp_split_to_table(v_q, '\s+') w
                      where w <> '' and strpos(lower(concat_ws(' ', p.habit, array_to_string(p.intentions, ' '), p.mode, p.venue)), w) = 0))
             group by floor(s.lat*2), floor(s.lng*2)
             limit 3000) c), '[]'::jsonb);
end $f$;


-- ════════════════════════════════════════════════════════════════════
-- F · LA DÉMO — le monde, et la nature privée
-- ════════════════════════════════════════════════════════════════════
create or replace function public._demo_seed_world()
returns int
language plpgsql security definer set search_path to 'public'
as $f$
declare r record; v_uid uuid; v_spot uuid; v_start timestamptz; v_n int := 0; v_round int;
begin
  -- Trois Spots de Lisbonne deviennent PRIVÉS : leur position publique
  -- recule au quartier, comme le ferait `spot_publish`.
  update public.spot_plans set venue = 'private'
   where demo and habit in ('Cook for someone who eats alone', 'Tea, no phones', 'Read 30 pages without my phone');
  update public.spots s set lat = round(p.lat::numeric, 2)::double precision, lng = round(p.lng::numeric, 2)::double precision
    from public.spot_plans p where p.spot_id = s.id and p.demo and p.venue = 'private';

  -- Le monde. L'heure est celle de la VILLE du Spot.
  for r in
    select * from (values
      ('lea',   'Sunrise run over the Brooklyn Bridge', array['flow','fight'],      'every_morning', 'Brooklyn Bridge — Manhattan side',  40.7115,  -74.0047, 'America/New_York',    1, '06:30',  45, 12, 'social', 'auto',   'Easy pace, photos at the top.',      'Run a marathon',              'Snoozing three times',            'public'),
      ('yuki',  'Zazen before work',                    array['focus'],             'every_weekday', 'Zōjō-ji — the garden gate',          35.6574,  139.7481, 'Asia/Tokyo',          1, '07:00',  30,  8, 'silent', 'manual', 'Sit, breathe, go.',                  'Sit every day for a year',    'Checking my phone first',         'public'),
      ('kofi',  'Sketch the Spree at dusk',             array['express'],           'weekly',        'Oberbaumbrücke — east bank',         52.5016,   13.4459, 'Europe/Berlin',       2, '18:30',  90,  6, 'social', 'auto',   'Pencils only.',                      'Fill a sketchbook a month',   'Waiting for inspiration',         'public'),
      ('rui',   'Capoeira roda on the beach',           array['fight','celebrate'], 'every_weekend', 'Ipanema — posto 9',                 -22.9868,  -43.2046, 'America/Sao_Paulo',   2, '17:00',  90, 20, 'social', 'auto',   'Berimbau provided.',                 'Play in a real roda',         'Watching instead of joining',     'public'),
      ('ada',   'Cook for the neighbours',              array['love'],              'weekly',        'My kitchen in the Marais',           48.8589,    2.3591, 'Europe/Paris',        3, '19:30', 150,  4, 'social', 'manual', 'Bring a dessert.',                   'Host 50 dinners',             'Eating in front of a screen',     'private'),
      ('ines',  'Hill repeats on Primrose Hill',        array['fight'],             'twice_week',    'Primrose Hill — the summit',         51.5395,   -0.1609, 'Europe/London',       1, '07:15',  40, 10, 'social', 'auto',   '8 × up, walk down.',                 'Run the Lisbon half marathon', 'Skipping leg day',               'public'),
      ('noor',  'Table Mountain flow',                  array['flow','love'],       'weekly',        'Platteklip Gorge — the start',      -33.9628,   18.4098, 'Africa/Johannesburg', 4, '08:00', 180,  8, 'silent', 'auto',   'Water, hat, silence.',               'Touch my toes by winter',     'Sitting all day',                 'public'),
      ('sol',   'Bondi sunrise swim',                   array['celebrate','flow'],  'every_morning', 'Bondi Icebergs — the steps',        -33.8951,  151.2743, 'Australia/Sydney',    1, '06:00',  45, 15, 'social', 'auto',   'Coffee after.',                      'Swim every month of the year', 'Hot showers only',               'public'),
      ('mara',  'Silent reading at the library',        array['enrich','focus'],    'every_evening', 'Biblioteca Vasconcelos',             19.4476,  -99.1528, 'America/Mexico_City', 2, '17:00',  60, 10, 'silent', 'auto',   'Any book, no phones.',               'Read 24 books this year',     'Scrolling in bed',                'public'),
      ('tiago', 'Muay thai pads in my garage',          array['fight'],             'twice_week',    'My garage, Canggu',                  -8.6478,  115.1385, 'Asia/Makassar',       1, '17:30',  60,  4, 'social', 'manual', 'Wraps and water.',                   'Fight my first amateur bout', 'Skipping the hard rounds',        'private')
    ) v(who, habit, ints, freq, place, lat, lng, tz, d, hm, dur, cap, mode, sel, cmt, obj, rep, venue)
  loop
    select m.user_id into v_uid from public.demo_members m where m.pseudo = r.who || '_demo';
    if v_uid is null then continue; end if;
    v_start := (((now() at time zone r.tz)::date + r.d) + r.hm::time) at time zone r.tz;
    v_round := case when r.venue = 'private' then 2 else 3 end;

    insert into public.spots(user_id, intention, activite, commentaire, lat, lng, duration_min, expires_at,
                             is_public, required_role, energy_mode, active)
    values (v_uid, r.ints[1], left(r.habit, 80), null,
            round(r.lat::numeric, v_round)::double precision, round(r.lng::numeric, v_round)::double precision,
            r.dur, v_start + make_interval(mins => r.dur), false, 'figher', r.mode, true)
    returning id into v_spot;

    insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at, duration_min,
                                  capacity, mode, access, selection, place, lat, lng, comment, demo, venue)
    values (v_spot, v_uid, r.habit, r.ints,
            jsonb_build_object('habit', r.habit, 'intentions', to_jsonb(r.ints),
              'objectives', jsonb_build_array(jsonb_build_object('text', r.obj, 'is', to_jsonb(r.ints))),
              'repulsions', jsonb_build_array(jsonb_build_object('text', r.rep)),
              'mood', null, 'freq', r.freq, 'at', now(), 'demo', true),
            v_start, r.dur, r.cap, r.mode, 'club', r.sel, r.place, r.lat, r.lng, r.cmt, true, r.venue);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $f$;

-- `demo_seed()` appelle le monde juste avant de rendre son bilan. On
-- PATCHE la définition déployée sur un repère exact ; absent, on s'arrête.
do $patch$
declare d text := pg_get_functiondef('public.demo_seed()'::regprocedure);
        k text := '  return jsonb_build_object(''ok'', true, ''members''';
begin
  if position('_demo_seed_world' in d) > 0 then return; end if;
  if position(k in d) = 0 then raise exception 'demo_seed : repère introuvable, patch refusé'; end if;
  execute replace(d, k, '  v_n := v_n + public._demo_seed_world();' || chr(10) || k);
end $patch$;


-- ════════════════════════════════════════════════════════════════════
-- LES DROITS — APRÈS LE DERNIER `create`
-- ════════════════════════════════════════════════════════════════════
revoke all on function public.spot_rules() from public;
grant execute on function public.spot_rules() to anon, authenticated, service_role;

revoke all on function public.spot_publish(text,text[],uuid[],bigint[],boolean,timestamptz,integer,text,double precision,double precision,text,integer,text,text,text,text) from public, anon;
grant execute on function public.spot_publish(text,text[],uuid[],bigint[],boolean,timestamptz,integer,text,double precision,double precision,text,integer,text,text,text,text) to authenticated, service_role;

revoke all on function public.spots_radar(double precision,double precision,integer,text,text,boolean,integer,text,text) from public;
grant execute on function public.spots_radar(double precision,double precision,integer,text,text,boolean,integer,text,text)
  to anon, authenticated, service_role;

revoke all on function public.my_space() from public, anon;
grant execute on function public.my_space() to authenticated, service_role;

revoke all on function public.spots_globe(text,text,text,text) from public;
grant execute on function public.spots_globe(text,text,text,text) to anon, authenticated, service_role;

revoke all on function public._demo_seed_world() from public, anon, authenticated;
grant execute on function public._demo_seed_world() to service_role;
revoke all on function public.demo_seed() from public, anon, authenticated;
grant execute on function public.demo_seed() to service_role;
