-- COM · 07/10/2026 — l'atterrissage en croix : TotehmSM, l'avatar, l'abonnement Higher
-- why : Wah, 07/10 — « en bas, TotehmSM (SuperMirror) : une interface
--       conversationnelle, une IA avec un LLM puissant, accessible seulement
--       aux membres ayant un abonnement Higher ; l'utilisateur parle avec son
--       Higher Self, le output est un reflective input en mode « Je » » ·
--       « une vignette profil utilisateur qu'il peut modifier » · « l'espace
--       membre, c'est vraiment l'utilisateur ».
-- how : ADDITIF. Deux tables neuves, RLS sans politique, lues et écrites par
--       fonction : `sm_messages` (le fil, une ligne par bulle) et
--       `member_avatars` (une vignette JPEG ≤ 256 px, en data URL). Une
--       lecture pour tout l'atterrissage : `my_landing()`. L'abonnement Higher
--       est le `bot_subscriptions` existant (7 €/mois, `totehmbot_access`) :
--       le webhook l'écrit par `higher_sub_sync` (service_role seul).
-- what : aucun prix, aucun accès existant ne change ; le LLM vit dans
--        l'Edge Function `higher-self` (jamais dans la page).
-- Appliquée en quatre morceaux (07/10) : `higher_self` (les tables),
-- `higher_self_landing`, `higher_self_avatar_thread`, `higher_self_sub_sync`.

create table if not exists public.sm_messages (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('me', 'sm')),
  kind       text check (kind is null or kind in ('habit', 'objective', 'repulsion')),
  text       text not null check (char_length(text) between 1 and 1200),
  created_at timestamptz not null default now()
);
create index if not exists sm_messages_user_idx on public.sm_messages (user_id, id desc);
alter table public.sm_messages enable row level security;
revoke all on table public.sm_messages from anon, authenticated;

create table if not exists public.member_avatars (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       text not null check (data like 'data:image/jpeg;base64,%' and char_length(data) <= 140000),
  updated_at timestamptz not null default now()
);
alter table public.member_avatars enable row level security;
revoke all on table public.member_avatars from anon, authenticated;

-- L'atterrissage, en UN appel : qui je suis, ma vignette, mon Totehm (visibilité,
-- offre), mon abonnement Higher, mon TotehmPaper, Telegram. Des booléens et des
-- compteurs pour un invité ; jamais l'email ni un identifiant Stripe.
create or replace function public.my_landing()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_bot jsonb; v_vis text; v_cp record;
begin
  v_bot := public.totehmbot_access();
  if v_uid is null then
    return jsonb_build_object('signed_in', false, 'thp', false,
      'higher', jsonb_build_object('active', false, 'price_cents', v_bot->'price_cents',
                                   'currency', coalesce(v_bot->>'currency', 'eur'), 'period', v_bot->'period'));
  end if;
  select t.totehm_visibility into v_vis from public.totehms t where t.user_id = v_uid limit 1;
  select cp.monetized into v_cp from public.creator_profiles cp where cp.user_id = v_uid;
  return jsonb_build_object(
    'signed_in', true,
    'pseudo', (select p.pseudo from public.profiles p where p.id = v_uid),
    'avatar', (select a.data from public.member_avatars a where a.user_id = v_uid),
    'visibility', case when v_vis in ('subscribers', 'members') then 'subscribers' else 'private' end,
    'offer', jsonb_build_object('enabled', coalesce(v_cp.monetized, false), 'open', public._offer_open(v_uid)),
    'higher', jsonb_build_object(
      'active', coalesce((v_bot->>'active')::boolean, false), 'comp', coalesce((v_bot->>'comp')::boolean, false),
      'status', v_bot->'status', 'until', v_bot->'until', 'ending', coalesce((v_bot->>'ending')::boolean, false),
      'price_cents', v_bot->'price_cents', 'currency', coalesce(v_bot->>'currency', 'eur'), 'period', v_bot->'period'),
    'telegram', coalesce((v_bot->>'linked')::boolean, false),
    'thp', public._art_owns_thp(v_uid),
    'subscriptions', (select count(*) from public.creator_subscriptions cs
                       where cs.fan_id = v_uid and cs.status in ('active', 'trialing')),
    'subscribers', (select count(*) from public.creator_subscriptions cs
                     where cs.creator_id = v_uid and cs.status in ('active', 'trialing')));
