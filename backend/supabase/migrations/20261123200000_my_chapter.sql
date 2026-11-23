-- [COM] 23/11/2026 (Wah, décision B du 22/11) : le verso Go Higher devient « My Chapter » — « un feedback en mode
-- narratif, qui prendrait TOUT en compte, TOUTES les actions effectuées dans le TOTEHM, TOUS les choix effectués dans
-- Telegram, avec un LLM… autobiography ». Un chapitre par semaine, écrit côté serveur (`my-chapter`, OPENAI_API_KEY),
-- offert. Il ne s'écrit QU'APRÈS l'accord explicite du membre (ses données vont au fournisseur du modèle).
-- Le chapitre vit dans `book_chapters` (la table de l'ancien autobiographiste, jamais branchée : 0 ligne).
-- Et `chapter_full_material` lit enfin les mots du suivi (on_it / not_on_it).

create table public.chapter_settings (
  user_id uuid primary key,
  enabled boolean not null default false,
  enabled_at timestamptz,
  updated_at timestamptz not null default now()
);
comment on table public.chapter_settings is '[COM] My Chapter : l''accord explicite du membre pour que son chapitre hebdomadaire soit écrit par un modèle';
alter table public.chapter_settings enable row level security;
comment on table public.book_chapters is '[COM] My Chapter — un chapitre par semaine (opened_at = lundi 00:00 UTC), écrit par my-chapter ; versions archivées (book_chapter_versions)';

create or replace function public.chapter_settings_set(p_enabled boolean)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare u uuid := auth.uid();
begin
  if u is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  insert into public.chapter_settings (user_id, enabled, enabled_at, updated_at)
    values (u, coalesce(p_enabled, false), case when p_enabled then now() end, now())
    on conflict (user_id) do update set enabled = excluded.enabled,
      enabled_at = case when excluded.enabled then coalesce(public.chapter_settings.enabled_at, now()) else null end, updated_at = now();
  return jsonb_build_object('ok', true, 'enabled', coalesce(p_enabled, false));
end $function$;

-- mes chapitres (le plus récent d'abord), et ce qu'il me reste à réécrire cette semaine
create or replace function public.my_chapters(p_limit integer default 8)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare u uuid := auth.uid(); w timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
begin
  if u is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  return jsonb_build_object('ok', true,
    'enabled', coalesce((select enabled from public.chapter_settings where user_id = u), false),
    'week', w,
    'writes_left', greatest(0, 3 - coalesce((select version from public.book_chapters where user_id = u and opened_at = w), 0)),
    'chapters', coalesce((select jsonb_agg(jsonb_build_object('no', c.chapter_no, 'title', c.title, 'body', c.body,
        'from', c.opened_at, 'to', c.closed_at, 'written_at', c.generated_at, 'version', c.version) order by c.opened_at desc)
      from (select * from public.book_chapters where user_id = u and body is not null order by opened_at desc limit least(greatest(coalesce(p_limit,8),1),26)) c), '[]'::jsonb));
end $function$;

-- la matière d'une semaine, pour le serveur SEUL : les gestes du journal, les réponses de TotehmBot, ses box (ses mots)
create or replace function public.chapter_week_material(p_user uuid, p_from timestamptz, p_to timestamptz)
 returns jsonb language sql stable security definer set search_path to '' as $function$
  select jsonb_build_object(
    'pseudo', (select pseudo from public.profiles where id = p_user),
    'gestures', coalesce((select jsonb_agg(jsonb_build_object('at', j.at, 'box', j.box, 'kind', j.kind, 'label', left(j.label, 240), 'intention', j.intention) order by j.at)
       from (select * from public.totehm_journal where user_id = p_user and at >= p_from and at < p_to order by at limit 300) j), '[]'::jsonb),
    'answers', coalesce((select jsonb_agg(jsonb_build_object('at', c.reported_at, 'habit', left(o.habit_text, 240), 'answer', c.status) order by c.reported_at)
       from public.tracking_checkins c join public.habit_outcomes o on o.id = c.outcome_id
      where c.user_id = p_user and c.reported_at >= p_from and c.reported_at < p_to), '[]'::jsonb),
    'unanswered', (select count(*) from public.habit_outcomes o where o.user_id = p_user and o.asked_at >= p_from and o.asked_at < p_to and o.answered_at is null),
    'habits', coalesce((select jsonb_agg(jsonb_build_object('t', left(s->>'t', 240), 'f', s->>'f', 'is', s->'is'))
       from (select s from public.totehms t, jsonb_array_elements(coalesce(t.habits, '[]'::jsonb)) s where t.user_id = p_user and btrim(coalesce(s->>'t','')) <> '' limit 40) x), '[]'::jsonb),
    'objectives', coalesce((select jsonb_agg(jsonb_build_object('text', left(o.text, 240), 'by', o.target_at::date, 'status', o.status))
       from (select * from public.objectives where user_id = p_user and coalesce(status,'active') in ('active','achieved') order by target_at nulls last limit 20) o), '[]'::jsonb),
    'visions', coalesce((select jsonb_agg(left(v.text, 240)) from (select text from public.visions where user_id = p_user order by created_at desc limit 10) v), '[]'::jsonb),
    'repulsions', coalesce((select jsonb_agg(jsonb_build_object('text', left(coalesce(r.repulsion, r.obstacle, r.problem, ''), 240), 'habit', left(r.habit_text, 240)))
       from (select * from public.repulsions where user_id = p_user and active order by created_at desc limit 15) r), '[]'::jsonb),
    'stories', coalesce((select jsonb_agg(left(w.text, 300)) from (select text from public.stories where user_id = p_user order by created_at desc limit 6) w), '[]'::jsonb),
    'previous', (select jsonb_build_object('title', c.title, 'body', left(c.body, 900)) from public.book_chapters c
                  where c.user_id = p_user and c.opened_at < p_from and c.body is not null order by c.opened_at desc limit 1));
$function$;

revoke all on function public.chapter_settings_set(boolean) from public, anon;
revoke all on function public.my_chapters(integer) from public, anon;
revoke all on function public.chapter_week_material(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.chapter_settings_set(boolean) to authenticated;
grant execute on function public.my_chapters(integer) to authenticated;

-- l'ancienne matière d'un chapitre lit les mots du suivi
do $$
declare d text := pg_get_functiondef('public.chapter_full_material(bigint)'::regprocedure);
begin
  d := replace(d, 'outcome = ''done''', 'outcome = ''on_it''');
  d := replace(d, 'outcome = ''missed''', 'outcome = ''not_on_it''');
  if d ~ 'outcome\s*(=|<>)\s*''(done|missed)''' then raise exception 'chapter_full_material: literal left'; end if;
  execute d;
end $$;
