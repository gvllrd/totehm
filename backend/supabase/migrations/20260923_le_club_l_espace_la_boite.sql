-- TOTEHM · LE CLUB, L'ESPACE, LA BOÎTE · 23/09/2026
-- ════════════════════════════════════════════════════════════════════
-- ⚠️ ÉCRITE ET TESTÉE LE 23/09/2026 — ELLE N'ÉTAIT PAS EN BASE CE JOUR-LÀ.
-- Testée sur une réplique locale du schéma de production : elle passe
-- d'un bloc, elle se rejoue sans erreur (idempotente), et 109 assertions
-- SQL passent — dont la course à deux sur une place de Spot.
-- L'application se fait UNE fois, par l'éditeur SQL de Supabase ou par
-- Claude avec ta permission (CLAUDE_CODE.md du 23/09, étape 6). La date
-- d'application réelle s'écrit dans backend/SYSTEM.md §0, pas ici.
-- ⚠️ PAS de `db push` : l'historique des migrations du dépôt ne suit pas
-- celui de la base, `db push` rejouerait des fichiers déjà appliqués.
--
-- MASTER ARCHITECTURE (TOTEHM_MASTER.md) — quatre domaines, une source :
--
--   totehm.com       le TOTEHM, cinq vues, la source ............ existant
--   figher.club      appartenance · droits · abonnements · argent  CE LOT
--   totehm.space     une Habit Box devient une action à plusieurs  CE LOT
--   higher.boutique  une Box, n'importe laquelle, devient un Cloth CE LOT
--
-- Cinq blocs, dans cet ordre :
--   A · le passeport FIGHER — UNE fonction pour la règle d'accès
--   B · l'argent — le grand livre du membre, les virements groupés
--   C · la lecture d'un Totehm monétisé — l'abonnement est à sens unique
--   D · la Boîte — la matière d'une totehmisation, et « Reveal the Box »
--   E · l'Espace — le Spot d'une habitude, la candidature, la capacité
--
-- ⚠️ TOUTE FONCTION CRÉÉE ICI EST `security definer` ET PREND
-- L'IDENTITÉ DANS `auth.uid()`, JAMAIS EN PARAMÈTRE — sauf les fonctions
-- à tiret bas (`_figher`, `_box_matter`, `_spot_compat`…) qui sont
-- INTERNES : exécutables par `service_role` seul, jamais par une page.
-- ⚠️ ET LES REVOKE SONT TOUS EN FIN DE FICHIER, APRÈS LE DERNIER CREATE :
-- `create or replace function` rétablit le GRANT à PUBLIC.
-- ════════════════════════════════════════════════════════════════════

-- La similarité de trigrammes sert à la compatibilité d'un Spot : c'est du
-- calcul, pas un appel payant. Zéro euro à un million de candidatures.
create extension if not exists pg_trgm with schema extensions;

-- ── Les sept intentions, leur couleur et leur pilier — la même table que
--    le front, recopiée ici parce que la PALETTE d'une totehmisation se
--    calcule côté serveur (le client ne choisit pas les couleurs).
create or replace function public._int_color(p text)
returns text language sql immutable set search_path to 'public' as $f$
  select case p
    when 'fight' then '#E24B4A' when 'flow' then '#e48b31'
    when 'enrich' then '#fcbe21' when 'love' then '#639922'
    when 'express' then '#1D9E75' when 'focus' then '#378ADD'
    when 'celebrate' then '#7F77DD' else null end
$f$;

create or replace function public._pillar(p text)
returns text language sql immutable set search_path to 'public' as $f$
  select case when p in ('fight','flow') then 'BODY'
              when p in ('enrich','focus') then 'MENTAL'
              when p in ('express','celebrate') then 'SOUL'
              when p = 'love' then 'SPIRIT' else null end
$f$;

-- ── Les intentions d'une habitude, lues dans son `step`. `is` est la
--    liste ; `i` la première ; à défaut, on déduit du texte. Une seule
--    lecture, écrite une fois : trois copies divergeraient.
create or replace function public._step_intentions(s jsonb)
returns text[] language sql stable set search_path to 'public' as $f$
  select case
    when jsonb_typeof(s->'is') = 'array' and jsonb_array_length(s->'is') > 0
      then array(select x from jsonb_array_elements_text(s->'is') x
                  where x in ('fight','flow','enrich','love','express','focus','celebrate'))
    else array_remove(array[coalesce(nullif(s->>'i',''), public.intention_of(s->>'t'))], null)
  end
$f$;


-- ════════════════════════════════════════════════════════════════════
-- A · LE PASSEPORT FIGHER
-- ════════════════════════════════════════════════════════════════════
-- MASTER §11 : TOTEHM COMPLET + THP POSSÉDÉ + ANNUEL ACTIF.
-- Trois clés, UNE fonction. Le Club, l'Espace, la Boutique et le bot
-- lisent tous `_figher` : le jour où la règle change, elle change ici.
--
-- ⚠️ LE THP SE RECONNAÎT PAR L'EMAIL. `stoner_access` est écrite par le
-- webhook au paiement du TotehmPaper, AVANT que l'acheteur ait un compte :
-- l'email est la seule clé commune. On compare en minuscules des deux
-- côtés — le webhook écrit en minuscules, un import manuel pourrait ne
-- pas l'avoir fait.
create or replace function public._figher(p_user uuid)
returns jsonb
language plpgsql stable security definer
set search_path to 'public'
as $f$
declare
  v_pass jsonb; v_email text; v_num int; v_st text; v_complete boolean;
begin
  if p_user is null then
    return jsonb_build_object('signed_in', false, 'complete', false, 'remplies', 0,
      'thp', false, 'number', null, 'annual', false, 'trial', false, 'member', false);
  end if;

  v_pass := public.totehm_complete(p_user);
  v_complete := coalesce((v_pass->>'complete')::boolean, false);

  select lower(u.email) into v_email from auth.users u where u.id = p_user;
  if v_email is not null then
    select t.rang into v_num from (
      select lower(s.email) as e, row_number() over (order by s.granted_at)::int as rang
        from public.stoner_access s) t
     where t.e = v_email;
  end if;

  select s.status into v_st from public.subscriptions s where s.user_id = p_user;

  return jsonb_build_object(
    'signed_in', true,
    'complete',  v_complete,
    'remplies',  coalesce((v_pass->>'remplies')::int, 0),
    'views', jsonb_build_object(
      'habits',     coalesce((v_pass->>'habits')::boolean, false),
      'objectives', coalesce((v_pass->>'objectives')::boolean, false),
      'repulsions', coalesce((v_pass->>'repulsions')::boolean, false),
      'wisdom',     coalesce((v_pass->>'wisdom')::boolean, false),
      'visions',    coalesce((v_pass->>'visions')::boolean, false)),
    'thp',    v_num is not null,
    'number', v_num,
    'annual', coalesce(v_st in ('active','trialing'), false),
    'trial',  coalesce(v_st = 'trialing', false),
    -- La porte. Un seul booléen : une page qui recomposerait la règle à
    -- partir des trois morceaux finirait par en oublier un.
    'member', v_complete and v_num is not null and coalesce(v_st in ('active','trialing'), false));
end $f$;

create or replace function public._is_figher(p_user uuid)
returns boolean language sql stable security definer
set search_path to 'public'
as $f$ select coalesce((public._figher(p_user)->>'member')::boolean, false) $f$;

-- Ce que la page lit : SON passeport, jamais celui d'un autre.
create or replace function public.figher_access()
returns jsonb language plpgsql stable security definer
set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_f jsonb;
begin
  v_f := public._figher(v_uid);
  if v_uid is null then return v_f; end if;
  return v_f || jsonb_build_object(
    'pseudo', (select pseudo from public.profiles where id = v_uid),
    'monetized', coalesce((select monetized from public.creator_profiles where user_id = v_uid), false),
    'spots_benefit', coalesce((select 'spots' = any(benefits) and monetized
                                 from public.creator_profiles where user_id = v_uid), false));
end $f$;

-- ── TotehmBot : MASTER §61, le minimum est un FIGHER actif. La fonction
--    garde sa forme (le front la lit déjà) ; seule la règle change, et
--    elle est maintenant la même que partout.
create or replace function public.totehmbot_access()
returns jsonb
language plpgsql stable security definer
set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_f jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('signed_in', false, 'club', false, 'thp', false,
                              'complete', false, 'remplies', 0, 'ouvert', false);
  end if;
  v_f := public._figher(v_uid);
  return jsonb_build_object(
    'signed_in', true,
    'club',      (v_f->>'annual')::boolean,
    'thp',       (v_f->>'thp')::boolean,
    'complete',  (v_f->>'complete')::boolean,
    'remplies',  (v_f->>'remplies')::int,
    'ouvert',    (v_f->>'member')::boolean);
end $f$;


-- ════════════════════════════════════════════════════════════════════
-- B · L'ARGENT — LE GRAND LIVRE ET LES VIREMENTS GROUPÉS
-- ════════════════════════════════════════════════════════════════════
-- MASTER §18-23 : 80 % au membre, 20 % à TOTEHM ; jamais un virement par
-- abonnement ; un SOLDE qui s'accumule ; un virement groupé au-dessus
-- d'un seuil. Zéro Stripe Connect : l'argent arrive entier sur le compte
-- de la plateforme (décision du 19/09), le grand livre dit ce qu'on doit.
--
-- ⚠️ LE GRAND LIVRE EST LA SOURCE DE VÉRITÉ DES MONTANTS DUS. On ne
-- calcule JAMAIS un solde à partir des abonnements en cours : un
-- abonnement annulé a quand même payé ses trois premiers mois.

