// Higher and former Club membership are retired. Only owner cancellation remains.
import { corsHeaders, SITE_COM, SITE_CLUB } from "./origins.ts";
type LegacySubscription = { stripe_subscription_id: string | null; status: string };
type Dependencies = {
  user: (token: string) => Promise<string | null>;
  subscription: (userId: string) => Promise<LegacySubscription | null>;
  cancel: (subscriptionId: string) => Promise<{ ending: boolean; until: string }>;
};
function replies(req: Request, fallback: string) {
  const headers = { ...corsHeaders(req.headers.get("origin"), fallback), "Cache-Control": "no-store" };
  return {
    json: (body: unknown, status = 200) => Response.json(body, { status, headers }),
    options: () => new Response("ok", { headers }),
  };
}
export function createHigherSubHandler(deps: Dependencies) {
  return async (req: Request): Promise<Response> => {
    const { json, options } = replies(req, SITE_COM);
    if (req.method === "OPTIONS") return options();
    if (req.method !== "POST") return json({ error: "method" }, 405);
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "bad_request" }, 400);
    if (body.action === "checkout" || body.action === "resume") {
      return json({ error: "product_retired", url: SITE_COM + "/chatgpt" }, 410);
    }
    if (body.action !== "cancel") return json({ error: "action" }, 400);
    try {
      const userId = await deps.user((req.headers.get("authorization") ?? "").replace(/^Bearer /i, ""));
      if (!userId) return json({ error: "no_session" }, 401);
      const sub = await deps.subscription(userId);
      if (!sub?.stripe_subscription_id || !["active", "trialing", "past_due"].includes(sub.status)) {
        return json({ error: "not_subscribed" }, 404);
      }
      return json({ ok: true, ...await deps.cancel(sub.stripe_subscription_id) });
    } catch {
      console.error("[higher-sub] legacy cancellation unavailable");
      return json({ error: "unavailable" }, 503);
    }
  };
}
export function retiredClubCheckout(req: Request): Response {
  const { json, options } = replies(req, SITE_CLUB);
  if (req.method === "OPTIONS") return options();
  if (req.method !== "POST") return json({ error: "method" }, 405);
  return json({ error: "product_retired", url: SITE_CLUB }, 410);
}
