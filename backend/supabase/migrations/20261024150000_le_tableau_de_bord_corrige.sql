-- COM · 24/10/2026 — LE TABLEAU DE BORD, CORRIGÉ : `my_board(p_tz)` remplace `my_dashboard(p_tz)`.
-- L'auto-test du journal l'a trouvé : dans la série, le compteur de jours s'appelait `i`, comme l'intention du suivi
-- Telegram (`ho.i`) ; la base lisait l'intention (« date - text ») et la lecture échouait pour TOUS les membres.
-- Le compteur s'appelle maintenant `g.x`. Une fonction neuve (le cloud ne fait pas `create or replace` d'une fonction
-- existante) ; l'ancienne part depuis le terminal (`CLAUDE_CODE.md`). Même contrat, mêmes clés.

create function public.my_board(p_tz text default null)
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
                 (select coalesce(min(g.x), 90) from generate_series(0, 89) as g(x)
                   where not exists (select 1 from ho where ho.k = c.k and ho.done
                                       and ho.d = (case when exists (select 1 from ho y where y.k = c.k and y.d = today and y.done)
                                                        then today else today - 1 end) - g.x)) serie,
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

revoke execute on function public.my_board(text) from public, anon;
grant execute on function public.my_board(text) to authenticated;
