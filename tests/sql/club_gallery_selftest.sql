-- 15/10/2026 · Club gratuit, trois périodes, filtres globaux et droits payants.
-- Exécuter après la migration dans une base de développement : aucune donnée
-- n'est conservée. La fixture locale utilise les vrais corps des fonctions du dépôt.
begin;
do $test$
declare
  ua uuid := gen_random_uuid(); uf uuid := gen_random_uuid(); us uuid := gen_random_uuid();
  un uuid := gen_random_uuid(); up uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  prefix text := 'zzclub_' || left(ua::text, 8); at_time timestamptz := now() - interval '1 second';
  aud text[] := array['private','figher','subscribers','public']; periods text[] := array['past','now','future'];
  ids uuid[] := '{}'; one uuid; last_id uuid; thp uuid; art uuid; edition uuid; i int; j int;
  starts timestamptz; r jsonb; e jsonb; page1 jsonb; page2 jsonb; fails text[] := '{}';
begin
  insert into auth.users(id,email) values
    (ua,prefix||'_a@example.invalid'),(uf,prefix||'_f@example.invalid'),
    (us,prefix||'_s@example.invalid'),(un,prefix||'_n@example.invalid'),
    (up,prefix||'_p@example.invalid'),(uc,prefix||'_c@example.invalid');
  insert into public.profiles(id,pseudo) values
    (ua,prefix||'_a'),(uf,prefix||'_f'),(us,prefix||'_s'),(un,prefix||'_n'),
    (up,prefix||'_p'),(uc,prefix||'_c');
  insert into public.totehms(user_id,steps) values
    (uf,'[{"t":"   "}]'),(up,'[{"t":"Keep a habit","f":"daily","is":["fight"]}]');
  insert into public.figher_comps(email,reason) values(prefix||'_c@example.invalid','club selftest');
  if public._is_figher(uf) or public._is_figher(uc) then fails := fails || 'empty_or_comp_not_club'; end if;
  update public.totehms set steps='[{"t":"Keep a habit","f":"daily","is":["fight"]}]' where user_id=uf;
  insert into public.objectives(user_id,text) values(uf,'   ');
  insert into public.repulsions(user_id,repulsion,active) values(uf,'   ',true);
  insert into public.wisdom(user_id,text) values(uf,'   ');
  insert into public.visions(user_id,text) values(uf,'   ');
  if public._is_figher(uf) then fails := fails || 'blank_boxes_counted'; end if;
  update public.objectives set text='A real objective' where user_id=uf;
  update public.repulsions set repulsion='A real repulsion' where user_id=uf;
  update public.wisdom set text='A real story' where user_id=uf;
  if public._is_figher(uf) then fails := fails || 'four_views_counted'; end if;
  update public.visions set text='A real vision' where user_id=uf;
  if not public._is_figher(uf) or public._art_passport(uf)
     or public._figher(uf)->'number' <> 'null'::jsonb then fails := fails || 'complete_free_club'; end if;
  if not public._art_passport(uc) then fails := fails || 'gifted_art_preserved'; end if;
  insert into public.creator_subscriptions(creator_id,fan_id,status) values(ua,us,'active');
  if public._is_figher(us) then fails := fails || 'subscriber_fixture_is_club'; end if;

  -- Douze spots, mêmes Habit et critères ; médias facultatifs et point OFF.
  for j in 1..3 loop
    starts := case j when 1 then at_time-interval '2 hours' when 2 then at_time-interval '10 minutes'
                    else at_time+interval '2 hours' end;
    for i in 1..4 loop
      insert into public.spots(user_id,intention,activite,lat,lng,duration_min,expires_at,is_public,required_role,active)
      values(ua,'fight','fixture',38.7,-9.1,60,starts+interval '1 hour',false,'public',false) returning id into one;
      insert into public.spot_plans(spot_id,user_id,habit,intentions,snapshot,starts_at,duration_min,
        mode,place,lat,lng,clat,clng,visibility,audience,shield,city,capacity,access,selection,kind,format,status,
        photo,video,show_why,created_at)
      values(one,ua,prefix,array['fight'],
        '{"freq":"daily","show_objectives":true,"show_repulsions":true,
          "objectives":[{"text":"Climb the zebra peak","is":["focus"]},{"text":"Hidden quokka objective"}],
          "repulsions":[{"text":"Lazy narwhal mornings"}],"hide":{"objectives":[1]}}',
        starts,60,'silent','Secret exact point',38.721,-9.141,38.7,-9.1,
        case when i=1 then 'private' else 'shared' end,aud[i],case when i=4 then 'off' else 'on' end,
        'Lisbon',4,'club','manual','experience','spot','published',
        case when j=2 then ua::text||'/'||one::text||'.jpg' end,
        case when j=1 then ua::text||'/'||one::text||'.mp4' end,true,at_time-interval '1 day');
      ids := ids||one;
    end loop;
  end loop;

  perform set_config('request.jwt.claims','{}',true);
  for j in 1..3 loop
    r := public.club_spots(periods[j],jsonb_build_object('habit',prefix),null,null,100,0,at_time);
    if (r->>'total')::int<>1 or r->'items'<>r->'spots' then fails := fails || ('anon_'||periods[j]); end if;
    e := r->'items'->0;
    if e->'exact'<>'null'::jsonb or e->'habit_box'->'place'<>'null'::jsonb or e ? 'distance' or e ? 'bearing'
       then fails := fails || ('anon_point_'||periods[j]); end if;
    if e::text like '%quokka%' then fails := fails || 'hidden_context_leaks'; end if;
  end loop;
  if public._clip_readable(ua::text||'/'||ids[7]::text||'.jpg') then fails := fails || 'anon_subscriber_media'; end if;
  if public.spot_get(ids[3])->>'why'<>'nothing' then fails := fails || 'anon_subscriber_detail'; end if;

  -- L'abonnement ouvre Club et subscribers, sans passeport Club.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',us,'role','authenticated')::text,true);
  for j in 1..3 loop
    r := public.club_spots(periods[j],jsonb_build_object('habit',prefix),null,null,100,0,at_time);
    if (r->>'total')::int<>3 then fails := fails || ('subscriber_'||periods[j]); end if;
    if exists(select 1 from jsonb_array_elements(r->'items') x where x->>'audience'='private')
      then fails := fails || 'subscriber_private'; end if;
    if not exists(select 1 from jsonb_array_elements(r->'items') x where x->>'audience'='subscribers'
        and x->'exact'->>'place'='Secret exact point') then fails := fails || 'subscriber_point'; end if;
    if exists(select 1 from jsonb_array_elements(r->'items') x where x->>'audience'='public' and x->'exact'<>'null'::jsonb)
      then fails := fails || 'off_point_leak'; end if;
  end loop;
  if not public._clip_readable(ua::text||'/'||ids[7]::text||'.jpg') then fails := fails || 'subscriber_media'; end if;
  if public.spot_get(ids[3])->>'ok'<>'true' then fails := fails || 'subscriber_detail'; end if;
  page1 := public.club_spots('future',jsonb_build_object('habit',prefix),null,null,1,0,at_time);
  page2 := public.club_spots('future',jsonb_build_object('habit',prefix),null,null,1,1,(page1->>'as_of')::timestamptz);
  if (page1->>'total')::int<>3 or not (page1->>'has_more')::boolean
     or page1->'items'->0->>'id'=page2->'items'->0->>'id'
     or (page2->>'next_offset')::int<>2 then fails := fails || 'pagination'; end if;
  r := public.club_spots('future',jsonb_build_object('habit',prefix,'intentions',jsonb_build_array('fight'),
    'pillars',jsonb_build_array('BODY'),'rhythms',jsonb_build_array('daily'),
    'objectives',jsonb_build_array('zebra peak'),'repulsions',jsonb_build_array('narwhal'),'type','none',
    'scope','near','radius_km',50,'city','lisbon'),38.72,-9.14,1,0,at_time);
  if (r->>'total')::int<>3 then fails := fails || 'all_detailed_filters_before_page'; end if;
  r := public.club_spots('future',jsonb_build_object('habit',prefix,'objectives',jsonb_build_array('quokka')),null,null,100,0,at_time);
  if (r->>'total')::int<>0 then fails := fails || 'hidden_objective_filter_oracle'; end if;
  r := public.club_spots('future',jsonb_build_object('habit',prefix,'pillars',jsonb_build_array('SOUL')),null,null,100,0,at_time);
  if (r->>'total')::int<>0 then fails := fails || 'pillar_filter'; end if;
  r := public.club_spots('future',jsonb_build_object('habit',prefix,'scope','near'),null,null,100,0,at_time);
  if r->>'why'<>'location' then fails := fails || 'near_requires_location'; end if;
  r := public.club_spots('past',jsonb_build_object('habit',prefix,'type','video'),null,null,100,0,at_time);
  if (r->>'total')::int<>3 then fails := fails || 'video_filter'; end if;
  r := public.club_spots('now',jsonb_build_object('habit',prefix,'type','photo'),null,null,100,0,at_time);
  if (r->>'total')::int<>3 then fails := fails || 'photo_filter'; end if;
  -- Une modification d'audience/d'abonnement est effective même avec une ancre.
  update public.creator_subscriptions set status='canceled' where creator_id=ua and fan_id=us;
  r := public.club_spots('future',jsonb_build_object('habit',prefix),null,null,100,0,at_time);
  if (r->>'total')::int<>1 or public.spot_get(ids[3])->>'why'<>'nothing'
     or public._clip_readable(ua::text||'/'||ids[7]::text||'.jpg') then fails := fails || 'subscription_revocation'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uf,'role','authenticated')::text,true);
  r := public.club_spots('now',jsonb_build_object('habit',prefix),null,null,100,0,at_time);
  if (r->>'total')::int<>2 then fails := fails || 'club_not_subscriber'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ua,'role','authenticated')::text,true);
  r := public.club_spots('now',jsonb_build_object('habit',prefix),null,null,100,0,at_time);
  if (r->>'total')::int<>4 then fails := fails || 'owner_private'; end if;
  if public.club_spots('invalid')->>'why'<>'period' then fails := fails || 'invalid_period'; end if;

  -- Plus d'une page complète : la recherche trouve aussi un résultat placé
  -- après les cent premiers, et la seconde page récupère tous les restants.
  for i in 1..125 loop
    insert into public.spots(user_id,intention,activite,lat,lng,duration_min,expires_at,is_public,required_role,active)
    values(ua,'fight','fixture',38.7,-9.1,60,at_time+interval '2 days',true,'public',false) returning id into one;
    insert into public.spot_plans(spot_id,user_id,habit,intentions,snapshot,starts_at,duration_min,
      mode,place,lat,lng,clat,clng,visibility,audience,shield,city,capacity,access,selection,kind,format,status,show_why,created_at)
    values(one,ua,prefix||' paginated',array['fight'],jsonb_build_object('show_objectives',true,
      'objectives',case when i=125 then '[{"text":"Unique albatross destination"}]'::jsonb else '[]'::jsonb end),
      at_time+interval '2 hours'+make_interval(mins=>i),60,'silent','Secret point',38.721,-9.141,38.7,-9.1,
      'shared','public','off','Lisbon',4,'club','manual','experience','spot','published',true,at_time-interval '1 day');
    last_id := one;
  end loop;
  perform set_config('request.jwt.claims','{}',true);
  page1 := public.club_spots('future',jsonb_build_object('habit',prefix||' paginated'),null,null,100,0,at_time);
  page2 := public.club_spots('future',jsonb_build_object('habit',prefix||' paginated'),null,null,100,100,at_time);
  if (page1->>'total')::int<>125 or jsonb_array_length(page1->'items')<>100
     or jsonb_array_length(page2->'items')<>25 or (page2->>'has_more')::boolean
     or not exists(select 1 from jsonb_array_elements(page2->'items') x where x->>'id'=last_id::text)
     then fails := fails || 'pagination_over_hundred'; end if;
  r := public.club_spots('future',jsonb_build_object('habit',prefix||' paginated',
    'objectives',jsonb_build_array('albatross')),null,null,100,0,at_time);
  if (r->>'total')::int<>1 or r->'items'->0->>'id'<>last_id::text then fails := fails || 'filter_beyond_first_hundred'; end if;
  update public.spot_plans set created_at=at_time+interval '1 second' where spot_id=last_id;
  r := public.club_spots('future',jsonb_build_object('habit',prefix||' paginated'),null,null,100,100,at_time);
  if (r->>'total')::int<>124 then fails := fails || 'publication_after_anchor'; end if;

  -- Les bornes temporelles utilisent les vraies durées : futur → présent → passé.
  update public.spot_plans set starts_at=at_time where spot_id=ids[12];
  perform set_config('request.jwt.claims','{}',true);
  if (public.club_spots('now',jsonb_build_object('habit',prefix),null,null,100,0,at_time)->>'total')::int<>2
     then fails := fails || 'exact_start_is_now'; end if;
  update public.spot_plans set starts_at=at_time-interval '60 minutes' where spot_id=ids[12];
  if (public.club_spots('past',jsonb_build_object('habit',prefix),null,null,100,0,at_time)->>'total')::int<>2
     then fails := fails || 'exact_end_is_past'; end if;

  -- L'art reste payant : complétude Club seule ne remplace pas le passeport
  -- commercial historique, et un THP + Habit garde ses droits sans les 5 vues.
  select id into thp from public.artworks where slug='totehmpaper';
  if thp is null then raise exception 'CLUB SELFTEST requires the canonical totehmpaper artwork'; end if;
  insert into public.art_editions(artwork_id,edition_no,owner_id,owner_email)
  select thp,coalesce(max(edition_no),0)+1,up,prefix||'_p@example.invalid' from public.art_editions where artwork_id=thp;
  if public._is_figher(up) or not public._art_passport(up) or not public._art_owns_thp(up)
     then fails := fails || 'paid_owner_independent_club'; end if;
  insert into public.artworks(slug,title,collection,medium,price_cents,currency,edition_total,edition_sold)
  values(prefix,prefix,'quantum','video',1000,'eur',10,1) returning id into art;
  insert into public.art_editions(artwork_id,edition_no,owner_id,owner_email,list_price_cents,list_currency)
  values(art,1,ua,prefix||'_a@example.invalid',1500,'eur') returning id into edition;
  if public.art_primary_reserve(prefix,uf)->>'why'<>'thp_required'
     or public.art_resale_reserve(edition,uf)->>'why'<>'thp_required' then fails := fails || 'free_club_buys_art'; end if;
  if public.art_primary_reserve(prefix,up)->>'ok'<>'true'
     or public.art_resale_reserve(edition,up)->>'ok'<>'true' then fails := fails || 'old_paid_gate_preserved'; end if;
  if public._thp_number(up) is null or public._figher(uf)->'number'<>'null'::jsonb
     or (select owner_id from public.art_editions where id=edition)<>ua then fails := fails || 'ownership_unchanged'; end if;

  if has_function_privilege('authenticated','public._art_passport(uuid)','EXECUTE')
     or has_function_privilege('anon','public._club_spot_view(public.spot_plans,uuid,timestamptz)','EXECUTE')
     or has_function_privilege('authenticated','public.art_primary_reserve(text,uuid)','EXECUTE')
     or not has_function_privilege('anon','public.club_spots(text,jsonb,double precision,double precision,integer,integer,timestamptz)','EXECUTE')
     then fails := fails || 'grants'; end if;
  if cardinality(fails)>0 then raise exception 'CLUB GALLERY SELFTEST | FAIL=%',fails; end if;
  raise notice 'CLUB GALLERY SELFTEST | FAIL={}';
end $test$;
rollback;
