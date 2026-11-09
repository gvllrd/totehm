/* Les ACCENTS d'abord : « Méditation » et « meditation » sont le MÊME mot (mesuré sur les spots réels,
   où le second se cachait dans « yoga-etirement-meditation »). Pas d'extension : une table de 1 à 1. */
create or replace function public._kin_fold(p_text text)
returns text language sql immutable set search_path to ''
as $$
  select translate(
           replace(replace(replace(lower(coalesce(p_text,'')), 'œ','oe'), 'æ','ae'), 'ß','ss'),
           'àáâãäåçèéêëìíîïðñòóôõöøùúûüýÿ',
           'aaaaaaceeeeiiiidnoooooouuuuyy')
$$;

create or replace function public._kin_stems(p_text text)
returns text[] language sql immutable set search_path to 'public'
as $$ select coalesce(array(select distinct left(w, 5)
                              from unnest(public._space_words(public._kin_fold(p_text))) w), '{}'::text[]) $$;

/* La CONTENANCE : si tous mes mots sont dans les leurs, c'est parent, même si la leur en dit plus
   (« Méditation » ⊂ « yoga-etirement-meditation entre chaque session de deep focus »). Jamais 1 : une
   contenance n'est pas une identité, elle vaut 0.75 d'un ensemble identique. */
create or replace function public._kin_words(p_a text[], p_b text[])
returns numeric language sql immutable set search_path to 'public'
as $$
  with a as (select distinct x from unnest(coalesce(p_a,'{}'::text[])) x where x is not null),
       b as (select distinct x from unnest(coalesce(p_b,'{}'::text[])) x where x is not null),
       n as (select (select count(*) from a) na, (select count(*) from b) nb,
                    (select count(*) from a join b using (x)) ni)
  select case when na = 0 or nb = 0 then 0::numeric
              else greatest(round(ni::numeric / (na + nb - ni)::numeric, 4),
                            round(0.75 * ni::numeric / least(na, nb)::numeric, 4)) end
    from n
$$;

create or replace function public._habit_kin(p_a text, p_ints_a text[], p_b text, p_ints_b text[])
returns jsonb language sql stable set search_path to 'public'
as $$
  with m as (
    select btrim(public._kin_fold(p_a)) a, btrim(public._kin_fold(p_b)) b,
           public._kin_stems(p_a) wa, public._kin_stems(p_b) wb,
           coalesce(p_ints_a,'{}'::text[]) ia, coalesce(p_ints_b,'{}'::text[]) ib
  ), s as (
    select a, b,
      case when a <> '' and a = b then 1 else 0 end ex,
      public._kin_words(wa, wb) jw,
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
                when jw > 0 then 'words' when tg >= 0.45 then 'close' when jp > 0 then 'pillar' else 'echo' end)
    from s
$$;

grant execute on function public._kin_fold(text) to authenticated, anon;
grant execute on function public._kin_stems(text) to authenticated, anon;
grant execute on function public._kin_words(text[], text[]) to authenticated, anon;
grant execute on function public._habit_kin(text, text[], text, text[]) to authenticated, anon;
