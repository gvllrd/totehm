-- ⚠️ RÉTRO-COPIE · 08/10/2026 — appliquée en base le 06/10/2026 (16:51 UTC) depuis le
-- terminal de Wah (Claude Code, recommandations du 06/10), sans fichier dans le dépôt.
-- Texte recopié TEL QUEL de `supabase_migrations.schema_migrations` : NE PAS
-- RÉAPPLIQUER. Le fichier garde la trace (CLAUDE.md : « le fichier du dépôt en garde la trace »).

-- Streetwear: a durable handoff, one lease per stage, isolated Stripe tests.
alter table public.totehm_clothes
  add column if not exists generation_batch uuid,
  add column if not exists selected_concept_id uuid,
  add column if not exists artwork_storage_path text,
  add column if not exists printful_status text,
  add column if not exists pipeline_error text,
  add column if not exists tracking_email_sent_at timestamptz;
alter table public.cloth_concepts
  add column if not exists batch_id uuid,
  add column if not exists position integer;
create unique index if not exists cloth_concepts_batch_position
  on public.cloth_concepts(cloth_id, batch_id, position) where batch_id is not null;

create table if not exists public.streetwear_jobs (
  cloth_id uuid not null references public.totehm_clothes(id) on delete cascade,
  stage text not null check (stage in ('generation','notify','curation','printful','tracking')),
  state text not null default 'queued' check (state in ('queued','running','waiting','done','error')),
  token uuid,
  attempts integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cloth_id,stage)
);
alter table public.streetwear_jobs enable row level security;
revoke all on public.streetwear_jobs from public, anon, authenticated;
grant all on public.streetwear_jobs to service_role;
create index if not exists streetwear_jobs_due
  on public.streetwear_jobs(next_attempt_at) where state in ('queued','waiting');
-- The browser can read its own receipt; payments and concepts are server writes.
revoke insert, update, delete, truncate, references, trigger
  on public.totehm_clothes from anon, authenticated;
revoke all on public.cloth_concepts from anon, authenticated;

create or replace function public.consume_capacities()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'paid' and old.status = 'draft' and not new.test then
    update public.totehm_cloth_support set claimed = claimed + 1 where id = new.garment_id;
    update public.artistic_styles set remaining_capacity = greatest(remaining_capacity - 1,0) where id = new.style_id;
  end if;
  return new;
end $$;
create or replace function public.restore_capacities()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'cancelled' and old.status = 'paid' and not new.test then
    update public.totehm_cloth_support set claimed = greatest(claimed - 1,0) where id = new.garment_id;
    update public.artistic_styles set remaining_capacity = least(remaining_capacity + 1,total_capacity) where id = new.style_id;
  end if;
  return new;
end $$;

create or replace function public.streetwear_queue_paid()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = 'paid' and old.status = 'draft' and not new.test then
    insert into public.streetwear_jobs(cloth_id,stage) values (new.id,'generation')
      on conflict (cloth_id,stage) do nothing;
  end if;
  return new;
end $$;
create trigger streetwear_queue_paid after update of status on public.totehm_clothes
  for each row execute function public.streetwear_queue_paid();

create or replace function public.streetwear_service_ready()
returns boolean language sql stable security invoker set search_path = '' as $$
  select current_user = 'service_role';
$$;

