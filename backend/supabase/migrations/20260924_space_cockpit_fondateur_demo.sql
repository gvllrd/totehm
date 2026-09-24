-- TOTEHM · TOTEHM.SPACE — LE COCKPIT, L'ACCÈS FONDATEUR, LES SPOTS DE DÉMO · 24/09/2026
-- ════════════════════════════════════════════════════════════════════
-- Écrite et testée le 24/09 sur la réplique locale. Appliquée par Claude
-- Code (MCP Supabase, `apply_migration`) — CLAUDE_CODE.md du 24/09, étape 4.
-- Idempotente : elle se rejoue sans erreur.
--
-- Trois blocs :
--   A · L'ACCÈS FONDATEUR — une table de « comps » : un email qui y figure
--       est membre FIGHER sans les trois clés. Pour Wah, pour tester.
--       Retour arrière : une ligne à supprimer.
--   B · LA RECHERCHE DE L'ESPACE — `spots_radar` cherche par MOTS (tous
--       doivent se trouver), dans l'habitude, les intentions, les piliers,
--       le rythme, le mood ; et pour un membre, aussi dans le pseudo du
--       créateur, son commentaire, ses objectifs et ses répulsions.
--       Deux filtres de plus : QUAND (now · today · week) et UNE intention.
--   C · LES SPOTS DE DÉMONSTRATION — dix membres `*_demo`, une trentaine de
--       Spots à Lisbonne, marqués `demo`. `demo_seed()` les (re)crée à
--       partir de MAINTENANT, `demo_purge()` les efface tous.
-- ════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════
-- A · L'ACCÈS FONDATEUR
-- ════════════════════════════════════════════════════════════════════
-- ⚠️ ON NE FABRIQUE PAS DE FAUX PAIEMENTS. Écrire une ligne dans
-- `subscriptions` ou `stoner_access` pour ouvrir un accès, ce serait mentir
-- au webhook, au grand livre et aux statistiques. Un accès offert est une
-- DÉCISION, et elle a sa table : qui, pourquoi, depuis quand, jusqu'à quand.
create table if not exists public.figher_comps (
  email      text primary key check (email = lower(btrim(email))),
  reason     text not null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz
);
alter table public.figher_comps enable row level security;
-- Aucune politique : lue par `_figher` (security definer) seulement.

insert into public.figher_comps(email, reason)
values ('gvallerand5@gmail.com', 'founder — full access to create and search, 24/09/2026')
on conflict (email) do nothing;

-- `_figher` : la même fonction qu'au 23/09, plus UNE clé qui court-circuite
-- les trois autres. Les trois morceaux restent VRAIS (on ne prétend pas que
-- le Totehm est complet) ; seul `member` change, et `comp` dit pourquoi.
create or replace function public._figher(p_user uuid)
returns jsonb
language plpgsql stable security definer
set search_path to 'public'
as $f$
declare
  v_pass jsonb; v_email text; v_num int; v_st text; v_complete boolean; v_comp boolean := false;
begin
  if p_user is null then
    return jsonb_build_object('signed_in', false, 'complete', false, 'remplies', 0,
      'thp', false, 'number', null, 'annual', false, 'trial', false, 'member', false, 'comp', false);
  end if;

  v_pass := public.totehm_complete(p_user);
  v_complete := coalesce((v_pass->>'complete')::boolean, false);

  select lower(u.email) into v_email from auth.users u where u.id = p_user;
  if v_email is not null then
    select t.rang into v_num from (
      select lower(s.email) as e, row_number() over (order by s.granted_at)::int as rang
        from public.stoner_access s) t
     where t.e = v_email;
    select exists (select 1 from public.figher_comps c
                    where c.email = v_email and (c.expires_at is null or c.expires_at > now()))
      into v_comp;
  end if;

  select s.status into v_st from public.subscriptions s where s.user_id = p_user;

  return jsonb_build_object(
    'signed_in', true,
    'complete',  v_complete,
    'remplies',  coalesce((v_pass->>'remplies')::int, 0),
    'views', jsonb_build_object(
      'habits',     coalesce((v_pass->>'habits')::boolean, false),
      'objectives', coalesce((v_pass->>'objectives')::boolean, false),
      'repulsions', coalesce((v_pass->>'repulsions')::boolean, false),
      'wisdom',     coalesce((v_pass->>'wisdom')::boolean, false),
      'visions',    coalesce((v_pass->>'visions')::boolean, false)),
    'thp',    v_num is not null,
    'number', v_num,
    'annual', coalesce(v_st in ('active','trialing'), false),
    'trial',  coalesce(v_st = 'trialing', false),
    'comp',   v_comp,
    'member', v_comp or (v_complete and v_num is not null and coalesce(v_st in ('active','trialing'), false)));