-- Monétiser : un interrupteur et des droits. Les colonnes Connect
-- restent, vides (décision du 19/09).
alter table public.creator_profiles
  add column if not exists monetized boolean not null default false,
  add column if not exists benefits  text[]  not null default array['totehm']::text[];

-- Une annulation demandée n'est pas une annulation : l'abonné garde ce
-- qu'il a payé jusqu'à la fin de la période. Le webhook pose ce drapeau,
-- la console le lit (« ends on … »).
alter table public.creator_subscriptions
  add column if not exists ending boolean not null default false;

alter table public.creator_profiles drop constraint if exists creator_benefits_chk;
alter table public.creator_profiles add constraint creator_benefits_chk
  check (benefits <@ array['totehm','spots','higherself','totehmbot']::text[]);

create table if not exists public.member_ledger (
  id                  bigint generated always as identity primary key,
  -- ⚠️ `on delete restrict` : on ne supprime pas en silence un membre à
  -- qui l'on doit de l'argent. La suppression d'un compte créditeur
  -- demande d'abord un virement ou un ajustement écrit.
  user_id             uuid   not null references auth.users(id) on delete restrict,
  kind                text   not null check (kind in ('earning','payout','adjustment')),
  amount_cents        bigint not null,        -- signé : + gagné, − versé
  gross_cents         bigint,                 -- le brut payé par l'abonné
  platform_cents      bigint,                 -- la part TOTEHM
  currency            text   not null default 'eur',
  source              text   not null,        -- 'stripe:in_…' | 'payout:<id>' | 'manual:…'
  stripe_subscription text,
  fan_id              uuid,                   -- audit, jamais exposé
  note                text,
  created_at          timestamptz not null default now(),
  -- ⚠️ L'IDEMPOTENCE EST UNE CONTRAINTE, PAS UN `if` : Stripe rejoue un
  -- webhook, deux instances peuvent le recevoir en même temps. Une facture
  -- ne peut créditer qu'une fois, et c'est la base qui le garantit.
  unique (source, kind)
);
create index if not exists member_ledger_user_idx on public.member_ledger (user_id, created_at desc);

-- Un grand livre ne se corrige pas : il s'ajoute. Une erreur se répare par
-- une ligne `adjustment`, jamais par un UPDATE qui effacerait l'histoire.
create or replace function public._ledger_append_only()
returns trigger language plpgsql as $f$
begin raise exception 'member_ledger is append-only — write an adjustment instead'; end $f$;
drop trigger if exists member_ledger_append_only on public.member_ledger;
create trigger member_ledger_append_only before update or delete on public.member_ledger
  for each row execute function public._ledger_append_only();

alter table public.member_ledger enable row level security;
drop policy if exists "ledger own read" on public.member_ledger;
create policy "ledger own read" on public.member_ledger
  for select to authenticated using (user_id = auth.uid());

