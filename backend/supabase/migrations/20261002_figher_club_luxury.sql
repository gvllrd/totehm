-- TOTEHM · 02/10/2026 — FIGHER.CLUB : DEUX CLÉS · LA TOTEHMISATION LUXE
--
-- why  : Wah, 02/10 — « le figher.club est accessible à toute personne
--        possédant un TotehmPaper et au moins une Habit Box ». Les trois
--        clés (Totehm complet · THP · annuel) deviennent deux : THP + une
--        Habit Box non vide. L'annuel ne fait plus partie de la règle.
--        Et : la totehmisation LUXE se lance à 500 €, réservée aux
--        propriétaires d'un TotehmPaper.
-- how  : `_figher()` reste LA fonction ; seul `member` change (et une clé
--        `habit` s'ajoute). Les clés `complete`, `annual`, `trial` restent
--        dans la réponse : des pages déployées les lisent encore.
--        L'achat d'art (primaire, revente, `market_view.can_buy_art`) suit
--        la même porte : `_is_figher()` au lieu de `_art_owns_thp()`. Le
--        code de refus reste `thp_required` (artwork-checkout et
--        market-checkout le lisent tel quel).
--        Le luxe : le prix vit dans `luxury_offer` (une ligne, jamais dans
--        une page), la commande dans `luxury_orders`, écrite SEULEMENT par
--        le webhook (`luxury_settle`, idempotent sur la session).
-- retour arrière : rejouer `_figher` du 30/09 (20260930_la_source_unique.sql),
--        remplacer `_is_figher(` par `_art_owns_thp(` dans les trois
--        fonctions, `update luxury_offer set active = false where slug = 'launch'`.

-- ─── 1. La règle FIGHER : THP + une Habit Box ─────────────────────────────
create or replace function public._figher(p_user uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_pass jsonb; v_email text; v_num int; v_thp boolean; v_st text; v_complete boolean;
  v_habit boolean; v_comp boolean := false;
begin
  if p_user is null then
    return jsonb_build_object('signed_in', false, 'complete', false, 'remplies', 0, 'habit', false,
      'thp', false, 'number', null, 'annual', false, 'trial', false, 'member', false, 'comp', false);
  end if;

  v_pass := public.totehm_complete(p_user);
  v_complete := coalesce((v_pass->>'complete')::boolean, false);
  v_habit    := coalesce((v_pass->>'habits')::boolean, false);

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
      'habits',     v_habit,
      'objectives', coalesce((v_pass->>'objectives')::boolean, false),
      'repulsions', coalesce((v_pass->>'repulsions')::boolean, false),
      'wisdom',     coalesce((v_pass->>'wisdom')::boolean, false),
      'visions',    coalesce((v_pass->>'visions')::boolean, false)),
    'habit',  v_habit,
    'thp',    v_thp,
    'number', v_num,
    'annual', coalesce(v_st in ('active','trialing'), false),
    'trial',  coalesce(v_st = 'trialing', false),
    'comp',   v_comp,
    'member', v_comp or (v_thp and v_habit));
end $function$;