end $f$;


-- ════════════════════════════════════════════════════════════════════
-- C (d'abord la colonne) · UN SPOT DE DÉMO SE SAIT DÉMO
-- ════════════════════════════════════════════════════════════════════
alter table public.spot_plans add column if not exists demo boolean not null default false;

create table if not exists public.demo_members (
  user_id uuid primary key,
  pseudo  text not null,
  created_at timestamptz not null default now()
);
alter table public.demo_members enable row level security;


-- ════════════════════════════════════════════════════════════════════
-- B · LA RECHERCHE — `spots_radar` v2
-- ════════════════════════════════════════════════════════════════════
-- ⚠️ LA SIGNATURE CHANGE (deux paramètres de plus). `create or replace`
-- créerait une SURCHARGE, et deux fonctions du même nom avec des défauts
-- rendent l'appel ambigu. On retire l'ancienne, on pose la nouvelle, et on
-- redonne les droits à la nouvelle en fin de fichier.
drop function if exists public.spots_radar(double precision, double precision, integer, text, text, boolean, integer);

create or replace function public.spots_radar(
  p_lat double precision, p_lng double precision, p_radius int,
  p_q text default null, p_mode text default null, p_live boolean default false,
  p_limit int default 40, p_when text default null, p_intention text default null)
returns jsonb
language plpgsql volatile security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid(); v_f jsonb; v_member boolean; v_res jsonb;
        v_q text := lower(btrim(coalesce(p_q, '')));
        v_day_end timestamptz := (date_trunc('day', now() at time zone 'Europe/Lisbon') + interval '1 day') at time zone 'Europe/Lisbon';
begin
  v_f := public._figher(v_uid);
  v_member := coalesce((v_f->>'member')::boolean, false);
  if v_uid is not null then perform public._spot_expire(v_uid); end if;

  with c as (
    select p.*, s.lat as rlat, s.lng as rlng,
           case when p_lat is null or p_lng is null then null
                else earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng))::int end as dist_m,
           p.starts_at + make_interval(mins => p.duration_min) as ends_at,
           (select pr.pseudo from public.profiles pr where pr.id = p.user_id) as creator
      from public.spot_plans p join public.spots s on s.id = p.spot_id
     where p.status = 'published' and s.active
       and p.starts_at + make_interval(mins => p.duration_min) > now()
       and p.starts_at < now() + interval '45 days'
       and (p_lat is null or p_lng is null or
            (earth_box(ll_to_earth(p_lat, p_lng), greatest(200, least(coalesce(p_radius, 5000), 60000)))
               @> ll_to_earth(s.lat, s.lng)
             and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng))
               <= greatest(200, least(coalesce(p_radius, 5000), 60000))))
       and (p_mode is null or p.mode = p_mode)
       and (p_intention is null or p_intention = any(p.intentions))
       and (not coalesce(p_live, false) or now() between p.starts_at and p.starts_at + make_interval(mins => p.duration_min))
       and (p_when is null
            or (p_when = 'now'   and now() between p.starts_at and p.starts_at + make_interval(mins => p.duration_min))
            or (p_when = 'today' and p.starts_at < v_day_end)
            or (p_when = 'week'  and p.starts_at < now() + interval '7 days'))
  ), h as (
    -- LA BOTTE DE FOIN. Ce qu'un invité peut lire, il peut le chercher ;
    -- ce qu'il ne peut pas lire (qui, pourquoi, contre quoi), il ne peut
    -- pas le chercher non plus — sinon la recherche deviendrait un moyen
    -- de deviner le contexte caché, un mot à la fois.
    select c.*, lower(concat_ws(' ',
             c.habit, array_to_string(c.intentions, ' '),
             (select string_agg(public._pillar(x), ' ') from unnest(c.intentions) x),
             c.mode, replace(coalesce(c.snapshot->>'freq', ''), '_', ' '),
             c.snapshot->'mood'->>'title',
             case when c.demo then 'demo' end,
             case when v_member or c.user_id = v_uid then concat_ws(' ',
               c.creator, c.comment,
               (select string_agg(e->>'text', ' ') from jsonb_array_elements(coalesce(c.snapshot->'objectives', '[]'::jsonb)) e),
               (select string_agg(e->>'text', ' ') from jsonb_array_elements(coalesce(c.snapshot->'repulsions', '[]'::jsonb)) e))
             end)) as hay
      from c
  ), f as (
    select h.* from h
     where v_q = ''
        or not exists (select 1 from regexp_split_to_table(v_q, '\s+') w
                        where w <> '' and strpos(h.hay, w) = 0)
     order by (now() >= h.starts_at) desc, h.starts_at
     limit greatest(1, least(coalesce(p_limit, 40), 60))
  ), k as (
    select f.*,
           (select count(*) from public.spot_applications a
             where a.spot_id = f.spot_id and a.status = 'accepted')::int as taken,
           (select a.status from public.spot_applications a
             where a.spot_id = f.spot_id and a.user_id = v_uid) as my_status,
           (f.user_id = v_uid) as mine
      from f
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', k.spot_id, 'habit', k.habit, 'intentions', to_jsonb(k.intentions),
      'freq', k.snapshot->>'freq',
      'mode', k.mode, 'starts_at', k.starts_at, 'ends_at', k.ends_at,
      'duration_min', k.duration_min, 'live', now() >= k.starts_at,
      'lat', k.rlat, 'lng', k.rlng, 'dist_m', k.dist_m,
      'capacity', k.capacity, 'taken', k.taken, 'access', k.access, 'selection', k.selection,
      'mine', k.mine, 'my_status', k.my_status, 'demo', k.demo,
      'mood',     k.snapshot->'mood'->>'title',
      'creator',  case when v_member or k.mine then k.creator end,
      'context',  case when v_member or k.mine then k.snapshot - 'at' end,
      'comment',  case when v_member or k.mine then k.comment end,
      'compat',   k.score,
      'place',    case when k.mine or k.my_status = 'accepted' then k.place end,
      'exact',    case when k.mine or k.my_status = 'accepted'
                       then jsonb_build_object('lat', k.lat, 'lng', k.lng) end,
      -- ⚠️ LE PASSEPORT D'ABORD, EN UN BOOLÉEN. On ne teste les trois clés
      -- que pour dire laquelle MANQUE à un non-membre ; un membre (même par
      -- comp) passe directement aux règles du Spot.
      'why_not',  case
         when v_uid is null then 'signin'
         when k.mine then 'mine'
         when not v_member then case
              when not coalesce((v_f->>'complete')::boolean, false) then 'passport'
              when not coalesce((v_f->>'thp')::boolean, false) then 'thp'
              else 'club' end
         when k.my_status in ('pending','accepted') then 'applied'
         when k.my_status = 'rejected' then 'rejected'
         when now() >= k.starts_at then 'started'
         when k.taken >= k.capacity then 'full'
         when k.access = 'subscribers' and not exists (
               select 1 from public.creator_subscriptions cs
                join public.creator_profiles cp on cp.user_id = cs.creator_id
               where cs.creator_id = k.user_id and cs.fan_id = v_uid
                 and cs.status in ('active','trialing') and 'spots' = any(cp.benefits)) then 'subscribers'
         else null end)
    order by k.live_first desc, k.starts_at), '[]'::jsonb)
  into v_res
  from (select k.*, (now() >= k.starts_at) as live_first,
               case when v_member and not k.mine then public._spot_compat(v_uid, k.spot_id) end as score
          from k) k;

  return jsonb_build_object('member', v_member, 'signed_in', v_uid is not null, 'spots', v_res);
