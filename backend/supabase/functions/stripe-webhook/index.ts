// TOTEHM · stripe-webhook
// Trois flux sur le même compte — routage sur metadata.product :
//   higher       → stoner_access + email Resend
//   cloth        → ignoré ici (Printful géré ailleurs)
//   subscription → subscriptions (Figher Club)
//
// Events traités :
//   checkout.session.completed
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.payment_failed
//
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

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleHigherCheckout(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const email = (session.customer_details?.email ?? session.customer_email ?? "")
    .trim().toLowerCase();

  if (!email) {
    console.error("session payée sans email:", session.id);
    return;
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
    throw new Error(error.message);
  }

  console.log("accès higher accordé:", email);

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
}

async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  const lockedPrice = parseInt(session.metadata?.member_locked_price ?? "0", 10);
  const customerId = session.customer as string;
  const subId = session.subscription as string;

  if (!userId || !subId) {
    console.error("metadata manquante dans subscription checkout:", session.id);
    return;
  }

  const sub = await stripe.subscriptions.retrieve(subId);

  const now = new Date().toISOString();
  const trialEnd = sub.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : null;
  const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id:              userId,
      stripe_customer_id:   customerId,
      stripe_subscription_id: subId,
      status:               sub.status,
      member_locked_price:  lockedPrice,
      trial_started_at:     now,
      trial_ends_at:        trialEnd,
      current_period_end:   periodEnd,
      started_at:           now,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("subscriptions upsert échoué:", error.message);
    throw new Error(error.message);
  }

  console.log("abonnement créé — user:", userId, "sub:", subId, "status:", sub.status);
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  if (sub.metadata?.product !== "subscription") {
    console.log("subscription.updated ignoré — produit inconnu:", sub.id);
    return;
  }

  const trialEnd = sub.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : null;
  const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

  const { error } = await admin.from("subscriptions")
    .update({
      status:              sub.status,
      current_period_end:  periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
      trial_ends_at:       trialEnd,
    })
    .eq("stripe_subscription_id", sub.id);

  if (error) {
    console.error("subscriptions update échoué:", error.message);
    throw new Error(error.message);
  }

  console.log("abonnement mis à jour:", sub.id, "→", sub.status);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  if (sub.metadata?.product !== "subscription") {
    console.log("subscription.deleted ignoré — produit inconnu:", sub.id);
    return;
  }

  const { error } = await admin.from("subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", sub.id);

  if (error) {
    console.error("subscriptions canceled update échoué:", error.message);
    throw new Error(error.message);
  }

  console.log("abonnement annulé:", sub.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subId) {
    console.log("invoice.payment_failed sans subscription — ignoré:", invoice.id);
    return;
  }

  const { error } = await admin.from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subId);

  if (error) {
    console.error("past_due update échoué:", error.message);
    throw new Error(error.message);
  }

  console.log("paiement échoué — abonnement en past_due:", subId);
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("no signature", { status: 400 });

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw, signature, Deno.env.get("STRIPE_WEBHOOK_SECRET")!, undefined, cryptoProvider,
    );
  } catch (err) {
    console.error("signature invalide:", err.message);
    return new Response("invalid signature", { status: 400 });
  }

  // Idempotence — PK conflict = déjà traité
  const { error: idempErr } = await admin
    .from("stripe_events")
    .insert({ event_id: event.id, type: event.type });

  if (idempErr) {
    if (idempErr.code === "23505") {
      console.log("event déjà traité:", event.id);
      return new Response("already processed", { status: 200 });
    }
    // Table absente ou autre erreur : on logue et on continue
    console.warn("stripe_events insert échoué (non bloquant):", idempErr.message);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        switch (session.metadata?.product) {
          case "higher":
            await handleHigherCheckout(session);
            break;
          case "cloth":
            console.log("cloth checkout — géré ailleurs:", session.id);
            break;
          case "subscription":
            await handleSubscriptionCheckout(session);
            break;
          default:
            console.warn("product inconnu dans metadata:", session.metadata?.product, "session:", session.id);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log("event ignoré:", event.type);
    }
  } catch (err) {
    // 500 → Stripe rejoue : utilisé pour les erreurs DB critiques uniquement
    console.error("erreur handler:", event.type, err.message);
    return new Response("handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
