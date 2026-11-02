// Executes the real additive connector migration in an isolated PostgreSQL WASM
// instance. Never connects to Supabase or a remote database. Requires PGlite;
// missing dependencies fail the run rather than silently skipping assertions.
// PGLITE_MODULE may select an existing installation outside this checkout.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
let checks = 0, sequence = 0;
const check = (value, message) => { assert(value, message); checks++; };
const hash = value => createHash('sha256').update(value).digest('hex');
const fresh = () => hash('isolated-fixture-' + (++sequence));
const userA = '11111111-1111-4111-8111-111111111111';
const userB = '22222222-2222-4222-8222-222222222222';
const redirect = 'https://chatgpt.example.test/oauth/callback';
const resource = 'https://connector.example.test/mcp';
const challenge = 'A'.repeat(43);
const rows = async (sql, params = []) => (await db.query(sql, params)).rows;
const scalar = async (sql, params = []) => Object.values((await rows(sql, params))[0])[0];
const rpc = async (name, params) => scalar(
  `select public.${name}(${params.map((_, i) => '$' + (i + 1)).join(',')}) as result`, params);
const asRole = async (role, fn) => {
  await db.exec(`set role ${role}`);
  try { return await fn(); } finally { await db.exec('reset role'); }
};
const rejected = async (fn, code, message) => {
  await assert.rejects(fn, error => error.code === code, message); checks++;
};

