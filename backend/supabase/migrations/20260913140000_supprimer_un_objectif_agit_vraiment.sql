-- SUPPRIMER UN OBJECTIF AGIT VRAIMENT · 13/09/2026
--
-- La table `objectives` porte deux contraintes CHECK depuis longtemps :
--   status  ∈ {'active','achieved','abandoned','converted'}
--   outcome ∈ {'yes','no', NULL}
--
-- Les fonctions écrites le 04/09 (`trip_close`, `my_trips`,
-- `higherself_state`, `add_objective_admin`) parlaient un vocabulaire que
-- la base n'a jamais accepté — 'done', 'dropped', 'closed', 'open'.
-- Trois conséquences, mesurées le 13/09 sur la prod :
--
--   1. `trip_close` échouait à chaque appel avec
--        « new row for relation "objectives" violates check constraint
--          "objectives_outcome_check" »
--      Le front l'envoyait par `apres(sb.rpc('trip_close',…))` — une
--      promesse dont l'erreur ne repartait qu'en `console.error`, aucun
--      retour utilisateur. Résultat : rien ne bougeait en base, la boîte
--      disparaissait localement, l'objectif revenait au premier
--      rechargement. Depuis le 04/09 aucune suppression d'objectif n'avait
--      abouti — 8 objectifs actifs pour Wah dont trois doublons
--      « Avoir une belle peau » qui témoignent d'autant de tentatives.
--   2. `my_trips` et `higherself_state` filtraient
--        `not in ('done','dropped','closed')` — jamais atteignable —
--      donc TOUS les objectifs étaient traités comme actifs, y compris
--      ceux qu'on croyait fermés.
--   3. `add_objective_admin` insérait avec `status='open'` — refus.
--      Toute pose d'objectif depuis Telegram échouait aussi.
--
-- La règle qui sort de là : « vérifier avant d'affirmer » vaut pour les
-- contraintes autant que pour le code. Un `create or replace function`
-- qui écrit une valeur non prévue par un CHECK ne lève pas à la
-- création — seulement à l'exécution, et seulement quand une donnée
-- essaie de passer. Un test à froid, sans donnée, ne trouve rien.
--
-- Choix : aligner le vocabulaire des fonctions sur celui de la contrainte
-- (pas l'inverse). Une contrainte est la loi du produit : la relâcher,
-- c'est accepter n'importe quel texte parasite dans une colonne qu'un
-- rapport de progression lira demain. Le mapping est sémantique :
--
--   dropped → status='abandoned', outcome='no'    (le membre a lâché)
--   done    → status='achieved',  outcome='yes'   (l'objectif est atteint)
--   open    → status='active'                     (c'est déjà le défaut)


-- ── trip_close : mapper vers le vocabulaire de la contrainte ──────────
create or replace function public.trip_close(p_trip uuid, p_outcome text default 'done')
returns boolean
language sql security definer set search_path = public as $$
  with u as (
    update public.objectives
       set status  = case when p_outcome = 'dropped' then 'abandoned' else 'achieved' end,
           outcome = case when p_outcome = 'dropped' then 'no'         else 'yes'      end,
           outcome_at = now()
     where id = p_trip and user_id = auth.uid()
    returning 1)
  select exists (select 1 from u);
$$;

revoke all on function public.trip_close(uuid, text) from public, anon;
grant execute on function public.trip_close(uuid, text) to authenticated, service_role;


-- ── my_trips : filtrer sur le VRAI vocabulaire ────────────────────────
-- Le reste du corps est identique à 20260904170022 — on ne touche que
-- les deux prédicats de statut, en tête et en queue.
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
          and coalesce(o.status, 'active') not in ('achieved','abandoned','converted')
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

    'done', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'text', o.text,
               'status', o.status, 'outcome', o.outcome, 'at', o.outcome_at))
      from public.objectives o
      where o.user_id = v_uid
        and coalesce(o.status, 'active') in ('achieved','abandoned','converted')
    ), '[]'::jsonb)
  ) into v_res;

  return v_res;
end $$;

revoke all on function public.my_trips() from public, anon;
grant execute on function public.my_trips() to authenticated, service_role;