create table if not exists public.member_payouts (
  id           bigint generated always as identity primary key,
  user_id      uuid   not null references auth.users(id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  currency     text   not null default 'eur',
  method       text   check (method in ('iban','paypal')),
  handle_fin   text,                          -- 4 derniers caractères
  period       text   not null,               -- '2026-10'
  status       text   not null default 'paid'
               check (status in ('scheduled','paid','failed','cancelled')),
  reference    text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz,
  unique (user_id, currency, period)
);
alter table public.member_payouts enable row level security;
drop policy if exists "payouts own read" on public.member_payouts;
create policy "payouts own read" on public.member_payouts
  for select to authenticated using (user_id = auth.uid());

-- Les règles du versement. Une FONCTION et non des chiffres dans le
-- front : le seuil et le jour peuvent bouger sans toucher une page
-- (MASTER §20 : « le seuil exact peut évoluer sans changer l'architecture »).
create or replace function public.payout_rules()
returns jsonb language sql immutable set search_path to 'public' as $f$
  select jsonb_build_object('threshold_cents', 2500, 'day', 1, 'currency', 'eur',
                            'member_part', 80, 'platform_part', 20)
$f$;

-- ── Le webhook crédite UNE facture payée. `service_role` seul.
--    Le créateur et le fan viennent de la METADATA DE L'ABONNEMENT, pas
--    de `creator_subscriptions` : `invoice.paid` arrive souvent AVANT
--    `checkout.session.completed`, la ligne d'abonnement n'existe pas
--    encore au moment où l'argent, lui, est déjà là.
create or replace function public.ledger_creator_invoice(
  p_invoice text, p_subscription text, p_creator uuid, p_fan uuid,
  p_gross bigint, p_currency text)
returns jsonb
language plpgsql volatile security definer
set search_path to 'public'
as $f$
declare v_member bigint; v_id bigint; v_part int := (public.payout_rules()->>'member_part')::int;
begin
  if p_invoice is null or p_creator is null then
    return jsonb_build_object('ok', false, 'why', 'missing');
  end if;
  if coalesce(p_gross, 0) <= 0 then
    -- Une facture à zéro (essai, coupon 100 %) ne doit rien à personne.
    return jsonb_build_object('ok', true, 'new', false, 'why', 'zero');
  end if;
  -- Arrondi AU PROFIT DU MEMBRE ? Non : à l'entier inférieur, et le
  -- centime restant va à la plateforme. Le brut est toujours égal à la
  -- somme des deux parts, au centime — c'est ce qui se vérifie.
  v_member := (p_gross * v_part) / 100;
  insert into public.member_ledger(user_id, kind, amount_cents, gross_cents, platform_cents,
                                   currency, source, stripe_subscription, fan_id, note)
  values (p_creator, 'earning', v_member, p_gross, p_gross - v_member,
          lower(coalesce(p_currency, 'eur')), 'stripe:' || p_invoice, p_subscription, p_fan,
          'totehm subscription')
  on conflict (source, kind) do nothing
  returning id into v_id;

  update public.creator_subscriptions set amount_cents = p_gross
   where stripe_subscription_id = p_subscription;

  return jsonb_build_object('ok', true, 'new', v_id is not null, 'member_cents', v_member);
end $f$;

-- ── Le solde d'un membre, par devise. Stripe rend une ligne PAR DEVISE :
--    additionner des euros et des livres serait un chiffre faux.
create or replace function public._balances(p_user uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $f$
  select coalesce(jsonb_agg(jsonb_build_object(
           'currency', currency,
           'earned_cents',  earned,
           'paid_cents',    paid,
           'pending_cents', earned - paid + adj)
         order by currency), '[]'::jsonb)
  from (
    select currency,
           coalesce(sum(amount_cents) filter (where kind = 'earning'), 0)     as earned,
           coalesce(-sum(amount_cents) filter (where kind = 'payout'), 0)     as paid,
           coalesce(sum(amount_cents) filter (where kind = 'adjustment'), 0)  as adj
      from public.member_ledger where user_id = p_user group by currency) b
$f$;

-- ── Le 1er du mois : qui doit être viré. `service_role` seul — c'est la
--    seule lecture qui rend l'identifiant bancaire EN ENTIER, parce que
--    c'est la seule qui en a besoin.
create or replace function public.payouts_due(p_period text default to_char(now(), 'YYYY-MM'))
returns table(user_id uuid, pseudo text, currency text, balance_cents bigint,
              method text, handle text)
language sql stable security definer set search_path to 'public'
as $f$
  select l.user_id, p.pseudo, l.currency, sum(l.amount_cents)::bigint,
         cp.payout_method, cp.payout_handle
    from public.member_ledger l
    left join public.profiles p on p.id = l.user_id
    left join public.creator_profiles cp on cp.user_id = l.user_id
   where not exists (select 1 from public.member_payouts mp
                      where mp.user_id = l.user_id and mp.currency = l.currency
                        and mp.period = p_period and mp.status = 'paid')
   group by l.user_id, p.pseudo, l.currency, cp.payout_method, cp.payout_handle
  having sum(l.amount_cents) >= (public.payout_rules()->>'threshold_cents')::bigint
   order by 4 desc
$f$;

-- ── Wah a viré : on l'écrit. Le versement ET sa ligne de débit, dans la
--    même transaction — un virement sans débit ferait payer deux fois.
create or replace function public.payout_mark_paid(
  p_user uuid, p_currency text, p_amount_cents bigint, p_period text, p_reference text)
returns bigint
language plpgsql volatile security definer set search_path to 'public'
as $f$
declare v_bal bigint; v_id bigint; v_meth text; v_handle text;
begin
  select coalesce(sum(amount_cents), 0) into v_bal from public.member_ledger
   where user_id = p_user and currency = lower(p_currency);
  if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents > v_bal then
    raise exception 'amount % exceeds balance %', p_amount_cents, v_bal;
  end if;
  select payout_method, payout_handle into v_meth, v_handle
    from public.creator_profiles where user_id = p_user;
  insert into public.member_payouts(user_id, amount_cents, currency, method, handle_fin,
                                    period, status, reference, paid_at)
  values (p_user, p_amount_cents, lower(p_currency), v_meth, right(v_handle, 4),
          p_period, 'paid', p_reference, now())
  returning id into v_id;
  insert into public.member_ledger(user_id, kind, amount_cents, currency, source, note)
  values (p_user, 'payout', -p_amount_cents, lower(p_currency), 'payout:' || v_id, p_reference);
  return v_id;
end $f$;


-- ════════════════════════════════════════════════════════════════════
-- C · UN TOTEHM MONÉTISÉ SE LIT PAR ABONNEMENT — À SENS UNIQUE
-- ════════════════════════════════════════════════════════════════════
-- MASTER §12-13 : Bob → Alice ne donne rien à Alice sur Bob.
-- Jusqu'ici `totehm_visibility = 'members'` ouvrait le Totehm à TOUT
-- membre connecté — le bouton s'appelait pourtant « Visible to my paying
-- followers ». Tant que personne ne monétise, rien ne change. Dès qu'un
-- membre monétise, son Totehm ne se lit plus que par ses abonnés.
--
--   privé                      → moi seul
--   partagé, non monétisé      → les membres (PLANT : apprendre des autres)
--   partagé ET monétisé        → mes abonnés — ce qu'ils paient
--
-- ⚠️ `security definer` OBLIGATOIRE : cette fonction est appelée DANS des
-- politiques RLS de `totehms` et relit `totehms`. Sans elle, la politique
-- se rappelle elle-même et part en récursion.
create or replace function public.is_subscribed_to(p_creator uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $f$
  select exists (
    select 1 from public.creator_subscriptions cs
     where cs.creator_id = p_creator and cs.fan_id = auth.uid()
       and cs.status in ('active','trialing'))
  -- Le droit « lire mon Totehm » est un bénéfice COCHÉ par le créateur.
  and exists (select 1 from public.creator_profiles cp
               where cp.user_id = p_creator and 'totehm' = any(cp.benefits));
$f$;

create or replace function public._shared_with_me(p_owner uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $f$
  select p_owner = auth.uid()
      or exists (
        select 1 from public.totehms t
         where t.user_id = p_owner and t.totehm_visibility = 'members'
           and (not coalesce((select cp.monetized from public.creator_profiles cp
                               where cp.user_id = p_owner), false)
                or public.is_subscribed_to(p_owner)));
$f$;

drop policy if exists "totehms members read" on public.totehms;
create policy "totehms members read" on public.totehms
  for select to authenticated using (public._shared_with_me(user_id));

drop policy if exists "objectives members read" on public.objectives;
create policy "objectives members read" on public.objectives
  for select to authenticated using (public._shared_with_me(user_id));

drop policy if exists "wisdom members read" on public.wisdom;
create policy "wisdom members read" on public.wisdom
  for select to authenticated using (public._shared_with_me(user_id));

-- ⚠️ CETTE POLITIQUE VISAIT `public` — DONC `anon`. Les visions d'un
-- Totehm partagé se lisaient SANS SESSION. Corrigé au passage : elle vise
-- `authenticated`, comme ses trois sœurs.
drop policy if exists "visions members read" on public.visions;
create policy "visions members read" on public.visions
  for select to authenticated using (public._shared_with_me(user_id));

-- `totehm_of` porte la même règle : elle court-circuite la RLS
-- (`security definer`), c'est donc elle qui doit la dire.
create or replace function public.totehm_of(p_pseudo text)
returns jsonb
language plpgsql stable security definer
set search_path to 'public'
as $f$
declare
  v_me    uuid := auth.uid();
  v_uid   uuid;
  v_steps jsonb;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;

  select p.id into v_uid from public.profiles p
   where lower(p.pseudo) = lower(btrim(p_pseudo)) limit 1;
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;

  if not public._shared_with_me(v_uid) then
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
end $f$;

-- ── Monétiser : l'interrupteur, le prix, les droits. MASTER §16-17.
--    ⚠️ SEULS LES DROITS QUI EXISTENT SE VENDENT. `higherself` et
--    `totehmbot` (parler au Higher Self d'un autre) sont prévus par le
--    MASTER mais pas construits : les proposer, ce serait encaisser pour
--    rien. La contrainte les accepte déjà ; cette fonction les refuse
--    tant qu'ils ne sont pas livrés.
create or replace function public.monetization_set(
  p_enabled boolean, p_price_cents int default null, p_benefits text[] default null)
returns jsonb
language plpgsql volatile security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_ben text[]; v_prix int; v_meth text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if p_enabled and not public._is_figher(v_uid) then
    return jsonb_build_object('ok', false, 'why', 'figher');
  end if;
  if p_price_cents is not null and (p_price_cents < 300 or p_price_cents > 50000) then
    return jsonb_build_object('ok', false, 'why', 'price', 'min', 300, 'max', 50000);
  end if;
  if p_benefits is not null then
    v_ben := array(select distinct b from unnest(p_benefits) b where b in ('totehm','spots') order by 1);
    if cardinality(v_ben) = 0 then return jsonb_build_object('ok', false, 'why', 'benefits'); end if;
  end if;

  insert into public.creator_profiles as cp (user_id, custom_sub_price, benefits)
  values (v_uid, p_price_cents, coalesce(v_ben, array['totehm']::text[]))
  on conflict (user_id) do update
    set custom_sub_price = coalesce(p_price_cents, cp.custom_sub_price),
        benefits         = coalesce(v_ben, cp.benefits);

  select custom_sub_price, payout_method into v_prix, v_meth
    from public.creator_profiles where user_id = v_uid;

  if p_enabled then
    if v_prix is null then return jsonb_build_object('ok', false, 'why', 'price_first'); end if;
    if v_meth is null then return jsonb_build_object('ok', false, 'why', 'payout_first'); end if;
  end if;
  -- ⚠️ ÉTEINDRE N'ANNULE PERSONNE. Les abonnés en cours gardent ce qu'ils
  -- ont payé jusqu'à la fin de leur période ; seules les NOUVELLES
  -- souscriptions se ferment. Couper un accès payé serait un vol.
  update public.creator_profiles set monetized = p_enabled where user_id = v_uid;

  -- ⚠️ LA VISIBILITÉ SUIT L'INTERRUPTEUR (règle du 18/09 : « la visibilité
  -- est le commutateur de monétisation »).
  --   ON + droit « totehm »  → partagé : et comme il est monétisé, seuls
  --                            les abonnés le lisent (`_shared_with_me`).
  --   OFF                    → PRIVÉ. Jamais l'inverse : éteindre la
  --                            monétisation ne doit pas ouvrir, gratuitement
  --                            et en silence, un Totehm à tous les membres.
  if p_enabled and exists (select 1 from public.creator_profiles
                            where user_id = v_uid and 'totehm' = any(benefits)) then
    update public.totehms set totehm_visibility = 'members' where user_id = v_uid;
  elsif not p_enabled then
    update public.totehms set totehm_visibility = 'private' where user_id = v_uid;
  end if;
  return jsonb_build_object('ok', true, 'monetized', p_enabled);
end $f$;

-- ── L'offre d'un membre, telle qu'un autre membre la voit — par PSEUDO,
--    jamais par identifiant (règle de `search_totehms`).
create or replace function public.creator_card(p_pseudo text)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_me uuid := auth.uid(); v_uid uuid; v_cp public.creator_profiles%rowtype;
        v_sub text; v_until timestamptz;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select id into v_uid from public.profiles where lower(pseudo) = lower(btrim(p_pseudo)) limit 1;
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;
  select * into v_cp from public.creator_profiles where user_id = v_uid;
  select status, current_period_end into v_sub, v_until from public.creator_subscriptions
   where creator_id = v_uid and fan_id = v_me;
  return jsonb_build_object(
    'ok', true,
    'pseudo', (select pseudo from public.profiles where id = v_uid),
    'me', v_uid = v_me,
    'open', coalesce(v_cp.monetized, false) and v_cp.custom_sub_price is not null
            and v_cp.payout_method is not null and public._is_figher(v_uid),
    'price_cents', v_cp.custom_sub_price,
    'currency', coalesce(v_cp.currency, 'eur'),
    'period', 'month',
    'benefits', to_jsonb(coalesce(v_cp.benefits, array[]::text[])),
    'subscribed', coalesce(v_sub in ('active','trialing'), false),
    'status', v_sub, 'until', v_until);
end $f$;

-- ── Ce que `creator-subscribe` demande avant d'ouvrir un Checkout.
--    MASTER §67 : l'abonné est FIGHER, le créateur est FIGHER ET monétisé.
create or replace function public.creator_offer(p_pseudo text, p_fan uuid)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_uid uuid; v_cp public.creator_profiles%rowtype;
begin
  select id into v_uid from public.profiles where lower(pseudo) = lower(btrim(p_pseudo)) limit 1;
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;
  if v_uid = p_fan then return jsonb_build_object('ok', false, 'why', 'self'); end if;
  if not public._is_figher(p_fan) then return jsonb_build_object('ok', false, 'why', 'figher'); end if;
  select * into v_cp from public.creator_profiles where user_id = v_uid;
  if not coalesce(v_cp.monetized, false) or v_cp.custom_sub_price is null
     or v_cp.payout_method is null or not public._is_figher(v_uid) then
    return jsonb_build_object('ok', false, 'why', 'closed');
  end if;
  if exists (select 1 from public.creator_subscriptions where creator_id = v_uid
              and fan_id = p_fan and status in ('active','trialing')) then
    return jsonb_build_object('ok', false, 'why', 'already');
  end if;
  return jsonb_build_object('ok', true, 'creator_id', v_uid,
    'price_cents', v_cp.custom_sub_price, 'currency', coalesce(v_cp.currency, 'eur'));
end $f$;


-- ════════════════════════════════════════════════════════════════════
-- D · LA BOÎTE — LA MATIÈRE D'UNE TOTEHMISATION, ET « REVEAL THE BOX »
-- ════════════════════════════════════════════════════════════════════
-- MASTER §49-55 : une Box, de N'IMPORTE LAQUELLE des cinq vues, devient
-- un TOTEHM Cloth. Plus de message libre : la matière est la Box et ce
-- qui lui est relié. Le Cloth porte `0.lenom` ; chercher `0.lenom` révèle
-- la Box — pas le visuel — selon les droits de celui qui cherche.
--
-- ⚠️ `message` RESTE REMPLI (texte de la Box d'ancrage) : c'est ce que
-- lit la chaîne de génération n8n. On ne casse pas l'usine pour changer
-- la matière première.
alter table public.totehm_clothes
  add column if not exists box_kind     text,
  add column if not exists box_ref      text,
  add column if not exists box_snapshot jsonb,
  add column if not exists palette      text[];
alter table public.totehm_clothes drop constraint if exists totehm_clothes_box_kind_chk;
alter table public.totehm_clothes add constraint totehm_clothes_box_kind_chk
  check (box_kind is null or box_kind in ('habit','objective','repulsion','wisdom','vision'));

-- La matière d'UNE Box d'UN membre : la Box, ses intentions, ce qui lui
-- est relié dans les cinq vues, et la palette. Écrite une fois, lue par
-- la page (aperçu) ET par le Checkout (instantané) : ce que le membre voit
-- est exactement ce qui part à l'atelier.
create or replace function public._box_matter(p_user uuid, p_kind text, p_ref text)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare
  v_steps jsonb; v_s jsonb; v_txt text; v_is text[]; v_view text;
  v_m jsonb := '{}'::jsonb; v_extra jsonb := '{}'::jsonb;
  v_uuid uuid; v_big bigint; v_all text[]; v_pal text[];
begin
  if p_user is null or btrim(coalesce(p_ref,'')) = '' then return null; end if;
  select coalesce(t.steps,'[]'::jsonb) into v_steps from public.totehms t where t.user_id = p_user limit 1;
  v_steps := coalesce(v_steps, '[]'::jsonb);

  if p_kind = 'habit' then
    select s into v_s from jsonb_array_elements(v_steps) s where s->>'t' = p_ref limit 1;
    if v_s is null or btrim(coalesce(v_s->>'t','')) = '' then return null; end if;
    v_txt := v_s->>'t'; v_is := public._step_intentions(v_s); v_view := 'habits';
    v_m := jsonb_build_object(
      'objectives', coalesce((select jsonb_agg(jsonb_build_object('text', o.text, 'is', to_jsonb(o."is")) order by o.created_at)
         from public.objectives o
        where o.user_id = p_user and btrim(o.text) <> ''
          and coalesce(o.status,'active') not in ('achieved','abandoned','converted')
          and (o.id::text = v_s->>'o' or exists (select 1 from public.objective_habits oh
                where oh.user_id = p_user and oh.objective_id = o.id and oh.habit_text = v_txt))), '[]'::jsonb),
      'repulsions', coalesce((select jsonb_agg(jsonb_build_object('text', r.repulsion, 'is', to_jsonb(r."is")) order by r.created_at)
         from public.repulsions r
        where r.user_id = p_user and r.active and btrim(r.repulsion) <> ''
          and (r.habit_text = v_txt or exists (select 1 from public.repulsion_habits rh
                where rh.user_id = p_user and rh.repulsion_id = r.id and rh.habit_text = v_txt))), '[]'::jsonb));
    v_extra := jsonb_build_object(
      'freq',  v_s->>'f',
      'place', (select hs.place from public.habit_spots hs where hs.user_id = p_user and hs.habit_text = v_txt),
      'mood',  (select m.title from public.intention_music m
                 where m.user_id = p_user and m.active and m.intention = any(v_is)
                 order by array_position(v_is, m.intention) limit 1));

  elsif p_kind = 'objective' then
    begin v_uuid := p_ref::uuid; exception when others then return null; end;
    select o.text, o."is" into v_txt, v_is from public.objectives o
     where o.id = v_uuid and o.user_id = p_user and btrim(o.text) <> '';
    if v_txt is null then return null; end if;
    v_view := 'objectives';
    v_m := jsonb_build_object(
      'habits', coalesce((select jsonb_agg(jsonb_build_object('text', s->>'t', 'is', to_jsonb(public._step_intentions(s))))
         from jsonb_array_elements(v_steps) s
        where btrim(coalesce(s->>'t','')) <> ''
          and (s->>'o' = p_ref or exists (select 1 from public.objective_habits oh
                where oh.user_id = p_user and oh.objective_id = v_uuid and oh.habit_text = s->>'t'))), '[]'::jsonb),
      'visions', coalesce((select jsonb_agg(jsonb_build_object('text', v.text, 'is', to_jsonb(v."is")))
         from public.visions v join public.objective_visions ov on ov.vision_id = v.id
        where ov.user_id = p_user and ov.objective_id = v_uuid and btrim(v.text) <> ''), '[]'::jsonb),
      'wisdom', coalesce((select jsonb_agg(jsonb_build_object('text', w.text, 'is', to_jsonb(w."is")))
         from public.wisdom w join public.teaching_objectives t on t.wisdom_id = w.id
        where t.user_id = p_user and t.objective_id = v_uuid and btrim(w.text) <> ''), '[]'::jsonb));
    v_extra := jsonb_build_object('deadline', (select o.target_at from public.objectives o where o.id = v_uuid));

  elsif p_kind = 'repulsion' then
    begin v_big := p_ref::bigint; exception when others then return null; end;
    select r.repulsion, r."is" into v_txt, v_is from public.repulsions r
     where r.id = v_big and r.user_id = p_user and r.active and btrim(r.repulsion) <> '';
    if v_txt is null then return null; end if;
    v_view := 'repulsions';
    v_m := jsonb_build_object(
      'habits', coalesce((select jsonb_agg(jsonb_build_object('text', s->>'t', 'is', to_jsonb(public._step_intentions(s))))
         from jsonb_array_elements(v_steps) s
        where btrim(coalesce(s->>'t','')) <> ''
          and (s->>'t' = (select r.habit_text from public.repulsions r where r.id = v_big)
               or exists (select 1 from public.repulsion_habits rh
                           where rh.user_id = p_user and rh.repulsion_id = v_big and rh.habit_text = s->>'t'))), '[]'::jsonb),
      'wisdom', coalesce((select jsonb_agg(jsonb_build_object('text', w.text, 'is', to_jsonb(w."is")))
         from public.wisdom w join public.repulsion_teachings rt on rt.wisdom_id = w.id
        where rt.user_id = p_user and rt.repulsion_id = v_big and btrim(w.text) <> ''), '[]'::jsonb));
    v_extra := jsonb_build_object('obstacle', (select nullif(r.obstacle,'') from public.repulsions r where r.id = v_big));

  elsif p_kind = 'wisdom' then
    begin v_uuid := p_ref::uuid; exception when others then return null; end;
    select w.text, w."is" into v_txt, v_is from public.wisdom w
     where w.id = v_uuid and w.user_id = p_user and btrim(w.text) <> '';
    if v_txt is null then return null; end if;
    v_view := 'wisdom';
    v_m := jsonb_build_object(
      'objectives', coalesce((select jsonb_agg(jsonb_build_object('text', o.text, 'is', to_jsonb(o."is")))
         from public.objectives o join public.teaching_objectives t on t.objective_id = o.id
        where t.user_id = p_user and t.wisdom_id = v_uuid and btrim(o.text) <> ''), '[]'::jsonb),
      'repulsions', coalesce((select jsonb_agg(jsonb_build_object('text', r.repulsion, 'is', to_jsonb(r."is")))
         from public.repulsions r join public.repulsion_teachings rt on rt.repulsion_id = r.id
        where rt.user_id = p_user and rt.wisdom_id = v_uuid and r.active and btrim(r.repulsion) <> ''), '[]'::jsonb));

  elsif p_kind = 'vision' then
    begin v_uuid := p_ref::uuid; exception when others then return null; end;
    select v.text, v."is" into v_txt, v_is from public.visions v
     where v.id = v_uuid and v.user_id = p_user and btrim(v.text) <> '';
    if v_txt is null then return null; end if;
    v_view := 'visions';
    v_m := jsonb_build_object(
      'objectives', coalesce((select jsonb_agg(jsonb_build_object('text', o.text, 'is', to_jsonb(o."is")))
         from public.objectives o join public.objective_visions ov on ov.objective_id = o.id
        where ov.user_id = p_user and ov.vision_id = v_uuid and btrim(o.text) <> ''), '[]'::jsonb));
  else
    return null;
  end if;

  -- LA PALETTE : les couleurs des intentions de la Box d'abord, puis
  -- celles de ce qui lui est relié, sans doublon, dans cet ordre
  -- (MASTER §53 : « les couleurs des Intentions associées à la Box
  -- peuvent servir de palette de travail »).
  v_all := coalesce(v_is, '{}') || coalesce((
    select array_agg(x order by g.ord, e.ord2)
      from jsonb_each(v_m) with ordinality g(k, arr, ord),
           jsonb_array_elements(g.arr) with ordinality e(item, ord2),
           jsonb_array_elements_text(e.item->'is') x), '{}');
  select array_agg(c order by pos) into v_pal from (
    select public._int_color(i) c, min(n) pos
      from unnest(v_all) with ordinality u(i, n)
     where public._int_color(i) is not null group by 1) q;

  return jsonb_build_object(
    'kind', p_kind, 'view', v_view, 'ref', p_ref, 'text', v_txt,
    'is', to_jsonb(coalesce(v_is, '{}'::text[])),
    'matter', v_m, 'extra', v_extra,
    'palette', to_jsonb(coalesce(v_pal, '{}'::text[])));
end $f$;

-- L'aperçu, pour la page : SA Box, jamais celle d'un autre.
create or replace function public.my_box_matter(p_kind text, p_ref text)
returns jsonb language sql stable security definer set search_path to 'public'
as $f$ select public._box_matter(auth.uid(), p_kind, p_ref) $f$;

-- ── REVEAL THE BOX — MASTER §55, une fonction de FIGHER.CLUB.
--    ⚠️ CE N'EST PAS UNE GALERIE. On ne rend jamais le visuel : on rend la
--    donnée derrière l'objet, et la profondeur dépend de qui cherche.
--      invité / non-membre   la vue d'origine, la date — et la porte
--      membre FIGHER         la Box, ses intentions, le pseudo si partagé
--      abonné ou porteur     + tout ce qui lui est relié
create or replace function public.reveal_cloth(p_name text)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_me uuid := auth.uid(); c public.totehm_clothes%rowtype; v_level text; v_snap jsonb; v_owner_pseudo text;
        v_shared boolean;
begin
  select tc.* into c from public.totehm_clothes tc
   where lower(btrim(tc.name)) = lower(btrim(p_name)) and tc.paid_at is not null
   order by tc.created_at desc limit 1;
  if c.id is null then return jsonb_build_object('found', false); end if;

  -- Les pièces d'AVANT la Box (un message libre) : elles étaient publiques
  -- par le Decode, elles le restent. On ne retire pas ce qui a été promis.
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
                  and t.totehm_visibility = 'members') into v_shared;
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
end $f$;

-- Le Decode public ne doit plus rendre la matière d'une pièce née d'une
-- Box : ce serait contourner « Reveal the Box » par la porte de derrière.
create or replace function public.decode_cloth(p_name text)
returns jsonb language sql stable security definer set search_path to 'public'
as $f$
  select coalesce(
    (select case when c.box_kind is not null then
       jsonb_build_object('name', c.name, 'box', true, 'view', c.box_snapshot->>'view',
                          'created_at', c.created_at::date, 'reveal', 'https://www.figher.club/console#reveal')
     else jsonb_build_object(
       'name', c.name,
       'message', c.message,
       'chapter', case
         when c.chapter_id is not null
          and exists (select 1 from public.book_chapters b
                       where b.id = c.chapter_id and b.visibility in ('link','public'))
         then public.read_chapter(c.chapter_id) else null end,
       'created_at', c.created_at::date) end
     from public.totehm_clothes c
    where lower(trim(c.name)) = lower(trim(p_name)) and c.paid_at is not null
    order by c.created_at desc limit 1),
    jsonb_build_object('error', 'not_found'));
$f$;


-- ════════════════════════════════════════════════════════════════════
-- E · L'ESPACE — HABIT → ACTION → WITH MEMBERS
-- ════════════════════════════════════════════════════════════════════
-- MASTER §24-48. Un Spot naît d'une Habit Box, garde un INSTANTANÉ de son
-- contexte, a une capacité, un mode, un accès, une sélection.
--
-- ⚠️ LE SPOT RESTE UNE LIGNE DE `spots` — la table que le radar lit déjà
-- (règle : ne pas dupliquer une structure existante). Ce qui est PROPRE à
-- l'Espace vit dans `spot_plans`, une table sans aucune politique RLS :
-- elle ne se lit et ne s'écrit QUE par les fonctions ci-dessous.
-- Raison mesurée : `spots` accepte l'insertion directe par tout membre
-- connecté (la mini-app HigherSelf s'en sert) et se lit par tout membre.
-- Le point de rendez-vous exact et l'instantané n'y seraient pas protégés.
--
-- ⚠️ LA POSITION PUBLIQUE EST ARRONDIE À ~110 m. Le rendez-vous exact
-- (`spot_plans.place`, `lat`, `lng`) ne se révèle qu'au créateur et aux
-- participants ACCEPTÉS. Le radar dit « c'est par là », pas « c'est ici ».
create table if not exists public.spot_plans (
  spot_id      uuid primary key references public.spots(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  habit        text not null,
  intentions   text[] not null default '{}',
  snapshot     jsonb not null,
  starts_at    timestamptz not null,
  duration_min int  not null check (duration_min between 5 and 720),
  capacity     int  not null check (capacity between 1 and 50),
  mode         text not null check (mode in ('social','silent')),
  access       text not null check (access in ('club','subscribers')),
  selection    text not null check (selection in ('manual','auto')),
  place        text not null check (char_length(place) between 1 and 120),
  lat          double precision not null,
  lng          double precision not null,
  comment      text check (comment is null or char_length(comment) <= 400),
  status       text not null default 'published' check (status in ('published','cancelled')),
  created_at   timestamptz not null default now()
);
create index if not exists spot_plans_when_idx on public.spot_plans (status, starts_at);
create index if not exists spot_plans_user_idx on public.spot_plans (user_id, starts_at desc);
alter table public.spot_plans enable row level security;
-- Aucune politique : lecture et écriture par fonction seulement.

create table if not exists public.spot_applications (
  id         bigint generated always as identity primary key,
  spot_id    uuid not null references public.spots(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'pending'
             check (status in ('pending','accepted','rejected','cancelled','expired')),
  compat     smallint check (compat between 0 and 100),
  note       text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  -- MASTER §39 : pas de double candidature. Une candidature retirée se
  -- RÉACTIVE (même ligne) ; une candidature refusée ne se rejoue pas.
  unique (spot_id, user_id)
);
create index if not exists spot_applications_spot_idx on public.spot_applications (spot_id, status);
alter table public.spot_applications enable row level security;
drop policy if exists "applications own read" on public.spot_applications;
create policy "applications own read" on public.spot_applications
  for select to authenticated using (user_id = auth.uid());

-- ── LA COMPATIBILITÉ — MASTER §37-38, §69-70.
--    Elle mesure le TOTEHM DE CELUI QUI REGARDE contre LE CONTEXTE DE CE
--    SPOT. Jamais une personne contre une personne. Jamais un LLM.
--    Quatre dimensions, et AUCUNE ne sort d'ici : la fonction est
--    interne, seul le total arrondi part dans une réponse. Rendre les
--    composantes, ce serait permettre de reconstruire le Totehm d'un
--    candidat à partir de sa candidature.
--      40 %  intentions — celles du Spot que le membre porte déjà
--      15 %  piliers    — BODY / MENTAL / SOUL / SPIRIT
--      30 %  l'habitude — le geste du Spot contre les siens (trigrammes)
--      15 %  le contexte — objectifs et répulsions du Spot contre les siens
create or replace function public._spot_compat(p_user uuid, p_spot uuid)
returns smallint
language plpgsql stable security definer set search_path to 'public', 'extensions'
as $f$
declare
  v_habit text; v_ints text[]; v_snap jsonb; v_steps jsonb; v_vi text[]; v_si text[];
  v_i numeric := 0; v_p numeric := 0; v_h numeric := 0; v_c numeric; v_ctx text[]; v_mine text[];
begin
  select sp.habit, sp.intentions, sp.snapshot into v_habit, v_ints, v_snap
    from public.spot_plans sp where sp.spot_id = p_spot;
  if v_habit is null or p_user is null then return null; end if;
  select coalesce(t.steps,'[]'::jsonb) into v_steps from public.totehms t where t.user_id = p_user limit 1;
  if v_steps is null or jsonb_array_length(v_steps) = 0 then return null; end if;

  select coalesce(array_agg(distinct x), '{}') into v_vi
    from jsonb_array_elements(v_steps) s, unnest(public._step_intentions(s)) x;
  v_si := coalesce(v_ints, '{}');

  if cardinality(v_si) > 0 then
    v_i := (select count(*) from unnest(v_si) x where x = any(v_vi))::numeric / cardinality(v_si);
    v_p := (select count(distinct public._pillar(x)) from unnest(v_si) x
             where public._pillar(x) in (select public._pillar(y) from unnest(v_vi) y))::numeric
           / greatest(1, (select count(distinct public._pillar(x)) from unnest(v_si) x));
  end if;

  select coalesce(max(similarity(lower(v_habit), lower(s->>'t'))), 0) into v_h
    from jsonb_array_elements(v_steps) s where btrim(coalesce(s->>'t','')) <> '';

  v_ctx := array(select e->>'text' from jsonb_array_elements(coalesce(v_snap->'objectives','[]')) e
                 union all
                 select e->>'text' from jsonb_array_elements(coalesce(v_snap->'repulsions','[]')) e);
  if cardinality(v_ctx) = 0 then
    v_c := v_h;
  else
    v_mine := array(select o.text from public.objectives o where o.user_id = p_user and btrim(o.text) <> ''
                    union all
                    select r.repulsion from public.repulsions r where r.user_id = p_user and r.active and btrim(r.repulsion) <> '');
    select coalesce(max(similarity(lower(a), lower(b))), 0) into v_c
      from unnest(v_ctx) a, unnest(coalesce(v_mine, '{}')) b;
  end if;

  -- Deux phrases courtes qui disent la même chose partagent rarement plus
  -- de la moitié de leurs trigrammes : ×1,6 ramène « très proche » vers 1.
  return greatest(0, least(100, round(100 * (
            0.40 * v_i + 0.15 * v_p
          + 0.30 * least(1, v_h * 1.6)
          + 0.15 * least(1, v_c * 1.6)))))::smallint;
end $f$;

-- ── Les candidatures en attente d'un Spot déjà commencé expirent. Écrit
--    une fois, appelé par les lectures : pas de tâche cron à oublier.
create or replace function public._spot_expire(p_user uuid)
returns void language sql volatile security definer set search_path to 'public' as $f$
  update public.spot_applications a set status = 'expired', decided_at = now()
    from public.spot_plans p
   where a.spot_id = p.spot_id and a.status = 'pending' and p.starts_at < now()
     and (a.user_id = p_user or p.user_id = p_user);
$f$;

-- ── PUBLIER. Tout ce que le client envoie est une SÉLECTION ; tout ce qui
--    est écrit vient de la base. Le texte de l'habitude, ses intentions,
--    ses objectifs, ses répulsions, son son : relus ici, dans le Totehm
--    du membre, au moment de publier. C'est ça, l'instantané (MASTER §42).
create or replace function public.spot_publish(
  p_habit text, p_intentions text[], p_objectives uuid[], p_repulsions bigint[],
  p_mood boolean, p_starts_at timestamptz, p_duration_min int,
  p_place text, p_lat double precision, p_lng double precision,
  p_mode text, p_capacity int, p_access text, p_selection text, p_comment text)
returns jsonb
language plpgsql volatile security definer set search_path to 'public'
as $f$
declare
  v_uid uuid := auth.uid(); v_steps jsonb; v_s jsonb; v_his text[]; v_is text[];
  v_objs jsonb; v_reps jsonb; v_mood jsonb; v_id uuid; v_cp public.creator_profiles%rowtype;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if not public._is_figher(v_uid) then return jsonb_build_object('ok', false, 'why', 'figher'); end if;

  select coalesce(t.steps,'[]'::jsonb) into v_steps from public.totehms t where t.user_id = v_uid limit 1;
  select s into v_s from jsonb_array_elements(coalesce(v_steps,'[]'::jsonb)) s
   where s->>'t' = p_habit and btrim(coalesce(s->>'t','')) <> '' limit 1;
  if v_s is null then return jsonb_build_object('ok', false, 'why', 'habit'); end if;

  -- Les intentions : un sous-ensemble de celles de l'habitude. Si
  -- l'habitude n'en porte aucune, on accepte les sept — mais rien d'autre.
  v_his := public._step_intentions(v_s);
  v_is := array(select distinct x from unnest(coalesce(p_intentions, '{}')) x
                 where x in ('fight','flow','enrich','love','express','focus','celebrate')
                   and (cardinality(v_his) = 0 or x = any(v_his)));
  if cardinality(v_is) = 0 then v_is := v_his; end if;

  -- Le contexte : SEULEMENT ce qui est relié à cette Habit Box.
  select coalesce(jsonb_agg(jsonb_build_object('text', o.text, 'is', to_jsonb(o."is"))), '[]'::jsonb) into v_objs
    from public.objectives o
   where o.user_id = v_uid and o.id = any(coalesce(p_objectives, '{}'))
     and btrim(o.text) <> ''
     and (o.id::text = v_s->>'o' or exists (select 1 from public.objective_habits oh
           where oh.user_id = v_uid and oh.objective_id = o.id and oh.habit_text = p_habit));
  select coalesce(jsonb_agg(jsonb_build_object('text', r.repulsion)), '[]'::jsonb) into v_reps
    from public.repulsions r
   where r.user_id = v_uid and r.id = any(coalesce(p_repulsions, '{}')) and r.active
     and btrim(r.repulsion) <> ''
     and (r.habit_text = p_habit or exists (select 1 from public.repulsion_habits rh
           where rh.user_id = v_uid and rh.repulsion_id = r.id and rh.habit_text = p_habit));
  -- MASTER §29 : la Music se présente comme MOOD dans l'Espace. Le son
  -- appartient à l'INTENTION (règle du 20/09), on prend celui de la
  -- première intention retenue qui en a un.
  if coalesce(p_mood, false) then
    select jsonb_build_object('title', m.title, 'url', m.url, 'intention', m.intention) into v_mood
      from public.intention_music m
     where m.user_id = v_uid and m.active and m.intention = any(v_is)
     order by array_position(v_is, m.intention) limit 1;
  end if;

  if p_starts_at is null or p_starts_at < now() - interval '10 minutes'
     or p_starts_at > now() + interval '90 days' then
    return jsonb_build_object('ok', false, 'why', 'when');
  end if;
  if coalesce(p_duration_min, 0) not between 5 and 720 then return jsonb_build_object('ok', false, 'why', 'duration'); end if;
  if coalesce(p_capacity, 0) not between 1 and 50 then return jsonb_build_object('ok', false, 'why', 'capacity'); end if;
  if p_mode not in ('social','silent') then return jsonb_build_object('ok', false, 'why', 'mode'); end if;
  if p_selection not in ('manual','auto') then return jsonb_build_object('ok', false, 'why', 'selection'); end if;
  if p_access not in ('club','subscribers') then return jsonb_build_object('ok', false, 'why', 'access'); end if;
  if p_access = 'subscribers' then
    select * into v_cp from public.creator_profiles where user_id = v_uid;
    if not (coalesce(v_cp.monetized, false) and 'spots' = any(coalesce(v_cp.benefits, '{}'))) then
      return jsonb_build_object('ok', false, 'why', 'subscribers');
    end if;
  end if;
  if btrim(coalesce(p_place,'')) = '' then return jsonb_build_object('ok', false, 'why', 'place'); end if;
  if p_lat is null or p_lng is null or abs(p_lat) > 90 or abs(p_lng) > 180 then
    return jsonb_build_object('ok', false, 'why', 'position');
  end if;
  -- Une porte d'entrée n'est pas une usine : dix Spots à venir, pas plus.
  if (select count(*) from public.spot_plans where user_id = v_uid and status = 'published'
        and starts_at + make_interval(mins => duration_min) > now()) >= 10 then
    return jsonb_build_object('ok', false, 'why', 'too_many');
  end if;

  insert into public.spots(user_id, intention, activite, commentaire, lat, lng,
                           duration_min, expires_at, is_public, required_role,
                           energy_mode, active)
  values (v_uid, coalesce(v_is[1], 'focus'), left(p_habit, 80), null,
          round(p_lat::numeric, 3)::double precision, round(p_lng::numeric, 3)::double precision,
          p_duration_min, p_starts_at + make_interval(mins => p_duration_min),
          false, 'figher', p_mode, true)
  returning id into v_id;

  insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at,
                                duration_min, capacity, mode, access, selection, place,
                                lat, lng, comment)
  values (v_id, v_uid, p_habit, v_is,
          jsonb_build_object('habit', p_habit, 'intentions', to_jsonb(v_is),
                             'objectives', v_objs, 'repulsions', v_reps, 'mood', v_mood,
                             'freq', v_s->>'f', 'at', now()),
          p_starts_at, p_duration_min, p_capacity, p_mode, p_access, p_selection,
          left(btrim(p_place), 120), p_lat, p_lng, nullif(left(btrim(coalesce(p_comment,'')), 400), ''));

  return jsonb_build_object('ok', true, 'id', v_id,
    'lat', round(p_lat::numeric, 3), 'lng', round(p_lng::numeric, 3));
end $f$;

-- ── LE RADAR — MASTER §43 : des Spots, pas un annuaire de lieux.
--    FILTER FIRST → SCORE LATER : la géographie et le temps coupent
--    d'abord (index GiST de `earth_box`), la compatibilité ne se calcule
--    que sur ce qui reste, cinquante au plus.
create or replace function public.spots_radar(
  p_lat double precision, p_lng double precision, p_radius int,
  p_q text default null, p_mode text default null, p_live boolean default false,
  p_limit int default 40)
returns jsonb
language plpgsql volatile security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_f jsonb; v_member boolean; v_res jsonb;
begin
  v_f := public._figher(v_uid);
  v_member := coalesce((v_f->>'member')::boolean, false);
  if v_uid is not null then perform public._spot_expire(v_uid); end if;

  with c as (
    select p.*, s.lat as rlat, s.lng as rlng,
           case when p_lat is null or p_lng is null then null
                else earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng))::int end as dist_m,
           p.starts_at + make_interval(mins => p.duration_min) as ends_at
      from public.spot_plans p join public.spots s on s.id = p.spot_id
     where p.status = 'published' and s.active
       and p.starts_at + make_interval(mins => p.duration_min) > now()
       and p.starts_at < now() + interval '45 days'
       and (p_lat is null or p_lng is null or
            (earth_box(ll_to_earth(p_lat, p_lng), greatest(200, least(coalesce(p_radius, 5000), 60000)))
               @> ll_to_earth(s.lat, s.lng)
             and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng))
               <= greatest(200, least(coalesce(p_radius, 5000), 60000))))
       and (p_mode is null or p.mode = p_mode)
       and (not coalesce(p_live, false) or now() between p.starts_at and p.starts_at + make_interval(mins => p.duration_min))
       and (btrim(coalesce(p_q,'')) = ''
            or p.habit ilike '%' || btrim(p_q) || '%'
            or array_to_string(p.intentions, ' ') ilike '%' || btrim(p_q) || '%'
            or coalesce(p.snapshot->'mood'->>'title','') ilike '%' || btrim(p_q) || '%')
     order by (now() >= p.starts_at) desc, p.starts_at
     limit greatest(1, least(coalesce(p_limit, 40), 50))
  ), k as (
    select c.*,
           (select count(*) from public.spot_applications a
             where a.spot_id = c.spot_id and a.status = 'accepted')::int as taken,
           (select a.status from public.spot_applications a
             where a.spot_id = c.spot_id and a.user_id = v_uid) as my_status,
           (c.user_id = v_uid) as mine,
           (select pr.pseudo from public.profiles pr where pr.id = c.user_id) as creator
      from c
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', k.spot_id, 'habit', k.habit, 'intentions', to_jsonb(k.intentions),
      'mode', k.mode, 'starts_at', k.starts_at, 'ends_at', k.ends_at,
      'duration_min', k.duration_min, 'live', now() >= k.starts_at,
      'lat', k.rlat, 'lng', k.rlng, 'dist_m', k.dist_m,
      'capacity', k.capacity, 'taken', k.taken, 'access', k.access, 'selection', k.selection,
      'mine', k.mine, 'my_status', k.my_status,
      -- Ce qui n'appartient qu'aux membres : qui, pourquoi, et SA
      -- compatibilité. Un invité voit une action, un lieu approximatif, une
      -- heure — assez pour vouloir entrer, rien sur personne.
      'creator',  case when v_member or k.mine then k.creator end,
      'context',  case when v_member or k.mine then k.snapshot - 'at' end,
      'comment',  case when v_member or k.mine then k.comment end,
      'compat',   k.score,
      -- Le rendez-vous exact : au créateur, et aux ACCEPTÉS. À personne
      -- d'autre, jamais.
      'place',    case when k.mine or k.my_status = 'accepted' then k.place end,
      'exact',    case when k.mine or k.my_status = 'accepted'
                       then jsonb_build_object('lat', k.lat, 'lng', k.lng) end,
      'why_not',  case
         when v_uid is null then 'signin'
         when k.mine then 'mine'
         when not coalesce((v_f->>'complete')::boolean, false) then 'passport'
         when not coalesce((v_f->>'thp')::boolean, false) then 'thp'
         when not coalesce((v_f->>'annual')::boolean, false) then 'club'
         when k.my_status in ('pending','accepted') then 'applied'
         when k.my_status = 'rejected' then 'rejected'
         when now() >= k.starts_at then 'started'
         when k.taken >= k.capacity then 'full'
         when k.access = 'subscribers' and not exists (
               select 1 from public.creator_subscriptions cs
                join public.creator_profiles cp on cp.user_id = cs.creator_id
               where cs.creator_id = k.user_id and cs.fan_id = v_uid
                 and cs.status in ('active','trialing') and 'spots' = any(cp.benefits)) then 'subscribers'
         else null end)
    order by k.live_first desc, k.score desc nulls last, k.starts_at), '[]'::jsonb)
  into v_res
  from (select k.*, (now() >= k.starts_at) as live_first,
               case when v_member and not k.mine then public._spot_compat(v_uid, k.spot_id) end as score
          from k) k;

  return jsonb_build_object('member', v_member, 'signed_in', v_uid is not null, 'spots', v_res);
end $f$;

-- ── CANDIDATER — MASTER §39, chaque ligne de la liste, côté serveur.
--    ⚠️ LA CAPACITÉ EST ATOMIQUE (§33, §80). Deux candidatures au même
--    instant sur un Spot à une place : la ligne du plan est VERROUILLÉE
--    (`for update`) le temps de compter et d'accepter. La seconde attend,
--    recompte, et trouve le Spot plein. Jamais `accepted > capacity`.
create or replace function public.spot_apply(p_spot uuid, p_note text default null)
returns jsonb
language plpgsql volatile security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); p public.spot_plans%rowtype; v_taken int; v_prev text;
        v_compat smallint; v_status text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if not public._is_figher(v_uid) then return jsonb_build_object('ok', false, 'why', 'figher'); end if;

  select * into p from public.spot_plans where spot_id = p_spot for update;
  if p.spot_id is null or p.status <> 'published' then return jsonb_build_object('ok', false, 'why', 'closed'); end if;
  if not exists (select 1 from public.spots s where s.id = p_spot and s.active) then
    return jsonb_build_object('ok', false, 'why', 'closed');
  end if;
  if p.user_id = v_uid then return jsonb_build_object('ok', false, 'why', 'mine'); end if;
  if now() >= p.starts_at then return jsonb_build_object('ok', false, 'why', 'started'); end if;
  if p.access = 'subscribers' and not exists (
       select 1 from public.creator_subscriptions cs
        join public.creator_profiles cp on cp.user_id = cs.creator_id
       where cs.creator_id = p.user_id and cs.fan_id = v_uid
         and cs.status in ('active','trialing') and 'spots' = any(cp.benefits)) then
    return jsonb_build_object('ok', false, 'why', 'subscribers');
  end if;

  select status into v_prev from public.spot_applications where spot_id = p_spot and user_id = v_uid;
  if v_prev in ('pending','accepted') then return jsonb_build_object('ok', false, 'why', 'applied', 'status', v_prev); end if;
  if v_prev in ('rejected','expired') then return jsonb_build_object('ok', false, 'why', v_prev); end if;

  select count(*) into v_taken from public.spot_applications where spot_id = p_spot and status = 'accepted';
  if v_taken >= p.capacity then return jsonb_build_object('ok', false, 'why', 'full'); end if;

  v_compat := public._spot_compat(v_uid, p_spot);
  -- AUTOMATIC : la place est donnée tout de suite, tant qu'il y en a.
  -- MANUAL : le créateur choisit, la compatibilité l'aide (§40).
  v_status := case when p.selection = 'auto' then 'accepted' else 'pending' end;

  insert into public.spot_applications(spot_id, user_id, status, compat, note, decided_at)
  values (p_spot, v_uid, v_status, v_compat, nullif(left(btrim(coalesce(p_note,'')), 280), ''),
          case when v_status = 'accepted' then now() end)
  on conflict (spot_id, user_id) do update
    set status = excluded.status, compat = excluded.compat, note = excluded.note,
        created_at = now(), decided_at = excluded.decided_at;

  return jsonb_build_object('ok', true, 'status', v_status, 'compat', v_compat,
    'place', case when v_status = 'accepted' then p.place end);
