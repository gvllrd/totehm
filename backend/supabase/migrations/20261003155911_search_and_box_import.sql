-- COM: names are public; box discovery/import uses current creator entitlements.
-- Additive. No changes to prices, subscriptions, visibility or source objects.
create or replace function public._totehm_search_text(p_text text)
returns text language sql immutable set search_path = '' as $$
  select regexp_replace(translate(lower(btrim(coalesce(p_text,''))),
    'áàâäãåéèêëíìîïóòôöõúùûüçñ', 'aaaaaaeeeeiiiiooooouuuucn'), '\s+', ' ', 'g');
$$;

-- Internal index. The guard also protects it if called from privileged SQL.
create or replace function public._totehm_box_index(p_owner uuid)
returns table(kind text, box_key text, title text, intentions text[])
language sql stable security definer set search_path = '' as $$
  select 'h', s->>'t', s->>'t', public._step_intentions(s)
  from public.totehms t cross join lateral jsonb_array_elements(t.steps) s
  where t.user_id=p_owner and public._shared_with_me(p_owner) and btrim(coalesce(s->>'t',''))<>''
  union all
  select 't', o.id::text, o.text, o."is" from public.objectives o
  where o.user_id=p_owner and public._shared_with_me(p_owner) and btrim(o.text)<>''
    and o.status not in ('achieved','abandoned','converted')
  union all
  select 'r', r.id::text, r.repulsion, r."is" from public.repulsions r
  where r.user_id=p_owner and public._shared_with_me(p_owner) and r.active and btrim(r.repulsion)<>''
  union all
  select 'w', w.id::text, w.text, w."is" from public.wisdom w
  where w.user_id=p_owner and public._shared_with_me(p_owner) and btrim(w.text)<>''
  union all
  select 'v', v.id::text, v.text, v."is" from public.visions v
  where v.user_id=p_owner and public._shared_with_me(p_owner) and btrim(v.text)<>'';
$$;

create or replace function public.totehm_discover(
  p_q text default '', p_scope text default 'names', p_kind text default '',
  p_intention text default '', p_offset integer default 0, p_limit integer default 12)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid(); v_q text := public._totehm_search_text(left(p_q,96));
  v_scope text := coalesce(p_scope,'names'); v_kind text := coalesce(p_kind,'');
  v_int text := coalesce(p_intention,''); v_n integer := greatest(1,least(coalesce(p_limit,12),24));
  v_off integer := greatest(0,least(coalesce(p_offset,0),5000)); v_result jsonb;