-- ── higherself_state : même correction, deux prédicats de statut ──────
create or replace function public.higherself_state(p_user uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(auth.uid(), p_user);
  v_res jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('signed_in', false);
  end if;

  select jsonb_build_object(
    'signed_in', true,
    'pseudo',    (select pseudo from public.profiles where id = v_uid),
    'member',    exists (select 1 from public.subscriptions
                          where user_id = v_uid and status in ('active','trialing')),
    'trial',     exists (select 1 from public.subscriptions
                          where user_id = v_uid and status = 'trialing'),
    'bot',       jsonb_build_object(
                   'linked',  exists (select 1 from public.profiles
                                       where id = v_uid and telegram_id is not null),
                   'on',      coalesce((select bot from public.totehms
                                         where user_id = v_uid limit 1), false),
                   'pending', (select count(*) from public.habit_outcomes
                                where user_id = v_uid and answered_at is null)
                 ),

    'habits', coalesce((
      select jsonb_agg(h)
      from (
        select jsonb_build_object(
                 'habit',     m.habit,
                 'freq',      m.freq,
                 'intention', m.intention,
                 'ready',     m.ready,
                 'asked',     st.asked,
                 'answered',  st.answered,
                 'done',      st.done,
                 'streak',    st.streak,
                 'last_done', st.last_done,
                 'pending_id',st.pending_id,
                 'consistency', case when st.answered_30 > 0
                                     then round(100.0 * st.done_30 / st.answered_30)::int
                                     else null end
               ) as h
        from public.my_habits(v_uid) m
        cross join lateral (
          select
            (select count(*) from public.habit_outcomes o
              where o.user_id = v_uid and o.habit_text = m.habit)                   as asked,
            (select count(*) from public.habit_outcomes o
              where o.user_id = v_uid and o.habit_text = m.habit
                and o.answered_at is not null)                                      as answered,
            (select count(*) from public.habit_outcomes o
              where o.user_id = v_uid and o.habit_text = m.habit
                and o.outcome = 'done')                                             as done,
            (select count(*) from public.habit_outcomes o
              where o.user_id = v_uid and o.habit_text = m.habit
                and o.answered_at is not null
                and o.asked_at > now() - interval '30 days')                        as answered_30,
            (select count(*) from public.habit_outcomes o
              where o.user_id = v_uid and o.habit_text = m.habit
                and o.outcome = 'done'
                and o.asked_at > now() - interval '30 days')                        as done_30,
            (select max(o.answered_at) from public.habit_outcomes o
              where o.user_id = v_uid and o.habit_text = m.habit
                and o.outcome = 'done')                                             as last_done,
            (select o2.id from public.habit_outcomes o2
              where o2.user_id = v_uid and o2.habit_text = m.habit
                and o2.answered_at is null
              order by o2.asked_at desc limit 1)                                    as pending_id,
            (select count(*) from (
               select o3.outcome,
                      sum(case when o3.outcome <> 'done' then 1 else 0 end)
                        over (order by o3.answered_at desc
                              rows between unbounded preceding and current row) as breaks
               from public.habit_outcomes o3
               where o3.user_id = v_uid and o3.habit_text = m.habit
                 and o3.answered_at is not null
             ) r where r.breaks = 0)                                                as streak
        ) st
        order by m.habit
      ) x
    ), '[]'::jsonb),

    'wisdom', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'text', w.text, 'i', w.i, 'at', w.created_at))
      from (select * from public.wisdom where user_id = v_uid
             order by created_at desc limit 30) w
    ), '[]'::jsonb),

    'objectives', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'text', o.text, 'status', o.status,
                                          'target_at', o.target_at, 'became_habit', o.became_habit))
      from public.objectives o
      where o.user_id = v_uid
        and coalesce(o.status, 'active') not in ('achieved','abandoned','converted')
    ), '[]'::jsonb),

    'spots', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'activite', s.activite,
               'intention', s.intention, 'commentaire', s.commentaire,
               'lat', s.lat, 'lng', s.lng, 'is_public', s.is_public,
               'energy_mode', s.energy_mode, 'expires_at', s.expires_at, 'at', s.created_at,
               'takes', (select count(*) from public.spot_takes k where k.ref = s.id::text)))
      from public.spots s where s.user_id = v_uid and s.active
    ), '[]'::jsonb)
  ) into v_res;

  return v_res;
end $$;

revoke all on function public.higherself_state(uuid) from public, anon;
grant execute on function public.higherself_state(uuid) to authenticated, service_role;


-- ── add_objective_admin : status='active' (par défaut d'ailleurs) ─────
create or replace function public.add_objective_admin(p_user uuid, p_text text)
returns uuid
language sql security definer set search_path = public as $$
  insert into public.objectives(user_id, text, status)
  values (p_user, left(btrim(p_text), 500), 'active')
  returning id;
$$;

revoke all on function public.add_objective_admin(uuid, text) from public, anon, authenticated;
grant execute on function public.add_objective_admin(uuid, text) to service_role;
