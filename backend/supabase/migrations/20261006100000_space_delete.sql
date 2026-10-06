-- 06/10/2026 — supprimer un space.
-- Wah : « il faut aussi que l'on puisse supprimer des spaces ».
-- Le propriétaire seul. Le space passe `cancelled` (le statut existant) :
-- tous les lecteurs (my_spaces, habit_spaces, spot_get, le fil, le radar,
-- la liste, `_clip_readable`) ne lisent que `published` → il disparaît
-- partout, d'un coup. Son média n'est plus référencé par la ligne ; la
-- fonction le RENVOIE (vidéo Bunny, chemins du stockage `moments`) pour que
-- l'Edge Function `space-delete` l'efface — sauf s'il sert encore à un autre
-- de MES spaces publiés. Le prix, les droits et les abonnements ne bougent pas.
-- Additive : une fonction. authenticated seulement.

create or replace function public.space_delete(p_spot uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_video text;
  v_photo text;
  v_vid   uuid;
  v_bunny uuid;
  v_paths text[] := '{}';
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'why', 'signin');
  end if;

  update public.spot_plans set status = 'cancelled'
   where spot_id = p_spot and user_id = v_uid and status = 'published'
  returning video, photo, video_id into v_video, v_photo, v_vid;
  if not found then
    return jsonb_build_object('ok', false, 'why', 'not_found');
  end if;

  -- Le média part avec le space, sauf s'il sert encore ailleurs.
  if v_vid is not null and not exists (select 1 from public.spot_plans
       where video_id = v_vid and status = 'published') then
    select bunny_video_id into v_bunny from public.videos where id = v_vid and user_id = v_uid;
  else
    v_vid := null;
  end if;
  if v_video is not null and split_part(v_video, '/', 1) = v_uid::text
     and not exists (select 1 from public.spot_plans where video = v_video and status = 'published') then
    v_paths := v_paths || v_video;
  end if;
  if v_photo is not null and split_part(v_photo, '/', 1) = v_uid::text
     and not exists (select 1 from public.spot_plans where photo = v_photo and status = 'published') then
    v_paths := v_paths || v_photo;
  end if;

  update public.spot_plans set video = null, photo = null, video_id = null
   where spot_id = p_spot and user_id = v_uid;
  update public.spots set active = false where id = p_spot and user_id = v_uid;
  update public.spot_applications set status = 'cancelled', decided_at = now()
   where spot_id = p_spot and status in ('pending', 'accepted');

  return jsonb_build_object('ok', true,
    'media', jsonb_build_object('video_id', v_vid, 'bunny', v_bunny, 'paths', to_jsonb(v_paths)));
end
$$;

revoke all on function public.space_delete(uuid) from public;
revoke all on function public.space_delete(uuid) from anon;
grant execute on function public.space_delete(uuid) to authenticated;
