-- ════════════════════════════════════════════════════════════════════
-- 20260930 · LA SOURCE UNIQUE — MASTER BRIEF DU 30/09/2026
-- ════════════════════════════════════════════════════════════════════
-- « Modifier et reconnecter l'existant. Ne pas reconstruire. Une donnée =
-- une source. » Ce fichier ne crée AUCUN système parallèle : il relie ce
-- qui existe (le compte, le passeport FIGHER, les abonnements, le grand
-- livre, les Spots, les œuvres) autour d'une seule vérité par type.
--
--   A · SSO         `sso_handoff.code_challenge` — le code du pont peut
--                   être lié à un PKCE (totehm.com devient l'autorité).
--   B · DROITS      `_subscriber_of` · `creator_page` · `totehm_of` (dit
--                   « subscribe ») · `my_entitlements` — QUI, À QUI, QUOI
--                   JE POSSÈDE, CE QUE J'OUVRE, en un appel.
--   C · PROPRIÉTÉ   `art_collections` · `artworks.collection` · le THP
--                   devient une œuvre de 777 000 exemplaires ·
--                   `art_editions` (qui possède quel exemplaire) ·
--                   `art_transfers` (chaque changement de main, en ajout
--                   seul) · `art_reservations` · `market_incidents`.
--                   `stoner_access` reste : c'est la PROJECTION de la
--                   propriété du THP (la porte Stoner et le webhook ne
--                   changent pas).
--   D · LE MARCHÉ   `market_view` · `my_collection` · `art_list` ·
--                   `art_unlist` · `art_primary_reserve` ·
--                   `art_resale_reserve` · `art_settle` (le webhook SEUL).
--   E · L'ESPACE    `spot_plans.kind` (experience | moment) · `.shield`
--                   (off | on) · `.video` · `.city` · `spot_publish` v4 ·
--                   `moment_publish` · `moments_feed` · `spot_video_set` ·
--                   `spots_radar` / `spots_past` / `spots_globe` / `my_space`
--                   / `spot_apply` relus · le seau `moments`.
--
-- ⚠️ ADDITIF POUR LES PAGES EN LIGNE. Les pages du 28/09 appellent les
-- mêmes fonctions avec les mêmes arguments ; les paramètres nouveaux ont
-- tous un défaut. `spot_publish` à 16 paramètres est remplacée par une
-- version à 19 dont les trois derniers ont un défaut : un appel nommé à 16
-- arguments la trouve encore.
--
-- ⚠️ `create or replace` RÉTABLIT LE GRANT À PUBLIC. Tous les droits sont
-- posés EN FIN DE FICHIER, après le dernier `create` (règle du projet).
-- ════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════
-- A · SSO — le pont peut être lié à un PKCE
-- ════════════════════════════════════════════════════════════════════
-- Le code d'un passage « central » (un satellite se connecte PAR
-- totehm.com) porte le défi PKCE (S256, base64url) du satellite qui l'a
-- demandé. `sso-redeem` ne brûle ce code qu'avec le bon `verifier` : un
-- code intercepté ne sert à rien. Les codes du pont de lien (sans défi)
-- restent valides tels quels.
alter table public.sso_handoff add column if not exists code_challenge text
  check (code_challenge is null or code_challenge ~ '^[A-Za-z0-9_-]{43}$');


-- ════════════════════════════════════════════════════════════════════
-- B · LES DROITS — une seule relation abonné, une seule lecture
-- ════════════════════════════════════════════════════════════════════

