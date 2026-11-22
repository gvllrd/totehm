-- Synthetic production checks only; explicit ROLLBACK leaves no account, observation or delivery.
BEGIN;
DO $verify$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
 ta bigint:=4000000000000000+floor(random()*1000000000)::bigint;
 tb bigint:=4000001000000000+floor(random()*1000000000)::bigint;
 oid bigint:=8000000000000000000+floor(random()*1000000000)::bigint;
 flags jsonb:='{}'::jsonb; failures text[]; total int; result jsonb;
 why uuid:=gen_random_uuid(); vision uuid:=gen_random_uuid(); other_why uuid:=gen_random_uuid();
 rep bigint:=7000000000000000000+floor(random()*1000000000)::bigint;
begin
 if exists(select 1 from public.profiles where telegram_id in(ta,tb))
 or exists(select 1 from public.habit_outcomes where id between oid and oid+2)
 or exists(select 1 from public.repulsions where id=rep)
 then raise exception 'Synthetic fixture collision'; end if;
 insert into auth.users(id) values(a),(b);
 insert into public.profiles(id,pseudo,telegram_id) values
 (a,'verify'||substr(replace(a::text,'-',''),1,18),ta),(b,'verify'||substr(replace(b::text,'-',''),1,18),tb);
 insert into public.totehms(user_id,audience,habits) values
 (a,'private','[{"t":"Same synthetic Habit","f":"daily","is":["focus"]}]'),
 (b,'private','[{"t":"Same synthetic Habit","f":"daily","is":["focus"]}]');
 insert into public.habit_outcomes(id,user_id,habit_text,asked_at,outcome,answered_at) values
 (oid,a,'Same synthetic Habit',now(),null,null),(oid+1,b,'Same synthetic Habit',now(),null,null),(oid+2,a,'Same synthetic Habit',now()-interval '8 days',null,null);
 insert into public.objectives(id,user_id,text,target_at,audience,"is") values
 (why,a,'Synthetic dated WHY',now()+interval '10 days','private',array['focus']),
 (vision,a,'Synthetic undated WHY',null,'private',array['focus']),
 (other_why,b,'Synthetic foreign WHY',now()+interval '10 days','private',array['focus']);
 insert into public.objective_habits(user_id,objective_id,habit_text) values
 (a,why,'Same synthetic Habit'),(a,vision,'Same synthetic Habit'),(b,other_why,'Same synthetic Habit');
 insert into public.repulsions(id,user_id,habit_text,obstacle,repulsion,audience,"is") values
 (rep,a,'Same synthetic Habit','Synthetic obstacle','Synthetic INSTEAD OF','private',array['focus']);
 flags:=flags||jsonb_build_object(
 'direct_whys_current_owner',2=(select count(*) from public.objective_habits oh join public.objectives o on o.id=oh.objective_id and o.user_id=oh.user_id where oh.user_id=a and oh.habit_text='Same synthetic Habit' and coalesce(o.status,'active') not in('achieved','abandoned','converted')),
 'dated_why_partition',1=(select count(*) from public.objective_habits oh join public.objectives o on o.id=oh.objective_id and o.user_id=oh.user_id where oh.user_id=a and oh.habit_text='Same synthetic Habit' and o.target_at is not null),
 'vision_why_partition',1=(select count(*) from public.objective_habits oh join public.objectives o on o.id=oh.objective_id and o.user_id=oh.user_id where oh.user_id=a and oh.habit_text='Same synthetic Habit' and o.target_at is null),
 'foreign_same_text_why_isolated',not exists(select 1 from public.objective_habits oh join public.objectives o on o.id=oh.objective_id and o.user_id=oh.user_id where oh.user_id=a and o.id=other_why),
 'native_repulsion_link',exists(select 1 from public.repulsions r where r.id=rep and r.user_id=a and r.habit_text='Same synthetic Habit' and r.active));
 update public.objectives set target_at=null where id=why and user_id=a;
 flags:=flags||jsonb_build_object('deadline_change_preserves_direct_reference',exists(select 1 from public.objective_habits oh join public.objectives o on o.id=oh.objective_id and o.user_id=oh.user_id where oh.user_id=a and oh.objective_id=why and o.target_at is null));
 delete from public.objective_habits where user_id=a and objective_id=why;
 flags:=flags||jsonb_build_object('removed_why_link_is_absent',not exists(select 1 from public.objective_habits where user_id=a and objective_id=why and habit_text='Same synthetic Habit'));
 result:=public.tracking_practice_target(ta,oid);
 flags:=flags||jsonb_build_object(
 'current_source_authorized',result->>'ok'='true' and result->>'user_id'=a::text and result->>'habit'='Same synthetic Habit',
 'foreign_source_same_text_refused',public.tracking_practice_target(ta,oid+1)->>'ok'='false',
 'expired_source_refused',public.tracking_practice_target(ta,oid+2)->>'ok'='false',
 'invalid_telegram_refused',public.tracking_practice_target(0,oid)->>'ok'='false');
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 flags:=flags||jsonb_build_object(
 'native_owner_authorized',public.tracking_practice_for_me(oid)->>'ok'='true',
 'native_foreign_same_text_refused',public.tracking_practice_for_me(oid+1)->>'ok'='false');
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{}',true);
 flags:=flags||jsonb_build_object('native_signed_out_refused',public.tracking_practice_for_me(oid)->>'ok'='false');
 update public.totehms set habits='[]'::jsonb where user_id=a;
 flags:=flags||jsonb_build_object('deleted_exact_habit_refused',public.tracking_practice_target(ta,oid)->>'ok'='false');
 update public.totehms set habits='[{"t":"Renamed synthetic Habit","f":"daily","is":["focus"]}]'::jsonb where user_id=a;
 flags:=flags||jsonb_build_object('stale_exact_habit_refused',public.tracking_practice_target(ta,oid)->>'ok'='false');
 update public.profiles set telegram_id=null where id=b;
 flags:=flags||jsonb_build_object('unlinked_telegram_refused',public.tracking_practice_target(tb,oid+1)->>'ok'='false');
 flags:=flags||jsonb_build_object(
 'preparation_target_service_only',has_function_privilege('service_role','public.tracking_practice_target(bigint,bigint)','EXECUTE') and not has_function_privilege('anon','public.tracking_practice_target(bigint,bigint)','EXECUTE') and not has_function_privilege('authenticated','public.tracking_practice_target(bigint,bigint)','EXECUTE'),
 'no_practice_reports_written',not exists(select 1 from public.tracking_checkins where user_id in(a,b)),
 'no_delivery_reserved',not exists(select 1 from public.tracking_deliveries where user_id in(a,b)),
 'source_still_unanswered',not exists(select 1 from public.habit_outcomes where id between oid and oid+2 and (outcome is not null or answered_at is not null)));
 select count(*),coalesce(array_agg(key order by key) filter(where value is distinct from 'true'::jsonb),'{}'::text[]) into total,failures from jsonb_each(flags);
 perform set_config('totehm.telegram_verification',jsonb_build_object('checks',total,'passed',total-cardinality(failures),'failures',to_jsonb(failures))::text,true);
exception when others then
 perform set_config('totehm.telegram_verification',jsonb_build_object('checks',0,'passed',0,'failures',jsonb_build_array('verification_sql_error'),'sqlstate',SQLSTATE,'error',SQLERRM)::text,true);
end $verify$;
SELECT current_setting('totehm.telegram_verification')::jsonb AS result;
ROLLBACK;