end $f$;

create or replace function public.spot_withdraw(p_spot uuid)
returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_n int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  -- Même verrou que l'acceptation : une place libérée et une place donnée
  -- ne se croisent pas.
  perform 1 from public.spot_plans where spot_id = p_spot for update;
  update public.spot_applications set status = 'cancelled', decided_at = now()
   where spot_id = p_spot and user_id = v_uid and status in ('pending','accepted');
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', v_n > 0);
end $f$;

create or replace function public.spot_decide(p_application bigint, p_accept boolean)
returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); a public.spot_applications%rowtype; p public.spot_plans%rowtype; v_taken int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select * into a from public.spot_applications where id = p_application;
  if a.id is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;
  select * into p from public.spot_plans where spot_id = a.spot_id for update;
  -- ⚠️ SEUL LE CRÉATEUR DÉCIDE. Vérifié ICI : l'identifiant d'une
  -- candidature se devine, la propriété du Spot non.
  if p.user_id is distinct from v_uid then return jsonb_build_object('ok', false, 'why', 'not_yours'); end if;
  if a.status <> 'pending' then return jsonb_build_object('ok', false, 'why', a.status); end if;
  if p_accept then
    select count(*) into v_taken from public.spot_applications where spot_id = a.spot_id and status = 'accepted';
    if v_taken >= p.capacity then return jsonb_build_object('ok', false, 'why', 'full'); end if;
  end if;
  update public.spot_applications
     set status = case when p_accept then 'accepted' else 'rejected' end, decided_at = now()
   where id = p_application;
  return jsonb_build_object('ok', true, 'status', case when p_accept then 'accepted' else 'rejected' end);
