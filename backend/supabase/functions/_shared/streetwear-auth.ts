import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

/** Accept backend keys, including named sb_secret keys, without decoding JWT claims. */
export async function streetwearServiceRequest(req: Request): Promise<boolean> {
  const key = req.headers.get('apikey') || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i,'');
  if (!key) return false;
  if (key === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) return true;
  try {
    const named = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    if (Object.values(named).some(value => typeof value === 'string' && value === key)) return true;
  } catch { /* older projects do not expose named keys */ }
  const headers: Record<string,string> = { apikey:key,'Content-Type':'application/json' };
  if (!key.startsWith('sb_')) headers.Authorization='Bearer '+key;
  try {
    const response = await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/streetwear_service_ready',{
      method:'POST',headers,body:'{}',signal:AbortSignal.timeout(5000),
    });
    return response.ok && await response.json() === true;
  } catch { return false; }
}

export function streetwearAdmin() {
  return createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
    auth:{persistSession:false},
  });
}
