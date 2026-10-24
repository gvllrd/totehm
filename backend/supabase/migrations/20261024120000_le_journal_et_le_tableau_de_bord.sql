-- COM · 24/10/2026 — LE JOURNAL DE MON TOTEHM ET SON TABLEAU DE BORD (le verso, onglet Dashboard).
-- Wah : « enregistrer TOUT ce que fait l'utilisateur dans son Totehm et le mettre sous forme de visuels » ;
-- « le Telegram sert de tracking, pas le verso ».
-- 1 · `totehm_journal` : tout ce que je fais dans mon TOTEHM, en ajout, écrit par la BASE (déclencheurs), jamais par
--     la page. Un déclencheur du journal ne bloque JAMAIS l'écriture du membre (toute erreur est avalée).
-- 2 · Rattrapé une fois depuis l'existant (même `ref` que les déclencheurs : aucun doublon).
-- 3 · `my_dashboard(p_tz)` : la semaine, la courbe, la matrice Habits × jours (le suivi Telegram), les séries, les
--     intentions, les objectifs qui arrivent, l'activité de 12 semaines, le fil — du SQL, zéro centime.
-- 4 · Le compte effacé (`delete_my_totehm` efface `profiles`) : le journal part avec lui.

create table public.totehm_journal (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  at timestamptz not null default now(),
  box text not null check (box in ('habit','objective','repulsion','vision','story','media','spot','reflection','track','book')),
  kind text not null,
  label text,
  intention text,
  ref text,
  detail jsonb not null default '{}'::jsonb
);
create index totehm_journal_user_at on public.totehm_journal (user_id, at desc);
create unique index totehm_journal_ref on public.totehm_journal (box, kind, ref) where ref is not null;
alter table public.totehm_journal enable row level security;

