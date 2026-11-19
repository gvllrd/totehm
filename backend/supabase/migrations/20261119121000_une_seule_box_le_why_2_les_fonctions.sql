-- ══ UNE SEULE BOX POUR LE WHY · 2/2 — LES FONCTIONS ════════════════════════════════════
-- Suite de `20261119120000_une_seule_box_le_why_1_la_table` : `visions` est désormais la vue des objectifs
-- SANS date. Une fonction qui énumère les objectifs ET les visions compterait deux fois une box sans
-- date : elle ne garde donc que les objectifs DATÉS. Les autres (lecture par identifiant, audiences,
-- ordres) marchent telles quelles.
--
--   · le GRIND (Wah, 19/11) = les objectifs datés, les Habits qui les servent, leurs répulsions.
--     TotehmBot ne RELANCE que le grind (`tracking_next` + `_in_grind`) ; le tableau de bord, la
--     préparation et l'historique lisent toujours toutes les Habits (`tracking_habits` ne change pas) ;
--   · le FIGHER CLUB reste ouvert (Wah : « c'est un point de rencontre… c'est plus ouvert ») : une Habit
--     et un why — objectif daté OU vision. La répulsion n'est plus requise (`_figher`) ;
--   · le How d'une vision = SES Habits (`_box_shots`), plus les habits des objectifs liés.
--
-- Chaque correction est un remplacement EXACT, vérifié : le texte visé doit apparaître une fois, sinon
-- tout s'annule (une fonction réécrite depuis ailleurs ne se corrige jamais à l'aveugle).

create or replace function public._in_grind(p_user uuid, p_habit text)
 returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.objective_habits oh join public.objectives o on o.id = oh.objective_id
                  where oh.user_id = p_user and o.user_id = p_user and oh.habit_text = p_habit
                    and coalesce(o.status, 'active') = 'active' and o.target_at is not null)
      or exists (select 1 from public.totehms t, jsonb_array_elements(coalesce(t.steps, '[]'::jsonb)) s, public.objectives o
                  where t.user_id = p_user and s->>'t' = p_habit and o.user_id = p_user and o.id::text = s->>'o'
                    and coalesce(o.status, 'active') = 'active' and o.target_at is not null)
$function$;
revoke all on function public._in_grind(uuid, text) from public, anon, authenticated;
grant execute on function public._in_grind(uuid, text) to service_role;
comment on function public._in_grind(uuid, text) is
  '[COM] Le grind : la Habit sert au moins un objectif actif DATÉ (objective_habits ou steps.o). Seul TotehmBot s''en sert.';