end $f$;

create or replace function public.spot_cancel(p_spot uuid)
returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_n int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  update public.spot_plans set status = 'cancelled'
   where spot_id = p_spot and user_id = v_uid and status = 'published';
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('ok', false, 'why', 'not_yours'); end if;
  update public.spots set active = false where id = p_spot and user_id = v_uid;
  update public.spot_applications set status = 'cancelled', decided_at = now()
   where spot_id = p_spot and status in ('pending','accepted');
  return jsonb_build_object('ok', true);
end $f$;

-- ── MY SPACE — mes Spots, les candidatures reçues, les miennes. Un appel.
--    ⚠️ Le créateur voit un PSEUDO et UN pourcentage. Jamais une
--    composante, jamais le Totehm du candidat (MASTER §38).
create or replace function public.my_space()
returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;
  perform public._spot_expire(v_uid);
  return jsonb_build_object(
    'signed_in', true,
    'spots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.spot_id, 'habit', p.habit, 'intentions', to_jsonb(p.intentions),
        'starts_at', p.starts_at, 'duration_min', p.duration_min, 'mode', p.mode,
        'capacity', p.capacity, 'access', p.access, 'selection', p.selection,
        'status', p.status, 'place', p.place,
        'live', now() between p.starts_at and p.starts_at + make_interval(mins => p.duration_min),
        'past', now() > p.starts_at + make_interval(mins => p.duration_min),
        'taken',   (select count(*) from public.spot_applications a where a.spot_id = p.spot_id and a.status = 'accepted'),
        'pending', (select count(*) from public.spot_applications a where a.spot_id = p.spot_id and a.status = 'pending'),
        'lat', s.lat, 'lng', s.lng)
        order by p.starts_at desc)
      from public.spot_plans p join public.spots s on s.id = p.spot_id
     where p.user_id = v_uid and p.starts_at > now() - interval '30 days'), '[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'spot_id', a.spot_id, 'habit', p.habit, 'starts_at', p.starts_at,
        'pseudo', pr.pseudo, 'compat', a.compat, 'note', a.note, 'at', a.created_at)
        order by a.compat desc nulls last, a.created_at)
      from public.spot_applications a
      join public.spot_plans p on p.spot_id = a.spot_id
      left join public.profiles pr on pr.id = a.user_id
     where p.user_id = v_uid and a.status = 'pending' and p.status = 'published'), '[]'::jsonb),
    'applications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'spot_id', a.spot_id, 'habit', p.habit, 'starts_at', p.starts_at,
        'duration_min', p.duration_min, 'mode', p.mode, 'status', a.status,
        'spot_status', p.status, 'creator', pr.pseudo,
        'place', case when a.status = 'accepted' and p.status = 'published' then p.place end)
        order by p.starts_at desc)
      from public.spot_applications a
      join public.spot_plans p on p.spot_id = a.spot_id
      left join public.profiles pr on pr.id = p.user_id
     where a.user_id = v_uid and p.starts_at > now() - interval '30 days'), '[]'::jsonb));
