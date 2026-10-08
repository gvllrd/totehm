-- ⚠️ RÉTRO-COPIE · 08/10/2026 — appliquée en base le 06/10/2026 (17:23 UTC) depuis le
-- terminal de Wah (Claude Code), sans fichier dans le dépôt. Texte recopié TEL QUEL
-- de `supabase_migrations.schema_migrations` : NE PAS RÉAPPLIQUER.

-- Every multi-row operation takes the cloth lock before its stage lock.
create or replace function public.streetwear_fail(p_cloth uuid,p_stage text,p_token uuid,p_code text,p_retry boolean default false)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.totehm_clothes where id=p_cloth for update;
  update public.streetwear_jobs set state=case when p_retry and p_stage<>'generation' then 'waiting' else 'error' end,
    last_error=left(p_code,160),next_attempt_at=now()+interval '2 minutes',updated_at=now()
    where cloth_id=p_cloth and stage=p_stage and token=p_token and state='running';
  if not found then return false; end if;
  update public.totehm_clothes set pipeline_error=left(p_code,160),
    status=case when not p_retry and p_stage in ('generation','curation') then 'error_locked' else status end where id=p_cloth;
  return true;
end $$;
create or replace function public.streetwear_recover_stalled()
returns integer language plpgsql security invoker set search_path = '' as $$
declare j public.streetwear_jobs; r record; recovered integer:=0; ambiguous boolean;
begin
  for r in select c.id,jobs.stage from public.totehm_clothes c join public.streetwear_jobs jobs on jobs.cloth_id=c.id
    where jobs.state='running' and jobs.updated_at<now()-interval '15 minutes'
    limit 30 for update of c skip locked loop
    select * into j from public.streetwear_jobs where cloth_id=r.id and stage=r.stage and state='running'
      and updated_at<now()-interval '15 minutes' for update skip locked;
    if not found then continue; end if;
    ambiguous := (j.stage='generation' and coalesce((j.data->>'image_request_started')::boolean,false))
      or (j.stage='curation' and coalesce((j.data->>'prediction_request_started')::boolean,false)
          and j.data->>'prediction_id' is null and j.data->>'upscaled_url' is null);
    update public.streetwear_jobs set state=case when ambiguous then 'error' else 'waiting' end,
      last_error=case when ambiguous then 'provider_outcome_unknown' else 'execution_interrupted' end,
      next_attempt_at=now(),updated_at=now() where cloth_id=j.cloth_id and stage=j.stage;
    if j.stage='generation' then
      update public.totehm_clothes set status=case when ambiguous then 'error_locked' else 'paid' end,
        pipeline_error=case when ambiguous then 'provider_outcome_unknown' else 'execution_interrupted' end where id=j.cloth_id;
    elsif ambiguous then
      update public.totehm_clothes set status='error_locked',pipeline_error='provider_outcome_unknown' where id=j.cloth_id;
    end if;
    recovered:=recovered+1;
  end loop;
  return recovered;
end $$;
revoke all on function public.streetwear_fail(uuid,text,uuid,text,boolean),public.streetwear_recover_stalled() from public,anon,authenticated;
grant execute on function public.streetwear_fail(uuid,text,uuid,text,boolean),public.streetwear_recover_stalled() to service_role;
