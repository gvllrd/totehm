-- LOT K (20/10/2026 sexies) — L'ÉCOSYSTÈME D'UN MEMBRE
-- Wah : « quand on cherche un Totehm (MEMBERS) … dès qu'il entre et que l'utilisateur est validé, on
-- retombe dans l'écosystème, mais cette fois ce n'est plus le nôtre, c'est celui d'un membre ».
-- L'écosystème = ses cinq vues : son processeur (`totehm_of`, inchangé), ses MÉDIAS à gauche, ses SPOTS
-- à droite. Ce fichier ajoute les deux lecteurs qui manquaient. ADDITIF : quatre fonctions neuves, une
-- politique de lecture neuve, aucun `drop`, aucun `create or replace` sur une fonction existante (ceux-là ne
-- passent pas depuis le cloud, mesuré le 18/10), aucun prix.
--
-- 1 · LA RÈGLE D'UN MÉDIA D'ÉLÉMENT : il se lit si SA BOX se lit (la confidentialité est PAR BOX, 18/10).
--     `element_media.kind` dit « o » pour un objectif ; `_box_audience` dit « t » : on traduit ici.
--     La vignette (`<chemin>.jpg`, lot J) suit son média.
create function public._element_media_readable(p_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.element_media m
     where m.removed_at is null
       and (m.path = p_name or m.path || '.jpg' = p_name)
       and (m.user_id = auth.uid()
            or public._box_shared(m.user_id,
                 public._box_audience(m.user_id, case m.kind when 'o' then 't' else m.kind end, m.ref))));
$$;

-- 2 · LE SEAU : MON dossier (politique existante) OU un média dont la box m'est partagée (lecture seule).
create policy "element-media read shared box" on storage.objects
  for select to authenticated
  using (bucket_id = 'element-media' and public._element_media_readable(name));

-- 3 · LES MÉDIAS D'UN MEMBRE : ceux dont l'élément existe encore ET dont la box m'est partagée.
--     Jamais le nom du fichier (« Visualize it ») ; un membre qui se lit lui-même voit tout.
create function public.member_media(p_pseudo text)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare v_me uuid := auth.uid(); v_uid uuid;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select p.id into v_uid from public.profiles p
   where lower(p.pseudo) = lower(btrim(coalesce(p_pseudo, ''))) limit 1;
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;
  return jsonb_build_object('ok', true, 'items', coalesce((
    select jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'ref', m.ref, 'path', m.path,
                                        'mime', m.mime, 'created_at', m.created_at) order by m.created_at desc)
      from (select * from public.element_media x
             where x.user_id = v_uid and x.removed_at is null
               and public._element_ok(x.user_id, x.kind, x.ref)
               and (v_uid = v_me or public._box_shared(x.user_id,
                      public._box_audience(x.user_id, case x.kind when 'o' then 't' else x.kind end, x.ref)))
             order by x.created_at desc limit 600) m), '[]'::jsonb));
end $$;

-- 4 · LES SPOTS D'UN MEMBRE. `club_spots` n'a pas de filtre « auteur » et ne peut pas être remplacé d'ici :
--     son corps devient `_club_spots_core(p_owner, …)` — LE MÊME, plus `p_owner` (null = tout le monde).
--     `club_spots_of(pseudo, …)` l'appelle. ⚠️ Tant que `club_spots` n'a pas été rebranché sur le cœur
--     (terminal, CLAUDE_CODE.md), les deux corps DOIVENT rester identiques : toute retouche se fait aux deux.
create function public._club_spots_core(p_owner uuid, p_period text, p_filters jsonb, p_lat double precision,
  p_lng double precision, p_limit integer, p_offset integer, p_as_of timestamp with time zone)
returns jsonb
language plpgsql stable security definer
set search_path = 'public'
as $$
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
       and (p_owner is null or p.user_id = p_owner)
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
end $$;

create function public.club_spots_of(p_pseudo text, p_period text default 'now', p_filters jsonb default '{}'::jsonb,
  p_lat double precision default null, p_lng double precision default null, p_limit integer default 40,
  p_offset integer default 0, p_as_of timestamp with time zone default null)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare v_uid uuid;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'why', 'signin', 'items', '[]'::jsonb); end if;
  select p.id into v_uid from public.profiles p
   where lower(p.pseudo) = lower(btrim(coalesce(p_pseudo, ''))) limit 1;
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody', 'items', '[]'::jsonb); end if;
  return public._club_spots_core(v_uid, p_period, p_filters, p_lat, p_lng, p_limit, p_offset, p_as_of);
end $$;

-- 5 · LES DROITS, APRÈS LE DERNIER `create`.
revoke all on function public._element_media_readable(text) from public, anon;
grant execute on function public._element_media_readable(text) to authenticated, service_role;
revoke all on function public.member_media(text) from public, anon;
grant execute on function public.member_media(text) to authenticated, service_role;
revoke all on function public._club_spots_core(uuid, text, jsonb, double precision, double precision, integer, integer, timestamp with time zone) from public, anon, authenticated;
grant execute on function public._club_spots_core(uuid, text, jsonb, double precision, double precision, integer, integer, timestamp with time zone) to service_role;
revoke all on function public.club_spots_of(text, text, jsonb, double precision, double precision, integer, integer, timestamp with time zone) from public, anon;
grant execute on function public.club_spots_of(text, text, jsonb, double precision, double precision, integer, integer, timestamp with time zone) to authenticated, service_role;
