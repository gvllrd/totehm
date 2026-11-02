// Dedicated connector protocol boundaries. No credentials, database or network.
// Run: node --test tests/fn/chatgpt-protocol.mjs (Node 24 strips TS types).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ProtocolError, READ_SCOPE, normalizeEndpoints, authorizationServerMetadata,
  protectedResourceMetadata, parseRedirectAllowlist, validateRegistration,
  validateRedirectUri, validateAuthorization, validateTokenRequest,
  bearerToken, validateOrigin, randomOpaque, hashOpaque, verifyPkce, parseJsonRpc,
  DEFAULT_CHATGPT_REDIRECT_URIS, configuredRedirectUris,
} from '../../backend/supabase/functions/_shared/chatgpt-protocol.ts';

const endpoints = normalizeEndpoints('https://www.totehm.com');
const redirect = 'https://client.example.test/oauth/callback';
const client = { client_id: 'test-client', redirect_uris: [redirect], scope: READ_SCOPE };
const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const authorization = () => new URLSearchParams({
  response_type: 'code', client_id: client.client_id, redirect_uri: redirect,
  resource: endpoints.resource, code_challenge: challenge,
  code_challenge_method: 'S256', state: 'client-csrf-state',
});
const tokenRequest = () => new URLSearchParams({
  grant_type: 'authorization_code', client_id: client.client_id, code: 'opaque-code',
  redirect_uri: redirect, resource: endpoints.resource, code_verifier: verifier,
});
const rejects = (fn, code) => assert.throws(fn, (error) => error instanceof ProtocolError && (!code || error.code === code));

test('RFC 9207 stable ChatGPT callback is exact; legacy guessed paths and URI drift are rejected', () => {
  const uri='https://chatgpt.com/connector_platform_oauth_redirect';
  assert.deepEqual(configuredRedirectUris(undefined), [uri]);
  assert.deepEqual([...DEFAULT_CHATGPT_REDIRECT_URIS], [uri]);
  assert.deepEqual(validateRegistration({redirect_uris:[uri]},configuredRedirectUris(undefined)).redirect_uris,[uri]);
  for(const other of [uri+'/',uri+'?return_to=https://evil.test',uri+'#fragment',
    'https://chatgpt.com.evil.test/connector_platform_oauth_redirect',
    'https://chatgpt.com/connector_platform/oauth/redirect',
    'https://chatgpt.com/connector_platform/oauth_redirect',
    'https://chatgpt.com/connector/oauth/unregistered-callback-id']) {
    rejects(()=>validateRegistration({redirect_uris:[other]},configuredRedirectUris(undefined)));
  }
  assert.deepEqual(configuredRedirectUris(''), []);
  assert.deepEqual(configuredRedirectUris(redirect), [redirect]);
});

test('discovery advertises dedicated read-only credentials; callback admission fails closed', () => {
  const as = authorizationServerMetadata(endpoints), resource = protectedResourceMetadata(endpoints);
  assert.equal(as.authorization_response_iss_parameter_supported, true);
  assert.equal(as.issuer, 'https://www.totehm.com');
  assert.equal(as.issuer, resource.authorization_servers[0]);
  assert.equal(resource.resource, 'https://www.totehm.com/mcp');
  assert.deepEqual(resource.authorization_servers, ['https://www.totehm.com']);
  assert.deepEqual(as.token_endpoint_auth_methods_supported, ['none']);
  assert.deepEqual(as.code_challenge_methods_supported, ['S256']);
  assert.deepEqual(as.scopes_supported, ['totehm:read']);
  assert.deepEqual(parseRedirectAllowlist(undefined), []);
  rejects(() => validateRegistration({ redirect_uris: [redirect] }, []), 'invalid_redirect_uri');
  assert.deepEqual(parseRedirectAllowlist(`${redirect}\n${redirect}`), [redirect]);
});

test('DCR rejects phishing callbacks, exact-URI drift, implicit grants and confidential credentials', () => {
  const registered = validateRegistration({ redirect_uris: [redirect] }, [redirect]);
  assert.deepEqual(registered.redirect_uris, [redirect]);
  for (const uri of [
    'http://client.example.test/oauth/callback',
    'https://client.example.test.evil.test/oauth/callback',
    'https://client.example.test@evil.test/oauth/callback',
    redirect + '#fragment', redirect + '?next=https://evil.test',
    'https://client.example.test/oauth/callback/',
  ]) rejects(() => validateRedirectUri(uri, [redirect]));
  rejects(() => validateRegistration({ redirect_uris: [redirect], grant_types: ['client_credentials'] }, [redirect]));
  rejects(() => validateRegistration({ redirect_uris: [redirect], response_types: ['token'] }, [redirect]));
  rejects(() => validateRegistration({ redirect_uris: [redirect], token_endpoint_auth_method: 'client_secret_post' }, [redirect]));
  rejects(() => validateRegistration({ redirect_uris: [redirect], scope: 'totehm:write' }, [redirect]), 'invalid_scope');
});

