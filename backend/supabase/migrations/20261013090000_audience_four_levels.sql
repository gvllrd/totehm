-- 13/10/2026 — LOT A : QUATRE NIVEAUX, UNE RÈGLE (Wah : « quand l'utilisateur publie de la data, elle est
-- PRIVATE, VISIBLE TO MEMBERS (FIGHER CLUB), VISIBLE ONLY TO MY SUBSCRIBERS ou PUBLIC »).
-- `audience` devient la source sur `spot_plans` (spaces, spots) et `totehms` (le Totehm) :
--   private      = l'auteur seul
--   subscribers  = l'auteur + ses abonnés vivants
--   figher       = + les membres FIGHER CLUB (`_is_figher`, la règle du passeport, qui changera au lot C)
--   public       = tout le monde
-- Les abonnés d'un auteur lisent tout ce qui n'est pas privé. Les vitrines (totehm.space, figher.club) ne
-- LISTENT que public + figher (aux membres) : ce qui est réservé aux abonnés se lit sur totehm.com (`/@nom`).
-- Le LIEU EXACT d'un spot (ON) : l'auteur, un membre FIGHER CLUB (public, figher), un abonné de l'auteur.
-- Les anciennes colonnes (`visibility`, `totehm_visibility`) SUIVENT par trigger : les anciens écrivains et
-- lecteurs restent justes. Aucun `drop`, aucun `update` sans `where`.

-- ── 1 · les colonnes ──────────────────────────────────────────────────────────
alter table public.spot_plans add column if not exists audience text;
alter table public.totehms    add column if not exists audience text;
update public.spot_plans set audience = case when visibility = 'private' then 'private' else 'public' end where audience is null;
update public.totehms    set audience = case when totehm_visibility = 'private' then 'private' else 'subscribers' end where audience is null;
alter table public.spot_plans alter column audience set not null;
alter table public.totehms    alter column audience set not null;
alter table public.spot_plans add constraint spot_plans_audience_check check (audience in ('private','figher','subscribers','public'));
alter table public.totehms    add constraint totehms_audience_check    check (audience in ('private','figher','subscribers','public'));

-- ── 2 · les anciennes colonnes suivent ────────────────────────────────────────
-- Un écrivain d'avant (`visibility` seule) : l'audience s'en déduit. Un écrivain d'aujourd'hui (`audience`) :
-- `visibility` suit. Les deux ne divergent jamais.
create or replace function public._spot_audience_sync()
returns trigger language plpgsql set search_path to '' as $f$
begin
  if tg_op = 'INSERT' then
    if new.audience is null then new.audience := case when new.visibility = 'private' then 'private' else 'public' end; end if;
  elsif new.audience is distinct from old.audience then
    null;
  elsif new.visibility is distinct from old.visibility then
    new.audience := case when new.visibility = 'private' then 'private'
                         when old.audience = 'private' then 'public' else old.audience end;
  end if;
  new.visibility := case when new.audience = 'private' then 'private' else 'shared' end;
  return new;
end $f$;
create trigger spot_plans_audience_sync before insert or update of audience, visibility on public.spot_plans
  for each row execute function public._spot_audience_sync();

create or replace function public._totehm_audience_sync()
returns trigger language plpgsql set search_path to '' as $f$
begin
  if tg_op = 'INSERT' then
    if new.audience is null then new.audience := case when coalesce(new.totehm_visibility, 'private') = 'private' then 'private' else 'subscribers' end; end if;
  elsif new.audience is distinct from old.audience then
    null;
  elsif new.totehm_visibility is distinct from old.totehm_visibility then
    new.audience := case when new.totehm_visibility = 'private' then 'private'
                         when old.audience = 'private' then 'subscribers' else old.audience end;
  end if;
  -- `members` = le nom que la contrainte accepte pour « partagé » (voir backend/CLAUDE.md, 01/10).
  new.totehm_visibility := case when new.audience = 'private' then 'private' else public._vis_shared() end;
  return new;
end $f$;
create trigger totehms_audience_sync before insert or update of audience, totehm_visibility on public.totehms
  for each row execute function public._totehm_audience_sync();

-- ── 3 · LA règle, en trois fonctions ──────────────────────────────────────────
-- `p_fig` = le lecteur est membre FIGHER CLUB, calculé UNE fois par l'appelant (pas une fois par ligne).
create or replace function public._audience_ok(p_owner uuid, p_audience text, p_viewer uuid, p_fig boolean)
returns boolean language sql stable security definer set search_path to '' as $f$
  select (p_viewer is not null and p_owner = p_viewer)
      or p_audience = 'public'
      or (p_audience = 'figher' and coalesce(p_fig, false))
      or (p_audience in ('figher','subscribers') and public._subscriber_of(p_owner, p_viewer));
$f$;
-- Ce que LISTENT les vitrines : jamais ce qui n'est qu'aux abonnés (ça se lit sur totehm.com).
create or replace function public._audience_listed(p_owner uuid, p_audience text, p_viewer uuid, p_fig boolean)
returns boolean language sql stable security definer set search_path to '' as $f$
  select (p_viewer is not null and p_owner = p_viewer)
      or p_audience = 'public'
      or (p_audience = 'figher' and coalesce(p_fig, false));
