-- SPACE: Full HD portrait video, with room for a high quality 33-second encode.
-- Replace only the size check, before removing the older stricter check.
-- No media, rows, visibility, ownership, quota or access grants are removed.
alter table public.videos add constraint videos_byte_length_hd_check check(byte_length between 1 and 48000000);
alter table public.videos drop constraint videos_byte_length_check;

CREATE OR REPLACE FUNCTION public.video_reserve(p_user uuid, p_bytes bigint, p_seconds double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
 if p_user is null or p_bytes is null or p_bytes not between 1 and 48000000 or p_seconds is null or not (p_seconds>0 and p_seconds<=34) then return jsonb_build_object('ok',false);end if;
 if not exists(select 1 from public.totehms t,jsonb_array_elements(t.steps) s where t.user_id=p_user and btrim(coalesce(s->>'t',''))<>'') then return jsonb_build_object('ok',false);end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,1));
 if (select count(*) from public.videos where user_id=p_user and created_at>now()-interval '24 hours')>=24
  or (select count(*) from public.videos where user_id=p_user and status='uploading' and created_at>now()-interval '1 hour')>=4 then return jsonb_build_object('ok',false);end if;
 insert into public.videos(user_id,byte_length,length_seconds) values(p_user,p_bytes,p_seconds) returning id into v_id;
 return jsonb_build_object('ok',true,'id',v_id);
end $function$;
revoke all on function public.video_reserve(uuid,bigint,double precision) from public,anon,authenticated;
grant execute on function public.video_reserve(uuid,bigint,double precision) to service_role;

CREATE OR REPLACE FUNCTION public.spot_rules()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select jsonb_build_object('clip_seconds',33,'clip_max_bytes',48000000,'countdown',3,'duration_min',5,'duration_max',720,
  'max_day',24,'radius_km',60,'coarse_decimals',1,'feed_days',90,'horizon_days',90,'max_upcoming',10,
  'video_provider',case when exists(select 1 from public.video_backend where id and status='ready') then 'bunny' else 'storage' end);
$function$;
revoke all on function public.spot_rules() from public;
grant execute on function public.spot_rules() to anon,authenticated,service_role;

update storage.buckets set file_size_limit=48000000 where id='moments' and public=false;
