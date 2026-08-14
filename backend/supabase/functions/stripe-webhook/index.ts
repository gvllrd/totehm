// TOTEHM · stripe-webhook
// Stripe checkout payé -> écrit l'email dans stoner_access
//                      -> envoie la confirmation via Resend
//                      -> trace le résultat dans stoner_access.email_status
// verify_jwt = false (Stripe n'a pas de JWT Supabase)

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const FROM   = "TOTEHM <no-reply@higher.boutique>";
const METHOD = "https://www.totehm.space/stoner.html";

function welcomeHtml(num: number, amount: string) {
  const n = String(num).padStart(3, "0");
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#000;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 16px;">
<tr><td align="center">
  <table role="presentation" width="100%" style="max-width:460px;" cellpadding="0" cellspacing="0">

    <tr><td align="center" style="padding-bottom:26px;">
      <img src="https://www.totehm.space/assets/img/totehm_logo.png"
           width="70" alt="TOTEHM" style="display:block;border:0;">
    </td></tr>

    <tr><td align="center" style="font-family:Arial,sans-serif;font-size:11px;
        letter-spacing:3px;color:#8f8fae;padding-bottom:18px;">FIGHER CLUB</td></tr>

    <tr><td align="center" style="font-family:'Courier New',monospace;font-size:38px;
        letter-spacing:2px;color:#fbd5ca;padding-bottom:6px;">#${n}</td></tr>

    <tr><td align="center" style="font-family:Arial,sans-serif;font-size:11px;
        letter-spacing:2px;color:#606060;padding-bottom:30px;">
      YOUR PLACE &middot; YOURS FOR LIFE</td></tr>

    <tr><td align="center" style="font-family:Arial,sans-serif;font-size:15px;
        line-height:1.8;color:#fbd5ca;padding-bottom:30px;">
      Ten steps.<br>An artistic and neurological<br>experience of the mark.</td></tr>

    <tr><td align="center" style="padding-bottom:30px;">
      <a href="${METHOD}" style="display:inline-block;background:#36498c;color:#fbd5ca;
         font-family:'Courier New',monospace;font-size:15px;text-decoration:none;
         padding:13px 30px;">Run the method</a></td></tr>

    <tr><td align="center" style="font-family:Arial,sans-serif;font-size:11px;
        letter-spacing:1px;color:#505050;line-height:1.8;padding-top:22px;
        border-top:1px solid #222;">
      ${amount} &middot; ONE TIME &middot; NO SUBSCRIPTION<br>
      Run it whenever you want, for the rest of your life.</td></tr>

  </table>
</td></tr>
</table>
</body></html>`;
}

// Renvoie une trace lisible, jamais une exception.
async function sendWelcome(email: string, num: number, amount: string): Promise<string> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return "KO: RESEND_API_KEY absente des secrets";

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: `You're Figher #${String(num).padStart(3, "0")}`,
        html: welcomeHtml(num, amount),
      }),
    });
    const body = await r.text();
    if (!r.ok) return `KO ${r.status}: ${body.slice(0, 260)}`;
    return `OK: ${body.slice(0, 120)}`;
  } catch (e) {
    return `KO exception: ${String(e).slice(0, 220)}`;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("no signature", { status: 400 });

  const raw = await req.text();   // JAMAIS req.json() : signature sur le body brut

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw, signature, Deno.env.get("STRIPE_WEBHOOK_SECRET")!, undefined, cryptoProvider,
    );
  } catch (err) {
    console.error("signature invalide:", err.message);
    return new Response("invalid signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response("ignored", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // CRITIQUE : deux flux Stripe sur ce compte.
  //   create-checkout -> Totehm Cloth | higher-checkout -> Figher Club
  // Un default explicite : rien d'inconnu n'accorde jamais un accès.
  switch (session.metadata?.product) {
    case "higher":
      break;
    case "cloth":
      return new Response("cloth handled elsewhere", { status: 200 });
    case "subscription":
      console.log("subscription product received — handler not yet implemented:", session.id);
      return new Response("ok", { status: 200 });
    default:
      console.warn("unknown product in metadata:", session.metadata?.product, "session:", session.id);
      return new Response("ok", { status: 200 });
  }

  if (session.payment_status !== "paid") {
    return new Response("unpaid", { status: 200 });
  }

  const email = (session.customer_details?.email ?? session.customer_email ?? "")
    .trim().toLowerCase();

  if (!email) {
    console.error("session payée sans email:", session.id);
    return new Response("no email", { status: 200 });
  }

  const amount = `${(session.amount_total ?? 0) / 100} ${session.currency?.toUpperCase()}`;

  const { error } = await admin
    .from("stoner_access")
    .upsert(
      { email, source: "stripe", stripe_session_id: session.id, note: amount },
      { onConflict: "email", ignoreDuplicates: true },
    );

  if (error) {
    console.error("écriture stoner_access échouée:", error.message);
    return new Response("db error", { status: 500 });   // 500 = Stripe rejoue
  }

  console.log("accès accordé:", email);

  // L'email ne doit JAMAIS faire échouer le webhook : l'accès est déjà
  // accordé. Un 500 ici ferait rejouer Stripe et enverrait des doublons.
  let status = "KO: numéro introuvable";
  try {
    const { data: rows } = await admin
      .from("stoner_access")
      .select("email")
      .order("granted_at", { ascending: true });

    const num = rows ? rows.findIndex((r) => r.email === email) + 1 : 0;
    if (num > 0) status = await sendWelcome(email, num, amount);
  } catch (e) {
    status = `KO exception: ${String(e).slice(0, 220)}`;
  }

  console.log("email:", status);
  await admin.from("stoner_access")
    .update({ email_status: status })
    .eq("email", email);

  return new Response("ok", { status: 200 });
});