$f$;
-- Le lieu exact d'un spot.
create or replace function public._point_ok(p_owner uuid, p_audience text, p_shield text, p_viewer uuid, p_fig boolean)
returns boolean language sql stable security definer set search_path to '' as $f$
  select p_viewer is not null
     and (p_owner = p_viewer
          or (p_shield = 'on' and p_audience <> 'private'
              and ((coalesce(p_fig, false) and p_audience in ('public','figher'))
                   or public._subscriber_of(p_owner, p_viewer))));
$f$;

-- ── 4 · les lecteurs (mêmes signatures) ──────────────────────────────────────
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
  v_fig boolean := case when v_me is null then false else public._is_figher(v_me) end;
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
            or (public._audience_listed(p.user_id, p.audience, v_me, v_fig) and p.starts_at > now() - make_interval(days => (v_r->>'feed_days')::int)))
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

CREATE OR REPLACE FUNCTION public.space_discover(p_view text, p_habit text DEFAULT NULL::text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_before_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_step jsonb; v_ints text[]; v_i text; v_one jsonb; v_all jsonb:='[]'::jsonb;v_list jsonb;v_more boolean:=false;v_match text:='all';
 v_lat double precision; v_lng double precision; v_rules jsonb := public.spot_rules();
 v_cap integer:=greatest(1,least(coalesce(p_limit,20),case when p_view='radar' then 300 else 100 end));
 v_fig boolean := case when auth.uid() is null then false else public._is_figher(auth.uid()) end;
begin
 if p_lat is not null and p_lng is not null and abs(p_lat) <= 90 and abs(p_lng) <= 180 then
  v_lat := round(p_lat::numeric, 1)::double precision; v_lng := round(p_lng::numeric, 1)::double precision;
 end if;
 if p_view not in ('feed','radar','list') then return jsonb_build_object('ok',false,'why','view','spots','[]'::jsonb); end if;
 if nullif(p_habit,'') is not null then
  select s into v_step from public.totehms t,jsonb_array_elements(t.steps) s where t.user_id=auth.uid() and s->>'t'=p_habit limit 1;
  if v_step is null then return jsonb_build_object('ok',false,'why','habit','spots','[]'::jsonb); end if;
  v_match:='habit';
  v_one:=case p_view when 'feed' then (select jsonb_build_object('signed_in', auth.uid() is not null, 'spots',
      coalesce(jsonb_agg(public._spot_view(x.p, auth.uid()) order by (x.p).starts_at desc), '[]'::jsonb))
      from (select p from public.spot_plans p
        where p.status = 'published' and p.format = 'space'
          and p.starts_at <= now()
          and (null::timestamptz is null or p.starts_at < null::timestamptz)
          and public._spot_match(p, p_habit, null::text)
          and ((auth.uid() is not null and p.user_id = auth.uid())
               or (public._audience_listed(p.user_id, p.audience, auth.uid(), v_fig)
                   and p.starts_at > now() - make_interval(days => (v_rules->>'feed_days')::int)
                   and (v_lat is null or earth_distance(ll_to_earth(v_lat, v_lng), ll_to_earth(p.clat, p.clng))
                        <= (v_rules->>'radius_km')::int * 1000)))
        order by p.starts_at desc
        limit greatest(1, least(coalesce(1, 20), 40))) x)
    when 'radar' then public.spots_exact(p_habit,null) else public.spots_list(p_habit,null,null,null,1) end;
  if jsonb_array_length(coalesce(v_one->'spots','[]'::jsonb))=0 then v_match:='intention';v_ints:=public._step_intentions(v_step);end if;
 end if;
 if v_match <> 'intention' then
  v_one:=case p_view when 'feed' then (select jsonb_build_object('signed_in', auth.uid() is not null, 'spots',
      coalesce(jsonb_agg(public._spot_view(x.p, auth.uid()) order by (x.p).starts_at desc), '[]'::jsonb))
      from (select p from public.spot_plans p
        where p.status = 'published' and p.format = 'space'
          and p.starts_at <= now()
          and (p_before is null or p.starts_at < p_before)
          and public._spot_match(p, p_habit, null::text)
          and ((auth.uid() is not null and p.user_id = auth.uid())
               or (public._audience_listed(p.user_id, p.audience, auth.uid(), v_fig)
                   and p.starts_at > now() - make_interval(days => (v_rules->>'feed_days')::int)
                   and (v_lat is null or earth_distance(ll_to_earth(v_lat, v_lng), ll_to_earth(p.clat, p.clng))
                        <= (v_rules->>'radius_km')::int * 1000)))
        order by p.starts_at desc
        limit greatest(1, least(coalesce(v_cap, 20), 40))) x)
    when 'radar' then public.spots_exact(p_habit,null) else public.spots_list(p_habit,null,p_before,p_before_id,v_cap) end;
  return v_one||jsonb_build_object('match',v_match);
 end if;
 foreach v_i in array coalesce(v_ints,'{}'::text[]) loop
  v_one:=case p_view when 'feed' then (select jsonb_build_object('signed_in', auth.uid() is not null, 'spots',
      coalesce(jsonb_agg(public._spot_view(x.p, auth.uid()) order by (x.p).starts_at desc), '[]'::jsonb))
      from (select p from public.spot_plans p
        where p.status = 'published' and p.format = 'space'
          and p.starts_at <= now()
          and (p_before is null or p.starts_at < p_before)
          and public._spot_match(p, null::text, v_i)
          and ((auth.uid() is not null and p.user_id = auth.uid())
               or (public._audience_listed(p.user_id, p.audience, auth.uid(), v_fig)
                   and p.starts_at > now() - make_interval(days => (v_rules->>'feed_days')::int)
                   and (v_lat is null or earth_distance(ll_to_earth(v_lat, v_lng), ll_to_earth(p.clat, p.clng))
                        <= (v_rules->>'radius_km')::int * 1000)))
        order by p.starts_at desc
        limit greatest(1, least(coalesce(v_cap, 20), 40))) x)
    when 'radar' then public.spots_exact(null,v_i) else public.spots_list(null,v_i,p_before,p_before_id,v_cap) end;
  v_all:=v_all||coalesce(v_one->'spots','[]'::jsonb);v_more:=v_more or coalesce((v_one->>'more')::boolean,false);
 end loop;
 select coalesce(jsonb_agg(x order by x->>'starts_at' desc,x->>'id' desc),'[]'::jsonb) into v_list from (select distinct x from jsonb_array_elements(v_all) x) d;
 v_more:=v_more or jsonb_array_length(v_list)>v_cap;
 select coalesce(jsonb_agg(x order by ord),'[]'::jsonb) into v_list from jsonb_array_elements(v_list) with ordinality a(x,ord) where ord<=v_cap;
 return jsonb_build_object('spots',v_list,'more',v_more,'match',v_match);
end $function$
;

CREATE OR REPLACE FUNCTION public.spots_feed(p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_q text DEFAULT NULL::text, p_intention text DEFAULT NULL::text, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules(); v_res jsonb;
        v_lat double precision; v_lng double precision;
        v_fig boolean := case when auth.uid() is null then false else public._is_figher(auth.uid()) end;
begin
  if p_lat is not null and p_lng is not null and abs(p_lat) <= 90 and abs(p_lng) <= 180 then
    v_lat := round(p_lat::numeric, 1)::double precision;
    v_lng := round(p_lng::numeric, 1)::double precision;
  end if;
  select coalesce(jsonb_agg(public._spot_view(x.p, v_uid) order by (x.p).starts_at desc), '[]'::jsonb) into v_res
    from (select p from public.spot_plans p
           where p.status = 'published' and p.format = 'spot'
             and p.starts_at <= now()
             and (p_before is null or p.starts_at < p_before)
             and public._spot_match(p, p_q, p_intention)
             and ((v_uid is not null and p.user_id = v_uid)
                  or (public._audience_listed(p.user_id, p.audience, v_uid, v_fig)
                      and p.starts_at > now() - make_interval(days => (v_r->>'feed_days')::int)
                      and (v_lat is null
                           or earth_distance(ll_to_earth(v_lat, v_lng), ll_to_earth(p.clat, p.clng))
                              <= (v_r->>'radius_km')::int * 1000)))
           order by p.starts_at desc
           limit greatest(1, least(coalesce(p_limit, 20), 40))) x;
  return jsonb_build_object('signed_in', v_uid is not null, 'spots', v_res);
end $function$
;

CREATE OR REPLACE FUNCTION public.spots_list(p_q text DEFAULT NULL::text, p_intention text DEFAULT NULL::text, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_before_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid(); v_res jsonb; v_more boolean;
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_fig boolean := case when v_uid is null then false else public._is_figher(v_uid) end;
begin
  -- RIGHT is the future list. Cursor uses both timestamp and id so equal
  -- start times cannot silently lose a Spot on the next page.
  with readable as materialized (
    select p from public.spot_plans p
     where p.status = 'published' and p.format = 'spot' and p.starts_at > now() and p.shield = 'on'
       and public._audience_listed(p.user_id, p.audience, v_uid, v_fig)
       and public._spot_match(p, p_q, p_intention)
       and (p_before is null or p.starts_at < p_before
            or (p.starts_at = p_before and p_before_id is not null and p.spot_id < p_before_id))
     order by p.starts_at desc, p.spot_id desc limit v_limit + 1
  ), numbered as (
    select p, row_number() over (order by (p).starts_at desc, (p).spot_id desc) as n from readable
  )
  select coalesce(jsonb_agg(public._spot_view(p, v_uid) order by (p).starts_at desc, (p).spot_id desc)
                    filter (where n <= v_limit), '[]'::jsonb), count(*) > v_limit
    into v_res, v_more from numbered;
  return jsonb_build_object('signed_in', v_uid is not null, 'spots', v_res, 'more', v_more);
end $function$
;

create or replace function public.space_profile(p_pseudo text default null, p_offset integer default 0, p_limit integer default 30)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_me uuid := auth.uid(); v_uid uuid; v_pseudo text; v_mine boolean; v_list jsonb; v_more boolean;
  v_lim int := greatest(1, least(coalesce(p_limit, 30), 60)); v_off int := greatest(0, coalesce(p_offset, 0));
  v_n bigint; v_vibes bigint;
  v_fig boolean := case when v_me is null then false else public._is_figher(v_me) end;
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
   where p.user_id = v_uid and p.status = 'published' and p.format = 'space' and (v_mine or public._audience_listed(p.user_id, p.audience, v_me, v_fig));
  select coalesce(jsonb_agg(public._spot_view(x.p, v_me) order by (x.p).starts_at desc, (x.p).spot_id desc), '[]'::jsonb)
    into v_list
    from (select p from public.spot_plans p
           where p.user_id = v_uid and p.status = 'published' and p.format = 'space' and (v_mine or public._audience_listed(p.user_id, p.audience, v_me, v_fig))
           order by p.starts_at desc, p.spot_id desc offset v_off limit v_lim) x;
  v_more := v_n > v_off + v_lim;
  return jsonb_build_object('ok', true, 'pseudo', v_pseudo, 'mine', v_mine, 'spaces_total', v_n,
                            'vibes_total', v_vibes, 'spaces', v_list, 'more', v_more);
end $function$;

create or replace function public.space_vibe(p_space uuid, p_on boolean default true)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_me uuid := auth.uid(); v_owner uuid; v_aud text; v_n bigint;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if exists(select 1 from auth.users u where u.id = v_me and u.is_anonymous) then
    return jsonb_build_object('ok', false, 'why', 'email');
  end if;
  select p.user_id, p.audience into v_owner, v_aud from public.spot_plans p
   where p.spot_id = p_space and p.status = 'published' and p.format = 'space';
  if v_owner is null or not public._audience_ok(v_owner, v_aud, v_me, v_aud = 'figher' and public._is_figher(v_me)) then return jsonb_build_object('ok', false, 'why', 'nothing'); end if;
  if v_owner = v_me then return jsonb_build_object('ok', false, 'why', 'own'); end if;
  insert into public.space_vibes as v (space_id, user_id, active, created_at)
  values (p_space, v_me, coalesce(p_on, true), now())
  on conflict (space_id, user_id) do update
     set active = excluded.active,
         created_at = case when excluded.active and not v.active then now() else v.created_at end;
  select count(*) into v_n from public.space_vibes where space_id = p_space and active;
  return jsonb_build_object('ok', true, 'vibed', coalesce(p_on, true), 'vibes', v_n);
end $function$;

create or replace function public.space_pulse()
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'spaces_week', (select count(*) from public.spot_plans p where p.status = 'published' and p.format = 'space'
                      and p.audience = 'public' and p.starts_at > now() - interval '7 days'),
    'members_week', (select count(distinct p.user_id) from public.spot_plans p where p.status = 'published' and p.format = 'space'
                      and p.audience = 'public' and p.starts_at > now() - interval '7 days'),
    'vibes_week', (select count(*) from public.space_vibes v where v.active and v.created_at > now() - interval '7 days'))
$function$;

create or replace function public.habit_spaces(p_pseudo text default null::text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_me  uuid := auth.uid();
  v_uid uuid;
  v_out jsonb;
  v_fig boolean;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'why', 'signin');
  end if;

  if p_pseudo is null or btrim(p_pseudo) = '' then
    v_uid := v_me;
  else
    select id into v_uid from public.profiles
     where lower(pseudo) = lower(btrim(p_pseudo)) limit 1;
    if v_uid is null then
      return jsonb_build_object('ok', false, 'why', 'nobody');
    end if;
  end if;

  v_fig := v_uid <> v_me and public._is_figher(v_me);

  with s as (
    select p as r,
           lower(btrim(p.habit)) as k,
           p.habit,
           p.format,
           count(*) over (partition by lower(btrim(p.habit)), p.format) as n,
           -- un space : le plus récent d'abord ; un spot : en cours, puis le
           -- prochain, puis le passé le plus récent.
           row_number() over (
             partition by lower(btrim(p.habit)), p.format
             order by case
                        when p.format = 'space' then 0
                        when now() >= p.starts_at
                         and now() <  p.starts_at + make_interval(mins => p.duration_min) then 0
                        when p.starts_at > now() then 1
                        else 2
                      end,
                      case when p.format = 'spot' and p.starts_at > now() then p.starts_at end asc nulls last,
                      p.starts_at desc,
                      p.spot_id desc) as rn
      from public.spot_plans p
     where p.user_id = v_uid
       and p.status = 'published'
       and btrim(coalesce(p.habit, '')) <> ''
       and (v_uid = v_me or public._audience_ok(p.user_id, p.audience, v_me, v_fig))
  ), g as (
    select k,
           min(habit) as habit,
           coalesce(max(n) filter (where format = 'space'), 0) as n_spaces,
           coalesce(max(n) filter (where format = 'spot'), 0)  as n_spots,
           coalesce(jsonb_agg(public._spot_view(r, v_me) order by rn)
                      filter (where format = 'space' and rn <= 3), '[]'::jsonb) as spaces,
           coalesce(jsonb_agg(public._spot_view(r, v_me) order by rn)
                      filter (where format = 'spot' and rn <= 3), '[]'::jsonb) as spots
      from s
     group by k
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'habit', habit,
           'total', n_spaces + n_spots,
           'total_spaces', n_spaces,
           'total_spots', n_spots,
           'spaces', spaces,
           'spots', spots) order by k), '[]'::jsonb)
    into v_out
    from g;

  return jsonb_build_object('ok', true, 'mine', v_uid = v_me, 'habits', v_out);
