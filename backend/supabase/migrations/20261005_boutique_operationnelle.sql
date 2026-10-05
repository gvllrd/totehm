-- TOTEHM · 05/10/2026 — LA BOUTIQUE OPÉRATIONNELLE : LE LUXE SUR DEVIS · LE BANC D'ESSAI
--
-- why  : Wah, 05/10 — « tester la boutique Higher : Streetwear, le luxe EN
--        MODE DEVIS, Decode — avec un environnement de test prix ». Le luxe
--        n'est plus un lancement à prix fixe : le membre décrit sa pièce et
--        la Box qui la totehmise, Wah répond par un prix, le membre paie ce
--        prix. Et un compte de test doit pouvoir traverser TOUT le chemin
--        réel (Stripe live, webhook, base) à un prix symbolique.
-- how  : `luxury_quotes` = la demande et sa réponse (RLS sans politique,
--        écrite par l'Edge Function `luxury-quote` en service_role, lue par
--        `luxury_access()` pour le membre et `luxury_quotes_admin()` pour
--        l'administrateur). Le prix d'un devis est posé par un compte de
--        `boutique_admins` (Wah) — c'est son « oui ». `luxury_offer` reste :
--        son prix devient « à partir de ».
--        `boutique_testers` : un prix d'essai PAR COMPTE, `active = false`
--        par défaut — l'activer est un prix live, donc un « oui » de Wah.
--        `create-checkout` et `luxury-checkout` le lisent par
--        `_boutique_test_price()` ; la pièce et la commande portent `test`.
--        `luxury_settle` ne change pas de signature (pas de `drop` depuis
--        le cloud) : `luxury_quote_paid` relie ensuite la commande au devis.
-- retour arrière : `update luxury_offer set active = false where slug = 'launch'`
--        ferme le luxe ; les tables nouvelles peuvent rester vides.

-- ─── 1. Qui administre la boutique, qui teste ─────────────────────────────
create table if not exists public.boutique_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.boutique_admins enable row level security;

create table if not exists public.boutique_testers (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  price_cents int  not null default 100 check (price_cents >= 50),
  active      boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.boutique_testers enable row level security;

create or replace function public._boutique_admin(p_user uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select p_user is not null and exists (select 1 from public.boutique_admins where user_id = p_user);
$function$;

-- Le prix d'essai d'un compte, ou null : jamais un prix pour un autre.
create or replace function public._boutique_test_price(p_user uuid)
 returns int language sql stable security definer set search_path to 'public'
as $function$
  select price_cents from public.boutique_testers where user_id = p_user and active;
$function$;

-- ─── 2. Une pièce ou une commande d'essai se reconnaît ────────────────────
alter table public.totehm_clothes add column if not exists test boolean not null default false;
alter table public.luxury_orders  add column if not exists quote_id uuid;
alter table public.luxury_orders  add column if not exists test boolean not null default false;

-- ─── 3. Le devis luxe ─────────────────────────────────────────────────────
create table if not exists public.luxury_quotes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  email        text not null,
  piece        text not null check (piece in ('bag', 'jacket', 'shoes', 'other')),
  brand        text not null check (char_length(brand) between 1 and 40),
  note         text check (char_length(note) <= 280),
  box_kind     text check (box_kind in ('habit', 'objective', 'repulsion', 'wisdom', 'vision')),
  box_ref      text,
  box_snapshot jsonb,
  palette      text[] not null default '{}',
  status       text not null default 'requested'
               check (status in ('requested', 'quoted', 'paid', 'declined', 'cancelled')),
  quote_cents  int check (quote_cents is null or quote_cents >= 50),
  currency     text not null default 'eur',
  quote_note   text check (char_length(quote_note) <= 280),
  quoted_at    timestamptz,
  paid_at      timestamptz,
  session_id   text unique,
  test         boolean not null default false,
  created_at   timestamptz not null default now()
);
alter table public.luxury_quotes enable row level security;
create index if not exists luxury_quotes_user_idx   on public.luxury_quotes (user_id, created_at desc);
create index if not exists luxury_quotes_status_idx on public.luxury_quotes (status, created_at);

-- Ce que la page /luxury lit : l'accès, le « à partir de », SES devis.
create or replace function public.luxury_access()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); o public.luxury_offer;
begin
  select * into o from public.luxury_offer where slug = 'launch';
  return jsonb_build_object(
    'mode',        'quote',
    'signed_in',   v_uid is not null,
    'thp',         v_uid is not null and public._art_owns_thp(v_uid),
    'open',        coalesce(o.active, false),
    'price_cents', o.price_cents,
    'currency',    coalesce(o.currency, 'eur'),
    'orders',      case when v_uid is null then 0
                        else (select count(*) from public.luxury_orders l where l.user_id = v_uid) end,
    'admin',       public._boutique_admin(v_uid),
    'test_price_cents', case when v_uid is null then null else public._boutique_test_price(v_uid) end,
    'quotes',      case when v_uid is null then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', q.id, 'piece', q.piece, 'brand', q.brand, 'note', q.note, 'status', q.status,
               'quote_cents', q.quote_cents, 'currency', q.currency, 'quote_note', q.quote_note,
               'view', q.box_snapshot->>'view', 'text', q.box_snapshot->>'text',
               'palette', to_jsonb(q.palette), 'created_at', q.created_at)
             order by q.created_at desc)
        from (select * from public.luxury_quotes where user_id = v_uid
               order by created_at desc limit 10) q), '[]'::jsonb) end);