create or replace function public.streetwear_settle_cloth(
  p_cloth uuid, p_session text, p_intent text, p_shipping jsonb,
  p_email text, p_test boolean, p_amount bigint
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare c public.totehm_clothes;
begin
  select * into c from public.totehm_clothes where id=p_cloth for update;
  if not found then raise exception 'cloth_not_found'; end if;
  if c.test is distinct from p_test then raise exception 'payment_mode_mismatch'; end if;
  if c.stripe_session_id is not null and c.stripe_session_id <> p_session then raise exception 'payment_session_mismatch'; end if;
  if round(c.price * 100)::bigint is distinct from p_amount then raise exception 'payment_amount_mismatch'; end if;
  if c.status <> 'draft' then
    return jsonb_build_object('settled',false,'id',c.id,'name',c.name,'size',c.size,'email',c.email,'test',c.test);
  end if;
  update public.totehm_clothes set status='paid',paid_at=now(),stripe_session_id=p_session,
    stripe_payment_intent=p_intent,shipping=coalesce(p_shipping,'{}'::jsonb),
    email=coalesce(nullif(p_email,''),email) where id=p_cloth returning * into c;
  return jsonb_build_object('settled',true,'id',c.id,'name',c.name,'size',c.size,'email',c.email,'test',c.test);
end $$;

create or replace function public.streetwear_claim(p_cloth uuid,p_stage text,p_concept uuid default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare c public.totehm_clothes; j public.streetwear_jobs; k public.cloth_concepts; t uuid;
begin
  select * into c from public.totehm_clothes where id=p_cloth for update;
  if not found then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  if c.test then return jsonb_build_object('ok',false,'reason','test_blocked'); end if;
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
end $$;

create or replace function public.streetwear_checkpoint(p_cloth uuid,p_stage text,p_token uuid,p_data jsonb,p_wait boolean default false)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.streetwear_jobs set data=data||coalesce(p_data,'{}'::jsonb),updated_at=now(),
    state=case when p_wait then 'waiting' else 'running' end,next_attempt_at=now()+interval '30 seconds'
    where cloth_id=p_cloth and stage=p_stage and token=p_token and state='running';
  return found;
end $$;

create or replace function public.streetwear_complete(p_cloth uuid,p_stage text,p_token uuid,p_result jsonb default '{}'::jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare c public.totehm_clothes; j public.streetwear_jobs;
begin
  select * into c from public.totehm_clothes where id=p_cloth for update;
  select * into j from public.streetwear_jobs where cloth_id=p_cloth and stage=p_stage and token=p_token and state='running' for update;
  if not found or c.test then return false; end if;
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
    insert into public.streetwear_jobs(cloth_id,stage) values(p_cloth,'printful') on conflict do nothing;
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
end $$;

create or replace function public.streetwear_fail(p_cloth uuid,p_stage text,p_token uuid,p_code text,p_retry boolean default false)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.streetwear_jobs set state=case when p_retry and p_stage<>'generation' then 'waiting' else 'error' end,
    last_error=left(p_code,160),next_attempt_at=now()+interval '2 minutes',updated_at=now()
    where cloth_id=p_cloth and stage=p_stage and token=p_token and state='running';
  if not found then return false; end if;
  update public.totehm_clothes set pipeline_error=left(p_code,160),
    status=case when not p_retry and p_stage in ('generation','curation') then 'error_locked' else status end where id=p_cloth;
  return true;
end $$;

create or replace function public.streetwear_regenerate(p_cloth uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare c public.totehm_clothes;
begin
  select * into c from public.totehm_clothes where id=p_cloth for update;
  if not found or c.test or c.status<>'curation' or c.selected_concept_id is not null then return false; end if;
  if exists(select 1 from public.streetwear_jobs where cloth_id=p_cloth and stage='curation' and state in ('running','waiting')) then return false; end if;
  update public.totehm_clothes set status='paid',generation_batch=gen_random_uuid(),pipeline_error=null where id=p_cloth;
  insert into public.streetwear_jobs(cloth_id,stage) values(p_cloth,'generation') on conflict(cloth_id,stage)
    do update set state='queued',data='{}'::jsonb,token=null,last_error=null,next_attempt_at=now(),updated_at=now();
  return true;
end $$;

create or replace function public.my_streetwear_test_mode()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.boutique_testers where user_id=auth.uid() and active);
$$;

revoke all on function public.consume_capacities(),public.restore_capacities(),public.streetwear_queue_paid() from public,anon,authenticated;
revoke all on function public.streetwear_service_ready(),public.streetwear_settle_cloth(uuid,text,text,jsonb,text,boolean,bigint),
  public.streetwear_claim(uuid,text,uuid),public.streetwear_checkpoint(uuid,text,uuid,jsonb,boolean),
  public.streetwear_complete(uuid,text,uuid,jsonb),public.streetwear_fail(uuid,text,uuid,text,boolean),public.streetwear_regenerate(uuid)
  from public,anon,authenticated;
grant execute on function public.streetwear_service_ready(),public.streetwear_settle_cloth(uuid,text,text,jsonb,text,boolean,bigint),
  public.streetwear_claim(uuid,text,uuid),public.streetwear_checkpoint(uuid,text,uuid,jsonb,boolean),
  public.streetwear_complete(uuid,text,uuid,jsonb),public.streetwear_fail(uuid,text,uuid,text,boolean),public.streetwear_regenerate(uuid)
  to service_role;
revoke all on function public.my_streetwear_test_mode() from public,anon;
grant execute on function public.my_streetwear_test_mode() to authenticated;
