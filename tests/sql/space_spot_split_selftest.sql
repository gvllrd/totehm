-- why: spaces and spots must never mix their readers or expose a space's point.
-- how: same rolled-back DO structure as my_spaces_selftest; fixtures never persist.
-- what: writers, mixed formats, ownership, grants, cursors, intention fallback, media.
DO $test$
declare
  ua uuid; ub uuid; habit text := 'Selftest split Habit'; other_habit text := 'Selftest split alternative';
  v_photo text; v_photo2 text; clip text; v_space uuid; v_space2 uuid; v_now uuid; v_future uuid;
  r jsonb; f jsonb; h jsonb; item jsonb; fails text[] := '{}';
begin
  select p.id into ua from public.profiles p join auth.users u on u.id=p.id
    where p.pseudo is not null
    order by (select count(*) from public.spot_plans sp where sp.user_id=p.id and sp.created_at>now()-interval '24 hours'), u.created_at limit 1;
  select p.id into ub from public.profiles p join auth.users u on u.id=p.id
    where p.pseudo is not null and p.id<>ua order by u.created_at limit 1;
  if ub is null then raise exception 'SPLIT SELFTEST requires two profiles'; end if;
  update public.totehms set steps=jsonb_build_array(
    jsonb_build_object('t',habit,'is',array['focus'],'f','daily'),
    jsonb_build_object('t',other_habit,'is',array['focus'],'f','daily')) where user_id=ua;
  if not found then insert into public.totehms(user_id,steps) values(ua,jsonb_build_array(
    jsonb_build_object('t',habit,'is',array['focus'],'f','daily'),
    jsonb_build_object('t',other_habit,'is',array['focus'],'f','daily'))); end if;
  v_photo:=ua::text||'/'||gen_random_uuid()::text||'.jpg';
  v_photo2:=ua::text||'/'||gen_random_uuid()::text||'.jpg';
  clip:=ua::text||'/'||gen_random_uuid()::text||'.webm';
  insert into storage.objects(bucket_id,name,owner,owner_id)
    values('moments',v_photo,ua,ua::text),('moments',v_photo2,ua,ua::text),('moments',clip,ua,ua::text);
  perform set_config('request.jwt.claims','{}',true);
  if public.space_post(habit,v_photo,38.72,-9.14,'Lisbon',null)->>'why' is distinct from 'signin' then fails:=array_append(fails,'post_session'); end if;
  perform set_config('request.jwt.claims',json_build_object('sub',ua,'role','authenticated')::text,true);
  if public.space_post('not mine',v_photo,38.72,-9.14,'Lisbon',null)->>'why' is distinct from 'habit' then fails:=array_append(fails,'post_own_habit'); end if;
  if public.space_post(habit,'not mine',38.72,-9.14,'Lisbon',null)->>'why' is distinct from 'video' then fails:=array_append(fails,'post_own_media'); end if;
  if public.space_post(habit,v_photo,38.72,-9.14,null,null)->>'why' is distinct from 'city' then fails:=array_append(fails,'post_city'); end if;
  r:=public.space_post(habit,v_photo,38.72,-9.14,'Lisbon','split'); v_space:=(r->>'id')::uuid;
  if r->>'ok' is distinct from 'true' then fails:=array_append(fails,'post_'||coalesce(r->>'why','null')); end if;
  r:=public.space_post(habit,v_photo2,38.72,-9.14,'Lisbon',null); v_space2:=(r->>'id')::uuid;
  if r->>'ok' is distinct from 'true' then fails:=array_append(fails,'post2'); end if;
  if not exists(select 1 from public.spot_plans where spot_id=v_space and format='space' and visibility='shared' and shield='off' and mode='silent' and duration_min=5 and photo=v_photo and video is null) then fails:=array_append(fails,'space_shape'); end if;
  r:=public.spot_create(habit,'shared',30,clip,38.72,-9.14,'Lisbon',null,'silent','on'); v_now:=(r->>'id')::uuid;
  if r->>'ok' is distinct from 'true' then fails:=array_append(fails,'live_spot'); end if;
  r:=public.spot_schedule(habit,'shared',now()+interval '1 day',30,'Lisbon',38.72,-9.14,'Lisbon',null,'social','on'); v_future:=(r->>'id')::uuid;
  if r->>'ok' is distinct from 'true' then fails:=array_append(fails,'future_spot'); end if;
  if (select count(*) from public.spot_plans where spot_id in(v_now,v_future) and format='spot')<>2 then fails:=array_append(fails,'spot_default'); end if;
  r:=public.space_discover('feed',habit,38.72,-9.14,null,null,100);
  if (select count(*) from jsonb_array_elements(r->'spots') e where e->>'id' in(v_space::text,v_space2::text) and e->>'format'='space')<>2
     or exists(select 1 from jsonb_array_elements(r->'spots') e where e->>'format'<>'space' or e->'exact'<>'null'::jsonb) then fails:=array_append(fails,'feed_only_spaces_no_exact'); end if;
  f:=public.space_discover('feed',other_habit,38.72,-9.14,null,null,100);
  if f->>'match' is distinct from 'intention' or not exists(select 1 from jsonb_array_elements(f->'spots') e where e->>'id'=v_space::text) then fails:=array_append(fails,'feed_intention_fallback'); end if;
  r:=public.space_discover('radar',habit,null,null,null,null,100);
  if exists(select 1 from jsonb_array_elements(r->'spots') e where e->>'format'<>'spot')
     or not exists(select 1 from jsonb_array_elements(r->'spots') e where e->>'id'=v_now::text) then fails:=array_append(fails,'radar_only_spots'); end if;
  r:=public.spots_exact(habit,null);
  if exists(select 1 from jsonb_array_elements(r->'spots') e where e->>'format'<>'spot') then fails:=array_append(fails,'direct_radar_only_spots'); end if;
  r:=public.space_discover('list',habit,null,null,null,null,100);
  if jsonb_array_length(r->'spots')<>1 or r->'spots'->0->>'id' is distinct from v_future::text then fails:=array_append(fails,'list_only_future_spot'); end if;
  r:=public.spots_list(habit,null,null,null,100);
  if jsonb_array_length(r->'spots')<>1 or r->'spots'->0->>'id' is distinct from v_future::text then fails:=array_append(fails,'spots_list'); end if;
  r:=public.spots_feed(38.72,-9.14,habit,null,null,100);
  if jsonb_array_length(r->'spots')<>1 or r->'spots'->0->>'id' is distinct from v_now::text then fails:=array_append(fails,'spots_feed'); end if;
  r:=public.my_spaces(null,null,100);
  if (select count(*) from jsonb_array_elements(r->'spaces') e where e->>'id' in(v_space::text,v_space2::text))<>2
     or exists(select 1 from jsonb_array_elements(r->'spaces') e join public.spot_plans p on p.spot_id=(e->>'id')::uuid where p.format<>'space') then fails:=array_append(fails,'my_spaces'); end if;
  r:=public.my_spaces(null,null,1); item:=r->'spaces'->0;
  f:=public.my_spaces((item->>'starts_at')::timestamptz,(item->>'id')::uuid,1);
  if r->>'more' is distinct from 'true' or jsonb_array_length(f->'spaces')<>1 or f->'spaces'->0->>'id'=item->>'id' then fails:=array_append(fails,'spaces_cursor'); end if;
  r:=public.my_spots(null,null,100);
  if (select count(*) from jsonb_array_elements(r->'spots') e where e->>'id' in(v_now::text,v_future::text))<>2
     or exists(select 1 from jsonb_array_elements(r->'spots') e join public.spot_plans p on p.spot_id=(e->>'id')::uuid where p.format<>'spot') then fails:=array_append(fails,'my_spots'); end if;
  r:=public.habit_spaces(); select e into h from jsonb_array_elements(r->'habits') e where e->>'habit'=habit;
  if h->>'total' is distinct from '4' or jsonb_array_length(h->'spaces')<>3
     or not exists(select 1 from jsonb_array_elements(h->'spaces') e where e->>'format'='space')
     or not exists(select 1 from jsonb_array_elements(h->'spaces') e where e->>'format'='spot') then fails:=array_append(fails,'habit_both_formats'); end if;
  r:=public.spot_get(v_space)->'spot';
  if r->>'format' is distinct from 'space' or r->'exact'<>'null'::jsonb then fails:=array_append(fails,'owner_space_no_exact'); end if;
  if public.spot_get(v_future)->'spot'->>'format' is distinct from 'spot' then fails:=array_append(fails,'spot_format'); end if;
  if not public._clip_readable(v_photo) then fails:=array_append(fails,'space_media_readable'); end if;
  perform set_config('request.jwt.claims',json_build_object('sub',ub,'role','authenticated')::text,true);
  if exists(select 1 from jsonb_array_elements(public.my_spaces()->'spaces') e where e->>'id' in(v_space::text,v_space2::text))
     or exists(select 1 from jsonb_array_elements(public.my_spots()->'spots') e where e->>'id' in(v_now::text,v_future::text)) then fails:=array_append(fails,'histories_owned_only'); end if;
  r:=public.spot_get(v_space)->'spot';
  if r->>'format' is distinct from 'space' or r->'exact'<>'null'::jsonb or r->'context'<>'null'::jsonb then fails:=array_append(fails,'other_space_no_point_no_context'); end if;
  perform set_config('request.jwt.claims',json_build_object('role','anon')::text,true);
  r:=public.space_discover('feed',null,38.72,-9.14,null,null,100);
  if not exists(select 1 from jsonb_array_elements(r->'spots') e where e->>'id'=v_space::text)
     or exists(select 1 from jsonb_array_elements(r->'spots') e where e->>'format'<>'space' or e->'exact'<>'null'::jsonb) then fails:=array_append(fails,'anon_feed_no_point'); end if;
  if has_function_privilege('anon','public.space_post(text,text,double precision,double precision,text,text)','EXECUTE')
     or has_function_privilege('anon','public.my_spots(timestamptz,uuid,integer)','EXECUTE')
     or not has_function_privilege('authenticated','public.space_post(text,text,double precision,double precision,text,text)','EXECUTE')
     or not has_function_privilege('authenticated','public.my_spots(timestamptz,uuid,integer)','EXECUTE') then fails:=array_append(fails,'grants'); end if;
  raise exception 'SPLIT SELFTEST (rolled back): writers, formats, readers, fallback, cursors, rights, media, grants | FAIL=%',fails;
end $test$;
