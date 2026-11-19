-- ══ LE VOCABULAIRE · 3b — HABITS, LES FONCTIONS ════════════════════════════════════════
-- Suite de `20261119190000_le_vocabulaire_3_habits_la_colonne` (`habits` = `steps`, tenus identiques) :
--   · toutes les fonctions lisent et écrivent la colonne `habits` ;
--   · `_step_intentions` → `_habit_intentions` (les intentions d'une Habit) ; les variables `v_steps` →
--     `v_habit_boxes` (`v_habits` existe déjà : la liste des textes d'Habits) ;
--   · `totehm_read` / `totehm_of` rendent la clé `habits` (PONT : `steps` reste, le connecteur la lit) ;
--     `element_orders_for` lit `habits`.
-- Seule la COLONNE change de nom : on ne remplace `steps` que sous les six formes où c'est la colonne
-- (`x.steps`, `coalesce(steps`, `select steps into`, `totehms(user_id, steps`, `set steps =`, les
-- variables). Les textes ne sont jamais touchés — les démos parlent de vrais escaliers (« the Basílica
-- steps »).

alter function public._step_intentions(jsonb) rename to _habit_intentions;

do $mig$
declare f record; r record; d text; d0 text; n int;
begin
  for f in select p.oid from pg_proc p
            where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
              and p.prosrc ~ '\msteps\M|\m_step_intentions\M|\mv_steps\M|\mv_src_steps\M'
              and p.proname <> '_totehm_habits_sync'   -- le PONT nomme `steps` exprès : on ne le touche pas
  loop
    d0 := pg_get_functiondef(f.oid);
    d := regexp_replace(d0, '\m_step_intentions\M', '_habit_intentions', 'g');
    d := regexp_replace(d, '\.steps\M', '.habits', 'g');
    d := regexp_replace(d, 'coalesce\((\s*)steps\M', 'coalesce(\1habits', 'gi');
    d := regexp_replace(d, '\mselect(\s+)steps(\s+)into\M', 'select\1habits\2into', 'gi');
    d := regexp_replace(d, 'totehms\(user_id,(\s*)steps\M', 'totehms(user_id,\1habits', 'g');
    d := regexp_replace(d, '\mset(\s+)steps(\s*)=', 'set\1habits\2=', 'gi');
    d := regexp_replace(d, '\mv_steps\M', 'v_habit_boxes', 'g');
    d := regexp_replace(d, '\mv_src_steps\M', 'v_src_habit_boxes', 'g');
    if d <> d0 then execute d; end if;
  end loop;

  for r in select * from (values
    ('public.element_orders_for(text)',
     $o$when 'habit' then 'steps'$o$,
     $n$when 'habit' then 'habits'$n$),
    ('public.totehm_read(text)',
     $o$'objectives', v_out->'trips', 'repulsions', v_out->'reps');$o$,
     $n$'objectives', v_out->'trips', 'repulsions', v_out->'reps', 'habits', v_out->'steps');$n$),
    ('public.totehm_of(text)',
     $o$'objectives', v_out->'trips', 'repulsions', v_out->'reps');$o$,
     $n$'objectives', v_out->'trips', 'repulsions', v_out->'reps', 'habits', v_out->'steps');$n$)
  ) t(fn, old, new) loop
    d := pg_get_functiondef(r.fn::regprocedure);
    n := (length(d) - length(replace(d, r.old, ''))) / length(r.old);
    if n <> 1 then raise exception 'vocabulaire % : % occurrence(s) du texte visé', r.fn, n; end if;
    execute replace(d, r.old, r.new);
  end loop;
end $mig$;

comment on function public._habit_intentions(jsonb) is '[COM] les intentions d''une Habit (son `is`, sinon son `i`).';
