-- FIGHER CLUB · 15/10/2026 — un Totehm complet ; découverte temporelle commune.
-- Additive : ne change ni propriétaire, prix, exemplaire, réservation, règlement,
-- abonnement créateur, ni les anciens lecteurs utilisés par COM.
-- Appliquer après 20261013101000 ; ne jamais utiliser db push sur cet historique.

-- Les portes commerciales sont détachées de _figher ci-dessous AVANT sa nouvelle règle.

-- Preserve the paid/art passport of 02/10/2026 independently of free Club membership.
-- This helper deliberately does not use _figher or _is_figher.
-- Existing gifted access remains valid; annual membership was already irrelevant on 02/10.
create or replace function public._art_passport(p_user uuid)
returns boolean
language plpgsql stable security definer set search_path to ''
as $function$
declare v_email text; v_habit boolean; v_thp boolean; v_comp boolean := false;
begin
  if p_user is null then return false; end if;
  v_habit := coalesce((public.totehm_complete(p_user)->>'habits')::boolean, false);
  select lower(u.email) into v_email from auth.users u where u.id = p_user;
  v_thp := public._art_owns_thp(p_user);
  if v_email is not null then
    select exists (select 1 from public.figher_comps c
                    where c.email = v_email and (c.expires_at is null or c.expires_at > now()))
      into v_comp;
  end if;
  return v_comp or (v_thp and v_habit);
end $function$;