-- L'abonnement vivant d'un membre à un autre. C'est LA relation que
-- totehm.com (le Totehm), totehm.space (le lieu exact d'un Spot ON) et
-- figher.club (la console) lisent : une seule définition.
create or replace function public._subscriber_of(p_creator uuid, p_fan uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $f$
  select p_creator is not null and p_fan is not null and p_creator <> p_fan
     and exists (select 1 from public.creator_subscriptions cs
                  where cs.creator_id = p_creator and cs.fan_id = p_fan
                    and cs.status in ('active','trialing'));
$f$;

-- La lecture du Totehm d'un créateur payant : abonné ET droit `totehm`.
-- Même sens qu'avant, bâtie sur la relation unique. ⚠️ `security definer`
-- OBLIGATOIRE : appelée depuis la politique de `totehms` (récursion).
create or replace function public.is_subscribed_to(p_creator uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $f$
  select public._subscriber_of(p_creator, auth.uid())
     and exists (select 1 from public.creator_profiles cp
                  where cp.user_id = p_creator and 'totehm' = any(cp.benefits));
$f$;

-- Un abonné qui a le droit « Spots » (Spots réservés aux abonnés).
create or replace function public._spots_subscriber(p_creator uuid, p_fan uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $f$
  select public._subscriber_of(p_creator, p_fan)
     and exists (select 1 from public.creator_profiles cp
                  where cp.user_id = p_creator and 'spots' = any(cp.benefits));
$f$;

-- ── LA PAGE DE VENTE D'UN CRÉATEUR — totehm.com/@nom ────────────────
-- Ouverte à tous, même sans session : c'est la vitrine. Elle ne rend
-- JAMAIS une boîte : le nom, les couleurs de ses intentions, quelles
-- vues sont habitées (des booléens), l'offre, et ce que CE lecteur peut
-- faire. Un Totehm ni partagé ni en vente n'a pas de page.
create or replace function public.creator_page(p_pseudo text)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_me uuid := auth.uid(); v_uid uuid; v_t public.totehms%rowtype;
        v_cp public.creator_profiles%rowtype; v_open boolean; v_pass jsonb;
        v_st text; v_until timestamptz; v_ending boolean; v_pal text[];
begin
  select id into v_uid from public.profiles
   where lower(pseudo) = lower(btrim(coalesce(p_pseudo, ''))) limit 1;
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;

  select * into v_t from public.totehms where user_id = v_uid limit 1;
  select * into v_cp from public.creator_profiles where user_id = v_uid;
  v_open := coalesce(v_cp.monetized, false) and v_cp.custom_sub_price is not null
            and v_cp.payout_method is not null and public._is_figher(v_uid);

  if v_uid is distinct from v_me and coalesce(v_t.totehm_visibility, 'private') <> 'members' and not v_open then
    return jsonb_build_object('ok', false, 'why', 'private');
  end if;

  v_pass := public.totehm_complete(v_uid);
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
    'habits', (select count(*) from jsonb_array_elements(coalesce(v_t.steps, '[]'::jsonb)) s
                where btrim(coalesce(s->>'t', '')) <> ''),
    'views', jsonb_build_object(
      'wisdom',     coalesce((v_pass->>'wisdom')::boolean, false),
      'visions',    coalesce((v_pass->>'visions')::boolean, false),
      'habits',     coalesce((v_pass->>'habits')::boolean, false),
      'objectives', coalesce((v_pass->>'objectives')::boolean, false),
      'repulsions', coalesce((v_pass->>'repulsions')::boolean, false)),
    'free', coalesce(v_t.totehm_visibility, 'private') = 'members' and not coalesce(v_cp.monetized, false),
    'sale', jsonb_build_object(
      'open', v_open,
      'price_cents', case when v_open then v_cp.custom_sub_price end,
      'currency', coalesce(v_cp.currency, 'eur'),
      'period', 'month',
      'benefits', to_jsonb(case when v_open then coalesce(v_cp.benefits, '{}'::text[]) else '{}'::text[] end)),
    'viewer', jsonb_build_object(
      'signed_in',  v_me is not null,
      'me',         v_uid = v_me,
      'member',     v_me is not null and public._is_figher(v_me),
      'subscribed', coalesce(v_st in ('active','trialing'), false),
      'until',      v_until,
      'ending',     coalesce(v_ending, false),
      'can_read',   v_me is not null and public._shared_with_me(v_uid)));
end $f$;

-- ── LE TOTEHM D'UN AUTRE — même corps, une raison de plus ───────────
-- Avant : un Totehm payant répondait « private » à un non-abonné, et la
-- page s'arrêtait là. Maintenant il répond « subscribe » : la page
-- l'emmène à la page de vente (totehm.com/@nom).
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

  if not public._shared_with_me(v_uid) then
    if exists (select 1 from public.totehms t where t.user_id = v_uid and t.totehm_visibility = 'members')
       and coalesce((select cp.monetized from public.creator_profiles cp where cp.user_id = v_uid), false) then
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


-- ════════════════════════════════════════════════════════════════════
-- C · LA PROPRIÉTÉ — une œuvre, ses exemplaires, leurs changements de main
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.art_collections (
  slug             text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  title            text not null,
  tagline          text,
  kind             text not null check (kind in ('access','digital','street')),
  -- 700 = 7 %. La redevance TOTEHM sur chaque revente (brief §29).
  royalty_bps      int  not null default 700 check (royalty_bps between 0 and 5000),
  resale_allowed   boolean not null default true,
  -- Les bornes du prix de revente. NULL = libre (décision de Wah à venir).
  resale_min_cents int check (resale_min_cents is null or resale_min_cents >= 100),
  resale_max_cents int check (resale_max_cents is null or resale_max_cents >= 100),
  sort             int  not null default 0,
  active           boolean not null default true,
  created_at       timestamptz not null default now());
alter table public.art_collections enable row level security;

insert into public.art_collections(slug, title, tagline, kind, royalty_bps, resale_allowed, sort) values
  ('totehmpaper',            'TOTEHMPAPER {THP}',      'collectible · access · market',             'access',  700, true, 1),
  ('quantum',                'QUANTUM',                'digital art',                               'digital', 700, true, 2),
  ('play-the-lisbon-street', 'PLAY THE LISBON STREET', 'art · street · culture · experimentation', 'street',  700, true, 3)
on conflict (slug) do nothing;

alter table public.artworks add column if not exists collection text references public.art_collections(slug);
update public.artworks set collection = case series when 'quantum' then 'quantum'
                                                    when 'lisbonne' then 'play-the-lisbon-street' end
 where collection is null and series in ('quantum','lisbonne');

-- Le THP devient UNE œuvre de 777 000 exemplaires (brief §28). Son prix
-- initial vit ICI, comme celui des autres œuvres : `higher-checkout` le
-- lira (lot Claude Code). ⚠️ `series = 'totehmpaper'` : les pages de la
-- boutique qui listent `lisbonne` / `quantum` ne le voient pas.
insert into public.artworks(slug, series, sort_order, title, price_cents, currency, medium,
                            edition_total, edition_sold, status, collection)
values ('totehmpaper', 'totehmpaper', 0, 'TotehmPaper {THP}', 1700, 'usd', 'paper',
        777000, 0, 'available', 'totehmpaper')
on conflict (slug) do nothing;

-- QUI POSSÈDE QUEL EXEMPLAIRE. La vérité de la propriété, et la seule.
-- `owner_email` porte l'acheteur d'un THP qui n'a pas encore de compte
-- (le webhook écrit au paiement, avant l'inscription) ; `owner_id` se
-- pose dès que le compte existe (`my_collection` le réclame).
create table if not exists public.art_editions (
  id               uuid primary key default gen_random_uuid(),
  artwork_id       uuid not null references public.artworks(id) on delete restrict,
  edition_no       int  not null check (edition_no >= 1),
  owner_id         uuid references auth.users(id) on delete restrict,
  owner_email      text,
  acquired_at      timestamptz not null default now(),
  list_price_cents int check (list_price_cents is null or list_price_cents >= 100),
  list_currency    text,
  listed_at        timestamptz,
  created_at       timestamptz not null default now(),
  unique (artwork_id, edition_no),
  check (owner_id is not null or owner_email is not null),
  check ((list_price_cents is null) = (list_currency is null)));
create index if not exists art_editions_owner_idx on public.art_editions(owner_id);
create index if not exists art_editions_email_idx on public.art_editions(lower(owner_email));
create index if not exists art_editions_listed_idx on public.art_editions(artwork_id) where list_price_cents is not null;
alter table public.art_editions enable row level security;

-- CHAQUE CHANGEMENT DE MAIN. En ajout seul, comme le grand livre.
create table if not exists public.art_transfers (
  id                    bigint generated always as identity primary key,
  edition_id            uuid not null references public.art_editions(id) on delete restrict,
  kind                  text not null check (kind in ('primary','resale','grant','backfill')),
  from_user             uuid,
  to_user               uuid,
  to_email              text,
  price_cents           bigint not null default 0,
  currency              text not null default 'eur',
  royalty_cents         bigint not null default 0,
  seller_cents          bigint not null default 0,
  stripe_session        text unique,
  stripe_payment_intent text,
  created_at            timestamptz not null default now());
create index if not exists art_transfers_edition_idx on public.art_transfers(edition_id, created_at desc);
alter table public.art_transfers enable row level security;

create or replace function public._art_append_only()
returns trigger language plpgsql as $f$
begin raise exception 'art_transfers is append-only'; end $f$;
drop trigger if exists art_transfers_append_only on public.art_transfers;
create trigger art_transfers_append_only before update or delete on public.art_transfers
  for each row execute function public._art_append_only();

-- UN EXEMPLAIRE TENU PENDANT QU'ON LE PAIE (31 min ; la session Stripe
-- en dure 30). Une rangée par exemplaire en revente, un compte par œuvre
-- pour un premier achat : deux acheteurs ne paient jamais le dernier.
create table if not exists public.art_reservations (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('primary','resale')),
  artwork_id     uuid not null references public.artworks(id) on delete cascade,
  edition_id     uuid references public.art_editions(id) on delete cascade,
  buyer_id       uuid not null references auth.users(id) on delete cascade,
  price_cents    int  not null check (price_cents >= 50),
  currency       text not null,
  until          timestamptz not null,
  stripe_session text unique,
  created_at     timestamptz not null default now(),
  check ((kind = 'resale') = (edition_id is not null)));
create unique index if not exists art_reservations_edition_uq on public.art_reservations(edition_id) where edition_id is not null;
create index if not exists art_reservations_artwork_idx on public.art_reservations(artwork_id, until);
alter table public.art_reservations enable row level security;

-- CE QUI NE PEUT PAS ÊTRE HONORÉ, ÉCRIT QUELQUE PART. Un paiement reçu
-- pour un état impossible (réservation perdue, montant qui ne correspond
-- pas) ne disparaît jamais en silence : il attend ici un remboursement.
create table if not exists public.market_incidents (
  id             bigint generated always as identity primary key,
  at             timestamptz not null default now(),
  stripe_session text,
  kind           text not null,
  detail         jsonb not null default '{}'::jsonb,
  resolved_at    timestamptz);
alter table public.market_incidents enable row level security;

-- ── LE THP ENTRE DANS LA PROPRIÉTÉ ─────────────────────────────────
-- `stoner_access` accepte la source « resale » (le THP acheté sur le
-- marché ouvre la méthode comme l'autre).
alter table public.stoner_access drop constraint if exists stoner_access_source_check;
alter table public.stoner_access add constraint stoner_access_source_check
  check (source = any (array['stripe','nft','grant','resale']));

-- Les six porteurs d'aujourd'hui deviennent les exemplaires #1 à #6,
-- DANS L'ORDRE de leur « Figher # » (rang par date) : aucun numéro ne
-- bouge. Rejouable : un email déjà porteur est sauté.
do $backfill$
declare v_art uuid; r record; v_uid uuid; v_e uuid; v_no int;
begin
  select id into v_art from public.artworks where slug = 'totehmpaper';
  perform 1 from public.artworks where id = v_art for update;
  for r in select lower(s.email) as email, s.source, s.stripe_session_id, s.granted_at
             from public.stoner_access s order by s.granted_at
  loop
    if exists (select 1 from public.art_editions e where e.artwork_id = v_art and lower(e.owner_email) = r.email) then
      continue;
    end if;
    select coalesce(max(edition_no), 0) + 1 into v_no from public.art_editions where artwork_id = v_art;
    select u.id into v_uid from auth.users u where lower(u.email) = r.email limit 1;
    insert into public.art_editions(artwork_id, edition_no, owner_id, owner_email, acquired_at)
    values (v_art, v_no, v_uid, r.email, r.granted_at) returning id into v_e;
    insert into public.art_transfers(edition_id, kind, to_user, to_email, currency, created_at)
    values (v_e, 'backfill', v_uid, r.email, 'usd', r.granted_at);
  end loop;
  update public.artworks set edition_sold = (select count(*) from public.art_editions where artwork_id = v_art)
   where id = v_art;
end $backfill$;

-- Tout nouvel accès THP payé (le webhook, inchangé) ou offert frappe son
-- exemplaire. Une revente (`source = 'resale'`) ne frappe rien : c'est
-- `art_settle` qui a déjà déplacé l'exemplaire.
create or replace function public._thp_mint_on_access()
returns trigger
language plpgsql security definer set search_path to 'public'
as $f$
declare v_art uuid; v_no int; v_uid uuid; v_e uuid; v_email text := lower(new.email);
        v_amt numeric; v_cur text; m text[];
begin
  if new.source not in ('stripe','grant','nft') then return new; end if;
  select id into v_art from public.artworks where slug = 'totehmpaper';
  if v_art is null then return new; end if;
  perform 1 from public.artworks where id = v_art for update;
  if exists (select 1 from public.art_editions e where e.artwork_id = v_art and lower(e.owner_email) = v_email) then
    return new;
  end if;
  select coalesce(max(edition_no), 0) + 1 into v_no from public.art_editions where artwork_id = v_art;
  select u.id into v_uid from auth.users u where lower(u.email) = v_email limit 1;
  insert into public.art_editions(artwork_id, edition_no, owner_id, owner_email, acquired_at)
  values (v_art, v_no, v_uid, v_email, coalesce(new.granted_at, now())) returning id into v_e;
  -- « 33 EUR » : la note du webhook porte le montant payé.
  m := regexp_match(coalesce(new.note, ''), '^([0-9]+(\.[0-9]+)?) ([A-Za-z]{3})$');
  if m is not null then v_amt := m[1]::numeric; v_cur := lower(m[3]); end if;
  insert into public.art_transfers(edition_id, kind, to_user, to_email, price_cents, currency, stripe_session, created_at)
  values (v_e, case when new.source = 'stripe' then 'primary' else 'grant' end, v_uid, v_email,
          coalesce(round(v_amt * 100)::bigint, 0), coalesce(v_cur, 'usd'),
          new.stripe_session_id, coalesce(new.granted_at, now()));
  update public.artworks set edition_sold = edition_sold + 1 where id = v_art;
  return new;
end $f$;
drop trigger if exists stoner_access_mint on public.stoner_access;
create trigger stoner_access_mint after insert on public.stoner_access
  for each row execute function public._thp_mint_on_access();

-- Le porteur d'un THP : par son compte, ou par l'email du paiement tant
-- que le compte n'a pas réclamé l'exemplaire.
create or replace function public._thp_number(p_user uuid)
returns int
language sql stable security definer set search_path to 'public'
as $f$
  select min(e.edition_no)
    from public.art_editions e
    join public.artworks a on a.id = e.artwork_id and a.slug = 'totehmpaper'
   where p_user is not null
     and (e.owner_id = p_user
          or (e.owner_id is null and lower(e.owner_email) = (select lower(u.email) from auth.users u where u.id = p_user)));
$f$;

-- ── LE PASSEPORT FIGHER — même règle, le THP lu dans la propriété ───
-- Le numéro « Figher #n » est désormais le NUMÉRO DE L'EXEMPLAIRE : il
-- ne bouge plus quand un autre porteur revend le sien. Filet : un accès
-- `stoner_access` sans exemplaire (impossible après le backfill, mais un
-- passeport ne se ferme pas sur une hypothèse) compte encore comme THP.
create or replace function public._figher(p_user uuid)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_pass jsonb; v_email text; v_num int; v_thp boolean; v_st text; v_complete boolean; v_comp boolean := false;
begin
  if p_user is null then
    return jsonb_build_object('signed_in', false, 'complete', false, 'remplies', 0,
      'thp', false, 'number', null, 'annual', false, 'trial', false, 'member', false, 'comp', false);
  end if;

  v_pass := public.totehm_complete(p_user);
  v_complete := coalesce((v_pass->>'complete')::boolean, false);

  select lower(u.email) into v_email from auth.users u where u.id = p_user;
  v_num := public._thp_number(p_user);
  v_thp := v_num is not null
        or (v_email is not null and exists (select 1 from public.stoner_access s where lower(s.email) = v_email));
  if v_email is not null then
    select exists (select 1 from public.figher_comps c
                    where c.email = v_email and (c.expires_at is null or c.expires_at > now()))
      into v_comp;
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
    'thp',    v_thp,
    'number', v_num,
    'annual', coalesce(v_st in ('active','trialing'), false),
    'trial',  coalesce(v_st = 'trialing', false),
    'comp',   v_comp,
    'member', v_comp or (v_complete and v_thp and coalesce(v_st in ('active','trialing'), false)));
end $function$;

-- ── QUI EST-CE, À QUI S'ABONNE-T-IL, QUE POSSÈDE-T-IL, QUE PEUT-IL OUVRIR ──
-- Les quatre questions du brief (§7), un appel, pour toute page. Des
-- droits décidés ICI ; les pages ne les recomposent jamais.
create or replace function public.my_entitlements()
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_f jsonb; v_member boolean; v_email text;
begin
  v_f := public._figher(v_uid);
  if v_uid is null then return jsonb_build_object('signed_in', false, 'figher', v_f); end if;
  v_member := coalesce((v_f->>'member')::boolean, false);
  select lower(email) into v_email from auth.users where id = v_uid;
  return jsonb_build_object(
    'signed_in', true,
    'user', jsonb_build_object('id', v_uid, 'pseudo', (select pseudo from public.profiles where id = v_uid)),
    'figher', v_f,
    'subscribes_to', coalesce((
      select jsonb_agg(jsonb_build_object('creator', pr.pseudo, 'status', cs.status,
               'until', cs.current_period_end, 'ending', cs.ending,
               'benefits', to_jsonb(coalesce(cp.benefits, '{}'::text[]))) order by cs.created_at desc)
        from public.creator_subscriptions cs
        left join public.profiles pr on pr.id = cs.creator_id
        left join public.creator_profiles cp on cp.user_id = cs.creator_id
       where cs.fan_id = v_uid and cs.status in ('active','trialing')), '[]'::jsonb),
    'subscribers', (select count(*) from public.creator_subscriptions
                     where creator_id = v_uid and status in ('active','trialing')),
    'owns', coalesce((
      select jsonb_agg(jsonb_build_object('collection', a.collection, 'slug', a.slug, 'title', a.title,
               'edition', e.edition_no, 'of', a.edition_total, 'listed', e.list_price_cents is not null)
               order by a.collection, a.sort_order, e.edition_no)
        from public.art_editions e join public.artworks a on a.id = e.artwork_id
       where e.owner_id = v_uid or (e.owner_id is null and lower(e.owner_email) = v_email)), '[]'::jsonb),
    'access', jsonb_build_object(
      'space_create',  v_member,
      'space_apply',   v_member,
      'subscribe',     v_member,
      'monetize',      v_member,
      'reveal',        v_member,
      'totehmbot',     v_member,
      'totehmize',     coalesce((v_f->>'complete')::boolean, false),
      'stoner',        coalesce((v_f->>'thp')::boolean, false),
      'market_art',    coalesce((v_f->>'thp')::boolean, false),
      'market_thp',    true,
      'resell',        exists (select 1 from public.art_editions e where e.owner_id = v_uid)));
end $f$;


-- ════════════════════════════════════════════════════════════════════
-- D · LE MARCHÉ — DISCOVER · COLLECT · OWN · MY COLLECTION · RESALE
-- ════════════════════════════════════════════════════════════════════

-- Qui possède, dit en public : le nom de son Totehm, sinon « a collector ».
create or replace function public._owner_label(p_owner uuid)
returns text
language sql stable security definer set search_path to 'public'
as $f$
  select coalesce((select pseudo from public.profiles where id = p_owner), 'a collector');
$f$;

-- La vidéo d'une œuvre, là où la boutique la sert déjà (aucune copie).
create or replace function public._art_media(p_collection text, p_key text)
returns text
language sql immutable set search_path to 'public'
as $f$
  select case
    when p_key is null then null
    when p_collection = 'play-the-lisbon-street' then 'play-signals/' || p_key || '.mp4'
    when p_collection = 'quantum' then 'wah/' || ltrim(p_key, '0') || '.mp4'
  end;
$f$;

create or replace function public._art_owns_thp(p_user uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $f$
  select public._thp_number(p_user) is not null
      or exists (select 1 from public.stoner_access s join auth.users u on lower(u.email) = lower(s.email)
                  where u.id = p_user);
$f$;

-- UN APPEL DESSINE LE MARCHÉ : les collections, les œuvres (filtrées),
-- les exemplaires en revente, et — si `p_slug` — la fiche d'une œuvre
-- (qui la possède, son historique). Ouvert à tous : c'est une vitrine.
create or replace function public.market_view(p_collection text default null, p_slug text default null)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_art public.artworks%rowtype; v_detail jsonb := null; v_email text;
begin
  select lower(email) into v_email from auth.users where id = v_uid;
  if p_slug is not null then
    select * into v_art from public.artworks where slug = p_slug and collection is not null;
    if v_art.id is not null then
      v_detail := jsonb_build_object(
        'slug', v_art.slug, 'title', v_art.title, 'collection', v_art.collection, 'medium', v_art.medium,
        'price_cents', v_art.price_cents, 'currency', v_art.currency,
        'edition_total', v_art.edition_total, 'edition_sold', v_art.edition_sold,
        'available', greatest(0, v_art.edition_total - v_art.edition_sold
                     - (select count(*) from public.art_reservations r
                         where r.artwork_id = v_art.id and r.kind = 'primary' and r.until > now()))::int,
        'media', public._art_media(v_art.collection, v_art.video_key),
        -- Les propriétaires : l'exemplaire, le nom, depuis quand, s'il est à
        -- vendre. Pour le THP (777 000), seulement ceux qui sont à vendre
        -- et le mien : une liste de 777 000 lignes n'est pas une vitrine.
        'owners', coalesce((
          select jsonb_agg(jsonb_build_object('edition_id', e.id, 'edition', e.edition_no,
                   'owner', case when e.owner_id is not null then public._owner_label(e.owner_id) else 'a collector' end,
                   'mine', e.owner_id = v_uid or (e.owner_id is null and v_email is not null and lower(e.owner_email) = v_email),
                   'since', e.acquired_at,
                   'price_cents', e.list_price_cents, 'currency', e.list_currency,
                   'reserved', exists (select 1 from public.art_reservations r where r.edition_id = e.id and r.until > now()))
                   order by e.edition_no)
            from (select * from public.art_editions e
                   where e.artwork_id = v_art.id
                     and (v_art.edition_total <= 200 or e.list_price_cents is not null
                          or e.owner_id = v_uid or (v_email is not null and lower(e.owner_email) = v_email))
                   order by e.edition_no limit 200) e), '[]'::jsonb),
        'history', coalesce((
          select jsonb_agg(jsonb_build_object('at', t.created_at, 'kind', t.kind, 'edition', e.edition_no,
                   'price_cents', t.price_cents, 'currency', t.currency) order by t.created_at desc)
            from (select t.* from public.art_transfers t join public.art_editions e2 on e2.id = t.edition_id
                   where e2.artwork_id = v_art.id and t.kind in ('primary','resale')
                   order by t.created_at desc limit 20) t
            join public.art_editions e on e.id = t.edition_id), '[]'::jsonb));
    end if;
  end if;

  return jsonb_build_object(
    'signed_in', v_uid is not null,
    'can_buy_art', v_uid is not null and public._art_owns_thp(v_uid),
    'collections', coalesce((
      select jsonb_agg(jsonb_build_object('slug', c.slug, 'title', c.title, 'tagline', c.tagline, 'kind', c.kind,
               'royalty_pct', c.royalty_bps / 100.0, 'resale', c.resale_allowed,
               'works', (select count(*) from public.artworks a where a.collection = c.slug),
               'copies', (select coalesce(sum(a.edition_total), 0) from public.artworks a where a.collection = c.slug),
               'owned',  (select coalesce(sum(a.edition_sold), 0) from public.artworks a where a.collection = c.slug),
               'listed', (select count(*) from public.art_editions e join public.artworks a on a.id = e.artwork_id
                           where a.collection = c.slug and e.list_price_cents is not null))
               order by c.sort)
        from public.art_collections c where c.active), '[]'::jsonb),
    'works', coalesce((
      select jsonb_agg(jsonb_build_object('slug', a.slug, 'title', a.title, 'collection', a.collection,
               'medium', a.medium, 'price_cents', a.price_cents, 'currency', a.currency,
               'edition_total', a.edition_total, 'edition_sold', a.edition_sold,
               'available', greatest(0, a.edition_total - a.edition_sold
                            - (select count(*) from public.art_reservations r
                                where r.artwork_id = a.id and r.kind = 'primary' and r.until > now()))::int,
               'media', public._art_media(a.collection, a.video_key),
               'listed', (select count(*) from public.art_editions e where e.artwork_id = a.id and e.list_price_cents is not null),
               'floor_cents', (select min(e.list_price_cents) from public.art_editions e where e.artwork_id = a.id))
               order by c.sort, a.sort_order)
        from public.artworks a join public.art_collections c on c.slug = a.collection and c.active
       where p_collection is null or a.collection = p_collection), '[]'::jsonb),
    'listings', coalesce((
      select jsonb_agg(jsonb_build_object('edition_id', e.id, 'slug', a.slug, 'title', a.title,
               'collection', a.collection, 'edition', e.edition_no, 'of', a.edition_total,
               'price_cents', e.list_price_cents, 'currency', e.list_currency, 'since', e.listed_at,
               'seller', public._owner_label(e.owner_id), 'mine', e.owner_id = v_uid,
               'reserved', exists (select 1 from public.art_reservations r where r.edition_id = e.id and r.until > now()))
               order by e.listed_at desc)
        from (select * from public.art_editions where list_price_cents is not null order by listed_at desc limit 120) e
        join public.artworks a on a.id = e.artwork_id
       where p_collection is null or a.collection = p_collection), '[]'::jsonb),
    'detail', v_detail);
end $f$;

-- MA COLLECTION. Réclame d'abord ce que l'email de ce compte a payé
-- avant d'avoir un compte (un THP acheté puis l'inscription).
create or replace function public.my_collection()
returns jsonb
language plpgsql volatile security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_email text; v_cp public.creator_profiles%rowtype;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;
  select lower(email) into v_email from auth.users where id = v_uid;
  update public.art_editions set owner_id = v_uid
   where owner_id is null and v_email is not null and lower(owner_email) = v_email;
  select * into v_cp from public.creator_profiles where user_id = v_uid;
  return jsonb_build_object(
    'signed_in', true,
    'pseudo', (select pseudo from public.profiles where id = v_uid),
    'payout', jsonb_build_object('method', v_cp.payout_method,
                'fin', case when v_cp.payout_handle is null then null else right(v_cp.payout_handle, 4) end),
    'balances', public._balances(v_uid),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('edition_id', e.id, 'slug', a.slug, 'title', a.title,
               'collection', a.collection, 'collection_title', c.title, 'medium', a.medium,
               'edition', e.edition_no, 'of', a.edition_total, 'acquired_at', e.acquired_at,
               'paid_cents', (select t.price_cents from public.art_transfers t where t.edition_id = e.id
                                 and t.to_user = v_uid order by t.created_at desc limit 1),
               'paid_currency', (select t.currency from public.art_transfers t where t.edition_id = e.id
                                 and t.to_user = v_uid order by t.created_at desc limit 1),
               'media', public._art_media(a.collection, a.video_key),
               'resale', c.resale_allowed, 'royalty_pct', c.royalty_bps / 100.0,
               'min_cents', c.resale_min_cents, 'max_cents', c.resale_max_cents,
               'currency', a.currency,
               'listed', case when e.list_price_cents is null then null else jsonb_build_object(
                           'price_cents', e.list_price_cents, 'currency', e.list_currency, 'since', e.listed_at,
                           'reserved', exists (select 1 from public.art_reservations r
                                                where r.edition_id = e.id and r.until > now())) end)
               order by c.sort, a.sort_order, e.edition_no)
        from public.art_editions e
        join public.artworks a on a.id = e.artwork_id
        join public.art_collections c on c.slug = a.collection
       where e.owner_id = v_uid), '[]'::jsonb),
    'sales', coalesce((
      select jsonb_agg(jsonb_build_object('at', t.created_at, 'title', a.title, 'edition', e.edition_no,
               'price_cents', t.price_cents, 'seller_cents', t.seller_cents, 'currency', t.currency)
               order by t.created_at desc)
        from public.art_transfers t join public.art_editions e on e.id = t.edition_id
        join public.artworks a on a.id = e.artwork_id
       where t.from_user = v_uid and t.kind = 'resale'), '[]'::jsonb));