end $f$;


-- ════════════════════════════════════════════════════════════════════
-- F · LA CONSOLE FIGHER — les six questions, UN appel
-- ════════════════════════════════════════════════════════════════════
-- MASTER §86 : WHAT DO I HAVE? · WHAT CAN I ACCESS? · WHAT DO I
-- SUBSCRIBE TO? · WHO SUBSCRIBES TO ME? · WHAT DO I EARN? · WHEN DO I
-- GET PAID?  Un seul aller-retour dessine tout l'écran.
create or replace function public.club_console()
returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_f jsonb; v_sub public.subscriptions%rowtype; v_cp public.creator_profiles%rowtype;
        v_rules jsonb := public.payout_rules(); v_next date;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;
  v_f := public._figher(v_uid);
  select * into v_sub from public.subscriptions where user_id = v_uid;
  select * into v_cp from public.creator_profiles where user_id = v_uid;
  -- Le prochain versement : le jour fixé, le mois prochain si on l'a passé.
  v_next := make_date(extract(year from now())::int, extract(month from now())::int,
                      (v_rules->>'day')::int);
  if v_next <= current_date then v_next := (v_next + interval '1 month')::date; end if;

  return jsonb_build_object(
    'signed_in', true,
    'pseudo', (select pseudo from public.profiles where id = v_uid),
    'figher', v_f,
    'membership', jsonb_build_object(
      'status', v_sub.status, 'since', v_sub.started_at, 'until', v_sub.current_period_end,
      'ending', coalesce(v_sub.cancel_at_period_end, false), 'price_cents', v_sub.member_locked_price,
      'trial_ends_at', v_sub.trial_ends_at, 'portal', v_sub.stripe_customer_id is not null),
    'access', jsonb_build_object(
      'space_create', (v_f->>'member')::boolean,
      'space_apply',  (v_f->>'member')::boolean,
      'totehmize',    (v_f->>'complete')::boolean,
      'totehmbot',    (v_f->>'member')::boolean,
      'reveal',       (v_f->>'member')::boolean,
      'subscribe',    (v_f->>'member')::boolean,
      'monetize',     (v_f->>'member')::boolean,
      'bot_linked',   exists (select 1 from public.profiles where id = v_uid and telegram_id is not null)),
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'creator', pr.pseudo, 'price_cents', cs.amount_cents, 'currency', cs.currency,
        'status', cs.status, 'renews', cs.current_period_end, 'since', cs.created_at,
        'ending', cs.ending, 'benefits', to_jsonb(coalesce(cp.benefits, '{}'::text[])))
        order by cs.created_at desc)
      from public.creator_subscriptions cs
      left join public.profiles pr on pr.id = cs.creator_id
      left join public.creator_profiles cp on cp.user_id = cs.creator_id
     where cs.fan_id = v_uid), '[]'::jsonb),
    'subscribers', jsonb_build_object(
      'count', (select count(*) from public.creator_subscriptions
                 where creator_id = v_uid and status in ('active','trialing')),
      'list', coalesce((
        select jsonb_agg(jsonb_build_object('pseudo', pr.pseudo, 'status', cs.status,
                                            'since', cs.created_at, 'renews', cs.current_period_end)
               order by cs.created_at desc)
          from public.creator_subscriptions cs
          left join public.profiles pr on pr.id = cs.fan_id
         where cs.creator_id = v_uid), '[]'::jsonb)),
    'monetization', jsonb_build_object(
      'enabled', coalesce(v_cp.monetized, false),
      'price_cents', v_cp.custom_sub_price, 'currency', coalesce(v_cp.currency, 'eur'),
      'period', 'month',
      'benefits', to_jsonb(coalesce(v_cp.benefits, array['totehm']::text[])),
      'payout_method', v_cp.payout_method,
      'payout_fin', case when v_cp.payout_handle is null then null else right(v_cp.payout_handle, 4) end,
      'visible', exists (select 1 from public.totehms where user_id = v_uid and totehm_visibility = 'members'),
      'part', (v_rules->>'member_part')::int),
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
    'rules', v_rules);
