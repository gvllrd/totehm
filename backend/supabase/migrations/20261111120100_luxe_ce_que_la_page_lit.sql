-- ══════════════════════════════════════════════════════════════════════
-- TOTEHM · 11/11/2026 — LE LUXE : CE QUE LA PAGE ET L'ADMINISTRATEUR LISENT
-- ══════════════════════════════════════════════════════════════════════
-- Suite de `luxe_atelier_local`. Les deux lectures rendent maintenant ce que
-- le parcours promet : la ville, le produit exact, le budget, l'étude de
-- matière, l'artiste local, sa galerie — et LES DEUX ÉCHÉANCES, calculées ici
-- et jamais dans la page :
--   · l'artiste est dû 30 JOURS après le paiement (sans artiste : remboursé) ;
--   · l'œuvre est due 2 SEMAINES après l'artiste, à la galerie partenaire.
-- Aucune colonne, aucune politique : deux `create or replace`.
-- ══════════════════════════════════════════════════════════════════════

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
               'id', q.id, 'piece', q.piece, 'brand', q.brand, 'product', q.product,
               'city', q.city, 'note', q.note, 'status', q.status,
               'quote_cents', q.quote_cents, 'currency', q.currency, 'quote_note', q.quote_note,
               'budget_cents', q.budget_cents,
               'view', q.box_snapshot->>'view', 'text', q.box_snapshot->>'text',
               'palette', to_jsonb(q.palette), 'created_at', q.created_at,
               'material', q.material, 'studied', q.material_at is not null,
               'artist', q.artist, 'gallery', q.gallery,
               'artist_due_at',  case when q.paid_at  is null then null else q.paid_at  + interval '30 days' end,
               'artwork_due_at', case when q.artist_at is null then null else q.artist_at + interval '14 days' end)
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
             'product', q.product, 'city', q.city, 'budget_cents', q.budget_cents,
             'note', q.note, 'status', q.status, 'quote_cents', q.quote_cents, 'currency', q.currency,
             'quote_note', q.quote_note, 'view', q.box_snapshot->>'view', 'text', q.box_snapshot->>'text',
             'palette', to_jsonb(q.palette), 'test', q.test, 'created_at', q.created_at,
             'material', q.material, 'studied', q.material_at is not null,
             'artist', q.artist, 'gallery', q.gallery,
             'artist_due_at', case when q.paid_at is null then null else q.paid_at + interval '30 days' end)
           order by q.created_at)
      from (select * from public.luxury_quotes where status in ('requested', 'quoted')
             order by created_at limit 50) q
      left join public.profiles p on p.id = q.user_id), '[]'::jsonb));
end $function$;

revoke all on function public.luxury_access() from public;
grant execute on function public.luxury_access() to anon, authenticated, service_role;
revoke all on function public.luxury_quotes_admin() from public;
grant execute on function public.luxury_quotes_admin() to authenticated, service_role;