-- ─── 2. L'achat d'art suit la même porte ──────────────────────────────────
-- Remplacement textuel contrôlé : si l'appel n'est plus là, on s'arrête
-- (une fonction réécrite ailleurs ne doit pas être écrasée à l'aveugle).
do $$
declare r record; v text;
begin
  for r in select p.oid from pg_proc p
            where p.pronamespace = 'public'::regnamespace
              and p.proname in ('art_primary_reserve', 'art_resale_reserve', 'market_view')
  loop
    v := pg_get_functiondef(r.oid);
    if position('public._art_owns_thp(' in v) = 0 then
      raise exception 'porte introuvable dans %', r.oid::regprocedure;
    end if;
    execute replace(v, 'public._art_owns_thp(', 'public._is_figher(');
  end loop;
end $$;

-- `market_view` dit aussi ce qui manque (la page ne recompose pas la règle).
do $$
declare v text;
begin
  v := pg_get_functiondef('public.market_view(text, text)'::regprocedure);
  if position('''can_buy_art'', v_uid is not null and public._is_figher(v_uid),' in v) = 0 then
    raise exception 'market_view : ligne can_buy_art introuvable';
  end if;
  execute replace(v,
    '''can_buy_art'', v_uid is not null and public._is_figher(v_uid),',
    '''can_buy_art'', v_uid is not null and public._is_figher(v_uid),
    ''door'', (select jsonb_build_object(''thp'', coalesce((f->>''thp'')::boolean, false),
                                         ''habit'', coalesce((f->>''habit'')::boolean, false))
               from (select public._figher(v_uid) f) x),');
end $$;

-- ─── 3. La totehmisation LUXE ──────────────────────────────────────────────
create table if not exists public.luxury_offer (
  slug        text primary key,
  price_cents int  not null check (price_cents > 0),
  currency    text not null default 'eur',
  active      boolean not null default true,
  updated_at  timestamptz not null default now()
);
alter table public.luxury_offer enable row level security;

-- 500 € pour lancer une totehmisation luxe (Wah, 02/10/2026).
insert into public.luxury_offer (slug, price_cents, currency)
values ('launch', 50000, 'eur')
on conflict (slug) do nothing;

create table if not exists public.luxury_orders (
  id           uuid primary key default gen_random_uuid(),
  session_id   text not null unique,
  user_id      uuid references auth.users(id) on delete set null,
  email        text not null,
  piece        text not null check (piece in ('bag', 'jacket', 'shoes', 'other')),
  note         text check (note is null or char_length(note) <= 280),
  amount_cents int  not null,
  currency     text not null,
  status       text not null default 'paid'
               check (status in ('paid', 'contacted', 'in_progress', 'delivered', 'cancelled')),
  created_at   timestamptz not null default now()
);
alter table public.luxury_orders enable row level security;

-- Ce que la page lit : le prix (public) et si le membre a son THP.
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
    'signed_in',   v_uid is not null,
    'thp',         v_uid is not null and public._art_owns_thp(v_uid),
    'open',        coalesce(o.active, false),
    'price_cents', o.price_cents,
    'currency',    coalesce(o.currency, 'eur'),
    'orders',      case when v_uid is null then 0
                        else (select count(*) from public.luxury_orders l where l.user_id = v_uid) end);
end $function$;

-- Écrit par le webhook seul, une fois par session Stripe.
create or replace function public.luxury_settle(
  p_session text, p_user uuid, p_email text, p_piece text, p_note text,
  p_amount int, p_currency text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_id uuid;
begin
  insert into public.luxury_orders (session_id, user_id, email, piece, note, amount_cents, currency)
  values (p_session, p_user, lower(p_email),
          case when p_piece in ('bag', 'jacket', 'shoes', 'other') then p_piece else 'other' end,
          nullif(left(coalesce(p_note, ''), 280), ''), p_amount, lower(p_currency))
  on conflict (session_id) do nothing
  returning id into v_id;
  return jsonb_build_object('ok', true, 'new', v_id is not null);
end $function$;

-- ─── 4. Droits — APRÈS le dernier `create` ────────────────────────────────
revoke all on function public._figher(uuid) from public, anon, authenticated;
grant execute on function public._figher(uuid) to service_role;
revoke all on function public.art_primary_reserve(text, uuid) from public, anon, authenticated;
grant execute on function public.art_primary_reserve(text, uuid) to service_role;
revoke all on function public.art_resale_reserve(uuid, uuid) from public, anon, authenticated;
grant execute on function public.art_resale_reserve(uuid, uuid) to service_role;
grant execute on function public.market_view(text, text) to anon, authenticated;
revoke all on function public.luxury_access() from public;
grant execute on function public.luxury_access() to anon, authenticated, service_role;
revoke all on function public.luxury_settle(text, uuid, text, text, text, int, text) from public, anon, authenticated;
grant execute on function public.luxury_settle(text, uuid, text, text, text, int, text) to service_role;
