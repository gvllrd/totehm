-- COM · habit_spaces sépare spaces et spots (09/10/2026).
-- Crée 4 spaces (dont 1 privé) et 2 spots sur une Habit d'essai, lit en
-- propriétaire puis en étranger ; l'exception finale annule tout.
-- Attendu : « FAIL={} ».
DO $t$
declare ua uuid; pa text; r jsonb; r2 jsonb; h jsonb; h2 jsonb; fails text[]:='{}'; i int; v_id uuid;
begin
  if has_function_privilege('anon','public.habit_spaces(text)','EXECUTE') or not has_function_privilege('authenticated','public.habit_spaces(text)','EXECUTE') then fails:=array_append(fails,'grants'); end if;
  select id, pseudo into ua, pa from public.profiles where pseudo is not null and btrim(pseudo)<>'' and id in (select id from auth.users) limit 1;
  for i in 1..6 loop
    insert into public.spots(user_id, intention, activite, lat, lng, duration_min, expires_at, is_public, required_role, active)
    values (ua, 'focus', 'Selftest habit', 38.7, -9.1, 30, now(), false, 'public', false) returning id into v_id;
    insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at, duration_min, mode, place,
                                  lat, lng, clat, clng, visibility, shield, city, capacity, access, selection, kind, format, status)
    values (v_id, ua, 'Selftest habit', array['focus'], '{}'::jsonb,
            case when i<=4 then now() - make_interval(hours => i) when i=5 then now() + interval '2 days' else now() - interval '3 days' end,
            30, 'silent', 'Lisbon', 38.7223, -9.1393, 38.7, -9.1,
            case when i=4 then 'private' else 'shared' end, case when i>=5 then 'on' else 'off' end,
            'Lisbon', 1, 'club', 'manual', 'experience', case when i<=4 then 'space' else 'spot' end, 'published');
  end loop;

  perform set_config('request.jwt.claims',json_build_object('sub',ua,'role','authenticated')::text,true);
  r:=public.habit_spaces();
  select x into h from jsonb_array_elements(r->'habits') x where x->>'habit'='Selftest habit';
  if (h->>'total_spaces')::int<>4 then fails:=array_append(fails,'owner_spaces '||coalesce(h->>'total_spaces','null')); end if;
  if (h->>'total_spots')::int<>2 then fails:=array_append(fails,'owner_spots '||coalesce(h->>'total_spots','null')); end if;
  if (h->>'total')::int<>6 then fails:=array_append(fails,'owner_total'); end if;
  if jsonb_array_length(h->'spaces')<>3 then fails:=array_append(fails,'max3'); end if;
  if jsonb_array_length(h->'spots')<>2 then fails:=array_append(fails,'spots_len'); end if;
  if exists(select 1 from jsonb_array_elements(h->'spaces') s where s->>'format'<>'space') then fails:=array_append(fails,'spaces_mixed'); end if;
  if exists(select 1 from jsonb_array_elements(h->'spots') s where s->>'format'<>'spot') then fails:=array_append(fails,'spots_mixed'); end if;
  if (h->'spots'->0->>'starts_at')::timestamptz < now() then fails:=array_append(fails,'next_spot_first'); end if;
  if exists(select 1 from jsonb_array_elements(h->'spaces') s where (s->'exact') is not null and s->'exact'<>'null'::jsonb) then fails:=array_append(fails,'space_exact_owner'); end if;

  perform set_config('request.jwt.claims',json_build_object('sub','00000000-0000-4000-8000-000000000009','role','authenticated')::text,true);
  r2:=public.habit_spaces(pa);
  select x into h2 from jsonb_array_elements(r2->'habits') x where x->>'habit'='Selftest habit';
  if (h2->>'total_spaces')::int<>3 then fails:=array_append(fails,'reader_spaces '||coalesce(h2->>'total_spaces','null')); end if;
  if (h2->>'total_spots')::int<>2 then fails:=array_append(fails,'reader_spots'); end if;
  if exists(select 1 from jsonb_array_elements(coalesce(h2->'spaces','[]'::jsonb)||coalesce(h2->'spots','[]'::jsonb)) s
             where s->>'visibility'<>'shared' or ((s->'exact') is not null and s->'exact'<>'null'::jsonb)) then fails:=array_append(fails,'reader_leak'); end if;
  raise exception 'HABIT_SPACES_SPLIT owner=% spaces=% spots=% · reader spaces=% · FAIL=%', pa is not null, h->>'total_spaces', h->>'total_spots', h2->>'total_spaces', fails;
end $t$;