try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create schema auth;
    create table auth.users(id uuid primary key);
    insert into auth.users values ('${userA}'), ('${userB}');
  `);
  const migration = await readFile(new URL(
    '../../backend/supabase/migrations/20261101090000_chatgpt_connector.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  check(true, 'The actual migration executes against PostgreSQL');

  const client = await scalar(`insert into public.chatgpt_clients(name,redirect_uris)
    values ('Fixture client',array[$1]::text[]) returning client_id`, [redirect]);
  const otherClient = await scalar(`insert into public.chatgpt_clients(name,redirect_uris)
    values ('Other fixture client',array[$1]::text[]) returning client_id`, [redirect]);

  const makeRequest = async ({ clientId = client, redirectUri = redirect, expired = false } = {}) => scalar(`
    insert into public.chatgpt_requests(client_id,redirect_uri,code_challenge,state,resource,expires_at)
    values ($1,$2,$3,'opaque-state',$4,now() + ($5::text)::interval) returning id`,
  [clientId, redirectUri, challenge, resource, expired ? '-1 second' : '10 minutes']);
  const consent = async (options = {}) => {
    const requestId = await makeRequest(options), codeHash = fresh();
    const result = await asRole('service_role', () => rpc('chatgpt_authorize_request',
      [requestId, options.user || userA, codeHash]));
    check(result.ok, 'Consent succeeds for a live request and an existing member');
    check(result.redirect_uri === redirect && result.state === 'opaque-state', 'Consent preserves exact redirect and state');
    const grantId = await scalar('select grant_id from public.chatgpt_codes where code_hash=$1', [codeHash]);
    return { requestId, codeHash, grantId, clientId: options.clientId || client };
  };
  const exchange = (f, overrides = {}) => asRole('service_role', () => rpc('chatgpt_exchange_code', [
    overrides.codeHash ?? f.codeHash, overrides.clientId ?? f.clientId,
    overrides.redirectUri ?? redirect, overrides.challenge ?? challenge,
    overrides.resource ?? resource, overrides.accessHash ?? fresh(), overrides.refreshHash ?? fresh(),
  ]));
  const issue = async options => {
    const f = await consent(options), accessHash = fresh(), refreshHash = fresh();
    const result = await exchange(f, { accessHash, refreshHash });
    check(result.ok && result.expires_in === 3600, 'Code exchange issues a one-hour access credential');
    assert.deepEqual(result.scope, ['totehm:read']); checks++;
    return { ...f, accessHash, refreshHash };
  };
  const refresh = (f, overrides = {}) => asRole('service_role', () => rpc('chatgpt_refresh', [
    overrides.refreshHash ?? f.refreshHash, overrides.clientId ?? f.clientId,
    overrides.resource ?? resource, overrides.accessHash ?? fresh(), overrides.nextRefreshHash ?? fresh(),
  ]));

  // No general member/anonymous table or function access, even with valid IDs.
  const tableNames = ['clients', 'requests', 'grants', 'codes', 'tokens'].map(x => 'chatgpt_' + x);
  for (const name of tableNames) {
    check(await scalar('select relrowsecurity from pg_catalog.pg_class where oid=$1::regclass', ['public.' + name]), name + ' enables RLS');
    for (const role of ['anon', 'authenticated']) {
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        check(!await scalar('select has_table_privilege($1,$2,$3)', [role, 'public.' + name, privilege]), `${role} has no ${privilege} on ${name}`);
      }
      await rejected(() => asRole(role, () => db.query(`select * from public.${name} limit 0`)), '42501', 'Direct reads are denied');
    }
  }
  const signatures = [
    'chatgpt_redirect_uris_valid(text[])', 'chatgpt_authorize_request(uuid,uuid,text)',
    'chatgpt_exchange_code(text,uuid,text,text,text,text,text)',
    'chatgpt_refresh(text,uuid,text,text,text)', 'chatgpt_revoke(uuid,uuid)',
  ];
  for (const signature of signatures) {
    for (const role of ['anon', 'authenticated', 'service_role']) {
      const allowed = await scalar('select has_function_privilege($1,$2,$3)', [role, 'public.' + signature, 'EXECUTE']);
      check(allowed === (role === 'service_role'), `${signature}: only service_role can execute`);
    }
  }
  await rejected(() => asRole('authenticated', () => rpc('chatgpt_revoke', [userA, null])), '42501', 'Member cannot forge p_user via the service-only RPC');

  // Persisted limits are enforced as well as edge-side input validation.
  await rejected(() => db.query(`insert into public.chatgpt_clients(name,redirect_uris)
    values ('invalid',array[]::text[])`), '23514', 'Empty redirect allowlist rejected');
  await rejected(() => db.query(`insert into public.chatgpt_clients(name,redirect_uris)
    values ('invalid',array_fill('https://x.example.test'::text,array[11]))`), '23514', 'Redirect allowlist is bounded');
  await rejected(() => db.query(`insert into public.chatgpt_clients(name,redirect_uris)
    values ('invalid',array['http://public.example.test/callback'])`), '23514', 'Public HTTP redirects rejected');
  await rejected(() => db.query(`insert into public.chatgpt_requests(client_id,redirect_uri,code_challenge,scope,resource)
    values ($1,$2,$3,array['totehm:read','totehm:write'],$4)`, [client, redirect, challenge, resource]), '23514', 'Write scope cannot be persisted');
  await rejected(() => db.query(`insert into public.chatgpt_requests(client_id,redirect_uri,code_challenge,resource)
    values ($1,$2,'plain-verifier',$3)`, [client, redirect, resource]), '23514', 'Only S256-shaped challenges persist');
  await rejected(() => db.query(`insert into public.chatgpt_requests(client_id,redirect_uri,code_challenge,state,resource)
    values ($1,$2,$3,repeat('s',2049),$4)`, [client, redirect, challenge, resource]), '23514', 'State length bounded');

  const expiredRequest = await makeRequest({ expired: true });
  check(!(await rpc('chatgpt_authorize_request', [expiredRequest, userA, fresh()])).ok, 'Expired request cannot be consented');
  const badRedirectRequest = await makeRequest({ redirectUri: 'https://attacker.example.test/callback' });
  check(!(await rpc('chatgpt_authorize_request', [badRedirectRequest, userA, fresh()])).ok, 'Consent rechecks registered redirect');
  const normal = await consent();
  check(!(await rpc('chatgpt_authorize_request', [normal.requestId, userA, fresh()])).ok, 'Authorization request can only be used once');
  check(await scalar('select count(*)::int from public.chatgpt_codes where request_id=$1', [normal.requestId]) === 1, 'Only one authorization code exists per request');

  for (const override of [
    { codeHash: fresh() }, { clientId: otherClient }, { redirectUri: redirect + '?changed=1' },
    { challenge: 'B'.repeat(43) }, { resource: resource + '/other' },
  ]) {
    check(!(await exchange(normal, override)).ok, 'Wrong code/client/redirect/PKCE/resource is rejected');
    check(await scalar('select consumed_at is null from public.chatgpt_codes where code_hash=$1', [normal.codeHash]), 'Failed validation leaves code unconsumed');
    check(await scalar('select count(*)::int from public.chatgpt_tokens where grant_id=$1', [normal.grantId]) === 0, 'Failed validation issues no token');
  }
  const sameHash = fresh();
  check(!(await exchange(normal, { accessHash: sameHash, refreshHash: sameHash })).ok, 'Access and refresh credentials cannot be identical');
  const firstExchange = await exchange(normal);
  check(firstExchange.ok, 'Correct exchange still works after rejected attempts');
  check(!(await exchange(normal, { challenge: 'B'.repeat(43) })).ok, 'Wrong PKCE after exchange remains invalid');
  check(await scalar('select revoked_at is null from public.chatgpt_grants where id=$1', [normal.grantId]), 'Wrong PKCE cannot revoke an issued grant');
  check(!(await exchange(normal)).ok, 'Second code exchange fails');
  check(await scalar('select revoked_at is not null from public.chatgpt_grants where id=$1', [normal.grantId]), 'A correctly bound code replay revokes previously issued credentials');
  check(await scalar('select count(*)::int from public.chatgpt_tokens where grant_id=$1', [normal.grantId]) === 2, 'One code issues exactly one access/refresh pair');

  // Concurrent callers queue in this embedded engine. This verifies double-use
  // behavior, not independent PostgreSQL backend/process contention.
  const parallel = await consent();
  const parallelResults = await Promise.all([exchange(parallel), exchange(parallel)]);
  check(parallelResults.filter(r => r.ok).length === 1, 'Two queued exchanges produce one successful issuance');
  check(await scalar('select count(*)::int from public.chatgpt_tokens where grant_id=$1', [parallel.grantId]) === 2, 'Queued exchanges cannot produce two pairs');

  const expiredCode = await consent();
  await db.query('update public.chatgpt_codes set expires_at=now()-interval \'1 second\' where code_hash=$1', [expiredCode.codeHash]);
  check(!(await exchange(expiredCode)).ok, 'Expired code cannot be exchanged');

  const family = await issue();
  const tokenTimes = await rows(`select kind,expires_at > now() as live,
    round(extract(epoch from (expires_at-now())))::int as seconds
    from public.chatgpt_tokens where grant_id=$1 order by kind`, [family.grantId]);
  check(tokenTimes.every(t => t.live), 'Issued tokens are live');
  check(tokenTimes.find(t => t.kind === 'access').seconds <= 3600 && tokenTimes.find(t => t.kind === 'access').seconds > 3500, 'Access expiry is one hour');
  check(tokenTimes.find(t => t.kind === 'refresh').seconds <= 2592000 && tokenTimes.find(t => t.kind === 'refresh').seconds > 2591900, 'Refresh expiry is thirty days');
  check(!(await refresh(family, { clientId: otherClient })).ok, 'Refresh is bound to the client');
  check(!(await refresh(family, { resource: resource + '/wrong' })).ok, 'Refresh is bound to the resource');
  check(!(await refresh(family, { refreshHash: family.accessHash })).ok, 'An access token cannot be used as a refresh token');
  check(await scalar('select used_at is null from public.chatgpt_tokens where token_hash=$1', [family.refreshHash]), 'Rejected refresh leaves token unused');
  const nextRefreshHash = fresh(), nextAccessHash = fresh();
  check((await refresh(family, { nextRefreshHash, accessHash: nextAccessHash })).ok, 'Valid refresh rotates the pair');
  check(await scalar('select used_at is not null from public.chatgpt_tokens where token_hash=$1', [family.refreshHash]), 'Used refresh is retained with its consumed marker');
  check(await scalar('select count(*)::int from public.chatgpt_tokens where grant_id=$1', [family.grantId]) === 4, 'Rotation creates a new pair without erasing replay evidence');
  check(!(await refresh(family)).ok, 'Consumed refresh replay is rejected');
  check(await scalar('select revoked_at is not null from public.chatgpt_grants where id=$1', [family.grantId]), 'Replay revokes the whole grant');
  check(!(await refresh(family, { refreshHash: nextRefreshHash })).ok, 'A rotated refresh cannot revive a replay-revoked family');
  check(!await scalar(`select exists(select 1 from public.chatgpt_tokens t join public.chatgpt_grants g on g.id=t.grant_id
    where t.token_hash=$1 and t.kind='access' and t.expires_at>now() and t.used_at is null and g.revoked_at is null)`, [nextAccessHash]), 'Grant revocation invalidates the newer access token at resolution');

  const expiring = await issue();
  await db.query('update public.chatgpt_tokens set expires_at=now()-interval \'1 second\' where token_hash=$1', [expiring.refreshHash]);
  check(!(await refresh(expiring)).ok, 'Expired refresh is rejected');
  const wrongResourceGrant = await issue();
  const validNextHash = fresh();
  check((await refresh(wrongResourceGrant, { nextRefreshHash: validNextHash })).ok, 'Second family rotates');
  check(!(await refresh(wrongResourceGrant, { resource: resource + '/wrong' })).ok, 'Wrong-audience replay is rejected');
  check(await scalar('select revoked_at is null from public.chatgpt_grants where id=$1', [wrongResourceGrant.grantId]), 'Wrong client/resource cannot trigger replay-family revocation');

  const ownClient = await issue({ user: userA }), ownOtherClient = await issue({ user: userA, clientId: otherClient });
  const otherMember = await issue({ user: userB });
  const revoked = await asRole('service_role', () => rpc('chatgpt_revoke', [userA, client]));
  check(revoked.ok && revoked.count >= 1, 'Service revocation reports affected grants');
  check(await scalar('select revoked_at is not null from public.chatgpt_grants where id=$1', [ownClient.grantId]), 'Selected own-client grant is revoked');
  check(await scalar('select revoked_at is null from public.chatgpt_grants where id=$1', [ownOtherClient.grantId]), 'Client-filtered revocation leaves the other client intact');
  check(await scalar('select revoked_at is null from public.chatgpt_grants where id=$1', [otherMember.grantId]), 'Revocation cannot affect another member');
  check(!(await refresh(ownClient)).ok, 'Revoked grant cannot refresh');
  const allOwn = await asRole('service_role', () => scalar('select public.chatgpt_revoke($1::uuid)', [userA]));
  check(allOwn.ok, 'Optional client parameter revokes all own clients');
  check(await scalar('select revoked_at is not null from public.chatgpt_grants where id=$1', [ownOtherClient.grantId]), 'All-client revoke reaches own other-client grant');
  check(await scalar('select revoked_at is null from public.chatgpt_grants where id=$1', [otherMember.grantId]), 'All-client revoke still preserves the other member');
  check(!(await rpc('chatgpt_revoke', [null, null])).ok, 'Null user cannot revoke grants');

  // Prove service access with RLS enabled and without BYPASSRLS on the fixture role.
  check(await asRole('service_role', () => scalar('select count(*)::int from public.chatgpt_clients')) === 2, 'Service policy permits RLS-backed access without BYPASSRLS');
  await db.query('delete from auth.users where id=$1', [userB]);
  check(await scalar('select count(*)::int from public.chatgpt_grants where id=$1', [otherMember.grantId]) === 0, 'Deleting a member cascades to grants');
  check(await scalar('select count(*)::int from public.chatgpt_tokens where grant_id=$1', [otherMember.grantId]) === 0, 'Deleting a member cascades to tokens');

  console.log(JSON.stringify({ passed: checks, failed: 0, engine: 'PGlite PostgreSQL',
    scope: 'Real migration; isolated schema; no remote services',
    limitation: 'Embedded calls are queued; independent PostgreSQL process contention is not tested.' }));
} finally {
  await db.close();
}