end $f$;

-- METTRE EN VENTE. Le prix est libre dans les bornes de la collection ;
-- il faut savoir où payer le vendeur (le même IBAN / PayPal que la
-- monétisation) ; un exemplaire tenu par un acheteur ne bouge pas.
create or replace function public.art_list(p_edition uuid, p_price_cents int)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); e public.art_editions%rowtype; a public.artworks%rowtype;
        c public.art_collections%rowtype;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select * into e from public.art_editions where id = p_edition for update;
  if e.id is null or e.owner_id is distinct from v_uid then return jsonb_build_object('ok', false, 'why', 'not_owner'); end if;
  select * into a from public.artworks where id = e.artwork_id;
  select * into c from public.art_collections where slug = a.collection;
  if not coalesce(c.resale_allowed, false) then return jsonb_build_object('ok', false, 'why', 'no_resale'); end if;
  if p_price_cents is null or p_price_cents < greatest(100, coalesce(c.resale_min_cents, 100))
     or p_price_cents > least(10000000, coalesce(c.resale_max_cents, 10000000)) then
    return jsonb_build_object('ok', false, 'why', 'price',
      'min', greatest(100, coalesce(c.resale_min_cents, 100)), 'max', least(10000000, coalesce(c.resale_max_cents, 10000000)));
  end if;
  if not exists (select 1 from public.creator_profiles cp where cp.user_id = v_uid and cp.payout_method is not null) then
    return jsonb_build_object('ok', false, 'why', 'payout_first');
  end if;
  if exists (select 1 from public.art_reservations r where r.edition_id = e.id and r.until > now()) then
    return jsonb_build_object('ok', false, 'why', 'reserved');
  end if;
  update public.art_editions set list_price_cents = p_price_cents, list_currency = a.currency, listed_at = now()
   where id = e.id;
  return jsonb_build_object('ok', true, 'price_cents', p_price_cents, 'currency', a.currency);
