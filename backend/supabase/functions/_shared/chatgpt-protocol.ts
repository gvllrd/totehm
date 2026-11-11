import { HIGHER_GPT } from './higher-gpt.ts';

// Dedicated ChatGPT OAuth/MCP protocol helpers. No database or session access.
// MCP 2025-06-18: authorization (RFC 9728/8414/8707), Streamable HTTP.
// https://github.com/modelcontextprotocol/modelcontextprotocol/tree/main/docs/specification/2025-06-18/basic
// OAuth tokens here MUST be dedicated opaque credentials, never Supabase sessions.

export const MCP_PROTOCOL_VERSION = "2025-06-18";
export const READ_SCOPE = "totehm:read";
export const SUPPORTED_SCOPES = [READ_SCOPE] as const;

// Stable ChatGPT MCP callback for authorization servers implementing RFC 9207.
// https://developers.openai.com/plugins/build/auth#redirect-url
// The server advertises issuer identification below and MUST include the exact
// issuer in every successful/error authorization response. No URI wildcards.
// A reviewed deployment override may replace the exact list if needed.
export const DEFAULT_CHATGPT_REDIRECT_URIS = [
  "https://chatgpt.com/connector_platform_oauth_redirect",
] as const;

export class ProtocolError extends Error {
  code: string;
  status: number;
  constructor(code: string, message = code, status = 400) {
    super(message); this.name = "ProtocolError"; this.code = code; this.status = status;
  }
}

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fail(code = "invalid_request", message = code): never {
  throw new ProtocolError(code, message);
}

function text(v: unknown, max = 2048): string {
  if (typeof v !== "string" || !v.length || v.length > max || /[\u0000-\u001f\u007f]/.test(v)) fail();
  return v;
}

/** Production HTTPS only; no credentials, fragments, or silent normalization. */
export function httpsUrl(value: unknown): URL {
  const raw = text(value);
  let u: URL;
  try { u = new URL(raw); } catch { return fail("invalid_request", "Invalid HTTPS URL"); }
  if (u.protocol !== "https:" || u.username || u.password || u.hash || u.href !== raw) {
    fail("invalid_request", "An exact HTTPS URL is required");
  }
  return u;
}

export function normalizeEndpoints(publicOrigin: string) {
  const origin = publicOrigin.endsWith("/") ? publicOrigin.slice(0, -1) : publicOrigin;
  const u = httpsUrl(origin + "/");
  if (u.origin !== origin || u.pathname !== "/" || u.search) fail("invalid_request", "Invalid public origin");
  return {
    issuer: origin,
    resource: origin + "/mcp",
    authorize: origin + "/chatgpt-api/authorize",
    token: origin + "/chatgpt-api/token",
    register: origin + "/chatgpt-api/register",
    revoke: origin + "/chatgpt-api/revoke",
    resourceMetadata: origin + "/.well-known/oauth-protected-resource/mcp",
    authorizationMetadata: origin + "/.well-known/oauth-authorization-server",
  };
}

export type Endpoints = ReturnType<typeof normalizeEndpoints>;

export function authorizationServerMetadata(e: Endpoints) {
  return {
    issuer: e.issuer,
    authorization_response_iss_parameter_supported: true,
    authorization_endpoint: e.authorize,
    token_endpoint: e.token,
    registration_endpoint: e.register,
    revocation_endpoint: e.revoke,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    revocation_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [...SUPPORTED_SCOPES],
  };
}

export function protectedResourceMetadata(e: Endpoints) {
  return {
    resource: e.resource,
    authorization_servers: [e.issuer],
    scopes_supported: [...SUPPORTED_SCOPES],
    bearer_methods_supported: ["header"],
    resource_name: "TOTEHM — selected personal context, read only",
  };
}

export function authenticationChallenge(e: Endpoints, error?: "invalid_token" | "insufficient_scope") {
  return `Bearer resource_metadata="${e.resourceMetadata}", scope="${READ_SCOPE}"`
    + (error ? `, error="${error}"` : "");
}

/** Parse exact configured URI values; an empty override disables registration.
 * A hostname match is insufficient. Never accept a request-supplied allowlist.
 */
export function parseRedirectAllowlist(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  const values = value.split(/[\s,]+/).filter(Boolean);
  if (values.length > 20) fail("invalid_request", "Too many redirect URIs");
  for (const uri of values) httpsUrl(uri);
  return [...new Set(values)];
}

/** The deployment needs no manually supplied callback for the standard client.
 * An explicitly empty override still fails closed.
 */
export function configuredRedirectUris(value: string | undefined): string[] {
  return parseRedirectAllowlist(value ?? DEFAULT_CHATGPT_REDIRECT_URIS.join(","));
}

export function validateRedirectUri(value: unknown, allowed: readonly string[]): string {
  const uri = text(value);
  httpsUrl(uri);
  if (!allowed.includes(uri)) fail("invalid_redirect_uri", "Redirect URI is not registered");
  return uri;
}

export function validateScope(value: unknown = READ_SCOPE): string {
  if (typeof value !== "string" || value !== READ_SCOPE) fail("invalid_scope");
  return READ_SCOPE;
}

export type RegisteredClient = { client_id: string; redirect_uris: string[]; scope?: string; client_name?: string };

/** DCR public clients only. Returned metadata must be stored server-side.
 * The runtime generates client_id; never take one from a registration request.
 */
