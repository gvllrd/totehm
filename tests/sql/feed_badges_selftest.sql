-- LOT G (19/10/2026) : la position de l'élément-polaroid sur un média.
-- Fixtures annulées par l'exception finale. Attendu : « FAIL={} ».
DO $t$
declare
  ua uuid := gen_random_uuid();
  r jsonb; fails text[] := '{}';
begin
  insert into auth.users(id, email) values (ua, 'zzh_'||left(ua::text,8)||'@example.invalid');
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ua, 'role','authenticated')::text, true);

  -- 1 · ON POSE UNE POSITION, ET ELLE SE RELIT.
  r := public.feed_badge_set('em:abc', 12.5, 80);
  if r->>'ok' <> 'true' then fails := fails || ('set '||r::text); end if;

  -- 2 · LES BORNES SONT EN BASE, pas dans la page : hors écran, ça ne s'enregistre pas.
  r := public.feed_badge_set('em:abc', 300, -10);
  if (r->>'x') <> '100' or (r->>'y') <> '0' then fails := fails || ('bornes '||r::text); end if;

  -- 3 · UNE RÉFÉRENCE TROP COURTE EST REFUSÉE (la clé du feed fait au moins 3 caractères).
  r := public.feed_badge_set('ab', 1, 1);
  if r->>'why' <> 'ref' then fails := fails || ('ref '||r::text); end if;

  -- 4 · MES POSITIONS EN UNE LECTURE.
  r := public.my_feed_badges();
  if r->'pos'->'em:abc'->>0 <> '100' then fails := fails || ('lecture '||r::text); end if;

  -- 5 · LES DROITS : rien pour anon, la table sans politique (lue et écrite par fonction).
  if has_function_privilege('anon','public.feed_badge_set(text,real,real)','EXECUTE')
     or has_function_privilege('anon','public.my_feed_badges()','EXECUTE')
     or not has_function_privilege('authenticated','public.feed_badge_set(text,real,real)','EXECUTE')
     then fails := fails || 'grants'; end if;
  if (select count(*) from pg_policies where schemaname='public' and tablename='feed_badges') <> 0
     then fails := fails || 'rls_policy'; end if;

  raise exception 'FEED BADGES SELFTEST (rolled back) | FAIL=%', fails;
end $t$;
