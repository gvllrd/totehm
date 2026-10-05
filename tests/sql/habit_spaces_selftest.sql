-- COM · habit_spaces (05/10/2026) : les spaces de SPACE, regroupés par habitude.
-- Lecture seule, aucun compte ni contenu créé ; l'exception finale annule tout.
-- Attendu : « FAIL={} ».
DO $t$
declare ua uuid; pa text; r jsonb; r2 jsonb; r3 jsonb; fails text[]:='{}'; n_pub bigint; n_shared bigint; n_out bigint; n_out2 bigint; leak bigint;
begin
  if has_function_privilege('anon','public.habit_spaces(text)','EXECUTE') or not has_function_privilege('authenticated','public.habit_spaces(text)','EXECUTE') then fails:=array_append(fails,'grants'); end if;
  perform set_config('request.jwt.claims','{}',true);
  if public.habit_spaces()->>'why' is distinct from 'signin' then fails:=array_append(fails,'no_session'); end if;
  select p.user_id into ua from public.spot_plans p where p.status='published' group by p.user_id order by count(*) desc limit 1;
  select pseudo into pa from public.profiles where id=ua;
  perform set_config('request.jwt.claims',json_build_object('sub',ua,'role','authenticated')::text,true);
  r:=public.habit_spaces();
  select count(*) into n_pub from public.spot_plans where user_id=ua and status='published' and btrim(coalesce(habit,''))<>'';
  select coalesce(sum((h->>'total')::int),0) into n_out from jsonb_array_elements(r->'habits') h;
  if n_out<>n_pub then fails:=array_append(fails,'owner_total '||n_out||'/'||n_pub); end if;
  if exists(select 1 from jsonb_array_elements(r->'habits') h where jsonb_array_length(h->'spaces')>3) then fails:=array_append(fails,'max3'); end if;
  -- un autre membre, sans abonnement : les partagés seulement, jamais le point exact ni le contexte
  perform set_config('request.jwt.claims',json_build_object('sub','00000000-0000-4000-8000-000000000009','role','authenticated')::text,true);
  r2:=public.habit_spaces(pa);
  select count(*) into n_shared from public.spot_plans where user_id=ua and status='published' and visibility='shared' and btrim(coalesce(habit,''))<>'';
  select coalesce(sum((h->>'total')::int),0) into n_out2 from jsonb_array_elements(r2->'habits') h;
  if n_out2<>n_shared then fails:=array_append(fails,'reader_shared '||n_out2||'/'||n_shared); end if;
  select count(*) into leak from jsonb_array_elements(r2->'habits') h, jsonb_array_elements(h->'spaces') s
   where s->>'visibility'<>'shared' or (s->'exact') is not null and s->'exact'<>'null'::jsonb or (s->'context') is not null and s->'context'<>'null'::jsonb;
  if leak>0 then fails:=array_append(fails,'leak '||leak); end if;
  r3:=public.habit_spaces('personne_qui_nexiste_pas_xyz');
  if r3->>'why' is distinct from 'nobody' then fails:=array_append(fails,'nobody'); end if;
  raise exception 'HABIT_SPACES owner=% habits=% spaces=% · reader shared=% · FAIL=%', pa is not null, jsonb_array_length(r->'habits'), n_out, n_out2, fails;
end $t$;
