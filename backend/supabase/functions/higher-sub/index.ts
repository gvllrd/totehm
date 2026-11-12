// Retired Higher offer: no checkout or reactivation. Existing owners may cancel.
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHigherSubHandler } from "../_shared/retired-subscriptions.ts";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
Deno.serve(createHigherSubHandler({
  async user(token) {
    const { data: { user }, error } = await admin.auth.getUser(token);
    return error ? null : user?.id ?? null;
  },
  async subscription(userId) {
    const { data, error } = await admin.from("bot_subscriptions")
      .select("stripe_subscription_id,status").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data;
  },
  async cancel(subscriptionId) {
    const sub = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    return { ending: sub.cancel_at_period_end, until: new Date(sub.current_period_end * 1000).toISOString() };
  },
}));
