-- ═══════════════════════════════════════════════════════════════════════
-- LA RECHERCHE, ET LE TOTEHM DANS LA POCHE
-- 04/09/2026
--
-- Suite immédiate de `20260904093833_local_agendas.sql`. Deux migrations
-- parce que les deux moitiés ne partagent rien : l'une nourrit la carte,
-- l'autre nourrit le membre. Une migration qui fait deux choses sans
-- rapport est une migration qu'on ne peut pas défaire à moitié.
-- ═══════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════
-- 3 · SEARCH A TOTEHM — UNE LISTE, PAS UNE DEVINETTE
--
-- CE QUI N'ALLAIT PAS, mesuré dans `totehm.html` :
--
--   · `ilike('%'||q||'%').limit(1)` — taper « wa » ouvrait le Totehm d'UN
--     inconnu, choisi par le hasard du plan d'exécution. Aucune liste,
--     aucun classement, aucun choix.
--   · un invité (non connecté) ne peut pas lire `profiles` — la RLS ne
--     vise que `authenticated`. Le front compensait avec un tableau de
--     TROIS PROFILS INVENTÉS en dur. Un visiteur cherchait quelqu'un et
--     trouvait de la fiction.
--   · « this Totehm is private » s'affichait aussi quand le nom n'existait
--     pas, et quand le Totehm existait mais était vide.
--
-- Une seule fonction, `security definer`, ouverte à `anon` : elle ne rend
-- QUE des Totehms explicitement partagés (`totehm_visibility='members'`),
-- jamais un e-mail, jamais un `telegram_id`, jamais un id technique.
--
-- LE CLASSEMENT : exact d'abord, puis préfixe, puis sous-chaîne. C'est
-- l'ordre dans lequel un humain cherche un nom qu'il connaît déjà.
-- ═══════════════════════════════════════════════════════════════════════
drop function if exists public.search_totehms(text, integer);

create function public.search_totehms(p_q text, p_limit integer default 8)
returns table(
  pseudo     text,
  habits     integer,
  intentions text[],
  updated_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with q as (
    select btrim(coalesce(p_q, '')) as raw
  ),
  shared as (
    select p.pseudo,
           t.steps,
           t.updated_at
    from public.profiles p
    join public.totehms  t on t.user_id = p.id
   where t.totehm_visibility = 'members'
     and p.pseudo is not null
     and jsonb_typeof(t.steps) = 'array'
     and jsonb_array_length(t.steps) > 0
  )
  select s.pseudo,
         jsonb_array_length(s.steps)::integer as habits,
         (select coalesce(array_agg(distinct x), '{}')
            from jsonb_array_elements(s.steps) e,
                 lateral (select nullif(btrim(e->>'i'), '')) as v(x)
           where x is not null)               as intentions,
         s.updated_at
  from shared s, q
  where length(q.raw) >= 2
    and s.pseudo ilike '%' || q.raw || '%'
  order by
    case
      when lower(s.pseudo) = lower(q.raw)               then 0
      when lower(s.pseudo) like lower(q.raw) || '%'     then 1
      else 2
    end,
    length(s.pseudo),
    s.updated_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 8), 25));
$function$;

-- Ouverte à `anon` : c'est une recherche publique sur des Totehms que
-- leurs propriétaires ont choisi de partager. Rien d'autre n'en sort.
revoke all on function public.search_totehms(text, integer) from public;
grant execute on function public.search_totehms(text, integer) to anon, authenticated, service_role;

comment on function public.search_totehms(text, integer) is
  'Recherche publique de Totehms PARTAGES (totehm_visibility=members).
   Rend pseudo + nombre d''habitudes + intentions portees. Jamais d''email,
   jamais d''id, jamais un Totehm prive. Classement exact > prefixe >
   sous-chaine. Remplace le ilike(%q%).limit(1) qui devinait, et le reseau
   de demo invente qui servait les invites.';


