-- Habit selection means the complete Habit name, never a free-text search.
create or replace function public._spot_match(p public.spot_plans,p_q text,p_intention text)
returns boolean language sql immutable set search_path=public as $$
 select (p_intention is null or p_intention=any(p.intentions))
  and (nullif(btrim(p_q),'') is null or btrim(p.habit)=btrim(p_q));
$$;
revoke all on function public._spot_match(public.spot_plans,text,text) from public,anon,authenticated;
grant execute on function public._spot_match(public.spot_plans,text,text) to service_role;
