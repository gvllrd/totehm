-- 05/11/2026 — SORTIR D'`error_locked`. Une piece payee qui y tombe n'avait aucune suite :
-- rien ne la signalait, rien ne la reprenait, rien ne la remboursait. `0.muscle` y dormait
-- depuis le 3 novembre sans que personne le sache. Trois gestes, tous reserves au service.

-- 1. CE QU'IL FAUT ANNONCER. La fonction reserve en posant `alerted_at` : une panne ne se
--    repete pas toutes les cinq minutes sur le telephone du curateur.
create function public.streetwear_alerts(p_limit integer default 10)
returns table(cloth_id uuid, name text, stage text, last_error text, price numeric, test boolean, intent text)
language plpgsql
security definer
set search_path to ''
as $$
begin
  return query
  with pret as (
    select j.cloth_id as c_id, j.stage as c_stage
      from public.streetwear_jobs j
      join public.totehm_clothes c on c.id = j.cloth_id
     where c.status = 'error_locked'
       and j.state = 'error'
       and j.data->>'alerted_at' is null
     order by j.updated_at
     limit greatest(1, least(p_limit, 20))
     for update of j skip locked
  )
  update public.streetwear_jobs j
     set data = j.data || jsonb_build_object('alerted_at', now()), updated_at = now()
    from pret, public.totehm_clothes c
   where j.cloth_id = pret.c_id and j.stage = pret.c_stage and c.id = j.cloth_id
  returning j.cloth_id, c.name, j.stage, j.last_error, c.price, c.test, c.stripe_payment_intent;
end $$;

-- 2. REPRENDRE. Les drapeaux « parti sans reponse » barrent toute reprise — c'est leur role
--    tant que personne n'a tranche, parce qu'une generation relancee repaie sept images.
--    Ici quelqu'un tranche, en connaissance du cout : on les retire, et seulement eux.
--    `prediction_id`, `upscaled_url`, `media_sent` et `pick_messages` restent : ils evitent
--    justement de repayer ce qui a deja abouti.
create function public.streetwear_unlock(p_cloth uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare c public.totehm_clothes; j public.streetwear_jobs;
begin
  select * into c from public.totehm_clothes where id = p_cloth for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if c.status <> 'error_locked' then
    return jsonb_build_object('ok', false, 'reason', 'not_locked', 'status', c.status);
  end if;
  select * into j from public.streetwear_jobs
    where cloth_id = p_cloth and state = 'error' order by updated_at desc limit 1 for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_failed_job'); end if;

  update public.streetwear_jobs
     set state = case when j.stage = 'generation' then 'queued' else 'waiting' end,
         data = (j.data - 'image_request_started' - 'prediction_request_started' - 'order_request_started'),
         attempts = 0, last_error = null, next_attempt_at = now(), updated_at = now()
   where cloth_id = p_cloth and stage = j.stage;

  update public.totehm_clothes
     set status = case when j.stage = 'generation' then 'paid'
                       when j.stage in ('notify','curation') then 'curation'
                       when j.stage = 'printful' then 'approved'
                       else c.status end,
         pipeline_error = null
   where id = p_cloth;

  return jsonb_build_object('ok', true, 'stage', j.stage, 'previous_error', c.pipeline_error);
end $$;

-- 3. MARQUER UN REMBOURSEMENT. Rien n'est rembourse ici : l'argent ne part jamais d'un
--    simple tap. On note la decision et on rend de quoi la faire dans Stripe.
create function public.streetwear_refund_mark(p_cloth uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare c public.totehm_clothes;
begin
  select * into c from public.totehm_clothes where id = p_cloth for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if c.status <> 'error_locked' then
    return jsonb_build_object('ok', false, 'reason', 'not_locked', 'status', c.status);
  end if;
  update public.streetwear_jobs
     set data = data || jsonb_build_object('refund_due_at', now()), updated_at = now()
   where cloth_id = p_cloth and state = 'error';
  return jsonb_build_object('ok', true, 'intent', c.stripe_payment_intent,
                            'price', c.price, 'test', c.test);
end $$;

revoke all on function public.streetwear_alerts(integer) from public, anon, authenticated;
revoke all on function public.streetwear_unlock(uuid) from public, anon, authenticated;
revoke all on function public.streetwear_refund_mark(uuid) from public, anon, authenticated;
grant execute on function public.streetwear_alerts(integer) to service_role;
grant execute on function public.streetwear_unlock(uuid) to service_role;
grant execute on function public.streetwear_refund_mark(uuid) to service_role;
