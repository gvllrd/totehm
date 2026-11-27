-- Personal presentation preferences, separate from box priorities and audiences.
create schema grid_order_private;
revoke all on schema grid_order_private from public, anon, authenticated;
grant usage on schema grid_order_private to authenticated;

create table grid_order_private.orders (
  user_id uuid not null,
  kind text not null check (kind in ('media', 'spot')),
  refs text[] not null,
  revision integer not null default 1,
  primary key (user_id, kind)
);
comment on table grid_order_private.orders is '[COM] Private manual order of the member''s media and spots';
alter table grid_order_private.orders enable row level security;
revoke all on table grid_order_private.orders from public, anon, authenticated;

create function grid_order_private.mine()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('ok', true, 'orders',
    coalesce(jsonb_object_agg(o.kind, jsonb_build_object('refs', o.refs, 'revision', o.revision)), '{}'::jsonb))
  from grid_order_private.orders o
  where o.user_id = (select auth.uid());
$$;

create function grid_order_private.save(p_kind text, p_refs text[], p_revision integer)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  next_revision integer;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'why', 'signin');
  end if;
  if p_kind is null or p_kind not in ('media', 'spot') or p_revision is null or p_revision < 0
    or p_refs is null or cardinality(p_refs) > 4000 or array_ndims(p_refs) > 1
    or exists (select 1 from unnest(p_refs) as r(ref)
      where ref is null or ref !~ case p_kind
        when 'media' then '^(em|vi):[a-zA-Z0-9_-]{1,64}$'
        else '^sp:[a-zA-Z0-9_-]{1,64}$' end)
    or cardinality(p_refs) <> (select count(distinct ref) from unnest(p_refs) as r(ref))
  then
    return jsonb_build_object('ok', false, 'why', 'order');
  end if;

  if p_revision = 0 then
    insert into grid_order_private.orders (user_id, kind, refs)
    values (uid, p_kind, p_refs)
    on conflict (user_id, kind) do nothing
    returning revision into next_revision;
  else
    update grid_order_private.orders set refs = p_refs, revision = revision + 1
    where user_id = uid and kind = p_kind and revision = p_revision
    returning revision into next_revision;
  end if;
  if next_revision is null then
    return jsonb_build_object('ok', false, 'why', 'changed');
  end if;
  return jsonb_build_object('ok', true, 'revision', next_revision);
end;
$$;

create function public.my_grid_orders()
returns jsonb
language sql stable security invoker set search_path = ''
as $$ select grid_order_private.mine() $$;

create function public.grid_order_set(p_kind text, p_refs text[], p_revision integer)
returns jsonb
language sql security invoker set search_path = ''
as $$ select grid_order_private.save(p_kind, p_refs, p_revision) $$;

revoke all on function grid_order_private.mine(), grid_order_private.save(text, text[], integer)
from public, anon, authenticated;
grant execute on function grid_order_private.mine(), grid_order_private.save(text, text[], integer) to authenticated;
revoke all on function public.my_grid_orders(), public.grid_order_set(text, text[], integer) from public, anon, authenticated;
grant execute on function public.my_grid_orders(), public.grid_order_set(text, text[], integer) to authenticated;
