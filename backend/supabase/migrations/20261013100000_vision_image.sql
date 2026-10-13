-- 13/10/2026 — LOT B : une VISION porte une image (Wah : « possibilité d'ajouter en free soi-même une photo qui aura
-- été générée ailleurs » ; « Generate », payant, est le lot C). L'image vit dans le seau `moments`, sous MON dossier
-- (`<uid>/vision-<uuid>.jpg`) : `moments read readable` (`_clip_readable`) ne l'ouvre qu'à moi — une vision est PRIVATE.
-- La vue de droite de totehm.com lit `my_visions()` : mes visions, leur image, les objectifs qui y mènent.

alter table public.visions add column if not exists image text;
alter table public.visions add constraint visions_image_path_check
  check (image is null or image ~ '^[0-9a-f-]{36}/vision-[0-9a-f-]{36}\.(jpg|png|webp)$');

-- Poser ou retirer (null) l'image d'une de MES visions. Le chemin doit être dans MON dossier.
create or replace function public.vision_image_set(p_id uuid, p_path text)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare v_me uuid := auth.uid(); v_old text;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if p_path is not null and (split_part(p_path, '/', 1) <> v_me::text
       or p_path !~ '^[0-9a-f-]{36}/vision-[0-9a-f-]{36}\.(jpg|png|webp)$') then
    return jsonb_build_object('ok', false, 'why', 'path');
  end if;
  select v.image into v_old from public.visions v where v.id = p_id and v.user_id = v_me for update;
  if not found then return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  update public.visions set image = p_path where id = p_id and user_id = v_me;
  -- `old` : l'ancien fichier, que la page efface (politique `moments delete own`).
  return jsonb_build_object('ok', true, 'image', p_path, 'old', v_old);
end $f$;

-- Mes visions, pour la vue de droite : la plus importante d'abord, puis la plus récente.
create or replace function public.my_visions()
returns jsonb language sql stable security definer set search_path to '' as $f$
  select case when auth.uid() is null then jsonb_build_object('ok', false, 'why', 'signin') else
    jsonb_build_object('ok', true, 'visions', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'text', v.text, 'i', v.i, 'is', to_jsonb(coalesce(v."is", '{}'::text[])),
               'image', v.image,
               'objectives', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'text', o.text) order by o.created_at)
                                         from public.objective_visions ov join public.objectives o on o.id = ov.objective_id
                                        where ov.vision_id = v.id and ov.user_id = v.user_id and btrim(coalesce(o.text, '')) <> ''), '[]'::jsonb))
             order by coalesce(v.importance, 0) desc, v.created_at desc)
        from public.visions v where v.user_id = auth.uid() and btrim(coalesce(v.text, '')) <> ''), '[]'::jsonb)) end;
$f$;

revoke all on function public.vision_image_set(uuid, text) from public, anon;
grant execute on function public.vision_image_set(uuid, text) to authenticated, service_role;
revoke all on function public.my_visions() from public, anon;
grant execute on function public.my_visions() to authenticated, service_role;