begin
  if v_scope not in ('names','subscriptions','boxes') or v_kind not in ('','h','t','r','w','v')
     or (v_int<>'' and v_int not in ('fight','flow','enrich','love','express','focus','celebrate')) then
    raise exception 'invalid search filters' using errcode='22023';
  end if;
  if v_scope<>'names' and v_me is null then
    return jsonb_build_object('items','[]'::jsonb,'more',false,'total',0,'why','signin');
  end if;
  if v_scope<>'boxes' then
    v_q := regexp_replace(v_q, '^https?://(www\.)?totehm\.com/@', '');
    v_q := regexp_replace(v_q, '^@', '');
    v_q := left(regexp_replace(v_q,'[/?#].*$',''),32);
    v_kind:=''; v_int:='';
  end if;
  with candidates as materialized (
    select p.id, p.pseudo, public._totehm_search_text(p.pseudo) as name,
      p.id=v_me as own, public._subscriber_of(p.id,v_me) as subscribed,
      coalesce(public._shared_with_me(p.id),false) as can_read,
      public._offer_open(p.id) as offer
    from public.profiles p join public.totehms t on t.user_id=p.id
    where (t.totehm_visibility in ('subscribers','members') or p.id=v_me or public._subscriber_of(p.id,v_me))
      and nullif(btrim(p.pseudo),'') is not null
  ), matching as materialized (
    select c.*, b.preview,
      case when c.name=v_q then 0 when starts_with(c.name,v_q) then 1
           when position(v_q in c.name)>0 then 2 else 3 end as rank,
      case when length(v_q)>=3 then extensions.similarity(c.name,v_q) else 0 end as similarity_score
    from candidates c
    left join lateral (
      select jsonb_agg(z order by z->>'kind',z->>'key') as preview from (
        select jsonb_build_object('kind',x.kind,'key',x.box_key,'text',x.title,
          'intentions',to_jsonb(x.intentions)) as z
        from public._totehm_box_index(case when c.can_read and v_scope='boxes' then c.id end) x
        where (v_kind='' or x.kind=v_kind) and (v_int='' or v_int=any(x.intentions))
          and (v_q='' or public._totehm_search_text(x.title) like '%'||replace(replace(replace(v_q,'\','\\'),'%','\%'),'_','\_')||'%')
        order by x.kind,x.title,x.box_key limit 3
      ) hits
    ) b on c.can_read and v_scope='boxes'
    where case v_scope
      when 'boxes' then c.can_read and b.preview is not null
      when 'subscriptions' then c.subscribed and (v_q='' or position(v_q in c.name)>0)
      else (v_q='' and (c.subscribed or c.offer or c.own))
        or (v_q<>'' and (position(v_q in c.name)>0
          or (length(v_q)>=3 and extensions.similarity(c.name,v_q)>=0.28))) end
  ), page as (
    select m.*,cp.custom_sub_price,coalesce(cp.currency,'eur') as currency
    from matching m left join public.creator_profiles cp on cp.user_id=m.id
    order by m.rank,m.subscribed desc,m.own desc,m.similarity_score desc,length(m.name),m.name,m.id
    limit v_n offset v_off
  )
  select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object(
    'pseudo',pseudo,'own',coalesce(own,false),'subscribed',subscribed,'can_read',can_read,
    'offer',offer,'price_cents',case when offer then custom_sub_price end,'currency',currency,
    'match',case when v_q='' then 'browse' when rank=3 then 'similar' else 'name' end,
    'boxes',case when can_read and v_scope='boxes' then preview else null end)
    order by rank,subscribed desc,own desc,similarity_score desc,length(name),name,id) from page),'[]'::jsonb),
    'total',(select count(*) from matching),'more',(select count(*) from matching)>v_off+v_n)
  into v_result;
  return v_result;
end $$;

create table if not exists public.totehm_box_copies (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  source_id uuid not null, source_pseudo text not null,
  kind text not null check(kind in ('h','t','r','w','v')),
  source_key text not null, target_key text not null,
  created_at timestamptz not null default now(),
  primary key(owner_id,source_id,kind,source_key)
);
alter table public.totehm_box_copies enable row level security;
revoke all on table public.totehm_box_copies from public,anon,authenticated;

