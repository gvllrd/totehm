-- TOTEHM · 05/10/2026 (soir) — LE BANC D'ESSAI DEVIENT LE MODE TEST DE STRIPE
--
-- why  : Wah, 05/10 — « mettre en place un environnement de test avec Stripe,
--        je vais faire pas mal d'essais ». Un prix d'essai à 1 € restait de
--        l'argent réel. Le mode test de Stripe (carte 4242 4242 4242 4242)
--        traverse le même chemin — checkout, webhook, base, emails — sans un
--        centime.
-- how  : un compte de `boutique_testers` ACTIF paie en mode test : les
--        fonctions de checkout prennent `STRIPE_TEST_SECRET_KEY`, au VRAI
--        prix (aucun prix d'essai) ; le webhook vérifie aussi avec
--        `STRIPE_TEST_WEBHOOK_SECRET` et n'accepte, en mode test, que `cloth`
--        et `luxury`. `price_cents` de `boutique_testers` devient inerte.
--        Allumer un testeur ne touche plus à l'argent réel : pas de « oui »
--        requis.
-- retour arrière : `update boutique_testers set active = false where …`.

create or replace function public._boutique_test_mode(p_user uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select p_user is not null and exists (select 1 from public.boutique_testers where user_id = p_user and active);
$function$;

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
               'palette', to_jsonb(q.palette), 'created_at', q.created_at)
             order by q.created_at desc)
        from (select * from public.luxury_quotes where user_id = v_uid
               order by created_at desc limit 10) q), '[]'::jsonb) end);
end $function$;

comment on column public.boutique_testers.price_cents is
  'Inerte depuis le 05/10 (soir) : un testeur actif paie en MODE TEST Stripe, au vrai prix.';

revoke all on function public._boutique_test_mode(uuid) from public, anon, authenticated;
grant execute on function public._boutique_test_mode(uuid) to service_role;
revoke all on function public.luxury_access() from public;
grant execute on function public.luxury_access() to anon, authenticated, service_role;