end $f$;

create or replace function public.art_unlist(p_edition uuid)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); e public.art_editions%rowtype;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select * into e from public.art_editions where id = p_edition for update;
  if e.id is null or e.owner_id is distinct from v_uid then return jsonb_build_object('ok', false, 'why', 'not_owner'); end if;
  if exists (select 1 from public.art_reservations r where r.edition_id = e.id and r.until > now()) then
    return jsonb_build_object('ok', false, 'why', 'reserved');
  end if;
  update public.art_editions set list_price_cents = null, list_currency = null, listed_at = null where id = e.id;
  return jsonb_build_object('ok', true);
end $f$;

-- ── TENIR UN EXEMPLAIRE — appelé par les fonctions de paiement SEULES ──
-- Premier achat : le verrou est la ligne de l'œuvre ; on compte les
-- exemplaires frappés ET ceux tenus par d'autres acheteurs.
create or replace function public.art_primary_reserve(p_slug text, p_buyer uuid)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $f$
declare a public.artworks%rowtype; r public.art_reservations%rowtype; v_held int; v_left int;
begin
  if p_buyer is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select * into a from public.artworks where slug = p_slug for update;
  if a.id is null or a.collection is null then return jsonb_build_object('ok', false, 'why', 'not_found'); end if;
  -- Le THP s'achète par sa propre porte (get_higher, `higher-checkout`).
  if a.collection = 'totehmpaper' then return jsonb_build_object('ok', false, 'why', 'thp_door'); end if;
  if not public._art_owns_thp(p_buyer) then return jsonb_build_object('ok', false, 'why', 'thp_required'); end if;
  delete from public.art_reservations where artwork_id = a.id and kind = 'primary' and until <= now();
  select * into r from public.art_reservations where artwork_id = a.id and kind = 'primary' and buyer_id = p_buyer;
  if r.id is not null then
    update public.art_reservations set until = now() + interval '31 minutes', stripe_session = null
     where id = r.id returning * into r;
  else
    select count(*) into v_held from public.art_reservations where artwork_id = a.id and kind = 'primary';
    v_left := a.edition_total - a.edition_sold - v_held;
    if v_left <= 0 then return jsonb_build_object('ok', false, 'why', 'sold_out'); end if;
    insert into public.art_reservations(kind, artwork_id, buyer_id, price_cents, currency, until)
    values ('primary', a.id, p_buyer, a.price_cents, a.currency, now() + interval '31 minutes')
    returning * into r;
  end if;
  return jsonb_build_object('ok', true, 'reservation', r.id, 'slug', a.slug, 'title', a.title,
    'collection', a.collection, 'price_cents', r.price_cents, 'currency', r.currency,
    'edition_next', a.edition_sold + 1, 'edition_total', a.edition_total);
end $f$;

-- Revente : le verrou est la ligne de l'exemplaire ; un seul acheteur à
-- la fois (index unique), le prix est celui AFFICHÉ, jamais un autre.
create or replace function public.art_resale_reserve(p_edition uuid, p_buyer uuid)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $f$
declare e public.art_editions%rowtype; a public.artworks%rowtype; r public.art_reservations%rowtype;
begin
  if p_buyer is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select * into e from public.art_editions where id = p_edition for update;
  if e.id is null or e.list_price_cents is null then return jsonb_build_object('ok', false, 'why', 'not_listed'); end if;
  if e.owner_id = p_buyer then return jsonb_build_object('ok', false, 'why', 'mine'); end if;
  if e.owner_id is null then return jsonb_build_object('ok', false, 'why', 'not_listed'); end if;
  select * into a from public.artworks where id = e.artwork_id;
  if a.collection <> 'totehmpaper' and not public._art_owns_thp(p_buyer) then
    return jsonb_build_object('ok', false, 'why', 'thp_required');
  end if;
  delete from public.art_reservations where edition_id = e.id and until <= now();
  select * into r from public.art_reservations where edition_id = e.id;
  if r.id is not null and r.buyer_id <> p_buyer then return jsonb_build_object('ok', false, 'why', 'reserved'); end if;
  if r.id is not null then
    update public.art_reservations set until = now() + interval '31 minutes', stripe_session = null,
           price_cents = e.list_price_cents, currency = e.list_currency
     where id = r.id returning * into r;
  else
    insert into public.art_reservations(kind, artwork_id, edition_id, buyer_id, price_cents, currency, until)
    values ('resale', a.id, e.id, p_buyer, e.list_price_cents, e.list_currency, now() + interval '31 minutes')
    returning * into r;
  end if;
  return jsonb_build_object('ok', true, 'reservation', r.id, 'slug', a.slug, 'title', a.title,
    'collection', a.collection, 'edition', e.edition_no, 'edition_total', a.edition_total,
    'price_cents', r.price_cents, 'currency', r.currency, 'seller', e.owner_id);
end $f$;

create or replace function public.art_reservation_session(p_reservation uuid, p_session text)
returns void
language sql security definer set search_path to 'public'
as $f$ update public.art_reservations set stripe_session = p_session where id = p_reservation; $f$;

create or replace function public.art_release(p_reservation uuid)
returns void
language sql security definer set search_path to 'public'
as $f$ delete from public.art_reservations where id = p_reservation; $f$;

create or replace function public._market_incident(p_session text, p_kind text, p_detail jsonb)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $f$
begin
  insert into public.market_incidents(stripe_session, kind, detail) values (p_session, p_kind, coalesce(p_detail, '{}'::jsonb));
  return jsonb_build_object('ok', false, 'why', p_kind, 'incident', true);
end $f$;

-- ── RÉGLER UNE VENTE — LE WEBHOOK SEUL ─────────────────────────────
-- Idempotent sur la session Stripe (`art_transfers.stripe_session`
-- unique) : Stripe rejoue, deux instances reçoivent le même événement,
-- une vente ne se règle qu'une fois — c'est la base qui le garantit.
-- Un état impossible (réservation perdue, montant différent) ne se perd
-- pas : `market_incidents`, pour un remboursement à la main.
create or replace function public.art_settle(
  p_session text, p_payment_intent text, p_reservation uuid, p_buyer uuid,
  p_email text, p_amount bigint, p_currency text)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $f$
declare r public.art_reservations%rowtype; a public.artworks%rowtype; e public.art_editions%rowtype;
        c public.art_collections%rowtype; v_no int; v_e uuid; v_seller uuid; v_seller_email text;
        v_seller_cents bigint; v_royalty bigint; v_email text := lower(btrim(coalesce(p_email, '')));
        v_cur text := lower(coalesce(p_currency, ''));
begin
  if p_session is null then return jsonb_build_object('ok', false, 'why', 'no_session'); end if;
  if exists (select 1 from public.art_transfers t where t.stripe_session = p_session) then
    return jsonb_build_object('ok', true, 'new', false);
  end if;

  select * into r from public.art_reservations
   where id = p_reservation or stripe_session = p_session
   order by (id = p_reservation) desc limit 1 for update;
  if r.id is null then
    return public._market_incident(p_session, 'no_reservation',
      jsonb_build_object('reservation', p_reservation, 'buyer', p_buyer, 'amount', p_amount, 'currency', v_cur, 'pi', p_payment_intent));
  end if;
  if r.buyer_id is distinct from p_buyer or r.price_cents <> p_amount or r.currency <> v_cur then
    return public._market_incident(p_session, 'mismatch',
      jsonb_build_object('reservation', r.id, 'buyer', p_buyer, 'expected', r.price_cents, 'amount', p_amount,
                         'currency', v_cur, 'pi', p_payment_intent));
  end if;
  if v_email = '' then select lower(email) into v_email from auth.users where id = p_buyer; end if;

  if r.kind = 'primary' then
    select * into a from public.artworks where id = r.artwork_id for update;
    select coalesce(max(edition_no), 0) + 1 into v_no from public.art_editions where artwork_id = a.id;
    if v_no > a.edition_total then
      return public._market_incident(p_session, 'oversold', jsonb_build_object('artwork', a.slug, 'buyer', p_buyer, 'pi', p_payment_intent));
    end if;
    insert into public.art_editions(artwork_id, edition_no, owner_id, owner_email)
    values (a.id, v_no, p_buyer, nullif(v_email, '')) returning id into v_e;
    insert into public.art_transfers(edition_id, kind, to_user, to_email, price_cents, currency,
                                     stripe_session, stripe_payment_intent)
    values (v_e, 'primary', p_buyer, nullif(v_email, ''), p_amount, v_cur, p_session, p_payment_intent);
    update public.artworks
       set edition_sold = v_no,
           status = case when v_no >= edition_total then 'sold' else 'available' end,
           reserved_for = null, reserved_until = null,
           sold_to = case when edition_total = 1 then p_buyer else sold_to end
     where id = a.id;
    delete from public.art_reservations where id = r.id;
    return jsonb_build_object('ok', true, 'new', true, 'kind', 'primary', 'slug', a.slug, 'edition', v_no);
  end if;

  -- Revente.
  select * into e from public.art_editions where id = r.edition_id for update;
  select * into a from public.artworks where id = e.artwork_id;
  select * into c from public.art_collections where slug = a.collection;
  if e.list_price_cents is null or e.list_price_cents <> p_amount or e.owner_id is null or e.owner_id = p_buyer then
    return public._market_incident(p_session, 'listing_changed',
      jsonb_build_object('edition', e.id, 'buyer', p_buyer, 'amount', p_amount, 'pi', p_payment_intent));
  end if;
  v_seller := e.owner_id;
  select lower(email) into v_seller_email from auth.users where id = v_seller;
  -- 93 % au vendeur, arrondi à l'entier inférieur ; le centime restant va
  -- à TOTEHM (même règle que les abonnements). Brut = vendeur + redevance.
  v_seller_cents := (p_amount * (10000 - c.royalty_bps)) / 10000;
  v_royalty := p_amount - v_seller_cents;

  update public.art_editions
     set owner_id = p_buyer, owner_email = nullif(v_email, ''), acquired_at = now(),
         list_price_cents = null, list_currency = null, listed_at = null
   where id = e.id;
  insert into public.art_transfers(edition_id, kind, from_user, to_user, to_email, price_cents, currency,
                                   royalty_cents, seller_cents, stripe_session, stripe_payment_intent)
  values (e.id, 'resale', v_seller, p_buyer, nullif(v_email, ''), p_amount, v_cur,
          v_royalty, v_seller_cents, p_session, p_payment_intent);
  insert into public.member_ledger(user_id, kind, amount_cents, gross_cents, platform_cents, currency,
                                   source, fan_id, note)
  values (v_seller, 'earning', v_seller_cents, p_amount, v_royalty, v_cur,
          'stripe:' || p_session, p_buyer, 'resale · ' || a.slug || ' #' || e.edition_no)
  on conflict (source, kind) do nothing;

  -- LE THP DÉPLACE L'ACCÈS. L'acheteur ouvre la méthode ; le vendeur la
  -- perd s'il ne porte plus aucun exemplaire (un accès offert reste).
  if a.collection = 'totehmpaper' and v_email <> '' then
    insert into public.stoner_access(email, source, note) values (v_email, 'resale', 'resale #' || e.edition_no)
    on conflict (email) do nothing;
    if v_seller_email is not null and not exists (
         select 1 from public.art_editions x where x.artwork_id = a.id
            and (x.owner_id = v_seller or lower(x.owner_email) = v_seller_email)) then
      delete from public.stoner_access where lower(email) = v_seller_email and source in ('stripe','resale','nft');
    end if;
  end if;

  delete from public.art_reservations where id = r.id;
  return jsonb_build_object('ok', true, 'new', true, 'kind', 'resale', 'slug', a.slug, 'edition', e.edition_no,
                            'seller_cents', v_seller_cents, 'royalty_cents', v_royalty);