create or replace function public.totehm_import_boxes(p_pseudo text,p_selection jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid(); v_source uuid; v_pseudo text; v_item jsonb;
  v_kind text; v_key text; v_target text; v_title text; v_is text[];
  v_steps jsonb; v_src_steps jsonb; v_step jsonb; v_map jsonb := '{}'::jsonb;
  v_created integer := 0; v_reused integer := 0; v_exists boolean; v_result jsonb;
begin
  if v_me is null then return jsonb_build_object('ok',false,'why','signin'); end if;
  select id,pseudo into v_source,v_pseudo from public.profiles
    where lower(pseudo)=lower(btrim(p_pseudo)) limit 1;
  if v_source is null or v_source=v_me or not coalesce(public._shared_with_me(v_source),false) then
    return jsonb_build_object('ok',false,'why','access');
  end if;
  if jsonb_typeof(p_selection) is distinct from 'array' or jsonb_array_length(p_selection) not between 1 and 50 then
    raise exception 'choose between one and fifty boxes' using errcode='22023';
  end if;
  -- Reject the entire batch before touching the destination. No client-supplied content.
  if exists(select 1 from jsonb_array_elements(p_selection) x where not exists(
    select 1 from public._totehm_box_index(v_source) b
    where b.kind=x->>'kind' and b.box_key=x->>'key')) then
    return jsonb_build_object('ok',false,'why','changed');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('totehm-import:'||v_me::text,0));
  insert into public.totehms(user_id,steps) values(v_me,'[]') on conflict(user_id) do nothing;
  select steps into v_steps from public.totehms where user_id=v_me for update;
  select steps into v_src_steps from public.totehms where user_id=v_source;

  for v_item in select distinct x from jsonb_array_elements(p_selection) x loop
    v_kind:=v_item->>'kind'; v_key:=v_item->>'key'; v_target:=null; v_exists:=false;
    select b.title,b.intentions into v_title,v_is from public._totehm_box_index(v_source) b
      where b.kind=v_kind and b.box_key=v_key limit 1;
    if v_title is null then raise exception 'source box changed' using errcode='40001'; end if;
    select target_key into v_target from public.totehm_box_copies
      where owner_id=v_me and source_id=v_source and kind=v_kind and source_key=v_key;
    if v_target is not null then
      select exists(select 1 from public._totehm_box_index(v_me) b
        where b.kind=v_kind and b.box_key=v_target) into v_exists;
    end if;
    if not v_exists then
      -- Reuse matching own content; never replace its intentions, time or wording.
      if v_kind='h' then
        select s->>'t' into v_target from jsonb_array_elements(v_steps) s
          where public._totehm_search_text(s->>'t')=public._totehm_search_text(v_title)
          order by s->>'t' limit 1;
      else
        select b.box_key into v_target from public._totehm_box_index(v_me) b
          where b.kind=v_kind and public._totehm_search_text(b.title)=public._totehm_search_text(v_title)
          order by b.box_key limit 1;
      end if;
      v_exists:=v_target is not null;
    end if;
    if v_exists then v_reused:=v_reused+1;
    else
      case v_kind
      when 'h' then
        select s into v_step from jsonb_array_elements(v_src_steps) s where s->>'t'=v_key limit 1;
        -- Only personal box content travels. No source IDs, places, stats or history.
        v_steps:=v_steps||jsonb_build_array(jsonb_build_object('t',v_title,'f',v_step->>'f',
          'i',v_is[1],'is',to_jsonb(v_is),'o',null));
        v_target:=v_title;
      when 't' then
        insert into public.objectives(user_id,text,target_at,"is",i)
        select v_me,v_title,case when o.target_at>now() then o.target_at end,v_is,v_is[1]
          from public.objectives o where o.user_id=v_source and o.id::text=v_key
        returning id::text into v_target;
      when 'r' then
        insert into public.repulsions(user_id,habit_text,obstacle,repulsion,"is",i)
        select v_me,'',r.obstacle,v_title,v_is,v_is[1] from public.repulsions r
          where r.user_id=v_source and r.id::text=v_key returning id::text into v_target;
      when 'w' then
        insert into public.wisdom(user_id,text,"is",i) values(v_me,v_title,v_is,v_is[1]) returning id::text into v_target;
      when 'v' then
        insert into public.visions(user_id,text,"is",i) values(v_me,v_title,v_is,v_is[1]) returning id::text into v_target;
      end case;
      if v_target is null then raise exception 'source box changed' using errcode='40001'; end if;
      v_created:=v_created+1;
    end if;
    v_map:=jsonb_set(v_map,array[v_kind],coalesce(v_map->v_kind,'{}')||jsonb_build_object(v_key,v_target),true);
    insert into public.totehm_box_copies(owner_id,source_id,source_pseudo,kind,source_key,target_key)
      values(v_me,v_source,v_pseudo,v_kind,v_key,v_target)
      on conflict(owner_id,source_id,kind,source_key) do update set target_key=excluded.target_key;
  end loop;

  -- Rebuild only links whose two endpoints were selected. All keys are remapped.
  insert into public.objective_habits(user_id,objective_id,habit_text)
  select v_me,(v_map->'t'->>l.oid)::uuid,v_map->'h'->>l.habit from (
    select objective_id::text as oid,habit_text as habit from public.objective_habits where user_id=v_source
    union select s->>'o',s->>'t' from jsonb_array_elements(v_src_steps) s where nullif(s->>'o','') is not null
  ) l where v_map->'t' ? l.oid and v_map->'h' ? l.habit on conflict do nothing;
  insert into public.repulsion_habits(user_id,repulsion_id,habit_text)
  select v_me,(v_map->'r'->>l.rid)::bigint,v_map->'h'->>l.habit from (
    select repulsion_id::text as rid,habit_text as habit from public.repulsion_habits where user_id=v_source
    union select id::text,habit_text from public.repulsions where user_id=v_source and nullif(habit_text,'') is not null
  ) l where v_map->'r' ? l.rid and v_map->'h' ? l.habit on conflict do nothing;
  insert into public.objective_visions(user_id,objective_id,vision_id)
  select v_me,(v_map->'t'->>objective_id::text)::uuid,(v_map->'v'->>vision_id::text)::uuid
    from public.objective_visions where user_id=v_source
    and v_map->'t' ? objective_id::text and v_map->'v' ? vision_id::text on conflict do nothing;
  insert into public.repulsion_teachings(user_id,repulsion_id,wisdom_id)
  select v_me,(v_map->'r'->>repulsion_id::text)::bigint,(v_map->'w'->>wisdom_id::text)::uuid
    from public.repulsion_teachings where user_id=v_source
    and v_map->'r' ? repulsion_id::text and v_map->'w' ? wisdom_id::text on conflict do nothing;
  insert into public.teaching_objectives(user_id,wisdom_id,objective_id)
  select v_me,(v_map->'w'->>wisdom_id::text)::uuid,(v_map->'t'->>objective_id::text)::uuid
    from public.teaching_objectives where user_id=v_source
    and v_map->'w' ? wisdom_id::text and v_map->'t' ? objective_id::text on conflict do nothing;
  -- steps.o is the first objective; the junction remains the full truth.
  select coalesce(jsonb_agg(case when exists(select 1 from jsonb_each_text(coalesce(v_map->'h','{}')) h where h.value=s->>'t') and nullif(s->>'o','') is null
    then jsonb_set(s,'{o}',coalesce((select to_jsonb(oh.objective_id::text)
      from public.objective_habits oh where oh.user_id=v_me and oh.habit_text=s->>'t'
      order by oh.created_at,oh.objective_id limit 1),'null'::jsonb),true) else s end order by ord),'[]')
    into v_steps from jsonb_array_elements(v_steps) with ordinality x(s,ord);
  update public.totehms set steps=v_steps,updated_at=now() where user_id=v_me;
  return jsonb_build_object('ok',true,'created',v_created,'reused',v_reused,'total',v_created+v_reused);
end $$;

create or replace function public.my_box_sources()
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('kind',c.kind,'key',c.target_key,
    'pseudo',coalesce(p.pseudo,c.source_pseudo)) order by c.created_at),'[]')
  from public.totehm_box_copies c left join public.profiles p on p.id=c.source_id
  where c.owner_id=auth.uid();
$$;

-- Privileges are last: CREATE OR REPLACE must never reopen internal helpers.
revoke all on function public._totehm_search_text(text) from public,anon,authenticated;
revoke all on function public._totehm_box_index(uuid) from public,anon,authenticated;
revoke all on function public.totehm_discover(text,text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.totehm_discover(text,text,text,text,integer,integer) to anon,authenticated;
revoke all on function public.totehm_import_boxes(text,jsonb) from public,anon,authenticated;
grant execute on function public.totehm_import_boxes(text,jsonb) to authenticated;
revoke all on function public.my_box_sources() from public,anon,authenticated;
grant execute on function public.my_box_sources() to authenticated;
