-- COM · 07/10/2026 — my_landing, avatar_set, sm_thread, higher_sub_sync.
-- Écrit puis annule tout (exception finale). Attendu : « FAIL={} ».
DO $t$
declare u uuid; r jsonb; fails text[]:='{}'; had_bot boolean;
begin
  if not has_function_privilege('anon','public.my_landing()','EXECUTE')
     or has_function_privilege('anon','public.avatar_set(text)','EXECUTE')
     or has_function_privilege('anon','public.sm_thread(bigint,integer)','EXECUTE')
     or has_function_privilege('authenticated','public.higher_sub_sync(uuid,text,text,timestamptz,boolean,integer,text)','EXECUTE')
     or has_table_privilege('authenticated','public.sm_messages','SELECT')
     or has_table_privilege('authenticated','public.member_avatars','SELECT') then fails:=array_append(fails,'grants'); end if;
  -- un invité : rien de personnel, le prix du serveur
  perform set_config('request.jwt.claims','{}',true);
  r:=public.my_landing();
  if (r->>'signed_in')::boolean or r->'higher'->>'price_cents' is null or r ? 'pseudo' then fails:=array_append(fails,'anon '||r::text); end if;
  -- un membre sans abonnement Higher
  select p.id into u from public.profiles p where not exists (select 1 from public.bot_subscriptions b where b.user_id=p.id)
   and not exists (select 1 from public.figher_comps c join auth.users au on lower(au.email)=lower(c.email) where au.id=p.id) limit 1;
  perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
  r:=public.my_landing();
  if not (r->>'signed_in')::boolean or (r->'higher'->>'active')::boolean or r->>'visibility' not in ('private','subscribers') then fails:=array_append(fails,'member '||r::text); end if;
  -- la vignette : refusée si ce n'est pas un JPEG, rendue sinon
  if (public.avatar_set('data:image/png;base64,AAAA')->>'ok')::boolean then fails:=array_append(fails,'avatar_png'); end if;
  if not (public.avatar_set('data:image/jpeg;base64,/9j/AAAA')->>'ok')::boolean then fails:=array_append(fails,'avatar_set'); end if;
  if public.my_landing()->>'avatar' is distinct from 'data:image/jpeg;base64,/9j/AAAA' then fails:=array_append(fails,'avatar_read'); end if;
  -- le fil : le plus récent d'abord, le mien seulement
  insert into public.sm_messages(user_id, role, text) values (u,'me','I am tired');
  insert into public.sm_messages(user_id, role, kind, text) values (u,'sm','habit','I sleep at 23:00 tonight.');
  r:=public.sm_thread(null, 30);
  if not (r->>'ok')::boolean or r->'messages'->0->>'role' <> 'sm' or r->'messages'->1->>'text' <> 'I am tired' then fails:=array_append(fails,'thread '||r::text); end if;
  -- l'abonnement Higher, écrit comme le webhook l'écrit : l'accès s'ouvre
  r:=public.higher_sub_sync(u,'sub_selftest','active',now()+interval '30 days',false,700,'eur');
  if not (r->>'ok')::boolean or not (public.my_landing()->'higher'->>'active')::boolean then fails:=array_append(fails,'higher_sync'); end if;
  if (public.higher_sub_sync(u,'sub_selftest','incomplete_expired',null,false,700,'eur')->>'ok')::boolean then fails:=array_append(fails,'status_check'); end if;
  r:=public.higher_sub_sync(u,'sub_selftest','canceled',now(),false,null,'eur');
  if (public.my_landing()->'higher'->>'active')::boolean then fails:=array_append(fails,'higher_cancel'); end if;
  raise exception 'HIGHER_SELF · FAIL=%', fails;
end $t$;