end $f$;


-- ════════════════════════════════════════════════════════════════════
-- E · L'ESPACE — un Spot : un TYPE (expérience | moment), un TEMPS
--     (déduit), un BOUCLIER (off | on)
-- ════════════════════════════════════════════════════════════════════
-- SHORT-LIVE = MOMENT · SPOT = EXPERIENCE · OFF = LA VILLE · ON = LE LIEU
-- EXACT POUR LES ABONNÉS DU CRÉATEUR · ON ≠ INVITATION. Un seul objet :
-- la ligne de `spots` + son plan. Le temps (I WILL BE / I AM / I WAS
-- HERE) se DÉDUIT de l'heure, il ne se stocke jamais.

alter table public.spot_plans add column if not exists kind   text not null default 'experience';
alter table public.spot_plans add column if not exists shield text not null default 'off';
alter table public.spot_plans add column if not exists video  text;
alter table public.spot_plans add column if not exists city   text;
alter table public.spot_plans drop constraint if exists spot_plans_kind_check;
alter table public.spot_plans add constraint spot_plans_kind_check check (kind in ('experience','moment'));
alter table public.spot_plans drop constraint if exists spot_plans_shield_check;
alter table public.spot_plans add constraint spot_plans_shield_check check (shield in ('off','on'));
alter table public.spot_plans drop constraint if exists spot_plans_video_check;
alter table public.spot_plans add constraint spot_plans_video_check
  check (video is null or video ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webm|mp4|mov)$');
alter table public.spot_plans drop constraint if exists spot_plans_city_check;
alter table public.spot_plans add constraint spot_plans_city_check check (city is null or char_length(city) <= 80);
create index if not exists spot_plans_kind_starts_idx on public.spot_plans(kind, starts_at);

-- OFF = LA VILLE : la position publique recule au quartier (~1,1 km) pour
-- TOUS les Spots, publics comme privés. Le point exact ne se lit plus
-- qu'au créateur, aux acceptés, et — bouclier ON — aux abonnés.
update public.spots s set lat = round(s.lat::numeric, 2)::double precision, lng = round(s.lng::numeric, 2)::double precision
  from public.spot_plans p where p.spot_id = s.id;

create or replace function public.spot_rules()
returns jsonb
language sql immutable set search_path to 'public'
as $f$
  select jsonb_build_object(
    'max_upcoming', 10,
    'capacity_min', 1,  'capacity_max', 50,
    'duration_min', 5,  'duration_max', 720,
    'horizon_days', 90,
    'round_public', 2,
    'round_private', 2,
    'local_radius_km', 60,
    -- LE MOMENT : 5 secondes de vraie vidéo, « I AM HERE » pendant une
    -- heure, dans le fil pendant 24 h, douze par jour au plus.
    'clip_seconds', 5,
    'clip_max_bytes', 8388608,
    'moment_duration', 60,
    'moment_feed_hours', 24,
    'moment_max_day', 12);
$f$;

-- La vidéo d'un Spot ou d'un moment : un objet du seau `moments`, déposé
-- par CE membre (le chemin commence par son identifiant).
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

-- ── CRÉER UN SPOT — même chemin, + le bouclier, + la vidéo, + la ville ──
drop function if exists public.spot_publish(text,text[],uuid[],bigint[],boolean,timestamptz,integer,text,double precision,double precision,text,integer,text,text,text,text);
create or replace function public.spot_publish(
  p_habit text, p_intentions text[], p_objectives uuid[], p_repulsions bigint[], p_mood boolean,
  p_starts_at timestamptz, p_duration_min integer, p_place text, p_lat double precision, p_lng double precision,
  p_mode text, p_capacity integer, p_access text, p_selection text, p_comment text,
  p_venue text default 'public', p_shield text default 'off', p_video text default null, p_city text default null)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid(); v_steps jsonb; v_s jsonb; v_his text[]; v_is text[];
  v_objs jsonb; v_reps jsonb; v_mood jsonb; v_id uuid; v_cp public.creator_profiles%rowtype;
  v_r jsonb := public.spot_rules(); v_round int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if not public._is_figher(v_uid) then return jsonb_build_object('ok', false, 'why', 'figher'); end if;

  select coalesce(t.steps,'[]'::jsonb) into v_steps from public.totehms t where t.user_id = v_uid limit 1;
  select s into v_s from jsonb_array_elements(coalesce(v_steps,'[]'::jsonb)) s
   where s->>'t' = p_habit and btrim(coalesce(s->>'t','')) <> '' limit 1;
  if v_s is null then return jsonb_build_object('ok', false, 'why', 'habit'); end if;

  v_his := public._step_intentions(v_s);
  v_is := array(select distinct x from unnest(coalesce(p_intentions, '{}')) x
                 where x in ('fight','flow','enrich','love','express','focus','celebrate')
                   and (cardinality(v_his) = 0 or x = any(v_his)));
  if cardinality(v_is) = 0 then v_is := v_his; end if;

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
  if coalesce(p_mood, false) then
    select jsonb_build_object('title', m.title, 'url', m.url, 'intention', m.intention) into v_mood
      from public.intention_music m
     where m.user_id = v_uid and m.active and m.intention = any(v_is)
     order by array_position(v_is, m.intention) limit 1;
  end if;

  if p_starts_at is null or p_starts_at < now() - interval '10 minutes'
     or p_starts_at > now() + make_interval(days => (v_r->>'horizon_days')::int) then
    return jsonb_build_object('ok', false, 'why', 'when');
  end if;
  if coalesce(p_duration_min, 0) not between (v_r->>'duration_min')::int and (v_r->>'duration_max')::int then
    return jsonb_build_object('ok', false, 'why', 'duration'); end if;
  if coalesce(p_capacity, 0) not between (v_r->>'capacity_min')::int and (v_r->>'capacity_max')::int then
    return jsonb_build_object('ok', false, 'why', 'capacity'); end if;
  if p_mode not in ('social','silent') then return jsonb_build_object('ok', false, 'why', 'mode'); end if;
  if p_selection not in ('manual','auto') then return jsonb_build_object('ok', false, 'why', 'selection'); end if;
  if p_access not in ('club','subscribers') then return jsonb_build_object('ok', false, 'why', 'access'); end if;
  if coalesce(p_venue, '') not in ('public','private') then return jsonb_build_object('ok', false, 'why', 'venue'); end if;
  if coalesce(p_shield, '') not in ('off','on') then return jsonb_build_object('ok', false, 'why', 'shield'); end if;
  if p_video is not null and not public._clip_ok(v_uid, p_video) then return jsonb_build_object('ok', false, 'why', 'video'); end if;
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
  if (select count(*) from public.spot_plans where user_id = v_uid and status = 'published' and kind = 'experience'
        and starts_at + make_interval(mins => duration_min) > now()) >= (v_r->>'max_upcoming')::int then
    return jsonb_build_object('ok', false, 'why', 'too_many');
  end if;

  v_round := case when p_venue = 'private' then (v_r->>'round_private')::int else (v_r->>'round_public')::int end;

  insert into public.spots(user_id, intention, activite, commentaire, lat, lng,
                           duration_min, expires_at, is_public, required_role,
                           energy_mode, active)
  values (v_uid, coalesce(v_is[1], 'focus'), left(p_habit, 80), null,
          round(p_lat::numeric, v_round)::double precision, round(p_lng::numeric, v_round)::double precision,
          p_duration_min, p_starts_at + make_interval(mins => p_duration_min),
          false, 'figher', p_mode, true)
  returning id into v_id;

  insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at,
                                duration_min, capacity, mode, access, selection, place,
                                lat, lng, comment, venue, kind, shield, video, city)
  values (v_id, v_uid, p_habit, v_is,
          jsonb_build_object('habit', p_habit, 'intentions', to_jsonb(v_is),
                             'objectives', v_objs, 'repulsions', v_reps, 'mood', v_mood,
                             'freq', v_s->>'f', 'at', now()),
          p_starts_at, p_duration_min, p_capacity, p_mode, p_access, p_selection,
          left(btrim(p_place), 120), p_lat, p_lng, nullif(left(btrim(coalesce(p_comment,'')), 400), ''), p_venue,
          'experience', p_shield, p_video, nullif(left(btrim(coalesce(p_city, '')), 80), ''));

  return jsonb_build_object('ok', true, 'id', v_id,
    'lat', round(p_lat::numeric, v_round), 'lng', round(p_lng::numeric, v_round));
end $function$;

-- ── LE MOMENT — REC · CONTEXT · SOCIAL CONTRACT · GPS SHIELD ───────
-- Le même objet qu'un Spot (une ligne de `spots` + son plan), de type
-- `moment` : commencé MAINTENANT, « I AM HERE » une heure, sa vidéo de 5 s
-- obligatoire (le moment est la matière). Le contexte est la Habit Box
-- choisie dans MON Totehm, avec ce qui lui est relié — relu ici, jamais
-- reçu du client. Personne ne « rejoint » un moment : ON n'invite pas.
create or replace function public.moment_publish(
  p_habit text, p_intentions text[], p_mode text, p_shield text,
  p_lat double precision, p_lng double precision, p_video text,
  p_city text default null, p_comment text default null)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $f$
