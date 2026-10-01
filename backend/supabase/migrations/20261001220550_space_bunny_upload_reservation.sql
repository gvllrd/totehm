-- Reserve uploads before Bunny creation, with an owner lock and quota.
create or replace function public.video_reserve(p_user uuid,p_bytes bigint,p_seconds double precision)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if p_user is null or p_bytes is null or p_bytes not between 1 and 33554432 or p_seconds is null or not (p_seconds>0 and p_seconds<=34) then return jsonb_build_object('ok',false);end if;
 if not exists(select 1 from public.totehms t,jsonb_array_elements(t.steps) s where t.user_id=p_user and btrim(coalesce(s->>'t',''))<>'') then return jsonb_build_object('ok',false);end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,1));
 if (select count(*) from public.videos where user_id=p_user and created_at>now()-interval '24 hours')>=24
  or (select count(*) from public.videos where user_id=p_user and status='uploading' and created_at>now()-interval '1 hour')>=4 then return jsonb_build_object('ok',false);end if;
 insert into public.videos(user_id,byte_length,length_seconds) values(p_user,p_bytes,p_seconds) returning id into v_id;
 return jsonb_build_object('ok',true,'id',v_id);
end $$;
revoke all on function public.video_reserve(uuid,bigint,double precision) from public,anon,authenticated;
grant execute on function public.video_reserve(uuid,bigint,double precision) to service_role;
-- 33 s at 6 Mbps plus audio fits comfortably in 32 MB. Existing files survive.
update storage.buckets set file_size_limit=33554432 where id='moments' and (file_size_limit is null or file_size_limit<33554432);
