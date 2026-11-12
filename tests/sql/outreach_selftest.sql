-- TOTEHM · 12/11/2026 — CONQUER THE WORLD : réservé, envoyé, compté, fermé.
-- Attendu : « SELFTEST (rolled back) | FAIL={} » — c'est le succès, et tout est annulé.
do $$
declare u uuid; a uuid; b uuid; c uuid; r jsonb; d jsonb; bo jsonb; fails text[] := '{}';
begin
  select user_id into u from public.boutique_admins limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);

  -- 1 · ON AJOUTE PAR LOT, ET UN DOUBLON NE PASSE PAS DEUX FOIS
  r := public.outreach_add(jsonb_build_array(
        jsonb_build_object('name','Galeria Selftest A','city','Selftestville','email','a@selftest.test','rank',3),
        jsonb_build_object('name','Galeria Selftest B','city','Selftestville','email','b@selftest.test','rank',1),
        jsonb_build_object('name','Galeria Selftest A','city','Selftestville','email','a@selftest.test','rank',3),
        jsonb_build_object('name','','city','','email','')));
  if (r->>'added')::int <> 2 then fails := fails || ('ajout=' || (r->>'added')); end if;
  select id into a from public.outreach_prospects where email = 'a@selftest.test';
  select id into b from public.outreach_prospects where email = 'b@selftest.test';

  -- 2 · LA RÉSERVATION PREND LE PLUS PRESTIGIEUX D'ABORD, ET MARQUE
  d := public.outreach_claim('first', 'Selftestville', 1);
  if jsonb_array_length(d->'jobs') <> 1 then fails := fails || 'claim_un'; end if;
  if (d->'jobs'->0->>'id') <> a::text then fails := fails || 'claim_prestige'; end if;
  if (select status from public.outreach_prospects where id = a) <> 'contacted' then fails := fails || 'claim_statut'; end if;
  if (d->'templates'->'gallery_first'->>'subject') is null then fails := fails || 'claim_mots'; end if;

  -- 3 · DEUX TAPS N'ÉCRIVENT PAS DEUX FOIS À LA MÊME GALERIE
  d := public.outreach_claim('first', 'Selftestville', 5);
  if exists (select 1 from jsonb_array_elements(d->'jobs') e where e->>'id' = a::text) then fails := fails || 'claim_deux_fois'; end if;

  -- 4 · UN ÉCHEC REND LA LIGNE À LA FILE, AVEC SON MOTIF
  perform public.outreach_sent(b, 'first', 'Sujet', false, 'invalid address');
  if (select status from public.outreach_prospects where id = b) <> 'to_contact' then fails := fails || 'echec_rendu'; end if;
  if (select last_error from public.outreach_prospects where id = b) is null then fails := fails || 'echec_motif'; end if;

  -- 5 · UN SUCCÈS RESTE CONTACTÉ, ET LE GRAND LIVRE GARDE LES DEUX
  perform public.outreach_sent(a, 'first', 'Sujet', true, null);
  if (select status from public.outreach_prospects where id = a) <> 'contacted' then fails := fails || 'succes_statut'; end if;
  if (select count(*) from public.outreach_sends s join public.outreach_prospects p on p.id = s.prospect_id
       where p.city = 'Selftestville') <> 2 then fails := fails || 'livre'; end if;

  -- 6 · UNE VILLE N'EST CONQUISE QUE PAR UNE GALERIE QUI SIGNE
  bo := public.outreach_board('Selftestville');
  if exists (select 1 from jsonb_array_elements(bo->'cities') e
              where e->>'city' = 'Selftestville' and (e->>'conquered')::boolean) then fails := fails || 'conquise_trop_tot'; end if;
  perform public.outreach_mark(a, 'signed', 'ok');
  bo := public.outreach_board('Selftestville');
  if not exists (select 1 from jsonb_array_elements(bo->'cities') e
                  where e->>'city' = 'Selftestville' and (e->>'conquered')::boolean) then fails := fails || 'conquise'; end if;
  if (select signed_at from public.outreach_prospects where id = a) is null then fails := fails || 'signe_heure'; end if;

  -- 7 · LA PORTE : une galerie se présente sans compte, et une adresse bancale est refusée
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  r := public.outreach_apply('gallery', 'Galeria Porta', 'Selftestville', 'porta@selftest.test', 'x.test', 'bonjour');
  if not (r->>'ok')::boolean then fails := fails || 'porte'; end if;
  r := public.outreach_apply('gallery', 'Galeria Porta', 'Selftestville', 'pas-un-email');
  if (r->>'error') <> 'email' then fails := fails || 'porte_email'; end if;
  r := public.outreach_apply('painter', 'X', 'Y', 'x@y.test');
  if (r->>'error') <> 'kind' then fails := fails || 'porte_kind'; end if;

  -- 8 · LE COCKPIT NE S'OUVRE PAS À N'IMPORTE QUI
  if (public.outreach_board(null)->>'error') <> 'forbidden' then fails := fails || 'cockpit_ouvert'; end if;
  if (public.outreach_add('[]'::jsonb)->>'error') <> 'forbidden' then fails := fails || 'ajout_ouvert'; end if;

  -- 9 · ET PERSONNE D'AUTRE QUE LE SERVICE N'ENVOIE
  if has_function_privilege('anon', 'public.outreach_claim(text,text,int)', 'execute')
     or has_function_privilege('authenticated', 'public.outreach_claim(text,text,int)', 'execute')
     or has_function_privilege('anon', 'public.outreach_sent(uuid,text,text,boolean,text)', 'execute')
     or has_function_privilege('authenticated', 'public.outreach_sent(uuid,text,text,boolean,text)', 'execute') then
    fails := fails || 'envoi_ouvert';
  end if;

  raise exception 'SELFTEST (rolled back) | FAIL=%', fails;
end $$;
