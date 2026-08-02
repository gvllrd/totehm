// ═══════════════════════════════════════════════════════════════
// TOTEHM · stoner-gate
// L'unique porte des steps 7 -> 10.
// L'email vient du JWT, JAMAIS du client.
// verify_jwt = true
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "stoner-method";   // passé en NON PUBLIC le 01/08/2026
                                  // (stoner-deep supprimé — plus simple, même résultat)
const TTL_SECONDS = 900; // 15 min

// Tout est derrière le mur, step 0 compris.
const DEEP_STEPS: Record<string, string> = {
  "0": "step_0_know_yourself.mp4",
  "1": "step_1_repulsion.mp4",
  "2": "step_2_breath.mp4",
  "3": "step_3_amplify_breath.mp4",
  "4": "step_4_fully_aware.mp4",
  "5": "step_5_determination.mp4",
  "6": "step_6_make_it_Happen.mp4",
  "7": "step_7_step_by_step.mp4",
  "8": "step_8_love_the_process.mp4",
  "9": "step_9_express.mp4",
  "10": "step_10_Time.mp4",
};

const ALLOWED_ORIGINS = [
  "https://www.totehm.space",
  "https://totehm.space",
  "http://localhost:3000",
];

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ access: false, reason: "no_session" }, 200);

  // 1. Identifier l'utilisateur PAR SON JWT
  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authErr } = await asUser.auth.getUser();
  if (authErr || !user?.email) {
    return json({ access: false, reason: "no_session" }, 200);
  }

  const email = user.email.trim().toLowerCase();

  // 2. Lire la porte avec le service_role
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: grant, error: dbErr } = await admin
    .from("stoner_access")
    .select("source, granted_at")
    .eq("email", email)
    .maybeSingle();

  if (dbErr) {
    console.error("lecture stoner_access:", dbErr.message);
    return json({ access: false, reason: "error" }, 500);
  }

  if (!grant) {
    return json({ access: false, reason: "locked" }, 200);
  }

  // 3. Signer les URLs, courte durée
  const urls: Record<string, string> = {};
  for (const [step, file] of Object.entries(DEEP_STEPS)) {
    const { data: signed, error: sErr } = await admin
      .storage
      .from(BUCKET)
      .createSignedUrl(file, TTL_SECONDS);
    if (sErr) {
      console.error(`signature ${file}:`, sErr.message);
      continue;
    }
    if (signed?.signedUrl) urls[step] = signed.signedUrl;
  }

  return json({
    access: true,
    source: grant.source,
    expires_in: TTL_SECONDS,
    urls,
  }, 200);
});
