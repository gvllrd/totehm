-- TOTEHM · TotehmSM v2 · 08/10/2026 — le Higher Self en freemium.
-- why : Wah, 08/10 — « il faut que le membre ait rempli un minimum son Totehm :
--       au moins 1 élément dans les vues Habit et Objective. Le nombre de
--       génération est de 7 messages au format freemium. Pas besoin de garder
--       un historique de conversation. »
-- how : additive, rien n'est supprimé. Plus de texte stocké : `sm_uses` ne
--       compte que des USAGES (qui, quand, quoi, modèle, durée, jetons) — la
--       conversation vit dans la page et meurt avec elle. Une seule source pour
--       les règles (`_sm_rules`), une seule pour l'état (`_sm_state`) : la page
--       (`my_landing().sm`) et la fonction `higher-self` (`sm_begin`) lisent la
--       même chose. `sm_begin` est sérialisé par membre (verrou) : deux onglets
--       ne passent pas sous le plafond ensemble. Un usage resté `pending` plus
--       de deux minutes (fonction tombée) ne compte plus.
--       `sm_messages` et `sm_thread` ne servent plus : ménage par Claude Code
--       (`20261008200001_higher_self_menage.sql`).
-- cost : 7 générations gratuites / 30 jours (acquisition, mesurée en §0),
--        Higher = 30 / 24 h.

create table if not exists public.sm_uses (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('say', 'telegram')),
  status text not null default 'pending' check (status in ('pending', 'ok', 'failed')),
  model text check (model is null or char_length(model) <= 40),
  ms int, tokens_in int, tokens_out int,
  created_at timestamptz not null default now());
create index if not exists sm_uses_user_at on public.sm_uses (user_id, kind, created_at desc);
alter table public.sm_uses enable row level security;
revoke all on table public.sm_uses from anon, authenticated;

-- Les règles, à UN endroit.
create or replace function public._sm_rules()
 returns jsonb
 language sql
 immutable
 set search_path to ''
as $function$
  select jsonb_build_object('free', 7, 'free_days', 30, 'higher_day', 30, 'telegram_day', 30);
$function$;

