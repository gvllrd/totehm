-- TOTEHM · le miroir du Higher Self (22/10/2026)
-- why : Wah — « il faut aussi bien prendre en compte les boxes Habit : on demande un WHERE, les intentions et le type
--       de son ; il faut que le LLM reprenne tout cela et le formule à sa sauce… un superbe miroir, un superbe Higher
--       Self ». `_bot_memory` ne donnait que des listes plates : ni le lieu d'une Habit, ni le son de ses intentions,
--       ni les liens entre les boxes (l'objectif qu'une Habit sert, la répulsion qui la menace, ce que mon histoire
--       enseigne), ni les lieux réels où faire le geste.
-- how : deux fonctions NEUVES (aucun `create or replace`), lues par `higher-self` seulement (service role) :
--       `_bot_mirror(user)`  le TOTEHM RELIÉ, les cinq vues en un système : chaque Habit avec son where, ses
--                            intentions, son rythme, l'objectif qu'elle sert, la répulsion qui la menace, ses médias
--                            et son dernier spot ; chaque objectif avec son échéance, sa vision, ses Habits, son
--                            enseignement ; chaque répulsion avec son obstacle, ses Habits, son enseignement ; chaque
--                            vision avec ses objectifs ; MY STORY et ce qu'elle enseigne ; un son par intention.
--       `_mirror_places(user, lat, lng)`  des lieux RÉELS déjà en cache (Google, `places`, 8 km) et des événements à
--                            venir (Ticketmaster, `live_events`, 14 jours, 30 km) qui partagent une de mes intentions —
--                            zéro appel payant ici. Sans position donnée : le point de mon dernier spot ; sans spot :
--                            rien (jamais une ville inventée). La distance est écrite en clair (haversine) : les
--                            fonctions d'`earthdistance` ne se résolvent pas sous un `search_path` vide.
-- what : jsonb · jsonb. Aucune écriture.