-- ═══════════════════════════════════════════════════════════════════════
-- 4 · HIGHERSELF — TOUT L'ÉTAT EN UN APPEL
--
-- La mini-app Telegram s'ouvre sur un réseau mobile, souvent en 4G
-- dégradée. Six requêtes en série, c'est six allers-retours avant le
-- premier pixel utile. Une seule.
--
-- LE TRACKING EST DÉDUIT, JAMAIS SAISI. Personne ne coche une case
-- « série de 12 jours » : la série se calcule à partir des réponses déjà
-- données au bot. C'est la même doctrine que le pic narratif de
-- l'autobiographie — on ne demande pas ce qu'on peut déduire.
--
--   asked        combien de fois le bot a posé la question
--   answered     combien de fois il a eu une réponse (le silence est une donnée)
--   done         combien de fois c'était fait
--   streak       les DONE consécutifs, en repartant de la plus récente réponse
--   consistency  done / answered sur 30 jours, en pourcentage
--   pending      une question posée et non répondue attend encore
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.higherself_state()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_uid  uuid := auth.uid();
  v_res  jsonb;
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

    -- ── LES HABITUDES, AVEC CE QU'ELLES ONT PRODUIT ──────────────────
    'habits', coalesce((
      select jsonb_agg(h order by h->>'habit')
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
            count(*)                                            as asked,
            count(*) filter (where o.answered_at is not null)    as answered,
            count(*) filter (where o.outcome = 'done')           as done,
            count(*) filter (where o.answered_at is not null
                               and o.asked_at > now() - interval '30 days') as answered_30,
            count(*) filter (where o.outcome = 'done'
                               and o.asked_at > now() - interval '30 days') as done_30,
            max(o.answered_at) filter (where o.outcome = 'done') as last_done,
            (select o2.id from public.habit_outcomes o2
              where o2.user_id = v_uid and o2.habit_text = m.habit
                and o2.answered_at is null
              order by o2.asked_at desc limit 1)                 as pending_id,
            -- La série : on descend les réponses de la plus récente à la
            -- plus ancienne et on s'arrête au premier MISSED. `row_number`
            -- fait le décompte, `min` trouve la rupture.
            coalesce((
              select count(*) from (
                select o3.outcome,
                       row_number() over (order by o3.answered_at desc) as rn
                from public.habit_outcomes o3
                where o3.user_id = v_uid and o3.habit_text = m.habit
                  and o3.answered_at is not null
              ) r
              where r.outcome = 'done'
                and r.rn < coalesce((
                  select min(rn2) from (
                    select o4.outcome,
                           row_number() over (order by o4.answered_at desc) as rn2
                    from public.habit_outcomes o4
                    where o4.user_id = v_uid and o4.habit_text = m.habit
                      and o4.answered_at is not null
                  ) b where b.outcome <> 'done'
                ), 2147483647)
            ), 0)                                               as streak
          from public.habit_outcomes o
          where o.user_id = v_uid and o.habit_text = m.habit
        ) st
      ) x
    ), '[]'::jsonb),

    -- ── LES LEÇONS ───────────────────────────────────────────────────
    'wisdom', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', w.id, 'text', w.text, 'i', w.i, 'at', w.created_at)
             order by w.created_at desc)
      from (select * from public.wisdom
             where user_id = v_uid
             order by created_at desc limit 30) w
    ), '[]'::jsonb),

    -- ── LES OBJECTIFS OUVERTS ────────────────────────────────────────
    'objectives', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', o.id, 'text', o.text, 'status', o.status,
               'target_at', o.target_at, 'became_habit', o.became_habit)
             order by o.created_at desc)
      from public.objectives o
      where o.user_id = v_uid
        and coalesce(o.status, 'open') not in ('done', 'dropped', 'closed')
    ), '[]'::jsonb),

    -- ── MES SPOTS ────────────────────────────────────────────────────
    'spots', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'activite', s.activite, 'intention', s.intention,
               'commentaire', s.commentaire, 'lat', s.lat, 'lng', s.lng,
               'is_public', s.is_public, 'energy_mode', s.energy_mode,
               'expires_at', s.expires_at, 'at', s.created_at,
               'takes', (select count(*) from public.spot_takes k
                          where k.ref = s.id::text))
             order by s.created_at desc)
      from public.spots s
      where s.user_id = v_uid and s.active
    ), '[]'::jsonb)
  ) into v_res;

  return v_res;
