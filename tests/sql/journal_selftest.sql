-- COM · 24/10/2026 — le journal de mon TOTEHM (`totehm_journal`) et son tableau de bord (`my_dashboard`).
-- Écrit puis annule tout (exception finale). Attendu : « JOURNAL · FAIL={} ».
DO $t$
declare u uuid; st jsonb; o uuid; v uuid; w uuid; d jsonb; h jsonb; n int; fails text[]:='{}';
begin
  -- 1 · personne ne lit ni n'écrit le journal en direct ; le tableau de bord, seulement un membre connecté
  if has_table_privilege('anon','public.totehm_journal','SELECT') or has_table_privilege('authenticated','public.totehm_journal','SELECT')
     or has_table_privilege('authenticated','public.totehm_journal','INSERT')
     or has_function_privilege('authenticated','public._journal(uuid,text,text,text,text,text,jsonb,timestamptz)','EXECUTE')
     or has_function_privilege('anon','public.my_dashboard(text)','EXECUTE')
     or not has_function_privilege('authenticated','public.my_dashboard(text)','EXECUTE') then
    fails:=array_append(fails,'grants'); end if;

  select t.user_id, t.steps into u, st from public.totehms t where exists (select 1 from public.profiles p where p.id = t.user_id) limit 1;
  if u is null then raise exception 'JOURNAL · FAIL={pas de membre d''essai}'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);

  -- 2 · HABITS : ajoutée, renommée (t0 = l'ancien texte), intention et rythme changés — la base écrit, pas la page
  update public.totehms set steps = coalesce(st,'[]'::jsonb) || jsonb_build_array(jsonb_build_object('t','JOURNAL habit','t0','JOURNAL habit','is',jsonb_build_array('focus'),'i','focus','f','daily'))
   where user_id = u;
  update public.totehms set steps = coalesce(st,'[]'::jsonb) || jsonb_build_array(jsonb_build_object('t','JOURNAL renamed','t0','JOURNAL habit','is',jsonb_build_array('focus'),'i','focus','f','daily'))
   where user_id = u;
  update public.totehms set steps = coalesce(st,'[]'::jsonb) || jsonb_build_array(jsonb_build_object('t','JOURNAL renamed','t0','JOURNAL renamed','is',jsonb_build_array('fight'),'i','fight','f','every_other_day'))
   where user_id = u;
  select count(*) into n from public.totehm_journal j where j.user_id = u and j.box = 'habit' and j.at > now() - interval '1 minute'
     and ((j.kind = 'habit_added' and j.label = 'JOURNAL habit') or (j.kind = 'habit_renamed' and j.label = 'JOURNAL renamed' and j.detail->>'from' = 'JOURNAL habit')
       or (j.kind = 'intention_changed' and j.intention = 'fight') or (j.kind = 'rhythm_changed' and j.detail->>'to' = 'every_other_day'));
  if n <> 4 then fails:=array_append(fails,'habits '||n); end if;
  if exists (select 1 from public.totehm_journal j where j.user_id = u and j.at > now() - interval '1 minute' and j.kind = 'habit_removed' and j.label = 'JOURNAL habit') then
    fails:=array_append(fails,'renommer ≠ retirer'); end if;

  -- 3 · OBJECTIF, VISION, MY STORY : nés, abandonnés, effacés
  insert into public.objectives(user_id, text, target_at, status) values (u, 'JOURNAL objectif', now() + interval '10 days', 'active') returning id into o;
  update public.objectives set status = 'abandoned', outcome = 'no' where id = o;
  delete from public.objectives where id = o;
  insert into public.visions(user_id, text) values (u, 'JOURNAL vision') returning id into v;
  delete from public.visions where id = v;
  insert into public.wisdom(user_id, text) values (u, 'JOURNAL story') returning id into w;
  select count(*) into n from public.totehm_journal j where j.user_id = u and j.at > now() - interval '1 minute'
     and j.kind in ('objective_added','objective_abandoned','objective_removed','vision_added','vision_removed','story_added');
  if n <> 6 then fails:=array_append(fails,'boxes '||n); end if;

  -- 4 · LE SUIVI TELEGRAM : fait aujourd'hui, pas fait hier, demandé avant-hier sans réponse ; une Reflection
  insert into public.habit_outcomes(user_id, habit_text, intention, asked_at, answered_at, outcome, source)
    values (u, 'JOURNAL renamed', 'fight', now(), now(), 'done', 'telegram'),
           (u, 'JOURNAL renamed', 'fight', now() - interval '1 day', now() - interval '1 day', 'missed', 'telegram'),
           (u, 'JOURNAL renamed', 'fight', now() - interval '2 days', null, null, 'telegram');
  insert into public.sm_uses(user_id, kind, status) values (u, 'say', 'ok');
  if (select count(*) from public.totehm_journal j where j.user_id = u and j.at > now() - interval '3 days'
        and ((j.kind = 'tracked_done' and j.label = 'JOURNAL renamed') or (j.kind = 'tracked_missed' and j.label = 'JOURNAL renamed'))) <> 2 then
    fails:=array_append(fails,'suivi'); end if;
  if not exists (select 1 from public.totehm_journal j where j.user_id = u and j.kind = 'reflection' and j.at > now() - interval '1 minute') then
    fails:=array_append(fails,'reflection'); end if;

  -- 4 bis · le journal va partout (`le_journal_va_partout`) : le where, le son de l'intention, un lien objectif ↔ Habit
  insert into public.habit_spots(user_id, habit_text, place) values (u, 'JOURNAL renamed', 'JOURNAL parc')
    on conflict (user_id, habit_text) do update set place = excluded.place;
  update public.intention_music set active = false where user_id = u and intention = 'fight' and active;
  insert into public.intention_music(user_id, intention, title, artist, platform, active) values (u, 'fight', 'JOURNAL son', 'Selftest', 'spotify', true);
  insert into public.objectives(user_id, text, target_at, status) values (u, 'JOURNAL lien', now() + interval '20 days', 'active') returning id into o;
  insert into public.objective_habits(objective_id, user_id, habit_text) values (o, u, 'JOURNAL renamed');
  select count(*) into n from public.totehm_journal j where j.user_id = u and j.at > now() - interval '1 minute'
     and ((j.kind = 'where_set' and j.label = 'JOURNAL renamed' and j.detail->>'place' = 'JOURNAL parc')
       or (j.kind = 'sound_set' and j.label = 'JOURNAL son' and j.intention = 'fight')
       or (j.kind = 'link_added' and j.box = 'objective' and j.label = 'JOURNAL renamed'));
  if n <> 3 then fails:=array_append(fails,'partout '||n); end if;

  -- 5 · une erreur du journal ne remonte jamais (une case inconnue est refusée en silence)
  begin perform public._journal(u, 'nope', 'x', 'y', null, null); exception when others then fails:=array_append(fails,'journal bloque'); end;

  -- 6 · LE TABLEAU DE BORD
  d := public.my_dashboard('UTC');
  select x into h from jsonb_array_elements(d->'habits') x where x->>'t' = 'JOURNAL renamed';
  if h is null then fails:=array_append(fails,'habit absente'); else
    if h->'c'->>6 <> 'd' or h->'c'->>5 <> 'm' or h->'c'->>4 <> 'a' then fails:=array_append(fails,'cases '||(h->'c')::text); end if;
    if (h->>'fait')::int <> 1 or (h->>'serie')::int <> 1 or (h->>'cible')::int <> 4 then fails:=array_append(fails,'série/cible '||h::text); end if;
  end if;
  if jsonb_array_length(d->'days') <> 7 or jsonb_array_length(d->'heat') <> 84 then fails:=array_append(fails,'jours/heat'); end if;
  if (d->'days'->6->>'fait')::int < 1 or (d->'week'->>'aujourdhui')::int < 1 then fails:=array_append(fails,'aujourd''hui'); end if;
  if (select count(*) from jsonb_object_keys(d->'intentions')) <> 7 or (d->'intentions'->'fight'->>'fait')::int < 1 then fails:=array_append(fails,'intentions'); end if;
  if not exists (select 1 from jsonb_array_elements(d->'feed') x where x->>'k' = 'reflection') then fails:=array_append(fails,'fil'); end if;
  if (d->'heat'->>83)::int < 5 or (d->'totals'->>'gestes')::int < 10 then fails:=array_append(fails,'activité'); end if;
  if d->>'tz' <> 'UTC' or public.my_dashboard('Pas/Une_Zone')->>'tz' is null then fails:=array_append(fails,'fuseau'); end if;

  -- 7 · le compte effacé : le journal part avec lui
  delete from public.profiles where id = u;
  if exists (select 1 from public.totehm_journal where user_id = u) then fails:=array_append(fails,'oubli'); end if;

  raise exception 'JOURNAL · FAIL=%', fails;
end $t$;