declare
  v_uid uuid := auth.uid(); v_steps jsonb; v_s jsonb; v_his text[]; v_is text[];
  v_objs jsonb; v_reps jsonb; v_mood jsonb; v_id uuid; v_r jsonb := public.spot_rules(); v_dur int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if not public._is_figher(v_uid) then return jsonb_build_object('ok', false, 'why', 'figher'); end if;

  select coalesce(t.steps,'[]'::jsonb) into v_steps from public.totehms t where t.user_id = v_uid limit 1;
  select s into v_s from jsonb_array_elements(coalesce(v_steps,'[]'::jsonb)) s
   where s->>'t' = p_habit and btrim(coalesce(s->>'t','')) <> '' limit 1;
  if v_s is null then return jsonb_build_object('ok', false, 'why', 'habit'); end if;

  v_his := public._step_intentions(v_s);
  v_is := array(select distinct x from unnest(coalesce(p_intentions, '{}')) x
                 where x in ('fight','flow','enrich','love','express','focus','celebrate')
                   and (cardinality(v_his) = 0 or x = any(v_his)));
  if cardinality(v_is) = 0 then v_is := v_his; end if;

  -- La Habit Box ENTIÈRE : ses objectifs et ses répulsions reliés.
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
  select jsonb_build_object('title', m.title, 'url', m.url, 'intention', m.intention) into v_mood
    from public.intention_music m
   where m.user_id = v_uid and m.active and m.intention = any(v_is)
   order by array_position(v_is, m.intention) limit 1;

  if p_mode not in ('social','silent') then return jsonb_build_object('ok', false, 'why', 'mode'); end if;
  if coalesce(p_shield, '') not in ('off','on') then return jsonb_build_object('ok', false, 'why', 'shield'); end if;
  if not public._clip_ok(v_uid, p_video) then return jsonb_build_object('ok', false, 'why', 'video'); end if;
  if p_lat is null or p_lng is null or abs(p_lat) > 90 or abs(p_lng) > 180 then
    return jsonb_build_object('ok', false, 'why', 'position');
  end if;
  if (select count(*) from public.spot_plans where user_id = v_uid and kind = 'moment'
        and created_at > now() - interval '24 hours') >= (v_r->>'moment_max_day')::int then
    return jsonb_build_object('ok', false, 'why', 'too_many');
  end if;
  v_dur := (v_r->>'moment_duration')::int;

  insert into public.spots(user_id, intention, activite, commentaire, lat, lng,
                           duration_min, expires_at, is_public, required_role, energy_mode, active)
  values (v_uid, coalesce(v_is[1], 'focus'), left(p_habit, 80), null,
          round(p_lat::numeric, (v_r->>'round_public')::int)::double precision,
          round(p_lng::numeric, (v_r->>'round_public')::int)::double precision,
          v_dur, now() + make_interval(mins => v_dur), false, 'figher', p_mode, true)
  returning id into v_id;

  insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at,
                                duration_min, capacity, mode, access, selection, place,
                                lat, lng, comment, venue, kind, shield, video, city)
  values (v_id, v_uid, p_habit, v_is,
          jsonb_build_object('habit', p_habit, 'intentions', to_jsonb(v_is),
                             'objectives', v_objs, 'repulsions', v_reps, 'mood', v_mood,
                             'freq', v_s->>'f', 'at', now()),
          now(), v_dur, 1, p_mode, 'club', 'manual',
          coalesce(nullif(left(btrim(coalesce(p_city, '')), 80), ''), 'here'),
          p_lat, p_lng, nullif(left(btrim(coalesce(p_comment,'')), 400), ''), 'public',
          'moment', p_shield, p_video, nullif(left(btrim(coalesce(p_city, '')), 80), ''));

  return jsonb_build_object('ok', true, 'id', v_id);
end $f$;

-- La vidéo d'un Spot se pose aussi APRÈS sa création (brief §19) : par
-- son créateur, sur son Spot, depuis le même seau.
create or replace function public.spot_video_set(p_spot uuid, p_video text)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if p_video is not null and not public._clip_ok(v_uid, p_video) then return jsonb_build_object('ok', false, 'why', 'video'); end if;
  update public.spot_plans set video = p_video where spot_id = p_spot and user_id = v_uid;
  if not found then return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  return jsonb_build_object('ok', true);
end $f$;

-- LE LIEU EXACT — une seule règle pour le radar, le passé, le fil et
-- l'espace membre : le créateur ; un accepté (expérience) ; bouclier ON
-- et abonné vivant du créateur.
create or replace function public._exact_ok(p_owner uuid, p_viewer uuid, p_shield text, p_accepted boolean)
returns boolean
language sql stable security definer set search_path to 'public'
as $f$
  select p_viewer is not null and (p_owner = p_viewer or coalesce(p_accepted, false)
          or (p_shield = 'on' and public._subscriber_of(p_owner, p_viewer)));
$f$;

-- ── LE RADAR — les EXPÉRIENCES seules ; le bouclier ; le temps dit ──
create or replace function public.spots_radar(p_lat double precision, p_lng double precision, p_radius integer, p_q text DEFAULT NULL::text, p_mode text DEFAULT NULL::text, p_live boolean DEFAULT false, p_limit integer DEFAULT 40, p_when text DEFAULT NULL::text, p_intention text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_f jsonb; v_member boolean; v_res jsonb;
        v_q text := lower(btrim(coalesce(p_q, '')));
        v_day0 timestamp := date_trunc('day', now() at time zone 'Europe/Lisbon');
        v_day_end  timestamptz := (v_day0 + interval '1 day') at time zone 'Europe/Lisbon';
        v_day2_end timestamptz := (v_day0 + interval '2 day') at time zone 'Europe/Lisbon';
        v_day8_end timestamptz := (v_day0 + interval '8 day') at time zone 'Europe/Lisbon';
begin
  v_f := public._figher(v_uid);
  v_member := coalesce((v_f->>'member')::boolean, false);
  if v_uid is not null then perform public._spot_expire(v_uid); end if;

  with c as (
    select p.*, s.lat as rlat, s.lng as rlng,
           case when p_lat is null or p_lng is null then null
                else earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng))::int end as dist_m,
           p.starts_at + make_interval(mins => p.duration_min) as ends_at,
           (select pr.pseudo from public.profiles pr where pr.id = p.user_id) as creator
      from public.spot_plans p join public.spots s on s.id = p.spot_id
     where p.status = 'published' and s.active and p.kind = 'experience'
       and p.starts_at + make_interval(mins => p.duration_min) > now()
       and p.starts_at < now() + interval '45 days'
       and (p_lat is null or p_lng is null or
            (earth_box(ll_to_earth(p_lat, p_lng), greatest(200, least(coalesce(p_radius, 5000), 60000)))
               @> ll_to_earth(s.lat, s.lng)
             and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng))
               <= greatest(200, least(coalesce(p_radius, 5000), 60000))))
       and (p_mode is null or p.mode = p_mode)
       and (p_intention is null or p_intention = any(p.intentions))
       and (not coalesce(p_live, false) or now() between p.starts_at and p.starts_at + make_interval(mins => p.duration_min))
       and (p_when is null
            or (p_when = 'now'      and now() between p.starts_at and p.starts_at + make_interval(mins => p.duration_min))
            or (p_when = 'today'    and p.starts_at < v_day_end)
            or (p_when = 'week'     and p.starts_at < now() + interval '7 days')
            or (p_when = 'tomorrow' and p.starts_at >= v_day_end and p.starts_at < v_day2_end)
            or (p_when = 'next7'    and p.starts_at >= v_day_end and p.starts_at < v_day8_end)
            or (p_when = 'later'    and p.starts_at >= v_day_end))
  ), h as (
    select c.*, lower(concat_ws(' ',
             c.habit, array_to_string(c.intentions, ' '),
             (select string_agg(public._pillar(x), ' ') from unnest(c.intentions) x),
             c.mode, c.venue, c.city, replace(coalesce(c.snapshot->>'freq', ''), '_', ' '),
             c.snapshot->'mood'->>'title',
             case when c.demo then 'demo' end,
             case when v_member or c.user_id = v_uid then concat_ws(' ',
               c.creator, c.comment,
               (select string_agg(e->>'text', ' ') from jsonb_array_elements(coalesce(c.snapshot->'objectives', '[]'::jsonb)) e),
               (select string_agg(e->>'text', ' ') from jsonb_array_elements(coalesce(c.snapshot->'repulsions', '[]'::jsonb)) e))
             end)) as hay
      from c
  ), f as (
    select h.* from h
     where v_q = ''
        or not exists (select 1 from regexp_split_to_table(v_q, '\s+') w
                        where w <> '' and strpos(h.hay, w) = 0)
     order by (now() >= h.starts_at) desc, h.starts_at
     limit greatest(1, least(coalesce(p_limit, 40), 60))
  ), k as (
    select f.*,
           (select count(*) from public.spot_applications a
             where a.spot_id = f.spot_id and a.status = 'accepted')::int as taken,
           (select a.status from public.spot_applications a
             where a.spot_id = f.spot_id and a.user_id = v_uid) as my_status,
           (f.user_id = v_uid) as mine
      from f
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', k.spot_id, 'kind', k.kind, 'habit', k.habit, 'intentions', to_jsonb(k.intentions),
      'freq', k.snapshot->>'freq',
      'mode', k.mode, 'venue', k.venue, 'starts_at', k.starts_at, 'ends_at', k.ends_at,
      'duration_min', k.duration_min, 'live', now() >= k.starts_at,
      'state', case when now() >= k.starts_at then 'am' else 'will' end,
      'shield', k.shield, 'city', k.city,
      'lat', k.rlat, 'lng', k.rlng, 'dist_m', k.dist_m,
      'capacity', k.capacity, 'taken', k.taken, 'access', k.access, 'selection', k.selection,
      'mine', k.mine, 'my_status', k.my_status, 'demo', k.demo,
      'mood',     k.snapshot->'mood'->>'title',
      'creator',  case when v_member or k.mine then k.creator end,
      'context',  case when v_member or k.mine then k.snapshot - 'at' end,
      'comment',  case when v_member or k.mine then k.comment end,
      'video',    case when v_member or k.mine then k.video end,
      'compat',   k.score,
      'place',    case when public._exact_ok(k.user_id, v_uid, k.shield, k.my_status = 'accepted') then k.place end,
      'exact',    case when public._exact_ok(k.user_id, v_uid, k.shield, k.my_status = 'accepted')
                       then jsonb_build_object('lat', k.lat, 'lng', k.lng) end,
      'why_not',  case
         when v_uid is null then 'signin'
         when k.mine then 'mine'
         when not v_member then case
              when not coalesce((v_f->>'complete')::boolean, false) then 'passport'
              when not coalesce((v_f->>'thp')::boolean, false) then 'thp'
              else 'club' end
         when k.my_status in ('pending','accepted') then 'applied'
         when k.my_status = 'rejected' then 'rejected'
         when now() >= k.starts_at then 'started'
         when k.taken >= k.capacity then 'full'
         when k.access = 'subscribers' and not public._spots_subscriber(k.user_id, v_uid) then 'subscribers'
         else null end)
    order by k.live_first desc, k.starts_at), '[]'::jsonb)
  into v_res
  from (select k.*, (now() >= k.starts_at) as live_first,
               case when v_member and not k.mine then public._spot_compat(v_uid, k.spot_id) end as score
          from k) k;

  return jsonb_build_object('member', v_member, 'signed_in', v_uid is not null, 'spots', v_res);
end $function$;

-- ── LE PASSÉ — I WAS HERE, les expériences terminées ───────────────
create or replace function public.spots_past(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius integer default 5000,
  p_q text default null,
  p_limit integer default 60)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_f jsonb; v_member boolean; v_res jsonb;
        v_q text := lower(btrim(coalesce(p_q, '')));
        v_r int := greatest(200, least(coalesce(p_radius, 5000), 60000));
