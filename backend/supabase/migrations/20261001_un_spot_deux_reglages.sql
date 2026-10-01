-- ════════════════════════════════════════════════════════════════════
-- 20261001 · UN SPOT, DEUX RÉGLAGES, UN ABONNEMENT — BRIEF DU 01/10/2026
-- ════════════════════════════════════════════════════════════════════
-- « COM et SPACE fonctionnent pour soi, ou pour soi et les autres. »
-- Ce fichier remplace ce que le brief contredit, et le dit :
--
--   A · LE TOTEHM   deux réglages : `private` · `subscribers` (« VISIBLE
--                   TO MY SUBSCRIBERS »). 'members' (tout membre FIGHER)
--                   disparaît. Lire le Totehm d'un autre = être SON abonné
--                   vivant ET qu'il l'ait rendu visible. Rien d'autre.
--   B · L'OFFRE     l'abonnement à un créateur est ANNUEL (Stripe :
--                   `creator-subscribe`), sans passeport FIGHER d'un côté
--                   ni de l'autre. `visibility_set`, `my_console` (la
--                   console vit sur totehm.com).
--   C · LE SPOT     UN seul type. PRIVATE (le propriétaire seul) ou SHARED
--                   (+ SILENT/SOCIAL, + LOCATION ON/OFF). Créé MAINTENANT,
--                   pour une durée : I AM HERE → I WAS THERE se DÉDUIT de
--                   l'heure (rien ne se stocke, donc rien ne rate le
--                   passage, page fermée ou pas). Plus de futur, de
--                   capacité, de candidature, de sélection, d'accès par
--                   Spot, de Short-Live, de pourcentage.
--   D · LE LIEU     propriétaire : exact, toujours. Autres : PRIVATE → rien ;
--                   SHARED·OFF → la ville ; SHARED·ON → exact pour les
--                   abonnés vivants du créateur. Lu au moment de la
--                   consultation. Aucune distance, aucun cap n'est rendu à
--                   qui n'a pas le point : le rayon du fil se calcule sur
--                   des positions arrondies à 0,1° des DEUX côtés.
--   E · LES VIDÉOS  le seau `moments` devient PRIVÉ ; une vidéo se lit par
--                   URL signée, et la base dit qui peut la signer
--                   (`_clip_readable`). 33 s, 20 Mo.
--   F · LE BOT      offre séparée (7 €/mois) : `bot_subscriptions`,
--                   `totehmbot_access`, `_bot_memory` (faits ≠
--                   interprétations ; la mémoire survit à l'arrêt).
--
-- ⚠️ `create or replace` RÉTABLIT LE GRANT À PUBLIC : tous les droits
-- sont posés EN FIN DE FICHIER, après le dernier `create`.
-- ⚠️ APPLIQUÉ LE 01/10 EN SIX MORCEAUX (MCP), dans l'ordre :
--   20261001_a_offer_open · 20261001_b_probe_update (la colonne visibility)
--   · 20261001_c_bot_subscriptions · 20261001_d_totehm_offre_console ·
--   20261001_e_lecture_et_colonnes · 20261001_f_spot_fonctions ·
--   20261001_g_videos_et_droits. Ce fichier est leur somme, dans le même
--   ordre de dépendance. Un `update` SANS `where` est aussi refusé.
-- ⚠️ AUCUNE INSTRUCTION DESTRUCTIVE ICI (ni `drop`, ni `alter … drop`) :
-- depuis la session cloud, toute instruction destructive attend une
-- approbation qui n'arrive pas (mesuré le 01/10). Ce fichier REMPLACE et
-- RÉVOQUE ; le ménage (supprimer les anciennes fonctions, renommer la
-- valeur 'members') est dans `20261001_b_menage.sql`, appliqué par Claude
-- Code depuis le terminal de Wah. D'où trois écarts assumés, et écrits :
--   · en base, la valeur 'members' de `totehms.totehm_visibility` VEUT DIRE
--     « VISIBLE TO MY SUBSCRIBERS » jusqu'au ménage (`_vis_shared()` rend
--     la valeur que la contrainte accepte : le code marche avant ET après) ;
--   · `spot_plans.shield` porte LOCATION ON/OFF ; `mode` et `shield` d'un
--     Spot PRIVATE sont des valeurs inertes ('silent', 'off') que
--     `_spot_view` ne rend jamais ; capacité, accès, sélection, nature et
--     type restent des colonnes inertes ;
--   · les anciennes fonctions de l'Espace sont RÉVOQUÉES, plus supprimées.
-- ⚠️ Données : les 42 Spots de DÉMO (datés dans le futur, sans vidéo) et
-- leurs 10 membres sont partis par `demo_purge()`, lancée juste avant ; les
-- 11 Spots RÉELS restent, tous SHARED ; les annulés restent annulés.
-- ════════════════════════════════════════════════════════════════════


-- 0 · LA DÉMO : `select public.demo_purge();` lancée le 01/10 AVANT ce
--     fichier (execute_sql) → {spots: 42, members: 10}.


-- ════════════════════════════════════════════════════════════════════
-- A · LE TOTEHM — PRIVATE · VISIBLE TO MY SUBSCRIBERS
-- ════════════════════════════════════════════════════════════════════
-- La valeur PARTAGÉE que la contrainte accepte AUJOURD'HUI : 'members'
-- avant le ménage, 'subscribers' après. Écrire par elle = marcher dans les
-- deux états. Lire : `in ('subscribers','members')`, partout.
create or replace function public._vis_shared()
returns text
language sql stable security definer set search_path to 'public'
as $f$
  select case when pg_get_constraintdef(c.oid) like '%subscribers%' then 'subscribers' else 'members' end
    from pg_constraint c
   where c.conrelid = 'public.totehms'::regclass and c.conname = 'totehms_visibility_check';
$f$;

-- La politique « subscribers read the creator totehm » reste (le ménage la
-- retire) : elle lit `is_subscribed_to`, réécrite ci-dessous pour EXIGER
-- la visibilité — un Totehm repassé en PRIVATE ne reste plus ouvert.

