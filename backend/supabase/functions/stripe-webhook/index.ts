// ═══════════════════════════════════════════════════════════════
// TOTEHM · stripe-webhook
// Stripe checkout payé  ->  écrit l'email dans stoner_access
// verify_jwt = false  (Stripe n'a pas de JWT Supabase)
// ═══════════════════════════════════════════════════════════════

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

// Deno n'a pas le crypto sync de Node -> provider subtle obligatoire
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("no signature", { status: 400 });

  const raw = await req.text(); // JAMAIS req.json() : la signature porte sur le body brut

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error("signature invalide:", err.message);
    return new Response("invalid signature", { status: 400 });
  }

  // On ne traite qu'un seul évènement. Tout le reste : 200 silencieux.
  if (event.type !== "checkout.session.completed") {
    return new Response("ignored", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // ⚠ CRITIQUE : ce projet a DEUX flux Stripe.
  //   create-checkout  -> Totehm Cloth (streetwear)
  //   higher-checkout  -> Figher Club  (metadata.product = 'higher')
  // Sans ce filtre, chaque acheteur de t-shirt recevrait l'accès
  // Higher gratuitement, et personne ne s'en apercevrait.
  if (session.metadata?.product !== "higher") {
    return new Response("not higher", { status: 200 });
  }

  if (session.payment_status !== "paid") {
    console.log("session non payée:", session.id);
    return new Response("unpaid", { status: 200 });
  }

  const email = (session.customer_details?.email ?? session.customer_email ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    console.error("session payée sans email:", session.id);
    return new Response("no email", { status: 200 }); // 200 = Stripe ne rejoue pas
  }

  // Idempotent : si l'email a déjà l'accès, on ne l'écrase pas.
  const { error } = await admin
    .from("stoner_access")
    .upsert(
      {
        email,
        source: "stripe",
        stripe_session_id: session.id,
        note: `${(session.amount_total ?? 0) / 100} ${session.currency?.toUpperCase()}`,
      },
      { onConflict: "email", ignoreDuplicates: true },
    );

  if (error) {
    console.error("écriture stoner_access échouée:", error.message);
    return new Response("db error", { status: 500 }); // 500 = Stripe rejoue
  }

  console.log("accès accordé:", email);
  return new Response("ok", { status: 200 });
});