-- L'abonnement Higher (ou un accès offert), pour un membre donné : la règle
-- de `totehmbot_access()`, sans dépendre de la session.
create or replace function public._higher_active(p_user uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select coalesce((select b.status in ('active', 'trialing') from public.bot_subscriptions b where b.user_id = p_user), false)
      or exists (select 1 from public.figher_comps c join auth.users u on lower(u.email) = lower(c.email)
                  where u.id = p_user and (c.expires_at is null or c.expires_at > now()));
$function$;

-- Ce qui compte : un usage réussi, ou en cours depuis moins de deux minutes.
create or replace function public._sm_count(p_user uuid, p_kind text, p_since timestamptz)
 returns int
 language sql
 stable security definer
 set search_path to ''
as $function$
  select count(*)::int from public.sm_uses u
   where u.user_id = p_user and u.kind = p_kind and u.created_at > p_since
     and (u.status = 'ok' or (u.status = 'pending' and u.created_at > now() - interval '2 minutes'));
$function$;

-- L'état TotehmSM d'un membre : prêt (Habit + Objective non vides), Higher,
-- combien il en reste.
create or replace function public._sm_state(p_user uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_c jsonb := public.totehm_complete(p_user); v_r jsonb := public._sm_rules();
        v_h boolean := public._higher_active(p_user);
        v_hab boolean; v_obj boolean; v_free int; v_day int;
begin
  v_hab := coalesce((v_c->>'habits')::boolean, false);
  v_obj := coalesce((v_c->>'objectives')::boolean, false);
  v_free := greatest(0, (v_r->>'free')::int
            - public._sm_count(p_user, 'say', now() - make_interval(days => (v_r->>'free_days')::int)));
  v_day := greatest(0, (v_r->>'higher_day')::int - public._sm_count(p_user, 'say', now() - interval '24 hours'));
  return jsonb_build_object('habit', v_hab, 'objective', v_obj, 'ready', v_hab and v_obj,
    'higher', v_h, 'free_total', (v_r->>'free')::int, 'free_days', (v_r->>'free_days')::int,
    'free_left', v_free, 'left', case when v_h then v_day else v_free end);
end $function$;

-- Ouvrir un usage (service_role : la fonction `higher-self`, après avoir lu
-- la session). Refus : `totehm` (Habit ou Objective vide), `higher_required`
-- (les 7 gratuits sont pris), `quota` (Higher : 30 par 24 h).
create or replace function public.sm_begin(p_user uuid, p_kind text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_s jsonb; v_r jsonb := public._sm_rules(); v_id bigint;
begin
  if p_user is null or p_kind is null or p_kind not in ('say', 'telegram') then
    return jsonb_build_object('ok', false, 'why', 'bad');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('sm:' || p_user::text, 0));
  v_s := public._sm_state(p_user);
  if p_kind = 'say' then
    if not (v_s->>'ready')::boolean then return jsonb_build_object('ok', false, 'why', 'totehm', 'state', v_s); end if;
    if (v_s->>'left')::int <= 0 then
      return jsonb_build_object('ok', false, 'why',
        case when (v_s->>'higher')::boolean then 'quota' else 'higher_required' end, 'state', v_s);
    end if;
  else
    if not (v_s->>'higher')::boolean then return jsonb_build_object('ok', false, 'why', 'higher_required', 'state', v_s); end if;
    if public._sm_count(p_user, 'telegram', now() - interval '24 hours') >= (v_r->>'telegram_day')::int then
      return jsonb_build_object('ok', false, 'why', 'quota', 'state', v_s);
    end if;
  end if;
  insert into public.sm_uses (user_id, kind) values (p_user, p_kind) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'higher', (v_s->>'higher')::boolean,
    'left', case when p_kind = 'say' then greatest(0, (v_s->>'left')::int - 1) end);
end $function$;

-- Fermer un usage : `ok` (il compte) ou `failed` (il ne compte pas).
create or replace function public.sm_end(p_id bigint, p_status text, p_model text default null,
                                         p_ms int default null, p_in int default null, p_out int default null)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  update public.sm_uses
     set status = case when p_status = 'ok' then 'ok' else 'failed' end,
         model = left(p_model, 40), ms = p_ms, tokens_in = p_in, tokens_out = p_out
   where id = p_id and status = 'pending';
  return found;
end $function$;

-- L'atterrissage gagne `sm` : ce que la vue du bas doit dire, en une lecture.
create or replace function public.my_landing()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_bot jsonb; v_vis text; v_cp record; v_r jsonb := public._sm_rules();
begin
  v_bot := public.totehmbot_access();
  if v_uid is null then
    return jsonb_build_object('signed_in', false, 'thp', false,
      'higher', jsonb_build_object('active', false, 'price_cents', v_bot->'price_cents',
                                   'currency', coalesce(v_bot->>'currency', 'eur'), 'period', v_bot->'period'),
      'sm', jsonb_build_object('ready', false, 'free_total', (v_r->>'free')::int, 'free_days', (v_r->>'free_days')::int));
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
                     where cs.creator_id = v_uid and cs.status in ('active', 'trialing')),
    'sm', public._sm_state(v_uid));
end $function$;

-- Les droits, APRÈS le dernier `create`.
revoke all on function public._sm_rules() from public, anon, authenticated;
revoke all on function public._higher_active(uuid) from public, anon, authenticated;
revoke all on function public._sm_count(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public._sm_state(uuid) from public, anon, authenticated;
revoke all on function public.sm_begin(uuid, text) from public, anon, authenticated;
revoke all on function public.sm_end(bigint, text, text, int, int, int) from public, anon, authenticated;
grant execute on function public.sm_begin(uuid, text) to service_role;
grant execute on function public.sm_end(bigint, text, text, int, int, int) to service_role;
revoke all on function public.my_landing() from public;
grant execute on function public.my_landing() to anon, authenticated;
