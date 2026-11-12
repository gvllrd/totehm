-- [COM] Discovery and explicit adoption obey the same per-element audience as native reading.
-- Keep the existing global gate as an additional restriction; never broaden access.
-- No content, price, subscription, payment or existing provenance is changed.
create or replace function public._totehm_box_index(p_owner uuid)
returns table(kind text, box_key text, title text, intentions text[])
language sql stable security definer set search_path = '' as $$
  select 'h', s->>'t', s->>'t', public._step_intentions(s)
  from public.totehms t cross join lateral jsonb_array_elements(t.steps) s
  where t.user_id=p_owner and public._shared_with_me(p_owner) and public._box_shared(p_owner,public._box_audience(p_owner,'h',s->>'t'))
    and btrim(coalesce(s->>'t',''))<>''
  union all
  select 't', o.id::text, o.text, o."is" from public.objectives o
  where o.user_id=p_owner and public._shared_with_me(p_owner) and public._box_shared(p_owner,o.audience) and btrim(o.text)<>''
    and o.status not in ('achieved','abandoned','converted')
  union all
  select 'r', r.id::text, r.repulsion, r."is" from public.repulsions r
  where r.user_id=p_owner and public._shared_with_me(p_owner) and r.active and public._box_shared(p_owner,r.audience) and btrim(r.repulsion)<>''
  union all
  select 'w', w.id::text, w.text, w."is" from public.wisdom w
  where w.user_id=p_owner and public._shared_with_me(p_owner) and public._box_shared(p_owner,w.audience) and btrim(w.text)<>''
  union all
  select 'v', v.id::text, v.text, v."is" from public.visions v
  where v.user_id=p_owner and public._shared_with_me(p_owner) and public._box_shared(p_owner,v.audience) and btrim(v.text)<>'';
$$;

-- CREATE OR REPLACE retains the function's existing ACL. Keep the internal reader private.
revoke all on function public._totehm_box_index(uuid) from public,anon,authenticated;