end $f$;



-- ── MY SPACE, v2 : ce qu'il faut pour DESSINER LA BOÎTE — le rythme, le
--    contexte (WHY / TRIGGER), les intentions. La page de l'Espace montre un
--    Spot exactement comme totehm.com montre une Habit Box ; sans ces champs
--    elle ne montrerait qu'un titre.
create or replace function public.my_space()
returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $f$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;
  perform public._spot_expire(v_uid);
  return jsonb_build_object(
    'signed_in', true,
    'spots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.spot_id, 'habit', p.habit, 'intentions', to_jsonb(p.intentions),
        'starts_at', p.starts_at, 'duration_min', p.duration_min, 'mode', p.mode,
        'capacity', p.capacity, 'access', p.access, 'selection', p.selection,
        'status', p.status, 'place', p.place,
        'live', now() between p.starts_at and p.starts_at + make_interval(mins => p.duration_min),
        'past', now() > p.starts_at + make_interval(mins => p.duration_min),
        'taken',   (select count(*) from public.spot_applications a where a.spot_id = p.spot_id and a.status = 'accepted'),
        'pending', (select count(*) from public.spot_applications a where a.spot_id = p.spot_id and a.status = 'pending'),
        'lat', s.lat, 'lng', s.lng,
        'freq', p.snapshot->>'freq', 'context', p.snapshot - 'at', 'demo', p.demo)
        order by p.starts_at desc)
      from public.spot_plans p join public.spots s on s.id = p.spot_id
     where p.user_id = v_uid and p.starts_at > now() - interval '30 days'), '[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'spot_id', a.spot_id, 'habit', p.habit, 'starts_at', p.starts_at,
        'intentions', to_jsonb(p.intentions), 'freq', p.snapshot->>'freq',
        'pseudo', pr.pseudo, 'compat', a.compat, 'note', a.note, 'at', a.created_at)
        order by a.compat desc nulls last, a.created_at)
      from public.spot_applications a
      join public.spot_plans p on p.spot_id = a.spot_id
      left join public.profiles pr on pr.id = a.user_id
     where p.user_id = v_uid and a.status = 'pending' and p.status = 'published'), '[]'::jsonb),
    'applications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'spot_id', a.spot_id, 'habit', p.habit, 'starts_at', p.starts_at,
        'duration_min', p.duration_min, 'mode', p.mode, 'status', a.status,
        'spot_status', p.status, 'creator', pr.pseudo,
        'intentions', to_jsonb(p.intentions), 'freq', p.snapshot->>'freq',
        'context', p.snapshot - 'at', 'demo', p.demo, 'capacity', p.capacity,
        'taken', (select count(*) from public.spot_applications x where x.spot_id = p.spot_id and x.status = 'accepted'),
        'place', case when a.status = 'accepted' and p.status = 'published' then p.place end)
        order by p.starts_at desc)
      from public.spot_applications a
      join public.spot_plans p on p.spot_id = a.spot_id
      left join public.profiles pr on pr.id = p.user_id
     where a.user_id = v_uid and p.starts_at > now() - interval '30 days'), '[]'::jsonb));