begin
  v_f := public._figher(v_uid);
  v_member := coalesce((v_f->>'member')::boolean, false);

  with c as (
    select p.*, s.lat as rlat, s.lng as rlng,
           case when p_lat is null or p_lng is null then null
                else earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng))::int end as dist_m,
           p.starts_at + make_interval(mins => p.duration_min) as ends_at,
           (select pr.pseudo from public.profiles pr where pr.id = p.user_id) as creator
      from public.spot_plans p join public.spots s on s.id = p.spot_id
     where p.status = 'published' and p.kind = 'experience'
       and p.starts_at + make_interval(mins => p.duration_min) <= now()
       and p.starts_at > now() - interval '365 days'
       and (p_lat is null or p_lng is null or
            (earth_box(ll_to_earth(p_lat, p_lng), v_r) @> ll_to_earth(s.lat, s.lng)
             and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng)) <= v_r))
  ), h as (
    select c.*, lower(concat_ws(' ',
             c.habit, array_to_string(c.intentions, ' '),
             (select string_agg(public._pillar(x), ' ') from unnest(c.intentions) x),
             c.mode, c.venue, c.city, replace(coalesce(c.snapshot->>'freq', ''), '_', ' '),
             c.snapshot->'mood'->>'title',
             case when c.demo then 'demo' end,
             case when v_member or c.user_id = v_uid then concat_ws(' ',
               c.creator, c.comment,
               (select string_agg(e->>'text', ' ') from jsonb_array_elements(coalesce(c.snapshot->'objectives', '[]'::jsonb)) e),
               (select string_agg(e->>'text', ' ') from jsonb_array_elements(coalesce(c.snapshot->'repulsions', '[]'::jsonb)) e))
             end)) as hay
      from c
  ), f as (
    select h.* from h
     where v_q = ''
        or not exists (select 1 from regexp_split_to_table(v_q, '\s+') w
                        where w <> '' and strpos(h.hay, w) = 0)
     order by h.starts_at desc
     limit greatest(1, least(coalesce(p_limit, 60), 60))
  ), k as (
    select f.*,
           (select count(*) from public.spot_applications a
             where a.spot_id = f.spot_id and a.status = 'accepted')::int as taken,
           (select a.status from public.spot_applications a
             where a.spot_id = f.spot_id and a.user_id = v_uid) as my_status,
           (f.user_id = v_uid) as mine
      from f
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', k.spot_id, 'kind', k.kind, 'habit', k.habit, 'intentions', to_jsonb(k.intentions),
      'freq', k.snapshot->>'freq',
      'mode', k.mode, 'venue', k.venue, 'starts_at', k.starts_at, 'ends_at', k.ends_at,
      'duration_min', k.duration_min, 'past', true, 'state', 'was',
      'shield', k.shield, 'city', k.city,
      'lat', k.rlat, 'lng', k.rlng, 'dist_m', k.dist_m,
      'capacity', k.capacity, 'taken', k.taken, 'access', k.access, 'selection', k.selection,
      'mine', k.mine, 'my_status', k.my_status, 'demo', k.demo,
      'mood',     k.snapshot->'mood'->>'title',
      'creator',  case when v_member or k.mine then k.creator end,
      'context',  case when v_member or k.mine then k.snapshot - 'at' end,
      'comment',  case when v_member or k.mine then k.comment end,
      'video',    case when v_member or k.mine then k.video end,
      'compat',   k.score,
      'place',    case when public._exact_ok(k.user_id, v_uid, k.shield, k.my_status = 'accepted') then k.place end,
      'exact',    case when public._exact_ok(k.user_id, v_uid, k.shield, k.my_status = 'accepted')
                       then jsonb_build_object('lat', k.lat, 'lng', k.lng) end,
      -- `again` reste pour la page du 28/09 ; « Do it again » est retiré
      -- (brief §16 : pas de Spot créé depuis un Spot).
      'again',    v_member)
    order by k.starts_at desc), '[]'::jsonb)
  into v_res
  from (select k.*,
               case when v_member and not k.mine then public._spot_compat(v_uid, k.spot_id) end as score
          from k) k;

  return jsonb_build_object('member', v_member, 'signed_in', v_uid is not null, 'spots', v_res);
end $function$;

-- ── LE GLOBE DU RADAR — les expériences seules ─────────────────────
create or replace function public.spots_globe(
  p_when text default null, p_intention text default null, p_q text default null, p_mode text default null)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_q text := lower(btrim(coalesce(p_q, '')));
        v_day0 timestamp := date_trunc('day', now() at time zone 'Europe/Lisbon');
        v_day_end  timestamptz := (v_day0 + interval '1 day') at time zone 'Europe/Lisbon';
        v_day2_end timestamptz := (v_day0 + interval '2 day') at time zone 'Europe/Lisbon';
        v_day8_end timestamptz := (v_day0 + interval '8 day') at time zone 'Europe/Lisbon';
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('lat', c.lat, 'lng', c.lng, 'n', c.n, 'live', c.live, 'i', c.i) order by c.n desc)
      from (select round(avg(s.lat)::numeric, 2) as lat, round(avg(s.lng)::numeric, 2) as lng,
                   count(*)::int as n,
                   (count(*) filter (where now() >= p.starts_at))::int as live,
                   mode() within group (order by p.intentions[1]) as i
              from public.spot_plans p join public.spots s on s.id = p.spot_id
             where p.status = 'published' and s.active and p.kind = 'experience'
               and p.starts_at + make_interval(mins => p.duration_min) > now()
               and p.starts_at < now() + interval '45 days'
               and (p_mode is null or p.mode = p_mode)
               and (p_intention is null or p_intention = any(p.intentions))
               and (p_when is null
                    or (p_when = 'now'      and now() between p.starts_at and p.starts_at + make_interval(mins => p.duration_min))
                    or (p_when = 'today'    and p.starts_at < v_day_end)
                    or (p_when = 'week'     and p.starts_at < now() + interval '7 days')
                    or (p_when = 'tomorrow' and p.starts_at >= v_day_end and p.starts_at < v_day2_end)
                    or (p_when = 'next7'    and p.starts_at >= v_day_end and p.starts_at < v_day8_end)
                    or (p_when = 'later'    and p.starts_at >= v_day_end))
               and (v_q = '' or not exists (
                     select 1 from regexp_split_to_table(v_q, '\s+') w
                      where w <> '' and strpos(lower(concat_ws(' ', p.habit, array_to_string(p.intentions, ' '), p.mode, p.venue)), w) = 0))
             group by floor(s.lat*2), floor(s.lng*2)
             limit 3000) c), '[]'::jsonb);
end $f$;

-- ── LE FIL DES MOMENTS — la vue de GAUCHE ──────────────────────────
-- Les moments des dernières 24 h, du plus récent au plus ancien, autour
-- de la carte (ou partout si l'on ne sait pas où l'on est). Mêmes règles
-- de lecture que le radar : l'invité voit QUOI (habitude, intentions,
-- ville, heure) ; le membre voit QUI (créateur, contexte, la vidéo) ; le
-- lieu exact = créateur, ou bouclier ON et abonné vivant.
create or replace function public.moments_feed(
  p_lat double precision default null, p_lng double precision default null,
  p_radius integer default 60000, p_limit integer default 40)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_member boolean; v_res jsonb; v_r jsonb := public.spot_rules();
        v_rad int := greatest(500, least(coalesce(p_radius, 60000), 60000));
begin
  v_member := coalesce((public._figher(v_uid)->>'member')::boolean, false);
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', m.spot_id, 'kind', 'moment', 'habit', m.habit, 'intentions', to_jsonb(m.intentions),
      'freq', m.snapshot->>'freq', 'mode', m.mode, 'shield', m.shield, 'city', m.city,
      'starts_at', m.starts_at, 'ends_at', m.ends_at,
      'state', case when now() < m.ends_at then 'am' else 'was' end,
      'lat', m.rlat, 'lng', m.rlng, 'dist_m', m.dist_m, 'mine', m.user_id = v_uid, 'demo', m.demo,
      'mood',    m.snapshot->'mood'->>'title',
      'creator', case when v_member or m.user_id = v_uid then m.creator end,
      'context', case when v_member or m.user_id = v_uid then m.snapshot - 'at' end,
      'comment', case when v_member or m.user_id = v_uid then m.comment end,
      'video',   case when v_member or m.user_id = v_uid then m.video end,
      'exact',   case when public._exact_ok(m.user_id, v_uid, m.shield, false)
                      then jsonb_build_object('lat', m.lat, 'lng', m.lng) end)
      order by m.starts_at desc), '[]'::jsonb)
    into v_res
    from (select p.*, s.lat as rlat, s.lng as rlng,
                 p.starts_at + make_interval(mins => p.duration_min) as ends_at,
                 case when p_lat is null or p_lng is null then null
                      else earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng))::int end as dist_m,
                 (select pr.pseudo from public.profiles pr where pr.id = p.user_id) as creator
            from public.spot_plans p join public.spots s on s.id = p.spot_id
           where p.kind = 'moment' and p.status = 'published' and s.active
             and p.starts_at > now() - make_interval(hours => (v_r->>'moment_feed_hours')::int)
             and (p_lat is null or p_lng is null or
                  (earth_box(ll_to_earth(p_lat, p_lng), v_rad) @> ll_to_earth(s.lat, s.lng)
                   and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng)) <= v_rad))
           order by p.starts_at desc
           limit greatest(1, least(coalesce(p_limit, 40), 60))) m;
  return jsonb_build_object('member', v_member, 'signed_in', v_uid is not null, 'moments', v_res);
end $f$;