-- LA règle de lecture du Totehm d'un autre. `security definer` OBLIGATOIRE
-- (appelée dans la politique de `totehms`, qu'elle relit : récursion).
create or replace function public._shared_with_me(p_owner uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $f$
  select coalesce(p_owner = auth.uid(), false)
      or (exists (select 1 from public.totehms t
                   where t.user_id = p_owner and t.totehm_visibility in ('subscribers','members'))
          and public._subscriber_of(p_owner, auth.uid()));
$f$;

-- Même sens, gardée pour ceux qui la lisent encore (reveal_cloth) :
-- abonné vivant d'un Totehm visible, jamais soi-même.
create or replace function public.is_subscribed_to(p_creator uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $f$
  select p_creator is distinct from auth.uid() and public._shared_with_me(p_creator);
$f$;

-- L'OFFRE EST OUVERTE quand le créateur a un prix, un moyen de versement,
-- l'a allumée, et que son Totehm est VISIBLE TO MY SUBSCRIBERS (vendre un
-- Totehm privé, ce serait vendre du vide).
create or replace function public._offer_open(p_creator uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $f$
  select exists (select 1 from public.creator_profiles cp
                  where cp.user_id = p_creator and cp.monetized
                    and cp.custom_sub_price is not null and cp.payout_method is not null)
     and exists (select 1 from public.totehms t
                  where t.user_id = p_creator and t.totehm_visibility in ('subscribers','members'));
$f$;


-- ════════════════════════════════════════════════════════════════════
-- B · L'OFFRE — annuelle, ouverte à tous, découverte sans contenu
-- ════════════════════════════════════════════════════════════════════

-- LA PAGE D'UN CRÉATEUR — totehm.com/@nom. Ouverte à tous, même sans
-- session. Elle ne rend AUCUN contenu réservé : le nom, les couleurs de
-- ses intentions, l'offre, et ce que CE lecteur peut faire.
create or replace function public.creator_page(p_pseudo text)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_me uuid := auth.uid(); v_uid uuid; v_t public.totehms%rowtype;
        v_cp public.creator_profiles%rowtype; v_open boolean;
        v_st text; v_until timestamptz; v_ending boolean; v_pal text[];
begin
  select id into v_uid from public.profiles
   where lower(pseudo) = lower(btrim(coalesce(p_pseudo, ''))) limit 1;
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;

  select * into v_t from public.totehms where user_id = v_uid limit 1;
  select * into v_cp from public.creator_profiles where user_id = v_uid;
  v_open := public._offer_open(v_uid);

  if v_uid is distinct from v_me and coalesce(v_t.totehm_visibility, 'private') not in ('subscribers','members') then
    return jsonb_build_object('ok', false, 'why', 'private');
  end if;

  v_pal := array(select x from (
             select distinct x from jsonb_array_elements(coalesce(v_t.steps, '[]'::jsonb)) s,
                    unnest(public._step_intentions(s)) x
              where btrim(coalesce(s->>'t', '')) <> '') u
           order by array_position(array['fight','flow','enrich','love','express','focus','celebrate'], x));

  if v_me is not null then
    select status, current_period_end, ending into v_st, v_until, v_ending
      from public.creator_subscriptions where creator_id = v_uid and fan_id = v_me;
  end if;

  return jsonb_build_object(
    'ok', true,
    'pseudo', (select pseudo from public.profiles where id = v_uid),
    'palette', to_jsonb(v_pal),
    'sale', jsonb_build_object(
      'open', v_open,
      'price_cents', case when v_open then v_cp.custom_sub_price end,
      'currency', coalesce(v_cp.currency, 'eur'),
      'period', 'year'),
    'viewer', jsonb_build_object(
      'signed_in',  v_me is not null,
      'me',         v_uid = v_me,
      'subscribed', coalesce(v_st in ('active','trialing'), false),
      'until',      v_until,
      'ending',     coalesce(v_ending, false),
      'can_read',   v_me is not null and public._shared_with_me(v_uid)));
end $f$;

-- LE TOTEHM D'UN AUTRE — même corps qu'au 30/09, la règle a changé.
create or replace function public.totehm_of(p_pseudo text)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_me    uuid := auth.uid();
  v_uid   uuid;
  v_steps jsonb;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;

  select p.id into v_uid from public.profiles p
   where lower(p.pseudo) = lower(btrim(p_pseudo)) limit 1;
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;

  if not coalesce(public._shared_with_me(v_uid), false) then
    if public._offer_open(v_uid) then
      return jsonb_build_object('ok', false, 'why', 'subscribe',
                                'pseudo', (select pseudo from public.profiles where id = v_uid));
    end if;
    return jsonb_build_object('ok', false, 'why', 'private');
  end if;

  select coalesce(t.steps,'[]'::jsonb) into v_steps
    from public.totehms t where t.user_id = v_uid limit 1;
  if v_steps is null then return jsonb_build_object('ok', false, 'why', 'private'); end if;

  return jsonb_build_object(
    'ok', true,
    'pseudo', (select pseudo from public.profiles where id = v_uid),
    'steps', v_steps,
    'objs', coalesce((
      select jsonb_object_agg(k.h, k.ids) from (
        select u.h as h, jsonb_agg(distinct u.oid) as ids from (
          select oh.habit_text as h, oh.objective_id::text as oid
          from public.objective_habits oh where oh.user_id = v_uid
          union
          select s->>'t', s->>'o'
          from jsonb_array_elements(v_steps) s
          where nullif(s->>'o','') is not null
        ) u where nullif(u.h,'') is not null group by u.h) k), '{}'::jsonb),
    'trips', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', o.id, 'text', o.text, 'target_at', o.target_at,
               'status', o.status, 'created_at', o.created_at, 'is', to_jsonb(o."is"),
               'days_left', case when o.target_at is null then null
                                 else (o.target_at::date - (now() at time zone 'UTC')::date) end,
               'visions', coalesce((select jsonb_agg(ov.vision_id)
                 from public.objective_visions ov
                 where ov.user_id = v_uid and ov.objective_id = o.id), '[]'::jsonb))
             order by o.target_at nulls last, o.created_at)
      from public.objectives o
      where o.user_id = v_uid
        and coalesce(o.status,'active') not in ('achieved','abandoned','converted')), '[]'::jsonb),
    'reps', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'text', r.repulsion, 'obstacle', r.obstacle, 'is', to_jsonb(r."is"),
               'hs', coalesce((select jsonb_agg(distinct u.h) from (
                   select r.habit_text as h where nullif(r.habit_text,'') is not null
                   union
                   select rh.habit_text from public.repulsion_habits rh
                   where rh.user_id = v_uid and rh.repulsion_id = r.id) u), '[]'::jsonb),
               'ws', coalesce((select jsonb_agg(rt.wisdom_id)
                 from public.repulsion_teachings rt
                 where rt.user_id = v_uid and rt.repulsion_id = r.id), '[]'::jsonb))
             order by r.created_at)
      from public.repulsions r where r.user_id = v_uid and r.active), '[]'::jsonb),
    'visions', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'text', v.text,
               'is', to_jsonb(v."is"), 'rang', v.importance,
               'os', coalesce((select jsonb_agg(ov.objective_id)
                 from public.objective_visions ov
                 where ov.user_id = v_uid and ov.vision_id = v.id), '[]'::jsonb))
             order by v.importance nulls last, v.created_at)
      from public.visions v where v.user_id = v_uid), '[]'::jsonb),
    'wisdom', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'text', w.text,
               'is', to_jsonb(w."is"), 'rang', w.importance,
               'os', coalesce((select jsonb_agg(tob.objective_id)
                 from public.teaching_objectives tob
                 where tob.user_id = v_uid and tob.wisdom_id = w.id), '[]'::jsonb))
             order by w.importance nulls last, w.created_at)
      from public.wisdom w where w.user_id = v_uid), '[]'::jsonb)
  );
