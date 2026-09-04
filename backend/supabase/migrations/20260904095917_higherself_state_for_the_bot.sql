-- ═══════════════════════════════════════════════════════════════════════
-- LE MÊME ÉTAT POUR LA MINI-APP ET POUR LE BOT
-- 04/09/2026
--
-- `higherself_state()` a été écrite ce matin pour la mini-app Telegram,
-- qui tourne dans un navigateur : elle a une session, donc `auth.uid()`
-- répond. Le bot, lui, n'a pas de session — il travaille en
-- `service_role` et connaît le membre par son `telegram_id`. Avec la
-- signature à zéro argument, `/moi` ne pouvait RIEN afficher.
--
-- Deux chemins possibles :
--   a. le bot recalcule les séries et la consistance de son côté ;
--   b. la fonction accepte l'uuid quand il n'y a pas de session.
--
-- (a) est le piège : deux calculs de la même chose finissent toujours par
-- diverger, et le jour où ils divergent, la mini-app et le bot annoncent
-- deux chiffres différents au même membre, le même jour. On prend (b).
--
-- SÉCURITÉ. `p_user` n'est lu QUE si `auth.uid()` est nul. Un membre
-- connecté ne peut donc pas passer l'uuid d'un autre pour lire son
-- Totehm : sa propre session gagne toujours. Et `anon` n'a pas le droit
-- d'exécuter la fonction — seuls `authenticated` (sa session) et
-- `service_role` (le bot, à travers le webhook signé) l'ont.
--
-- On ajoute aussi de quoi POSER une leçon ou un objectif depuis Telegram :
-- `wisdom` et `objectives` sont protégées par RLS sur `auth.uid()`, donc
-- un insert en service_role sans user_id explicite n'a aucun sens. Deux
-- fonctions minuscules, réservées à `service_role`, qui écrivent la ligne
-- avec l'uuid déjà résolu par le webhook.
-- ═══════════════════════════════════════════════════════════════════════

-- La signature change (0 → 1 argument) : PostgreSQL créerait une deuxième
-- fonction au lieu de remplacer la première, et PostgREST ne saurait plus
-- laquelle appeler. On enlève l'ancienne d'abord.
drop function if exists public.higherself_state();

create or replace function public.higherself_state(p_user uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  -- La session d'abord, l'argument seulement à défaut. Jamais l'inverse.
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

    -- ── LES HABITUDES, AVEC CE QUI SE DÉDUIT ──────────────────────────
    -- Rien de tout ça n'est saisi par le membre. La série, la
    -- consistance, la question en attente : ce sont des CONSÉQUENCES de
    -- ce qu'il a répondu. Un tracker qui demande de saisir sa série est
    -- un tableur avec un logo.
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
            -- La consistance se lit sur 30 jours, et sur les questions
            -- RÉPONDUES. Compter les questions ignorées comme des échecs
            -- punirait quelqu'un d'avoir été en avion.
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
            -- LA SÉRIE, sans boucle : on remonte les réponses de la plus
            -- récente à la plus ancienne en cumulant les ratés, et on
            -- compte les lignes où le cumul vaut encore zéro. Le premier
            -- raté clôt la série, tout ce qui est derrière est ignoré.
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
        and coalesce(o.status, 'open') not in ('done','dropped','closed')
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

comment on function public.higherself_state(uuid) is
  'Tout l''état HigherSelf en un appel : habitudes + séries + consistance, wisdom, objectifs, spots, état du bot. La session gagne toujours sur p_user, qui ne sert qu''au bot (service_role).';


-- ── POSER UNE LEÇON OU UN OBJECTIF DEPUIS TELEGRAM ─────────────────────
-- `wisdom` et `objectives` sont protégées par une RLS sur `auth.uid()`.
-- Le bot n'a pas de session : sans ces deux fonctions, /wisdom et
-- /objectif seraient obligés d'écrire en service_role dans une table
-- protégée, en devinant la colonne user_id. On l'écrit une fois, ici.
-- `left(..., 500)` : une commande Telegram n'est pas un journal intime,
-- et une colonne sans borne finit toujours par recevoir un roman.
create or replace function public.add_wisdom_admin(p_user uuid, p_text text, p_intention text default null)
returns uuid
language sql security definer set search_path = public as $$
  insert into public.wisdom(user_id, text, i)
  values (p_user, left(btrim(p_text), 500), nullif(btrim(coalesce(p_intention,'')), ''))
  returning id;
$$;

revoke all on function public.add_wisdom_admin(uuid, text, text) from public, anon, authenticated;
grant execute on function public.add_wisdom_admin(uuid, text, text) to service_role;

create or replace function public.add_objective_admin(p_user uuid, p_text text)
returns uuid
language sql security definer set search_path = public as $$
  insert into public.objectives(user_id, text, status)
  values (p_user, left(btrim(p_text), 500), 'open')
  returning id;
$$;

revoke all on function public.add_objective_admin(uuid, text) from public, anon, authenticated;
grant execute on function public.add_objective_admin(uuid, text) to service_role;

comment on function public.add_wisdom_admin(uuid, text, text) is
  'Écrit une leçon pour un membre identifié hors session (bot Telegram). service_role seul.';
comment on function public.add_objective_admin(uuid, text) is
  'Écrit un objectif pour un membre identifié hors session (bot Telegram). service_role seul.';
