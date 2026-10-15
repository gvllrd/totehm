-- LOT D (15/10/2026) : `push_decision` suit la Time frequency de CHAQUE Habit.
-- Une Habit n'est redemandée qu'une fois SA période écoulée ; la plus en retard part la première ;
-- l'écart minimum entre deux messages suit la plus courte période (jamais sous 20 minutes).
-- Fixtures annulées par l'exception finale. Attendu : « FAIL={} ».
DO $t$
declare
  u uuid := gen_random_uuid(); r jsonb; fails text[] := '{}';
begin
  insert into auth.users(id, email) values (u, 'zzpf_' || left(u::text, 8) || '@example.invalid');
  insert into public.profiles(id, pseudo) values (u, 'zzpf' || left(u::text, 6))
    on conflict (id) do update set pseudo = excluded.pseudo;
  -- Deux Habits, deux rythmes : une horaire, une hebdomadaire. Bot allumé, aucune heure calme.
  insert into public.totehms(user_id, steps, bot, tz, quiet_from, quiet_to, max_daily)
  values (u, '[{"t":"Run the hill","f":"hourly","i":"fight"},{"t":"Call mum","f":"weekly","i":"love"}]'::jsonb,
          true, 'UTC', 3, 4, 6)        -- 6 = le plafond de la contrainte : jamais plus de 6 messages par jour
  on conflict (user_id) do update set steps = excluded.steps, bot = true, tz = 'UTC',
    quiet_from = 3, quiet_to = 4, max_daily = 6;

  if public._freq_minutes('hourly') <> 60 or public._freq_minutes('weekly') <> 10080
     or public._freq_minutes('sometimes') is not null then fails := fails || 'minutes'; end if;

  -- 1 · rien n'a jamais été demandé : les deux sont dues, la plus COURTE période passe devant.
  r := public.push_decision(u);
  if r->>'send' <> 'true' or r->>'habit' <> 'Run the hill' or r->>'freq' <> 'hourly'
     or r->>'intention' <> 'fight' or (r->>'every_minutes')::int <> 60 then fails := fails || ('neuf ' || r::text); end if;

  -- 2 · l'horaire vient d'être demandée (10 min) : pas due. C'est l'hebdomadaire qui part.
  insert into public.habit_outcomes(user_id, habit_text, asked_at, answered_at)
  values (u, 'Run the hill', now() - interval '10 minutes', now() - interval '9 minutes');
  r := public.push_decision(u);
  if r->>'send' <> 'true' or r->>'habit' <> 'Call mum' then fails := fails || ('horaire_pas_due ' || r::text); end if;

  -- 3 · les deux viennent d'être demandées : plus rien n'est dû (la période fait foi, pas l'ordre figé).
  insert into public.habit_outcomes(user_id, habit_text, asked_at, answered_at)
  values (u, 'Call mum', now() - interval '2 days', now() - interval '2 days');
  r := public.push_decision(u);
  if r->>'send' <> 'false' or r->>'why' <> 'nothing_due' then fails := fails || ('rien_du ' || r::text); end if;

  -- 4 · deux heures plus tard, l'horaire est de nouveau due.
  update public.habit_outcomes set asked_at = now() - interval '2 hours', answered_at = now() - interval '2 hours'
   where user_id = u and habit_text = 'Run the hill';
  r := public.push_decision(u);
  if r->>'send' <> 'true' or r->>'habit' <> 'Run the hill' then fails := fails || ('revient ' || r::text); end if;

  -- 5 · l'écart minimum suit la plus courte période : 30 min pour une Habit horaire.
  insert into public.pushes(user_id, habit_text, body, sent_at)
  values (u, 'Run the hill', 'x', now() - interval '25 minutes');
  r := public.push_decision(u);
  if r->>'why' <> 'min_gap' then fails := fails || ('gap_court ' || r::text); end if;
  update public.pushes set sent_at = now() - interval '40 minutes' where user_id = u;
  r := public.push_decision(u);
  if r->>'send' <> 'true' then fails := fails || ('gap_passe ' || r::text); end if;

  -- 6 · une Habit sans rythme ne part jamais (« sometimes » n'est pas une période).
  -- (jamais de `delete` depuis le cloud : le dernier envoi est simplement repoussé loin derrière)
  update public.totehms set steps = '[{"t":"Write","f":"sometimes","i":"express"}]'::jsonb where user_id = u;
  update public.pushes set sent_at = now() - interval '10 days' where user_id = u;
  r := public.push_decision(u);
  if r->>'send' <> 'false' or r->>'why' <> 'nothing_due' then fails := fails || ('sans_rythme ' || r::text); end if;

  -- 7 · les droits : le client n'appelle jamais ces deux-là.
  if has_function_privilege('anon', 'public.push_decision(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.push_decision(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public._freq_minutes(text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.push_decision(uuid)', 'EXECUTE') then fails := fails || 'grants'; end if;

  raise exception 'PUSH PAR FREQUENCE SELFTEST (rolled back) | FAIL=%', fails;
end $t$;
