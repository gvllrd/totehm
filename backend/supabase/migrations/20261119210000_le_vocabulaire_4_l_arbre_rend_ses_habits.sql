-- ══ LE VOCABULAIRE · 4 — L'ARBRE REND SES HABITS ═══════════════════════════════════════
-- Depuis `une_seule_box_le_why` (19/11 matin), la clé des objectifs ne porte que les objectifs DATÉS. Or la
-- boutique reconstituait « my habits » à partir des Habits RANGÉES SOUS LES OBJECTIFS, plus les libres
-- (`loose`) : les Habits d'une VISION ou d'un objectif fermé n'y étaient plus — 6 sur 11, mesuré le 19/11.
-- L'arbre rend donc ses Habits ELLES-MÊMES, dans leur ordre natif :
--   · `my_totehm().habits` = chaque Habit (`t`, `f`, `o`, `i`, `is`) ; `loose` reste (des lecteurs le lisent) ;
--   · `_totehm_complete` rend `stories` (le mot de Wah) à côté de `wisdom` (pont : `_figher` et d'anciens
--     onglets le lisent).

do $mig$
declare r record; d text; n int;
begin
  for r in select * from (values
    ('public.my_totehm()',
     $o$    'signed_in', true,

    'objectives', coalesce(($o$,
     $n$    'signed_in', true,

    -- 19/11 : TOUTES les Habits, dans leur ordre (la boutique ne les reconstitue plus par les objectifs)
    'habits', coalesce((
      select jsonb_agg(jsonb_build_object(
               't', s->>'t', 'f', nullif(s->>'f', ''), 'o', nullif(s->>'o', ''),
               'i', coalesce(nullif(s->>'i', ''), public.intention_of(s->>'t')),
               'is', case when jsonb_typeof(s->'is') = 'array' then s->'is' else '[]'::jsonb end) order by e.n)
      from jsonb_array_elements(v_habit_boxes) with ordinality as e(s, n)
      where nullif(btrim(s->>'t'), '') is not null), '[]'::jsonb),

    'objectives', coalesce(($n$),
    ('public._totehm_complete(uuid)',
     $o$'wisdom', v_w, 'visions', v_v,$o$,
     $n$'wisdom', v_w, 'stories', v_w, 'visions', v_v,$n$)
  ) t(fn, old, new) loop
    d := pg_get_functiondef(r.fn::regprocedure);
    n := (length(d) - length(replace(d, r.old, ''))) / length(r.old);
    if n <> 1 then raise exception 'vocabulaire % : % occurrence(s) du texte visé', r.fn, n; end if;
    execute replace(d, r.old, r.new);
  end loop;
end $mig$;