end $function$;

-- CHERCHER UN TOTEHM — par son NOM, jamais par son contenu : chercher
-- dans les habitudes laisserait deviner, mot par mot, ce qui est réservé.
-- Rend le nom, l'offre et si JE suis abonné. Mes abonnements d'abord.
create or replace function public.totehm_search(p_q text, p_limit integer default 8)
returns table(pseudo text, offer boolean, price_cents integer, currency text, subscribed boolean)
language sql stable security definer set search_path to 'public'
as $f$
  with q as (select btrim(coalesce(p_q, '')) as raw),
  c as (
    select p.id, p.pseudo, t.updated_at,
           public._offer_open(p.id) as offer,
           coalesce(public._subscriber_of(p.id, auth.uid()), false) as subscribed
      from public.profiles p join public.totehms t on t.user_id = p.id
     where t.totehm_visibility in ('subscribers','members') and p.pseudo is not null)
  select c.pseudo, c.offer,
         case when c.offer then cp.custom_sub_price end,
         coalesce(cp.currency, 'eur'), c.subscribed
    from c left join public.creator_profiles cp on cp.user_id = c.id, q
   where (length(q.raw) >= 2 and c.pseudo ilike '%' || q.raw || '%')
      or (length(q.raw) = 0 and c.subscribed)
   order by c.subscribed desc,
            case when lower(c.pseudo) = lower(q.raw) then 0
                 when lower(c.pseudo) like lower(q.raw) || '%' then 1 else 2 end,
            length(c.pseudo), c.updated_at desc nulls last
   limit greatest(1, least(coalesce(p_limit, 8), 25));
$f$;

-- L'ancienne signature (la page du 30/09 l'appelle jusqu'au déploiement)
-- ne rend plus aucun contenu : ni nombre d'habitudes, ni intentions.
create or replace function public.search_totehms(p_q text, p_limit integer default 8)
returns table(pseudo text, habits integer, intentions text[], updated_at timestamptz)
language sql stable security definer set search_path to 'public'
as $f$
  select s.pseudo, null::integer, '{}'::text[], null::timestamptz from public.totehm_search(p_q, p_limit) s;
$f$;

-- RÉGLER SON OFFRE — un prix PAR AN, sans passeport FIGHER. Allumer
-- l'offre rend le Totehm VISIBLE TO MY SUBSCRIBERS (on ne vend pas du
-- vide) ; l'éteindre ne touche ni la visibilité ni les abonnés en cours.
create or replace function public.monetization_set(p_enabled boolean, p_price_cents integer default null, p_benefits text[] default null)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_prix int; v_meth text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if p_price_cents is not null and (p_price_cents < 300 or p_price_cents > 100000) then
    return jsonb_build_object('ok', false, 'why', 'price', 'min', 300, 'max', 100000);
  end if;

  insert into public.creator_profiles as cp (user_id, custom_sub_price, benefits)
  values (v_uid, p_price_cents, array['totehm','spots']::text[])
  on conflict (user_id) do update
    set custom_sub_price = coalesce(p_price_cents, cp.custom_sub_price),
        benefits         = array['totehm','spots']::text[];

  select custom_sub_price, payout_method into v_prix, v_meth
    from public.creator_profiles where user_id = v_uid;
  if p_enabled then
    if v_prix is null then return jsonb_build_object('ok', false, 'why', 'price_first'); end if;
    if v_meth is null then return jsonb_build_object('ok', false, 'why', 'payout_first'); end if;
  end if;
  update public.creator_profiles set monetized = coalesce(p_enabled, monetized) where user_id = v_uid;
  if p_enabled then
    update public.totehms set totehm_visibility = public._vis_shared() where user_id = v_uid;
  end if;
  return jsonb_build_object('ok', true, 'monetized', p_enabled, 'open', public._offer_open(v_uid));
end $f$;

-- LE RÉGLAGE DU TOTEHM — deux valeurs, rien d'autre. Repasser en PRIVATE
-- ne résilie personne : la réponse dit combien d'abonnés vivants
-- perdent la lecture, la console le montre avant.
create or replace function public.visibility_set(p_visibility text)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_n int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if coalesce(p_visibility, '') not in ('private','subscribers') then return jsonb_build_object('ok', false, 'why', 'value'); end if;
  update public.totehms set totehm_visibility = case when p_visibility = 'private' then 'private' else public._vis_shared() end
   where user_id = v_uid;
  if not found then return jsonb_build_object('ok', false, 'why', 'no_totehm'); end if;
  select count(*) into v_n from public.creator_subscriptions
   where creator_id = v_uid and status in ('active','trialing');
  return jsonb_build_object('ok', true, 'visibility', p_visibility, 'subscribers', v_n,
                            'open', public._offer_open(v_uid));
end $f$;

-- L'OFFRE QUE LIT `creator-subscribe` (service_role) : sans FIGHER.
create or replace function public.creator_offer(p_pseudo text, p_fan uuid)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_uid uuid; v_cp public.creator_profiles%rowtype;
begin
  if p_fan is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select id into v_uid from public.profiles where lower(pseudo) = lower(btrim(p_pseudo)) limit 1;
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;
  if v_uid = p_fan then return jsonb_build_object('ok', false, 'why', 'self'); end if;
  if not public._offer_open(v_uid) then return jsonb_build_object('ok', false, 'why', 'closed'); end if;
  if public._subscriber_of(v_uid, p_fan) then return jsonb_build_object('ok', false, 'why', 'already'); end if;
  select * into v_cp from public.creator_profiles where user_id = v_uid;
  return jsonb_build_object('ok', true, 'creator_id', v_uid, 'period', 'year',
    'price_cents', v_cp.custom_sub_price, 'currency', coalesce(v_cp.currency, 'eur'));
