-- 22/10/2026 — L'essai visuel : une pièce de TEST traverse génération et curation,
-- et s'arrête avant Printful. Budget : 3 générations d'essai par 7 jours.
-- Attendu : une erreur « SELFTEST (rolled back) | FAIL={} » (c'est le succès : tout est annulé).
do $$
declare u uuid; g uuid; s uuid; c uuid; c2 uuid; r jsonb; tok uuid; concept uuid; fails text[] := '{}';
        stock integer; places integer;
begin
  select user_id into u from public.boutique_admins limit 1;
  select id, claimed into g, stock from public.totehm_cloth_support order by active desc limit 1;
  select id, remaining_capacity into s, places from public.artistic_styles where active limit 1;

  -- 1. une pièce de TEST payée entre dans la file (le trigger n'a plus son `not new.test`)
  insert into public.totehm_clothes(user_id,email,name,size,message,garment_id,style_id,test)
    values (u,'essai@example.test','0.essai-'||substr(md5(random()::text),1,8),'L','Slow is smooth',g,s,true)
    returning id into c;
  update public.totehm_clothes set status='paid', paid_at=now(), stripe_payment_intent='pi_selftest' where id=c;
  if not exists(select 1 from public.streetwear_jobs where cloth_id=c and stage='generation') then fails := fails || 'pas_de_file'; end if;
  -- …et elle ne consomme NI stock NI place de style
  if (select claimed from public.totehm_cloth_support where id=g) <> stock then fails := fails || 'stock_consomme'; end if;
  if (select remaining_capacity from public.artistic_styles where id=s) <> places then fails := fails || 'style_consomme'; end if;

  -- 2. la génération se réserve (plus de `test_blocked`)
  r := public.streetwear_claim(c,'generation');
  if not coalesce((r->>'ok')::boolean,false) then fails := fails || ('claim_gen:'||coalesce(r->>'reason','?')); end if;
  tok := (r->>'token')::uuid;

  -- 3. sept concepts, la fin de l'étape → curation, et Telegram à prévenir
  insert into public.cloth_concepts(cloth_id,batch_id,image_url,storage_path,position)
    select c,(select generation_batch from public.totehm_clothes where id=c),
           'https://essai.invalid/'||i||'.png',c::text||'/'||i||'.png',i from generate_series(1,7) i;
  if not public.streetwear_complete(c,'generation',tok,'{}'::jsonb) then fails := fails || 'complete_gen'; end if;
  if (select status from public.totehm_clothes where id=c) <> 'curation' then fails := fails || 'pas_curation'; end if;
  if not exists(select 1 from public.streetwear_jobs where cloth_id=c and stage='notify') then fails := fails || 'pas_notify'; end if;

  -- 4. la curation : le choix de Wah, l'œuvre composée
  select id into concept from public.cloth_concepts where cloth_id=c order by position limit 1;
  r := public.streetwear_claim(c,'curation',concept);
  if not coalesce((r->>'ok')::boolean,false) then fails := fails || ('claim_cur:'||coalesce(r->>'reason','?')); end if;
  tok := (r->>'token')::uuid;
  if not public.streetwear_complete(c,'curation',tok,jsonb_build_object('storage_path',c::text||'/final.png','final_url','https://essai.invalid/f.png')) then fails := fails || 'complete_cur'; end if;
  if (select status from public.totehm_clothes where id=c) <> 'approved' then fails := fails || 'pas_approved'; end if;

  -- 5. ET LÀ ÇA S'ARRÊTE : aucune étape Printful ouverte, aucune réservation possible
  if exists(select 1 from public.streetwear_jobs where cloth_id=c and stage='printful') then fails := fails || 'file_printful'; end if;
  if public.streetwear_claim(c,'printful')->>'reason' <> 'test_stop' then fails := fails || 'printful_pas_bloque'; end if;
  if public.streetwear_claim(c,'tracking')->>'reason' <> 'test_stop' then fails := fails || 'tracking_pas_bloque'; end if;
  if public.streetwear_complete(c,'printful',tok,'{"order_id":"x"}'::jsonb) then fails := fails || 'complete_printful'; end if;

  -- 6. le budget : trois générations d'essai par 7 jours, pas plus
  update public.streetwear_jobs set attempts=3, updated_at=now() where cloth_id=c and stage='generation';
  insert into public.totehm_clothes(user_id,email,name,size,message,garment_id,style_id,test)
    values (u,'essai@example.test','0.essai-'||substr(md5(random()::text),1,8),'L','Slow is smooth',g,s,true)
    returning id into c2;
  update public.totehm_clothes set status='paid', paid_at=now(), stripe_payment_intent='pi_selftest2' where id=c2;
  if public.streetwear_claim(c2,'generation')->>'reason' <> 'test_budget' then fails := fails || 'budget_pas_applique'; end if;
  update public.streetwear_jobs set attempts=1 where cloth_id=c and stage='generation';
  if not coalesce((public.streetwear_claim(c2,'generation')->>'ok')::boolean,false) then fails := fails || 'budget_trop_strict'; end if;

  -- 7. une pièce RÉELLE garde exactement sa chaîne, et un impayé reste refusé
  update public.totehm_clothes set test=false, status='approved' where id=c2;
  if public.streetwear_claim(c2,'printful')->>'reason' = 'test_stop' then fails := fails || 'reelle_bloquee'; end if;
  insert into public.totehm_clothes(user_id,email,name,size,message,garment_id,style_id)
    values (u,'essai@example.test','0.essai-'||substr(md5(random()::text),1,8),'L','Slow is smooth',g,s)
    returning id into c2;
  update public.totehm_clothes set status='paid' where id=c2;
  if public.streetwear_claim(c2,'generation')->>'reason' <> 'unpaid' then fails := fails || 'unpaid_perdu'; end if;

  raise exception 'SELFTEST (rolled back) | FAIL=%', fails;
end $$;