end $function$;

-- Ce que l'administrateur lit : les demandes ouvertes, de qui, sur quelle Box.
create or replace function public.luxury_quotes_admin()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
begin
  if not public._boutique_admin(auth.uid()) then
    return jsonb_build_object('error', 'forbidden');
  end if;
  return jsonb_build_object('quotes', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', q.id, 'pseudo', p.pseudo, 'email', q.email, 'piece', q.piece, 'brand', q.brand,
             'note', q.note, 'status', q.status, 'quote_cents', q.quote_cents, 'currency', q.currency,
             'quote_note', q.quote_note, 'view', q.box_snapshot->>'view', 'text', q.box_snapshot->>'text',
             'palette', to_jsonb(q.palette), 'test', q.test, 'created_at', q.created_at)
           order by q.created_at)
      from (select * from public.luxury_quotes where status in ('requested', 'quoted')
             order by created_at limit 50) q
      left join public.profiles p on p.id = q.user_id), '[]'::jsonb));
end $function$;

-- Écrit par le webhook, APRÈS `luxury_settle` : la commande payée ferme le devis.
create or replace function public.luxury_quote_paid(p_quote uuid, p_session text, p_test boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_id uuid;
begin
  update public.luxury_quotes
     set status = 'paid', paid_at = coalesce(paid_at, now()), session_id = p_session,
         test = coalesce(p_test, false)
   where id = p_quote and status in ('quoted', 'paid')
  returning id into v_id;
  update public.luxury_orders set quote_id = p_quote, test = coalesce(p_test, false)
   where session_id = p_session;
  return jsonb_build_object('ok', v_id is not null);
end $function$;

-- ─── 4. Droits — APRÈS le dernier `create` ────────────────────────────────
revoke all on function public._boutique_admin(uuid) from public, anon, authenticated;
grant execute on function public._boutique_admin(uuid) to service_role;
revoke all on function public._boutique_test_price(uuid) from public, anon, authenticated;
grant execute on function public._boutique_test_price(uuid) to service_role;
revoke all on function public.luxury_access() from public;
grant execute on function public.luxury_access() to anon, authenticated, service_role;
revoke all on function public.luxury_quotes_admin() from public, anon;
grant execute on function public.luxury_quotes_admin() to authenticated, service_role;
revoke all on function public.luxury_quote_paid(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.luxury_quote_paid(uuid, text, boolean) to service_role;
