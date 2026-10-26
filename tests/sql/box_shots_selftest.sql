-- 26/10/2026 — LES PHOTOS D'UNE BOX : ce que MOI j'ai posé dessus, et rien d'autre.
-- Attendu : une erreur « SELFTEST (rolled back) | FAIL={} » (c'est le succès : tout est annulé).
do $$
declare
  u uuid; autre uuid; obj uuid; r jsonb; fails text[] := '{}';
  h text := 'Selftest run the hill'; sp uuid := gen_random_uuid(); sp2 uuid := gen_random_uuid();
  ph text; px text;
begin
  select user_id into u from public.totehms limit 1;
  select t.user_id into autre from public.totehms t where t.user_id <> u limit 1;
  if u is null then raise exception 'SELFTEST (rolled back) | FAIL={pas_de_totehm}'; end if;
  ph := u::text || '/' || gen_random_uuid()::text || '.jpg';
  px := u::text || '/' || gen_random_uuid()::text || '.jpg';

  -- Un spot vit dans `spots` ; `spot_plans` en est le plan. Les deux, donc.
  insert into public.spots(id,intention,activite,user_id,lat,lng) values (sp,'fight',h,u,38.72,-9.14);
  insert into public.spots(id,intention,activite,user_id,lat,lng) values (sp2,'fight',h,u,38.72,-9.14);

  -- Une Habit à moi : une photo, une vidéo (qui ne doit PAS passer), un spot publié, un spot annulé.
  update public.totehms set steps = coalesce(steps,'[]'::jsonb) || jsonb_build_array(jsonb_build_object('t',h,'is',jsonb_build_array('fight')))
   where user_id = u;
  insert into public.element_media(user_id,kind,ref,path,mime,bytes,name)
    values (u,'h',h,u::text||'/m-'||gen_random_uuid()::text||'.jpg','image/jpeg',1200,'mienne.jpg');
  insert into public.element_media(user_id,kind,ref,path,mime,bytes,name)
    values (u,'h',h,u::text||'/m-'||gen_random_uuid()::text||'.mp4','video/mp4',9000,'clip.mp4');
  insert into public.spot_plans(spot_id,user_id,habit,snapshot,starts_at,duration_min,capacity,mode,access,
                                selection,place,lat,lng,clat,clng,audience,status,photo,city)
    values (sp,u,h,'{}'::jsonb,now(),60,1,'social','club','manual','the hill',38.72,-9.14,38.72,-9.14,'figher','published',ph,'Lisbon');
  insert into public.spot_plans(spot_id,user_id,habit,snapshot,starts_at,duration_min,capacity,mode,access,
                                selection,place,lat,lng,clat,clng,audience,status,photo,city)
    values (sp2,u,h,'{}'::jsonb,now(),60,1,'social','club','manual','the hill',38.72,-9.14,38.72,-9.14,'figher','cancelled',px,'Lisbon');

  r := public._box_shots(u,'habit',h);
  if jsonb_array_length(r) <> 2 then fails := fails || ('n='||jsonb_array_length(r)); end if;
  if not exists (select 1 from jsonb_array_elements(r) e where e->>'kind'='media' and e->>'bucket'='element-media') then fails := fails || 'media'; end if;
  if exists (select 1 from jsonb_array_elements(r) e where e->>'txt'='clip.mp4') then fails := fails || 'video_passe'; end if;
  if not exists (select 1 from jsonb_array_elements(r) e where e->>'kind'='spot' and e->>'txt'='the hill' and e->>'bucket'='moments') then fails := fails || 'spot'; end if;
  if exists (select 1 from jsonb_array_elements(r) e where e->>'path' = px) then fails := fails || 'spot_annule'; end if;

  -- Un autre membre ne voit rien de tout cela, même en connaissant la référence.
  if autre is not null and jsonb_array_length(public._box_shots(autre,'habit',h)) <> 0 then fails := fails || 'fuite'; end if;

  -- Une vue inconnue, une box qui n'est pas à moi, une référence cassée : une liste vide, jamais une erreur.
  if public._box_shots(u,'inconnue',h) <> '[]'::jsonb then fails := fails || 'vue_inconnue'; end if;
  if public._box_shots(u,'habit','Jamais écrite') <> '[]'::jsonb then fails := fails || 'box_inconnue'; end if;
  if public._box_shots(u,'objective','pas-un-uuid') <> '[]'::jsonb then fails := fails || 'ref_cassee'; end if;

  -- Un objectif relié à cette Habit remonte le SPOT de la Habit, jamais la photo de la Habit.
  insert into public.objectives(user_id,text) values (u,'Selftest objective') returning id into obj;
  insert into public.objective_habits(user_id,objective_id,habit_text) values (u,obj,h);
  r := public._box_shots(u,'objective',obj::text);
  if not exists (select 1 from jsonb_array_elements(r) e where e->>'kind'='spot') then fails := fails || 'objectif_spot'; end if;
  if exists (select 1 from jsonb_array_elements(r) e where e->>'kind'='media') then fails := fails || 'objectif_media'; end if;

  raise exception 'SELFTEST (rolled back) | FAIL=%', fails;
end $$;
