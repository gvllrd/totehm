-- Every fixture and import is rolled back by the final exception.
DO $test$
declare
  ua uuid:=gen_random_uuid();ub uuid:=gen_random_uuid();uc uuid:=gen_random_uuid();
  pa text:='zzbox_'||left(ua::text,8);pb text:=pa||'_studio';pc text:=pa||'_private';
  ot uuid:=gen_random_uuid();wv uuid:=gen_random_uuid();ww uuid:=gen_random_uuid();rr bigint;
  r jsonb;s jsonb;before_source jsonb;after_source jsonb;sel jsonb;first_page jsonb;second_page jsonb;
  fails text[]:='{}';target_o uuid;target_r bigint;target_w uuid;target_v uuid;n integer;
begin
  insert into auth.users(id,email) values(ua,pa||'@example.invalid'),(ub,pb||'@example.invalid'),(uc,pc||'@example.invalid');
  insert into public.profiles(id,pseudo) values(ua,pa),(ub,pb),(uc,pc);
  insert into public.totehms(user_id,totehm_visibility,steps) values
    (ua,'members',jsonb_build_array(jsonb_build_object('t','Deep practice','f','daily','i','focus','is',jsonb_build_array('focus','express'),'o',ot))),
    (ub,'members','[{"t":"Own ritual","f":"weekly","i":"love","is":["love"]}]'),
    (uc,'private','[{"t":"SECRET QUASAR","f":"daily","is":["focus"]}]');
  insert into public.objectives(id,user_id,text,target_at,"is",i) values(ot,ua,'Build a practice',now()+interval '7 days',array['focus'],'focus');
  insert into public.repulsions(user_id,habit_text,obstacle,repulsion,"is",i) values(ua,'','Phone','Put the phone away',array['focus'],'focus') returning id into rr;
  insert into public.visions(id,user_id,text,"is",i) values(wv,ua,'A focused life',array['focus'],'focus');
  insert into public.wisdom(id,user_id,text,"is",i) values(ww,ua,'Attention is a choice',array['focus'],'focus');
  insert into public.objective_habits(user_id,objective_id,habit_text) values(ua,ot,'Deep practice');
  insert into public.objective_visions(user_id,objective_id,vision_id) values(ua,ot,wv);
  insert into public.repulsion_habits(user_id,repulsion_id,habit_text) values(ua,rr,'Deep practice');
  insert into public.repulsion_teachings(user_id,repulsion_id,wisdom_id) values(ua,rr,ww);
  insert into public.teaching_objectives(user_id,wisdom_id,objective_id) values(ua,ww,ot);
  sel:=jsonb_build_array(jsonb_build_object('kind','h','key','Deep practice'),jsonb_build_object('kind','t','key',ot),jsonb_build_object('kind','r','key',rr),jsonb_build_object('kind','w','key',ww),jsonb_build_object('kind','v','key',wv));
  if has_function_privilege('anon','public.totehm_import_boxes(text,jsonb)','execute')
    or has_function_privilege('authenticated','public._totehm_box_index(uuid)','execute')
    or has_table_privilege('authenticated','public.totehm_box_copies','select')
    or not has_function_privilege('anon','public.totehm_discover(text,text,text,text,integer,integer)','execute') then fails:=array_append(fails,'grants');end if;
  perform set_config('request.jwt.claims','{}',true);
  r:=public.totehm_discover(pa);
  if r->'items'->0->>'pseudo' is distinct from pa or (r->'items'->0->>'can_read')::boolean
    or exists(select 1 from jsonb_array_elements(r->'items') x where x->'boxes'<>'null'::jsonb) then fails:=array_append(fails,'names_no_content');end if;
  if exists(select 1 from jsonb_array_elements(r->'items') x where x->>'pseudo'=pc) then fails:=array_append(fails,'private_name');end if;
  first_page:=public.totehm_discover(pa,'names','','',0,1);second_page:=public.totehm_discover(pa,'names','','',1,1);
  if first_page->'items'->0->>'pseudo'=second_page->'items'->0->>'pseudo' or first_page->>'more'<>'true' then fails:=array_append(fails,'pagination');end if;
  if public.totehm_discover('@'||pa)->'items'->0->>'pseudo'<>pa then fails:=array_append(fails,'at_name');end if;
  if public.totehm_discover('https://www.totehm.com/@'||pa)->'items'->0->>'pseudo'<>pa then fails:=array_append(fails,'profile_link');end if;
  if public.totehm_discover('','boxes')->>'why'<>'signin' then fails:=array_append(fails,'anon_boxes');end if;
  if public.totehm_import_boxes(pa,sel)->>'why'<>'signin' then fails:=array_append(fails,'anon_import');end if;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',ub,'role','authenticated')::text,true);
  if public.totehm_import_boxes(pa,sel)->>'why'<>'access' then fails:=array_append(fails,'unsubscribed_import');end if;
  if jsonb_array_length(public.totehm_discover('Deep practice','boxes')->'items')<>0 then fails:=array_append(fails,'unsubscribed_search');end if;
  if jsonb_array_length(public.totehm_discover('SECRET QUASAR','boxes')->'items')<>0 then fails:=array_append(fails,'private_box_search');end if;
  insert into public.creator_subscriptions(creator_id,fan_id,status) values(ua,ub,'active');
  r:=public.totehm_discover('','subscriptions');
  if r->'items'->0->>'pseudo' is distinct from pa or r->'items'->0->>'can_read' is distinct from 'true' then fails:=array_append(fails,'subscription_list');end if;
  r:=public.totehm_discover('deep PRÁCTICE','boxes','h','focus');
  if r->'items'->0->'boxes'->0->>'text' is distinct from 'Deep practice' then fails:=array_append(fails,'box_text_accent_intention');end if;
  if jsonb_array_length(public.totehm_discover('Deep practice','boxes','h','love')->'items')<>0 then fails:=array_append(fails,'intention_filter');end if;
  if jsonb_array_length(public.totehm_discover('Deep practice','boxes','v')->'items')<>0 then fails:=array_append(fails,'type_filter');end if;
  if not exists(select 1 from jsonb_array_elements(public.totehm_discover(pa||'_studo')->'items') x
    where x->>'pseudo'=pb and x->>'match'='similar') then fails:=array_append(fails,'typo_match');end if;
  if jsonb_array_length(public.totehm_discover('%','boxes')->'items')<>0
    or jsonb_array_length(public.totehm_discover('_','boxes')->'items')<>0 then fails:=array_append(fails,'literal_wildcards');end if;
  update public.totehms set totehm_visibility='private' where user_id=ua;
  r:=public.totehm_discover('','subscriptions');
  if r->'items'->0->>'pseudo' is distinct from pa or r->'items'->0->>'can_read' is distinct from 'false' then fails:=array_append(fails,'private_subscription_visible_without_content');end if;
  if public.totehm_import_boxes(pa,sel)->>'why' is distinct from 'access' then fails:=array_append(fails,'private_subscription_no_import');end if;
  update public.totehms set totehm_visibility='members' where user_id=ua;
  select steps into before_source from public.totehms where user_id=ua;
  r:=public.totehm_import_boxes(pa,sel);
  if r->>'ok' is distinct from 'true' or (r->>'created')::int<>5 then fails:=array_append(fails,'five_types_imported');end if;
  select steps into s from public.totehms where user_id=ub;
  if jsonb_array_length(s)<>2 or not exists(select 1 from jsonb_array_elements(s) x where x->>'t'='Own ritual') then fails:=array_append(fails,'own_boxes_preserved');end if;
  if not exists(select 1 from jsonb_array_elements(s) x where x->>'t'='Deep practice' and x->>'f'='daily' and x->'is'='["focus","express"]' and x->>'o'<>ot::text) then fails:=array_append(fails,'habit_content_remapped');end if;
  select id into target_o from public.objectives where user_id=ub and text='Build a practice';
  select id into target_r from public.repulsions where user_id=ub and repulsion='Put the phone away';
  select id into target_w from public.wisdom where user_id=ub and text='Attention is a choice';
  select id into target_v from public.visions where user_id=ub and text='A focused life';
  if not exists(select 1 from public.objective_habits where user_id=ub and objective_id=target_o and habit_text='Deep practice')
    or not exists(select 1 from public.repulsion_habits where user_id=ub and repulsion_id=target_r and habit_text='Deep practice')
    or not exists(select 1 from public.objective_visions where user_id=ub and objective_id=target_o and vision_id=target_v)
    or not exists(select 1 from public.repulsion_teachings where user_id=ub and repulsion_id=target_r and wisdom_id=target_w)
    or not exists(select 1 from public.teaching_objectives where user_id=ub and wisdom_id=target_w and objective_id=target_o) then fails:=array_append(fails,'five_link_types');end if;
  if jsonb_array_length(public.my_box_sources())<>5 then fails:=array_append(fails,'provenance');end if;
  r:=public.totehm_import_boxes(pa,sel);
  if (r->>'created')::int<>0 or (r->>'reused')::int<>5 then fails:=array_append(fails,'idempotent_retry');end if;
  r:=public.totehm_import_boxes(pa,jsonb_build_array(sel->0,jsonb_build_object('kind','w','key',gen_random_uuid())));
  if r->>'why' is distinct from 'changed' or jsonb_array_length((select steps from public.totehms where user_id=ub))<>2 then fails:=array_append(fails,'invalid_batch_atomic');end if;
  select steps into after_source from public.totehms where user_id=ua;
  if after_source<>before_source or (select count(*) from public._totehm_box_index(ua))<>5 then fails:=array_append(fails,'source_unchanged');end if;
  update public.creator_subscriptions set status='canceled' where creator_id=ua and fan_id=ub;
  if public.totehm_import_boxes(pa,sel)->>'why'<>'access' then fails:=array_append(fails,'revoked_import');end if;
  if exists(select 1 from jsonb_array_elements(public.totehm_discover('Deep practice','boxes')->'items') x where x->>'pseudo'=pa) then fails:=array_append(fails,'revoked_search');end if;
  if jsonb_array_length(public.my_box_sources())<>5 then fails:=array_append(fails,'copies_stay_own');end if;
  -- Existing content is reused without replacing the member's own wording/rhythm.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uc,'role','authenticated')::text,true);
  insert into public.creator_subscriptions(creator_id,fan_id,status) values(ua,uc,'active');
  update public.totehms set steps=steps||'[{"t":" DEEP PRACTICE ","f":"weekly","is":["love"]}]'::jsonb where user_id=uc;
  insert into public.objectives(user_id,text,"is",i) values(uc,'BUILD A PRACTICE',array['love'],'love') returning id into target_o;
  r:=public.totehm_import_boxes(pa,jsonb_build_array(sel->0,sel->1,sel->0));
  if (r->>'created')::int is distinct from 0 or (r->>'reused')::int is distinct from 2 then fails:=array_append(fails,'existing_content_reused');end if;
  if not exists(select 1 from public.objective_habits where user_id=uc and objective_id=target_o and habit_text=' DEEP PRACTICE ')
    or not exists(select 1 from public.totehms t cross join lateral jsonb_array_elements(t.steps) x where t.user_id=uc
      and x->>'t'=' DEEP PRACTICE ' and x->>'f'='weekly' and x->'is'='["love"]' and x->>'o'=target_o::text)
    or not exists(select 1 from public.objectives where id=target_o and text='BUILD A PRACTICE' and "is"=array['love']) then fails:=array_append(fails,'existing_content_and_remapped_links');end if;
  r:=public.totehm_import_boxes(pa,jsonb_build_array(sel->2));
  if (r->>'created')::int is distinct from 1 or exists(select 1 from public.repulsion_habits where user_id=uc)
    or exists(select 1 from public.repulsion_teachings where user_id=uc) then fails:=array_append(fails,'partial_import_no_external_links');end if;
  begin
    perform public.totehm_import_boxes(pa,(select jsonb_agg(sel->0) from generate_series(1,51)));
    fails:=array_append(fails,'batch_limit_missing');
  exception when invalid_parameter_value then null;end;
  raise exception 'TOTEHM DISCOVERY SELFTEST (rolled back): FAIL=%',fails;
end $test$;
