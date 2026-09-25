-- ════════════════════════════════════════════════════════════════════
-- 20260925 · TOTEHM.SPACE — LA MANETTE · LA BOÎTE-ACTION · LES LIMITES
-- ════════════════════════════════════════════════════════════════════
-- Trois changements, tous ADDITIFS : la page d'hier continue de marcher
-- avec cette base. C'est ce qui permet de migrer AVANT de pousser la page.
--
--   A · `spot_rules()` — les règles d'un Spot sont une FONCTION (même
--       doctrine que `payout_rules()`), et `spot_publish` la lit. La page
--       affiche « 2 / 10 upcoming » sans connaître le 10.
--   B · `spots_radar` — trois fenêtres de temps de plus pour la vue
--       « Tomorrow & beyond » de la manette : `tomorrow`, `next7`, `later`.
--       Aucune ne contient AUJOURD'HUI : aujourd'hui, c'est le centre
--       (« Live & today », `p_when = 'today'`).
--   C · `my_space` — ce qu'il faut pour dessiner la BOÎTE-ACTION d'un Spot
--       (le lieu cliquable, le mot du créateur, la sélection, l'accès) et
--       les LIMITES du membre (`limits`).
--
-- ⚠️ LE LIEU EXACT RESTE AU CRÉATEUR ET AUX ACCEPTÉS. `exact` n'apparaît
-- dans `my_space` que pour mes Spots et pour une candidature ACCEPTÉE sur un
-- Spot publié — la même règle que `spots_radar`.
-- ⚠️ `create or replace` : on redonne les droits en fin de fichier, après
-- le dernier `create` (règle du projet, `record_push`).


-- ════════════════════════════════════════════════════════════════════
-- A · LES RÈGLES D'UN SPOT
-- ════════════════════════════════════════════════════════════════════
create or replace function public.spot_rules()
returns jsonb language sql immutable set search_path to 'public'
as $f$
  select jsonb_build_object(
    'max_upcoming', 10,     -- Spots publiés et pas encore finis, par membre
    'capacity_min', 1,  'capacity_max', 50,
    'duration_min', 5,  'duration_max', 720,
    'horizon_days', 90);
$f$;


-- ════════════════════════════════════════════════════════════════════
-- A bis · `spot_publish` LIT LES RÈGLES — corps identique au déployé du
-- 24/09, seuls les chiffres viennent de `spot_rules()`.
-- ════════════════════════════════════════════════════════════════════
create or replace function public.spot_publish(
  p_habit text, p_intentions text[], p_objectives uuid[], p_repulsions bigint[], p_mood boolean,
  p_starts_at timestamptz, p_duration_min integer, p_place text, p_lat double precision,
  p_lng double precision, p_mode text, p_capacity integer, p_access text, p_selection text,
  p_comment text)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid(); v_steps jsonb; v_s jsonb; v_his text[]; v_is text[];
  v_objs jsonb; v_reps jsonb; v_mood jsonb; v_id uuid; v_cp public.creator_profiles%rowtype;
  v_r jsonb := public.spot_rules();
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

  insert into public.spots(user_id, intention, activite, commentaire, lat, lng,
                           duration_min, expires_at, is_public, required_role,
                           energy_mode, active)
  values (v_uid, coalesce(v_is[1], 'focus'), left(p_habit, 80), null,
          round(p_lat::numeric, 3)::double precision, round(p_lng::numeric, 3)::double precision,
          p_duration_min, p_starts_at + make_interval(mins => p_duration_min),
          false, 'figher', p_mode, true)
  returning id into v_id;

  insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at,
                                duration_min, capacity, mode, access, selection, place,
                                lat, lng, comment)
  values (v_id, v_uid, p_habit, v_is,
          jsonb_build_object('habit', p_habit, 'intentions', to_jsonb(v_is),
                             'objectives', v_objs, 'repulsions', v_reps, 'mood', v_mood,
                             'freq', v_s->>'f', 'at', now()),
          p_starts_at, p_duration_min, p_capacity, p_mode, p_access, p_selection,
          left(btrim(p_place), 120), p_lat, p_lng, nullif(left(btrim(coalesce(p_comment,'')), 400), ''));

  return jsonb_build_object('ok', true, 'id', v_id,
    'lat', round(p_lat::numeric, 3), 'lng', round(p_lng::numeric, 3));
end $function$;