-- L'écrivain unique. Une erreur ici ne remonte jamais.
create function public._journal(p_user uuid, p_box text, p_kind text, p_label text, p_int text, p_ref text,
                                p_detail jsonb default '{}'::jsonb, p_at timestamptz default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null then return; end if;
  insert into public.totehm_journal (user_id, at, box, kind, label, intention, ref, detail)
  values (p_user, coalesce(p_at, now()), p_box, p_kind, left(nullif(btrim(coalesce(p_label, '')), ''), 140), p_int, p_ref,
          coalesce(p_detail, '{}'::jsonb))
  on conflict do nothing;
exception when others then null;
end $$;

-- HABITS : `steps` est réécrit en entier (`cloudSave`) ; on compare l'avant et l'après.
-- `t0` = le texte que le serveur connaissait : une Habit dont `t0` était une ancienne Habit est RENOMMÉE.
create function public._journal_steps() returns trigger language plpgsql security definer set search_path = '' as $$
declare o jsonb; n jsonb; r record;
begin
  o := case when tg_op = 'UPDATE' then coalesce(old.steps, '[]'::jsonb) else '[]'::jsonb end;
  n := coalesce(new.steps, '[]'::jsonb);
  if o = n then return null; end if;
  for r in
    with os as (select distinct on (lower(btrim(s->>'t'))) lower(btrim(s->>'t')) k, btrim(s->>'t') t, s
                  from jsonb_array_elements(o) s where btrim(coalesce(s->>'t', '')) <> ''),
         ns as (select distinct on (lower(btrim(s->>'t'))) lower(btrim(s->>'t')) k, btrim(s->>'t') t,
                       lower(btrim(coalesce(s->>'t0', ''))) k0, s
                  from jsonb_array_elements(n) s where btrim(coalesce(s->>'t', '')) <> ''),
         ren as (select ns.k nk, os.k ok, ns.t nt, os.t ot, ns.s from ns join os on os.k = ns.k0
                  where ns.k0 <> ns.k and not exists (select 1 from ns x where x.k = os.k)
                    and not exists (select 1 from os x where x.k = ns.k))
    select 'habit_renamed' kind, ren.nt label, (public._step_intentions(ren.s))[1] i, jsonb_build_object('from', ren.ot) d from ren
    union all
    select 'habit_added', ns.t, (public._step_intentions(ns.s))[1], jsonb_build_object('f', ns.s->>'f') from ns
     where not exists (select 1 from os where os.k = ns.k) and not exists (select 1 from ren where ren.nk = ns.k)
    union all
    select 'habit_removed', os.t, (public._step_intentions(os.s))[1], '{}'::jsonb from os
     where not exists (select 1 from ns where ns.k = os.k) and not exists (select 1 from ren where ren.ok = os.k)
    union all
    select 'intention_changed', ns.t, (public._step_intentions(ns.s))[1],
           jsonb_build_object('from', to_jsonb(public._step_intentions(os.s)), 'to', to_jsonb(public._step_intentions(ns.s)))
      from ns join os on os.k = ns.k where public._step_intentions(ns.s) is distinct from public._step_intentions(os.s)
    union all
    select 'rhythm_changed', ns.t, (public._step_intentions(ns.s))[1], jsonb_build_object('from', os.s->>'f', 'to', ns.s->>'f')
      from ns join os on os.k = ns.k where (ns.s->>'f') is distinct from (os.s->>'f')
  loop
    perform public._journal(new.user_id, 'habit', r.kind, r.label, r.i, null, r.d);
  end loop;
  return null;
exception when others then return null;
end $$;

create function public._journal_objective() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public._journal(new.user_id, 'objective', 'objective_added', new.text, new.i, new.id::text || ':a',
                            jsonb_build_object('by', new.target_at), new.created_at);
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status and new.status in ('achieved', 'abandoned', 'converted') then
      perform public._journal(new.user_id, 'objective', 'objective_' || new.status, new.text, new.i, new.id::text || ':' || new.status);
    elsif new.text is distinct from old.text or new.target_at is distinct from old.target_at then
      perform public._journal(new.user_id, 'objective', 'objective_edited', new.text, new.i, null,
                              jsonb_build_object('by', new.target_at));
    end if;
  elsif tg_op = 'DELETE' then
    perform public._journal(old.user_id, 'objective', 'objective_removed', old.text, old.i, old.id::text || ':d');
  end if;
  return null;
exception when others then return null;
end $$;

create function public._journal_repulsion() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public._journal(new.user_id, 'repulsion', 'repulsion_added', new.repulsion, new.i, new.id::text || ':a',
                            jsonb_build_object('habit', new.habit_text), new.created_at);
  elsif tg_op = 'UPDATE' and old.active and not coalesce(new.active, false) then
    perform public._journal(new.user_id, 'repulsion', 'repulsion_retired', new.repulsion, new.i, new.id::text || ':r');
  end if;
  return null;
exception when others then return null;
end $$;

-- VISIONS et MY STORY : nés ou effacés.
create function public._journal_vision_story() returns trigger language plpgsql security definer set search_path = '' as $$
declare b text := case tg_table_name when 'visions' then 'vision' else 'story' end;
begin
  if tg_op = 'INSERT' then
    perform public._journal(new.user_id, b, b || '_added', new.text, new.i, new.id::text || ':a', '{}'::jsonb, new.created_at);
  elsif tg_op = 'DELETE' then
    perform public._journal(old.user_id, b, b || '_removed', old.text, old.i, old.id::text || ':d');
  end if;
  return null;
exception when others then return null;
end $$;

-- MÉDIAS : `ref` = la Habit (h) ou l'id de la box ; le libellé = la Habit quand c'en est une.
create function public._journal_media() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public._journal(new.user_id, 'media', 'media_added', case when new.kind = 'h' then new.ref end, null, new.id::text || ':a',
                            jsonb_build_object('box', new.kind, 'mime', split_part(coalesce(new.mime, ''), '/', 1)), new.created_at);
  elsif tg_op = 'UPDATE' and old.removed_at is null and new.removed_at is not null then
    perform public._journal(new.user_id, 'media', 'media_removed', case when new.kind = 'h' then new.ref end, null, new.id::text || ':r');
  end if;
  return null;
exception when others then return null;
end $$;

create function public._journal_spot() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public._journal(new.user_id, 'spot', 'spot_planned', new.habit, new.intentions[1], new.spot_id::text || ':a',
                          jsonb_build_object('city', new.city, 'starts_at', new.starts_at), new.created_at);
  return null;
exception when others then return null;
end $$;

-- Une Reflection = une réponse du Higher Self qui a abouti.
create function public._journal_reflection() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'ok' and (tg_op = 'INSERT' or old.status is distinct from 'ok') then
    perform public._journal(new.user_id, 'reflection', 'reflection', null, null, new.id::text, '{}'::jsonb, new.created_at);
  end if;
  return null;
exception when others then return null;
end $$;

-- LE SUIVI (Telegram) : une réponse fait / pas fait.
create function public._journal_track() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.outcome in ('done', 'missed') and (tg_op = 'INSERT' or old.outcome is distinct from new.outcome) then
    perform public._journal(new.user_id, 'track', 'tracked_' || new.outcome, new.habit_text, new.intention,
                            new.id::text || ':' || new.outcome, '{}'::jsonb, coalesce(new.answered_at, now()));
  end if;
  return null;
exception when others then return null;
end $$;

create function public._journal_book() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public._journal(new.user_id, 'book', 'chapter_written', new.title, new.intention, new.id::text || ':a',
                          jsonb_build_object('no', new.chapter_no), coalesce(new.generated_at, new.opened_at, now()));
  return null;
exception when others then return null;
end $$;

-- Le compte effacé : son journal part avec lui.
create function public._journal_forget() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.totehm_journal where user_id = old.id;
  return null;
end $$;

create trigger totehm_journal_steps after insert or update of steps on public.totehms
  for each row execute function public._journal_steps();
create trigger totehm_journal_objective after insert or update or delete on public.objectives
  for each row execute function public._journal_objective();
create trigger totehm_journal_repulsion after insert or update of active on public.repulsions
  for each row execute function public._journal_repulsion();
create trigger totehm_journal_vision after insert or delete on public.visions
  for each row execute function public._journal_vision_story();
create trigger totehm_journal_story after insert or delete on public.wisdom
  for each row execute function public._journal_vision_story();
create trigger totehm_journal_media after insert or update of removed_at on public.element_media
  for each row execute function public._journal_media();
create trigger totehm_journal_spot after insert on public.spot_plans
  for each row execute function public._journal_spot();
create trigger totehm_journal_reflection after insert or update of status on public.sm_uses
  for each row execute function public._journal_reflection();
create trigger totehm_journal_track after insert or update of outcome on public.habit_outcomes
  for each row execute function public._journal_track();
create trigger totehm_journal_book after insert on public.book_chapters
  for each row execute function public._journal_book();
create trigger totehm_journal_forget after delete on public.profiles
  for each row execute function public._journal_forget();

-- ── LE RATTRAPAGE (une fois) : l'histoire déjà écrite ailleurs, avec les mêmes `ref` que les déclencheurs ──
insert into public.totehm_journal (user_id, at, box, kind, label, intention, ref, detail)
select e.user_id, e.created_at, 'habit', e.kind, left(btrim(e.habit_text), 140), e.detail->>'intention', 'te:' || e.id, '{}'::jsonb
  from public.totehm_events e where e.kind in ('habit_added', 'habit_removed', 'intention_changed') and btrim(coalesce(e.habit_text, '')) <> ''
union all
select o.user_id, o.created_at, 'objective', 'objective_added', left(o.text, 140), o.i, o.id::text || ':a', jsonb_build_object('by', o.target_at)
  from public.objectives o
union all
select ev.user_id, ev.created_at, 'objective', 'objective_' || ev.kind, left(o.text, 140), o.i, ev.objective_id::text || ':' || ev.kind, '{}'::jsonb
  from public.objective_events ev join public.objectives o on o.id = ev.objective_id where ev.kind in ('achieved', 'abandoned', 'converted')
union all
select r.user_id, r.created_at, 'repulsion', 'repulsion_added', left(r.repulsion, 140), r.i, r.id::text || ':a', jsonb_build_object('habit', r.habit_text)
  from public.repulsions r
union all
select r.user_id, r.retired_at, 'repulsion', 'repulsion_retired', left(r.repulsion, 140), r.i, r.id::text || ':r', '{}'::jsonb
  from public.repulsions r where r.retired_at is not null
union all
select v.user_id, v.created_at, 'vision', 'vision_added', left(v.text, 140), v.i, v.id::text || ':a', '{}'::jsonb from public.visions v
union all
select w.user_id, w.created_at, 'story', 'story_added', left(w.text, 140), w.i, w.id::text || ':a', '{}'::jsonb from public.wisdom w
union all
select m.user_id, m.created_at, 'media', 'media_added', case when m.kind = 'h' then left(m.ref, 140) end, null, m.id::text || ':a',
       jsonb_build_object('box', m.kind, 'mime', split_part(coalesce(m.mime, ''), '/', 1))
  from public.element_media m
union all
select m.user_id, m.removed_at, 'media', 'media_removed', case when m.kind = 'h' then left(m.ref, 140) end, null, m.id::text || ':r', '{}'::jsonb
  from public.element_media m where m.removed_at is not null
union all
select p.user_id, p.created_at, 'spot', 'spot_planned', left(p.habit, 140), p.intentions[1], p.spot_id::text || ':a',
       jsonb_build_object('city', p.city, 'starts_at', p.starts_at)
  from public.spot_plans p where p.user_id is not null and p.created_at is not null
union all
select s.user_id, s.created_at, 'reflection', 'reflection', null, null, s.id::text, '{}'::jsonb from public.sm_uses s where s.status = 'ok'
union all
select h.user_id, coalesce(h.answered_at, h.created_at), 'track', 'tracked_' || h.outcome, left(h.habit_text, 140), h.intention,
       h.id::text || ':' || h.outcome, '{}'::jsonb
  from public.habit_outcomes h where h.outcome in ('done', 'missed')
union all
select b.user_id, coalesce(b.generated_at, b.opened_at), 'book', 'chapter_written', left(b.title, 140), b.intention, b.id::text || ':a',
       jsonb_build_object('no', b.chapter_no)
  from public.book_chapters b where coalesce(b.generated_at, b.opened_at) is not null
on conflict do nothing;

-- ── LE TABLEAU DE BORD : moi seul, des nombres et mes propres mots ──
create function public.my_dashboard(p_tz text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  u uuid := auth.uid(); st jsonb; zt text; z text; today date; d0 date; tg boolean := false; res jsonb;
begin
  if u is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  select t.steps, t.tz into st, zt from public.totehms t where t.user_id = u order by t.updated_at desc nulls last limit 1;
  -- MON fuseau (celui du navigateur, sinon celui du TOTEHM, sinon UTC) : validé en s'en servant, jamais en lisant la liste.
  if p_tz is not null then begin perform now() at time zone p_tz; z := p_tz; exception when others then z := null; end; end if;
  if z is null and zt is not null then begin perform now() at time zone zt; z := zt; exception when others then z := null; end; end if;
  z := coalesce(z, 'UTC');
  today := (now() at time zone z)::date; d0 := today - 6;
  begin tg := coalesce((public.totehmbot_access()->>'linked')::boolean, false); exception when others then tg := false; end;

  with
  hab as (select row_number() over () n, btrim(s->>'t') t, lower(btrim(s->>'t')) k, s->>'f' f,
                 coalesce(public._step_intentions(s), '{}'::text[]) ints, public._freq_minutes(s->>'f') m
            from jsonb_array_elements(coalesce(st, '[]'::jsonb)) s where btrim(coalesce(s->>'t', '')) <> ''),
  ho as (select lower(btrim(o.habit_text)) k,
                (coalesce(o.asked_at, o.answered_at, o.created_at) at time zone z)::date d,
                bool_or(o.outcome = 'done') done, bool_or(o.outcome = 'missed') missed, max(o.intention) i
           from public.habit_outcomes o
          where o.user_id = u and coalesce(o.asked_at, o.answered_at, o.created_at) >= ((today - 89)::timestamp at time zone z)
          group by 1, 2),
  jours as (select g::date d from generate_series(d0::timestamp, today::timestamp, interval '1 day') g),
  cel as (select h.n, h.k, h.t, h.f, h.ints,
                 case when h.f = 'every_weekday' then 5 when h.f = 'every_weekend' then 2 when h.m is null then null
                      when h.m <= 1443 then 7 when h.m <= 2880 then 4 when h.m <= 5040 then 2 when h.m <= 10087 then 1 else null end cible,
                 array(select case when x.done then 'd' when x.missed then 'm' when x.k is not null then 'a' else '' end
                         from jours j left join ho x on x.k = h.k and x.d = j.d order by j.d) c
            from hab h),
  ser as (select c.k,
                 (select coalesce(min(i), 90) from generate_series(0, 89) i
                   where not exists (select 1 from ho where ho.k = c.k and ho.done
                                       and ho.d = (case when exists (select 1 from ho y where y.k = c.k and y.d = today and y.done)
                                                        then today else today - 1 end) - i)) serie,
                 (select coalesce(max(cnt), 0) from (select count(*) cnt from (select d, d - (row_number() over (order by d))::int g
                    from ho where ho.k = c.k and ho.done) a group by g) b) meilleure
            from cel c),
  lignes as (select c.n, jsonb_build_object('t', c.t, 'is', to_jsonb(c.ints), 'f', c.f, 'cible', c.cible, 'c', to_jsonb(c.c),
                    'fait', (select count(*) from unnest(c.c) v where v = 'd'), 'serie', s.serie, 'record', s.meilleure) j,
                    (select count(*) from unnest(c.c) v where v = 'd') fait, s.serie, c.t, c.cible
               from cel c join ser s on s.k = c.k),
  jour as (select j.d, count(*) filter (where x.done) fait, count(*) filter (where x.missed and not x.done) manque,
                  count(x.k) demande
             from jours j left join ho x on x.d = j.d and x.k in (select k from hab) group by j.d),
  intn as (select x.id, (select count(*) from hab h where x.id = any(h.ints)) habits,
                  (select count(*) from ho join hab h on h.k = ho.k
                    where ho.done and ho.d > today - 28 and coalesce(ho.i, h.ints[1]) = x.id) fait
             from unnest(array['fight','flow','enrich','love','express','focus','celebrate']) x(id)),
  obj as (select o.text, o.target_at, o.created_at, o.i,
                 (select count(*) from public.objective_habits oh where oh.objective_id = o.id) habits
            from public.objectives o where o.user_id = u and o.status = 'active'
           order by o.target_at asc nulls last, o.created_at desc limit 3),
  act as (select (j.at at time zone z)::date d, count(*) n from public.totehm_journal j
           where j.user_id = u and j.at >= ((today - 83)::timestamp at time zone z) group by 1)
  select jsonb_build_object(
    'ok', true, 'tz', z, 'today', today, 'telegram', tg,
    'habits', coalesce((select jsonb_agg(l.j order by l.n) from lignes l), '[]'::jsonb),
    'days', (select jsonb_agg(jsonb_build_object('d', jr.d, 'fait', jr.fait, 'manque', jr.manque, 'demande', jr.demande) order by jr.d) from jour jr),
    'week', jsonb_build_object(
       'fait', coalesce((select sum(fait) from lignes), 0),
       'cible', coalesce((select sum(cible) from lignes), 0),
       'manque', coalesce((select count(*) from cel, unnest(cel.c) v where v = 'm'), 0),
       'sans', coalesce((select count(*) from cel, unnest(cel.c) v where v = 'a'), 0),
       'aujourdhui', coalesce((select count(*) from cel where cel.c[7] = 'd'), 0),
       'demandes', coalesce((select count(*) from cel where cel.c[7] <> ''), 0),
       'top', (select jsonb_build_object('t', l.t, 'fait', l.fait, 'serie', l.serie, 'cible', l.cible)
                 from lignes l where l.fait > 0 or l.serie > 0 order by l.serie desc, l.fait desc, l.n limit 1)),
    'intentions', (select jsonb_object_agg(id, jsonb_build_object('habits', habits, 'fait', fait)) from intn),
    'objectives', coalesce((select jsonb_agg(jsonb_build_object('t', obj.text, 'i', obj.i, 'by', (obj.target_at at time zone z)::date,
                     'jours', case when obj.target_at is null then null else ((obj.target_at at time zone z)::date - today) end,
                     'temps', case when obj.target_at is null or obj.target_at <= obj.created_at then null
                                   else least(1, greatest(0, extract(epoch from now() - obj.created_at) / extract(epoch from obj.target_at - obj.created_at))) end,
                     'habits', obj.habits) order by obj.target_at asc nulls last, obj.created_at desc) from obj), '[]'::jsonb),
    'heat', (select jsonb_agg(coalesce(a.n, 0) order by g) from generate_series((today - 83)::timestamp, today::timestamp, interval '1 day') g
               left join act a on a.d = g::date),
    'totals', jsonb_build_object(
       'habits', (select count(*) from hab),
       'objectives', (select count(*) from public.objectives o where o.user_id = u and o.status = 'active'),
       'achieved', (select count(*) from public.objectives o where o.user_id = u and o.status in ('achieved', 'converted')),
       'repulsions', (select count(*) from public.repulsions r where r.user_id = u and r.active),
       'visions', (select count(*) from public.visions v where v.user_id = u),
       'story', (select count(*) from public.wisdom w where w.user_id = u),
       'media', (select count(*) from public.element_media m where m.user_id = u and m.removed_at is null),
       'spots', (select count(*) from public.spot_plans p where p.user_id = u),
       'reflections', (select count(*) from public.sm_uses s where s.user_id = u and s.status = 'ok'),
       'tracked', (select count(*) from public.habit_outcomes h where h.user_id = u and h.outcome = 'done'),
       'chapters', (select count(*) from public.book_chapters b where b.user_id = u),
       'gestes', (select count(*) from public.totehm_journal j where j.user_id = u)),
    'feed', coalesce((select jsonb_agg(f.j order by f.at desc) from (
               select j.at, jsonb_build_object('at', j.at, 'box', j.box, 'k', j.kind, 'l', j.label, 'i', j.intention) j
                 from public.totehm_journal j where j.user_id = u order by j.at desc limit 12) f), '[]'::jsonb),
    'since', (select min(j.at) from public.totehm_journal j where j.user_id = u)
  ) into res;
  return res;
end $$;

-- Grants APRÈS le dernier create : le journal ne se lit que par `my_dashboard` ; ses écrivains ne s'appellent pas.
revoke all on public.totehm_journal from public, anon, authenticated;
revoke execute on function public._journal(uuid, text, text, text, text, text, jsonb, timestamptz) from public, anon, authenticated;
revoke execute on function public._journal_steps(), public._journal_objective(), public._journal_repulsion(),
  public._journal_vision_story(), public._journal_media(), public._journal_spot(), public._journal_reflection(),
  public._journal_track(), public._journal_book(), public._journal_forget() from public, anon, authenticated;
revoke execute on function public.my_dashboard(text) from public, anon;
grant execute on function public.my_dashboard(text) to authenticated;
