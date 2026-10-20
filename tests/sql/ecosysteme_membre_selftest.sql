-- LOT K (20/10/2026 sexies) : l'écosystème d'un membre — ses médias (par box) et ses spots.
-- Fixtures annulées par l'exception finale. Attendu : « FAIL={} ».
DO $t$
declare
  ua uuid := gen_random_uuid();   -- l'auteur
  ub uuid := gen_random_uuid();   -- un lecteur sans droit particulier
  na text := 'zzk'||left(replace(ua::text,'-',''),8);
  o_open uuid; o_priv uuid;
  p_open text := ua||'/m-'||gen_random_uuid()||'.jpg'; p_priv text := ua||'/m-'||gen_random_uuid()||'.jpg';
  r jsonb; c jsonb; fails text[] := '{}';
begin
  insert into auth.users(id, email) values (ua, na||'@example.invalid'), (ub, 'zzkb_'||left(ub::text,8)||'@example.invalid');
  insert into public.profiles(id, pseudo) values (ua, na) on conflict (id) do update set pseudo = excluded.pseudo;
  insert into public.objectives(user_id, text, audience) values (ua, 'open goal', 'subscribers') returning id into o_open;
  insert into public.objectives(user_id, text, audience) values (ua, 'secret goal', 'private') returning id into o_priv;
  insert into public.element_media(user_id, kind, ref, path, mime, bytes, name)
    values (ua, 'o', o_open::text, p_open, 'image/jpeg', 10, 'IMG_1.jpg'),
           (ua, 'o', o_priv::text, p_priv, 'image/jpeg', 10, 'IMG_2.jpg');

  -- 1 · L'AUTEUR voit ses deux médias, et lit ses deux fichiers (+ la vignette d'une vidéo suit son média).
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ua, 'role','authenticated')::text, true);
  r := public.member_media(na);
  if jsonb_array_length(r->'items') <> 2 then fails := fails || ('auteur '||r::text); end if;
  if not public._element_media_readable(p_priv) or not public._element_media_readable(p_priv||'.jpg')
     then fails := fails || 'auteur_fichier'; end if;

  -- 2 · UN LECTEUR SANS ABONNEMENT : aucune box partagée avec lui → rien, ni la liste ni le fichier.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ub, 'role','authenticated')::text, true);
  r := public.member_media(na);
  if jsonb_array_length(r->'items') <> 0 then fails := fails || ('etranger '||r::text); end if;
  if public._element_media_readable(p_open) then fails := fails || 'etranger_fichier'; end if;

  -- 2 bis · ABONNÉ VIVANT : la box « subscribers » s'ouvre, la box privée reste fermée.
  insert into public.creator_subscriptions(creator_id, fan_id, status, current_period_end)
    values (ua, ub, 'active', now() + interval '1 year');
  r := public.member_media(na);
  if jsonb_array_length(r->'items') <> 1 or r->'items'->0->>'path' <> p_open then fails := fails || ('abonne '||r::text); end if;
  if not public._element_media_readable(p_open) or public._element_media_readable(p_priv)
     then fails := fails || 'abonne_fichier'; end if;

  -- 3 · LE NOM DU FICHIER NE SORT JAMAIS (« Visualize it »).
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ua, 'role','authenticated')::text, true);
  r := public.member_media(na);
  if (r->'items'->0) ? 'name' then fails := fails || 'nom_fichier'; end if;

  -- 4 · UN NOM INCONNU, SANS SESSION.
  r := public.member_media('zz-nobody-zz');
  if r->>'why' <> 'nobody' then fails := fails || ('nobody '||r::text); end if;
  perform set_config('request.jwt.claims', '{}', true);
  r := public.member_media(na);
  if r->>'why' <> 'signin' then fails := fails || ('signin '||r::text); end if;
  c := public.club_spots_of(na, 'now', '{}'::jsonb, null, null, 20, 0, null);
  if c->>'why' <> 'signin' then fails := fails || ('spots_signin '||c::text); end if;

  -- 5 · LES SPOTS D'UN MEMBRE : la même réponse que club_spots, restreinte à lui.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ub, 'role','authenticated')::text, true);
  c := public.club_spots_of(na, 'past', '{}'::jsonb, null, null, 20, 0, null);
  if c->>'ok' <> 'true' or (c->>'total')::int <> 0 then fails := fails || ('spots '||c::text); end if;
  c := public.club_spots_of(na, 'bad', '{}'::jsonb, null, null, 20, 0, null);
  if c->>'why' <> 'period' then fails := fails || ('periode '||c::text); end if;
  -- le cœur sans auteur = club_spots, au total près
  if (public._club_spots_core(null, 'past', '{}'::jsonb, null, null, 20, 0, null)->>'total')
     <> (public.club_spots('past', '{}'::jsonb, null, null, 20, 0, null)->>'total') then fails := fails || 'coeur'; end if;

  -- 6 · LES DROITS.
  if has_function_privilege('anon','public.member_media(text)','EXECUTE')
     or has_function_privilege('authenticated','public._club_spots_core(uuid,text,jsonb,double precision,double precision,integer,integer,timestamp with time zone)','EXECUTE')
     or not has_function_privilege('authenticated','public.club_spots_of(text,text,jsonb,double precision,double precision,integer,integer,timestamp with time zone)','EXECUTE')
     or has_function_privilege('anon','public.club_spots_of(text,text,jsonb,double precision,double precision,integer,integer,timestamp with time zone)','EXECUTE')
     then fails := fails || 'grants'; end if;

  raise exception 'ECOSYSTEME MEMBRE SELFTEST (rolled back) | FAIL=%', fails;
end $t$;