end $f$;

-- REVEAL THE BOX — la même fonction, la visibilité a changé de nom.
create or replace function public.reveal_cloth(p_name text)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_me uuid := auth.uid(); c public.totehm_clothes%rowtype; v_level text; v_snap jsonb; v_owner_pseudo text;
        v_shared boolean;
begin
  select tc.* into c from public.totehm_clothes tc
   where lower(btrim(tc.name)) = lower(btrim(p_name)) and tc.paid_at is not null
   order by tc.created_at desc limit 1;
  if c.id is null then return jsonb_build_object('found', false); end if;

  if c.box_kind is null then
    return jsonb_build_object('found', true, 'name', c.name, 'legacy', true,
      'level', 'full', 'message', c.message, 'created_at', c.created_at::date);
  end if;

  v_snap := coalesce(c.box_snapshot, '{}'::jsonb);
  if v_me is not null and (c.user_id = v_me or public.is_subscribed_to(c.user_id)) then
    v_level := 'full';
  elsif v_me is not null and public._is_figher(v_me) then
    v_level := 'member';
  else
    v_level := 'locked';
  end if;

  select exists (select 1 from public.totehms t where t.user_id = c.user_id
                  and t.totehm_visibility in ('subscribers','members')) into v_shared;
  if v_shared or c.user_id = v_me then
    select pseudo into v_owner_pseudo from public.profiles where id = c.user_id;
  end if;

  return jsonb_build_object(
    'found', true, 'name', c.name, 'legacy', false, 'level', v_level,
    'view', v_snap->>'view', 'created_at', c.created_at::date,
    'palette', case when v_level = 'locked' then null else v_snap->'palette' end,
    'text',   case when v_level = 'locked' then null else v_snap->>'text' end,
    'is',     case when v_level = 'locked' then null else v_snap->'is' end,
    'owner',  case when v_level = 'locked' then null else v_owner_pseudo end,
    'matter', case when v_level = 'full'   then v_snap->'matter' else null end);
end $function$;


-- ════════════════════════════════════════════════════════════════════
-- F · LE BOT — une offre séparée (avant la console, qui la lit)
-- ════════════════════════════════════════════════════════════════════
-- TotehmBot / Higher Self : 7 €/mois, son propre abonnement Stripe (lot
-- dédié : checkout + webhook `metadata.product = 'totehmbot'`). S'abonner
-- à un créateur n'ouvre NI son bot NI le mien. RLS sans politique : lu et
-- écrit par fonction (le webhook en service_role).
create table if not exists public.bot_subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  stripe_subscription_id text unique,
  status                 text not null default 'incomplete'
                         check (status in ('incomplete','trialing','active','past_due','canceled','unpaid')),
  price_cents            integer,
  currency               text not null default 'eur',
  current_period_end     timestamptz,
  ending                 boolean not null default false,
  created_at             timestamptz not null default now());
alter table public.bot_subscriptions enable row level security;

create or replace function public.totehmbot_access()
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_b public.bot_subscriptions%rowtype; v_comp boolean;
begin
  if v_uid is null then
    return jsonb_build_object('signed_in', false, 'active', false, 'price_cents', 700, 'period', 'month');
  end if;
  select * into v_b from public.bot_subscriptions where user_id = v_uid;
  select exists (select 1 from public.figher_comps c join auth.users u on lower(u.email) = lower(c.email)
                  where u.id = v_uid and (c.expires_at is null or c.expires_at > now())) into v_comp;
  return jsonb_build_object(
    'signed_in', true,
    'active',    coalesce(v_b.status in ('active','trialing'), false) or v_comp,
    'comp',      v_comp,
    'status',    v_b.status, 'until', v_b.current_period_end, 'ending', coalesce(v_b.ending, false),
    'price_cents', 700, 'currency', 'eur', 'period', 'month',
    'linked',    exists (select 1 from public.profiles where id = v_uid and telegram_id is not null),
    -- La mémoire du bot = le Totehm et les Spots du membre : ils restent
    -- à lui, abonnement ou pas.
    'memory_kept', true);
end $f$;


