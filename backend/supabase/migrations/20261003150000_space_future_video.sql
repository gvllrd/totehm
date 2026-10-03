-- SPACE · 03/10/2026 — la vidéo d'un space futur (TOP : From my files / Film it).
-- Ordre côté page : la vidéo est envoyée (Bunny ou Storage), puis `spot_schedule`,
-- puis ce lien. Fonction NEUVE : `spot_video_set` reste révoquée et part au
-- ménage (`20261001_b_menage.sql`). Aucun drop, aucune réécriture de données.
-- Propriétaire seul ; la vidéo doit être la sienne et libre (`_space_video_owned`,
-- index unique `spot_plans_video_id`). Idempotent : relier deux fois = ok.
create or replace function public.spot_video_attach(p_spot uuid, p_video text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid(); v_plan public.spot_plans;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if p_spot is null or btrim(coalesce(p_video, '')) = '' then return jsonb_build_object('ok', false, 'why', 'video'); end if;
  select * into v_plan from public.spot_plans where spot_id = p_spot and user_id = v_uid for update;
  if not found then return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  if p_video like 'bunny:%' and v_plan.video_id is not null and 'bunny:' || v_plan.video_id::text = p_video
     or p_video not like 'bunny:%' and v_plan.video = p_video then
    return jsonb_build_object('ok', true);
  end if;
  if not coalesce(public._space_video_owned(v_uid, p_video), false) then
    return jsonb_build_object('ok', false, 'why', 'video');
  end if;
  begin
    if p_video like 'bunny:%' then
      update public.spot_plans set video_id = substring(p_video from 7)::uuid, video = null where spot_id = p_spot;
    else
      update public.spot_plans set video = p_video, video_id = null where spot_id = p_spot;
    end if;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'why', 'video');
  end;
  return jsonb_build_object('ok', true);
end $function$;

revoke all on function public.spot_video_attach(uuid, text) from public, anon;
grant execute on function public.spot_video_attach(uuid, text) to authenticated, service_role;
