-- ══════════════════════════════════════════════════════════════════════
-- TOTEHM · 11/11/2026 — LE LUXE : L'ÉTUDE DE MATIÈRE, PRISE PUIS ÉCRITE
-- ══════════════════════════════════════════════════════════════════════
-- Wah : « il faut que l'on mette en place une analyse automatisée (via l'API
-- ChatGPT/Vision et n8n) qui étudie précisément la texture et la matière de
-- l'objet ». Deux fonctions, le SERVICE seul (n8n, clé de service) :
--   · `luxury_material_due`  RÉSERVE ce qui est à étudier et le rend ;
--   · `luxury_material_set`  écrit l'étude, ou la panne, et l'heure.
-- La réservation est ce qui empêche deux passages de payer deux fois la même
-- image : la ligne prise porte `{"status":"running"}` et ne ressort qu'au bout
-- de 30 minutes si le flux n'est jamais revenu (même règle que `streetwear_due`).
-- Rien n'est accordé à `anon` ni à `authenticated` : un membre ne déclenche
-- jamais un appel payant. L'étude se LIT, elle, dans `luxury_access`.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.luxury_material_due(p_limit int default 3)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v jsonb;
begin
  with pris as (
    update public.luxury_quotes q
       set material    = jsonb_build_object('status', 'running'),
           material_at = now()
     where q.id in (
       select id from public.luxury_quotes
        where photo_path is not null
          and status in ('quoted', 'paid')
          and (material is null
               or (material->>'status' = 'running' and material_at < now() - interval '30 minutes'))
        order by created_at
        limit greatest(1, least(coalesce(p_limit, 3), 10))
        for update skip locked)
    returning q.id, q.photo_path, q.media_kind, q.brand, q.product, q.city, q.piece, q.test)
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'photo_path', photo_path, 'media_kind', coalesce(media_kind, 'photo'),
           'brand', brand, 'product', product, 'city', city, 'piece', piece, 'test', test)), '[]'::jsonb)
    into v from pris;
  return jsonb_build_object('ok', true, 'jobs', v);
end $function$;

create or replace function public.luxury_material_set(p_id uuid, p_material jsonb, p_error text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_id uuid;
begin
  update public.luxury_quotes
     set material = case when p_error is not null
                         then jsonb_build_object('status', 'error', 'why', left(p_error, 300))
                         else coalesce(p_material, '{}'::jsonb) || jsonb_build_object('status', 'done') end,
         material_at = now()
   where id = p_id
  returning id into v_id;
  return jsonb_build_object('ok', v_id is not null);
end $function$;

revoke all on function public.luxury_material_due(int) from public, anon, authenticated;
revoke all on function public.luxury_material_set(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.luxury_material_due(int) to service_role;
grant execute on function public.luxury_material_set(uuid, jsonb, text) to service_role;
