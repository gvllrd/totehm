-- [COM] 23/11/2026 (Wah) : « pas de Done/Missed, ça fait trop Task — [On It] [No Time] [No Energy] ». UN mot = UNE chose,
-- jusque dans la base. Une réponse (`tracking_checkins.status`) : on_it · no_time · no_energy · not_on_it (le non sans
-- raison, l'ancien « missed »). Le résultat binaire lu par les statistiques (`habit_outcomes.outcome`) : on_it · not_on_it.
-- Reprise des données : done, partial → on_it ; missed, skipped → not_on_it ; le journal suit (tracked_<statut>).
-- PONT : les messages Telegram déjà envoyés portent encore done / missed / partial / skipped — tracking_answer et
-- tracking_correct les traduisent. Le journal n'a plus qu'une source : la réponse (`tracking_journal_checkin`).
-- La synchro résultat → réponse n'écrase plus une raison (no_time, no_energy) par not_on_it.

alter table public.tracking_checkins drop constraint tracking_checkins_status_check;
alter table public.habit_outcomes drop constraint habit_outcomes_outcome_check;

update public.tracking_checkins set status = case when status in ('done','partial') then 'on_it' else 'not_on_it' end
 where status in ('done','partial','missed','skipped');
update public.habit_outcomes set outcome = case when outcome = 'done' then 'on_it' else 'not_on_it' end
 where outcome in ('done','missed');
update public.totehm_journal set kind = case when kind in ('tracked_done','tracked_partial') then 'tracked_on_it' else 'tracked_not_on_it' end
 where kind in ('tracked_done','tracked_partial','tracked_missed','tracked_skipped');

alter table public.tracking_checkins add constraint tracking_checkins_status_check
  check (status = any (array['on_it','no_time','no_energy','not_on_it']));
alter table public.habit_outcomes add constraint habit_outcomes_outcome_check
  check (outcome is null or outcome = any (array['on_it','not_on_it']));

-- le PONT des anciens boutons, en un seul endroit
create or replace function public._tracking_status(p text)
 returns text language sql immutable set search_path to '' as $f$
  select case p when 'on_it' then 'on_it' when 'no_time' then 'no_time' when 'no_energy' then 'no_energy' when 'not_on_it' then 'not_on_it'
                when 'done' then 'on_it' when 'partial' then 'on_it' when 'missed' then 'not_on_it' when 'skipped' then 'not_on_it' end $f$;

create or replace function public.tracking_answer(p_telegram bigint, p_outcome bigint, p_status text)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare u uuid; o public.habit_outcomes%rowtype; current_status text; s text := public._tracking_status(p_status);
begin
  if s is null then return jsonb_build_object('ok',false,'why','status'); end if;
  select id into u from public.profiles where telegram_id=p_telegram;
  if u is null then return jsonb_build_object('ok',false,'why','unlinked'); end if;
  select * into o from public.habit_outcomes where id=p_outcome and user_id=u for update;
  if not found or o.asked_at<now()-interval '7 days' then return jsonb_build_object('ok',false,'why','unavailable'); end if;
  current_status:=coalesce((select status from public.tracking_checkins where outcome_id=o.id),o.outcome);
  if o.answered_at is not null then return jsonb_build_object('ok',true,'already',true,'status',current_status,'id',o.id::text); end if;
  insert into public.tracking_checkins(outcome_id,user_id,status) values(o.id,u,s);
  update public.habit_outcomes set source='telegram',outcome=case when s='on_it' then 'on_it' else 'not_on_it' end,answered_at=now() where id=o.id;
  return jsonb_build_object('ok',true,'status',s,'id',o.id::text,'habit',o.habit_text);
end $function$;

create or replace function public.tracking_correct(p_telegram bigint, p_outcome bigint, p_status text)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare u uuid; c public.tracking_checkins%rowtype; s text := public._tracking_status(p_status);
begin
  if s is null then return jsonb_build_object('ok',false,'why','status'); end if;
  select id into u from public.profiles where telegram_id=p_telegram;
  select * into c from public.tracking_checkins where outcome_id=p_outcome and user_id=u for update;
  if not found or c.reported_at<now()-interval '72 hours' then return jsonb_build_object('ok',false,'why','unavailable'); end if;
  if c.status=s then return jsonb_build_object('ok',true,'already',true,'status',c.status); end if;
  update public.tracking_checkins set status=s,updated_at=now() where outcome_id=c.outcome_id;
  update public.habit_outcomes set outcome=case when s='on_it' then 'on_it' else 'not_on_it' end where id=c.outcome_id and user_id=u;
  return jsonb_build_object('ok',true,'status',s,'id',c.outcome_id::text);
end $function$;

-- un résultat posé ailleurs que dans Telegram devient une réponse ; il ne remplace jamais une RAISON du même sens
create or replace function public.tracking_sync_outcome()
 returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.outcome in ('on_it','not_on_it') and new.answered_at is not null then
    insert into public.tracking_checkins(outcome_id,user_id,status,reported_at)
      values(new.id,new.user_id,new.outcome,new.answered_at)
      on conflict(outcome_id) do update set status=excluded.status,updated_at=now()
        where (public.tracking_checkins.status='on_it') is distinct from (excluded.status='on_it');
  end if;
  return null;
end $function$;

-- le journal : UNE source, la réponse
drop trigger if exists totehm_journal_track on public.habit_outcomes;
drop function if exists public._journal_track();

create or replace function public.tracking_journal_checkin()
 returns trigger language plpgsql security definer set search_path to '' as $function$
declare o public.habit_outcomes%rowtype;
begin
  if tg_op='INSERT' or old.status is distinct from new.status then
    select * into o from public.habit_outcomes where id=new.outcome_id and user_id=new.user_id;
    perform public._journal(new.user_id,'track','tracked_'||new.status,o.habit_text,o.intention,new.outcome_id::text||':'||new.status,'{}'::jsonb,new.reported_at);
  end if;
  return null;
exception when others then return null;
end $function$;

revoke all on function public._tracking_status(text) from public, anon, authenticated;
