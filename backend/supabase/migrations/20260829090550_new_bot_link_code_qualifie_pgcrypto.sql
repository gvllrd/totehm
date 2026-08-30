-- La fonction était posée avec `set search_path to 'public'` — la bonne
-- pratique contre le détournement de schéma sur une SECURITY DEFINER.
-- Effet de bord : pgcrypto vit dans `extensions`, donc gen_random_bytes
-- devenait introuvable et la fonction levait à CHAQUE appel. Aucun
-- membre n'aurait obtenu de code de liaison.
-- On qualifie l'appel au lieu d'élargir le search_path.

create or replace function public.new_bot_link_code()
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_code text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  -- Un seul code vivant par membre : demander un nouveau code annule le précédent.
  delete from public.bot_link_codes where user_id = auth.uid();
  v_code := encode(extensions.gen_random_bytes(12), 'base64');
  -- base64url : Telegram n'accepte que [A-Za-z0-9_-] dans le payload /start.
  v_code := replace(replace(replace(v_code,'+','-'),'/','_'),'=','');
  insert into public.bot_link_codes(code, user_id) values (v_code, auth.uid());
  return v_code;
end $function$;

-- `create or replace` rend le GRANT à PUBLIC : le revoke vient APRÈS.
revoke execute on function public.new_bot_link_code() from public, anon;
grant  execute on function public.new_bot_link_code() to authenticated;