create function public._bot_mirror(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with st as (
    select s, btrim(s->>'t') as t
      from public.totehms tt, jsonb_array_elements(coalesce(tt.steps, '[]'::jsonb)) s
     where tt.user_id = p_user and btrim(coalesce(s->>'t', '')) <> ''
  ),
  obj as (
    select o.* from public.objectives o
     where o.user_id = p_user and btrim(coalesce(o.text, '')) <> ''
       and coalesce(o.status, 'active') not in ('achieved', 'abandoned', 'converted')
  ),
  rep as (
    select r.* from public.repulsions r
     where r.user_id = p_user and r.active and btrim(coalesce(r.repulsion, '')) <> ''
  ),
  vis as (select v.* from public.visions v where v.user_id = p_user and btrim(coalesce(v.text, '')) <> ''),
  wis as (select w.* from public.wisdom w where w.user_id = p_user and btrim(coalesce(w.text, '')) <> ''),
  -- une Habit sert un objectif : la table de jointure OU le champ `o` de son step
  oh as (
    select x.habit_text as h, x.objective_id as oid from public.objective_habits x where x.user_id = p_user
    union
    select st.t, (st.s->>'o')::uuid from st where (st.s->>'o') ~ '^[0-9a-fA-F-]{36}$'
  ),
  -- une répulsion menace une Habit : son champ `habit_text` OU la table de jointure
  rh as (
    select r.habit_text as h, r.id as rid from rep r where nullif(btrim(r.habit_text), '') is not null
    union
    select x.habit_text, x.repulsion_id from public.repulsion_habits x where x.user_id = p_user
  )
  select jsonb_build_object(
    'habits', coalesce((select jsonb_agg(jsonb_build_object(
        'text', st.t,
        'is', to_jsonb(public._step_intentions(st.s)),
        'freq', nullif(st.s->>'f', ''),
        'where', (select nullif(btrim(hs.place), '') from public.habit_spots hs where hs.user_id = p_user and hs.habit_text = st.t),
        'objectives', coalesce((select jsonb_agg(distinct o.text) from oh join obj o on o.id = oh.oid where oh.h = st.t), '[]'::jsonb),
        'repulsions', coalesce((select jsonb_agg(distinct r.repulsion) from rh join rep r on r.id = rh.rid where rh.h = st.t), '[]'::jsonb),
        'media', (select count(*) from public.element_media m
                   where m.user_id = p_user and m.kind = 'h' and m.ref = st.t and m.removed_at is null),
        'spot', (select jsonb_build_object(
                    'state', case when p.starts_at > now() then 'will'
                                  when now() < p.starts_at + make_interval(mins => coalesce(p.duration_min, 60)) then 'am'
                                  else 'was' end,
                    'city', p.city, 'at', p.starts_at)
                   from public.spot_plans p
                  where p.user_id = p_user and p.habit = st.t and p.status = 'published'
                  order by p.starts_at desc limit 1))) from st), '[]'::jsonb),
    'objectives', coalesce((select jsonb_agg(jsonb_build_object(
        'text', o.text, 'is', to_jsonb(o."is"), 'by', o.target_at,
        'days_left', case when o.target_at is null then null
                          else (o.target_at::date - (now() at time zone 'UTC')::date) end,
        'habits', coalesce((select jsonb_agg(distinct oh.h) from oh where oh.oid = o.id), '[]'::jsonb),
        'visions', coalesce((select jsonb_agg(v.text) from public.objective_visions ov join vis v on v.id = ov.vision_id
                              where ov.user_id = p_user and ov.objective_id = o.id), '[]'::jsonb),
        'teachings', coalesce((select jsonb_agg(w.text) from public.teaching_objectives tob join wis w on w.id = tob.wisdom_id
                                where tob.user_id = p_user and tob.objective_id = o.id), '[]'::jsonb))
      order by o.target_at nulls last, o.created_at) from obj o), '[]'::jsonb),
    'repulsions', coalesce((select jsonb_agg(jsonb_build_object(
        'text', r.repulsion, 'obstacle', nullif(btrim(r.obstacle), ''), 'is', to_jsonb(r."is"),
        'habits', coalesce((select jsonb_agg(distinct rh.h) from rh where rh.rid = r.id), '[]'::jsonb),
        'teachings', coalesce((select jsonb_agg(w.text) from public.repulsion_teachings rt join wis w on w.id = rt.wisdom_id
                                where rt.user_id = p_user and rt.repulsion_id = r.id), '[]'::jsonb))
      order by r.created_at) from rep r), '[]'::jsonb),
    'visions', coalesce((select jsonb_agg(jsonb_build_object(
        'text', v.text, 'is', to_jsonb(v."is"),
        'objectives', coalesce((select jsonb_agg(o.text) from public.objective_visions ov join obj o on o.id = ov.objective_id
                                 where ov.user_id = p_user and ov.vision_id = v.id), '[]'::jsonb))
      order by v.importance nulls last, v.created_at) from vis v), '[]'::jsonb),
    'wisdom', coalesce((select jsonb_agg(jsonb_build_object(
        'text', w.text, 'is', to_jsonb(w."is"),
        'objectives', coalesce((select jsonb_agg(o.text) from public.teaching_objectives tob join obj o on o.id = tob.objective_id
                                 where tob.user_id = p_user and tob.wisdom_id = w.id), '[]'::jsonb),
        'repulsions', coalesce((select jsonb_agg(r.repulsion) from public.repulsion_teachings rt join rep r on r.id = rt.repulsion_id
                                 where rt.user_id = p_user and rt.wisdom_id = w.id), '[]'::jsonb))
      order by w.importance nulls last, w.created_at) from wis w), '[]'::jsonb),
    'sounds', coalesce((select jsonb_object_agg(m.intention, jsonb_build_object(
        'kind', nullif(btrim(m.title), ''), 'artist', nullif(btrim(m.artist), ''), 'platform', m.platform))
       from public.intention_music m where m.user_id = p_user and m.active), '{}'::jsonb));
$$;

create function public._mirror_places(p_user uuid, p_lat double precision default null, p_lng double precision default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lat double precision := p_lat;
  v_lng double precision := p_lng;
  v_src text := 'page';
  v_ints text[];
  v_items jsonb;
begin
  if v_lat is null or v_lng is null or abs(v_lat) > 90 or abs(v_lng) > 180 then
    select coalesce(p.lat, p.clat), coalesce(p.lng, p.clng) into v_lat, v_lng
      from public.spot_plans p
     where p.user_id = p_user and coalesce(p.lat, p.clat) is not null and coalesce(p.lng, p.clng) is not null
     order by p.starts_at desc limit 1;
    v_src := 'spot';
  end if;
  if v_lat is null or v_lng is null then
    return jsonb_build_object('origin', null, 'items', '[]'::jsonb);
  end if;

  select array_agg(distinct i) into v_ints
    from public.totehms tt, jsonb_array_elements(coalesce(tt.steps, '[]'::jsonb)) s, unnest(public._step_intentions(s)) i
   where tt.user_id = p_user and btrim(coalesce(s->>'t', '')) <> '';
  v_ints := coalesce(v_ints, '{}'::text[]);

  with pl as (
    select p.place_id, p.name, p.lieu_type, p.address, p.lat, p.lng, p.intentions, p.rating,
           2 * 6371000 * asin(least(1, sqrt(power(sin(radians(p.lat - v_lat) / 2), 2)
             + cos(radians(v_lat)) * cos(radians(p.lat)) * power(sin(radians(p.lng - v_lng) / 2), 2)))) as d
      from public.places p
     where p.lat between v_lat - 0.08 and v_lat + 0.08
       and p.lng between v_lng - 0.08 / greatest(cos(radians(v_lat)), 0.2) and v_lng + 0.08 / greatest(cos(radians(v_lat)), 0.2)
       and (cardinality(v_ints) = 0 or p.intentions && v_ints)
  ),
  pl2 as (
    select pl.*, row_number() over (partition by coalesce(pl.lieu_type, '') order by pl.d) as k
      from pl where pl.d <= 8000
  ),
  pl3 as (select pl2.*, row_number() over (order by pl2.d) as n from pl2 where pl2.k <= 2 order by pl2.d limit 10),
  ev as (
    select e.event_id, e.name, e.venue_name, e.city, e.starts_at, e.url, e.lat, e.lng, e.intentions,
           2 * 6371000 * asin(least(1, sqrt(power(sin(radians(e.lat - v_lat) / 2), 2)
             + cos(radians(v_lat)) * cos(radians(e.lat)) * power(sin(radians(e.lng - v_lng) / 2), 2)))) as d
      from public.live_events e
     where e.starts_at > now() and e.starts_at < now() + interval '14 days'
       and e.lat is not null and e.lng is not null
       and e.lat between v_lat - 0.3 and v_lat + 0.3
       and (cardinality(v_ints) = 0 or e.intentions && v_ints)
  ),
  ev2 as (select ev.*, row_number() over (order by ev.starts_at) as n from ev where ev.d <= 30000 order by ev.starts_at limit 4)
  select coalesce((select jsonb_agg(jsonb_build_object(
             'id', 'P' || pl3.n, 'kind', 'place', 'ref', pl3.place_id, 'name', pl3.name, 'type', pl3.lieu_type,
             'address', pl3.address, 'lat', pl3.lat, 'lng', pl3.lng, 'km', round((pl3.d / 1000.0)::numeric, 1),
             'is', to_jsonb(pl3.intentions), 'rating', pl3.rating) order by pl3.n) from pl3), '[]'::jsonb)
      || coalesce((select jsonb_agg(jsonb_build_object(
             'id', 'E' || ev2.n, 'kind', 'event', 'ref', ev2.event_id, 'name', ev2.name, 'venue', ev2.venue_name,
             'city', ev2.city, 'at', ev2.starts_at, 'url', ev2.url, 'lat', ev2.lat, 'lng', ev2.lng,
             'km', round((ev2.d / 1000.0)::numeric, 1), 'is', to_jsonb(ev2.intentions)) order by ev2.n) from ev2), '[]'::jsonb)
    into v_items;

  return jsonb_build_object('origin', jsonb_build_object('source', v_src), 'items', v_items);
end $$;

-- Les grants APRÈS le dernier create : le service role seul (la fonction `higher-self`), jamais une page.
revoke all on function public._bot_mirror(uuid) from public, anon, authenticated;
revoke all on function public._mirror_places(uuid, double precision, double precision) from public, anon, authenticated;
grant execute on function public._bot_mirror(uuid) to service_role;
grant execute on function public._mirror_places(uuid, double precision, double precision) to service_role;
