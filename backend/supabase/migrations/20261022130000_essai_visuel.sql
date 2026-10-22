-- TOTEHM · L'ESSAI VISUEL D'UNE PIÈCE DE TEST — 22/10/2026
--
-- Wah veut VOIR les visuels avant qu'un vêtement parte tout seul. Jusqu'ici
-- une pièce payée en mode test Stripe était bloquée à l'entrée de la chaîne
-- (`test_blocked`) : il ne restait qu'un achat réel à 170 € pour juger d'une
-- image. Désormais une pièce de test traverse la GÉNÉRATION (n8n B) et la
-- CURATION (n8n C, REGEN compris) et S'ARRÊTE NET AVANT PRINTFUL : aucune
-- commande, aucune fabrication, aucun suivi, aucun email d'expédition.
--
-- Deux garde-fous, parce que sept images coûtent chez OpenAI/Replicate :
--   · `test_stop`   — les étapes `printful` et `tracking` refusent une pièce de test ;
--   · `test_budget` — au plus 3 générations d'essai par 7 jours (tentatives comptées,
--                     REGEN compris), toutes pièces de test confondues.
-- Le stock et les places de style ne sont toujours PAS consommés par un essai
-- (`consume_capacities` garde son `not new.test` : rien à changer ici).
--
-- `create or replace` de quatre fonctions existantes → ne passe pas depuis le
-- cloud : ce fichier s'applique depuis le terminal (`CLAUDE_CODE.md` §4).
-- Les fonctions ne sont pas `security definer` : elles tournent sous le rôle
-- appelant (`service_role`, n8n). Les grants sont reposés APRÈS le dernier
-- `create` — sinon `create or replace` rend l'exécution à PUBLIC.

-- 1 · Une pièce de test payée entre dans la file
create or replace function public.streetwear_queue_paid()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if new.status = 'paid' and old.status = 'draft' then
    insert into public.streetwear_jobs(cloth_id,stage) values (new.id,'generation')
      on conflict (cloth_id,stage) do nothing;
  end if;
  return new;
end $function$;

-- 2 · La réservation d'une étape : l'essai passe, mais jamais jusqu'à Printful
create or replace function public.streetwear_claim(p_cloth uuid, p_stage text, p_concept uuid default null)
 returns jsonb
 language plpgsql
 set search_path to ''
as $function$
declare c public.totehm_clothes; j public.streetwear_jobs; k public.cloth_concepts; t uuid; v_used integer;
begin
  select * into c from public.totehm_clothes where id=p_cloth for update;
  if not found then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  if c.test then
    -- L'essai sert à juger une image, jamais à faire fabriquer un vêtement.
    if p_stage in ('printful','tracking') then return jsonb_build_object('ok',false,'reason','test_stop'); end if;
    if p_stage='generation' then
      select coalesce(sum(j2.attempts),0) into v_used
        from public.streetwear_jobs j2
        join public.totehm_clothes c2 on c2.id=j2.cloth_id
       where c2.test and j2.stage='generation' and j2.updated_at > now() - interval '7 days';
      if v_used >= 3 then return jsonb_build_object('ok',false,'reason','test_budget'); end if;
    end if;
  end if;
  if c.paid_at is null or c.stripe_payment_intent is null then return jsonb_build_object('ok',false,'reason','unpaid'); end if;
  if p_stage not in ('generation','notify','curation','printful','tracking') then raise exception 'invalid_stage'; end if;
  if (p_stage='generation' and c.status<>'paid') or (p_stage in ('notify','curation') and c.status<>'curation')
    or (p_stage='printful' and c.status<>'approved')
    or (p_stage='tracking' and c.status not in ('approved','production','shipped')) then
    return jsonb_build_object('ok',false,'reason','wrong_state');
  end if;
  if p_stage='printful' and c.printful_order_id is not null then return jsonb_build_object('ok',false,'reason','already_ordered'); end if;
  if p_stage='curation' then
    select * into k from public.cloth_concepts where id=p_concept and cloth_id=p_cloth and batch_id=c.generation_batch;
    if not found or (c.selected_concept_id is not null and c.selected_concept_id <> p_concept) then
      return jsonb_build_object('ok',false,'reason','stale_concept');
    end if;
  end if;
  insert into public.streetwear_jobs(cloth_id,stage) values(p_cloth,p_stage) on conflict do nothing;
  select * into j from public.streetwear_jobs where cloth_id=p_cloth and stage=p_stage for update;
  if j.state='done' or (j.state='running' and (p_stage='generation' or j.updated_at>now()-interval '15 minutes'))
    or (j.state='error' and p_stage in ('generation','curation')) then
    return jsonb_build_object('ok',false,'reason','already_claimed');
  end if;
  if p_stage='generation' then
    update public.totehm_clothes set status='generating',generation_batch=coalesce(generation_batch,gen_random_uuid()),pipeline_error=null
      where id=p_cloth returning * into c;
  elsif p_stage='curation' then
    update public.totehm_clothes set selected_concept_id=p_concept where id=p_cloth returning * into c;
  end if;
  t:=gen_random_uuid();
  update public.streetwear_jobs set state='running',token=t,attempts=attempts+1,updated_at=now()
    where cloth_id=p_cloth and stage=p_stage returning * into j;
  return jsonb_build_object('ok',true,'cloth',to_jsonb(c),'stage',p_stage,'token',t,'job',to_jsonb(j),'concept',to_jsonb(k));
