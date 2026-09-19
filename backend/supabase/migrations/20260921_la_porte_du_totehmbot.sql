-- TOTEHM · LA PORTE DU TOTEHMBOT · 21/09/2026
-- ═══════════════════════════════════════════════════════════════════
-- Wah : « Quand l'utilisateur clique et qu'il n'est pas abonné au
-- Figher Club, il doit tomber sur une page de vente. TotehmBot est
-- inclus en intégrant le Figher Club. »
--
-- ⚠️ DEUX VERROUS, ET IL FAUT LES DEUX :
--   1. être membre du Club   (c'est ce qui le PAIE)
--   2. avoir un Totehm complet (c'est ce qui le NOURRIT)
-- Le second n'est pas une contrainte commerciale, c'est une contrainte
-- physique : un miroir sans rien à refléter ne renvoie rien. Un membre
-- qui paie et dont le Totehm est vide recevrait des phrases creuses, et
-- c'est le produit entier qu'il jugerait là-dessus.
--
-- ⚠️ LA PAGE NE DÉCIDE RIEN. Elle affiche ce que cette fonction dit.
-- Un `if` côté navigateur se retire en deux clics dans l'inspecteur ;
-- et surtout, trois écrans qui calculent chacun leur accès finissent
-- par ne plus dire la même chose au même membre le même jour.
--
-- ⚠️ ELLE NE REND QUE DES BOOLÉENS ET UN CHIFFRE. Jamais le contenu du
-- Totehm, jamais un identifiant : c'est une porte, pas une fenêtre.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.totehmbot_access()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_uid   uuid := auth.uid();
  v_membre boolean;
  v_pass  jsonb;
begin
  if v_uid is null then
    -- Un invité voit la page de vente, comme un membre sans Club :
    -- c'est le même écran, et il n'a pas à savoir qu'il y en a deux.
    return jsonb_build_object('signed_in', false, 'club', false,
                              'complete', false, 'remplies', 0, 'ouvert', false);
  end if;

  select exists(
    select 1 from public.subscriptions s
     where s.user_id = v_uid and s.status in ('active','trialing')
  ) into v_membre;

  v_pass := public.totehm_complete(v_uid);

  return jsonb_build_object(
    'signed_in', true,
    'club',      v_membre,
    'complete',  coalesce((v_pass->>'complete')::boolean, false),
    'remplies',  coalesce((v_pass->>'remplies')::int, 0),
    -- La porte s'ouvre quand les DEUX sont vrais. Un seul booléen à lire
    -- côté page : c'est ce qui empêche une page de recomposer la règle.
    'ouvert',    v_membre and coalesce((v_pass->>'complete')::boolean, false));
end $function$;

-- ⚠️ LE REVOKE SUIT LE CREATE : `create or replace function` rétablit
-- le GRANT à PUBLIC.
revoke all on function public.totehmbot_access() from public;
grant execute on function public.totehmbot_access() to anon, authenticated;
