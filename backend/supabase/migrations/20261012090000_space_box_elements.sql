-- TOTEHM · la box telle quelle, un élément éteint d'un tap · 12/10/2026
-- why : Wah — « afficher la box tel quel avec la possibilité d'éteindre les mini-box ou option de la
--       box ». Avant : deux interrupteurs de groupe (OBJECTIVES / REPULSIONS), cachés par défaut.
--       Maintenant : chaque objectif, chaque répulsion et le rythme s'éteignent un par un.
-- how : `spot_box_set(spot, hide)` (propriétaire, verrou) reçoit les éléments à éteindre par TEXTE
--       (l'ordre du client ne fait jamais foi) et écrit leurs indices dans snapshot.hide =
--       {objectives:[i], repulsions:[i], freq} ; il recalcule show_objectives / show_repulsions /
--       show_why. `_spot_view` et `space_feed` ne rendent ni ne comparent un élément éteint ; un rythme
--       éteint vaut null pour tous. Un space ou un spot NAÎT CACHÉ (défaut inchangé) : la page appelle
--       `spot_box_set` juste après la publication ; un échec laisse caché, jamais l'inverse.
-- what : public.spot_box_set(uuid, jsonb) [nouvelle] ; public._spot_view et public.space_feed
--        (mêmes signatures, recopiés de 20261011102841_space_social.sql et modifiés).

create or replace function public.spot_box_set(p_spot uuid, p_hide jsonb default '{}'::jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid(); v_snap jsonb; h jsonb := coalesce(p_hide, '{}'::jsonb);
  v_ho jsonb; v_hr jsonb; v_hf boolean; n_o int; n_r int; v_obj boolean; v_rep boolean;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select snapshot into v_snap from public.spot_plans where spot_id = p_spot and user_id = v_uid for update;
  if not found then return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  if jsonb_typeof(h) <> 'object' then return jsonb_build_object('ok', false, 'why', 'hide'); end if;
  select coalesce(jsonb_agg((o.n - 1)::int order by o.n), '[]'::jsonb) into v_ho
    from jsonb_array_elements(coalesce(v_snap->'objectives', '[]'::jsonb)) with ordinality o(v, n)
   where btrim(coalesce(o.v->>'text', '')) <> ''
     and exists(select 1 from jsonb_array_elements_text(case when jsonb_typeof(h->'objectives') = 'array' then h->'objectives' else '[]'::jsonb end) t
                 where lower(btrim(t)) = lower(btrim(o.v->>'text')));
  select coalesce(jsonb_agg((r.n - 1)::int order by r.n), '[]'::jsonb) into v_hr
    from jsonb_array_elements(coalesce(v_snap->'repulsions', '[]'::jsonb)) with ordinality r(v, n)
   where btrim(coalesce(r.v->>'text', '')) <> ''
     and exists(select 1 from jsonb_array_elements_text(case when jsonb_typeof(h->'repulsions') = 'array' then h->'repulsions' else '[]'::jsonb end) t
                 where lower(btrim(t)) = lower(btrim(r.v->>'text')));
  v_hf := coalesce(h->>'freq', 'false') = 'true';
  select count(*) into n_o from jsonb_array_elements(coalesce(v_snap->'objectives', '[]'::jsonb)) o where btrim(coalesce(o->>'text', '')) <> '';
  select count(*) into n_r from jsonb_array_elements(coalesce(v_snap->'repulsions', '[]'::jsonb)) r where btrim(coalesce(r->>'text', '')) <> '';
  v_obj := n_o > jsonb_array_length(v_ho); v_rep := n_r > jsonb_array_length(v_hr);
  update public.spot_plans
     set snapshot = snapshot || jsonb_build_object('show_objectives', v_obj, 'show_repulsions', v_rep,
                                                   'hide', jsonb_build_object('objectives', v_ho, 'repulsions', v_hr, 'freq', v_hf)),
         show_why = v_obj or v_rep
   where spot_id = p_spot and user_id = v_uid;
  return jsonb_build_object('ok', true, 'objectives', v_obj, 'repulsions', v_rep,
                            'hidden', jsonb_array_length(v_ho) + jsonb_array_length(v_hr) + case when v_hf then 1 else 0 end);
end $function$;

-- _spot_view (+ éléments éteints)
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
    -- 12/10 : le rythme éteint par l'auteur n'est rendu à personne (son contexte garde tout).
    'freq', case when coalesce((p.snapshot->'hide'->>'freq')::boolean, false) then null else p.snapshot->>'freq' end,
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
        -- 12/10 : un élément éteint (snapshot.hide, indice) ne sort jamais.
        'objectives', (select coalesce(jsonb_agg(jsonb_build_object('text', o.v->>'text') order by o.n), '[]'::jsonb)
                         from jsonb_array_elements(coalesce(p.snapshot->'objectives', '[]'::jsonb)) with ordinality o(v, n)
                        where btrim(coalesce(o.v->>'text','')) <> '' and coalesce((p.snapshot->>'show_objectives')::boolean,p.show_why)
                          and not coalesce(p.snapshot->'hide'->'objectives', '[]'::jsonb) @> to_jsonb((o.n - 1)::int)),
        'repulsions', (select coalesce(jsonb_agg(jsonb_build_object('text', r.v->>'text') order by r.n), '[]'::jsonb)
                         from jsonb_array_elements(coalesce(p.snapshot->'repulsions', '[]'::jsonb)) with ordinality r(v, n)
                        where btrim(coalesce(r.v->>'text','')) <> '' and coalesce((p.snapshot->>'show_repulsions')::boolean,p.show_why)
                          and not coalesce(p.snapshot->'hide'->'repulsions', '[]'::jsonb) @> to_jsonb((r.n - 1)::int))) end,
    'exact', case when p.format = 'spot' and public._spot_exact(p.user_id, p_viewer, p.visibility, p.shield)
                  then jsonb_build_object('lat', p.lat, 'lng', p.lng, 'place', p.place) end,
    -- 11/10 : les vibes d'un space (compte public, et le mien).
    'vibes', case when p.format = 'space' then (select count(*) from public.space_vibes v where v.space_id = p.spot_id and v.active) end,
    'vibed', case when p.format = 'space' and p_viewer is not null
                  then exists(select 1 from public.space_vibes v where v.space_id = p.spot_id and v.user_id = p_viewer and v.active) end);
