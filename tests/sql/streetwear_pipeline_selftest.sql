-- Every fixture is rolled back by the final expected exception.
do $$
declare u uuid; g uuid:=gen_random_uuid(); s uuid; c uuid:=gen_random_uuid(); t uuid:=gen_random_uuid();
  a jsonb; b jsonb; ct uuid; pt uuid; concept uuid; initial_capacity integer; n integer;
begin
  select user_id into u from public.boutique_testers where active limit 1;
  select id,remaining_capacity into s,initial_capacity from public.artistic_styles where active limit 1;
  if u is null or s is null then raise exception 'fixtures_unavailable'; end if;
  insert into public.totehm_cloth_support(id,title,price,max_pieces,claimed,active) values(g,'__streetwear_selftest',170,10,0,false);
  insert into public.totehm_clothes(id,garment_id,user_id,style_id,name,size,price,test,stripe_session_id,message)
    values(t,g,u,s,'0.__test_'||t,'M',170,true,'cs_test_'||t,'fixture'),
          (c,g,u,s,'0.__live_'||c,'M',170,false,'cs_live_'||c,'fixture');
  perform public.streetwear_settle_cloth(t,'cs_test_'||t,'pi_test_'||t,'{}','',true,17000);
  if (select claimed from public.totehm_cloth_support where id=g)<>0 then raise exception 'test_consumes_stock'; end if;
  if (select remaining_capacity from public.artistic_styles where id=s)<>initial_capacity then raise exception 'test_consumes_style'; end if;
  if exists(select 1 from public.streetwear_jobs where cloth_id=t) then raise exception 'test_queued'; end if;
  if public.streetwear_claim(t,'generation')->>'reason'<>'test_blocked' then raise exception 'test_not_blocked'; end if;
  if public.streetwear_claim(c,'generation')->>'reason'<>'unpaid' then raise exception 'unpaid_not_blocked'; end if;
  a:=public.streetwear_settle_cloth(c,'cs_live_'||c,'pi_live_'||c,'{}','',false,17000);
  if not (a->>'settled')::boolean then raise exception 'not_settled'; end if;
  a:=public.streetwear_settle_cloth(c,'cs_live_'||c,'pi_live_'||c,'{}','',false,17000);
  if (a->>'settled')::boolean or (select claimed from public.totehm_cloth_support where id=g)<>1 then raise exception 'duplicate_payment'; end if;
  if (select count(*) from public.streetwear_jobs where cloth_id=c and stage='generation')<>1 then raise exception 'missing_outbox'; end if;
  a:=public.streetwear_claim(c,'generation'); b:=public.streetwear_claim(c,'generation');
  if not (a->>'ok')::boolean or (b->>'ok')::boolean then raise exception 'duplicate_generation'; end if;
  for n in 1..7 loop
    insert into public.cloth_concepts(cloth_id,batch_id,position,storage_path,image_url)
    values(c,(a->'cloth'->>'generation_batch')::uuid,n,c||'/concept-'||n||'.png','https://example.test/concept');
  end loop;
  if not public.streetwear_complete(c,'generation',(a->>'token')::uuid) then raise exception 'generation_completion'; end if;
  select id into concept from public.cloth_concepts where cloth_id=c and position=1;
  a:=public.streetwear_claim(c,'curation',concept); ct:=(a->>'token')::uuid;
  b:=public.streetwear_claim(c,'curation',concept);
  if not (a->>'ok')::boolean or (b->>'ok')::boolean or public.streetwear_regenerate(c) then raise exception 'duplicate_curation'; end if;
  perform public.streetwear_checkpoint(c,'curation',ct,'{"prediction_id":"fixture"}',true);
  b:=public.streetwear_claim(c,'curation',concept);
  if not (b->>'ok')::boolean then raise exception 'prediction_not_resumable'; end if;
  if public.streetwear_complete(c,'curation',ct,jsonb_build_object('storage_path',c||'/final.png')) then raise exception 'stale_lease'; end if;
  if not public.streetwear_complete(c,'curation',(b->>'token')::uuid,jsonb_build_object('storage_path',c||'/final.png','final_url','https://example.test/final','print_url','https://example.test/print')) then raise exception 'curation_completion'; end if;
  if not (select selected from public.cloth_concepts where id=concept) then raise exception 'selection_not_committed'; end if;
  a:=public.streetwear_claim(c,'printful'); pt:=(a->>'token')::uuid;
  if (public.streetwear_claim(c,'printful')->>'ok')::boolean then raise exception 'duplicate_order'; end if;
  perform public.streetwear_complete(c,'printful',pt,'{"order_id":"fixture","printful_status":"draft"}');
  if (select status from public.totehm_clothes where id=c)<>'approved' then raise exception 'draft_labelled_production'; end if;
  if (public.streetwear_claim(c,'printful')->>'ok')::boolean then raise exception 'ordered_again'; end if;
  if has_function_privilege('anon','public.streetwear_claim(uuid,text,uuid)','execute') or has_function_privilege('authenticated','public.streetwear_claim(uuid,text,uuid)','execute') then raise exception 'public_claim'; end if;
  if not has_function_privilege('service_role','public.streetwear_claim(uuid,text,uuid)','execute') then raise exception 'service_claim_missing'; end if;
  if has_table_privilege('authenticated','public.streetwear_jobs','select') or has_table_privilege('authenticated','public.totehm_clothes','update') then raise exception 'public_write'; end if;
  raise exception 'STREETWEAR SELFTEST (rolled back): FAIL={}';
end $$;