end
$function$;

CREATE OR REPLACE FUNCTION public.spots_exact(p_q text DEFAULT NULL::text, p_intention text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules(); v_res jsonb; v_fig boolean;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false, 'spots', '[]'::jsonb); end if;
  v_fig := public._is_figher(v_uid);
  select coalesce(jsonb_agg(public._spot_view(x.p, v_uid) order by (x.p).starts_at desc), '[]'::jsonb) into v_res
    from (select p from public.spot_plans p
           where p.status = 'published' and p.format = 'spot'
             and public._spot_match(p, p_q, p_intention)
             and (p.user_id = v_uid
                  or (p.starts_at > now() - make_interval(days => (v_r->>'feed_days')::int)
                      and public._point_ok(p.user_id, p.audience, p.shield, v_uid, v_fig)))
           order by p.starts_at desc limit 300) x;
  return jsonb_build_object('signed_in', true, 'spots', v_res);
end $function$
;

CREATE OR REPLACE FUNCTION public.spot_get(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); p public.spot_plans%rowtype;
begin
  select * into p from public.spot_plans where spot_id = p_id and status = 'published';
  if p.spot_id is null or not public._audience_ok(p.user_id, p.audience, v_uid,
       p.audience = 'figher' and v_uid is not null and public._is_figher(v_uid)) then
    return jsonb_build_object('ok', false, 'why', 'nothing');
  end if;
  return jsonb_build_object('ok', true, 'spot', public._spot_view(p, v_uid));
