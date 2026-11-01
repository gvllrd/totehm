-- HIGHER MY CHATGPT: isolated read-only OAuth credentials.
-- This migration only creates connector-specific tables/functions. It grants no
-- application-write session and changes no existing table, RPC or policy.
-- Raw authorization codes and tokens stay in the HTTPS exchange; only their
-- lowercase SHA-256 hashes are stored here. The Edge Function verifies the
-- member's normal session before supplying p_user to the service-only RPCs.

create function public.chatgpt_redirect_uris_valid(p_uris text[])
returns boolean language sql immutable set search_path = '' as $f$
  select p_uris is not null
     and pg_catalog.array_ndims(p_uris) = 1
     and pg_catalog.cardinality(p_uris) between 1 and 10
     and not exists (
       select 1 from pg_catalog.unnest(p_uris) as x(uri)
       where uri is null or pg_catalog.length(uri) not between 1 and 2048
          or uri ~ '[[:space:]#]'
          or not (uri ~ '^https://[^/]+' or uri ~ '^http://(localhost|127[.]0[.]0[.]1)(:[0-9]+)?(/|$)')
     );
$f$;

create table public.chatgpt_clients (
  client_id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  redirect_uris text[] not null check (public.chatgpt_redirect_uris_valid(redirect_uris)),
  created_at timestamptz not null default now()
);

create table public.chatgpt_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.chatgpt_clients(client_id) on delete cascade,
  redirect_uri text not null check (length(redirect_uri) between 1 and 2048),
  code_challenge text not null check (code_challenge ~ '^[A-Za-z0-9_-]{43}$'),
  scope text[] not null default array['totehm:read']::text[]
    check (scope = array['totehm:read']::text[]),
  state text not null default '' check (length(state) <= 2048),
  resource text not null check (length(resource) between 1 and 2048),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  used_at timestamptz
);

create table public.chatgpt_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.chatgpt_clients(client_id) on delete cascade,
  scope text[] not null default array['totehm:read']::text[]
    check (scope = array['totehm:read']::text[]),
  -- Bound at consent so rotating refresh tokens cannot change their audience.
  resource text not null check (length(resource) between 1 and 2048),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.chatgpt_codes (
  code_hash text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  request_id uuid not null unique references public.chatgpt_requests(id) on delete cascade,
  grant_id uuid not null references public.chatgpt_grants(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '120 seconds'),
  consumed_at timestamptz
);

create table public.chatgpt_tokens (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  grant_id uuid not null references public.chatgpt_grants(id) on delete cascade,
  kind text not null check (kind in ('access', 'refresh')),
  expires_at timestamptz not null,
  used_at timestamptz,
  check (kind = 'refresh' or used_at is null)
);

create index chatgpt_requests_client_idx on public.chatgpt_requests(client_id);
create index chatgpt_grants_user_client_idx on public.chatgpt_grants(user_id, client_id);
create index chatgpt_grants_client_idx on public.chatgpt_grants(client_id);
create index chatgpt_codes_grant_idx on public.chatgpt_codes(grant_id);
create index chatgpt_tokens_grant_idx on public.chatgpt_tokens(grant_id);

alter table public.chatgpt_clients enable row level security;
alter table public.chatgpt_requests enable row level security;
alter table public.chatgpt_grants enable row level security;
alter table public.chatgpt_codes enable row level security;
alter table public.chatgpt_tokens enable row level security;

-- Explicit policies also work if service_role is not configured BYPASSRLS.
create policy chatgpt_clients_service on public.chatgpt_clients for all to service_role using (true) with check (true);
create policy chatgpt_requests_service on public.chatgpt_requests for all to service_role using (true) with check (true);
create policy chatgpt_grants_service on public.chatgpt_grants for all to service_role using (true) with check (true);
create policy chatgpt_codes_service on public.chatgpt_codes for all to service_role using (true) with check (true);
create policy chatgpt_tokens_service on public.chatgpt_tokens for all to service_role using (true) with check (true);

