// Public gateway for MCP and dedicated OAuth. JWT verification is performed in
// the handler; deploy with --no-verify-jwt because discovery/DCR are public.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createConnectorHandler } from '../_shared/chatgpt-server.ts';
import { configuredRedirectUris } from '../_shared/chatgpt-protocol.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createConnectorHandler(db,{
 publicOrigin:Deno.env.get('CHATGPT_PUBLIC_ORIGIN')||'https://www.totehm.com',
 allowedRedirectUris:configuredRedirectUris(Deno.env.get('CHATGPT_REDIRECT_URIS')),
 enabled:Deno.env.get('CHATGPT_CONNECTOR_ENABLED')==='true',
}));