end $function$;

-- 3 · La fin d'une étape : l'essai va jusqu'à l'œuvre composée, pas plus loin
create or replace function public.streetwear_complete(p_cloth uuid, p_stage text, p_token uuid, p_result jsonb default '{}'::jsonb)
 returns boolean
 language plpgsql
 set search_path to ''
as $function$
declare c public.totehm_clothes; j public.streetwear_jobs;
begin
  select * into c from public.totehm_clothes where id=p_cloth for update;
  select * into j from public.streetwear_jobs where cloth_id=p_cloth and stage=p_stage and token=p_token and state='running' for update;
  if not found then return false; end if;
  if c.test and p_stage in ('printful','tracking') then return false; end if;
  if p_stage='generation' then
    if (select count(*) from public.cloth_concepts where cloth_id=p_cloth and batch_id=c.generation_batch) <> 7 then raise exception 'seven_concepts_required'; end if;
    update public.totehm_clothes set status='curation',pipeline_error=null where id=p_cloth;
    insert into public.streetwear_jobs(cloth_id,stage) values(p_cloth,'notify') on conflict(cloth_id,stage)
      do update set state='queued',data='{}'::jsonb,token=null,last_error=null,next_attempt_at=now(),updated_at=now();
  elsif p_stage='curation' then
    if p_result->>'storage_path' is distinct from p_cloth::text||'/final.png' then raise exception 'invalid_artwork_path'; end if;
    update public.cloth_concepts set selected=(id=c.selected_concept_id) where cloth_id=p_cloth;
    update public.totehm_clothes set status='approved',artwork_storage_path=p_result->>'storage_path',
      artwork_final_url=p_result->>'final_url',artwork_print_url=p_result->>'print_url',pipeline_error=null where id=p_cloth;
    -- Une pièce de test n'ouvre jamais l'étape Printful : la file s'arrête là.
    if not c.test then
      insert into public.streetwear_jobs(cloth_id,stage) values(p_cloth,'printful') on conflict do nothing;
    end if;
  elsif p_stage='printful' then
    if nullif(p_result->>'order_id','') is null then raise exception 'order_id_required'; end if;
    update public.totehm_clothes set printful_order_id=p_result->>'order_id',printful_status=p_result->>'printful_status',
      status=case when p_result->>'printful_status' in ('pending','inprocess','fulfilled') then 'production' else 'approved' end,
      pipeline_error=null where id=p_cloth;
  elsif p_stage='tracking' then
    update public.totehm_clothes set tracking_email_sent_at=now() where id=p_cloth;
  end if;
  update public.streetwear_jobs set state='done',data=data||p_result,last_error=null,updated_at=now()
    where cloth_id=p_cloth and stage=p_stage and token=p_token;
  return true;
end $function$;

-- 4 · REGEN : sept autres images, y compris pour un essai (le budget décide à la réservation)
create or replace function public.streetwear_regenerate(p_cloth uuid)
 returns boolean
 language plpgsql
 set search_path to ''
as $function$
declare c public.totehm_clothes;
begin
  select * into c from public.totehm_clothes where id=p_cloth for update;
  if not found or c.status<>'curation' or c.selected_concept_id is not null then return false; end if;
  if exists(select 1 from public.streetwear_jobs where cloth_id=p_cloth and stage='curation' and state in ('running','waiting')) then return false; end if;
  update public.totehm_clothes set status='paid',generation_batch=gen_random_uuid(),pipeline_error=null where id=p_cloth;
  insert into public.streetwear_jobs(cloth_id,stage) values(p_cloth,'generation') on conflict(cloth_id,stage)
    do update set state='queued',data='{}'::jsonb,token=null,last_error=null,next_attempt_at=now(),updated_at=now();
  return true;
end $function$;

-- 5 · Les droits, APRÈS le dernier create : n8n seulement (service_role)
revoke all on function public.streetwear_queue_paid() from public, anon, authenticated;
revoke all on function public.streetwear_claim(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.streetwear_complete(uuid,text,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.streetwear_regenerate(uuid) from public, anon, authenticated;
grant execute on function public.streetwear_queue_paid() to service_role;
grant execute on function public.streetwear_claim(uuid,text,uuid) to service_role;
grant execute on function public.streetwear_complete(uuid,text,uuid,jsonb) to service_role;
grant execute on function public.streetwear_regenerate(uuid) to service_role;
