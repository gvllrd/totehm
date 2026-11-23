-- [COM] 23/11/2026 (Wah) : « il faut mettre Higher GPT dans le dashboard, avant la section Telegram, avec la
-- possibilité de le configurer ». Le membre lit SON état (connecté ? depuis quand ? son suivi partagé ?) et peut
-- couper l'accès de ChatGPT d'un geste. Le partage du suivi reste `tracking_settings_set({share_chatgpt})`.

create or replace function public.chatgpt_my_status()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare u uuid := auth.uid();
begin
  if u is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  return jsonb_build_object('ok', true,
    'connected', exists(select 1 from public.chatgpt_grants g where g.user_id = u and g.revoked_at is null),
    'since', (select min(g.created_at) from public.chatgpt_grants g where g.user_id = u and g.revoked_at is null),
    'ecosystem', exists(select 1 from public.chatgpt_grants g join public.chatgpt_ecosystem_consents c on c.grant_id = g.id
                         where g.user_id = u and g.revoked_at is null),
    'share_tracking', coalesce((select s.share_chatgpt from public.tracking_settings s where s.user_id = u), false));
end $function$;

create or replace function public.chatgpt_my_disconnect()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare u uuid := auth.uid(); n integer;
begin
  if u is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  update public.chatgpt_grants set revoked_at = now() where user_id = u and revoked_at is null;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'count', n);
end $function$;

revoke all on function public.chatgpt_my_status() from public, anon;
revoke all on function public.chatgpt_my_disconnect() from public, anon;
grant execute on function public.chatgpt_my_status() to authenticated;
grant execute on function public.chatgpt_my_disconnect() to authenticated;
