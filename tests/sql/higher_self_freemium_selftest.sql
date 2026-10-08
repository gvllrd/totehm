-- COM · 08/10/2026 — TotehmSM v2 : porte Habit + Objective, 7 gratuits / 30 j,
-- Higher 30 / 24 h, Telegram réservé à Higher, `my_landing().sm`.
-- Écrit puis annule tout (exception finale). Attendu : « FAIL={} ».
DO $t$
declare a uuid; b uuid; r jsonb; fails text[]:='{}'; i int; v_id bigint;
begin
  if has_function_privilege('anon','public.sm_begin(uuid,text)','EXECUTE')
     or has_function_privilege('authenticated','public.sm_begin(uuid,text)','EXECUTE')
     or has_function_privilege('authenticated','public.sm_end(bigint,text,text,integer,integer,integer)','EXECUTE')
     or has_function_privilege('authenticated','public._sm_state(uuid)','EXECUTE')
     or has_function_privilege('anon','public._higher_active(uuid)','EXECUTE')
     or not has_function_privilege('service_role','public.sm_begin(uuid,text)','EXECUTE')
     or not has_function_privilege('anon','public.my_landing()','EXECUTE')
     or has_table_privilege('authenticated','public.sm_uses','SELECT')
     or has_table_privilege('anon','public.sm_uses','SELECT') then fails:=array_append(fails,'grants'); end if;
  -- un invité : la règle du serveur, rien de personnel
  perform set_config('request.jwt.claims','{}',true);
  r:=public.my_landing();
  if (r->'sm'->>'ready')::boolean or (r->'sm'->>'free_total')::int <> 7 then fails:=array_append(fails,'anon '||(r->'sm')::text); end if;
  -- un membre sans Habit ou sans Objective : refusé, rien n'est compté
  select p.id into a from public.profiles p where not (public._sm_state(p.id)->>'ready')::boolean and not public._higher_active(p.id) limit 1;
  if a is not null then
    r:=public.sm_begin(a,'say');
    if (r->>'ok')::boolean or r->>'why' <> 'totehm' then fails:=array_append(fails,'gate '||r::text); end if;
    if exists (select 1 from public.sm_uses where user_id=a) then fails:=array_append(fails,'gate_counted'); end if;
  else fails:=array_append(fails,'no_fixture_a'); end if;
  -- un membre prêt, sans Higher : 7, puis la porte Higher
  select p.id into b from public.profiles p where (public._sm_state(p.id)->>'ready')::boolean and not public._higher_active(p.id) limit 1;
  if b is null then raise exception 'HIGHER_SELF_V2 · FAIL=%', array_append(fails,'no_fixture_b'); end if;
  -- un échec ne compte pas ; un « pending » de plus de deux minutes non plus
  r:=public.sm_begin(b,'say'); perform public.sm_end((r->>'id')::bigint,'failed');
  insert into public.sm_uses(user_id,kind,status,created_at) values (b,'say','pending',now()-interval '3 minutes');
  if (public._sm_state(b)->>'free_left')::int <> 7 then fails:=array_append(fails,'failed_counted '||public._sm_state(b)::text); end if;
  for i in 1..7 loop
    r:=public.sm_begin(b,'say');
    if not (r->>'ok')::boolean or (r->>'left')::int <> 7-i then fails:=array_append(fails,'free_'||i||' '||r::text); end if;
    if not public.sm_end((r->>'id')::bigint,'ok','gpt-test',900,1200,80) then fails:=array_append(fails,'end_'||i); end if;
  end loop;
  if public.sm_end((r->>'id')::bigint,'failed') then fails:=array_append(fails,'end_twice'); end if;
  r:=public.sm_begin(b,'say');
  if (r->>'ok')::boolean or r->>'why' <> 'higher_required' then fails:=array_append(fails,'eighth '||r::text); end if;
  r:=public.sm_begin(b,'telegram');
  if (r->>'ok')::boolean or r->>'why' <> 'higher_required' then fails:=array_append(fails,'telegram_free '||r::text); end if;
  perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
  r:=public.my_landing();
  if not (r->'sm'->>'ready')::boolean or (r->'sm'->>'free_left')::int <> 0 or (r->'sm'->>'higher')::boolean then fails:=array_append(fails,'landing '||(r->'sm')::text); end if;
  -- Higher (écrit comme le webhook l'écrit) : 30 par 24 h, Telegram ouvert
  perform public.higher_sub_sync(b,'sub_selftest_v2','active',now()+interval '30 days',false,700,'eur');
  r:=public.sm_begin(b,'say');
  if not (r->>'ok')::boolean or not (r->>'higher')::boolean or (r->>'left')::int <> 22 then fails:=array_append(fails,'higher '||r::text); end if;
  r:=public.sm_begin(b,'telegram');
  if not (r->>'ok')::boolean then fails:=array_append(fails,'telegram_higher '||r::text); end if;
  if not (public.my_landing()->'sm'->>'higher')::boolean then fails:=array_append(fails,'landing_higher'); end if;
  if (public.sm_begin(null,'say')->>'ok')::boolean or (public.sm_begin(b,'x')->>'ok')::boolean then fails:=array_append(fails,'bad_args'); end if;
  raise exception 'HIGHER_SELF_V2 · FAIL=%', fails;
end $t$;
