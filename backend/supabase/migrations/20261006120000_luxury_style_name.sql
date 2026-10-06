-- BOUTIQUE · 06/10/2026 (ter) — Luxury : le style du moment et le nom 0.{Nom}
-- why : Wah, 06/10 — « pour la totehmisation streetwear et luxury il faut
--       choisir un style artistique du moment qui est dans la table de
--       Supabase, et aussi le nom du Totehm Cloth, puisque [Decode a Totehm
--       Cloth] utilise ce nom, qui commence automatiquement par 0.{{Nom}}
--       (0 = l'année en cours) ». Streetwear les avait (create-checkout) ;
--       la demande de devis Luxury, non : une pièce de luxe payée n'avait
--       aucun nom, Decode ne pouvait pas la trouver.
-- how : ADDITIF. Deux colonnes sur `luxury_quotes` (le nom complet, préfixe
--       compris, et le style `artistic_styles`), un index unique sur les noms
--       VIVANTS (demandé · chiffré · payé : un devis retiré ou refusé rend son
--       nom), `name_available` regarde les DEUX tables (un nom Streetwear ne
--       peut pas reprendre un nom Luxury, et l'inverse), `reveal_cloth` trouve
--       aussi une pièce Luxury payée et dit son style. `luxury_access` et
--       `luxury_quotes_admin` rendent le nom et le style. Aucun prix, aucun
--       paiement, aucun webhook ne change.
-- what : le préfixe est posé par `luxury-quote` (serveur), jamais reçu.

alter table public.luxury_quotes add column if not exists name text;
alter table public.luxury_quotes add column if not exists style_id uuid references public.artistic_styles(id);
alter table public.luxury_quotes add constraint luxury_quotes_name_check
  check (name is null or char_length(name) between 4 and 48);
create unique index if not exists luxury_quotes_name_live
  on public.luxury_quotes (lower(btrim(name)))
  where name is not null and status in ('requested', 'quoted', 'paid');

-- Un nom est libre s'il n'est ni une pièce Streetwear, ni un devis Luxury vivant.
create or replace function public.name_available(candidate text)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select not exists (select 1 from public.totehm_clothes where lower(name) = lower(btrim(candidate)))
     and not exists (select 1 from public.luxury_quotes
                      where name is not null and status in ('requested', 'quoted', 'paid')
                        and lower(btrim(name)) = lower(btrim(candidate)));
$function$;

-- Decode : la MÊME règle qu'avant (invité : la vue et la date ; FIGHER : la
-- Box ; propriétaire/abonné : + la matière), sur une pièce Streetwear OU Luxury.
create or replace function public.reveal_cloth(p_name text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_me uuid := auth.uid(); v_level text; v_snap jsonb; v_owner_pseudo text; v_shared boolean;
        v_id uuid; v_user uuid; v_cname text; v_kind text; v_msg text; v_at timestamptz;
        v_style uuid; v_style_name text; v_line text := 'streetwear';
begin
  select tc.id, tc.user_id, tc.name, tc.box_kind, tc.box_snapshot, tc.message, tc.created_at, tc.style_id
    into v_id, v_user, v_cname, v_kind, v_snap, v_msg, v_at, v_style
    from public.totehm_clothes tc
   where lower(btrim(tc.name)) = lower(btrim(p_name)) and tc.paid_at is not null
   order by tc.created_at desc limit 1;
  if v_id is null then
    select q.id, q.user_id, q.name, q.box_kind, q.box_snapshot, null::text, q.paid_at, q.style_id
      into v_id, v_user, v_cname, v_kind, v_snap, v_msg, v_at, v_style
      from public.luxury_quotes q
     where q.name is not null and lower(btrim(q.name)) = lower(btrim(p_name))
       and q.status = 'paid' and q.paid_at is not null
     order by q.paid_at desc limit 1;
    v_line := 'luxury';
  end if;
  if v_id is null then return jsonb_build_object('found', false); end if;

  if v_kind is null then
    return jsonb_build_object('found', true, 'name', v_cname, 'legacy', true,
      'level', 'full', 'message', v_msg, 'created_at', v_at::date);
  end if;

  select s.name into v_style_name from public.artistic_styles s where s.id = v_style;
  v_snap := coalesce(v_snap, '{}'::jsonb);
  if v_me is not null and (v_user = v_me or public.is_subscribed_to(v_user)) then
    v_level := 'full';
  elsif v_me is not null and public._is_figher(v_me) then
    v_level := 'member';
  else
    v_level := 'locked';
  end if;

  select exists (select 1 from public.totehms t where t.user_id = v_user
                  and t.totehm_visibility in ('subscribers','members')) into v_shared;
  if v_shared or v_user = v_me then
    select pseudo into v_owner_pseudo from public.profiles where id = v_user;
  end if;

  return jsonb_build_object(
    'found', true, 'name', v_cname, 'legacy', false, 'level', v_level, 'line', v_line,
    'style', v_style_name, 'view', v_snap->>'view', 'created_at', v_at::date,
    'palette', case when v_level = 'locked' then null else v_snap->'palette' end,
    'text',   case when v_level = 'locked' then null else v_snap->>'text' end,
    'is',     case when v_level = 'locked' then null else v_snap->'is' end,
    'owner',  case when v_level = 'locked' then null else v_owner_pseudo end,
    'matter', case when v_level = 'full'   then v_snap->'matter' else null end);
end $function$;

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
    'test_mode',   public._boutique_test_mode(v_uid),
    'quotes',      case when v_uid is null then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', q.id, 'piece', q.piece, 'brand', q.brand, 'note', q.note, 'status', q.status,
               'quote_cents', q.quote_cents, 'currency', q.currency, 'quote_note', q.quote_note,
               'view', q.box_snapshot->>'view', 'text', q.box_snapshot->>'text',
               'palette', to_jsonb(q.palette), 'created_at', q.created_at,
               'name', q.name, 'style', (select s.name from public.artistic_styles s where s.id = q.style_id))
             order by q.created_at desc)
        from (select * from public.luxury_quotes where user_id = v_uid
               order by created_at desc limit 10) q), '[]'::jsonb) end);
end $function$;

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
             'palette', to_jsonb(q.palette), 'test', q.test, 'created_at', q.created_at,
             'name', q.name, 'style', (select s.name from public.artistic_styles s where s.id = q.style_id))
           order by q.created_at)
      from (select * from public.luxury_quotes where status in ('requested', 'quoted')
             order by created_at limit 50) q
      left join public.profiles p on p.id = q.user_id), '[]'::jsonb));
end $function$;

-- Droits — APRÈS le dernier `create` (create or replace rend le GRANT à PUBLIC).
revoke all on function public.name_available(text) from public;
grant execute on function public.name_available(text) to anon, authenticated, service_role;
revoke all on function public.reveal_cloth(text) from public;
grant execute on function public.reveal_cloth(text) to anon, authenticated, service_role;
revoke all on function public.luxury_access() from public;
grant execute on function public.luxury_access() to anon, authenticated, service_role;
revoke all on function public.luxury_quotes_admin() from public, anon;
grant execute on function public.luxury_quotes_admin() to authenticated, service_role;
