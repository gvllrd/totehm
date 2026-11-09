/* ══ LA PARENTÉ DES HABITS · 09/11/2026 ═══════════════════════════════════════════════════════════
   Wah : « quand l'utilisateur choisit une habitude de son Totehm dans le filtre, il souhaite voir des
   spots avec des Habits de Totehm similaire ». MÉCANIQUE, zéro centime (règle de coût) : les MOTS
   (`_space_words`, déjà la langue du Club), les TRIGRAMMES (`pg_trgm`, pour « run » ≈ « running »),
   les INTENTIONS de la box (le signal le plus fort : deux Habits qui servent Fight se ressemblent) et
   le PILIER. Aucun LLM, aucun vecteur, aucun appel payant. */

/* Jaccard sur deux ensembles de mots : partagés / réunis. Les doublons ne comptent pas deux fois. */
create or replace function public._kin_jaccard(p_a text[], p_b text[])
returns numeric language sql immutable set search_path to ''
as $$
  with a as (select distinct x from unnest(coalesce(p_a,'{}'::text[])) x where x is not null),
       b as (select distinct x from unnest(coalesce(p_b,'{}'::text[])) x where x is not null),
       n as (select (select count(*) from a) na, (select count(*) from b) nb,
                    (select count(*) from a join b using (x)) ni)
  select case when na = 0 or nb = 0 then 0::numeric
              else round(ni::numeric / (na + nb - ni)::numeric, 4) end
    from n
$$;

/* Les intentions d'une Habit du Totehm d'un membre (sa box, telle qu'elle est). */
create or replace function public._habit_ints(p_user uuid, p_habit text)
returns text[] language sql stable security definer set search_path to 'public'
as $$
  select coalesce((select public._step_intentions(s)
                     from public.totehms t, jsonb_array_elements(coalesce(t.steps,'[]'::jsonb)) s
                    where t.user_id = p_user and lower(btrim(coalesce(s->>'t',''))) = lower(btrim(coalesce(p_habit,'')))
                    limit 1), '{}'::text[])
$$;

/* LA PARENTÉ : 0 (étrangères) → 1 (la même). Le score ET pourquoi, pour que l'écran puisse le dire. */
create or replace function public._habit_kin(p_a text, p_ints_a text[], p_b text, p_ints_b text[])
returns jsonb language sql stable set search_path to 'public'
as $$
  with m as (
    select lower(btrim(coalesce(p_a,''))) a, lower(btrim(coalesce(p_b,''))) b,
           public._space_words(p_a) wa, public._space_words(p_b) wb,
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

comment on function public._habit_kin(text, text[], text, text[]) is
  'Parenté de deux Habits : mots + trigrammes + intentions + pilier. Mécanique, zéro centime.';

grant execute on function public._kin_jaccard(text[], text[]) to authenticated, anon;
grant execute on function public._habit_ints(uuid, text) to authenticated;
grant execute on function public._habit_kin(text, text[], text, text[]) to authenticated, anon;
