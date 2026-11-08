-- Persist each view's own importance order. No auth.users FK, no existing RPC
-- or policy replacement. Old habit array order and importance values remain.
create table public.element_orders (
  user_id uuid not null,
  kind text not null check (kind in ('habit','objective','repulsion','vision','wisdom')),
  refs text[] not null check (cardinality(refs) between 0 and 400 and array_position(refs,null) is null),
  updated_at timestamptz not null default now(),
  primary key (user_id,kind)
);
alter table public.element_orders enable row level security;

create function public._element_orders_forget()
returns trigger language plpgsql security definer set search_path = '' as $f$
begin
  delete from public.element_orders where user_id = old.id;
  return null;
end $f$;
create trigger element_orders_forget after delete on public.profiles
  for each row execute function public._element_orders_forget();

create function public.element_order_set(p_kind text, p_refs text[])
returns jsonb language plpgsql security definer set search_path = '' as $f$
declare v_uid uuid := auth.uid(); v_valid text[];
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if p_kind is null or p_kind not in ('habit','objective','repulsion','vision','wisdom')
     or p_refs is null or cardinality(p_refs) > 400 or array_ndims(p_refs) > 1
     or exists(select 1 from unnest(p_refs) r where r is null or length(r) > 500)
     or (select count(*) <> count(distinct r) from unnest(p_refs) r) then
    raise exception 'invalid order';
  end if;
  if p_kind = 'habit' then
    select array_agg(s->>'t') into v_valid from public.totehms t,
      jsonb_array_elements(coalesce(t.steps,'[]'::jsonb)) s where t.user_id = v_uid;
  elsif p_kind = 'objective' then
    select array_agg(id::text) into v_valid from public.objectives
      where user_id = v_uid and coalesce(status,'active') not in ('achieved','abandoned','converted');
  elsif p_kind = 'repulsion' then
    select array_agg(id::text) into v_valid from public.repulsions where user_id = v_uid and active;
  elsif p_kind = 'vision' then
    select array_agg(id::text) into v_valid from public.visions where user_id = v_uid;
  else
    select array_agg(id::text) into v_valid from public.wisdom where user_id = v_uid;
  end if;
  if not (p_refs <@ coalesce(v_valid,'{}'::text[])) then raise exception 'unknown element'; end if;
  insert into public.element_orders(user_id,kind,refs) values (v_uid,p_kind,p_refs)
    on conflict(user_id,kind) do update set refs = excluded.refs, updated_at = now();
  return jsonb_build_object('ok',true);
end $f$;

-- Same audience reader as the app, filtered BEFORE refs leave this function.
-- A private element cannot leak its name, id or position through ordering.
create function public.element_orders_for(p_pseudo text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $f$
declare v_uid uuid := auth.uid(); v_owner uuid; v_tree jsonb; v_orders jsonb;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if p_pseudo is null then v_owner := v_uid;
  else
    select id into v_owner from public.profiles where lower(pseudo) = lower(btrim(p_pseudo));
    if v_owner is null or (v_owner <> v_uid and not public._subscriber_of(v_owner,v_uid)) then
      return jsonb_build_object('ok',false,'why','unavailable');
    end if;
    v_tree := public.totehm_read(p_pseudo);
    if coalesce((v_tree->>'ok')::boolean,false) is not true then return jsonb_build_object('ok',false,'why','unavailable'); end if;
  end if;
  select coalesce(jsonb_object_agg(x.kind,x.refs),'{}'::jsonb) into v_orders from (
    select o.kind, coalesce(jsonb_agg(r.ref order by r.n) filter (where r.ref is not null),'[]'::jsonb) refs
    from public.element_orders o
    left join lateral (
      select ref,n from unnest(o.refs) with ordinality as e(ref,n)
      where p_pseudo is null or v_owner = v_uid or exists (
        select 1 from jsonb_array_elements(coalesce(v_tree->case o.kind
          when 'habit' then 'steps' when 'objective' then 'trips' when 'repulsion' then 'reps'
          when 'vision' then 'visions' else 'wisdom' end,'[]'::jsonb)) item
        where case when o.kind = 'habit' then item->>'t' else item->>'id' end = ref)
    ) r on true
    where o.user_id = v_owner group by o.kind
  ) x;
  return jsonb_build_object('ok',true,'orders',v_orders);
end $f$;

-- MCP revalidates consent and entitlement for every member-order read. Its
-- caller is a service client, not a caller-supplied user id or site session.
create function public.chatgpt_member_orders(p_grant uuid,p_pseudo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $f$
declare v_uid uuid; v_result jsonb;
  v_sub text := current_setting('request.jwt.claim.sub',true);
  v_claims text := current_setting('request.jwt.claims',true);
begin
  select g.user_id into v_uid from public.chatgpt_grants g
    join public.chatgpt_ecosystem_consents c on c.grant_id = g.id and c.version = 1
    where g.id = p_grant and g.revoked_at is null;
  if v_uid is null then return jsonb_build_object('ok',false,'why','consent_required'); end if;
  if p_pseudo is null or length(p_pseudo) > 80 then return jsonb_build_object('ok',false,'why','invalid_request'); end if;
  perform set_config('request.jwt.claim.sub',v_uid::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_uid,'role','authenticated')::text,true);
  v_result := public.element_orders_for(p_pseudo);
  perform set_config('request.jwt.claim.sub',coalesce(v_sub,''),true);
  perform set_config('request.jwt.claims',coalesce(v_claims,''),true);
  return v_result;
end $f$;

revoke all on public.element_orders from public,anon,authenticated;
revoke all on function public._element_orders_forget() from public,anon,authenticated;
grant select on public.element_orders to service_role;
revoke all on function public.element_order_set(text,text[]) from public,anon;
revoke all on function public.element_orders_for(text) from public,anon;
grant execute on function public.element_order_set(text,text[]) to authenticated;
grant execute on function public.element_orders_for(text) to authenticated;
revoke all on function public.chatgpt_member_orders(uuid,text) from public,anon,authenticated;
grant execute on function public.chatgpt_member_orders(uuid,text) to service_role;
