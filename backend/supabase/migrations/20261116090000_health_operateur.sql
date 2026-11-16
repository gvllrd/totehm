-- 16/11/2026 · LE CONTRÔLE DE SANTÉ DE L'OPÉRATEUR (lancement).
-- why : le 15/11 `creator-subscribe` a rendu 502 (« Expired API Key ») et rien ne le disait avant qu'un membre
--       essaie de payer. `edge_call('health')` pose un jeton à usage unique et appelle la fonction Edge `health`,
--       qui répond en booléens (clé Stripe valide, webhook live complet, Telegram, clés présentes). Jamais une valeur.
-- how : `select public.edge_call('health', '{}'::jsonb);` puis lire `net._http_response` (id rendu).
--       La liste blanche de `edge_call` gagne 'health' ; rien d'autre ne change.
create or replace function public.edge_call(p_fn text, p_body jsonb default '{}'::jsonb)
 returns bigint
 language plpgsql
 security definer
 set search_path to 'public, extensions, net'
as $function$
declare
  v_token text;
  v_req   bigint;
begin
  if p_fn not in ('bot-tick', 'agenda-ingest', 'health') then
    raise exception 'edge_call: fonction non autorisee (%)', p_fn;
  end if;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.edge_tokens(token, purpose) values (v_token, p_fn);
  select net.http_post(
    url     := 'https://abujjbkbbiumxrokozph.supabase.co/functions/v1/' || p_fn,
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-tick-token', v_token),
    body    := coalesce(p_body, '{}'::jsonb),
    timeout_milliseconds := 55000
  ) into v_req;
  return v_req;
end $function$;

revoke all on function public.edge_call(text, jsonb) from public, anon, authenticated;
grant execute on function public.edge_call(text, jsonb) to service_role;
