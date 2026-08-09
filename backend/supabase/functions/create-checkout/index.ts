import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const { garment_id, message, name, size, style_id, user_id, email } = await req.json();

  // prix + stock : source de vérité = DB
  const { data: g } = await sb.from('totehm_cloth_support').select('*').eq('id', garment_id).single();
  if (!g || !g.active || (g.max_pieces - g.claimed) <= 0)
    return Response.json({ error: 'sold out' }, { status: 409, headers: cors });

  // nom unique
  const { data: taken } = await sb.rpc('name_available', { candidate: name });
  if (!taken) return Response.json({ error: 'name taken' }, { status: 409, headers: cors });

  // draft
  const { data: cloth, error } = await sb.from('totehm_clothes')
    .insert({ garment_id, message, name, size, style_id, price: g.price, status: 'draft', user_id, email })
    .select('id').single();
  if (error) return Response.json({ error: 'db' }, { status: 500, headers: cors });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: Math.round(Number(g.price) * 100),
        product_data: { name: `Totehm Cloth — ${name}`, description: `${g.title} · ${size} · Limited Original Piece` },
      },
      quantity: 1,
    }],
    shipping_address_collection: { allowed_countries: ['PT','FR','ES','DE','IT','BE','NL','GB','US','CA'] },
    // SÉCURITÉ : product:'cloth' isole ce flux du webhook stripe-webhook Higher
    // Le webhook Higher filtre sur metadata.product === 'higher' → flux cloth = invisible pour lui
    metadata: { cloth_id: cloth.id, product: 'cloth' },
    success_url: 'https://higher.boutique/streetwear.html?paid=1&cloth=' + cloth.id,
    cancel_url: 'https://higher.boutique/streetwear.html?cancel=1',
  });

  await sb.from('totehm_clothes').update({ stripe_session_id: session.id }).eq('id', cloth.id);
  return Response.json({ url: session.url }, { headers: cors });
});
