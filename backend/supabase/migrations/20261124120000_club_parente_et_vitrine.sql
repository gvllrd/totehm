-- TOTEHM · 24/11/2026 · figher.club : la parenté resserrée, et la vitrine du radar pour les visiteurs
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- 1 · LA PARENTÉ (Wah : « oui » au réglage). Mesuré en production le 24/11 :
--     « Méditation » ramenait « Faire une promenade » et « Manger une fois tous les 7 jours » pour la SEULE
--     raison qu'elles portent la même intention (0.36 > 0.30) ; et « méditation du matin » manquait
--     « yoga-étirement-méditation… » (0.206) alors que le mot est le même. Désormais :
--       · un MOT en commun (radical) suffit : la note ne descend pas sous 0.35 ;
--       · des intentions communes SANS mot commun ni texte proche ne suffisent plus : la note plafonne à 0.29
--         (sous le seuil de 0.30) — elles départagent encore, elles ne trouvent plus seules.
--     Zéro centime, toujours : aucune requête externe.
-- 2 · LA VITRINE (Wah : « affiche les spots sur le radar même pour les visiteurs pour donner envie »).
--     `club_vitrine()` : ce qu'un visiteur a le droit de voir d'un spot visible au Club (audience figher/public) —
--     SA VILLE, la couleur de ses intentions et son temps. JAMAIS le point exact, la Habit, l'auteur, le média,
--     le mot, ni l'heure. Le tap ouvre le Discover (la porte : CONNECT WITH MY TOTEHM).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

create or replace function public._habit_kin(p_a text, p_ints_a text[], p_b text, p_ints_b text[])
 returns jsonb
 language sql
 stable
 set search_path to 'public'
as $function$
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
  ), n as (
    select *, round(least(1, 0.42*jw + 0.22*tg + 0.28*ji + 0.08*jp), 3) base from s
  )
  select jsonb_build_object(
    'score', case when ex = 1 then 1::numeric
                  when jw > 0 then greatest(base, 0.35)
                  when tg >= 0.45 then base
                  else least(base, 0.29) end,
    'why', case when ex = 1 then 'same' when jw >= 0.5 then 'words' when ji >= 0.5 then 'intentions'
                when jw > 0 then 'words' when tg >= 0.45 then 'close' when jp > 0 then 'pillar' else 'echo' end)
    from n
$function$;
grant execute on function public._habit_kin(text, text[], text, text[]) to authenticated, anon;

create or replace function public.club_vitrine()
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  with l as (
    select nullif(btrim(p.city), '') city, coalesce(p.intentions, '{}'::text[]) ints,
           case when p.starts_at > now() then 'future'
                when p.starts_at + make_interval(mins => p.duration_min) > now() then 'now'
                else 'past' end quand,
           p.starts_at
      from public.spot_plans p
     where p.status = 'published' and p.format = 'spot'
       and p.audience in ('figher','public')
       and coalesce(p.demo, false) = false
       and nullif(btrim(p.city), '') is not null
       and p.starts_at > now() - interval '60 days'
       and p.starts_at < now() + interval '90 days'
  )
  select jsonb_build_object('ok', true, 'items', coalesce(jsonb_agg(jsonb_build_object(
           'city', city, 'intentions', to_jsonb(ints), 'when', quand)
           order by case quand when 'now' then 0 when 'future' then 1 else 2 end, abs(extract(epoch from starts_at - now()))), '[]'::jsonb))
    from (select * from l order by case quand when 'now' then 0 when 'future' then 1 else 2 end, abs(extract(epoch from starts_at - now())) limit 200) x
$function$;
comment on function public.club_vitrine() is
  'figher.club · la vitrine du radar pour un visiteur : ville, intentions, temps — jamais le point, la Habit, l''auteur ni le média (24/11/2026).';
revoke all on function public.club_vitrine() from public;
grant execute on function public.club_vitrine() to anon, authenticated;