create function public.chatgpt_authorize_request(p_request uuid, p_user uuid, p_code_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $f$
declare
  v_request public.chatgpt_requests%rowtype;
  v_grant uuid;
  v_now timestamptz := now();
begin
  if p_request is null or p_user is null or p_code_hash is null
     or p_code_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  select * into v_request from public.chatgpt_requests
   where id = p_request for update;
  if not found or v_request.used_at is not null or v_request.expires_at <= v_now then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  if not exists (select 1 from auth.users where id = p_user) then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  if not exists (
    select 1 from public.chatgpt_clients c
     where c.client_id = v_request.client_id
       and v_request.redirect_uri = any(c.redirect_uris)
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_client');
  end if;

  insert into public.chatgpt_grants(user_id, client_id, scope, resource)
  values (p_user, v_request.client_id, v_request.scope, v_request.resource)
  returning id into v_grant;
  insert into public.chatgpt_codes(code_hash, request_id, grant_id, expires_at)
  values (p_code_hash, v_request.id, v_grant, v_now + interval '120 seconds');
  update public.chatgpt_requests set used_at = v_now where id = v_request.id;

  return jsonb_build_object('ok', true, 'redirect_uri', v_request.redirect_uri, 'state', v_request.state);
exception when unique_violation or foreign_key_violation then
  -- The exception block rolls back the whole attempted issuance.
  return jsonb_build_object('ok', false, 'error', 'invalid_request');
end;
$f$;

create function public.chatgpt_exchange_code(
  p_code_hash text, p_client_id uuid, p_redirect_uri text, p_challenge text,
  p_resource text, p_access_hash text, p_refresh_hash text
)
returns jsonb language plpgsql security definer set search_path = '' as $f$
declare
  v_code public.chatgpt_codes%rowtype;
  v_request public.chatgpt_requests%rowtype;
  v_grant public.chatgpt_grants%rowtype;
  v_now timestamptz := now();
begin
  if p_code_hash is null or p_client_id is null or p_redirect_uri is null
     or p_challenge is null or p_resource is null or p_access_hash is null
     or p_refresh_hash is null or p_code_hash !~ '^[0-9a-f]{64}$'
     or p_access_hash !~ '^[0-9a-f]{64}$' or p_refresh_hash !~ '^[0-9a-f]{64}$'
     or p_access_hash = p_refresh_hash then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  select * into v_code from public.chatgpt_codes where code_hash = p_code_hash for update;
  if not found or v_code.expires_at <= v_now then
    return jsonb_build_object('ok', false, 'error', 'invalid_grant');
  end if;
  select * into v_grant from public.chatgpt_grants where id = v_code.grant_id for update;
  if not found or v_grant.revoked_at is not null then
    return jsonb_build_object('ok', false, 'error', 'invalid_grant');
  end if;
  select * into v_request from public.chatgpt_requests where id = v_code.request_id;
  if not found or v_request.used_at is null
     or v_request.client_id <> p_client_id or v_grant.client_id <> p_client_id
     or v_request.redirect_uri <> p_redirect_uri
     or v_request.code_challenge <> p_challenge
     or v_request.resource <> p_resource or v_grant.resource <> p_resource
     or v_grant.scope <> array['totehm:read']::text[]
     or not exists (select 1 from public.chatgpt_clients c
                     where c.client_id = p_client_id and p_redirect_uri = any(c.redirect_uris)) then
    return jsonb_build_object('ok', false, 'error', 'invalid_grant');
  end if;

  -- A replay with the correct original binding can indicate interception.
  -- Verify PKCE/client/resource above first so a wrong verifier cannot revoke a grant.
  if v_code.consumed_at is not null then
    update public.chatgpt_grants set revoked_at = v_now where id = v_grant.id;
    return jsonb_build_object('ok', false, 'error', 'invalid_grant');
  end if;

  insert into public.chatgpt_tokens(token_hash, grant_id, kind, expires_at)
  values (p_access_hash, v_grant.id, 'access', v_now + interval '1 hour'),
         (p_refresh_hash, v_grant.id, 'refresh', v_now + interval '30 days');
  update public.chatgpt_codes set consumed_at = v_now where code_hash = p_code_hash;
  return jsonb_build_object('ok', true, 'scope', to_jsonb(v_grant.scope), 'expires_in', 3600);
exception when unique_violation or foreign_key_violation then
  return jsonb_build_object('ok', false, 'error', 'invalid_request');
end;
$f$;

create function public.chatgpt_refresh(
  p_refresh_hash text, p_client_id uuid, p_resource text,
  p_access_hash text, p_next_refresh_hash text
)
returns jsonb language plpgsql security definer set search_path = '' as $f$
declare
  v_token public.chatgpt_tokens%rowtype;
  v_grant public.chatgpt_grants%rowtype;
  v_now timestamptz := now();
begin
  if p_refresh_hash is null or p_client_id is null or p_resource is null
     or p_access_hash is null or p_next_refresh_hash is null
     or p_refresh_hash !~ '^[0-9a-f]{64}$'
     or p_access_hash !~ '^[0-9a-f]{64}$' or p_next_refresh_hash !~ '^[0-9a-f]{64}$'
     or p_access_hash = p_next_refresh_hash
     or p_refresh_hash in (p_access_hash, p_next_refresh_hash) then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  select * into v_token from public.chatgpt_tokens where token_hash = p_refresh_hash for update;
  if not found or v_token.kind <> 'refresh' then
    return jsonb_build_object('ok', false, 'error', 'invalid_grant');
  end if;
  select * into v_grant from public.chatgpt_grants where id = v_token.grant_id for update;
  if not found or v_grant.revoked_at is not null
     or v_grant.client_id <> p_client_id or v_grant.resource <> p_resource
     or v_grant.scope <> array['totehm:read']::text[] then
    return jsonb_build_object('ok', false, 'error', 'invalid_grant');
  end if;
  -- Validate the audience/client before treating a request as a token replay.
  -- Consumed rows are retained so reuse revokes the whole token family.
  if v_token.used_at is not null then
    update public.chatgpt_grants set revoked_at = v_now where id = v_grant.id;
    return jsonb_build_object('ok', false, 'error', 'invalid_grant');
  end if;
  if v_token.expires_at <= v_now then
    return jsonb_build_object('ok', false, 'error', 'invalid_grant');
  end if;

  insert into public.chatgpt_tokens(token_hash, grant_id, kind, expires_at)
  values (p_access_hash, v_grant.id, 'access', v_now + interval '1 hour'),
         (p_next_refresh_hash, v_grant.id, 'refresh', v_now + interval '30 days');
  update public.chatgpt_tokens set used_at = v_now where token_hash = p_refresh_hash;
  return jsonb_build_object('ok', true, 'scope', to_jsonb(v_grant.scope), 'expires_in', 3600);
exception when unique_violation or foreign_key_violation then
  return jsonb_build_object('ok', false, 'error', 'invalid_request');
end;
$f$;

create function public.chatgpt_revoke(p_user uuid, p_client_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $f$
declare
  v_count integer;
begin
  if p_user is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  update public.chatgpt_grants set revoked_at = now()
   where user_id = p_user and revoked_at is null
     and (p_client_id is null or client_id = p_client_id);
  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'count', v_count);
end;
$f$;

-- Grants come last: default PUBLIC function execution is explicitly removed.
revoke all on public.chatgpt_clients, public.chatgpt_requests, public.chatgpt_grants,
  public.chatgpt_codes, public.chatgpt_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.chatgpt_clients, public.chatgpt_requests,
  public.chatgpt_grants, public.chatgpt_codes, public.chatgpt_tokens to service_role;

revoke all on function public.chatgpt_redirect_uris_valid(text[]) from public, anon, authenticated;
revoke all on function public.chatgpt_authorize_request(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.chatgpt_exchange_code(text, uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.chatgpt_refresh(text, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.chatgpt_revoke(uuid, uuid) from public, anon, authenticated;

grant execute on function public.chatgpt_redirect_uris_valid(text[]) to service_role;
grant execute on function public.chatgpt_authorize_request(uuid, uuid, text) to service_role;
grant execute on function public.chatgpt_exchange_code(text, uuid, text, text, text, text, text) to service_role;
grant execute on function public.chatgpt_refresh(text, uuid, text, text, text) to service_role;
grant execute on function public.chatgpt_revoke(uuid, uuid) to service_role;