end $f$;

-- ════════════════════════════════════════════════════════════════════
-- C · LES SPOTS DE DÉMONSTRATION
-- ════════════════════════════════════════════════════════════════════
-- ⚠️ DES MEMBRES DE DÉMO, PAS DES FAUX MEMBRES. Leur pseudo finit par
-- `_demo`, leurs Spots portent `demo = true` et la page l'écrit. Leur email
-- est en `.invalid` — un domaine réservé qui ne reçoit jamais de courrier :
-- personne ne peut s'y connecter, aucun code ne part vers un vrai boîte.
--
-- ⚠️ `auth.users` : on ne remplit que les colonnes qu'un seed Supabase
-- remplit d'habitude, et les jetons à '' (pas NULL) — GoTrue lit ces
-- colonnes comme des chaînes, un NULL le fait échouer sur la liste des
-- utilisateurs du dashboard.
create or replace function public.demo_purge()
returns jsonb
language plpgsql volatile security definer set search_path to 'public', 'auth'
as $f$
declare v_spots int; v_users int;
begin
  delete from public.spots s using public.spot_plans p
   where p.spot_id = s.id and p.demo;
  get diagnostics v_spots = row_count;
  delete from public.spot_applications a using public.demo_members d where a.user_id = d.user_id;
  delete from public.totehms t using public.demo_members d where t.user_id = d.user_id;
  delete from public.profiles pr using public.demo_members d where pr.id = d.user_id;
  delete from auth.users u using public.demo_members d where u.id = d.user_id;
  get diagnostics v_users = row_count;
  delete from public.demo_members;
  return jsonb_build_object('ok', true, 'spots', v_spots, 'members', v_users);
end $f$;

create or replace function public.demo_seed()
returns jsonb
language plpgsql volatile security definer set search_path to 'public', 'auth'
as $f$
declare
  r record; v_uid uuid; v_spot uuid; v_n int := 0; v_apps int := 0; v_start timestamptz;
  v_members text[] := array['ines','tiago','mara','kofi','lea','noor','rui','ada','sol','yuki'];
  m text;
