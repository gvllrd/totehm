-- ══ LOT D · 15/10/2026 — LES ENVOIS SUIVENT LA TIME FREQUENCY DE CHAQUE HABIT ══════════════════
-- Wah : « un Higher my Telegram qui envoie des messages par rapport aux Time frequency de chaque
-- Habit Box, et du contenu qui pousse à l'action ». Telegram SEUL (décision du 15/10) : pas de Meta.
--
-- Avant, `push_decision` triait sur un ordre FIGÉ (several_daily, daily, …) et imposait le même écart
-- de 4 h à tout le monde : une Habit « every hour » et une Habit « weekly » étaient traitées pareil,
-- et une Habit pouvait repartir avant d'être due. Maintenant c'est SA période qui décide :
--   • on ne redemande pas une Habit avant que sa période soit écoulée ;
--   • c'est la plus EN RETARD (retard / période) qui part ;
--   • l'écart minimum entre deux messages suit la plus courte période, jamais moins de 20 minutes.
-- Le reste ne bouge pas : fuseau, heures calmes, plafond quotidien, silence après trois ignorés.
--
-- ⚠️ UNE SEULE TABLE DE FRÉQUENCES. `_freq_minutes` répète, en minutes, le tableau `FREQS` de
-- `com/totehm.html` : les deux doivent rester identiques — la page écrit l'id, le serveur lit la durée.
-- Rien de destructif : aucun `drop`, aucun `update` sans `where`, aucun prix.

create or replace function public._freq_minutes(p_freq text)
returns integer language sql immutable set search_path to '' as $f$
  select case btrim(coalesce(p_freq, ''))
    when 'every_minute'    then 1
    when 'hourly'          then 60
    when 'several_daily'   then 480
    when 'every_morning'   then 1436
    when 'every_afternoon' then 1438
    when 'daily'           then 1440
    when 'every_evening'   then 1441
    when 'every_weekday'   then 1442
    when 'every_night'     then 1443
    when 'every_other_day' then 2880
    when 'twice_week'      then 5040
    when 'every_weekend'   then 10078
    when 'weekly'          then 10080
    when 'every_monday'    then 10081
    when 'every_tuesday'   then 10082
    when 'every_wednesday' then 10083
    when 'every_thursday'  then 10084
    when 'every_friday'    then 10085
    when 'every_saturday'  then 10086
    when 'every_sunday'    then 10087
    when 'biweekly'        then 20160
    when 'twice_month'     then 21600
    when 'monthly'         then 43200
    when 'quarterly'       then 129600
    when 'seasonal'        then 131400
    when 'semiannual'      then 262800
    when 'yearly'          then 525600
    when 'every_birthday'  then 525601
    when 'every_newyear'   then 525602
    else null                       -- « randomly », « sometimes », rien de posé : jamais de rythme
  end;
$f$;

create or replace function public.push_decision(p_user uuid)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare
  v_tz text; v_qf int; v_qt int; v_max int;
  v_hour int; v_today int; v_last timestamptz;
  v_day_start timestamptz;
  v_ignored int; v_habit text; v_freq text; v_int text; v_mins int;
  v_rep record; v_body text; v_gap int;
begin
  select tz, quiet_from, quiet_to, max_daily
    into v_tz, v_qf, v_qt, v_max
    from public.totehms where user_id = p_user and bot = true limit 1;

  if v_tz is null then
    return jsonb_build_object('send', false, 'why', 'bot_off');
  end if;

  v_hour := extract(hour from (now() at time zone v_tz))::int;

  if (v_qf < v_qt and v_hour >= v_qf and v_hour < v_qt)
     or (v_qf > v_qt and (v_hour >= v_qf or v_hour < v_qt)) then
    return jsonb_build_object('send', false, 'why', 'quiet_hours');
  end if;

  v_day_start := ((now() at time zone v_tz)::date)::timestamp at time zone v_tz;

  select count(*), max(sent_at) into v_today, v_last
    from public.pushes
   where user_id = p_user and sent_at >= v_day_start;

  if v_today >= v_max then
    return jsonb_build_object('send', false, 'why', 'max_daily');
  end if;

  -- L'écart minimum suit la plus COURTE période posée : une Habit horaire peut parler toutes les
  -- 30 minutes, une Habit hebdomadaire garde les 4 heures. Jamais sous 20 minutes.
  select greatest(20, least(240, coalesce(min(public._freq_minutes(h.freq)) / 2, 240)))
    into v_gap
    from public.my_habits(p_user) h
   where h.ready and public._freq_minutes(h.freq) is not null;

  if v_last is not null and v_last > now() - make_interval(mins => coalesce(v_gap, 240)) then
    return jsonb_build_object('send', false, 'why', 'min_gap');
  end if;

  select count(*) into v_ignored
    from (select answered_at from public.habit_outcomes
           where user_id = p_user order by asked_at desc limit 3) s
   where answered_at is null;

  if v_ignored >= 3 and v_last is not null and v_last > now() - interval '7 days' then
    return jsonb_build_object('send', false, 'why', 'decay_silence');
  end if;

  -- ⚠️ C'EST LA PÉRIODE DE L'HABIT QUI DÉCIDE. Une Habit n'est due que si sa fréquence est écoulée
  -- depuis la dernière demande ; parmi les dues, la plus en retard (retard / période) part la première.
  select h.habit, h.freq, h.intention, public._freq_minutes(h.freq)
    into v_habit, v_freq, v_int, v_mins
  from public.my_habits(p_user) h
  left join lateral (
    select max(o.asked_at) as der, bool_or(o.answered_at is null and o.asked_at > now() - interval '20 hours') as en_attente
      from public.habit_outcomes o
     where o.user_id = p_user and o.habit_text = h.habit) d on true
  where h.ready
    and public._freq_minutes(h.freq) is not null
    and coalesce(d.en_attente, false) = false
    and (d.der is null or d.der <= now() - make_interval(mins => public._freq_minutes(h.freq)))
  order by case when d.der is null then 1e9
                else extract(epoch from (now() - d.der)) / 60 / public._freq_minutes(h.freq) end desc,
           public._freq_minutes(h.freq)
  limit 1;

  if v_habit is null then
    return jsonb_build_object('send', false, 'why', 'nothing_due');
  end if;

  select id, repulsion into v_rep
    from public.repulsions
   where user_id = p_user and habit_text = v_habit and active limit 1;

  if v_rep.id is not null then
    v_body := 'Tu avais choisi de ' || v_rep.repulsion || '.';
  else
    v_body := v_habit || ' — tu l''as fait ?';
  end if;

  return jsonb_build_object(
    'send', true, 'habit', v_habit, 'body', v_body,
    'repulsion_id', v_rep.id, 'hour', v_hour, 'today', v_today,
    'freq', v_freq, 'intention', v_int, 'every_minutes', v_mins);
end
$f$;

-- Les droits, APRÈS le dernier `create or replace` (il rend le GRANT à PUBLIC).
revoke all on function public._freq_minutes(text) from public, anon, authenticated;
grant execute on function public._freq_minutes(text) to service_role;
revoke all on function public.push_decision(uuid) from public, anon, authenticated;
grant execute on function public.push_decision(uuid) to service_role;
