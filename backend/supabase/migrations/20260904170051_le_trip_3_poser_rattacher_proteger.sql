-- LE TRIP · 3/5 — poser un trip, y rattacher une habitude, la protéger.
-- `target_at` est le TIME ACHIEVEMENT. Il est FACULTATIF à la création : forcer
-- une date au moment où on formule une envie, c'est transformer une envie en
-- dette. On la demande, on ne l'exige pas.
create or replace function public.trip_create(p_text text, p_target timestamptz default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if btrim(coalesce(p_text,'')) = '' then raise exception 'un trip a besoin d''un objectif'; end if;
  insert into public.objectives(user_id, text, target_at, status)
  values (v_uid, left(btrim(p_text), 300), p_target, 'active')
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.trip_set_target(p_trip uuid, p_target timestamptz)
returns boolean
language sql security definer set search_path = public as $$
  with u as (
    update public.objectives set target_at = p_target
    where id = p_trip and user_id = auth.uid()
    returning 1)
  select exists (select 1 from u);
$$;

create or replace function public.trip_rename(p_trip uuid, p_text text)
returns boolean
language sql security definer set search_path = public as $$
  with u as (
    update public.objectives set text = left(btrim(p_text), 300)
    where id = p_trip and user_id = auth.uid() and btrim(coalesce(p_text,'')) <> ''
    returning 1)
  select exists (select 1 from u);
$$;

-- Fermer un trip ne supprime RIEN. Les habitudes gardent leur `o` : elles
-- racontent d'où elles viennent. Un trip fermé sort de l'écran, pas de
-- l'histoire — et c'est cette histoire que l'autobiographiste lit.
create or replace function public.trip_close(p_trip uuid, p_outcome text default 'done')
returns boolean
language sql security definer set search_path = public as $$
  with u as (
    update public.objectives
       set status = case when p_outcome = 'dropped' then 'dropped' else 'done' end,
           outcome = left(btrim(coalesce(p_outcome,'done')), 200),
           outcome_at = now()
     where id = p_trip and user_id = auth.uid()
    returning 1)
  select exists (select 1 from u);
$$;

revoke all on function public.trip_create(text, timestamptz)      from public, anon;
revoke all on function public.trip_set_target(uuid, timestamptz)  from public, anon;
revoke all on function public.trip_rename(uuid, text)             from public, anon;
revoke all on function public.trip_close(uuid, text)              from public, anon;
grant execute on function public.trip_create(text, timestamptz)     to authenticated, service_role;
grant execute on function public.trip_set_target(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.trip_rename(uuid, text)            to authenticated, service_role;
grant execute on function public.trip_close(uuid, text)             to authenticated, service_role;


-- Les habitudes vivent dans `totehms.steps`, un tableau jsonb. On réécrit
-- l'ÉLÉMENT, pas la ligne.
-- ⚠️ p_trip = null DÉTACHE (on retire la clé). Volontaire : une clé `o` à null
-- et une clé `o` absente doivent se lire pareil, sinon le
-- `where nullif(s->>'o','') is null` de my_trips() mentirait.
create or replace function public.habit_set_trip(p_habit text, p_trip uuid default null)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_n integer;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  -- Le trip doit m'appartenir. Sans ce test, n'importe qui rattacherait ses
  -- habitudes à l'objectif d'un autre membre.
  if p_trip is not null and not exists (
       select 1 from public.objectives where id = p_trip and user_id = v_uid) then
    raise exception 'trip inconnu';
  end if;

  update public.totehms t
     set steps = (
           select coalesce(jsonb_agg(
             case when s->>'t' = p_habit
                  then case when p_trip is null
                            then (s - 'o')
                            else s || jsonb_build_object('o', p_trip::text) end
                  else s end), '[]'::jsonb)
           from jsonb_array_elements(coalesce(t.steps,'[]'::jsonb)) s),
         updated_at = now()
   where t.user_id = v_uid
     and exists (select 1 from jsonb_array_elements(coalesce(t.steps,'[]'::jsonb)) s
                  where s->>'t' = p_habit);

  get diagnostics v_n = row_count;
  return coalesce(v_n, 0) > 0;
end $$;

revoke all on function public.habit_set_trip(text, uuid) from public, anon;
grant execute on function public.habit_set_trip(text, uuid) to authenticated, service_role;


-- `set_repulsion()` existe déjà : elle vient du bot, après un « pourquoi tu ne
-- l'as pas fait ? ». Depuis l'écran des trips on la pose à froid, sans obstacle
-- constaté — d'où p_obstacle facultatif. La colonne est `not null` : on écrit
-- une valeur explicite plutôt que de relâcher la contrainte. Une contrainte
-- qu'on desserre ne se resserre jamais.
create or replace function public.repulsion_set(p_habit text, p_repulsion text,
                                                p_obstacle text default null)
returns bigint
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id bigint;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if btrim(coalesce(p_repulsion,'')) = '' then raise exception 'une répulsion a besoin d''un texte'; end if;

  -- La nouvelle retire l'ancienne sur le même obstacle : une habitude protégée
  -- par trois répulsions contradictoires n'est pas protégée.
  update public.repulsions
     set active = false, retired_at = now()
   where user_id = v_uid and habit_text = p_habit and active
     and obstacle = coalesce(nullif(btrim(p_obstacle),''), '—');

  insert into public.repulsions(user_id, habit_text, obstacle, repulsion, origin)
  values (v_uid, p_habit, coalesce(nullif(btrim(p_obstacle),''), '—'),
          left(btrim(p_repulsion), 300), 'user')
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.repulsion_retire(p_id bigint)
returns boolean
language sql security definer set search_path = public as $$
  with u as (
    update public.repulsions set active = false, retired_at = now()
     where id = p_id and user_id = auth.uid() and active
    returning 1)
  select exists (select 1 from u);
$$;

revoke all on function public.repulsion_set(text, text, text) from public, anon;
revoke all on function public.repulsion_retire(bigint)        from public, anon;
grant execute on function public.repulsion_set(text, text, text) to authenticated, service_role;
grant execute on function public.repulsion_retire(bigint)        to authenticated, service_role;
