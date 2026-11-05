-- 05/11/2026 — LE RELANCEUR. `streetwear_checkpoint(..., wait => true)` et
-- `streetwear_fail(..., retry => true)` posent depuis toujours un job en `waiting` avec un
-- `next_attempt_at` : personne ne l'a jamais lu. Une piece dont l'upscale depassait l'appel
-- restait donc en attente jusqu'a ce que Replicate purge son fichier (une heure), et il
-- fallait la relancer a la main. `streetwear_recover_stalled()` existait mais ne fait que
-- requalifier les jobs `running` abandonnes — et personne ne l'appelait non plus.
-- On ajoute : de quoi SERVIR la file, et de quoi la declencher sans secret dans un cron.

-- Ce qui est pret a repartir. La fonction RESERVE en repoussant `next_attempt_at`, pour que
-- deux tics simultanes ne relancent pas la meme piece. `tracking` est exclu : c'est Printful
-- qui pousse. `error` ne revient jamais tout seul : un echec non repetable est une decision.
create function public.streetwear_due(p_limit integer default 20)
returns table(cloth_id uuid, stage text, attempts integer, last_error text)
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
     where j.state in ('queued','waiting')
       and j.stage <> 'tracking'
       and j.next_attempt_at <= now()
       and j.attempts < 8
       and c.paid_at is not null
       and c.status <> 'error_locked'
     order by j.next_attempt_at
     limit greatest(1, least(p_limit, 50))
     for update of j skip locked
  )
  update public.streetwear_jobs j
     set next_attempt_at = now() + interval '3 minutes', updated_at = now()
    from pret
   where j.cloth_id = pret.c_id and j.stage = pret.c_stage
  returning j.cloth_id, j.stage, j.attempts, j.last_error;
end $$;

-- Le meme jeton a usage unique que `bot-tick` : rien de secret ne dort dans la definition
-- du cron ni dans l'historique des executions.
create function public.streetwear_tick_consume(p_token text)
returns boolean
language sql
security definer
set search_path to 'public'
as $$ select public.edge_token_consume(p_token, 'streetwear-tick'); $$;

create function public.streetwear_tick_arm()
returns bigint
language plpgsql
security definer
set search_path to 'public, extensions, net'
as $$
declare v_token text; v_req bigint;
begin
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.edge_tokens(token, purpose) values (v_token, 'streetwear-tick');
  select net.http_post(
    url     := 'https://abujjbkbbiumxrokozph.supabase.co/functions/v1/streetwear-tick',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-tick-token', v_token),
    body    := jsonb_build_object('source', 'pg_cron'),
    timeout_milliseconds := 55000
  ) into v_req;
  return v_req;
end $$;

revoke all on function public.streetwear_due(integer) from public, anon, authenticated;
revoke all on function public.streetwear_tick_consume(text) from public, anon, authenticated;
revoke all on function public.streetwear_tick_arm() from public, anon, authenticated;
grant execute on function public.streetwear_due(integer) to service_role;
grant execute on function public.streetwear_tick_consume(text) to service_role;
grant execute on function public.streetwear_tick_arm() to postgres;
