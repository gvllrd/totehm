-- SPACE · space_delete (06/10/2026) : le propriétaire seul supprime un space.
-- Écrit puis annule tout (exception finale). Attendu : « FAIL={} ».
DO $t$
declare ua uuid; s uuid; r jsonb; r2 jsonb; fails text[]:='{}'; st text; n_before bigint; n_after bigint; vis bigint;
begin
  if has_function_privilege('anon','public.space_delete(uuid)','EXECUTE') or not has_function_privilege('authenticated','public.space_delete(uuid)','EXECUTE') then fails:=array_append(fails,'grants'); end if;
  perform set_config('request.jwt.claims','{}',true);
  if public.space_delete(gen_random_uuid())->>'why' is distinct from 'signin' then fails:=array_append(fails,'no_session'); end if;
  select p.user_id, p.spot_id into ua, s from public.spot_plans p where p.status='published' order by p.starts_at desc limit 1;
  -- un autre membre ne supprime rien
  perform set_config('request.jwt.claims',json_build_object('sub','00000000-0000-4000-8000-000000000009','role','authenticated')::text,true);
  r:=public.space_delete(s);
  select status into st from public.spot_plans where spot_id=s;
  if r->>'why' is distinct from 'not_found' or st<>'published' then fails:=array_append(fails,'stranger '||coalesce(r->>'why','?')); end if;
  -- le propriétaire : le space disparaît de son historique, de ses habits, et ne se lit plus
  perform set_config('request.jwt.claims',json_build_object('sub',ua,'role','authenticated')::text,true);
  select jsonb_array_length(public.my_spaces(null,null,100)->'spaces') into n_before;
  r:=public.space_delete(s);
  select status into st from public.spot_plans where spot_id=s;
  if not (r->>'ok')::boolean or st<>'cancelled' then fails:=array_append(fails,'owner'); end if;
  if jsonb_typeof(r->'media'->'paths') is distinct from 'array' then fails:=array_append(fails,'media'); end if;
  if exists(select 1 from public.spot_plans where spot_id=s and (video is not null or photo is not null or video_id is not null)) then fails:=array_append(fails,'media_ref'); end if;
  select jsonb_array_length(public.my_spaces(null,null,100)->'spaces') into n_after;
  if n_after<>n_before-1 then fails:=array_append(fails,'my_spaces '||n_before||'→'||n_after); end if;
  select count(*) into vis from jsonb_array_elements(public.habit_spaces()->'habits') h, jsonb_array_elements(h->'spaces') x where x->>'id'=s::text;
  if vis>0 then fails:=array_append(fails,'habit_spaces'); end if;
  if coalesce((public.spot_get(s)->>'ok')::boolean,false) then fails:=array_append(fails,'spot_get'); end if;
  -- deux fois : rien
  r2:=public.space_delete(s);
  if r2->>'why' is distinct from 'not_found' then fails:=array_append(fails,'twice'); end if;
  raise exception 'SPACE_DELETE my_spaces %→% · FAIL=%', n_before, n_after, fails;
end $t$;
