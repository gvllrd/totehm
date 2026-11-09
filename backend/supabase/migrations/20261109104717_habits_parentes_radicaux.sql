/* Les RADICAUX : les cinq premières lettres d'un mot. « skate » et « skateboard », « medit(ate) » et
   « medit(ation) », « train » et « trainer » se reconnaissent ; « downtown » et « city » non (mesuré).
   `_habit_kin` est remplacée pour lire les radicaux au lieu des mots entiers. */
create or replace function public._kin_stems(p_text text)
returns text[] language sql immutable set search_path to 'public'
as $$ select coalesce(array(select distinct left(w, 5) from unnest(public._space_words(p_text)) w), '{}'::text[]) $$;

create or replace function public._habit_kin(p_a text, p_ints_a text[], p_b text, p_ints_b text[])
returns jsonb language sql stable set search_path to 'public'
as $$
  with m as (
    select lower(btrim(coalesce(p_a,''))) a, lower(btrim(coalesce(p_b,''))) b,
           public._kin_stems(p_a) wa, public._kin_stems(p_b) wb,
           coalesce(p_ints_a,'{}'::text[]) ia, coalesce(p_ints_b,'{}'::text[]) ib
  ), s as (
    select a, b,
      case when a <> '' and a = b then 1 else 0 end ex,
      public._kin_jaccard(wa, wb) jw,
      case when a = '' or b = '' then 0::numeric
           else round(least(1, extensions.similarity(a, b))::numeric, 4) end tg,
      public._kin_jaccard(ia, ib) ji,
      public._kin_jaccard(array(select distinct public._pillar(x) from unnest(ia) x where public._pillar(x) is not null),
                          array(select distinct public._pillar(x) from unnest(ib) x where public._pillar(x) is not null)) jp
      from m
  )
  select jsonb_build_object(
    'score', case when ex = 1 then 1::numeric
                  else round(least(1, 0.42*jw + 0.22*tg + 0.28*ji + 0.08*jp), 3) end,
    'why', case when ex = 1 then 'same' when jw >= 0.5 then 'words' when ji >= 0.5 then 'intentions'
                when tg >= 0.45 then 'close' when jp > 0 then 'pillar' else 'echo' end)
    from s
$$;

grant execute on function public._kin_stems(text) to authenticated, anon;
grant execute on function public._habit_kin(text, text[], text, text[]) to authenticated, anon;