-- ════════════════════════════════════════════════════════════════════
-- LA CONSOLE — totehm.com/console, un appel
-- ════════════════════════════════════════════════════════════════════
-- Proposer et gérer SON abonnement · s'abonner à un autre (via /@nom) ·
-- gérer SES abonnements · trouver SES abonnés · ce qu'on me doit.
-- `club_console` et `creator_card` : révoquées en fin de fichier (le ménage les supprime).
create or replace function public.my_console()
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_cp public.creator_profiles%rowtype;
        v_rules jsonb := public.payout_rules(); v_next date; v_vis text;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;
  select * into v_cp from public.creator_profiles where user_id = v_uid;
  select totehm_visibility into v_vis from public.totehms where user_id = v_uid limit 1;
  v_next := make_date(extract(year from now())::int, extract(month from now())::int, (v_rules->>'day')::int);
  if v_next <= current_date then v_next := (v_next + interval '1 month')::date; end if;

  return jsonb_build_object(
    'signed_in', true,
    'pseudo', (select pseudo from public.profiles where id = v_uid),
    'visibility', case when v_vis in ('subscribers','members') then 'subscribers' else 'private' end,
    'offer', jsonb_build_object(
      'enabled', coalesce(v_cp.monetized, false),
      'open', public._offer_open(v_uid),
      'price_cents', v_cp.custom_sub_price, 'currency', coalesce(v_cp.currency, 'eur'),
      'period', 'year',
      'payout_method', v_cp.payout_method,
      'payout_fin', case when v_cp.payout_handle is null then null else right(v_cp.payout_handle, 4) end,
      'part', (v_rules->>'member_part')::int),
    'subscribers', jsonb_build_object(
      'count', (select count(*) from public.creator_subscriptions
                 where creator_id = v_uid and status in ('active','trialing')),
      'list', coalesce((
        select jsonb_agg(jsonb_build_object('pseudo', pr.pseudo, 'status', cs.status,
                 'since', cs.created_at, 'renews', cs.current_period_end, 'ending', cs.ending)
               order by cs.created_at desc)
          from public.creator_subscriptions cs left join public.profiles pr on pr.id = cs.fan_id
         where cs.creator_id = v_uid), '[]'::jsonb)),
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'creator', pr.pseudo, 'price_cents', cs.amount_cents, 'currency', cs.currency,
        'status', cs.status, 'renews', cs.current_period_end, 'since', cs.created_at,
        'ending', cs.ending) order by cs.created_at desc)
      from public.creator_subscriptions cs left join public.profiles pr on pr.id = cs.creator_id
     where cs.fan_id = v_uid), '[]'::jsonb),
    'earnings', jsonb_build_object(
      'balances', public._balances(v_uid),
      'threshold_cents', (v_rules->>'threshold_cents')::int,
      'next_payout', v_next,
      'recent', coalesce((
        select jsonb_agg(jsonb_build_object('at', l.created_at, 'kind', l.kind,
                  'amount_cents', l.amount_cents, 'currency', l.currency) order by l.created_at desc)
          from (select * from public.member_ledger where user_id = v_uid
                 order by created_at desc limit 12) l), '[]'::jsonb)),
    'payouts', coalesce((
      select jsonb_agg(jsonb_build_object('period', mp.period, 'amount_cents', mp.amount_cents,
                'currency', mp.currency, 'status', mp.status, 'paid_at', mp.paid_at,
                'method', mp.method, 'fin', mp.handle_fin) order by mp.created_at desc)
        from public.member_payouts mp where mp.user_id = v_uid), '[]'::jsonb),
    'bot', public.totehmbot_access(),
    -- L'adhésion FIGHER (le Club) : son statut et le portail Stripe.
    'membership', (select jsonb_build_object('status', s.status, 'since', s.started_at, 'until', s.current_period_end,
                     'ending', coalesce(s.cancel_at_period_end, false), 'price_cents', s.member_locked_price,
                     'portal', s.stripe_customer_id is not null)
                     from public.subscriptions s where s.user_id = v_uid),
    'rules', v_rules);
end $f$;


-- ════════════════════════════════════════════════════════════════════
-- C · LE SPOT — un seul type, PRIVATE / SHARED
-- ════════════════════════════════════════════════════════════════════
-- L'ancien Espace est RÉVOQUÉ en fin de fichier (le ménage le supprime).

-- Les candidatures (2 réelles) restent en base, en lecture par leur
-- auteur seulement : on n'efface pas en silence ce qu'un membre a écrit.

alter table public.spot_plans add column if not exists visibility text not null default 'shared';
do $d$ begin
  if not exists (select 1 from pg_constraint where conname = 'spot_plans_visibility_check') then
    alter table public.spot_plans add constraint spot_plans_visibility_check check (visibility in ('private','shared'));
  end if;
end $d$;

-- `shield` PORTE LOCATION (on | off). Un Spot PRIVATE garde `mode`='silent'
-- et `shield`='off' comme valeurs INERTES (colonnes NOT NULL) : `_spot_view`
-- ne les rend que pour un SHARED.

-- La position GROSSIÈRE (0,1° ≈ 11 km) : la seule qui sert au rayon du fil.
alter table public.spot_plans add column if not exists clat double precision;
alter table public.spot_plans add column if not exists clng double precision;
update public.spot_plans set clat = round(lat::numeric, 1)::double precision,
                             clng = round(lng::numeric, 1)::double precision
 where clat is null or clng is null;
alter table public.spot_plans alter column clat set not null;
alter table public.spot_plans alter column clng set not null;

create index if not exists spot_plans_user_starts_idx on public.spot_plans(user_id, starts_at desc);
create index if not exists spot_plans_shared_starts_idx on public.spot_plans(starts_at desc) where visibility = 'shared' and status = 'published';

-- La ligne `spots` (lue par le bot et la carte du Club) ne porte plus que
-- la position grossière, et un Spot privé n'y est plus lisible par
-- personne (`active = false` : la politique « members read » s'arrête).
update public.spots s
   set lat = round(p.lat::numeric, 1)::double precision,
       lng = round(p.lng::numeric, 1)::double precision,
       is_public = false,
       active = (p.visibility = 'shared' and p.status = 'published')
  from public.spot_plans p where p.spot_id = s.id;

create or replace function public.spot_rules()
returns jsonb
language sql immutable set search_path to 'public'
as $f$
  select jsonb_build_object(
    'clip_seconds', 33,
    'clip_max_bytes', 20971520,
    'countdown', 3,
    'duration_min', 5, 'duration_max', 720,
    'max_day', 24,
    'radius_km', 60,
    'coarse_decimals', 1,
    'feed_days', 90);
$f$;

-- La vidéo d'un Spot : un objet du seau `moments`, déposé par CE membre.
create or replace function public._clip_ok(p_user uuid, p_path text)
returns boolean
language sql stable security definer set search_path to 'public'
as $f$
  select p_path is not null and p_user is not null
     and p_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webm|mp4|mov)$'
     and split_part(p_path, '/', 1) = p_user::text
     and exists (select 1 from storage.objects o
                  where o.bucket_id = 'moments' and o.name = p_path
                    and (o.owner = p_user or o.owner_id = p_user::text));
$f$;

-- LE LIEU EXACT — une seule règle, lue à chaque consultation.
create or replace function public._spot_exact(p_owner uuid, p_viewer uuid, p_visibility text, p_location text)
returns boolean
language sql stable security definer set search_path to 'public'
as $f$
  select p_viewer is not null
     and (p_owner = p_viewer
          or (p_visibility = 'shared' and p_location = 'on' and public._subscriber_of(p_owner, p_viewer)));
$f$;