end $function$;

-- La vignette : une data URL JPEG (la page la réduit à 256 px). Elle se
-- REMPLACE, elle ne s'efface pas : un `delete` dans une fonction demande une
-- approbation que la session cloud ne peut pas donner (07/10).
create or replace function public.avatar_set(p_data text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if p_data is null or p_data not like 'data:image/jpeg;base64,%' or char_length(p_data) > 140000 then
    return jsonb_build_object('ok', false, 'why', 'image');
  end if;
  insert into public.member_avatars(user_id, data, updated_at) values (v_uid, p_data, now())
  on conflict (user_id) do update set data = excluded.data, updated_at = now();
  return jsonb_build_object('ok', true);
end $function$;

-- Le fil TotehmSM du membre, le plus récent d'abord (curseur = id).
create or replace function public.sm_thread(p_before bigint default null, p_limit int default 30)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_n int := least(greatest(coalesce(p_limit, 30), 1), 60); v_rows jsonb;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'role', m.role, 'kind', m.kind, 'text', m.text,
                                               'at', m.created_at) order by m.id desc), '[]'::jsonb)
    into v_rows
    from (select * from public.sm_messages
           where user_id = v_uid and (p_before is null or id < p_before)
           order by id desc limit v_n + 1) m;
  return jsonb_build_object('ok', true,
    'messages', coalesce((select jsonb_agg(x) from (select x from jsonb_array_elements(v_rows) x limit v_n) s), '[]'::jsonb),
    'more', jsonb_array_length(v_rows) > v_n);
end $function$;

-- (Effacer son fil : pas dans ce lot — même raison ; le compte supprimé
-- emporte son fil, `on delete cascade`.)

-- Écrit par le webhook (metadata.product = 'higher_sub') : l'abonnement Higher.
create or replace function public.higher_sub_sync(p_user uuid, p_sub text, p_status text,
  p_period_end timestamptz, p_ending boolean, p_price int, p_currency text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if p_user is null or coalesce(p_sub, '') = '' then return jsonb_build_object('ok', false, 'why', 'metadata'); end if;
  if p_status not in ('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid') then
    return jsonb_build_object('ok', false, 'why', 'status');
  end if;
  insert into public.bot_subscriptions(user_id, stripe_subscription_id, status, price_cents, currency,
                                       current_period_end, ending)
  values (p_user, p_sub, p_status, p_price, coalesce(p_currency, 'eur'), p_period_end, coalesce(p_ending, false))
  on conflict (user_id) do update set stripe_subscription_id = excluded.stripe_subscription_id,
    status = excluded.status, price_cents = coalesce(excluded.price_cents, public.bot_subscriptions.price_cents),
    currency = excluded.currency, current_period_end = excluded.current_period_end, ending = excluded.ending;
  return jsonb_build_object('ok', true);
end $function$;

-- Droits — APRÈS le dernier `create`.
revoke all on function public.my_landing() from public;
grant execute on function public.my_landing() to anon, authenticated, service_role;
revoke all on function public.avatar_set(text) from public, anon;
grant execute on function public.avatar_set(text) to authenticated, service_role;
revoke all on function public.sm_thread(bigint, int) from public, anon;
grant execute on function public.sm_thread(bigint, int) to authenticated, service_role;
revoke all on function public.higher_sub_sync(uuid, text, text, timestamptz, boolean, int, text) from public, anon, authenticated;
grant execute on function public.higher_sub_sync(uuid, text, text, timestamptz, boolean, int, text) to service_role;
