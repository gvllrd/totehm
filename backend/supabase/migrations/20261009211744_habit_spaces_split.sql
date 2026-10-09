-- TOTEHM · habit_spaces sépare les spaces et les spots · 09/10/2026
-- why : COM montre sous chaque Habit ses SPACES et ses SPOTS. `habit_spaces`
--       rendait trois éléments MÉLANGÉS par Habit et un seul `total` : COM
--       comptait sur ces trois-là (« 1 SPACES », un spot caché par trois
--       spaces). Le serveur sépare et compte ; la page n'additionne rien.
-- how : même signature, même droits (`_spot_view`), même tri par format ;
--       la réponse gagne `spots`, `total_spaces`, `total_spots` ; `spaces` ne
--       porte plus que des spaces ; `total` reste la somme (lecteurs d'avant).
-- what : public.habit_spaces(text).

create or replace function public.habit_spaces(p_pseudo text default null::text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
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
           p.format,
           count(*) over (partition by lower(btrim(p.habit)), p.format) as n,
           -- un space : le plus récent d'abord ; un spot : en cours, puis le
           -- prochain, puis le passé le plus récent.
           row_number() over (
             partition by lower(btrim(p.habit)), p.format
             order by case
                        when p.format = 'space' then 0
                        when now() >= p.starts_at
                         and now() <  p.starts_at + make_interval(mins => p.duration_min) then 0
                        when p.starts_at > now() then 1
                        else 2
                      end,
                      case when p.format = 'spot' and p.starts_at > now() then p.starts_at end asc nulls last,
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
           coalesce(max(n) filter (where format = 'space'), 0) as n_spaces,
           coalesce(max(n) filter (where format = 'spot'), 0)  as n_spots,
           coalesce(jsonb_agg(public._spot_view(r, v_me) order by rn)
                      filter (where format = 'space' and rn <= 3), '[]'::jsonb) as spaces,
           coalesce(jsonb_agg(public._spot_view(r, v_me) order by rn)
                      filter (where format = 'spot' and rn <= 3), '[]'::jsonb) as spots
      from s
     group by k
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'habit', habit,
           'total', n_spaces + n_spots,
           'total_spaces', n_spaces,
           'total_spots', n_spots,
           'spaces', spaces,
           'spots', spots) order by k), '[]'::jsonb)
    into v_out
    from g;

  return jsonb_build_object('ok', true, 'mine', v_uid = v_me, 'habits', v_out);
end
$function$;

revoke all on function public.habit_spaces(text) from public, anon, authenticated, service_role;
grant execute on function public.habit_spaces(text) to authenticated, service_role;
