-- COM · 22/10/2026 — le miroir du Higher Self : `_bot_mirror`, `_mirror_places`.
-- Écrit puis annule tout (exception finale). Attendu : « FAIL={} ».
DO $t$
declare u uuid; h text; i text; o uuid; rid bigint; r jsonb; hb jsonb; fails text[]:='{}';
begin
  -- 1 · personne d'autre que le serveur
  if has_function_privilege('anon','public._bot_mirror(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public._bot_mirror(uuid)','EXECUTE')
     or has_function_privilege('anon','public._mirror_places(uuid,double precision,double precision)','EXECUTE')
     or has_function_privilege('authenticated','public._mirror_places(uuid,double precision,double precision)','EXECUTE')
     or not has_function_privilege('service_role','public._bot_mirror(uuid)','EXECUTE') then
    fails:=array_append(fails,'grants'); end if;

  -- un membre dont une Habit porte une intention
  select tt.user_id, btrim(s->>'t'), (public._step_intentions(s))[1] into u, h, i
    from public.totehms tt, jsonb_array_elements(tt.steps) s
   where btrim(coalesce(s->>'t','')) <> '' and cardinality(public._step_intentions(s)) > 0 limit 1;
  if u is null then raise exception 'MIROIR · FAIL={pas de membre d''essai}'; end if;

  -- 2 · la box Habit entière : son where, le son de son intention, l'objectif qu'elle sert, la répulsion qui la menace
  insert into public.habit_spots(user_id, habit_text, place) values (u, h, 'the park downstairs')
    on conflict (user_id, habit_text) do update set place = excluded.place;
  update public.intention_music set active = false where user_id = u and intention = i and active;
  insert into public.intention_music(user_id, intention, title, artist, platform, active) values (u, i, 'dark techno', 'Selftest', 'spotify', true);
  insert into public.objectives(user_id, text, target_at, status) values (u, 'MIROIR objectif', now() + interval '30 days', 'active') returning id into o;
  insert into public.objective_habits(objective_id, user_id, habit_text) values (o, u, h);
  -- une seule répulsion active par Habit (`repulsions_one_active`) : celle d'essai naît sur une autre Habit et se lie à la mienne
  insert into public.repulsions(user_id, repulsion, obstacle, problem, habit_text, active)
    values (u, 'MIROIR répulsion', 'MIROIR obstacle', 'MIROIR problème', 'MIROIR autre habit', true) returning id into rid;
  insert into public.repulsion_habits(repulsion_id, user_id, habit_text) values (rid, u, h);
  r := public._bot_mirror(u);
  select x into hb from jsonb_array_elements(r->'habits') x where x->>'text' = h limit 1;
  if hb is null or hb->>'where' <> 'the park downstairs' then fails:=array_append(fails,'where '||coalesce(hb::text,'∅')); end if;
  if not (hb->'is') ? i then fails:=array_append(fails,'intention'); end if;
  if not (hb->'objectives') ? 'MIROIR objectif' then fails:=array_append(fails,'habit→objectif'); end if;
  if not (hb->'repulsions') ? 'MIROIR répulsion' then fails:=array_append(fails,'habit→répulsion'); end if;
  if r->'sounds'->i->>'kind' <> 'dark techno' then fails:=array_append(fails,'son '||coalesce(r->'sounds'::text,'∅')); end if;
  if not exists (select 1 from jsonb_array_elements(r->'objectives') x where x->>'text' = 'MIROIR objectif'
                   and (x->'habits') ? h and (x->>'days_left')::int between 29 and 31) then fails:=array_append(fails,'objectif→habit'); end if;
  if not exists (select 1 from jsonb_array_elements(r->'repulsions') x where x->>'text' = 'MIROIR répulsion' and (x->'habits') ? h) then
    fails:=array_append(fails,'répulsion→habit'); end if;

  -- 3 · des lieux réels près de moi, qui partagent une de mes intentions ; rien de loin, rien hors de mes intentions
  insert into public.places(place_id, name, intentions, lieu_type, address, lat, lng)
    values ('miroir_pres', 'MIROIR parc', array[i], 'park', 'Rua do Teste 1', 38.70001, -9.40001),
           ('miroir_loin', 'MIROIR loin', array[i], 'park', 'Far away', 38.90, -9.40),
           ('miroir_hors', 'MIROIR hors', array[case when i = 'focus' then 'fight' else 'focus' end], 'gym', 'Rua do Teste 2', 38.70002, -9.40002)
    on conflict (place_id) do nothing;
  insert into public.live_events(event_id, source, name, url, intentions, venue_name, city, lat, lng, starts_at)
    values ('miroir_evt', 'selftest', 'MIROIR concert', 'https://example.org/e', array[i], 'Salle', 'Lisbon', 38.701, -9.401, now() + interval '3 days'),
           ('miroir_passe', 'selftest', 'MIROIR passé', 'https://example.org/p', array[i], 'Salle', 'Lisbon', 38.701, -9.401, now() - interval '1 day')
    on conflict (event_id) do nothing;
  r := public._mirror_places(u, 38.7, -9.4);
  if r->'origin'->>'source' <> 'page' then fails:=array_append(fails,'origin'); end if;
  if not exists (select 1 from jsonb_array_elements(r->'items') x where x->>'ref' = 'miroir_pres' and x->>'id' ~ '^P\d+$' and (x->>'km')::numeric < 0.1) then
    fails:=array_append(fails,'lieu près '||(r->'items')::text); end if;
  if exists (select 1 from jsonb_array_elements(r->'items') x where x->>'ref' in ('miroir_loin','miroir_passe')) then fails:=array_append(fails,'loin ou passé'); end if;
  if not exists (select 1 from jsonb_array_elements(r->'items') x where x->>'ref' = 'miroir_evt' and x->>'id' ~ '^E\d+$') then fails:=array_append(fails,'événement'); end if;
  if (select count(*) from public.totehms tt, jsonb_array_elements(tt.steps) s, unnest(public._step_intentions(s)) k
       where tt.user_id = u and k = (case when i = 'focus' then 'fight' else 'focus' end)) = 0
     and exists (select 1 from jsonb_array_elements(r->'items') x where x->>'ref' = 'miroir_hors') then fails:=array_append(fails,'hors intentions'); end if;
  -- sans position et sans spot : rien, jamais une ville inventée
  if exists (select 1 from public.spot_plans p where p.user_id = u and coalesce(p.lat,p.clat) is not null) then null;
  elsif public._mirror_places(u, null, null)->'origin' <> 'null'::jsonb then fails:=array_append(fails,'sans position'); end if;

  raise exception 'MIROIR · FAIL=%', fails;
end $t$;
