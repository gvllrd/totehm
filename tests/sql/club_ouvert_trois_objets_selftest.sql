-- LOT E (16/10/2026) : l'adhésion FIGHER CLUB tient à TROIS objets, et il n'y a plus de niveau PUBLIC.
-- Fixtures annulées par l'exception finale. Attendu : « FAIL={} ».
DO $t$
declare
  ua uuid := gen_random_uuid();   -- trois objets : membre
  ub uuid := gen_random_uuid();   -- habit seule : pas membre
  uc uuid := gen_random_uuid();   -- cinq vues : membre aussi (la règle n'exige que trois)
  sp uuid; r jsonb; fails text[] := '{}'; v text;
begin
  insert into auth.users(id, email) values
    (ua, 'zzce_a_' || left(ua::text,8) || '@example.invalid'),
    (ub, 'zzce_b_' || left(ub::text,8) || '@example.invalid'),
    (uc, 'zzce_c_' || left(uc::text,8) || '@example.invalid');
  insert into public.profiles(id, pseudo) values
    (ua,'zzcea'||left(ua::text,6)), (ub,'zzceb'||left(ub::text,6)), (uc,'zzcec'||left(uc::text,6))
    on conflict (id) do update set pseudo = excluded.pseudo;
  insert into public.totehms(user_id, steps) values
    (ua,'[{"t":"Run the hill","i":"fight"}]'::jsonb),
    (ub,'[{"t":"Run the hill","i":"fight"}]'::jsonb),
    (uc,'[{"t":"Run the hill","i":"fight"}]'::jsonb)
    on conflict (user_id) do update set steps = excluded.steps;
  insert into public.objectives(user_id, text) values (ua,'Ship the collection'), (uc,'Ship it');
  -- `repulsions` porte le texte dans `repulsion` (pas `text`) et `totehm_complete` exige `active`.
  insert into public.repulsions(user_id, repulsion, obstacle, habit_text, active) values (ua,'Scroll at night','the phone','Run the hill',true), (uc,'Scroll','the phone','Run the hill',true);
  insert into public.visions(user_id, text) values (uc,'The studio');
  insert into public.wisdom(user_id, text)  values (uc,'What I learned');

  -- 1 · trois objets suffisent, et il en faut trois.
  if coalesce((public._figher(ua)->>'member')::boolean,false) is not true then fails := fails || 'a_membre'; end if;
  if coalesce((public._figher(ub)->>'member')::boolean,true) is not false then fails := fails || 'b_pas_membre'; end if;
  if coalesce((public._figher(uc)->>'member')::boolean,false) is not true then fails := fails || 'c_membre'; end if;
  -- `complete` garde son sens (les cinq vues) : A n'est pas complet, C l'est.
  if coalesce((public._figher(ua)->>'complete')::boolean,true) is not false then fails := fails || 'a_incomplet'; end if;
  if coalesce((public._figher(uc)->>'complete')::boolean,false) is not true then fails := fails || 'c_complet'; end if;
  -- ce qui manque se dit, sans que la page recompose la règle
  if public._figher(ub)->'needs' <> '["objective","repulsion"]'::jsonb then fails := fails || ('needs ' || (public._figher(ub)->'needs')::text); end if;
  if public._figher(ua)->'needs' <> '[]'::jsonb then fails := fails || 'needs_vide'; end if;

  -- 2 · plus de PUBLIC : le trigger normalise, quel que soit l'écrivain.
  update public.totehms set audience = 'public' where user_id = ua;
  select audience into v from public.totehms where user_id = ua;
  if v <> 'figher' then fails := fails || ('totehm_public ' || v); end if;
  -- un écrivain d'avant (visibility seule) n'ouvre pas un niveau public non plus
  update public.totehms set totehm_visibility = 'private' where user_id = ua;
  update public.totehms set totehm_visibility = public._vis_shared() where user_id = ua;
  select audience into v from public.totehms where user_id = ua;
  if v = 'public' then fails := fails || ('totehm_ancien ' || v); end if;

  -- `spot_plans.spot_id` référence `spots` : la projection à 0,1° naît d'abord (allumée exprès,
  -- pour vérifier que `_audience_put` l'éteint).
  insert into public.spots(user_id, intention, activite, lat, lng, duration_min, expires_at, is_public, required_role, active)
  values (ua, 'fight', 'x', 38.7, -9.1, 60, now() + interval '2 days', true, 'public', true) returning id into sp;
  insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at, duration_min, capacity, mode,
    access, selection, place, lat, lng, clat, clng, visibility, shield, kind, format, status, audience)
  values (sp, ua, 'Run the hill', array['fight'], '{"freq":"daily"}'::jsonb, now() + interval '1 day', 60, 4, 'silent',
    'club', 'manual', 'the hill', 38.72, -9.14, 38.7, -9.1, 'shared', 'on', 'experience', 'spot', 'published', 'public');
  select audience into v from public.spot_plans where spot_id = sp;
  if v <> 'figher' then fails := fails || ('spot_public ' || v); end if;

  -- 3 · la règle de lecture : `public` n'est jamais plus ouvert que `figher`.
  if public._audience_ok(ua, 'public', null, false) is not false then fails := fails || 'ok_anon'; end if;
  if public._audience_ok(ua, 'public', ub, false) is not false then fails := fails || 'ok_non_membre'; end if;
  if public._audience_ok(ua, 'public', ub, true)  is not true  then fails := fails || 'ok_membre'; end if;
  if public._audience_listed(ua, 'public', null, false) is not false then fails := fails || 'liste_anon'; end if;
  if public._audience_listed(ua, 'figher', ub, true) is not true then fails := fails || 'liste_membre'; end if;
  if public._point_ok(ua, 'public', 'on', null, true) is not false then fails := fails || 'point_anon'; end if;
  if public._point_ok(ua, 'public', 'on', ub, true)  is not true  then fails := fails || 'point_membre'; end if;
  if public._point_ok(ua, 'public', 'off', ub, true) is not false then fails := fails || 'point_off'; end if;

  -- 4 · l'écrivain rend la VRAIE audience (il ne promet jamais « public »).
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ua, 'role','authenticated')::text, true);
  r := public.visibility_set('public');
  if r->>'visibility' <> 'figher' then fails := fails || ('vis_set ' || r::text); end if;
  r := public.spot_audience_set(sp, 'public');
  if r->>'audience' <> 'figher' then fails := fails || ('spot_set ' || r::text); end if;
  -- la projection historique à 0,1° ne s'allume plus : le point ne passe que par `_point_ok`
  if exists(select 1 from public.spots where id = sp and (active or is_public)) then fails := fails || 'projection'; end if;

  -- 5 · les droits : le client n'appelle jamais une règle d'accès.
  if has_function_privilege('anon','public._figher(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public._figher(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public._audience_ok(uuid,text,uuid,boolean)','EXECUTE')
     or has_function_privilege('anon','public.visibility_set(text)','EXECUTE')
     or not has_function_privilege('authenticated','public.visibility_set(text)','EXECUTE')
     then fails := fails || 'grants'; end if;

  raise exception 'CLUB OUVERT TROIS OBJETS SELFTEST (rolled back) | FAIL=%', fails;
end $t$;
