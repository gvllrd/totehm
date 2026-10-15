-- Local Postgres regression only. Real repository function bodies, no external writes.
\set ON_ERROR_STOP on
begin;
do $test$
declare
  free_user uuid := gen_random_uuid(); paid_user uuid := gen_random_uuid(); gifted_user uuid := gen_random_uuid();
  expired_user uuid := gen_random_uuid(); empty_user uuid := gen_random_uuid(); annual_user uuid := gen_random_uuid();
  seller_user uuid := gen_random_uuid(); subscriber_user uuid := gen_random_uuid(); email_user uuid := gen_random_uuid();
  test_user uuid; thp_art uuid; qa_art uuid; qa_edition uuid; thp_edition uuid; garment uuid; art_style uuid;
  token text := left(replace(gen_random_uuid()::text, '-', ''), 10);
  seller_pseudo text; qa_slug text; cloth_name text; r jsonb; expected boolean; baseline boolean;
  failures text[] := '{}';
begin
  seller_pseudo := 'paidtest_' || token;
  qa_slug := 'paidtest-' || token;
  cloth_name := '0.paidtest-' || token;
  insert into auth.users(id, email) values
    (free_user, 'free_' || token || '@example.invalid'),
    (paid_user, 'paid_' || token || '@example.invalid'),
    (gifted_user, 'gifted_' || token || '@example.invalid'),
    (expired_user, 'expired_' || token || '@example.invalid'),
    (empty_user, 'empty_' || token || '@example.invalid'),
    (annual_user, 'annual_' || token || '@example.invalid'),
    (seller_user, 'seller_' || token || '@example.invalid'),
    (subscriber_user, 'subscriber_' || token || '@example.invalid'),
    (email_user, 'email_' || token || '@example.invalid');
  insert into public.profiles(id, pseudo) values
    (free_user, 'free_' || token), (paid_user, 'paid_' || token), (gifted_user, 'gifted_' || token),
    (expired_user, 'expired_' || token), (empty_user, 'empty_' || token), (annual_user, 'annual_' || token),
    (seller_user, seller_pseudo), (subscriber_user, 'sub_' || token), (email_user, 'email_' || token);
  insert into public.totehms(user_id, steps, totehm_visibility, audience)
    values (free_user, '[{"t":"Run the hill"}]', 'private', 'private'),
           (paid_user, '[{"t":"Run the hill"}]', 'private', 'private'),
           (gifted_user, '[]', 'private', 'private'),
           (expired_user, '[]', 'private', 'private'),
           (empty_user, '[]', 'private', 'private'),
           (annual_user, '[{"t":"Run the hill"}]', 'private', 'private'),
           (seller_user, '[]', 'subscribers', 'subscribers'),
           (subscriber_user, '[]', 'private', 'private'),
           (email_user, '[{"t":"Walk the city"}]', 'private', 'private');
  foreach test_user in array array[free_user, annual_user] loop
    insert into public.objectives(user_id, text) values(test_user, 'Run a marathon');
    insert into public.repulsions(user_id, repulsion) values(test_user, 'Give up');
    insert into public.wisdom(user_id, text) values(test_user, 'One step daily');
    insert into public.visions(user_id, text) values(test_user, 'The finish line');
  end loop;
  insert into public.figher_comps(email, reason) values ('gifted_' || token || '@example.invalid', 'Local selftest');
  insert into public.figher_comps(email, reason, expires_at)
    values ('expired_' || token || '@example.invalid', 'Local selftest expired', now() - interval '1 day');
  insert into public.stoner_access(email) values('empty_' || token || '@example.invalid');
  insert into public.subscriptions(user_id, status) values(annual_user, 'active');
  insert into public.creator_profiles(user_id, monetized, custom_sub_price, payout_method)
    values(seller_user, true, 9900, 'iban');
  insert into public.creator_subscriptions(creator_id, fan_id, status)
    values(seller_user, subscriber_user, 'active');
  insert into public.bot_subscriptions(user_id, status) values(paid_user, 'active');

  insert into public.art_collections(slug, title, kind) values
    ('totehmpaper', 'THP test', 'access'), ('quantum', 'Quantum test', 'digital') on conflict(slug) do nothing;
  insert into public.artworks(slug, title, collection, edition_total, price_cents)
    values('totehmpaper', 'THP test', 'totehmpaper', 777000, 1700) on conflict(slug) do nothing;
  select id into thp_art from public.artworks where slug='totehmpaper';
  insert into public.art_editions(artwork_id, edition_no, owner_id)
    values(thp_art, 123450, paid_user);
  insert into public.art_editions(artwork_id, edition_no, owner_email)
    values(thp_art, 123451, upper('email_' || token || '@example.invalid'));
  insert into public.artworks(slug, title, collection, edition_total, price_cents)
    values(qa_slug, 'Paid gate test', 'quantum', 100, 1700) returning id into qa_art;
  insert into public.art_editions(artwork_id, edition_no, owner_id, list_price_cents, list_currency)
    values(qa_art, 1, seller_user, 3000, 'eur') returning id into qa_edition;
  insert into public.art_editions(artwork_id, edition_no, owner_id, list_price_cents, list_currency)
    values(thp_art, 123452, seller_user, 1700, 'eur') returning id into thp_edition;

  -- Independent rule: new free membership must never become paid access.
  if not public._is_figher(free_user) or public._art_passport(free_user) then failures := failures || 'complete_free_separated'; end if;
  if public._is_figher(paid_user) or not public._art_passport(paid_user) then failures := failures || 'thp_habit_retained'; end if;
  if public._is_figher(gifted_user) or not public._art_passport(gifted_user) then failures := failures || 'gift_retained_not_club'; end if;
  if public._art_passport(expired_user) then failures := failures || 'expired_gift_refused'; end if;
  if public._art_passport(empty_user) then failures := failures || 'thp_without_habit_refused'; end if;
  if not public._is_figher(annual_user) or public._art_passport(annual_user) then failures := failures || 'annual_no_thp_separated'; end if;
  if public._is_figher(email_user) or not public._art_passport(email_user) then failures := failures || 'email_thp_habit_retained'; end if;
  if public._art_passport(null) then failures := failures || 'null_art_passport'; end if;

  -- Owned edition numbers and email-based ownership survive Club changes.
  if public._figher(paid_user)->>'number' <> '123450' or public._thp_number(paid_user) <> 123450 then failures := failures || 'owned_thp_number'; end if;
  if public._figher(email_user)->>'number' <> '123451' or public._thp_number(email_user) <> 123451 then failures := failures || 'email_thp_number'; end if;
  if public._figher(paid_user)->>'thp' <> 'true' or public._figher(empty_user)->>'thp' <> 'true' then failures := failures || 'thp_metadata'; end if;

  -- Real primary and resale reservations still enforce the original gate.
  r := public.art_primary_reserve(qa_slug, free_user);
  if r->>'why' is distinct from 'thp_required' then failures := failures || 'free_primary_refused'; end if;
  r := public.art_resale_reserve(qa_edition, free_user);
  if r->>'why' is distinct from 'thp_required' then failures := failures || 'free_resale_refused'; end if;
  r := public.art_primary_reserve(qa_slug, paid_user);
  if r->>'ok' is distinct from 'true' then failures := failures || 'thp_habit_primary'; end if;
  r := public.art_resale_reserve(qa_edition, paid_user);
  if r->>'ok' is distinct from 'true' then failures := failures || 'thp_habit_resale'; end if;
  r := public.art_primary_reserve(qa_slug, gifted_user);
  if r->>'ok' is distinct from 'true' then failures := failures || 'gift_primary'; end if;
  r := public.art_primary_reserve(qa_slug, email_user);
  if r->>'ok' is distinct from 'true' then failures := failures || 'email_primary'; end if;
  r := public.art_primary_reserve(qa_slug, empty_user);
  if r->>'why' is distinct from 'thp_required' then failures := failures || 'empty_habit_primary_refused'; end if;
  -- The THP resale entrance remains open, allowing the first THP purchase.
  r := public.art_resale_reserve(thp_edition, free_user);
  if r->>'ok' is distinct from 'true' then failures := failures || 'first_thp_resale_open'; end if;

  foreach test_user in array array[free_user, paid_user, gifted_user, empty_user, expired_user, annual_user, email_user] loop
    perform set_config('request.jwt.claims', jsonb_build_object('sub', test_user, 'role', 'authenticated')::text, true);
    expected := test_user = any(array[paid_user, gifted_user, email_user]);
    r := public.market_view(null, null);
    if (r->>'can_buy_art')::boolean is distinct from expected then failures := failures || ('market_gate_' || test_user::text); end if;
    if (r->'door'->>'thp')::boolean is distinct from public._art_owns_thp(test_user) then failures := failures || 'market_thp_metadata'; end if;
    r := public.my_entitlements();
    if (r->'access'->>'reveal')::boolean is distinct from expected then failures := failures || ('entitlements_reveal_' || test_user::text); end if;
    if (r->'access'->>'market_art')::boolean is distinct from public._art_owns_thp(test_user) then failures := failures || 'entitlements_thp_unchanged'; end if;
    if (r->'figher'->>'member')::boolean is distinct from public._is_figher(test_user) then failures := failures || 'entitlements_club_metadata'; end if;
  end loop;

  -- A real paid Cloth tests the three existing read levels.
  insert into public.totehm_cloth_support(title, max_pieces) values('Fixture garment', 100) returning id into garment;
  insert into public.artistic_styles(name) values('Fixture style') returning id into art_style;
  insert into public.totehm_clothes(user_id, name, box_kind, box_snapshot, garment_id, style_id, size, paid_at, status)
    values(seller_user, cloth_name, 'wisdom',
      '{"text":"Private teaching","view":"wisdom","palette":["navy"],"is":["fight"],"matter":{"objectives":[{"text":"Private objective"}]}}',
      garment, art_style, 'XL', now(), 'production');
  foreach test_user in array array[free_user, paid_user, gifted_user, seller_user, subscriber_user, email_user] loop
    perform set_config('request.jwt.claims', jsonb_build_object('sub', test_user, 'role', 'authenticated')::text, true);
    r := public.reveal_cloth(cloth_name);
    if test_user = free_user then
      if r->>'level' is distinct from 'locked' or r->>'text' is not null or r->'matter' <> 'null'::jsonb then failures := failures || 'free_cloth_locked'; end if;
    elsif test_user = any(array[seller_user, subscriber_user]) then
      if r->>'level' is distinct from 'full' or r->>'text' is distinct from 'Private teaching' or r->'matter' = 'null'::jsonb then failures := failures || 'owner_subscriber_full'; end if;
    else
      if r->>'level' is distinct from 'member' or r->>'text' is distinct from 'Private teaching' or r->'matter' <> 'null'::jsonb then failures := failures || 'paid_member_level'; end if;
    end if;
  end loop;

  -- Paid bot and creator offers retain their current independent rules.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', free_user, 'role', 'authenticated')::text, true);
  if (public.totehmbot_access()->>'active')::boolean or public._higher_active(free_user) then failures := failures || 'free_club_not_paid_bot'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', paid_user, 'role', 'authenticated')::text, true);
  if not (public.totehmbot_access()->>'active')::boolean or not public._higher_active(paid_user) then failures := failures || 'paid_bot_survives_without_club'; end if;
  if not public._higher_active(gifted_user) then failures := failures || 'bot_gift_preserved'; end if;
  if public._is_figher(seller_user) or public._is_figher(expired_user) then failures := failures || 'creator_fixture_not_club'; end if;
  r := public.creator_offer(seller_pseudo, expired_user);
  if r->>'ok' is distinct from 'true' or r->>'price_cents' is distinct from '9900' then failures := failures || 'creator_offer_without_club'; end if;
  r := public.creator_offer(seller_pseudo, subscriber_user);
  if r->>'why' is distinct from 'already' then failures := failures || 'creator_existing_sub_retained'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', subscriber_user, 'role', 'authenticated')::text, true);
  if not public.is_subscribed_to(seller_user) or not public._shared_with_me(seller_user) then failures := failures || 'creator_subscriber_read_survives'; end if;

  perform set_config('request.jwt.claims', '{}', true);
  r := public.market_view(null, null);
  if (r->>'can_buy_art')::boolean then failures := failures || 'anon_market_locked'; end if;
  r := public.reveal_cloth(cloth_name);
  if r->>'level' is distinct from 'locked' then failures := failures || 'anon_cloth_locked'; end if;
  if has_function_privilege('anon', 'public._art_passport(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public._art_passport(uuid)', 'execute')
     or not has_function_privilege('service_role', 'public._art_passport(uuid)', 'execute') then failures := failures || 'art_passport_execute_boundary'; end if;

  if cardinality(failures) > 0 then raise exception 'PAID ACCESS SELFTEST FAILED: %', failures; end if;
  raise notice 'PAID ACCESS SELFTEST PASS: completion/THP/Habit/gift/expiry, real reservation gates, market, entitlements, Reveal, bot and creator subscriptions';
end $test$;
rollback;