-- ── MON ESPACE — mes Spots ET mes moments, avec leur bouclier ──────
create or replace function public.my_space()
returns jsonb
language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_r jsonb := public.spot_rules();
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;
  perform public._spot_expire(v_uid);
  return jsonb_build_object(
    'signed_in', true,
    'limits', jsonb_build_object(
      'upcoming', (select count(*) from public.spot_plans
                    where user_id = v_uid and status = 'published' and kind = 'experience'
                      and starts_at + make_interval(mins => duration_min) > now()),
      'max_upcoming', (v_r->>'max_upcoming')::int,
      'moments_today', (select count(*) from public.spot_plans
                         where user_id = v_uid and kind = 'moment' and created_at > now() - interval '24 hours'),
      'moment_max_day', (v_r->>'moment_max_day')::int),
    'spots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.spot_id, 'kind', p.kind, 'habit', p.habit, 'intentions', to_jsonb(p.intentions),
        'starts_at', p.starts_at, 'duration_min', p.duration_min, 'mode', p.mode, 'venue', p.venue,
        'capacity', p.capacity, 'access', p.access, 'selection', p.selection,
        'status', p.status, 'place', p.place, 'comment', p.comment,
        'shield', p.shield, 'video', p.video, 'city', p.city,
        'mood', p.snapshot->'mood'->>'title',
        'live', now() between p.starts_at and p.starts_at + make_interval(mins => p.duration_min),
        'past', now() > p.starts_at + make_interval(mins => p.duration_min),
        'state', case when now() < p.starts_at then 'will'
                      when now() <= p.starts_at + make_interval(mins => p.duration_min) then 'am' else 'was' end,
        'taken',   (select count(*) from public.spot_applications a where a.spot_id = p.spot_id and a.status = 'accepted'),
        'pending', (select count(*) from public.spot_applications a where a.spot_id = p.spot_id and a.status = 'pending'),
        'lat', s.lat, 'lng', s.lng,
        'exact', jsonb_build_object('lat', p.lat, 'lng', p.lng),
        'freq', p.snapshot->>'freq', 'context', p.snapshot - 'at', 'demo', p.demo)
        order by p.starts_at desc)
      from public.spot_plans p join public.spots s on s.id = p.spot_id
     where p.user_id = v_uid and p.starts_at > now() - interval '365 days'), '[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'spot_id', a.spot_id, 'habit', p.habit, 'starts_at', p.starts_at,
        'intentions', to_jsonb(p.intentions), 'freq', p.snapshot->>'freq',
        'pseudo', pr.pseudo, 'compat', a.compat, 'note', a.note, 'at', a.created_at)
        order by a.compat desc nulls last, a.created_at)
      from public.spot_applications a
      join public.spot_plans p on p.spot_id = a.spot_id
      left join public.profiles pr on pr.id = a.user_id
     where p.user_id = v_uid and a.status = 'pending' and p.status = 'published'), '[]'::jsonb),
    'applications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'spot_id', a.spot_id, 'habit', p.habit, 'starts_at', p.starts_at,
        'duration_min', p.duration_min, 'mode', p.mode, 'venue', p.venue, 'status', a.status,
        'spot_status', p.status, 'creator', pr.pseudo,
        'intentions', to_jsonb(p.intentions), 'freq', p.snapshot->>'freq',
        'context', p.snapshot - 'at', 'demo', p.demo, 'capacity', p.capacity,
        'selection', p.selection, 'access', p.access, 'comment', p.comment,
        'shield', p.shield, 'city', p.city,
        'mood', p.snapshot->'mood'->>'title',
        'taken', (select count(*) from public.spot_applications x where x.spot_id = p.spot_id and x.status = 'accepted'),
        'lat', s.lat, 'lng', s.lng,
        'place', case when a.status = 'accepted' and p.status = 'published' then p.place end,
        'exact', case when a.status = 'accepted' and p.status = 'published'
                      then jsonb_build_object('lat', p.lat, 'lng', p.lng) end)
        order by p.starts_at desc)
      from public.spot_applications a
      join public.spot_plans p on p.spot_id = a.spot_id
      join public.spots s on s.id = p.spot_id
      left join public.profiles pr on pr.id = p.user_id
     where a.user_id = v_uid and p.starts_at > now() - interval '365 days'), '[]'::jsonb));
end $function$;

-- ── CANDIDATER — jamais à un moment (ON n'invite pas) ──────────────
create or replace function public.spot_apply(p_spot uuid, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); p public.spot_plans%rowtype; v_taken int; v_prev text;
        v_compat smallint; v_status text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if not public._is_figher(v_uid) then return jsonb_build_object('ok', false, 'why', 'figher'); end if;

  select * into p from public.spot_plans where spot_id = p_spot for update;
  if p.spot_id is null or p.status <> 'published' then return jsonb_build_object('ok', false, 'why', 'closed'); end if;
  if p.kind = 'moment' then return jsonb_build_object('ok', false, 'why', 'moment'); end if;
  if not exists (select 1 from public.spots s where s.id = p_spot and s.active) then
    return jsonb_build_object('ok', false, 'why', 'closed');
  end if;
  if p.user_id = v_uid then return jsonb_build_object('ok', false, 'why', 'mine'); end if;
  if now() >= p.starts_at then return jsonb_build_object('ok', false, 'why', 'started'); end if;
  if p.access = 'subscribers' and not public._spots_subscriber(p.user_id, v_uid) then
    return jsonb_build_object('ok', false, 'why', 'subscribers');
  end if;

  select status into v_prev from public.spot_applications where spot_id = p_spot and user_id = v_uid;
  if v_prev in ('pending','accepted') then return jsonb_build_object('ok', false, 'why', 'applied', 'status', v_prev); end if;
  if v_prev in ('rejected','expired') then return jsonb_build_object('ok', false, 'why', v_prev); end if;

  select count(*) into v_taken from public.spot_applications where spot_id = p_spot and status = 'accepted';
  if v_taken >= p.capacity then return jsonb_build_object('ok', false, 'why', 'full'); end if;

  v_compat := public._spot_compat(v_uid, p_spot);
  v_status := case when p.selection = 'auto' then 'accepted' else 'pending' end;

  insert into public.spot_applications(spot_id, user_id, status, compat, note, decided_at)
  values (p_spot, v_uid, v_status, v_compat, nullif(left(btrim(coalesce(p_note,'')), 280), ''),
          case when v_status = 'accepted' then now() end)
  on conflict (spot_id, user_id) do update
    set status = excluded.status, compat = excluded.compat, note = excluded.note,
        created_at = now(), decided_at = excluded.decided_at;

  return jsonb_build_object('ok', true, 'status', v_status, 'compat', v_compat,
    'place', case when v_status = 'accepted' then p.place end);
end $function$;

-- ── LE SEAU DES MOMENTS ────────────────────────────────────────────
-- Public en lecture (l'URL n'est rendue qu'à ceux qui ont le droit de la
-- voir, et le nom porte deux UUID : il ne se devine pas) ; en écriture,
-- un membre connecté ne dépose que dans SON dossier. 8 Mo, vidéo seule.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('moments', 'moments', true, 8388608, array['video/webm','video/mp4','video/quicktime'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "moments insert own folder" on storage.objects;
create policy "moments insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "moments delete own" on storage.objects;
create policy "moments delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);


-- ════════════════════════════════════════════════════════════════════
-- LES DROITS — APRÈS LE DERNIER `create`
-- ════════════════════════════════════════════════════════════════════
-- Internes : `service_role` seul.
revoke all on function public._subscriber_of(uuid, uuid) from public, anon, authenticated;
revoke all on function public._spots_subscriber(uuid, uuid) from public, anon, authenticated;
revoke all on function public._thp_number(uuid) from public, anon, authenticated;
revoke all on function public._figher(uuid) from public, anon, authenticated;
revoke all on function public._owner_label(uuid) from public, anon, authenticated;
revoke all on function public._art_media(text, text) from public, anon, authenticated;
revoke all on function public._art_owns_thp(uuid) from public, anon, authenticated;
revoke all on function public._market_incident(text, text, jsonb) from public, anon, authenticated;
revoke all on function public._clip_ok(uuid, text) from public, anon, authenticated;
revoke all on function public._exact_ok(uuid, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public._thp_mint_on_access() from public, anon, authenticated;
revoke all on function public._art_append_only() from public, anon, authenticated;
grant execute on function public._subscriber_of(uuid, uuid) to service_role;
grant execute on function public._spots_subscriber(uuid, uuid) to service_role;
grant execute on function public._thp_number(uuid) to service_role;
grant execute on function public._figher(uuid) to service_role;
grant execute on function public._owner_label(uuid) to service_role;
grant execute on function public._art_media(text, text) to service_role;
grant execute on function public._art_owns_thp(uuid) to service_role;
grant execute on function public._market_incident(text, text, jsonb) to service_role;
grant execute on function public._clip_ok(uuid, text) to service_role;
grant execute on function public._exact_ok(uuid, uuid, text, boolean) to service_role;

-- `is_subscribed_to` est lue par les politiques de `totehms` & co :
-- `authenticated` doit pouvoir l'exécuter (comme avant).
revoke all on function public.is_subscribed_to(uuid) from public, anon;
grant execute on function public.is_subscribed_to(uuid) to authenticated, service_role;

-- Les paiements : les fonctions de paiement (service_role) SEULES.
revoke all on function public.art_primary_reserve(text, uuid) from public, anon, authenticated;
revoke all on function public.art_resale_reserve(uuid, uuid) from public, anon, authenticated;
revoke all on function public.art_reservation_session(uuid, text) from public, anon, authenticated;
revoke all on function public.art_release(uuid) from public, anon, authenticated;
revoke all on function public.art_settle(text, text, uuid, uuid, text, bigint, text) from public, anon, authenticated;
grant execute on function public.art_primary_reserve(text, uuid) to service_role;
grant execute on function public.art_resale_reserve(uuid, uuid) to service_role;
grant execute on function public.art_reservation_session(uuid, text) to service_role;
grant execute on function public.art_release(uuid) to service_role;
grant execute on function public.art_settle(text, text, uuid, uuid, text, bigint, text) to service_role;

-- Vitrines : tout le monde, même sans session.
revoke all on function public.creator_page(text) from public;
grant execute on function public.creator_page(text) to anon, authenticated, service_role;
revoke all on function public.market_view(text, text) from public;
grant execute on function public.market_view(text, text) to anon, authenticated, service_role;
revoke all on function public.my_entitlements() from public;
grant execute on function public.my_entitlements() to anon, authenticated, service_role;
revoke all on function public.spot_rules() from public;
grant execute on function public.spot_rules() to anon, authenticated, service_role;
revoke all on function public.spots_radar(double precision,double precision,integer,text,text,boolean,integer,text,text) from public;
grant execute on function public.spots_radar(double precision,double precision,integer,text,text,boolean,integer,text,text) to anon, authenticated, service_role;
revoke all on function public.spots_past(double precision, double precision, integer, text, integer) from public;
grant execute on function public.spots_past(double precision, double precision, integer, text, integer) to anon, authenticated, service_role;
revoke all on function public.spots_globe(text,text,text,text) from public;
grant execute on function public.spots_globe(text,text,text,text) to anon, authenticated, service_role;
revoke all on function public.moments_feed(double precision, double precision, integer, integer) from public;
grant execute on function public.moments_feed(double precision, double precision, integer, integer) to anon, authenticated, service_role;

-- Connectés seulement.
revoke all on function public.totehm_of(text) from public, anon;
grant execute on function public.totehm_of(text) to authenticated, service_role;
revoke all on function public.my_collection() from public, anon;
grant execute on function public.my_collection() to authenticated, service_role;
revoke all on function public.art_list(uuid, int) from public, anon;
grant execute on function public.art_list(uuid, int) to authenticated, service_role;
revoke all on function public.art_unlist(uuid) from public, anon;
grant execute on function public.art_unlist(uuid) to authenticated, service_role;
revoke all on function public.spot_publish(text,text[],uuid[],bigint[],boolean,timestamptz,integer,text,double precision,double precision,text,integer,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.spot_publish(text,text[],uuid[],bigint[],boolean,timestamptz,integer,text,double precision,double precision,text,integer,text,text,text,text,text,text,text) to authenticated, service_role;
revoke all on function public.moment_publish(text, text[], text, text, double precision, double precision, text, text, text) from public, anon;
grant execute on function public.moment_publish(text, text[], text, text, double precision, double precision, text, text, text) to authenticated, service_role;
revoke all on function public.spot_video_set(uuid, text) from public, anon;
grant execute on function public.spot_video_set(uuid, text) to authenticated, service_role;
revoke all on function public.my_space() from public, anon;
grant execute on function public.my_space() to authenticated, service_role;
revoke all on function public.spot_apply(uuid, text) from public, anon;
grant execute on function public.spot_apply(uuid, text) to authenticated, service_role;