end $function$;

revoke all on function public.higherself_state() from public, anon;
grant execute on function public.higherself_state() to authenticated, service_role;

comment on function public.higherself_state() is
  'Tout l''etat de HigherSelf en UN appel : profil, adhesion, bot,
   habitudes AVEC tracking deduit (serie, consistance 30j, question en
   attente), Wisdom, objectifs ouverts, spots du membre. Le tracking est
   deduit des reponses deja donnees au bot — jamais saisi.';


-- ═══════════════════════════════════════════════════════════════════════
-- 5 · CHERCHER UN SPOT — pour le membre, dans la mini-app
--
-- `places_near` et `live_near` sont réservées au serveur (elles servent le
-- radar, qui vérifie l'abonnement). Ici c'est le membre lui-même qui
-- cherche, depuis Telegram : la fonction s'appelle avec SON jeton, et
-- l'abonnement est vérifié DEDANS.
--
-- Elle ne rend que des spots — pas Google, pas Ticketmaster. Chercher
-- « un lieu posé par un membre » et « tout ce qui existe » sont deux
-- gestes différents ; les mélanger, c'est refaire Google Maps.
-- ═══════════════════════════════════════════════════════════════════════
drop function if exists public.spot_search(double precision, double precision, integer, text, text, integer);

create function public.spot_search(
  p_lat       double precision default null,
  p_lng       double precision default null,
  p_radius    integer default 20000,
  p_q         text    default null,
  p_intention text    default null,
  p_limit     integer default 20
)
returns table(
  id          uuid,
  activite    text,
  intention   text,
  commentaire text,
  lieu_type   text,
  energy_mode text,
  lat         double precision,
  lng         double precision,
  dist_m      integer,
  is_mine     boolean,
  expires_at  timestamptz,
  takes       integer,
  created_at  timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    s.id, s.activite, s.intention, nullif(s.commentaire,'') as commentaire,
    s.lieu_type, s.energy_mode, s.lat, s.lng,
    case when p_lat is null or p_lng is null then null
         else earth_distance(ll_to_earth(p_lat, p_lng),
                             ll_to_earth(s.lat, s.lng))::integer end as dist_m,
    (s.user_id = auth.uid())                                  as is_mine,
    s.expires_at,
    (select count(*)::integer from public.spot_takes k where k.ref = s.id::text) as takes,
    s.created_at
  from public.spots s
  where s.active
    and s.lat is not null and s.lng is not null
    and (s.expires_at is null or s.expires_at > now())
    -- Le Club voit les spots du Club ; un non-membre ne voit que le public.
    and (s.is_public
         or exists (select 1 from public.subscriptions sub
                     where sub.user_id = auth.uid()
                       and sub.status in ('active','trialing')))
    and (p_intention is null or s.intention = p_intention)
    and (p_q is null or btrim(p_q) = '' or
         s.activite ilike '%'||btrim(p_q)||'%' or
         coalesce(s.commentaire,'') ilike '%'||btrim(p_q)||'%')
    and (p_lat is null or p_lng is null
         or (earth_box(ll_to_earth(p_lat, p_lng), p_radius) @> ll_to_earth(s.lat, s.lng)
             and earth_distance(ll_to_earth(p_lat, p_lng),
                                ll_to_earth(s.lat, s.lng)) <= p_radius))
  order by
    case when p_lat is null then 1 else 0 end,
    dist_m nulls last,
    s.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$function$;

revoke all on function public.spot_search(double precision, double precision, integer, text, text, integer) from public, anon;
grant execute on function public.spot_search(double precision, double precision, integer, text, text, integer)
  to authenticated, service_role;

comment on function public.spot_search(double precision, double precision, integer, text, text, integer) is
  'Recherche de spots MEMBRES pour la mini-app. Le Club voit les spots du
   Club, un non-membre ne voit que le public — verifie DANS la fonction,
   puisqu''elle est appelee avec le jeton du membre.';