end $f$;


-- ════════════════════════════════════════════════════════════════════
-- LES DROITS — APRÈS LE DERNIER CREATE, TOUJOURS
-- ════════════════════════════════════════════════════════════════════
-- Internes : `service_role` seul. Une page n'appelle jamais une fonction
-- à tiret bas, ni une fonction qui prend un utilisateur en paramètre.
do $$
declare f text;
begin
  foreach f in array array[
    'public._int_color(text)', 'public._pillar(text)', 'public._step_intentions(jsonb)',
    'public._figher(uuid)', 'public._is_figher(uuid)', 'public._balances(uuid)',
    'public._shared_with_me(uuid)', 'public._box_matter(uuid,text,text)',
    'public._spot_compat(uuid,uuid)', 'public._spot_expire(uuid)',
    'public.ledger_creator_invoice(text,text,uuid,uuid,bigint,text)',
    'public.payouts_due(text)', 'public.payout_mark_paid(uuid,text,bigint,text,text)',
    'public.creator_offer(text,uuid)', 'public._ledger_append_only()']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- `_shared_with_me` et `is_subscribed_to` sont appelées DANS des politiques
-- RLS : le rôle qui lit la table doit pouvoir les exécuter.
grant execute on function public._shared_with_me(uuid) to authenticated;
revoke all on function public.is_subscribed_to(uuid) from public, anon;
grant execute on function public.is_subscribed_to(uuid) to authenticated, service_role;

