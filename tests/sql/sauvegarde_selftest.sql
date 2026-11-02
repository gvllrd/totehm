-- 01/11/2026 : la sauvegarde des Habits — l'upsert de `totehms` par un MEMBRE (rôle authenticated), déclencheurs compris.
-- Du 13/10 au 01/11 elle partait en 403 : `_totehm_audience_sync` (droits de l'appelant) appelle `_vis_shared()`, et
-- Postgres vérifie le droit d'exécuter dès la préparation de l'expression. Fixtures annulées par l'exception.
-- Attendu : « FAIL={} ».
DO $t$
declare ua uuid := gen_random_uuid(); fails text[] := '{}'; n int;
begin
  insert into auth.users(id, email) values (ua, 'zzsave_' || left(ua::text, 8) || '@example.invalid');
  insert into public.profiles(id, pseudo) values (ua, 'zzsave_' || left(ua::text, 8));
  if not has_function_privilege('authenticated', 'public._vis_shared()', 'EXECUTE') then fails := fails || 'grant_vis_shared'::text; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.totehms(user_id, steps, updated_at) values (ua, '[{"t":"Run","is":["fight"],"i":"fight"}]'::jsonb, now())
      on conflict (user_id) do update set steps = excluded.steps, updated_at = excluded.updated_at;
    insert into public.totehms(user_id, steps, updated_at) values (ua, '[{"t":"Run far","is":["fight"],"i":"fight"}]'::jsonb, now())
      on conflict (user_id) do update set steps = excluded.steps, updated_at = excluded.updated_at;
  exception when others then fails := fails || ('upsert: ' || sqlerrm);
  end;
  reset role;
  select count(*) into n from public.totehms where user_id = ua and steps->0->>'t' = 'Run far';
  if n <> 1 then fails := fails || ('ligne ' || n)::text; end if;
  raise exception 'SAUVEGARDE SELFTEST (rolled back) | FAIL=%', fails;
end $t$;