begin
  perform public.demo_purge();

  -- Les dix membres.
  foreach m in array v_members loop
    v_uid := gen_random_uuid();
    insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                           raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                           confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
            m || '@demo.totehm.invalid', '', now(),
            '{"provider":"email","providers":["email"]}'::jsonb, '{"demo":true}'::jsonb, now(), now(),
            '', '', '', '');
    insert into public.profiles(id, pseudo) values (v_uid, m || '_demo')
      on conflict (id) do update set pseudo = excluded.pseudo;
    insert into public.demo_members(user_id, pseudo) values (v_uid, m || '_demo');
  end loop;

  -- Les Spots. `h` = heures à partir de maintenant (négatif = déjà commencé,
  -- donc LIVE tant que la durée court). Lisbonne, du fleuve à Monsanto.
  for r in
    select * from (values
      ('ines',  'Run the river at dawn',                 array['flow'],                'every_morning',   'Ribeira das Naus — by the steps',        38.7068, -9.1390,  1, '07:00', 50,  8, 'social', 'auto',   'club',        'Easy pace, 8 km. We stop once at Cais do Sodré.', 'Run the Lisbon half marathon', 'Snoozing three times',         'deep house, 122 bpm'),
      ('tiago', 'Boxing drills in the park',             array['fight'],               'twice_week',      'Jardim da Estrela — the bandstand',      38.7134, -9.1596,  1, '18:30', 60,  6, 'social', 'manual', 'club',        'Bring wraps. Pads for everyone.',                  'Fight my first amateur bout',  'Skipping the hard rounds',     'old school hip hop'),
      ('mara',  'Read 30 pages without my phone',        array['enrich','focus'],      'every_evening',   'Príncipe Real — under the cedar',         38.7166, -9.1486,   0, '21:00', 45, 10, 'silent', 'auto',   'club',        'Phones in the basket. Any book.',                  'Read 24 books this year',      'Scrolling in bed',             null),
      ('kofi',  'Sketch strangers on the tram',          array['express'],             'weekly',          'Largo do Camões',                         38.7108, -9.1432,  2, '15:00', 90,  5, 'social', 'manual', 'club',        'We ride the 28 and draw whoever sits in front.',   'Fill a sketchbook a month',    'Waiting for inspiration',      null),
      ('lea',   'Deep work, no notifications',           array['focus'],               'every_weekday',   'LX Factory — the long table',             38.7036, -9.1784,  1, '09:30', 120, 12, 'silent', 'auto',   'club',        'Two blocks of 50 minutes. Nobody talks.',          'Ship my portfolio',            'Checking email every ten minutes', 'lofi beats'),
      ('noor',  'Sunset stretch on the miradouro',       array['flow','love'],         'every_evening',   'Miradouro da Senhora do Monte',           38.7188, -9.1330,  null::int, '-15', 90, 15, 'silent', 'auto', 'club',       'Mats if you have one. We stay for the light.',     'Touch my toes by winter',      'Sitting all day',              null),
      ('rui',   'Cold swim at Carcavelos',               array['fight','celebrate'],   'every_weekend',   'Carcavelos — lifeguard tower 3',          38.6780, -9.3350,  2, '08:00', 30,  8, 'social', 'auto',   'club',        'Ten minutes in. Coffee after.',                    'Swim every month of the year', 'Hot showers only',             null),
      ('ada',   'Cook for someone who eats alone',       array['love'],                'weekly',          'Mercado de Campo de Ourique',             38.7184, -9.1650,  3, '19:00', 120,  4, 'social', 'manual', 'club',        'We shop together, cook, and deliver two plates.',  'Host 50 dinners',              'Eating standing up',           null),
      ('sol',   'Write 500 words in a café',             array['express','enrich'],    'every_morning',   'Chiado — the back room',                  38.7107, -9.1421,  2, '08:30', 60,  6, 'silent', 'auto',   'club',        'Write first, talk after.',                         'Finish my first novel draft',  'Editing before writing',       null),
      ('yuki',  'Meditate 20 minutes in the garden',     array['love','focus'],        'daily',           'Jardim Gulbenkian — by the lake',         38.7370, -9.1540,   0, '13:00', 30, 20, 'silent', 'auto',   'club',        'Timer, bell, silence.',                            'Sit every day for a year',     'Starting the day on my phone', null),
      ('ines',  'Hill sprints up Graça',                 array['fight'],               'twice_week',      'Graça — bottom of the Calçada',           38.7166, -9.1305,  3, '07:30', 40,  6, 'social', 'auto',   'club',        '8 × 30 seconds. Walk down.',                       'Run the Lisbon half marathon', 'Skipping leg day',             null),
      ('tiago', 'Jump rope ten rounds',                  array['fight','focus'],       'daily',           'Parque Eduardo VII — top of the hill',    38.7289, -9.1532,   0, '18:00', 30, 10, 'social', 'auto',   'club',        'Three-minute rounds. Bring a rope.',               'Fight my first amateur bout',  'Skipping the hard rounds',     'old school hip hop'),
      ('mara',  'Library hour — no talking',             array['enrich'],              'weekly',          'Palácio Galveias library',                38.7440, -9.1440,  4, '17:00', 60,  8, 'silent', 'auto',   'club',        null,                                                'Read 24 books this year',      'Scrolling in bed',             null),
      ('kofi',  'Photograph one door a day',             array['express'],             'daily',           'Alfama — Largo do Chafariz de Dentro',    38.7115, -9.1305,  1, '16:00', 90,  6, 'social', 'auto',   'club',        'Film or phone. One door each, no more.',           'Fill a sketchbook a month',    'Waiting for inspiration',      null),
      ('lea',   'Code review walk',                      array['focus','flow'],        'weekly',          'Parque das Nações — the cable car',       38.7680, -9.0940, 5, '12:30', 45,  4, 'social', 'manual', 'club',        'We read one diff out loud while we walk.',         'Ship my portfolio',            'Checking email every ten minutes', null),
      ('noor',  'Yoga flow by the river',                array['flow'],                'every_morning',   'Belém — Jardim da Praça do Império',      38.6970, -9.2060,  3, '07:00', 60, 15, 'silent', 'auto',   'club',        null,                                                'Touch my toes by winter',      'Sitting all day',              null),
      ('rui',   'Dance it out on Friday',                array['celebrate'],           'every_friday',    'Cais do Sodré — Rua Nova do Carvalho',    38.7061, -9.1446,  4, '21:30', 120, 20, 'social', 'auto',   'club',        'No drinks needed. Just the week, let go.',         'Swim every month of the year', 'Staying home out of habit',    'afrobeat'),
      ('ada',   'Plant herbs in the community garden',   array['love','enrich'],       'every_sunday',    'Horta do Monte',                          38.7190, -9.1320, 5, '10:00', 90,  8, 'social', 'manual', 'club',        'Gloves provided. Take a pot home.',                'Host 50 dinners',              'Buying herbs in plastic',      null),
      ('sol',   'Poetry out loud',                       array['express','celebrate'], 'twice_month',     'Bairro Alto — Travessa da Queimada',      38.7133, -9.1447,  2, '21:00', 90, 12, 'social', 'auto',   'club',        'One poem each. Yours or someone else''s.',         'Finish my first novel draft',  'Reading only in my head',      null),
      ('yuki',  'Walk without headphones',               array['focus','love'],        'every_afternoon', 'Monsanto — Alto da Serafina',             38.7270, -9.1880,  1, '17:00', 75, 10, 'silent', 'auto',   'club',        'We listen to the forest. That is the whole plan.', 'Sit every day for a year',     'Filling every silence',        null),
      ('tiago', 'Pull-ups at the outdoor gym',           array['fight'],               'every_other_day', 'Jardim do Campo Grande',                  38.7560, -9.1560,  1, '08:00', 45,  8, 'social', 'auto',   'club',        null,                                                'Ten strict pull-ups',          'Skipping the hard rounds',     null),
      ('mara',  'Learn Portuguese — twenty new words',   array['enrich'],              'daily',           'Intendente — the square',                 38.7218, -9.1356,  2, '19:30', 60, 10, 'social', 'manual', 'club',        'Beginners welcome. We trade words.',               'Order dinner in Portuguese',   'Answering in English',         null),
      ('lea',   'Plan tomorrow on paper',                array['focus'],               'every_night',     'Santos — the riverside bench',            38.7074, -9.1560,  0, '22:30', 30,  6, 'silent', 'auto',   'club',        'Paper only. Three lines for tomorrow.',            'Ship my portfolio',            'Checking email every ten minutes', null),
      ('kofi',  'Street music jam',                      array['celebrate','express'], 'weekly',          'Largo do Intendente — the fountain',      38.7222, -9.1352,  null::int, '-40', 180, 25, 'social', 'auto', 'club',       'Any instrument, any level.',                       'Play in front of people',      'Playing alone in my room',     'cumbia & fado'),
      ('ines',  'Bike the riverside to Belém',           array['flow'],                'weekly',          'Cais do Sodré — the ferry terminal',      38.7061, -9.1446, 6, '09:00', 120, 10, 'social', 'auto',   'club',        '25 km there and back, easy.',                      'Run the Lisbon half marathon', 'Taking the car for 2 km',      null),
      ('noor',  'Breathwork before work',                array['focus','flow'],        'every_weekday',   'Estrela — the Basílica steps',            38.7132, -9.1598,  1, '08:30', 20, 12, 'silent', 'auto',   'club',        null,                                                'Touch my toes by winter',      'Coffee before breathing',      null),
      ('rui',   'Gratitude run — thank three strangers', array['love','celebrate'],    'weekly',          'Parque Tejo — the north pier',            38.7780, -9.0930, 7, '09:30', 45,  8, 'social', 'auto',   'club',        null,                                                'Swim every month of the year', 'Complaining first',            null),
      ('sol',   'Journal by the Tagus',                  array['express','focus'],     'every_evening',   'Terreiro do Paço — Cais das Colunas',     38.7075, -9.1364,   0, '19:00', 45,  8, 'silent', 'auto',   'club',        null,                                                'Finish my first novel draft',  'Editing before writing',       null),
      ('yuki',  'Tea, no phones',                        array['love','focus'],        'twice_month',     'Jardim Botânico — the greenhouse',        38.7180, -9.1500, 8, '16:00', 60,  2, 'silent', 'manual', 'club',        'Two places. Already taken — join the next one.',   'Sit every day for a year',     'Filling every silence',        null),
      ('ada',   'Cook a new recipe every week',          array['enrich','love'],       'weekly',          'Mercado da Ribeira — the long bench',     38.7068, -9.1458,  4, '12:00', 90,  6, 'social', 'auto',   'club',        null,                                                'Host 50 dinners',              'Ordering in again',            null),
      ('tiago', 'Sparring Thursday',                     array['fight'],               'every_thursday',  'Arroios — the old gym',                   38.7300, -9.1380, 5, '19:00', 60,  4, 'social', 'manual', 'subscribers', 'For the people who follow my Totehm.',             'Fight my first amateur bout',  'Skipping the hard rounds',     null),
      ('lea',   'Silent coworking',                      array['focus'],               'every_weekday',   'Marvila — the warehouse',                 38.7440, -9.1040, 6, '10:00', 180, 16, 'silent', 'auto',   'club',        null,                                                'Ship my portfolio',            'Checking email every ten minutes', null)
    ) as t(who, habit, ints, freq, place, lat, lng, d, hm, dur, cap, mode, sel, acc, cmt, obj, rep, mood)
  loop
    select d.user_id into v_uid from public.demo_members d where d.pseudo = r.who || '_demo';
    -- LE JOUR ET L'HEURE, À LISBONNE. `d` = jours à partir d'aujourd'hui,
    -- `hm` = l'heure locale. `d` vide = un Spot EN COURS, commencé il y a
    -- `hm` minutes (LIVE). Une heure déjà passée aujourd'hui glisse à demain.
    if r.d is null then
      v_start := date_trunc('minute', now()) + make_interval(mins => r.hm::int);
    else
      v_start := (((now() at time zone 'Europe/Lisbon')::date + r.d) + r.hm::time) at time zone 'Europe/Lisbon';
      if v_start < now() + interval '30 minutes' then v_start := v_start + interval '1 day'; end if;
    end if;

    insert into public.spots(user_id, intention, activite, commentaire, lat, lng, duration_min, expires_at,
                             is_public, required_role, energy_mode, active)
    values (v_uid, r.ints[1], left(r.habit, 80), null,
            round(r.lat::numeric, 3)::double precision, round(r.lng::numeric, 3)::double precision,
            r.dur, v_start + make_interval(mins => r.dur), false, 'figher', r.mode, true)
    returning id into v_spot;

    insert into public.spot_plans(spot_id, user_id, habit, intentions, snapshot, starts_at, duration_min,
                                  capacity, mode, access, selection, place, lat, lng, comment, demo)
    values (v_spot, v_uid, r.habit, r.ints,
            jsonb_build_object('habit', r.habit, 'intentions', to_jsonb(r.ints),
              'objectives', jsonb_build_array(jsonb_build_object('text', r.obj, 'is', to_jsonb(r.ints))),
              'repulsions', jsonb_build_array(jsonb_build_object('text', r.rep)),
              'mood', case when r.mood is null then null
                           else jsonb_build_object('title', r.mood, 'url', null, 'intention', r.ints[1]) end,
              'freq', r.freq, 'at', now(), 'demo', true),
            v_start, r.dur, r.cap, r.mode, r.acc, r.sel, r.place, r.lat, r.lng, r.cmt, true);

    -- Le Totehm du membre de démo porte ses habitudes : sa compatibilité,
    -- quand il candidate chez quelqu'un, se calcule comme celle de tout le monde.
    insert into public.totehms(user_id, steps, totehm_visibility)
    values (v_uid, jsonb_build_array(jsonb_build_object('t', r.habit, 'f', r.freq, 'i', r.ints[1], 'is', to_jsonb(r.ints))), 'private')
    on conflict (user_id) do update
      set steps = case when public.totehms.steps @> jsonb_build_array(jsonb_build_object('t', r.habit))
                       then public.totehms.steps
                       else public.totehms.steps || jsonb_build_array(jsonb_build_object('t', r.habit, 'f', r.freq, 'i', r.ints[1], 'is', to_jsonb(r.ints))) end;
    v_n := v_n + 1;
  end loop;

  -- Un Spot COMPLET, pour voir l'état « full » : deux acceptés sur deux.
  insert into public.spot_applications(spot_id, user_id, status, compat, decided_at)
  select p.spot_id, d.user_id, 'accepted', 80, now()
    from public.spot_plans p
    join lateral (select user_id from public.demo_members where pseudo in ('mara_demo','sol_demo')) d on true
   where p.demo and p.habit = 'Tea, no phones';

  -- Et du monde autour : quelques membres de démo ont rejoint des Spots
  -- en sélection automatique, pour que les compteurs « 3 / 8 » ne soient
  -- pas tous à zéro.
  insert into public.spot_applications(spot_id, user_id, status, compat, decided_at)
  select p.spot_id, d.user_id, 'accepted', 70, now()
    from public.spot_plans p
    join public.demo_members d on d.user_id <> p.user_id
   where p.demo and p.selection = 'auto' and p.capacity >= 10
     and (hashtext(p.spot_id::text || d.user_id::text) % 3) = 0
  on conflict (spot_id, user_id) do nothing;

  -- LES DEMANDES REÇUES : pour chaque Spot à venir d'un membre « comp »
  -- (Wah), deux membres de démo candidatent — sinon l'onglet des demandes
  -- ne se teste jamais. Le pourcentage est calculé comme pour tout le monde.
  insert into public.spot_applications(spot_id, user_id, status, compat)
  select p.spot_id, d.user_id, 'pending', public._spot_compat(d.user_id, p.spot_id)
    from public.spot_plans p
    join auth.users u on u.id = p.user_id
    join public.figher_comps c on c.email = lower(u.email)
    join lateral (select user_id from public.demo_members order by pseudo limit 2) d on true
   where not p.demo and p.status = 'published' and p.starts_at > now()
  on conflict (spot_id, user_id) do nothing;
  get diagnostics v_apps = row_count;

  return jsonb_build_object('ok', true, 'members', cardinality(v_members), 'spots', v_n, 'requests_for_comps', v_apps);
end $f$;


-- ════════════════════════════════════════════════════════════════════
-- LES DROITS — APRÈS LE DERNIER CREATE
-- ════════════════════════════════════════════════════════════════════
revoke all on function public._figher(uuid) from public, anon, authenticated;
grant execute on function public._figher(uuid) to service_role;

revoke all on function public.spots_radar(double precision,double precision,integer,text,text,boolean,integer,text,text) from public;
grant execute on function public.spots_radar(double precision,double precision,integer,text,text,boolean,integer,text,text)
  to anon, authenticated, service_role;

revoke all on function public.my_space() from public, anon;
grant execute on function public.my_space() to authenticated, service_role;

revoke all on function public.demo_seed() from public, anon, authenticated;
revoke all on function public.demo_purge() from public, anon, authenticated;
grant execute on function public.demo_seed() to service_role;
grant execute on function public.demo_purge() to service_role;

revoke all on public.figher_comps, public.demo_members from anon, authenticated;

-- Les Spots de démo, tout de suite.
select public.demo_seed();
