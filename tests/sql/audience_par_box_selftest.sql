-- LOT G (18/10/2026) : la confidentialité est PAR BOX, trois niveaux, et le Totehm n'en décide plus.
-- Ce test couvre LA PART APPLIQUÉE depuis le cloud (colonnes, table, règle, écrivains, mes niveaux).
-- Les lecteurs filtrés (`totehm_of`, les politiques) arrivent par
-- `20261018091000_audience_par_box_lecteurs.sql`, appliqué depuis le terminal : ils ont leurs propres
-- contrôles, marqués « LECTEURS » ci-dessous et sautés tant que la fonction n'est pas filtrée.
-- Fixtures annulées par l'exception finale. Attendu : « FAIL={} ».
DO $t$
declare
  ua uuid := gen_random_uuid();   -- l'auteur
  ub uuid := gen_random_uuid();   -- un membre du Club (trois objets)
  o1 uuid; w1 uuid; v1 uuid; r1 bigint;
  r jsonb; fails text[] := '{}'; v text; n int;
  lecteurs boolean;
begin
  insert into auth.users(id, email) values
    (ua, 'zzg_a_' || left(ua::text,8) || '@example.invalid'),
    (ub, 'zzg_b_' || left(ub::text,8) || '@example.invalid');
  insert into public.profiles(id, pseudo) values
    (ua,'zzga'||left(ua::text,6)), (ub,'zzgb'||left(ub::text,6))
    on conflict (id) do update set pseudo = excluded.pseudo;

  -- A écrit ; B est membre du Club (une habit, un objectif, une répulsion).
  insert into public.totehms(user_id, steps, audience) values
    (ua,'[{"t":"Run the hill","i":"fight"},{"t":"Read at dawn","i":"focus"}]'::jsonb,'private'),
    (ub,'[{"t":"Walk","i":"flow"}]'::jsonb,'private')
    on conflict (user_id) do update set steps = excluded.steps, audience = excluded.audience;
  insert into public.objectives(user_id, text) values (ua,'Ship the collection') returning id into o1;
  insert into public.objectives(user_id, text) values (ub,'Ship it');
  insert into public.repulsions(user_id, repulsion, obstacle, habit_text, active)
    values (ua,'Scroll at night','the phone','Run the hill',true) returning id into r1;
  insert into public.repulsions(user_id, repulsion, obstacle, habit_text, active)
    values (ub,'Scroll','the phone','Walk',true);
  insert into public.wisdom(user_id, text)  values (ua,'What I learned') returning id into w1;
  insert into public.visions(user_id, text) values (ua,'The studio')     returning id into v1;

  -- 1 · LA COLONNE EXISTE ET SON DÉFAUT EST PRIVÉ (une box neuve ne s'ouvre pas toute seule).
  select audience into v from public.objectives where id = o1;
  if v <> 'private' then fails := fails || ('obj_defaut ' || coalesce(v,'∅')); end if;
  select audience into v from public.wisdom where id = w1;
  if v <> 'private' then fails := fails || ('wis_defaut ' || coalesce(v,'∅')); end if;
  select audience into v from public.visions where id = v1;
  if v <> 'private' then fails := fails || ('vis_defaut ' || coalesce(v,'∅')); end if;
  select audience into v from public.repulsions where id = r1;
  if v <> 'private' then fails := fails || ('rep_defaut ' || coalesce(v,'∅')); end if;

  -- 2 · LES HABITUDES ONT LEUR TABLE, JAMAIS UNE COLONNE DANS `steps`.
  insert into public.habit_audience(user_id, habit_text, audience) values (ua,'Run the hill','figher');
  if public._box_audience(ua,'h','Run the hill') <> 'figher' then fails := fails || 'habit_niveau'; end if;
  -- une habitude sans ligne est PRIVÉE : le défaut ne s'hérite pas du Totehm.
  if public._box_audience(ua,'h','Read at dawn') <> 'private' then fails := fails || 'habit_defaut'; end if;

  -- 3 · L'ÉCRIVAIN : le propriétaire seul, trois niveaux, `public` normalisé.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ua, 'role','authenticated')::text, true);
  r := public.box_audience_put('t', o1::text, 'public');
  if r->>'audience' <> 'figher' then fails := fails || ('put_public ' || r::text); end if;
  r := public.box_audience_put('t', o1::text, 'nimporte');
  if r->>'why' <> 'audience' then fails := fails || ('put_invalide ' || r::text); end if;
  r := public.box_audience_put('r', r1::text, 'subscribers');
  if r->>'audience' <> 'subscribers' then fails := fails || ('put_rep ' || r::text); end if;
  r := public.box_audience_put('h', 'Read at dawn', 'figher');
  if r->>'audience' <> 'figher' then fails := fails || ('put_habit ' || r::text); end if;
  -- ⚠️ `box_audience_put` NE TOUCHE PAS au plafond : rien ne s'ouvre tant que les lecteurs ne filtrent pas.
  select audience into v from public.totehms where user_id = ua;
  if v <> 'private' then fails := fails || ('plafond_intact ' || v); end if;

  -- 4 · LA BOX D'UN AUTRE NE S'ÉCRIT PAS.
  r := public.box_audience_put('w', w1::text, 'figher');   -- la mienne : oui
  if r->>'ok' <> 'true' then fails := fails || 'put_wisdom'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ub, 'role','authenticated')::text, true);
  r := public.box_audience_put('w', w1::text, 'private');
  if r->>'why' <> 'not_mine' then fails := fails || ('put_etranger ' || r::text); end if;
  r := public.box_audience_put('t', 'pas-un-uuid', 'figher');
  if r->>'why' <> 'not_mine' then fails := fails || ('put_id_cassé ' || r::text); end if;

  -- 5 · LA RÈGLE DE LECTURE : chaque niveau dit qui lit, et `_box_shared` la porte seule.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ub, 'role','authenticated')::text, true);
  if public._box_shared(ua,'private') is not false then fails := fails || 'lire_prive'; end if;
  if public._box_shared(ua,'figher') is not true  then fails := fails || 'lire_figher_membre'; end if;
  if public._box_shared(ua,'subscribers') is not false then fails := fails || 'lire_subs_non_abonne'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ua, 'role','authenticated')::text, true);
  if public._box_shared(ua,'private') is not true then fails := fails || 'auteur_lit_la_sienne'; end if;

  -- 6 · MES NIVEAUX EN UNE LECTURE (la page ne recompose jamais la règle).
  r := public.my_box_audiences();
  if r->>'ok' <> 'true' then fails := fails || 'mes_niveaux'; end if;
  if r->'t'->>(o1::text) <> 'figher'      then fails := fails || ('mes_t ' || (r->'t')::text); end if;
  if r->'r'->>(r1::text) <> 'subscribers' then fails := fails || ('mes_r ' || (r->'r')::text); end if;
  if r->'h'->>'Read at dawn' <> 'figher'  then fails := fails || ('mes_h ' || (r->'h')::text); end if;

  -- 7 · LES DROITS : aucune règle d'accès n'est appelable par le client.
  if has_function_privilege('anon','public._box_shared(uuid,text)','EXECUTE')
     or has_function_privilege('authenticated','public._box_shared(uuid,text)','EXECUTE')
     or has_function_privilege('authenticated','public._box_audience(uuid,text,text)','EXECUTE')
     or has_function_privilege('anon','public.box_audience_put(text,text,text)','EXECUTE')
     or not has_function_privilege('authenticated','public.box_audience_put(text,text,text)','EXECUTE')
     or not has_function_privilege('authenticated','public.my_box_audiences()','EXECUTE')
     then fails := fails || 'grants'; end if;

  -- 8 · LECTEURS (sautés tant que `totehm_of` n'est pas filtré par box).
  select (prosrc like '%_box_shared%') into lecteurs
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname = 'totehm_of';
  if coalesce(lecteurs,false) then
    perform set_config('request.jwt.claims', jsonb_build_object('sub', ub, 'role','authenticated')::text, true);
    r := public.totehm_of((select pseudo from public.profiles where id = ua));
    if r->>'ok' <> 'true' then fails := fails || ('lecteur_ok ' || r::text); end if;
    -- B est membre du Club : il voit les box `figher` et pas les autres.
    if jsonb_array_length(coalesce(r->'steps','[]'::jsonb)) <> 1 then fails := fails || 'lecteur_steps'; end if;
    if jsonb_array_length(coalesce(r->'trips','[]'::jsonb)) <> 1 then fails := fails || 'lecteur_trips'; end if;
    if jsonb_array_length(coalesce(r->'reps','[]'::jsonb))  <> 0 then fails := fails || 'lecteur_reps'; end if;
    if jsonb_array_length(coalesce(r->'visions','[]'::jsonb)) <> 0 then fails := fails || 'lecteur_visions'; end if;
  end if;

  raise exception 'AUDIENCE PAR BOX SELFTEST (rolled back) | lecteurs=% | FAIL=%', coalesce(lecteurs,false), fails;
end $t$;