-- Keep the currently deployed function bodies, signatures and creator/subscriber rules.
-- Fail closed if any expected dependency has changed; no overloaded-name discovery or DROP.
-- Supports a repeat application only when the exact replacement has already been made.
do $paid_access$
declare r record; v_oid regprocedure; v_def text; v_old_count integer; v_new_count integer;
begin
  for r in
    select * from (values
      ('public.art_primary_reserve(text,uuid)',
       'public._is_figher(p_buyer)', 'public._art_passport(p_buyer)',
       '''thp_door'''),
      ('public.art_resale_reserve(uuid,uuid)',
       'public._is_figher(p_buyer)', 'public._art_passport(p_buyer)',
       'a.collection <> ''totehmpaper'''),
      ('public.market_view(text,text)',
       'public._is_figher(v_uid)', 'public._art_passport(v_uid)',
       'from (select public._figher(v_uid) f) x)'),
      ('public.reveal_cloth(text)',
       'public._is_figher(v_me)', 'public._art_passport(v_me)',
       'public.is_subscribed_to(v_user)'),
      ('public.my_entitlements()',
       'v_member := coalesce((v_f->>''member'')::boolean, false);',
       'v_member := public._art_passport(v_uid);',
       '''market_art'',    coalesce((v_f->>''thp'')::boolean, false)')
    ) as patches(signature, old_call, new_call, required_marker)
  loop
    v_oid := to_regprocedure(r.signature);
    if v_oid is null then raise exception 'Paid access: missing %', r.signature; end if;
    if not exists (select 1 from pg_proc where oid = v_oid and prosecdef and prorettype = 'jsonb'::regtype) then
      raise exception 'Paid access: unexpected function properties in %', r.signature;
    end if;
    v_def := pg_get_functiondef(v_oid);
    if position(r.required_marker in v_def) = 0 then
      raise exception 'Paid access: current behavior marker missing in %', r.signature;
    end if;
    v_old_count := (length(v_def) - length(replace(v_def, r.old_call, ''))) / length(r.old_call);
    v_new_count := (length(v_def) - length(replace(v_def, r.new_call, ''))) / length(r.new_call);
    if v_old_count = 1 and v_new_count = 0 then
      execute replace(v_def, r.old_call, r.new_call);
    elsif v_old_count = 0 and v_new_count = 1 then
      null;
    else
      raise exception 'Paid access: unexpected dependency counts in % (old %, new %)',
        r.signature, v_old_count, v_new_count;
    end if;
    if position('public._is_figher(' in pg_get_functiondef(v_oid)) > 0 then
      raise exception 'Paid access: a free Club dependency remains in %', r.signature;
    end if;
  end loop;
end $paid_access$;

-- Existing client-facing and server-only boundaries, after all CREATE OR REPLACE operations.
revoke all on function public._art_passport(uuid) from public, anon, authenticated;
grant execute on function public._art_passport(uuid) to service_role;
revoke all on function public.art_primary_reserve(text,uuid) from public, anon, authenticated;
grant execute on function public.art_primary_reserve(text,uuid) to service_role;
revoke all on function public.art_resale_reserve(uuid,uuid) from public, anon, authenticated;
grant execute on function public.art_resale_reserve(uuid,uuid) to service_role;
revoke all on function public.market_view(text,text) from public;
grant execute on function public.market_view(text,text) to anon, authenticated, service_role;
revoke all on function public.reveal_cloth(text) from public;
grant execute on function public.reveal_cloth(text) to anon, authenticated, service_role;
revoke all on function public.my_entitlements() from public;
grant execute on function public.my_entitlements() to anon, authenticated, service_role;

-- CLUB_MEMBERSHIP_AND_DISCOVERY
create or replace function public._figher(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $f$
declare
  v_pass jsonb; v_email text; v_num int; v_thp boolean; v_st text; v_comp boolean := false;
begin
  if p_user is null then
    return jsonb_build_object('signed_in', false, 'complete', false, 'remplies', 0, 'habit', false,
      'thp', false, 'number', null, 'annual', false, 'trial', false, 'comp', false, 'member', false);
  end if;
  v_pass := public.totehm_complete(p_user);
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
    'habit', coalesce((v_pass->>'habits')::boolean, false),
    'views', jsonb_build_object(
      'habits', coalesce((v_pass->>'habits')::boolean, false),
      'objectives', coalesce((v_pass->>'objectives')::boolean, false),
      'repulsions', coalesce((v_pass->>'repulsions')::boolean, false),
      'wisdom', coalesce((v_pass->>'wisdom')::boolean, false),
      'visions', coalesce((v_pass->>'visions')::boolean, false)),
    -- Métadonnées conservées pour les consommateurs anciens : aucune de ces
    -- clés n'est une condition Club ; le numéro reste celui du THP possédé.
    'thp', v_thp, 'number', v_num, 'annual', coalesce(v_st in ('active','trialing'), false),
    'trial', coalesce(v_st = 'trialing', false), 'comp', v_comp,
    'member', coalesce((v_pass->>'complete')::boolean, false));
end $f$;

-- Une seule projection autorisée pour RADAR, SHORTS et la fiche. Le snapshot
-- brut n'est jamais envoyé : ses objectifs/répulsions/lieux peuvent être privés.
create or replace function public._club_spot_view(p public.spot_plans, p_viewer uuid, p_as_of timestamptz)
returns jsonb language sql stable security definer set search_path to ''
as $f$
  select s || jsonb_build_object(
    'state', case when p.starts_at > p_as_of then 'will'
                  when p.starts_at + make_interval(mins => p.duration_min) > p_as_of then 'am' else 'was' end,
    'habit_box', jsonb_build_object(
      'name', p.habit, 'ints', s->'intentions', 'freq', s->'freq',
      'step', jsonb_strip_nulls(jsonb_build_object('t', p.habit, 'is', s->'intentions', 'f', s->'freq')),
      'place', s->'exact'->'place',
      'objectives', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
          'text', o.v->>'text', 'is', o.v->'is')) order by o.n), '[]'::jsonb)
        from jsonb_array_elements(coalesce(p.snapshot->'objectives', '[]'::jsonb)) with ordinality o(v,n)
       where btrim(coalesce(o.v->>'text','')) <> ''
         and (p.user_id = p_viewer or coalesce(s->'why'->'objectives', '[]'::jsonb)
              @> jsonb_build_array(jsonb_build_object('text', o.v->>'text')))
         and not coalesce(p.snapshot->'hide'->'objectives', '[]'::jsonb) @> to_jsonb((o.n-1)::int)),
      'repulsions', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
          'text', r.v->>'text', 'is', r.v->'is')) order by r.n), '[]'::jsonb)
        from jsonb_array_elements(coalesce(p.snapshot->'repulsions', '[]'::jsonb)) with ordinality r(v,n)
       where btrim(coalesce(r.v->>'text','')) <> ''
         and (p.user_id = p_viewer or coalesce(s->'why'->'repulsions', '[]'::jsonb)
              @> jsonb_build_array(jsonb_build_object('text', r.v->>'text')))
         and not coalesce(p.snapshot->'hide'->'repulsions', '[]'::jsonb) @> to_jsonb((r.n-1)::int))))
    from (select public._spot_view(p, p_viewer) as s) q;
$f$;

-- Toutes les dimensions filtrent l'ensemble autorisé AVANT la pagination.
-- OU au sein d'une dimension, ET entre dimensions ; aucune lecture des
-- mini-boxes cachées pour filtrer (sinon le résultat deviendrait un oracle).
create or replace function public.club_spots(
  p_period text default 'now', p_filters jsonb default '{}'::jsonb,
  p_lat double precision default null, p_lng double precision default null,
  p_limit integer default 40, p_offset integer default 0, p_as_of timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $f$
declare
  v_me uuid := auth.uid(); f jsonb := coalesce(p_filters, '{}'::jsonb);
  v_fig boolean := case when auth.uid() is null then false else public._is_figher(auth.uid()) end;
  v_at timestamptz := least(coalesce(p_as_of, now()), now());
  v_habit text := nullif(lower(btrim(f->>'habit')), '');
  v_city text := nullif(lower(btrim(f->>'city')), '');
  v_type text := coalesce(nullif(f->>'type', ''), 'all');
  v_scope text := coalesce(nullif(f->>'scope', ''), 'world');
  v_ints text[]; v_pillars text[]; v_rhythms text[]; v_objs text[]; v_reps text[];
  v_lat double precision; v_lng double precision; v_radius double precision := 50;
  v_lim int := greatest(1, least(coalesce(p_limit, 40), 100));
  v_off int := greatest(0, coalesce(p_offset, 0));
  v_items jsonb; v_total bigint;
begin
  if p_period is null or p_period not in ('past','now','future') then
    return jsonb_build_object('ok', false, 'why', 'period', 'items', '[]'::jsonb, 'spots', '[]'::jsonb);
  end if;
  if jsonb_typeof(f) <> 'object' or v_type not in ('all','photo','video','none','why')
     or v_scope not in ('world','near') then
    return jsonb_build_object('ok', false, 'why', 'filters', 'items', '[]'::jsonb, 'spots', '[]'::jsonb);
  end if;
  if v_scope = 'near' then
    if p_lat is null or p_lng is null or not (p_lat between -90 and 90 and p_lng between -180 and 180) then
      return jsonb_build_object('ok', false, 'why', 'location', 'items', '[]'::jsonb, 'spots', '[]'::jsonb);
    end if;
    -- Arrondi identique à SPACE : le filtre « près » porte sur la ville,
    -- jamais sur le point protégé, et ne renvoie ni distance ni cap.
    v_lat := round(p_lat::numeric, 1)::double precision;
    v_lng := round(p_lng::numeric, 1)::double precision;
    if jsonb_typeof(f->'radius_km') = 'number' then
      v_radius := greatest(1, least((f->>'radius_km')::double precision, 500));
    end if;
  end if;
  select coalesce(array_agg(distinct lower(btrim(x))), '{}'::text[]) into v_ints
    from jsonb_array_elements_text(case when jsonb_typeof(f->'intentions') = 'array' then f->'intentions' else '[]'::jsonb end) x;
  select coalesce(array_agg(distinct lower(btrim(x))), '{}'::text[]) into v_pillars
    from jsonb_array_elements_text(case when jsonb_typeof(f->'pillars') = 'array' then f->'pillars' else '[]'::jsonb end) x;
  select coalesce(array_agg(distinct lower(btrim(x))), '{}'::text[]) into v_rhythms
    from jsonb_array_elements_text(case when jsonb_typeof(f->'rhythms') = 'array' then f->'rhythms' else '[]'::jsonb end) x;
  select coalesce(array_agg(distinct w), '{}'::text[]) into v_objs
    from jsonb_array_elements_text(case when jsonb_typeof(f->'objectives') = 'array' then f->'objectives' else '[]'::jsonb end) x,
         unnest(public._space_words(left(x, 200))) w;
  select coalesce(array_agg(distinct w), '{}'::text[]) into v_reps
    from jsonb_array_elements_text(case when jsonb_typeof(f->'repulsions') = 'array' then f->'repulsions' else '[]'::jsonb end) x,
         unnest(public._space_words(left(x, 200))) w;

  with readable as materialized (
    select p from public.spot_plans p
     where p.status = 'published' and p.format = 'spot' and p.created_at <= v_at
       -- _audience_ok inclut l'abonné réel, sans condition Club additionnelle.
       and public._audience_ok(p.user_id, p.audience, v_me, v_fig)
       and case p_period
             when 'past' then p.starts_at + make_interval(mins => p.duration_min) <= v_at
             when 'now' then p.starts_at <= v_at and p.starts_at + make_interval(mins => p.duration_min) > v_at
             when 'future' then p.starts_at > v_at end
       and (v_habit is null or lower(btrim(p.habit)) = v_habit)
       and (v_city is null or lower(btrim(p.city)) = v_city)
       and (cardinality(v_ints) = 0 or p.intentions && v_ints)
       and (cardinality(v_pillars) = 0 or exists (
         select 1 from unnest(p.intentions) i where lower(public._pillar(i)) = any(v_pillars)))
       and (v_scope <> 'near' or (p.clat is not null and p.clng is not null and
         earth_distance(ll_to_earth(v_lat, v_lng), ll_to_earth(round(p.clat::numeric,1)::double precision,
           round(p.clng::numeric,1)::double precision)) <= v_radius * 1000))
       and (v_type = 'all'
         or (v_type = 'photo' and p.photo is not null)
         or (v_type = 'video' and (p.video is not null or p.video_id is not null))
         or (v_type = 'none' and p.photo is null and p.video is null and p.video_id is null)
         or (v_type = 'why' and p.visibility = 'shared' and
           (coalesce((p.snapshot->>'show_objectives')::boolean, p.show_why)
            or coalesce((p.snapshot->>'show_repulsions')::boolean, p.show_why))))
  ), projected as materialized (
    select p, public._club_spot_view(p, v_me, v_at) as item from readable
  ), filtered as materialized (
    select * from projected
     where (cardinality(v_rhythms) = 0 or lower(item->>'freq') = any(v_rhythms))
       and (cardinality(v_objs) = 0 or exists (
         select 1 from jsonb_array_elements(item->'habit_box'->'objectives') o
          where public._space_words(o->>'text') && v_objs))
       and (cardinality(v_reps) = 0 or exists (
         select 1 from jsonb_array_elements(item->'habit_box'->'repulsions') r
          where public._space_words(r->>'text') && v_reps))
  ), page as (
    select item, row_number() over (order by
      case when p_period = 'future' then (p).starts_at end asc,
      case when p_period <> 'future' then (p).starts_at end desc, (p).spot_id) as n
      from filtered
  )
  select (select count(*) from filtered), coalesce((
    select jsonb_agg(item order by n) from page where n > v_off and n <= v_off::bigint + v_lim), '[]'::jsonb)
    into v_total, v_items;
  return jsonb_build_object('ok', true, 'signed_in', v_me is not null, 'period', p_period,
    'items', v_items, 'spots', v_items, 'total', v_total,
    'has_more', v_off::bigint + v_lim < v_total, 'more', v_off::bigint + v_lim < v_total,
    'next_offset', v_off::bigint + jsonb_array_length(v_items), 'as_of', v_at);
end $f$;

create index if not exists spot_plans_club_when_idx
  on public.spot_plans (starts_at, spot_id) where status = 'published' and format = 'spot';

revoke all on function public._figher(uuid), public._club_spot_view(public.spot_plans, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public._figher(uuid), public._club_spot_view(public.spot_plans, uuid, timestamptz) to service_role;
revoke all on function public.club_spots(text, jsonb, double precision, double precision, integer, integer, timestamptz) from public;
grant execute on function public.club_spots(text, jsonb, double precision, double precision, integer, integer, timestamptz)
  to anon, authenticated, service_role;