-- UN SPOT TEL QU'UN LECTEUR A LE DROIT DE LE VOIR. Jamais de distance,
-- jamais de cap : le client ne calcule une distance que sur `exact`. Le
-- contexte (objectifs, répulsions reliés) est du Totehm : au propriétaire
-- seul — voir un Spot ≠ lire le Totehm de son auteur.
create or replace function public._spot_view(p public.spot_plans, p_viewer uuid)
returns jsonb
language sql stable security definer set search_path to 'public'
as $f$
  select jsonb_build_object(
    'id', p.spot_id,
    'habit', p.habit,
    'intentions', to_jsonb(p.intentions),
    'freq', p.snapshot->>'freq',
    'visibility', p.visibility,
    'mode', case when p.visibility = 'shared' then p.mode end,
    'location', case when p.visibility = 'shared' then p.shield end,
    'city', p.city,
    'comment', p.comment,
    'starts_at', p.starts_at,
    'ends_at', p.starts_at + make_interval(mins => p.duration_min),
    'duration_min', p.duration_min,
    'state', case when now() < p.starts_at + make_interval(mins => p.duration_min) then 'am' else 'was' end,
    'creator', (select pr.pseudo from public.profiles pr where pr.id = p.user_id),
    'mine', p.user_id = p_viewer,
    'video', p.video,
    'context', case when p.user_id = p_viewer then p.snapshot - 'at' end,
    'exact', case when public._spot_exact(p.user_id, p_viewer, p.visibility, p.shield)
                  then jsonb_build_object('lat', p.lat, 'lng', p.lng) end);
$f$;

-- CRÉER UN SPOT — gratuit, maintenant, depuis une Habit de MON Totehm.
-- Le client envoie le TEXTE d'une habitude ; le serveur relit mon Totehm
-- (texte, intentions, objectifs et répulsions reliés) : l'instantané.
create or replace function public.spot_create(
  p_habit text, p_visibility text, p_duration_min integer, p_video text,
  p_lat double precision, p_lng double precision, p_city text default null,
  p_comment text default null, p_mode text default null, p_location text default null)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $f$
declare
  v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules(); v_steps jsonb; v_s jsonb;
  v_is text[]; v_objs jsonb; v_reps jsonb; v_id uuid; v_mode text; v_loc text; v_city text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;

  select coalesce(t.steps,'[]'::jsonb) into v_steps from public.totehms t where t.user_id = v_uid limit 1;
  select s into v_s from jsonb_array_elements(coalesce(v_steps,'[]'::jsonb)) s
   where s->>'t' = p_habit and btrim(coalesce(s->>'t','')) <> '' limit 1;
  if v_s is null then return jsonb_build_object('ok', false, 'why', 'habit'); end if;
  v_is := public._step_intentions(v_s);

  if coalesce(p_visibility, '') not in ('private','shared') then return jsonb_build_object('ok', false, 'why', 'visibility'); end if;
  if p_visibility = 'shared' then
    if coalesce(p_mode, '') not in ('social','silent') then return jsonb_build_object('ok', false, 'why', 'mode'); end if;
    if coalesce(p_location, '') not in ('on','off') then return jsonb_build_object('ok', false, 'why', 'location'); end if;
    v_mode := p_mode; v_loc := p_location;
  end if;
  if p_duration_min is null or p_duration_min < (v_r->>'duration_min')::int
     or p_duration_min > (v_r->>'duration_max')::int then
    return jsonb_build_object('ok', false, 'why', 'duration');
  end if;
  if not public._clip_ok(v_uid, p_video) then return jsonb_build_object('ok', false, 'why', 'video'); end if;
  if p_lat is null or p_lng is null or abs(p_lat) > 90 or abs(p_lng) > 180 then
    return jsonb_build_object('ok', false, 'why', 'position');
  end if;
  if (select count(*) from public.spot_plans where user_id = v_uid
        and created_at > now() - interval '24 hours') >= (v_r->>'max_day')::int then
    return jsonb_build_object('ok', false, 'why', 'too_many');
  end if;
  v_city := nullif(left(btrim(coalesce(p_city, '')), 80), '');

  select coalesce(jsonb_agg(jsonb_build_object('text', o.text, 'is', to_jsonb(o."is"))), '[]'::jsonb) into v_objs
    from public.objectives o
   where o.user_id = v_uid and btrim(o.text) <> ''
     and coalesce(o.status,'active') not in ('achieved','abandoned','converted')
     and (o.id::text = v_s->>'o' or exists (select 1 from public.objective_habits oh
           where oh.user_id = v_uid and oh.objective_id = o.id and oh.habit_text = p_habit));
  select coalesce(jsonb_agg(jsonb_build_object('text', r.repulsion)), '[]'::jsonb) into v_reps
    from public.repulsions r
   where r.user_id = v_uid and r.active and btrim(r.repulsion) <> ''
     and (r.habit_text = p_habit or exists (select 1 from public.repulsion_habits rh
           where rh.user_id = v_uid and rh.repulsion_id = r.id and rh.habit_text = p_habit));

  insert into public.spots(user_id, intention, activite, commentaire, lat, lng,
                           duration_min, expires_at, is_public, required_role, energy_mode, active)
  values (v_uid, coalesce(v_is[1], 'focus'), left(p_habit, 80), null,
          round(p_lat::numeric, 1)::double precision, round(p_lng::numeric, 1)::double precision,
          p_duration_min, now() + make_interval(mins => p_duration_min), false, 'public', v_mode,
          p_visibility = 'shared')
  returning id into v_id;

  insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at,
                                duration_min, mode, place, lat, lng, clat, clng, comment,
                                visibility, shield, video, city, capacity, access, selection, kind)
  values (v_id, v_uid, p_habit, v_is,
          jsonb_build_object('habit', p_habit, 'intentions', to_jsonb(v_is),
                             'objectives', v_objs, 'repulsions', v_reps,
                             'freq', v_s->>'f', 'at', now()),
          now(), p_duration_min, coalesce(v_mode, 'silent'), coalesce(v_city, 'here'), p_lat, p_lng,
          round(p_lat::numeric, 1)::double precision, round(p_lng::numeric, 1)::double precision,
          nullif(left(btrim(coalesce(p_comment,'')), 400), ''),
          p_visibility, coalesce(v_loc, 'off'), p_video, v_city, 1, 'club', 'manual', 'experience');

  return jsonb_build_object('ok', true, 'id', v_id,
                            'ends_at', now() + make_interval(mins => p_duration_min));
end $f$;

-- Recherche commune : chaque mot dans l'Habit ; une intention.
create or replace function public._spot_match(p public.spot_plans, p_q text, p_intention text)
returns boolean
language sql immutable set search_path to 'public'
as $f$
  select (p_intention is null or p_intention = any(p.intentions))
     and not exists (select 1 from regexp_split_to_table(lower(btrim(coalesce(p_q, ''))), '\s+') w
                      where w <> '' and position(w in lower(p.habit)) = 0);
$f$;

