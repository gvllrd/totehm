-- COM · 25/10/2026 — retirer un de mes spots (`spot_remove`). Écrit puis annule tout (exception finale).
-- Attendu : « SPOT_REMOVE · FAIL={} ». Aucune suppression : le spot passe à `cancelled`, puis tout est annulé.
DO $t$
declare s uuid; u uuid; autre uuid; r jsonb; fails text[]:='{}';
begin
  -- 1 · ni anon ni le public ; un membre connecté, oui
  if has_function_privilege('anon','public.spot_remove(uuid)','EXECUTE')
     or not has_function_privilege('authenticated','public.spot_remove(uuid)','EXECUTE') then
    fails:=array_append(fails,'grants'); end if;

  select p.spot_id, p.user_id into s, u from public.spot_plans p where p.status = 'published' order by p.created_at desc limit 1;
  if s is null then raise exception 'SPOT_REMOVE · FAIL={pas de spot publié pour l''essai}'; end if;
  select pr.id into autre from public.profiles pr where pr.id <> u limit 1;

  -- 2 · sans session : refusé
  perform set_config('request.jwt.claims', '', true);
  if (public.spot_remove(s))->>'why' <> 'signin' then fails:=array_append(fails,'sans session'); end if;

  -- 3 · un autre membre : refusé, le spot ne bouge pas
  if autre is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', autre, 'role', 'authenticated')::text, true);
    r := public.spot_remove(s);
    if r->>'why' <> 'not_mine' or (select status from public.spot_plans where spot_id = s) <> 'published' then
      fails:=array_append(fails,'pas le mien '||r::text); end if;
  end if;

  -- 4 · le propriétaire : le spot sort du fil (`club_spots` ne lit que `published`), une seconde fois ne fait rien
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  r := public.spot_remove(s);
  if not coalesce((r->>'ok')::boolean, false) or (select status from public.spot_plans where spot_id = s) <> 'cancelled' then
    fails:=array_append(fails,'le mien '||r::text); end if;
  if exists (select 1 from jsonb_array_elements(public.club_spots('past')->'items') x where x->>'id' = s::text)
     or exists (select 1 from jsonb_array_elements(public.club_spots('now')->'items') x where x->>'id' = s::text)
     or exists (select 1 from jsonb_array_elements(public.club_spots('future')->'items') x where x->>'id' = s::text) then
    fails:=array_append(fails,'encore dans le fil'); end if;
  if (public.spot_remove(s))->>'why' <> 'not_mine' then fails:=array_append(fails,'deux fois'); end if;

  raise exception 'SPOT_REMOVE · FAIL=%', fails;
end $t$;
