-- ══ LA VISIBILITÉ PAR BOX · 26/10/2026 ══════════════════════════════════════════════════════════════════════════
-- Wah : « il faut que chaque box ait un niveau de visibilité : private / my subscribers (binaire) ; et concernant les
-- spots il y a trois niveaux d'accès : private, subscribers et figher club ».
-- Ce qui passe du cloud (rien n'est remplacé, rien n'est supprimé) :
--   1 · `totehm_read` : le Totehm d'un autre lu BOX PAR BOX (`_box_shared` sur chaque habitude, objectif, répulsion,
--       vision, sagesse) — le corps du `totehm_of` préparé le 18/10 (`20261018091000_audience_par_box_lecteurs.sql`),
--       sous un nom neuf ; la page l'appelle à la place de `totehm_of`.
--   2 · Une box est BINAIRE : l'ancien niveau `figher` (ou `public`) d'une box devient `subscribers` ; le plafond
--       `totehms.audience` se recalcule. Les spots gardent leurs trois niveaux (`spot_plans.audience`, intouchés).
-- Le reste (le `totehm_of` par box, les politiques resserrées) : `20261018091000…`, terminal (`CLAUDE_CODE.md`).
create function public.totehm_read(p_pseudo text)
returns jsonb language plpgsql stable security definer set search_path to '' as $f$
declare
  v_me    uuid := auth.uid();
  v_uid   uuid;
  v_steps jsonb;
  v_vus   jsonb;
  v_n     int;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;

  select p.id into v_uid from public.profiles p
   where lower(p.pseudo) = lower(btrim(p_pseudo)) limit 1;
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;

  -- Les habitudes lisibles, DANS LEUR ORDRE, filtrées par le niveau de chacune.
  select coalesce(t.steps,'[]'::jsonb) into v_steps
    from public.totehms t where t.user_id = v_uid limit 1;
  v_steps := coalesce(v_steps, '[]'::jsonb);
  select coalesce(jsonb_agg(s order by o), '[]'::jsonb) into v_vus
    from jsonb_array_elements(v_steps) with ordinality as e(s, o)
   where public._box_shared(v_uid, public._box_audience(v_uid, 'h', e.s->>'t'));

  select jsonb_array_length(v_vus)
       + (select count(*) from public.objectives o where o.user_id = v_uid
            and coalesce(o.status,'active') not in ('achieved','abandoned','converted')
            and public._box_shared(v_uid, o.audience))
       + (select count(*) from public.repulsions r where r.user_id = v_uid and r.active
            and public._box_shared(v_uid, r.audience))
       + (select count(*) from public.visions vi where vi.user_id = v_uid
            and public._box_shared(v_uid, vi.audience))
       + (select count(*) from public.wisdom w where w.user_id = v_uid
            and public._box_shared(v_uid, w.audience))
    into v_n;

  if coalesce(v_n,0) = 0 then
    if public._offer_open(v_uid) then
      return jsonb_build_object('ok', false, 'why', 'subscribe',
                                'pseudo', (select pseudo from public.profiles where id = v_uid));
    end if;
    return jsonb_build_object('ok', false, 'why', 'private');
  end if;

  return jsonb_build_object(
    'ok', true,
    'pseudo', (select pseudo from public.profiles where id = v_uid),
    'steps', v_vus,
    'objs', coalesce((
      select jsonb_object_agg(k.h, k.ids) from (
        select u.h as h, jsonb_agg(distinct u.oid) as ids from (
          select oh.habit_text as h, oh.objective_id::text as oid
          from public.objective_habits oh where oh.user_id = v_uid
          union
          select s->>'t', s->>'o'
          from jsonb_array_elements(v_vus) s
          where nullif(s->>'o','') is not null
        ) u where nullif(u.h,'') is not null
            -- 26/10 : une clé est un NOM d'habitude, une valeur un objectif — l'une et l'autre lisibles, sinon rien
            and exists (select 1 from jsonb_array_elements(v_vus) s where s->>'t' = u.h)
            and exists (select 1 from public.objectives o2 where o2.user_id = v_uid and o2.id::text = u.oid
                          and public._box_shared(v_uid, o2.audience))
          group by u.h) k), '{}'::jsonb),
    'trips', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', o.id, 'text', o.text, 'target_at', o.target_at,
               'status', o.status, 'created_at', o.created_at, 'is', to_jsonb(o."is"),
               'days_left', case when o.target_at is null then null
                                 else (o.target_at::date - (now() at time zone 'UTC')::date) end,
               'visions', coalesce((select jsonb_agg(ov.vision_id)
                 from public.objective_visions ov
                 where ov.user_id = v_uid and ov.objective_id = o.id), '[]'::jsonb))
             order by o.target_at nulls last, o.created_at)
      from public.objectives o
      where o.user_id = v_uid
        and coalesce(o.status,'active') not in ('achieved','abandoned','converted')
        and public._box_shared(v_uid, o.audience)), '[]'::jsonb),
    'reps', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'text', r.repulsion, 'obstacle', r.obstacle, 'is', to_jsonb(r."is"),
               'hs', coalesce((select jsonb_agg(distinct u.h) from (
                   select r.habit_text as h where nullif(r.habit_text,'') is not null
                   union
                   select rh.habit_text from public.repulsion_habits rh
                   where rh.user_id = v_uid and rh.repulsion_id = r.id) u
                 where exists (select 1 from jsonb_array_elements(v_vus) s where s->>'t' = u.h)), '[]'::jsonb),
               'ws', coalesce((select jsonb_agg(rt.wisdom_id)
                 from public.repulsion_teachings rt
                 where rt.user_id = v_uid and rt.repulsion_id = r.id), '[]'::jsonb))
             order by r.created_at)
      from public.repulsions r where r.user_id = v_uid and r.active
        and public._box_shared(v_uid, r.audience)), '[]'::jsonb),
    'visions', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'text', v.text,
               'is', to_jsonb(v."is"), 'rang', v.importance,
               'os', coalesce((select jsonb_agg(ov.objective_id)
                 from public.objective_visions ov
                 where ov.user_id = v_uid and ov.vision_id = v.id), '[]'::jsonb))
             order by v.importance nulls last, v.created_at)
      from public.visions v where v.user_id = v_uid
        and public._box_shared(v_uid, v.audience)), '[]'::jsonb),
    'wisdom', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'text', w.text,
               'is', to_jsonb(w."is"), 'rang', w.importance,
               'os', coalesce((select jsonb_agg(tob.objective_id)
                 from public.teaching_objectives tob
                 where tob.user_id = v_uid and tob.wisdom_id = w.id), '[]'::jsonb))
             order by w.importance nulls last, w.created_at)
      from public.wisdom w where w.user_id = v_uid
        and public._box_shared(v_uid, w.audience)), '[]'::jsonb)
  );
end $f$;

-- ── 2 · une box est binaire ───────────────────────────────────────────────────────────────────────────────────────
update public.objectives     set audience = 'subscribers' where audience in ('figher','public');
update public.repulsions     set audience = 'subscribers' where audience in ('figher','public');
update public.visions        set audience = 'subscribers' where audience in ('figher','public');
update public.wisdom         set audience = 'subscribers' where audience in ('figher','public');
update public.habit_audience set audience = 'subscribers' where audience in ('figher','public');
do $d$ declare u uuid; begin
  for u in select t.user_id from public.totehms t loop perform public._totehm_audience_recalc(u); end loop;
end $d$;

-- ── les droits, APRÈS le dernier `create` ─────────────────────────────────────────────────────────────────────────
revoke all on function public.totehm_read(text) from public, anon;
grant execute on function public.totehm_read(text) to authenticated;