end $function$
;

create or replace function public._clip_readable(p_name text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select (auth.uid() is not null and split_part(p_name, '/', 1) = auth.uid()::text)
      or exists (select 1 from public.spot_plans p
                  where (p.video = p_name or p.photo = p_name) and p.status = 'published'
                    and public._audience_ok(p.user_id, p.audience, auth.uid(),
                          case when p.audience = 'figher' and auth.uid() is not null then public._is_figher(auth.uid()) else false end));
$function$;

create or replace function public._shared_with_me(p_owner uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $f$
  -- 13/10 : le Totehm a ses quatre niveaux (`totehms.audience`). Lire un Totehm demande une session.
  select coalesce(p_owner = auth.uid(), false)
      or (auth.uid() is not null and exists (
            select 1 from public.totehms t
             where t.user_id = p_owner
               and public._audience_ok(p_owner, t.audience, auth.uid(),
                     case when t.audience = 'figher' then public._is_figher(auth.uid()) else false end)));
$f$;

create or replace function public.visibility_set(p_visibility text)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_n int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  -- 13/10 : quatre niveaux ; « members » (l'ancien nom) = mes abonnés.
  if p_visibility = 'members' then p_visibility := 'subscribers'; end if;
  if coalesce(p_visibility, '') not in ('private','figher','subscribers','public') then return jsonb_build_object('ok', false, 'why', 'value'); end if;
  update public.totehms set audience = p_visibility where user_id = v_uid;
  if not found then return jsonb_build_object('ok', false, 'why', 'no_totehm'); end if;
  select count(*) into v_n from public.creator_subscriptions
   where creator_id = v_uid and status in ('active','trialing');
  return jsonb_build_object('ok', true, 'visibility', p_visibility, 'subscribers', v_n,
                            'open', public._offer_open(v_uid));
end $f$;

create or replace function public.my_landing()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_bot jsonb; v_vis text; v_cp record; v_r jsonb := public._sm_rules();
begin
  v_bot := public.totehmbot_access();
  if v_uid is null then
    return jsonb_build_object('signed_in', false, 'thp', false,
      'higher', jsonb_build_object('active', false, 'price_cents', v_bot->'price_cents',
                                   'currency', coalesce(v_bot->>'currency', 'eur'), 'period', v_bot->'period'),
      'sm', jsonb_build_object('ready', false, 'free_total', (v_r->>'free')::int, 'free_days', (v_r->>'free_days')::int));
  end if;
  select t.audience into v_vis from public.totehms t where t.user_id = v_uid limit 1;
  select cp.monetized into v_cp from public.creator_profiles cp where cp.user_id = v_uid;
  return jsonb_build_object(
    'signed_in', true,
    'pseudo', (select p.pseudo from public.profiles p where p.id = v_uid),
    'avatar', (select a.data from public.member_avatars a where a.user_id = v_uid),
    'visibility', coalesce(v_vis, 'private'),
    'offer', jsonb_build_object('enabled', coalesce(v_cp.monetized, false), 'open', public._offer_open(v_uid)),
    'higher', jsonb_build_object(
      'active', coalesce((v_bot->>'active')::boolean, false), 'comp', coalesce((v_bot->>'comp')::boolean, false),
      'status', v_bot->'status', 'until', v_bot->'until', 'ending', coalesce((v_bot->>'ending')::boolean, false),
      'price_cents', v_bot->'price_cents', 'currency', coalesce(v_bot->>'currency', 'eur'), 'period', v_bot->'period'),
    'telegram', coalesce((v_bot->>'linked')::boolean, false),
    'thp', public._art_owns_thp(v_uid),
    'subscriptions', (select count(*) from public.creator_subscriptions cs
                       where cs.fan_id = v_uid and cs.status in ('active', 'trialing')),
    'subscribers', (select count(*) from public.creator_subscriptions cs
                     where cs.creator_id = v_uid and cs.status in ('active', 'trialing')),
    'sm', public._sm_state(v_uid));
end $function$;

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
    -- 13/10 : PRIVATE · FIGHER CLUB · MY SUBSCRIBERS · PUBLIC (la source ; `visibility` suit).
    'audience', p.audience,
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
    -- 13/10 : le lieu exact = l'auteur, ou (ON, pas privé) un membre FIGHER CLUB (public, figher) ou un abonné de l'auteur.
    'exact', case when p.format = 'spot' and public._point_ok(p.user_id, p.audience, p.shield, p_viewer,
                    case when p.shield = 'on' and p.audience in ('public','figher') and p_viewer is not null and p.user_id <> p_viewer
                         then public._is_figher(p_viewer) else false end)
                  then jsonb_build_object('lat', p.lat, 'lng', p.lng, 'place', p.place) end,
    -- 11/10 : les vibes d'un space (compte public, et le mien).
    'vibes', case when p.format = 'space' then (select count(*) from public.space_vibes v where v.space_id = p.spot_id and v.active) end,
    'vibed', case when p.format = 'space' and p_viewer is not null
                  then exists(select 1 from public.space_vibes v where v.space_id = p.spot_id and v.user_id = p_viewer and v.active) end);
$function$;

create or replace function public.creator_page(p_pseudo text)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_me uuid := auth.uid(); v_uid uuid; v_t public.totehms%rowtype;
        v_cp public.creator_profiles%rowtype; v_open boolean;
        v_st text; v_until timestamptz; v_ending boolean; v_pal text[];
begin
  select id into v_uid from public.profiles
   where lower(pseudo) = lower(btrim(coalesce(p_pseudo, ''))) limit 1;
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;

  select * into v_t from public.totehms where user_id = v_uid limit 1;
  select * into v_cp from public.creator_profiles where user_id = v_uid;
  v_open := public._offer_open(v_uid);

  -- 13/10 : /@nom = l'univers du membre. Un Totehm privé ne ferme plus la page (ses spaces publics s'y
  -- montrent) ; il ne rend alors ni ses intentions ni son offre.
  v_pal := case when v_uid is not distinct from v_me or coalesce(v_t.audience, 'private') <> 'private' then array(select x from (
             select distinct x from jsonb_array_elements(coalesce(v_t.steps, '[]'::jsonb)) s,
                    unnest(public._step_intentions(s)) x
              where btrim(coalesce(s->>'t', '')) <> '') u
           order by array_position(array['fight','flow','enrich','love','express','focus','celebrate'], x)) else '{}'::text[] end;

  if v_me is not null then
    select status, current_period_end, ending into v_st, v_until, v_ending
      from public.creator_subscriptions where creator_id = v_uid and fan_id = v_me;
  end if;

  return jsonb_build_object(
    'ok', true,
    'pseudo', (select pseudo from public.profiles where id = v_uid),
    'palette', to_jsonb(v_pal),
    'audience', case when v_uid is not distinct from v_me then coalesce(v_t.audience, 'private') end,
    'sale', jsonb_build_object(
      'open', v_open,
      'price_cents', case when v_open then v_cp.custom_sub_price end,
      'currency', coalesce(v_cp.currency, 'eur'),
      'period', 'year'),
    'viewer', jsonb_build_object(
      'signed_in',  v_me is not null,
      'me',         v_uid = v_me,
      'subscribed', coalesce(v_st in ('active','trialing'), false),
      'until',      v_until,
      'ending',     coalesce(v_ending, false),
      'can_read',   v_me is not null and public._shared_with_me(v_uid)));
end $f$;


create or replace function public.my_vibes(p_limit integer default 40)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_me uuid := auth.uid(); v_lim int := greatest(1, least(coalesce(p_limit, 40), 100)); v_in jsonb; v_out jsonb; v_n bigint;
  v_fig boolean;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  v_fig := public._is_figher(v_me);
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
  -- 13/10 : un space que je ne peux plus lire (abonnement fini, audience resserrée) sort de mes vibes données.
  select coalesce(jsonb_agg(public._spot_view(x.p, v_me) order by x.created_at desc), '[]'::jsonb)
    into v_out
    from (select p, v.created_at from public.space_vibes v
            join public.spot_plans p on p.spot_id = v.space_id and p.status = 'published' and p.format = 'space'
                                    and public._audience_ok(p.user_id, p.audience, v_me, v_fig)
           where v.user_id = v_me and v.active
           order by v.created_at desc limit v_lim) x;
  return jsonb_build_object('ok', true, 'received', v_in, 'received_total', v_n, 'given', v_out);
end $function$;

-- ── 5 · les écrivains : l'audience posée DANS la même transaction (aucune fenêtre publique) ─────
-- Les anciens écrivains restent (pages en cache) ; les pages d'aujourd'hui appellent ceux-ci.
create or replace function public._audience_put(p_spot uuid, p_audience text)
returns void language plpgsql security definer set search_path to '' as $f$
begin
  update public.spot_plans set audience = p_audience where spot_id = p_spot and user_id = auth.uid();
  -- La projection à 0,1° (`spots`, l'ancienne carte) ne montre que le public.
  update public.spots set active = (p_audience = 'public') and active, is_public = (p_audience = 'public')
   where id = p_spot and user_id = auth.uid();
end $f$;

create or replace function public.space_post_audience(p_habit text, p_video text, p_lat double precision, p_lng double precision,
  p_city text, p_comment text, p_audience text default 'public')
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare r jsonb; a text := coalesce(nullif(btrim(p_audience), ''), 'public');
begin
  if a not in ('private','figher','subscribers','public') then return jsonb_build_object('ok', false, 'why', 'audience'); end if;
  r := public.space_post(p_habit, p_video, p_lat, p_lng, p_city, p_comment);
  if coalesce((r->>'ok')::boolean, false) then perform public._audience_put((r->>'id')::uuid, a); r := r || jsonb_build_object('audience', a); end if;
  return r;
end $f$;

create or replace function public.spot_create_audience(p_habit text, p_duration_min integer, p_video text, p_lat double precision,
  p_lng double precision, p_city text default null, p_comment text default null, p_mode text default null,
  p_location text default null, p_audience text default 'figher')
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare r jsonb; a text := coalesce(nullif(btrim(p_audience), ''), 'figher');
begin
  if a not in ('private','figher','subscribers','public') then return jsonb_build_object('ok', false, 'why', 'audience'); end if;
  r := public.spot_create(p_habit, 'shared', p_duration_min, p_video, p_lat, p_lng, p_city, p_comment, p_mode, p_location);
  if coalesce((r->>'ok')::boolean, false) then perform public._audience_put((r->>'id')::uuid, a); r := r || jsonb_build_object('audience', a); end if;
  return r;
end $f$;

create or replace function public.spot_schedule_audience(p_habit text, p_starts_at timestamp with time zone, p_duration_min integer,
  p_place text, p_lat double precision, p_lng double precision, p_city text default null, p_comment text default null,
  p_mode text default null, p_location text default null, p_audience text default 'figher')
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare r jsonb; a text := coalesce(nullif(btrim(p_audience), ''), 'figher');
begin
  if a not in ('private','figher','subscribers','public') then return jsonb_build_object('ok', false, 'why', 'audience'); end if;
  r := public.spot_schedule(p_habit, 'shared', p_starts_at, p_duration_min, p_place, p_lat, p_lng, p_city, p_comment, p_mode, p_location);
  if coalesce((r->>'ok')::boolean, false) then perform public._audience_put((r->>'id')::uuid, a); r := r || jsonb_build_object('audience', a); end if;
  return r;
end $f$;

-- Changer l'audience d'un space ou d'un spot déjà publié (l'auteur seul).
create or replace function public.spot_audience_set(p_spot uuid, p_audience text)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare v_me uuid := auth.uid(); v_owner uuid;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if coalesce(p_audience, '') not in ('private','figher','subscribers','public') then return jsonb_build_object('ok', false, 'why', 'audience'); end if;
  select p.user_id into v_owner from public.spot_plans p where p.spot_id = p_spot and p.status = 'published' for update;
  if v_owner is null or v_owner <> v_me then return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  perform public._audience_put(p_spot, p_audience);
  return jsonb_build_object('ok', true, 'audience', p_audience);
end $f$;

-- ── 6 · /@nom = l'univers d'un membre, en UNE lecture ─────────────────────────
-- Ce que le lecteur peut lire : entier. Ce qui est réservé (abonnés, FIGHER CLUB) : une place floutée qui ne
-- dit QUE son niveau, son format et son état (ni Habit, ni média, ni lieu, ni identifiant). Le privé : rien.
create or replace function public.creator_universe(p_pseudo text, p_limit integer default 24)
returns jsonb language plpgsql stable security definer set search_path to '' as $f$
declare v_me uuid := auth.uid(); v_uid uuid; v_aud text; v_fig boolean; v_can boolean;
  v_lim int := greatest(1, least(coalesce(p_limit, 24), 48)); v_spaces jsonb; v_spots jsonb; v_tot jsonb;
begin
  select pr.id into v_uid from public.profiles pr where lower(pr.pseudo) = lower(btrim(coalesce(p_pseudo, ''))) limit 1;
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;
  v_fig := case when v_me is null or v_me = v_uid then false else public._is_figher(v_me) end;
  select t.audience into v_aud from public.totehms t where t.user_id = v_uid limit 1;
  v_can := v_me is not null and public._shared_with_me(v_uid);

  select coalesce(jsonb_agg(case when x.ok then public._spot_view(x.p, v_me) || jsonb_build_object('locked', false)
                                 else jsonb_build_object('locked', true, 'format', 'space', 'audience', (x.p).audience) end
                            order by (x.p).starts_at desc, (x.p).spot_id desc), '[]'::jsonb)
    into v_spaces
    from (select p, public._audience_ok(p.user_id, p.audience, v_me, v_fig) as ok
            from public.spot_plans p
           where p.user_id = v_uid and p.status = 'published' and p.format = 'space'
             and (p.audience <> 'private' or p.user_id = v_me)
           order by p.starts_at desc, p.spot_id desc limit v_lim) x;

  select coalesce(jsonb_agg(case when x.ok then public._spot_view(x.p, v_me) || jsonb_build_object('locked', false)
                                 else jsonb_build_object('locked', true, 'format', 'spot', 'audience', (x.p).audience,
                                        'state', case when (x.p).starts_at > now() then 'will'
                                                      when now() < (x.p).starts_at + make_interval(mins => (x.p).duration_min) then 'am' else 'was' end) end
                            order by x.rk, (x.p).starts_at desc), '[]'::jsonb)
    into v_spots
    from (select p, public._audience_ok(p.user_id, p.audience, v_me, v_fig) as ok,
                 case when p.starts_at + make_interval(mins => p.duration_min) > now() then 0 else 1 end as rk
            from public.spot_plans p
           where p.user_id = v_uid and p.status = 'published' and p.format = 'spot'
             and (p.audience <> 'private' or p.user_id = v_me)
           order by case when p.starts_at + make_interval(mins => p.duration_min) > now() then 0 else 1 end,
                    p.starts_at desc limit v_lim) x;

  -- Le Totehm : combien d'éléments par vue (jamais un texte ici ; le lire = /totehm?ro=nom, sous ses droits).
  if v_aud is distinct from 'private' or v_me = v_uid then
    v_tot := jsonb_build_object(
      'habits', (select count(*) from public.totehms t, jsonb_array_elements(coalesce(t.steps, '[]'::jsonb)) s
                  where t.user_id = v_uid and btrim(coalesce(s->>'t', '')) <> ''),
      'objectives', (select count(*) from public.objectives o where o.user_id = v_uid and btrim(coalesce(o.text, '')) <> ''),
      'repulsions', (select count(*) from public.repulsions r where r.user_id = v_uid and r.active and btrim(coalesce(r.repulsion, '')) <> ''),
      'story', (select count(*) from public.wisdom w where w.user_id = v_uid and btrim(coalesce(w.text, '')) <> ''),
      'visions', (select count(*) from public.visions v where v.user_id = v_uid and btrim(coalesce(v.text, '')) <> ''));
  end if;

  return jsonb_build_object('ok', true, 'me', v_me = v_uid, 'signed_in', v_me is not null, 'figher', v_fig,
    'totehm', jsonb_build_object('audience', case when v_me = v_uid or v_aud <> 'private' then v_aud end,
                                 'can_read', coalesce(v_can, false), 'counts', v_tot),
    'spaces', v_spaces, 'spots', v_spots);
end $f$;

-- ── 7 · les droits (APRÈS le dernier `create`) ───────────────────────────────
revoke all on function public._audience_ok(uuid, text, uuid, boolean) from public, anon, authenticated;
revoke all on function public._audience_listed(uuid, text, uuid, boolean) from public, anon, authenticated;
revoke all on function public._point_ok(uuid, text, text, uuid, boolean) from public, anon, authenticated;
revoke all on function public._audience_put(uuid, text) from public, anon, authenticated;
revoke all on function public._spot_audience_sync() from public, anon, authenticated;
revoke all on function public._totehm_audience_sync() from public, anon, authenticated;
grant execute on function public._audience_ok(uuid, text, uuid, boolean) to service_role;
grant execute on function public._audience_listed(uuid, text, uuid, boolean) to service_role;
grant execute on function public._point_ok(uuid, text, text, uuid, boolean) to service_role;
revoke all on function public.space_post_audience(text, text, double precision, double precision, text, text, text) from public, anon;
revoke all on function public.spot_create_audience(text, integer, text, double precision, double precision, text, text, text, text, text) from public, anon;
revoke all on function public.spot_schedule_audience(text, timestamp with time zone, integer, text, double precision, double precision, text, text, text, text, text) from public, anon;
revoke all on function public.spot_audience_set(uuid, text) from public, anon;
grant execute on function public.space_post_audience(text, text, double precision, double precision, text, text, text) to authenticated, service_role;
grant execute on function public.spot_create_audience(text, integer, text, double precision, double precision, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.spot_schedule_audience(text, timestamp with time zone, integer, text, double precision, double precision, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.spot_audience_set(uuid, text) to authenticated, service_role;
revoke all on function public.creator_universe(text, integer) from public;
grant execute on function public.creator_universe(text, integer) to anon, authenticated, service_role;

-- Les droits d'avant des lecteurs réécrits, reposés tels quels (aucun ne s'ouvre davantage).
revoke all on function public.space_feed(jsonb, double precision, double precision, integer, integer) from public;
grant execute on function public.space_feed(jsonb, double precision, double precision, integer, integer) to anon, authenticated, service_role;
revoke all on function public.space_discover(text, text, double precision, double precision, timestamp with time zone, uuid, integer) from public;
grant execute on function public.space_discover(text, text, double precision, double precision, timestamp with time zone, uuid, integer) to anon, authenticated, service_role;
revoke all on function public.spots_feed(double precision, double precision, text, text, timestamp with time zone, integer) from public;
grant execute on function public.spots_feed(double precision, double precision, text, text, timestamp with time zone, integer) to anon, authenticated, service_role;
revoke all on function public.spots_list(text, text, timestamp with time zone, uuid, integer) from public;
grant execute on function public.spots_list(text, text, timestamp with time zone, uuid, integer) to anon, authenticated, service_role;
revoke all on function public.space_profile(text, integer, integer) from public;
grant execute on function public.space_profile(text, integer, integer) to anon, authenticated, service_role;
revoke all on function public.space_vibe(uuid, boolean) from public, anon;
grant execute on function public.space_vibe(uuid, boolean) to authenticated, service_role;
revoke all on function public.space_pulse() from public;
grant execute on function public.space_pulse() to anon, authenticated, service_role;
revoke all on function public.habit_spaces(text) from public, anon;
grant execute on function public.habit_spaces(text) to authenticated, service_role;
revoke all on function public.spots_exact(text, text) from public, anon;
grant execute on function public.spots_exact(text, text) to authenticated, service_role;
revoke all on function public.spot_get(uuid) from public;
grant execute on function public.spot_get(uuid) to anon, authenticated, service_role;
revoke all on function public._clip_readable(text) from public;
grant execute on function public._clip_readable(text) to anon, authenticated, service_role;
revoke all on function public._shared_with_me(uuid) from public, anon;
grant execute on function public._shared_with_me(uuid) to authenticated, service_role;
revoke all on function public.visibility_set(text) from public, anon;
grant execute on function public.visibility_set(text) to authenticated, service_role;
revoke all on function public.my_landing() from public;
grant execute on function public.my_landing() to anon, authenticated, service_role;
revoke all on function public._spot_view(public.spot_plans, uuid) from public, anon, authenticated;
grant execute on function public._spot_view(public.spot_plans, uuid) to service_role;
revoke all on function public.my_vibes(integer) from public, anon;
grant execute on function public.my_vibes(integer) to authenticated, service_role;
revoke all on function public.creator_page(text) from public;
grant execute on function public.creator_page(text) to anon, authenticated, service_role;