-- LE FIL (gauche) — les Spots SHARED de la ville et des alentours, + les
-- miens (privés compris). Rayon sur positions arrondies des deux côtés.
-- Ouvert sans session : découvrir et regarder sont gratuits.
create or replace function public.spots_feed(
  p_lat double precision default null, p_lng double precision default null,
  p_q text default null, p_intention text default null,
  p_before timestamptz default null, p_limit integer default 20)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules(); v_res jsonb;
        v_lat double precision; v_lng double precision;
begin
  if p_lat is not null and p_lng is not null and abs(p_lat) <= 90 and abs(p_lng) <= 180 then
    v_lat := round(p_lat::numeric, 1)::double precision;
    v_lng := round(p_lng::numeric, 1)::double precision;
  end if;
  select coalesce(jsonb_agg(public._spot_view(x.p, v_uid) order by (x.p).starts_at desc), '[]'::jsonb) into v_res
    from (select p from public.spot_plans p
           where p.status = 'published'
             and (p_before is null or p.starts_at < p_before)
             and public._spot_match(p, p_q, p_intention)
             and ((v_uid is not null and p.user_id = v_uid)
                  or (p.visibility = 'shared'
                      and p.starts_at > now() - make_interval(days => (v_r->>'feed_days')::int)
                      and (v_lat is null
                           or earth_distance(ll_to_earth(v_lat, v_lng), ll_to_earth(p.clat, p.clng))
                              <= (v_r->>'radius_km')::int * 1000)))
           order by p.starts_at desc
           limit greatest(1, least(coalesce(p_limit, 20), 40))) x;
  return jsonb_build_object('signed_in', v_uid is not null, 'spots', v_res);
end $f$;

-- LE RADAR ET LA LISTE (centre, droite) — seulement les points que j'ai
-- le droit de voir : les miens + les SHARED·ON de mes créateurs.
create or replace function public.spots_exact(p_q text default null, p_intention text default null)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules(); v_res jsonb;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false, 'spots', '[]'::jsonb); end if;
  select coalesce(jsonb_agg(public._spot_view(x.p, v_uid) order by (x.p).starts_at desc), '[]'::jsonb) into v_res
    from (select p from public.spot_plans p
           where p.status = 'published'
             and public._spot_match(p, p_q, p_intention)
             and (p.user_id = v_uid
                  or (p.visibility = 'shared' and p.shield = 'on'
                      and p.starts_at > now() - make_interval(days => (v_r->>'feed_days')::int)
                      and public._subscriber_of(p.user_id, v_uid)))
           order by p.starts_at desc limit 300) x;
  return jsonb_build_object('signed_in', true, 'spots', v_res);
end $f$;

-- UN SPOT (un lien partagé, le radar) — même règle.
create or replace function public.spot_get(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); p public.spot_plans%rowtype;
begin
  select * into p from public.spot_plans where spot_id = p_id and status = 'published';
  if p.spot_id is null or (p.visibility <> 'shared' and p.user_id is distinct from v_uid) then
    return jsonb_build_object('ok', false, 'why', 'nothing');
  end if;
  return jsonb_build_object('ok', true, 'spot', public._spot_view(p, v_uid));
end $f$;


-- ════════════════════════════════════════════════════════════════════
-- E · LES VIDÉOS — un seau privé, une règle de lecture en base
-- ════════════════════════════════════════════════════════════════════
create or replace function public._clip_readable(p_name text)
returns boolean
language sql stable security definer set search_path to 'public'
as $f$
  select (auth.uid() is not null and split_part(p_name, '/', 1) = auth.uid()::text)
      or exists (select 1 from public.spot_plans p
                  where p.video = p_name and p.status = 'published'
                    and (p.visibility = 'shared' or p.user_id = auth.uid()));
$f$;

update storage.buckets set public = false, file_size_limit = 20971520,
       allowed_mime_types = array['video/webm','video/mp4','video/quicktime']
 where id = 'moments';
do $d$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'moments read readable') then
    create policy "moments read readable" on storage.objects for select to anon, authenticated
      using (bucket_id = 'moments' and public._clip_readable(name));
  end if;
end $d$;


-- ════════════════════════════════════════════════════════════════════
-- F (suite) · LA MÉMOIRE DU BOT — des faits, pas des interprétations
-- ════════════════════════════════════════════════════════════════════
-- Lue par le bot (service_role) avec l'uuid du membre. Elle relie ce que
-- le membre a ÉCRIT (son Totehm) à ce qu'il a VÉCU (ses Spots, privés
-- compris) sans second système de Spots. Ne dépend PAS de l'abonnement
-- au bot : arrêter le bot ne retire rien, ne publie rien.
-- ⚠️ Un Spot terminé n'est PAS une preuve de réalisation ; SILENT/SOCIAL
-- n'est PAS une humeur. La réponse le dit, champ par champ.
create or replace function public._bot_memory(p_user uuid)
returns jsonb
language sql stable security definer set search_path to 'public'
as $f$
  select jsonb_build_object(
    'rules', jsonb_build_object(
      'spot_end_is_not_completion', true,
      'mode_is_not_mood', true,
      'facts_vs_words', 'facts = what the base recorded; words = what the member wrote'),
    'totehm', jsonb_build_object(
      'habits', coalesce((select jsonb_agg(jsonb_build_object('text', s->>'t', 'is', to_jsonb(public._step_intentions(s)), 'freq', s->>'f'))
                            from public.totehms t, jsonb_array_elements(t.steps) s
                           where t.user_id = p_user and btrim(coalesce(s->>'t','')) <> ''), '[]'::jsonb),
      'objectives', coalesce((select jsonb_agg(jsonb_build_object('text', o.text, 'is', to_jsonb(o."is"), 'target_at', o.target_at, 'status', o.status))
                                from public.objectives o where o.user_id = p_user and btrim(o.text) <> ''), '[]'::jsonb),
      'repulsions', coalesce((select jsonb_agg(jsonb_build_object('text', r.repulsion, 'is', to_jsonb(r."is")))
                                from public.repulsions r where r.user_id = p_user and r.active and btrim(r.repulsion) <> ''), '[]'::jsonb),
      'visions', coalesce((select jsonb_agg(jsonb_build_object('text', v.text, 'is', to_jsonb(v."is")))
                             from public.visions v where v.user_id = p_user and btrim(v.text) <> ''), '[]'::jsonb),
      'wisdom', coalesce((select jsonb_agg(jsonb_build_object('text', w.text, 'is', to_jsonb(w."is")))
                            from public.wisdom w where w.user_id = p_user and btrim(w.text) <> ''), '[]'::jsonb)),
    'spots', coalesce((select jsonb_agg(jsonb_build_object(
        'facts', jsonb_build_object(
          'habit', p.habit, 'intentions', to_jsonb(p.intentions), 'visibility', p.visibility,
          'declared_mode', case when p.visibility = 'shared' then p.mode end,
          'location', case when p.visibility = 'shared' then p.shield end, 'city', p.city,
          'started_at', p.starts_at, 'planned_minutes', p.duration_min,
          'state', case when now() < p.starts_at + make_interval(mins => p.duration_min) then 'am' else 'was' end,
          'has_video', p.video is not null),
        'words', jsonb_build_object('comment', p.comment),
        'unknown', jsonb_build_array('completion', 'mood'))
        order by p.starts_at desc)
      from public.spot_plans p where p.user_id = p_user and p.status = 'published'), '[]'::jsonb));
