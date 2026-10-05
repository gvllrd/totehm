-- 05/10/2026 — SPACE apparaît dans les habitudes de COM.
-- Wah : « il faut lier SPACE à COM avec l'apparition des spots dans les habits ».
-- Un space (`spot_plans`) porte le TEXTE de l'habitude qu'il vit ; on regroupe
-- les spaces publiés par habitude (clé : lower(btrim(habit))), trois au plus
-- par habitude (en cours, puis à venir le plus proche, puis passés les plus
-- récents) et leur nombre total.
--
-- Droits : AUCUNE règle nouvelle. Chaque space passe par `_spot_view(p, moi)`,
-- la vue de SPACE : PRIVATE = le propriétaire seul ; SHARED = la ville pour tous,
-- le point exact (`exact`) seulement quand `_spot_exact` l'accorde (abonné, ON).
--   · p_pseudo vide → MES spaces publiés (privés et partagés) ;
--   · p_pseudo = un autre membre → ses spaces PARTAGÉS seulement (ce que SPACE
--     montre déjà à tout le monde), lus sous MES droits.
-- Additive : une fonction, aucune table. Lecture seule. authenticated seulement.

create or replace function public.habit_spaces(p_pseudo text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me  uuid := auth.uid();
  v_uid uuid;
  v_out jsonb;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'why', 'signin');
  end if;

  if p_pseudo is null or btrim(p_pseudo) = '' then
    v_uid := v_me;
  else
    select id into v_uid from public.profiles
     where lower(pseudo) = lower(btrim(p_pseudo)) limit 1;
    if v_uid is null then
      return jsonb_build_object('ok', false, 'why', 'nobody');
    end if;
  end if;

  with s as (
    select p as r,
           lower(btrim(p.habit)) as k,
           p.habit,
           count(*) over (partition by lower(btrim(p.habit))) as n,
           row_number() over (
             partition by lower(btrim(p.habit))
             order by case
                        when now() >= p.starts_at
                         and now() <  p.starts_at + make_interval(mins => p.duration_min) then 0
                        when p.starts_at > now() then 1
                        else 2
                      end,
                      case when p.starts_at > now() then p.starts_at end asc nulls last,
                      p.starts_at desc,
                      p.spot_id desc) as rn
      from public.spot_plans p
     where p.user_id = v_uid
       and p.status = 'published'
       and btrim(coalesce(p.habit, '')) <> ''
       and (v_uid = v_me or p.visibility = 'shared')
  ), g as (
    select k,
           min(habit) as habit,
           max(n)     as total,
           jsonb_agg(public._spot_view(r, v_me) order by rn) filter (where rn <= 3) as spaces
      from s
     group by k
  )
  select coalesce(jsonb_agg(jsonb_build_object('habit', habit, 'total', total, 'spaces', spaces)
                            order by k), '[]'::jsonb)
    into v_out
    from g;

  return jsonb_build_object('ok', true, 'mine', v_uid = v_me, 'habits', v_out);
end
$$;

revoke all on function public.habit_spaces(text) from public;
revoke all on function public.habit_spaces(text) from anon;
grant execute on function public.habit_spaces(text) to authenticated;
