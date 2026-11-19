-- ══ LE VOCABULAIRE · 2 — OBJECTIVE, et MY TOTEHM ═════════════════════════════════════════
-- Wah, 19/11 : « les mots que j'utilise reflètent le backend… le code et le backend ». « Trip » était l'ancien
-- nom de l'objectif (les migrations « LE TRIP » du 04/09) ; il ne se dit plus à l'écran, il quitte la base.
--
--   · `my_totehm()` = l'arbre entier du membre — MY TOTEHM, la vue du centre : `objectives` · `repulsions` ·
--     `stories` · `visions` · `objs` (les objectifs ou visions que sert chaque Habit) ; mêmes droits que
--     `my_trips` ; c'est le corps de `my_trips`, à ses nouveaux noms ;
--   · `totehm_read` / `totehm_of` rendent aussi `objectives` et `repulsions` ;
--   · `element_orders_for` lit ces nouveaux noms.
--
-- PONTS : `my_trips()` rend l'ancienne forme (`trips`, `reps`, `wisdom`) À PARTIR de `my_totehm()` — une seule
-- vérité — pour la boutique et le connecteur ChatGPT qui la lisent encore ; les clés `trips`, `reps`, `wisdom`
-- restent dans `totehm_read` / `totehm_of`. On les retire quand plus rien ne les lit.

do $mig$
declare d text; n int; r record;
begin
  -- 1 · my_totehm : le corps de my_trips, à ses nouveaux noms (chaque texte visé, une fois)
  d := pg_get_functiondef('public.my_trips()'::regprocedure);
  for r in select * from (values
    ('FUNCTION public.my_trips()', 'FUNCTION public.my_totehm()'),
    ($o$'trips', coalesce(($o$, $n$'objectives', coalesce(($n$),
    ($o$'reps', coalesce(($o$, $n$'repulsions', coalesce(($n$),
    ($o$'wisdom', coalesce(($o$, $n$'stories', coalesce(($n$),
    ($o$return v_res || jsonb_build_object('stories', v_res->'wisdom');$o$, $n$return v_res;$n$)
  ) t(old, new) loop
    n := (length(d) - length(replace(d, r.old, ''))) / length(r.old);
    if n <> 1 then raise exception 'my_totehm : % occurrence(s) de « % »', n, r.old; end if;
    d := replace(d, r.old, r.new);
  end loop;
  execute d;

  -- 2 · les lecteurs de l'arbre d'un membre
  for r in select * from (values
    ('public.totehm_read(text)',
     $o$return v_out || jsonb_build_object('stories', v_out->'wisdom');$o$,
     $n$return v_out || jsonb_build_object('stories', v_out->'wisdom', 'objectives', v_out->'trips', 'repulsions', v_out->'reps');$n$),
    ('public.totehm_of(text)',
     $o$return v_out || jsonb_build_object('stories', v_out->'wisdom');$o$,
     $n$return v_out || jsonb_build_object('stories', v_out->'wisdom', 'objectives', v_out->'trips', 'repulsions', v_out->'reps');$n$),
    ('public.element_orders_for(text)',
     $o$when 'objective' then 'trips' when 'repulsion' then 'reps'$o$,
     $n$when 'objective' then 'objectives' when 'repulsion' then 'repulsions'$n$)
  ) t(fn, old, new) loop
    d := pg_get_functiondef(r.fn::regprocedure);
    n := (length(d) - length(replace(d, r.old, ''))) / length(r.old);
    if n <> 1 then raise exception 'vocabulaire % : % occurrence(s) du texte visé', r.fn, n; end if;
    execute replace(d, r.old, r.new);
  end loop;
end $mig$;

-- 3 · PONT : `my_trips` rend l'ancienne forme, calculée par `my_totehm` (une seule vérité)
create or replace function public.my_trips()
 returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select case when x.t ? 'objectives'
    then (x.t - 'objectives' - 'repulsions')
         || jsonb_build_object('trips', x.t->'objectives', 'reps', x.t->'repulsions', 'wisdom', x.t->'stories')
    else x.t end
  from (select public.my_totehm() as t) x;
$function$;

comment on function public.my_totehm() is
  '[COM] MY TOTEHM : l''arbre entier du membre — objectives · repulsions · stories · visions · objs (le why de chaque Habit).';
comment on function public.my_trips() is
  '[COM] PONT : l''ancienne forme de my_totehm() (trips · reps · wisdom), pour la boutique et le connecteur ChatGPT. À retirer.';

-- 4 · Les droits, après le dernier `create`
revoke all on function public.my_totehm() from public, anon;
grant execute on function public.my_totehm() to authenticated, service_role;
