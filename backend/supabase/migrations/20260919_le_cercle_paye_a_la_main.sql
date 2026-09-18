-- TOTEHM · LE CERCLE, ET LES VIREMENTS À LA MAIN · 19/09/2026
-- ════════════════════════════════════════════════════════════════════
-- Stripe Connect est ABANDONNÉ pour les créateurs. Il exigeait un profil
-- plateforme qui a bloqué tout le monde trois jours, un KYC par
-- créateur, et un compte connecté avant le premier euro — pour virer
-- 80 % à une poignée de gens une fois par mois.
-- L'argent arrive donc ENTIER sur le compte de la plateforme, et les
-- 80 % partent à la main le 1er, vers l'IBAN ou le PayPal posé ici.
-- À cent créateurs, Connect redeviendra le bon outil : ces tables ne
-- bougeront pas, seule la sortie changera.
--
-- ⚠️ `stripe_account_id`, `charges_enabled`, `payouts_enabled` RESTENT.
-- Les colonnes ne se suppriment pas : elles sont vides, elles ne coûtent
-- rien, et elles reprennent leur rôle le jour où Connect revient.
-- Une colonne effacée est une migration de retour à écrire.
--
-- ⚠️ L'IBAN EST STOCKÉ EN CLAIR, ET JE LE DIS. Postgres est chiffré au
-- repos chez Supabase, la table est en RLS, et la lecture passe par
-- `creator_cercle()` qui n'en rend JAMAIS que les 4 derniers caractères.
-- Ce n'est pas un coffre-fort : c'est un carnet d'adresses bancaires.
-- Le jour où il y a cent créateurs, il passe dans Stripe Connect et
-- cette colonne se vide.
-- ════════════════════════════════════════════════════════════════════

alter table public.creator_profiles
  add column if not exists payout_method text,
  add column if not exists payout_handle text;

alter table public.creator_profiles
  drop constraint if exists creator_payout_method_chk;
alter table public.creator_profiles
  add constraint creator_payout_method_chk
  check (payout_method is null or payout_method in ('iban','paypal'));

-- ── Le créateur pose OÙ VIRER. Deux choses, pas douze.
create or replace function public.creator_payout_set(p_method text, p_handle text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if p_method not in ('iban','paypal') then raise exception 'unknown method'; end if;
  if btrim(coalesce(p_handle,'')) = '' then raise exception 'no handle'; end if;
  insert into public.creator_profiles(user_id, payout_method, payout_handle)
  values (v_uid, p_method, btrim(p_handle))
  on conflict (user_id) do update
    set payout_method = excluded.payout_method,
        payout_handle = excluded.payout_handle;
end $function$;

-- ── Tout le tiroir en UN appel : prix, abonnés, ma part, où je suis payé,
--    et si mon Totehm ouvre la porte. Cinq requêtes côté page, c'était
--    cinq allers-retours pour dessiner un seul écran.
create or replace function public.creator_cercle()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_prix int; v_dev text; v_meth text; v_handle text;
  v_n int; v_brut bigint;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;

  select custom_sub_price, currency, payout_method, payout_handle
    into v_prix, v_dev, v_meth, v_handle
    from public.creator_profiles where user_id = v_uid;

  select count(*), coalesce(sum(amount_cents),0) into v_n, v_brut
    from public.creator_subscriptions
   where creator_id = v_uid and status in ('active','trialing');

  return jsonb_build_object(
    'signed_in', true,
    'prix', v_prix,
    'devise', coalesce(v_dev,'eur'),
    'abonnes', v_n,
    -- On montre SA part, pas le brut : un créateur qui lit 1 000 € et
    -- reçoit 800 € se sent floué, même si le taux était écrit ailleurs.
    'a_moi', (v_brut * 80 / 100)::bigint,
    'part', 80,
    'payout_method', v_meth,
    -- ⚠️ JAMAIS L'IBAN EN ENTIER. Quatre derniers caractères : assez pour
    -- reconnaître le sien, pas assez pour s'en servir.
    'payout_fin', case when v_handle is null then null
                       else right(v_handle, 4) end,
    'complete', (public.totehm_complete(v_uid)->>'complete')::boolean);
end $function$;

-- ⚠️ LES REVOKE SUIVENT LES CREATE. Voir `20260919_le_passeport.sql`.
revoke all on function public.creator_payout_set(text, text) from public;
revoke all on function public.creator_cercle() from public;
grant execute on function public.creator_payout_set(text, text) to authenticated, service_role;
grant execute on function public.creator_cercle() to authenticated, service_role;
