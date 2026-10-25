-- COM · 25/10/2026 — RETIRER UN DE MES SPOTS depuis la vue de droite de totehm.com (Wah : « il faut pouvoir supprimer
-- les media dans la vue de gauche et de droite »). À gauche, tout existe déjà (`element_media_remove`,
-- `vision_image_set(id, null)`). À droite, `spot_cancel` existe mais n'est ouvert à personne (révoqué le 01/10) :
-- une fonction neuve, au nom du geste, réservée au propriétaire. Le spot sort de tous les fils (`club_spots` ne lit que
-- `published`), ses candidatures sont annulées ; rien n'est effacé (la vidéo reste chez Bunny : `bunny-maintenance`).

create function public.spot_remove(p_spot uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_n int;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  update public.spot_plans set status = 'cancelled'
   where spot_id = p_spot and user_id = v_me and status = 'published';
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  update public.spots set active = false where id = p_spot and user_id = v_me;
  update public.spot_applications set status = 'cancelled', decided_at = now()
   where spot_id = p_spot and status in ('pending', 'accepted');
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.spot_remove(uuid) from public, anon;
grant execute on function public.spot_remove(uuid) to authenticated;
