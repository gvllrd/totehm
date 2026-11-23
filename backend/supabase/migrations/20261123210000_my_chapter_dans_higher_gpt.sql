-- [COM] 23/11/2026 (Wah) : « tout ce qui a été fait dans le TOTEHM — spots compris, vraiment tout — serait analysé par
-- ChatGPT ». My Chapter quitte le site : c'est Higher GPT (le ChatGPT du membre, connecté en lecture seule) qui raconte
-- la période. Le serveur ne paie plus aucun modèle : la règle « le gratuit reste mécanique » redevient entière.
-- chatgpt_activity(grant, 7|28) : chaque geste du journal (box, médias, spots, commandes…), les spots publiés (sans
-- coordonnées), et les réponses TotehmBot (On It · No Time · No Energy) SEULEMENT si le membre partage sa pratique.
-- Retirés : chapter_settings et ses fonctions (l'accord se donne en connectant ChatGPT), chapter_week_material.

create or replace function public.chatgpt_activity(p_grant uuid, p_days integer default 7)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare u uuid; d integer := case when p_days = 28 then 28 else 7 end; f timestamptz; sh boolean;
begin
  select g.user_id into u from public.chatgpt_grants g where g.id = p_grant and g.revoked_at is null
    and g.scope = array['totehm:read']::text[] and g.resource = 'https://www.totehm.com/mcp';
  if u is null then return jsonb_build_object('available', false, 'why', 'unavailable'); end if;
  f := now() - make_interval(days => d);
  sh := coalesce((select share_chatgpt from public.tracking_settings where user_id = u), false);
  return jsonb_build_object('available', true,
    'period', jsonb_build_object('days', d, 'start', f, 'end', now(), 'timezone', public.tracking_settings_for(u)->>'timezone'),
    'gestures', coalesce((select jsonb_agg(jsonb_build_object('at', j.at, 'box', j.box, 'kind', j.kind, 'label', left(j.label, 300), 'intention', j.intention) order by j.at)
       from (select * from public.totehm_journal where user_id = u and at >= f order by at desc limit 400) j), '[]'::jsonb),
    'spots', coalesce((select jsonb_agg(jsonb_build_object('habit', left(s.habit, 300), 'starts_at', s.starts_at, 'duration_min', s.duration_min,
         'city', s.city, 'place', left(s.place, 120), 'audience', s.audience, 'mode', s.mode, 'comment', left(s.comment, 300), 'status', s.status) order by s.starts_at)
       from public.spot_plans s where s.user_id = u and (s.created_at >= f or s.starts_at >= f)), '[]'::jsonb),
    'practice_shared', sh,
    'answers', case when sh then coalesce((select jsonb_agg(jsonb_build_object('at', c.reported_at, 'habit', left(o.habit_text, 300), 'answer', c.status) order by c.reported_at)
       from public.tracking_checkins c join public.habit_outcomes o on o.id = c.outcome_id where c.user_id = u and c.reported_at >= f), '[]'::jsonb) end,
    'interpretation', 'Everything the person recorded in their TOTEHM over the period, oldest first. A gesture is an action in the app, not proof of practice. Spots carry no coordinates. Answers exist only if the person shares their practice: On It, No Time, No Energy are honest answers, never failures; silence is unknown.');
end $function$;
revoke all on function public.chatgpt_activity(uuid, integer) from public, anon, authenticated;

drop function if exists public.chapter_settings_set(boolean);
drop function if exists public.my_chapters(integer);
drop function if exists public.chapter_week_material(uuid, timestamptz, timestamptz);
drop table if exists public.chapter_settings;
comment on table public.book_chapters is '[COM] l''ancien autobiographiste — 0 ligne, jamais branché (My Chapter vit dans Higher GPT depuis le 23/11)';