test('authorization binds client, redirect, audience, scope, state and S256 without parameter pollution', () => {
  assert.equal(validateAuthorization(authorization(), client, endpoints.resource).state, 'client-csrf-state');
  for (const [field, value] of [
    ['client_id', 'different-client'], ['redirect_uri', 'https://evil.test/callback'],
    ['resource', 'https://different.test/mcp'], ['scope', 'totehm:read totehm:write'],
    ['code_challenge_method', 'plain'], ['code_challenge', 'not-a-sha256-challenge'],
    ['response_type', 'token'],
  ]) {
    const params = authorization(); params.set(field, value);
    rejects(() => validateAuthorization(params, client, endpoints.resource));
  }
  for (const field of ['client_id', 'redirect_uri', 'resource', 'code_challenge', 'state']) {
    const params = authorization(); params.append(field, params.get(field));
    rejects(() => validateAuthorization(params, client, endpoints.resource));
  }
  const missingState = authorization(); missingState.delete('state');
  rejects(() => validateAuthorization(missingState, client, endpoints.resource));
});

test('token requests cannot replace resource, omit PKCE, add write scopes or use a client secret', () => {
  assert.equal(validateTokenRequest(tokenRequest(), endpoints.resource).grant_type, 'authorization_code');
  const missingVerifier = tokenRequest(); missingVerifier.delete('code_verifier');
  rejects(() => validateTokenRequest(missingVerifier, endpoints.resource));
  const shortVerifier = tokenRequest(); shortVerifier.set('code_verifier', 'short');
  rejects(() => validateTokenRequest(shortVerifier, endpoints.resource), 'invalid_grant');
  const secret = tokenRequest(); secret.set('client_secret', 'unexpected');
  rejects(() => validateTokenRequest(secret, endpoints.resource), 'invalid_client');
  const wrongResource = tokenRequest(); wrongResource.set('resource', 'https://different.test/mcp');
  rejects(() => validateTokenRequest(wrongResource, endpoints.resource), 'invalid_target');
  const refresh = new URLSearchParams({ grant_type: 'refresh_token', client_id: client.client_id, resource: endpoints.resource, refresh_token: 'opaque-refresh', scope: 'totehm:write' });
  rejects(() => validateTokenRequest(refresh, endpoints.resource), 'invalid_scope');
  refresh.set('scope', READ_SCOPE);
  assert.equal(validateTokenRequest(refresh, endpoints.resource).refresh_token, 'opaque-refresh');
});

test('PKCE uses the RFC 7636 S256 vector and rejects mismatched or invalid verifiers', async () => {
  assert.equal(await verifyPkce(verifier, challenge), true);
  assert.equal(await verifyPkce(verifier + 'a', challenge), false);
  assert.equal(await verifyPkce('short', challenge), false);
  assert.equal(await verifyPkce(verifier, 'invalid'), false);
  assert.equal(await hashOpaque('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const token = randomOpaque('th_access_');
  assert.match(token, /^th_access_[A-Za-z0-9_-]{43}$/);
  assert.notEqual(token, randomOpaque('th_access_'));
  assert.match(await hashOpaque(token), /^[0-9a-f]{64}$/);
  assert.notEqual(await hashOpaque(token), token);
});

test('browser origin and bearer credentials are validated independently', () => {
  validateOrigin(new Headers(), []); // Native MCP clients need not send Origin.
  validateOrigin(new Headers({ origin: endpoints.issuer }), [endpoints.issuer]);
  rejects(() => validateOrigin(new Headers({ origin: 'https://evil.test' }), [endpoints.issuer]), 'invalid_origin');
  rejects(() => validateOrigin(new Headers({ origin: endpoints.issuer + '.evil.test' }), [endpoints.issuer]), 'invalid_origin');
  assert.equal(bearerToken(new Headers()), null);
  const token = randomOpaque('th_access_');
  assert.equal(bearerToken(new Headers({ authorization: `Bearer ${token}` })), token);
  rejects(() => bearerToken(new Headers({ authorization: `Bearer ${token}, Bearer ${token}` })), 'invalid_token');
  rejects(() => bearerToken(new Headers({ authorization: `Basic ${token}` })), 'invalid_token');
});

test('MCP parses one request/notification and rejects batches or malformed tool envelopes', () => {
  assert.equal(parseJsonRpc({ jsonrpc: '2.0', id: 0, method: 'initialize' }).id, 0);
  assert.equal(parseJsonRpc({ jsonrpc: '2.0', method: 'notifications/initialized' }).id, undefined);
  for (const value of [
    [{ jsonrpc: '2.0', id: 1, method: 'ping' }],
    { jsonrpc: '2.0', id: null, method: 'ping' },
    { jsonrpc: '2.0', id: {}, method: 'ping' },
    { jsonrpc: '2.0', id: 1, result: {} },
    { jsonrpc: '2.0', id: 1, method: 'tools/call', params: [] },
    { jsonrpc: '1.0', id: 1, method: 'tools/call', params: {} },
  ]) rejects(() => parseJsonRpc(value), 'invalid_jsonrpc');
});
