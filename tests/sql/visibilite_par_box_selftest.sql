-- COM · 26/10/2026 — la visibilité PAR BOX (`totehm_read`, `box_audience_set`). Écrit puis annule tout (exception finale).
-- Attendu : « VISIBILITE · FAIL={} ». Aucune suppression.
DO $t$
declare u uuid; p text; autre uuid; r jsonb; h text; o uuid; n0 int; fails text[]:='{}';
begin
  -- 1 · ni anon ni le public ; un membre connecté, oui
  if has_function_privilege('anon','public.totehm_read(text)','EXECUTE')
     or not has_function_privilege('authenticated','public.totehm_read(text)','EXECUTE') then
    fails:=array_append(fails,'grants'); end if;
  -- 2 · une box est binaire : plus aucun `figher` ni `public` sur les cinq objets
  if exists (select 1 from public.objectives where audience in ('figher','public'))
     or exists (select 1 from public.repulsions where audience in ('figher','public'))
     or exists (select 1 from public.visions where audience in ('figher','public'))
     or exists (select 1 from public.wisdom where audience in ('figher','public'))
     or exists (select 1 from public.habit_audience where audience in ('figher','public')) then
    fails:=array_append(fails,'binaire'); end if;

  -- un créateur qui a au moins une habitude et un objectif ; un autre membre, non abonné
  select t.user_id, pr.pseudo into u, p from public.totehms t join public.profiles pr on pr.id = t.user_id
   where jsonb_array_length(coalesce(t.steps,'[]'::jsonb)) > 0
     and exists (select 1 from public.objectives ob where ob.user_id = t.user_id) limit 1;
  if u is null then raise exception 'VISIBILITE · FAIL={pas de créateur pour l''essai}'; end if;
  select pr.id into autre from public.profiles pr where pr.id <> u and not public._subscriber_of(u, pr.id) limit 1;
  select btrim(s->>'t') into h from public.totehms t, jsonb_array_elements(t.steps) s where t.user_id = u limit 1;
  select ob.id into o from public.objectives ob where ob.user_id = u
     and coalesce(ob.status,'active') not in ('achieved','abandoned','converted') limit 1;

  -- 3 · sans session : refusé ; un nom inconnu : personne
  perform set_config('request.jwt.claims', '', true);
  if (public.totehm_read(p))->>'why' <> 'signin' then fails:=array_append(fails,'sans session'); end if;

  -- 4 · le propriétaire lit TOUT, même une box privée
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  if (public.totehm_read('zz-personne-'||md5(random()::text)))->>'why' <> 'nobody' then fails:=array_append(fails,'nobody'); end if;
  r := public.box_audience_set('h', h, 'private');
  if not coalesce((r->>'ok')::boolean,false) then fails:=array_append(fails,'set h '||r::text); end if;
  r := public.totehm_read(p);
  if not coalesce((r->>'ok')::boolean,false)
     or not exists (select 1 from jsonb_array_elements(r->'steps') s where btrim(s->>'t') = h) then
    fails:=array_append(fails,'proprietaire'); end if;

  -- 5 · un non-abonné : ni l'habitude privée, ni son NOM dans les liens (objs, hs)
  if autre is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', autre, 'role', 'authenticated')::text, true);
    r := public.totehm_read(p);
    if coalesce((r->>'ok')::boolean,false) and (
         exists (select 1 from jsonb_array_elements(r->'steps') s where btrim(s->>'t') = h)
      or (r->'objs') ? h
      or exists (select 1 from jsonb_array_elements(r->'reps') x, jsonb_array_elements_text(x->'hs') y where y = h)) then
      fails:=array_append(fails,'fuite habitude'); end if;
    if coalesce((r->>'ok')::boolean,false) and r->>'why' is not null then fails:=array_append(fails,'forme'); end if;
  end if;

  -- 6 · une box montrée à « my subscribers » : le plafond du Totehm suit (`_totehm_audience_recalc`)
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  if o is not null then
    r := public.box_audience_set('t', o::text, 'subscribers');
    if r->>'audience' <> 'subscribers' or r->>'totehm' <> 'subscribers' then
      fails:=array_append(fails,'plafond '||r::text); end if;
  end if;

  raise exception 'VISIBILITE · FAIL=%', fails;
end $t$;