export function validateRegistration(body: unknown, allowed: readonly string[]) {
  if (!isObject(body)) fail("invalid_client_metadata");
  const redirects = body.redirect_uris;
  if (!Array.isArray(redirects) || redirects.length < 1 || redirects.length > 5) fail("invalid_client_metadata");
  const redirectUris = redirects.map((v) => validateRedirectUri(v, allowed));
  if (new Set(redirectUris).size !== redirectUris.length) fail("invalid_client_metadata");
  if (body.token_endpoint_auth_method != null && body.token_endpoint_auth_method !== "none") fail("invalid_client_metadata");
  if (body.grant_types != null && (!Array.isArray(body.grant_types)
    || !body.grant_types.length || body.grant_types.some((v) => !["authorization_code", "refresh_token"].includes(String(v)))
    || !body.grant_types.includes("authorization_code"))) fail("invalid_client_metadata");
  if (body.response_types != null && (!Array.isArray(body.response_types)
    || body.response_types.length !== 1 || body.response_types[0] !== "code")) fail("invalid_client_metadata");
  return {
    redirect_uris: redirectUris,
    client_name: body.client_name == null ? "ChatGPT" : text(body.client_name, 80),
    token_endpoint_auth_method: "none" as const,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: validateScope(body.scope ?? READ_SCOPE),
  };
}

function one(params: URLSearchParams, name: string, required = true): string | null {
  const values = params.getAll(name);
  if (values.length > 1 || (required && values.length !== 1)) fail();
  return values.length ? text(values[0], name === "state" ? 2048 : 8192) : null;
}

export function validateAuthorization(params: URLSearchParams, client: RegisteredClient, resource: string) {
  if (one(params, "client_id") !== client.client_id) fail("invalid_client");
  // Never redirect an authorization error until this exact registered URI is validated.
  const redirectUri = validateRedirectUri(one(params, "redirect_uri"), client.redirect_uris);
  if (one(params, "response_type") !== "code") fail("unsupported_response_type");
  if (one(params, "resource") !== resource) fail("invalid_target");
  if (one(params, "code_challenge_method") !== "S256") fail("invalid_request", "PKCE S256 is required");
  const challenge = one(params, "code_challenge")!;
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) fail("invalid_request", "Invalid S256 challenge");
  const scope = validateScope(one(params, "scope", false) ?? READ_SCOPE);
  if (client.scope != null && client.scope !== scope) fail("invalid_scope");
  return {
    client_id: client.client_id, redirect_uri: redirectUri,
    resource, scope, state: one(params, "state")!,
    code_challenge: challenge, code_challenge_method: "S256" as const,
  };
}

export function validateTokenRequest(params: URLSearchParams, resource: string) {
  if (one(params, "resource") !== resource) fail("invalid_target");
  if (one(params, "client_secret", false) !== null) fail("invalid_client");
  const clientId = one(params, "client_id")!;
  const grantType = one(params, "grant_type");
  if (grantType === "authorization_code") {
    const verifier = one(params, "code_verifier")!;
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) fail("invalid_grant");
    const redirectUri = one(params, "redirect_uri")!;
    httpsUrl(redirectUri);
    return { grant_type: "authorization_code" as const, client_id: clientId, resource,
      code: one(params, "code")!, redirect_uri: redirectUri, code_verifier: verifier };
  }
  if (grantType === "refresh_token") {
    const scope = one(params, "scope", false);
    if (scope !== null) validateScope(scope);
    return { grant_type: "refresh_token" as const, client_id: clientId, resource, refresh_token: one(params, "refresh_token")! };
  }
  return fail("unsupported_grant_type");
}

export function bearerToken(headers: Headers): string | null {
  const value = headers.get("authorization");
  if (!value) return null;
  const match = /^Bearer ([A-Za-z0-9._~-]{20,8192})$/i.exec(value);
  if (!match) throw new ProtocolError("invalid_token", "Invalid bearer credential", 401);
  return match[1];
}

/** An absent Origin is normal for non-browser MCP clients. Present origins
 * must match trusted configured origins exactly; CORS is not authentication.
 */
export function validateOrigin(headers: Headers, allowed: readonly string[]): void {
  const origin = headers.get("origin");
  if (origin !== null && !allowed.includes(origin)) throw new ProtocolError("invalid_origin", "Origin is not allowed", 403);
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomOpaque(prefix = ""): string {
  if (!/^[A-Za-z0-9_-]{0,24}$/.test(prefix)) fail();
  return prefix + base64url(crypto.getRandomValues(new Uint8Array(32)));
}

/** Store this digest only, never the raw code/access token/refresh token. */
export async function hashOpaque(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text(value, 8192)));
  return [...new Uint8Array(bytes)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPkce(verifier: string, challenge: string): Promise<boolean> {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return constantTimeEqual(base64url(new Uint8Array(digest)), challenge);
}

export type JsonRpcId = string | number;
export type JsonRpcMessage = { jsonrpc: "2.0"; id?: JsonRpcId; method: string; params?: Record<string, unknown> };

/** MCP 2025-06-18 accepts one JSON-RPC message, not a batch. */
export function parseJsonRpc(value: unknown): JsonRpcMessage {
  if (!isObject(value) || value.jsonrpc !== "2.0" || typeof value.method !== "string"
    || !value.method.length || value.method.length > 100
    || ("id" in value && !(typeof value.id === "string" || (typeof value.id === "number" && Number.isSafeInteger(value.id))))
    || (value.params !== undefined && !isObject(value.params))) {
    throw new ProtocolError("invalid_jsonrpc", "Invalid JSON-RPC message");
  }
  return value as JsonRpcMessage;
}

export function jsonRpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

export function jsonRpcError(id: JsonRpcId | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

export function initializeResult() {
  return {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: "totehm", version: "1.6.0" },
    instructions: HIGHER_GPT,
  };
}
