-- LE TRIP · 2/5 — l'arbre entier en un appel.
-- Un trip, ses habitudes, et les répulsions de chaque habitude. Trois niveaux,
-- une requête : ouvrir une boîte ne redemande jamais rien au réseau.
-- `loose` porte les habitudes qui ne servent encore aucun trip. Elles ne
-- disparaissent jamais — c'est au membre de les ranger, pas à une migration
-- de deviner.
create or replace function public.my_trips()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_steps jsonb;
  v_res   jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('signed_in', false);
  end if;

  select coalesce(steps, '[]'::jsonb) into v_steps
  from public.totehms where user_id = v_uid limit 1;
  v_steps := coalesce(v_steps, '[]'::jsonb);

  select jsonb_build_object(
    'signed_in', true,

    'trips', coalesce((
      select jsonb_agg(x order by x->>'target_at' nulls last, x->>'created_at')
      from (
        select jsonb_build_object(
          'id',         o.id,
          'text',       o.text,
          'target_at',  o.target_at,
          'status',     o.status,
          'created_at', o.created_at,
          -- Le compte à rebours est calculé ICI. Un client qui compare des
          -- dates compare AUSSI son horloge, et l'horloge d'un téléphone ment
          -- plus souvent qu'on ne croit.
          'days_left',  case when o.target_at is null then null
                             else (o.target_at::date - (now() at time zone 'UTC')::date) end,
          'habits',     coalesce((
            select jsonb_agg(jsonb_build_object(
                     't',    s->>'t',
                     'f',    s->>'f',
                     'i',    coalesce(nullif(s->>'i',''), public.intention_of(s->>'t')),
                     'ready', (nullif(s->>'f','') is not null),
                     'stats', public.habit_stats(v_uid, s->>'t'),
                     'repulsions', coalesce((
                       select jsonb_agg(jsonb_build_object(
                                'id', r.id, 'obstacle', r.obstacle,
                                'repulsion', r.repulsion, 'problem', r.problem))
                       from public.repulsions r
                       where r.user_id = v_uid and r.habit_text = s->>'t' and r.active
                     ), '[]'::jsonb)
                   ))
            from jsonb_array_elements(v_steps) s
            where nullif(s->>'o','') = o.id::text
          ), '[]'::jsonb)
        ) as x
        from public.objectives o
        where o.user_id = v_uid
          and coalesce(o.status, 'active') not in ('done','dropped','closed')
      ) q
    ), '[]'::jsonb),

    'loose', coalesce((
      select jsonb_agg(jsonb_build_object(
               't',    s->>'t',
               'f',    s->>'f',
               'i',    coalesce(nullif(s->>'i',''), public.intention_of(s->>'t')),
               'ready', (nullif(s->>'f','') is not null),
               'stats', public.habit_stats(v_uid, s->>'t'),
               'repulsions', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', r.id, 'obstacle', r.obstacle,
                          'repulsion', r.repulsion, 'problem', r.problem))
                 from public.repulsions r
                 where r.user_id = v_uid and r.habit_text = s->>'t' and r.active
               ), '[]'::jsonb)
             ))
      from jsonb_array_elements(v_steps) s
      where nullif(s->>'o','') is null
    ), '[]'::jsonb),

    -- Les trips terminés : on les garde, ce sont eux l'autobiographie.
    'done', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'text', o.text,
               'status', o.status, 'outcome', o.outcome, 'at', o.outcome_at))
      from public.objectives o
      where o.user_id = v_uid
        and coalesce(o.status, 'active') in ('done','dropped','closed')
    ), '[]'::jsonb)
  ) into v_res;

  return v_res;
end $$;

revoke all on function public.my_trips() from public, anon;
grant execute on function public.my_trips() to authenticated, service_role;

comment on function public.my_trips() is
  'L''arbre complet WHY/HOW/WISDOM en un appel : trips (objectifs ouverts) avec leurs habitudes et les répulsions de chaque habitude, plus les habitudes non rattachées (loose) et les trips terminés.';

create index if not exists objectives_user_status_idx
  on public.objectives (user_id, status, target_at);
