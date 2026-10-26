-- 26/10/2026 — LE VERSO DE LA BOUTIQUE : mes pièces, mes projets, et rien d'un autre.
-- Attendu : une erreur « SELFTEST (rolled back) | FAIL={} » (c'est le succès : tout est annulé).
do $$
declare u uuid; r jsonb; fails text[] := '{}';
begin
  -- Sans compte : rien, et surtout pas une erreur.
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  r := public.my_boutique_board();
  if (r->>'signed_in')::boolean or jsonb_array_length(r->'cloths') <> 0 then fails := fails || 'anon'; end if;
  if public.cloth_shots('0.quelquechose') <> '[]'::jsonb then fails := fails || 'anon_shots'; end if;

  -- Un membre : ses lignes SEULES.
  select user_id into u from public.totehm_clothes where user_id is not null limit 1;
  if u is not null then
    perform set_config('request.jwt.claims', json_build_object('sub',u,'role','authenticated')::text, true);
    r := public.my_boutique_board();
    if not (r->>'signed_in')::boolean then fails := fails || 'membre'; end if;
    if exists (select 1 from jsonb_array_elements(r->'cloths') e where e->>'name' is null) then fails := fails || 'nom_nul'; end if;
    if exists (select 1 from jsonb_array_elements(r->'cloths') e
                where not exists (select 1 from public.totehm_clothes c where c.user_id = u and c.name = e->>'name'))
      then fails := fails || 'fuite'; end if;
    -- Un nom qui n'est pas à moi ne rend aucune photo.
    if public.cloth_shots('0.jamais-vu-ici') <> '[]'::jsonb then fails := fails || 'shots_autre'; end if;
  end if;

  raise exception 'SELFTEST (rolled back) | FAIL=%', fails;
end $$;