-- ════════════════════════════════════════════════════════════════════
-- B · `spots_radar` — LES FENÊTRES DE LA VUE « TOMORROW & BEYOND »
-- ════════════════════════════════════════════════════════════════════
-- Même signature que le 24/09 : `create or replace` remplace, il ne
-- surcharge pas. Corps identique au déployé, seule la clause `p_when`
-- grandit. Les bornes sont des MINUITS DE LISBONNE (`v_day_end`,
-- `v_day2_end`, `v_day8_end`) et non « minuit + 24 h » : un changement
-- d'heure ferait sinon glisser la fenêtre d'une heure deux fois par an.
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
            -- ⚠️ LES TROIS FENÊTRES DE LA MANETTE (droite) : jamais aujourd'hui.
            or (p_when = 'tomorrow' and p.starts_at >= v_day_end and p.starts_at < v_day2_end)
            or (p_when = 'next7'    and p.starts_at >= v_day_end and p.starts_at < v_day8_end)
            or (p_when = 'later'    and p.starts_at >= v_day_end))
  ), h as (
    -- LA BOTTE DE FOIN. Ce qu'un invité peut lire, il peut le chercher ;
    -- ce qu'il ne peut pas lire (qui, pourquoi, contre quoi), il ne peut
    -- pas le chercher non plus — sinon la recherche deviendrait un moyen
    -- de deviner le contexte caché, un mot à la fois.
    select c.*, lower(concat_ws(' ',
             c.habit, array_to_string(c.intentions, ' '),
             (select string_agg(public._pillar(x), ' ') from unnest(c.intentions) x),
             c.mode, replace(coalesce(c.snapshot->>'freq', ''), '_', ' '),
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
      'mode', k.mode, 'starts_at', k.starts_at, 'ends_at', k.ends_at,
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
      -- ⚠️ LE PASSEPORT D'ABORD, EN UN BOOLÉEN. On ne teste les trois clés
      -- que pour dire laquelle MANQUE à un non-membre ; un membre (même par
      -- comp) passe directement aux règles du Spot.
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


-- ════════════════════════════════════════════════════════════════════
-- C · `my_space` v3 — LA BOÎTE-ACTION ET LES LIMITES
-- ════════════════════════════════════════════════════════════════════
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
    -- MES LIMITES : ce que le serveur refusera, dit AVANT qu'il le refuse.
    'limits', jsonb_build_object(
      'upcoming', (select count(*) from public.spot_plans
                    where user_id = v_uid and status = 'published'
                      and starts_at + make_interval(mins => duration_min) > now()),
      'max_upcoming', (v_r->>'max_upcoming')::int),
    'spots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.spot_id, 'habit', p.habit, 'intentions', to_jsonb(p.intentions),
        'starts_at', p.starts_at, 'duration_min', p.duration_min, 'mode', p.mode,
        'capacity', p.capacity, 'access', p.access, 'selection', p.selection,
        'status', p.status, 'place', p.place, 'comment', p.comment,
        'mood', p.snapshot->'mood'->>'title',
        'live', now() between p.starts_at and p.starts_at + make_interval(mins => p.duration_min),
        'past', now() > p.starts_at + make_interval(mins => p.duration_min),
        'taken',   (select count(*) from public.spot_applications a where a.spot_id = p.spot_id and a.status = 'accepted'),
        'pending', (select count(*) from public.spot_applications a where a.spot_id = p.spot_id and a.status = 'pending'),
        'lat', s.lat, 'lng', s.lng,
        -- Mon Spot : le point exact est à moi.
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
        'duration_min', p.duration_min, 'mode', p.mode, 'status', a.status,
        'spot_status', p.status, 'creator', pr.pseudo,
        'intentions', to_jsonb(p.intentions), 'freq', p.snapshot->>'freq',
        'context', p.snapshot - 'at', 'demo', p.demo, 'capacity', p.capacity,
        'selection', p.selection, 'access', p.access, 'comment', p.comment,
        'mood', p.snapshot->'mood'->>'title',
        'taken', (select count(*) from public.spot_applications x where x.spot_id = p.spot_id and x.status = 'accepted'),
        -- La position publique (~110 m) pour tous ; le point exact et son
        -- nom seulement une fois accepté, sur un Spot encore publié.
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
-- LES DROITS — APRÈS LE DERNIER `create`
-- ════════════════════════════════════════════════════════════════════
revoke all on function public.spot_rules() from public;
grant execute on function public.spot_rules() to anon, authenticated, service_role;

revoke all on function public.spot_publish(text,text[],uuid[],bigint[],boolean,timestamptz,integer,text,double precision,double precision,text,integer,text,text,text) from public, anon;
grant execute on function public.spot_publish(text,text[],uuid[],bigint[],boolean,timestamptz,integer,text,double precision,double precision,text,integer,text,text,text) to authenticated, service_role;

revoke all on function public.spots_radar(double precision,double precision,integer,text,text,boolean,integer,text,text) from public;
grant execute on function public.spots_radar(double precision,double precision,integer,text,text,boolean,integer,text,text)
  to anon, authenticated, service_role;

revoke all on function public.my_space() from public, anon;
grant execute on function public.my_space() to authenticated, service_role;