$f$;


-- ════════════════════════════════════════════════════════════════════
-- LES DROITS — APRÈS LE DERNIER `create`
-- ════════════════════════════════════════════════════════════════════
-- Internes : service_role seul.
revoke all on function public._offer_open(uuid) from public, anon, authenticated;
revoke all on function public._spot_exact(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public._spot_view(public.spot_plans, uuid) from public, anon, authenticated;
revoke all on function public._spot_match(public.spot_plans, text, text) from public, anon, authenticated;
revoke all on function public._clip_ok(uuid, text) from public, anon, authenticated;
revoke all on function public._bot_memory(uuid) from public, anon, authenticated;
revoke all on function public.creator_offer(text, uuid) from public, anon, authenticated;
grant execute on function public._offer_open(uuid) to service_role;
grant execute on function public._spot_exact(uuid, uuid, text, text) to service_role;
grant execute on function public._spot_view(public.spot_plans, uuid) to service_role;
grant execute on function public._spot_match(public.spot_plans, text, text) to service_role;
grant execute on function public._clip_ok(uuid, text) to service_role;
grant execute on function public._bot_memory(uuid) to service_role;
grant execute on function public.creator_offer(text, uuid) to service_role;

-- Lues DANS une politique : le rôle qui lit doit pouvoir les exécuter.
revoke all on function public._shared_with_me(uuid) from public, anon;
grant execute on function public._shared_with_me(uuid) to authenticated, service_role;
revoke all on function public.is_subscribed_to(uuid) from public, anon;
grant execute on function public.is_subscribed_to(uuid) to authenticated, service_role;
revoke all on function public._clip_readable(text) from public;
grant execute on function public._clip_readable(text) to anon, authenticated, service_role;

-- Ouvertes sans session : découvrir est gratuit.
revoke all on function public.creator_page(text) from public;
grant execute on function public.creator_page(text) to anon, authenticated, service_role;
revoke all on function public.totehm_search(text, integer) from public;
grant execute on function public.totehm_search(text, integer) to anon, authenticated, service_role;
revoke all on function public.search_totehms(text, integer) from public;
grant execute on function public.search_totehms(text, integer) to anon, authenticated, service_role;
revoke all on function public._vis_shared() from public, anon, authenticated;
grant execute on function public._vis_shared() to service_role;
revoke all on function public.spot_rules() from public;
grant execute on function public.spot_rules() to anon, authenticated, service_role;
revoke all on function public.spots_feed(double precision, double precision, text, text, timestamptz, integer) from public;
grant execute on function public.spots_feed(double precision, double precision, text, text, timestamptz, integer) to anon, authenticated, service_role;
revoke all on function public.spot_get(uuid) from public;
grant execute on function public.spot_get(uuid) to anon, authenticated, service_role;
revoke all on function public.reveal_cloth(text) from public;
grant execute on function public.reveal_cloth(text) to anon, authenticated, service_role;

-- Un membre connecté.
revoke all on function public.totehm_of(text) from public, anon;
grant execute on function public.totehm_of(text) to authenticated, service_role;
revoke all on function public.monetization_set(boolean, integer, text[]) from public, anon;
grant execute on function public.monetization_set(boolean, integer, text[]) to authenticated, service_role;
revoke all on function public.visibility_set(text) from public, anon;
grant execute on function public.visibility_set(text) to authenticated, service_role;
revoke all on function public.my_console() from public, anon;
grant execute on function public.my_console() to authenticated, service_role;
revoke all on function public.totehmbot_access() from public, anon;
grant execute on function public.totehmbot_access() to authenticated, service_role;
revoke all on function public.spot_create(text, text, integer, text, double precision, double precision, text, text, text, text) from public, anon;
grant execute on function public.spot_create(text, text, integer, text, double precision, double precision, text, text, text, text) to authenticated, service_role;
revoke all on function public.spots_exact(text, text) from public, anon;
grant execute on function public.spots_exact(text, text) to authenticated, service_role;

-- L'ANCIEN ESPACE ET L'ANCIENNE CONSOLE — révoqués (le ménage les supprime).
revoke all on function public.spot_publish(text,text[],uuid[],bigint[],boolean,timestamptz,integer,text,double precision,double precision,text,integer,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.moment_publish(text, text[], text, text, double precision, double precision, text, text, text) from public, anon, authenticated;
revoke all on function public.spot_video_set(uuid, text) from public, anon, authenticated;
revoke all on function public.spots_radar(double precision,double precision,integer,text,text,boolean,integer,text,text) from public, anon, authenticated;
revoke all on function public.spots_past(double precision, double precision, integer, text, integer) from public, anon, authenticated;
revoke all on function public.spots_globe(text,text,text,text) from public, anon, authenticated;
revoke all on function public.moments_feed(double precision, double precision, integer, integer) from public, anon, authenticated;
revoke all on function public.my_space() from public, anon, authenticated;
revoke all on function public.spot_apply(uuid, text) from public, anon, authenticated;
revoke all on function public.spot_decide(bigint, boolean) from public, anon, authenticated;
revoke all on function public.spot_withdraw(uuid) from public, anon, authenticated;
revoke all on function public.spot_cancel(uuid) from public, anon, authenticated;
revoke all on function public.demo_seed() from public, anon, authenticated;
revoke all on function public.demo_purge() from public, anon, authenticated;
revoke all on function public.club_console() from public, anon, authenticated;
revoke all on function public.creator_card(text) from public, anon, authenticated;
