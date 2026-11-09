/* ══ LE CŒUR DE LA LECTURE APPREND LA PARENTÉ · 09/11/2026 ═══════════════════════════════════════
   Deux filtres de plus, rien de retiré :
     `akin`      = une Habit du Totehm du lecteur → les spots dont la Habit lui RESSEMBLE, les plus
                   proches d'abord ; chaque spot rend `kin` {score, why} pour que l'écran le DISE.
                   (`habit` reste le filtre EXACT : les deux ne se mélangent pas.)
     `akin_min`  = le seuil (0.30 par défaut : « Lift heavy » répond à « Run every morning », pas « Read »).
     `mode`      = silent | social — figher.club sert à se rencontrer : on doit pouvoir ne voir que
                   ceux avec qui on peut parler. */
create or replace function public._club_spots_core(p_owner uuid, p_period text, p_filters jsonb,
  p_lat double precision, p_lng double precision, p_limit integer, p_offset integer, p_as_of timestamp with time zone)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid(); f jsonb := coalesce(p_filters, '{}'::jsonb);
  v_fig boolean := case when auth.uid() is null then false else public._is_figher(auth.uid()) end;
  v_at timestamptz := least(coalesce(p_as_of, now()), now());
  v_habit text := nullif(lower(btrim(f->>'habit')), '');
  v_city text := nullif(lower(btrim(f->>'city')), '');
  v_type text := coalesce(nullif(f->>'type', ''), 'all');
  v_scope text := coalesce(nullif(f->>'scope', ''), 'world');
  v_mode text := coalesce(nullif(f->>'mode', ''), 'all');
  v_akin text := nullif(btrim(f->>'akin'), '');
  v_akin_ints text[] := '{}'::text[];
  v_akin_min numeric := 0.30;
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
     or v_scope not in ('world','near') or v_mode not in ('all','silent','social') then
    return jsonb_build_object('ok', false, 'why', 'filters', 'items', '[]'::jsonb, 'spots', '[]'::jsonb);
  end if;
  if v_scope = 'near' then
    if p_lat is null or p_lng is null or not (p_lat between -90 and 90 and p_lng between -180 and 180) then
      return jsonb_build_object('ok', false, 'why', 'location', 'items', '[]'::jsonb, 'spots', '[]'::jsonb);
    end if;
    v_lat := round(p_lat::numeric, 1)::double precision;
    v_lng := round(p_lng::numeric, 1)::double precision;
    if jsonb_typeof(f->'radius_km') = 'number' then
      v_radius := greatest(1, least((f->>'radius_km')::double precision, 500));
    end if;
  end if;
  /* La parenté : les intentions viennent du SERVEUR (le Totehm du lecteur), jamais de la page ;
     une Habit qui n'est pas la sienne garde son texte et perd ses intentions, sans refus. */
  if v_akin is not null then
    v_akin := left(v_akin, 200);
    if v_me is not null then v_akin_ints := public._habit_ints(v_me, v_akin); end if;
    if jsonb_typeof(f->'akin_min') = 'number' then
      v_akin_min := greatest(0, least((f->>'akin_min')::numeric, 1));
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
       and (p_owner is null or p.user_id = p_owner)
       and public._audience_ok(p.user_id, p.audience, v_me, v_fig)
       and case p_period
             when 'past' then p.starts_at + make_interval(mins => p.duration_min) <= v_at
             when 'now' then p.starts_at <= v_at and p.starts_at + make_interval(mins => p.duration_min) > v_at
             when 'future' then p.starts_at > v_at end
       and (v_habit is null or lower(btrim(p.habit)) = v_habit)
       and (v_city is null or lower(btrim(p.city)) = v_city)
       and (v_mode = 'all' or p.mode = v_mode)
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
    select p, public._club_spot_view(p, v_me, v_at) as item,
           case when v_akin is null then null
                else public._habit_kin(v_akin, v_akin_ints, (p).habit, (p).intentions) end as kin
      from readable
  ), filtered as materialized (
    select * from projected
     where (v_akin is null or (kin->>'score')::numeric >= v_akin_min)
       and (cardinality(v_rhythms) = 0 or lower(item->>'freq') = any(v_rhythms))
       and (cardinality(v_objs) = 0 or exists (
         select 1 from jsonb_array_elements(item->'habit_box'->'objectives') o
          where public._space_words(o->>'text') && v_objs))
       and (cardinality(v_reps) = 0 or exists (
         select 1 from jsonb_array_elements(item->'habit_box'->'repulsions') r
          where public._space_words(r->>'text') && v_reps))
  ), page as (
    select case when kin is null then item else item || jsonb_build_object('kin', kin) end as item,
      row_number() over (order by
        case when v_akin is not null then -(kin->>'score')::numeric end asc nulls last,
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
end $function$;