$function$;

-- space_feed (ne compare jamais un élément éteint)
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
      (v_freq is not null and (b.p).snapshot->>'freq' = v_freq
         and not coalesce(((b.p).snapshot->'hide'->>'freq')::boolean, false)) as m_freq,
      (cardinality(v_ow) > 0 and b.show_o and exists(
         select 1 from jsonb_array_elements(coalesce((b.p).snapshot->'objectives', '[]'::jsonb)) with ordinality o(v, n)
          where not coalesce((b.p).snapshot->'hide'->'objectives', '[]'::jsonb) @> to_jsonb((o.n - 1)::int)
            and public._space_words(o.v->>'text') && v_ow)) as m_obj,
      (cardinality(v_rw) > 0 and b.show_r and exists(
         select 1 from jsonb_array_elements(coalesce((b.p).snapshot->'repulsions', '[]'::jsonb)) with ordinality r(v, n)
          where not coalesce((b.p).snapshot->'hide'->'repulsions', '[]'::jsonb) @> to_jsonb((r.n - 1)::int)
            and public._space_words(r.v->>'text') && v_rw)) as m_rep
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

revoke all on function public.spot_box_set(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.spot_box_set(uuid, jsonb) to authenticated, service_role;
revoke all on function public._spot_view(public.spot_plans, uuid) from public, anon, authenticated, service_role;
grant execute on function public._spot_view(public.spot_plans, uuid) to service_role;
revoke all on function public.space_feed(jsonb,double precision,double precision,integer,integer) from public, anon, authenticated;
grant execute on function public.space_feed(jsonb,double precision,double precision,integer,integer) to anon, authenticated, service_role;