do $mig$
declare r record; d text; n int;
begin
  for r in select * from (values
    ('public.my_trips()',
     $o$        from public.objectives o
        where o.user_id = v_uid
          and coalesce(o.status,'active') not in ('achieved','abandoned','converted')
      ) q)$o$,
     $n$        from public.objectives o
        where o.user_id = v_uid
          and coalesce(o.status,'active') not in ('achieved','abandoned','converted')
          and o.target_at is not null
      ) q)$n$),
    ('public.totehm_read(text)',
     $o$+ (select count(*) from public.objectives o where o.user_id = v_uid
$o$,
     $n$+ (select count(*) from public.objectives o where o.user_id = v_uid and o.target_at is not null
$n$),
    ('public.totehm_read(text)',
     $o$      from public.objectives o
      where o.user_id = v_uid
        and coalesce(o.status,'active') not in ('achieved','abandoned','converted')$o$,
     $n$      from public.objectives o
      where o.user_id = v_uid
        and coalesce(o.status,'active') not in ('achieved','abandoned','converted')
        and o.target_at is not null$n$),
    ('public.totehm_of(text)',
     $o$+ (select count(*) from public.objectives o where o.user_id = v_uid
$o$,
     $n$+ (select count(*) from public.objectives o where o.user_id = v_uid and o.target_at is not null
$n$),
    ('public.totehm_of(text)',
     $o$      from public.objectives o
      where o.user_id = v_uid
        and coalesce(o.status,'active') not in ('achieved','abandoned','converted')$o$,
     $n$      from public.objectives o
      where o.user_id = v_uid
        and coalesce(o.status,'active') not in ('achieved','abandoned','converted')
        and o.target_at is not null$n$),
    ('public._bot_mirror(uuid)',
     $o$    select o.* from public.objectives o
     where o.user_id = p_user and btrim(coalesce(o.text, '')) <> ''$o$,
     $n$    select o.* from public.objectives o
     where o.user_id = p_user and btrim(coalesce(o.text, '')) <> ''
       and o.target_at is not null$n$),
    ('public._bot_memory(uuid)',
     $o$from public.objectives o where o.user_id = p_user and btrim(o.text) <> ''$o$,
     $n$from public.objectives o where o.user_id = p_user and o.target_at is not null and btrim(o.text) <> ''$n$),
    ('public._totehm_box_index(uuid)',
     $o$select 't', o.id::text, o.text, o."is" from public.objectives o
  where o.user_id=p_owner and $o$,
     $n$select 't', o.id::text, o.text, o."is" from public.objectives o
  where o.user_id=p_owner and o.target_at is not null and $n$),
    ('public._totehm_complete(uuid)',
     $o$  v_o := exists (select 1 from public.objectives o
                  where o.user_id = v_uid and btrim(coalesce(o.text,'')) <> ''$o$,
     $n$  v_o := exists (select 1 from public.objectives o
                  where o.user_id = v_uid and btrim(coalesce(o.text,'')) <> '' and o.target_at is not null$n$),
    ('public._figher(uuid)',
     $o$'member', v_h and v_o and v_r);$o$,
     $n$'member', v_h and (v_o or coalesce((v_pass->>'visions')::boolean, false)));$n$),
    ('public._figher(uuid)',
     $o$|| (case when v_o then '[]'::jsonb else '["objective"]'::jsonb end)
          || (case when v_r then '[]'::jsonb else '["repulsion"]'::jsonb end),$o$,
     $n$|| (case when v_o or coalesce((v_pass->>'visions')::boolean, false) then '[]'::jsonb else '["why"]'::jsonb end),$n$),
    ('public._figher(uuid)',
     $o$-- ⚠️ LA RÈGLE, ICI ET NULLE PART AILLEURS : trois objets.$o$,
     $n$-- ⚠️ LA RÈGLE, ICI ET NULLE PART AILLEURS : une Habit et un why (objectif daté OU vision, 19/11).$n$),
    ('public.creator_universe(text, integer)',
     $o$'objectives', (select count(*) from public.objectives o where o.user_id = v_uid and btrim(coalesce(o.text, '')) <> '')$o$,
     $n$'objectives', (select count(*) from public.objectives o where o.user_id = v_uid and o.target_at is not null and btrim(coalesce(o.text, '')) <> '')$n$),
    ('public.my_board(text)',
     $o$from public.objectives o where o.user_id = u and o.status = 'active'
           order by o.target_at asc nulls last$o$,
     $n$from public.objectives o where o.user_id = u and o.status = 'active' and o.target_at is not null
           order by o.target_at asc nulls last$n$),
    ('public.my_board(text)',
     $o$'objectives', (select count(*) from public.objectives o where o.user_id = u and o.status = 'active'),$o$,
     $n$'objectives', (select count(*) from public.objectives o where o.user_id = u and o.status = 'active' and o.target_at is not null),$n$),
    ('public._box_shots(uuid, text, text)',
     $o$(exists (select 1 from public.objective_visions ov
                       join public.objective_habits oh on oh.objective_id = ov.objective_id and oh.user_id = p_user
                      where ov.user_id = p_user and ov.vision_id = v_uuid and oh.habit_text = s->>'t')$o$,
     $n$(exists (select 1 from public.objective_habits oh
                      where oh.user_id = p_user and oh.objective_id = v_uuid and oh.habit_text = s->>'t')$n$),
    ('public._box_shots(uuid, text, text)',
     $o$or exists (select 1 from public.objective_visions ov
                         where ov.user_id = p_user and ov.vision_id = v_uuid and ov.objective_id::text = s->>'o')$o$,
     $n$or s->>'o' = v_uuid::text$n$),
    ('public.tracking_next(uuid, timestamp with time zone)',
     $o$into gap from public.tracking_habits(p_user);$o$,
     $n$into gap from public.tracking_habits(p_user) hh where public._in_grind(p_user, hh.habit);$n$),
    ('public.tracking_next(uuid, timestamp with time zone)',
     $o$from public.tracking_habits(p_user) hh
    left join lateral$o$,
     $n$from public.tracking_habits(p_user) hh
    join lateral (select public._in_grind(p_user, hh.habit) as g) grind on grind.g
    left join lateral$n$)
  ) t(fn, old, new) loop
    d := pg_get_functiondef(r.fn::regprocedure);
    n := (length(d) - length(replace(d, r.old, ''))) / length(r.old);
    if n <> 1 then raise exception 'patch % : % occurrence(s) du texte visé', r.fn, n; end if;
    execute replace(d, r.old, r.new);
  end loop;
end $mig$;
