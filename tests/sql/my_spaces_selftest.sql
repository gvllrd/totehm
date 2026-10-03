-- Read-only regression for COM's owner history. No account or content is created.
-- JWT claim settings and all transaction effects roll back via the final exception.
DO $test$
declare
  ua uuid; ub uuid := '00000000-0000-4000-8000-000000000001';
  r jsonb; first_page jsonb; second_page jsonb; last_item jsonb; expected_id uuid;
  fails text[] := '{}'; n bigint;
begin
  if has_function_privilege('anon','public.my_spaces(timestamptz,uuid,integer)','EXECUTE')
     or not has_function_privilege('authenticated','public.my_spaces(timestamptz,uuid,integer)','EXECUTE') then
    fails := array_append(fails,'grants');
  end if;
  perform set_config('request.jwt.claims','{}',true);
  if public.my_spaces()->>'why' is distinct from 'signin' then fails := array_append(fails,'no_session'); end if;
  select p.user_id into ua from public.spot_plans p where p.status='published' group by p.user_id order by count(*) desc limit 1;
  if ua is null then select id into ua from public.profiles limit 1; end if;
  if ua=ub then ub:='00000000-0000-4000-8000-000000000002'; end if;
  perform set_config('request.jwt.claims',json_build_object('sub',ua,'role','authenticated')::text,true);
  r:=public.my_spaces(null,null,100);
  if ua is not null and r->>'ok' is distinct from 'true' then fails:=array_append(fails,'member_read'); end if;
  if exists(select 1 from jsonb_array_elements(coalesce(r->'spaces','[]')) x
    left join public.spot_plans p on p.spot_id=(x->>'id')::uuid
    where p.user_id is distinct from ua or p.status<>'published') then fails:=array_append(fails,'only_own_published'); end if;
  if exists(select 1 from jsonb_array_elements(coalesce(r->'spaces','[]')) x where x ? 'exact' or x ? 'video' or x ? 'context') then fails:=array_append(fails,'minimal_payload'); end if;
  select count(*) into n from public.spot_plans where user_id=ua and status='published';
  if ua is not null and jsonb_array_length(r->'spaces')<>least(n,100) then fails:=array_append(fails,'history_includes_private_and_shared'); end if;
  if ua is not null then
    first_page:=public.my_spaces(null,null,1);last_item:=first_page->'spaces'->0;
    if n>0 then
      if jsonb_array_length(first_page->'spaces')<>1 then fails:=array_append(fails,'bounded_page'); end if;
      second_page:=public.my_spaces((last_item->>'starts_at')::timestamptz,(last_item->>'id')::uuid,1);
      select spot_id into expected_id from public.spot_plans where user_id=ua and status='published'
        and (starts_at,spot_id)<((last_item->>'starts_at')::timestamptz,(last_item->>'id')::uuid)
        order by starts_at desc,spot_id desc limit 1;
      if (second_page->'spaces'->0->>'id')::uuid is distinct from expected_id then fails:=array_append(fails,'cursor_order'); end if;
      if (first_page->>'more')::boolean is distinct from (n>1) then fails:=array_append(fails,'more_flag'); end if;
    end if;
  end if;
  perform set_config('request.jwt.claims',json_build_object('sub',ub,'role','authenticated')::text,true);
  r:=public.my_spaces();
  if jsonb_array_length(r->'spaces')<>0 or r->>'ok' is distinct from 'true' then fails:=array_append(fails,'other_member_empty'); end if;
  raise exception 'MY SPACES SELFTEST (rolled back): grants, session, ownership, private/shared, payload, cursor, other member | FAIL=%',fails;
end $test$;
