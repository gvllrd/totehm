// Former annual Club membership is retired, including price previews.
// No Stripe client, customer creation or database mutation on this route.
import { retiredClubCheckout } from "../_shared/retired-subscriptions.ts";
Deno.serve(retiredClubCheckout);