-- Pages connectées.
do $$
declare f text;
begin
  foreach f in array array[
    'public.totehm_of(text)', 'public.monetization_set(boolean,integer,text[])',
    'public.creator_card(text)', 'public.my_box_matter(text,text)',
    'public.spot_publish(text,text[],uuid[],bigint[],boolean,timestamptz,integer,text,double precision,double precision,text,integer,text,text,text)',
    'public.spot_apply(uuid,text)', 'public.spot_withdraw(uuid)', 'public.spot_decide(bigint,boolean)',
    'public.spot_cancel(uuid)', 'public.my_space()', 'public.club_console()']
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

-- Pages publiques : l'invité voit la porte, jamais ce qu'il y a derrière.
-- Chacune gère `auth.uid() is null` elle-même.
do $$
declare f text;
begin
  foreach f in array array[
    'public.figher_access()', 'public.totehmbot_access()', 'public.payout_rules()',
    'public.reveal_cloth(text)', 'public.decode_cloth(text)',
    'public.spots_radar(double precision,double precision,integer,text,text,boolean,integer)']
  loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated, service_role', f);
  end loop;
end $$;

-- Les tables neuves : aucune écriture directe, par personne d'autre que
-- les fonctions ci-dessus.
revoke all on public.spot_plans, public.spot_applications,
              public.member_ledger, public.member_payouts from anon, authenticated;
grant select on public.spot_applications, public.member_ledger, public.member_payouts to authenticated;
