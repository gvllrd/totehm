-- ══════════════════════════════════════════════════════════════════════
-- TOTEHM · 26/10/2026 — LE TABLEAU DE LA BOUTIQUE, ET LES PHOTOS D'UNE PIÈCE
-- ══════════════════════════════════════════════════════════════════════
-- Wah : « quand tu retournes le Higher, l'utilisateur doit avoir accès au
-- tableau de bord avec des onglets appropriés à higher.boutique — My orders,
-- My Totehm Cloth… » · « le résultat de [Decode] doit afficher tous les
-- éléments que l'utilisateur a décidé de sélectionner ».
--
--   `my_boutique_board()` — MES pièces et MES projets luxe, en lecture seule.
--      Rien n'est calculé ici que la page ne sache déjà lire : un nom, un
--      état, une date, le suivi. Le prix vient de la LIGNE, jamais d'un calcul.
--   `cloth_shots(name)`   — les photos liées à une pièce À MOI. Des CHEMINS :
--      la page les signe elle-même (son dossier, sous RLS). Celle d'un autre
--      ne rend rien — une photo de spot n'appartient qu'à qui l'a vécue.
--
-- `reveal_cloth` rend déjà `matter` au niveau `full` : depuis le 26/10, cette
-- matière EST ce que le membre a allumé, donc Decode l'affiche sans rien
-- changer. Seules les photos manquaient.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.my_boutique_board()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare u uuid := auth.uid(); v_p text;
begin
  if u is null then
    return jsonb_build_object('signed_in', false, 'cloths', '[]'::jsonb, 'luxury', '[]'::jsonb);
  end if;
  select pseudo into v_p from public.profiles where id = u;
  return jsonb_build_object(
    'signed_in', true,
    'pseudo', v_p,
    'cloths', coalesce((
      select jsonb_agg(jsonb_build_object(
               'name', c.name,
               'stage', case c.status when 'shipped' then 'shipped' when 'production' then 'production'
                                      when 'cancelled' then 'cancelled' else 'making' end,
               'size', c.size, 'price', c.price, 'garment', s.title,
               'at', to_char(coalesce(c.paid_at, c.created_at), 'YYYY-MM-DD'),
               'tracking', c.tracking_url, 'test', coalesce(c.test, false),
               'art', (c.status = 'shipped' and c.artwork_storage_path is not null and not coalesce(c.test, false)),
               'text', c.box_snapshot->>'text', 'view', c.box_snapshot->>'view')
             order by coalesce(c.paid_at, c.created_at) desc)
        from public.totehm_clothes c
        left join public.totehm_cloth_support s on s.id = c.garment_id
       where c.user_id = u and c.status <> 'draft'), '[]'::jsonb),
    'luxury', coalesce((
      select jsonb_agg(jsonb_build_object(
               'name', q.name, 'status', q.status, 'brand', q.brand, 'piece', q.piece,
               'cents', q.quote_cents, 'currency', q.currency,
               'at', to_char(q.created_at, 'YYYY-MM-DD'),
               'text', q.box_snapshot->>'text')
             order by q.created_at desc)
        from public.luxury_quotes q
       where q.user_id = u and q.status <> 'cancelled'), '[]'::jsonb));
end $$;

comment on function public.my_boutique_board() is
  'MES pièces et MES projets luxe, pour le verso de higher.boutique. Lecture seule, mes lignes seules.';

create or replace function public.cloth_shots(p_name text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare u uuid := auth.uid(); v_snap jsonb; v_q text := lower(btrim(coalesce(p_name, '')));
begin
  if u is null or length(v_q) < 2 then return '[]'::jsonb; end if;
  select c.box_snapshot into v_snap from public.totehm_clothes c
   where c.user_id = u and c.paid_at is not null
     and (lower(btrim(c.name)) = v_q or lower(regexp_replace(btrim(c.name), '^\d+\.', '')) = v_q)
   order by c.paid_at desc limit 1;
  if v_snap is null then
    select q.box_snapshot into v_snap from public.luxury_quotes q
     where q.user_id = u and q.name is not null
       and (lower(btrim(q.name)) = v_q or lower(regexp_replace(btrim(q.name), '^\d+\.', '')) = v_q)
     order by q.created_at desc limit 1;
  end if;
  return coalesce(v_snap->'shots', '[]'::jsonb);
end $$;

comment on function public.cloth_shots(text) is
  'Les photos liées à MA pièce (chemins seuls : la page les signe). Celle d''un autre ne rend rien.';

grant execute on function public.my_boutique_board() to authenticated;
grant execute on function public.cloth_shots(text) to authenticated;
