// TOTEHM · health — l'état du serveur, pour l'OPÉRATEUR seul. 16/11/2026 (lancement).
// ═══════════════════════════════════════════════════════════════════════
// why : le 15/11 `creator-subscribe` a répondu 502 — « Expired API Key » — et rien ne le disait avant
//       qu'un membre essaie de payer. Une clé qui expire, un webhook désactivé, un secret oublié :
//       ça se MESURE avant le lancement, pas dans le journal d'un paiement raté.
// how : `select public.edge_call('health', '{}'::jsonb);` pose un jeton à usage unique (`edge_tokens`,
//       deux minutes) et appelle cette fonction ; la réponse se lit dans `net._http_response`.
//       Sans ce jeton : 403. Aucune page ne l'appelle, aucun membre ne peut la déclencher.
// ⚠️ JAMAIS UNE VALEUR DE SECRET. Des PRÉSENCES (booléens), et ce que Stripe et Telegram répondent à NOS
//    clés : un code d'erreur, un état de compte, la liste des événements du webhook (ni clé ni signature).
// ═══════════════════════════════════════════════════════════════════════
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } });
const has = (k: string) => !!(Deno.env.get(k) ?? "").trim();
const WEBHOOK = Deno.env.get("SUPABASE_URL")! + "/functions/v1/stripe-webhook";
/** Ce que `stripe-webhook` sait traiter : le webhook live doit les envoyer tous les cinq. */
const VOULUS = ["checkout.session.completed", "invoice.paid", "invoice.payment_failed", "customer.subscription.updated", "customer.subscription.deleted"];

async function stripe(key: string | undefined, path: string) {
  if (!key) return { ok: false, status: 0, code: "missing", body: null as any };
  try {
    const r = await fetch("https://api.stripe.com/v1/" + path, { headers: { Authorization: "Bearer " + key } });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, code: r.ok ? null : String(j?.error?.code ?? j?.error?.type ?? "error"), body: r.ok ? j : null };
  } catch { return { ok: false, status: 0, code: "unreachable", body: null as any }; }
}
async function cote(key: string | undefined) {
  const bal = await stripe(key, "balance");
  if (!bal.ok) return { key_ok: false, status: bal.status, code: bal.code };
  const [acct, wh] = await Promise.all([stripe(key, "account"), stripe(key, "webhook_endpoints?limit=30")]);
  const hooks = (wh.body?.data ?? []).map((w: any) => ({
    ours: w.url === WEBHOOK, status: w.status, host: (() => { try { return new URL(w.url).host; } catch { return "?"; } })(),
    events: w.enabled_events, missing: VOULUS.filter((e) => !(w.enabled_events ?? []).includes(e) && !(w.enabled_events ?? []).includes("*")),
  }));
  const ours = hooks.filter((h: any) => h.ours && h.status === "enabled");
  return {
    key_ok: true, livemode: bal.body?.livemode === true,
    account: acct.ok ? { charges_enabled: acct.body?.charges_enabled === true, payouts_enabled: acct.body?.payouts_enabled === true,
      details_submitted: acct.body?.details_submitted === true, country: acct.body?.country ?? null, currency: acct.body?.default_currency ?? null }
      : { readable: false, code: acct.code },
    webhooks_readable: wh.ok, webhooks_code: wh.ok ? null : wh.code, webhooks: hooks,
    webhook_ready: ours.length === 1 && ours[0].missing.length === 0, webhook_enabled_count: ours.length,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const token = req.headers.get("x-tick-token") ?? "";
  if (!token || token.length > 256) return new Response("forbidden", { status: 403 });
  const { data: ok, error } = await admin.rpc("edge_token_consume", { p_token: token, p_purpose: "health" });
  if (error || ok !== true) return new Response("forbidden", { status: 403 });

  const [live, test] = await Promise.all([cote(Deno.env.get("STRIPE_SECRET_KEY")), cote(Deno.env.get("STRIPE_TEST_SECRET_KEY"))]);
  let telegram: Record<string, unknown> = { token_set: has("TELEGRAM_BOT_TOKEN"), webhook_secret_set: has("TELEGRAM_WEBHOOK_SECRET") };
  if (has("TELEGRAM_BOT_TOKEN")) {
    try {
      const t = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
      const [me, wh] = await Promise.all([
        fetch(`https://api.telegram.org/bot${t}/getMe`).then((r) => r.json()),
        fetch(`https://api.telegram.org/bot${t}/getWebhookInfo`).then((r) => r.json()),
      ]);
      telegram = { ...telegram, token_valid: me?.ok === true, bot: String(me?.result?.username ?? ""),
        webhook_correct: wh?.result?.url === Deno.env.get("SUPABASE_URL")! + "/functions/v1/bot-reply",
        pending_updates: Number(wh?.result?.pending_update_count) || 0, last_error: wh?.result?.last_error_message ? true : false };
    } catch { telegram = { ...telegram, reachable: false }; }
  }
  return Response.json({
    at: new Date().toISOString(),
    stripe: { live, test, webhook_secret_set: has("STRIPE_WEBHOOK_SECRET"), test_webhook_secret_set: has("STRIPE_TEST_WEBHOOK_SECRET") },
    telegram,
    // Bunny : une seule clé suffit (`_shared/bunny.ts` retrouve sa bibliothèque, son jeton et son hôte avec elle).
    keys: { openai: has("OPENAI_API_KEY"), resend: has("RESEND_API_KEY"), bunny: has("BUNNY_ACCOUNT_API_KEY") || has("BUNNY_API_KEY") },
    chatgpt: { enabled: (Deno.env.get("CHATGPT_CONNECTOR_ENABLED") ?? "") === "true", origin_set: has("CHATGPT_PUBLIC_ORIGIN"), redirects_set: has("CHATGPT_REDIRECT_URIS") },
  }, { headers: { "Cache-Control": "no-store" } });
});
