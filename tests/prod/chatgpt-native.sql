-- Production verification using synthetic identities only.
-- BEGIN/ROLLBACK discards EVERY synthetic row and claim setting, including on a caught error.
-- Read verification.failures (expected []) and verification.passed=verification.checks.
-- No notification function, tracking answer, external request, or real member read.
begin;
DO $verify$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  pa text; pb text;
  obj uuid := gen_random_uuid(); vis uuid := gen_random_uuid(); story uuid := gen_random_uuid();
  cid uuid; r_old uuid; r_new uuid; g_old uuid; g_new uuid;
  ch_old text := md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  ch_new text := md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  ah text := md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  rh text := md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  ah2 text := md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  rh2 text := md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  result jsonb; native jsonb; readback jsonb; flags jsonb := '{}'::jsonb;
  failures text[]; total int; sig text; tbl text; rl text;
begin
  pa := 'verify'||substr(replace(a::text,'-',''),1,18);
  pb := 'verify'||substr(replace(b::text,'-',''),1,18);
  insert into auth.users(id) values (a),(b);
  insert into public.profiles(id,pseudo) values (a,pa),(b,pb);
  insert into public.totehms(user_id,audience,habits)
    values (a,'private','[{"t":"Synthetic verification Habit","f":"daily","is":["focus"]}]'),
           (b,'private','[{"t":"Other synthetic Habit","f":"daily","is":["flow"]}]');
  insert into public.objectives(id,user_id,text,target_at,"is")
    values (obj,a,'Synthetic dated objective',now()+interval '10 days',array['focus']),
           (vis,a,'Synthetic undated vision',null,array['focus']);
  insert into public.stories(id,user_id,text,importance,"is")
    values (story,a,'Synthetic MY STORY',1,array['focus']);
  insert into public.story_objectives(user_id,story_id,objective_id)
    values (a,story,vis);
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  native := public.my_totehm();
  flags := flags || jsonb_build_object(
    'native_keys', native ?& array['habits','objectives','repulsions','stories','visions'],
    'no_legacy_tree_keys', not native ?| array['steps','trips','reps','wisdom'],
    'native_habit', native->'habits'->0->>'t'='Synthetic verification Habit',
    'dated_objective',jsonb_array_length(native->'objectives')=1 and native->'objectives'->0->>'id'=obj::text,
    'undated_vision',jsonb_array_length(native->'visions')=1 and native->'visions'->0->>'id'=vis::text,
    'native_story',native->'stories'->0->>'id'=story::text,
    'native_story_link',native->'stories'->0->'os' @> jsonb_build_array(vis),
    'native_intentions',public._habit_intentions('{"t":"Synthetic verification Habit","is":["focus"]}')=array['focus']
  );
  readback := public.totehm_read(pa);
  flags := flags || jsonb_build_object(
    'member_read_native_keys', readback ?& array['habits','objectives','repulsions','stories','visions'],
    'member_read_bridges_retained',readback ?& array['steps','trips','reps','wisdom'],
    'member_aliases_equal',readback->'habits'=readback->'steps' and readback->'stories'=readback->'wisdom'
  );
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  result := public.my_totehm();
  flags := flags || jsonb_build_object(
    'tree_owner_isolation',result->'habits'->0->>'t'='Other synthetic Habit' and jsonb_array_length(result->'stories')=0,
    'private_member_refused',public.totehm_read(pa)->>'why'='private'
  );

  insert into public.chatgpt_clients(name,redirect_uris)
    values ('Synthetic production verification',array['https://chatgpt.example.test/callback']) returning client_id into cid;
  insert into public.chatgpt_requests(client_id,redirect_uri,code_challenge,state,resource)
    values (cid,'https://chatgpt.example.test/callback',repeat('A',43),'synthetic-state','https://www.totehm.com/mcp') returning id into r_old;
  result := public.chatgpt_authorize_request(r_old,a,ch_old);
  select grant_id into g_old from public.chatgpt_codes where code_hash=ch_old;
  flags := flags || jsonb_build_object(
    'legacy_authorization_valid',result->>'ok'='true' and g_old is not null,
    'legacy_no_ecosystem_consent',not exists(select 1 from public.chatgpt_ecosystem_consents where grant_id=g_old),
    'legacy_ecosystem_refused',public.chatgpt_read_ecosystem(g_old,'members')->>'why'='consent_required'
  );
  insert into public.chatgpt_requests(client_id,redirect_uri,code_challenge,state,resource)
    values (cid,'https://chatgpt.example.test/callback',repeat('A',43),'synthetic-state','https://www.totehm.com/mcp') returning id into r_new;
  result := public.chatgpt_authorize_ecosystem(r_new,a,ch_new);
  select grant_id into g_new from public.chatgpt_codes where code_hash=ch_new;
  flags := flags || jsonb_build_object(
    'explicit_ecosystem_consent',result->>'ok'='true' and exists(select 1 from public.chatgpt_ecosystem_consents where grant_id=g_new and version=1),
    'consent_does_not_upgrade_old_grant',not exists(select 1 from public.chatgpt_ecosystem_consents where grant_id=g_old),
    'authorization_single_use',public.chatgpt_authorize_ecosystem(r_new,a,md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text))->>'ok'='false'
  );
  result := public.chatgpt_read_ecosystem(g_new,'members');
  flags := flags || jsonb_build_object(
    'ecosystem_authorized',result->>'ok'='true' and jsonb_array_length(result->'items')=0,
    'subject_restored',auth.uid()=b,
    'unsubscribed_member_refused',public.chatgpt_read_ecosystem(g_new,'member',pb)->>'why'='unavailable'
  );
  result := public.chatgpt_exchange_code(ch_new,cid,'https://chatgpt.example.test/callback',repeat('B',43),'https://www.totehm.com/mcp',ah,rh);
  flags := flags || jsonb_build_object(
    'wrong_pkce_refused',result->>'ok'='false',
    'bad_pkce_not_consumed',exists(select 1 from public.chatgpt_codes where code_hash=ch_new and consumed_at is null)
  );
  result := public.chatgpt_exchange_code(ch_new,cid,'https://chatgpt.example.test/callback',repeat('A',43),'https://www.totehm.com/mcp',ah,rh);
  flags := flags || jsonb_build_object(
    'pkce_exchange',result->>'ok'='true' and result->>'expires_in'='3600' and result->'scope'='["totehm:read"]'::jsonb,
    'two_hashed_credentials',2=(select count(*) from public.chatgpt_tokens where grant_id=g_new)
  );
  result := public.chatgpt_revoke(b,cid);
  flags := flags || jsonb_build_object(
    'foreign_revoke_no_effect',result->>'count'='0' and exists(select 1 from public.chatgpt_grants where id=g_new and revoked_at is null)
  );
  result := public.chatgpt_revoke(a,cid);
  flags := flags || jsonb_build_object(
    'owner_revocation',result->>'count'='2',
    'revoked_ecosystem_refused',public.chatgpt_read_ecosystem(g_new,'members')->>'why'='consent_required',
    'revoked_refresh_refused',public.chatgpt_refresh(rh,cid,'https://www.totehm.com/mcp',ah2,rh2)->>'ok'='false'
  );

  foreach tbl in array array['chatgpt_clients','chatgpt_requests','chatgpt_grants','chatgpt_codes','chatgpt_tokens','chatgpt_ecosystem_consents'] loop
    flags := flags || jsonb_build_object(tbl||'_rls',exists(select 1 from pg_class where oid=('public.'||tbl)::regclass and relrowsecurity));
    foreach rl in array array['anon','authenticated'] loop
      flags := flags || jsonb_build_object(tbl||'_'||rl||'_no_direct_access',not has_table_privilege(rl,'public.'||tbl,'SELECT,INSERT,UPDATE,DELETE'));
    end loop;
  end loop;
  foreach sig in array array[
    'chatgpt_authorize_request(uuid,uuid,text)',
    'chatgpt_authorize_ecosystem(uuid,uuid,text)',
    'chatgpt_exchange_code(text,uuid,text,text,text,text,text)',
    'chatgpt_refresh(text,uuid,text,text,text)',
    'chatgpt_revoke(uuid,uuid)',
    'chatgpt_read_ecosystem(uuid,text,text,text,jsonb,integer,integer)'
  ] loop
    flags := flags || jsonb_build_object(sig||'_service_only',
      has_function_privilege('service_role','public.'||sig,'EXECUTE')
      and not has_function_privilege('authenticated','public.'||sig,'EXECUTE')
      and not has_function_privilege('anon','public.'||sig,'EXECUTE'));
  end loop;
  flags := flags || jsonb_build_object(
    'steps_column_bridge_retained',exists(select 1 from information_schema.columns where table_schema='public' and table_name='totehms' and column_name='steps'),
    'my_trips_bridge_retained',to_regprocedure('public.my_trips()') is not null,
    'three_story_view_bridges_retained',3=(select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='v' and relname in ('wisdom','repulsion_teachings','teaching_objectives')),
    'old_admin_bridge_retained',exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='add_wisdom_admin')
  );
  select count(*),coalesce(array_agg(key order by key) filter(where value is distinct from 'true'::jsonb),'{}'::text[])
    into total,failures from jsonb_each(flags);
  perform set_config('totehm.production_verification',jsonb_build_object('checks',total,'passed',total-cardinality(failures),'failures',failures)::text,true);
exception when others then
 perform set_config('totehm.production_verification',jsonb_build_object('error',SQLERRM,'state',SQLSTATE)::text,true);
end $verify$;
select current_setting('totehm.production_verification',true)::jsonb as verification;
rollback;