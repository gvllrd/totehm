// TOTEHM · create-checkout — le Checkout d'un TOTEHM Cloth
// ═══════════════════════════════════════════════════════════════════════
// MASTER §49-54 · 23/09/2026 : une Box, de n'importe laquelle des cinq
// vues, devient un Cloth. Il n'y a plus de message libre.
//
// ⚠️ LA MATIÈRE EST RELUE EN BASE, JAMAIS REÇUE. La page envoie une
// RÉFÉRENCE (`box: { kind, ref }`) ; le texte, les intentions, ce qui est
// relié et la palette sont reconstruits ici par `_box_matter`, dans le
// Totehm de la SESSION. Un texte posté par le navigateur se change dans
// l'inspecteur ; une Box de la base, non. Et on ne totehmise pas la Box
// d'un autre : `_box_matter` ne lit que celui qui est connecté.
//
// ⚠️ L'ACHETEUR VIENT DE LA SESSION. Avant ce lot, `user_id` et `email`
// venaient du CORPS de la requête : n'importe qui pouvait créer une
// commande au nom de n'importe qui. verify_jwt reste à false (le front
// envoie la clé anon + le jeton de session), mais l'identité est lue par
// `auth.getUser()`, jamais crue sur parole.
//
// ⚠️ LE PASSEPORT (CLAUDE.md « LE TOTEHM EST LE PASSEPORT ») : la
// génération du visuel textile est fermée tant que le Totehm n'est pas
// complet. Vérifié ici.
//
// `message` reste rempli avec le texte de la Box : c'est ce que lit la
// chaîne n8n. On change la matière première sans casser l'usine.
// ═══════════════════════════════════════════════════════════════════════
import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, SITE_BOUT } from '../_shared/origins.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } });

const KINDS = ['habit', 'objective', 'repulsion', 'wisdom', 'vision'];

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('origin'), SITE_BOUT);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const { data: { user }, error: authErr } = await sb.auth.getUser(
    (req.headers.get('authorization') ?? '').replace('Bearer ', ''),
  );
  if (authErr || !user) return Response.json({ error: 'signin' }, { status: 401, headers: cors });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return Response.json({ error: 'bad request' }, { status: 400, headers: cors });
  }
  const garment_id = String(body.garment_id ?? '');
  const name = String(body.name ?? '').trim();
  const size = String(body.size ?? '');
  const style_id = String(body.style_id ?? '');
  const box = (body.box ?? {}) as { kind?: string; ref?: string };

  if (!box.kind || !KINDS.includes(box.kind) || !box.ref) {
    return Response.json({ error: 'choose a box' }, { status: 422, headers: cors });
  }
  if (!/^\d+\..{2,40}$/.test(name)) {
    return Response.json({ error: 'name' }, { status: 422, headers: cors });
  }

  // ── Le passeport
  const { data: pass, error: pErr } = await sb.rpc('totehm_complete', { p_user: user.id });
  if (pErr) {
    console.error('[create-checkout] passport', pErr.message);
    return Response.json({ error: 'try again' }, { status: 503, headers: cors });
  }
  if (!pass?.complete) {
    return Response.json({ error: 'passport', remplies: pass?.remplies ?? 0 }, { status: 409, headers: cors });
  }

  // ── La matière : relue en base, dans le Totehm de la session
  const { data: snap, error: sErr } = await sb.rpc('_box_matter',
    { p_user: user.id, p_kind: box.kind, p_ref: String(box.ref) });
  if (sErr) {
    console.error('[create-checkout] box', sErr.message);
    return Response.json({ error: 'try again' }, { status: 503, headers: cors });
  }
  if (!snap?.text) return Response.json({ error: 'box not found' }, { status: 404, headers: cors });

  // ── Prix + stock : source de vérité = DB
  const { data: g } = await sb.from('totehm_cloth_support').select('*').eq('id', garment_id).maybeSingle();
  if (!g || !g.active || (g.max_pieces - g.claimed) <= 0) {
    return Response.json({ error: 'sold out' }, { status: 409, headers: cors });
  }
  const sizes = Object.keys(g.printful_variant_map ?? {});
  if (sizes.length && !sizes.includes(size)) {
    return Response.json({ error: 'size' }, { status: 422, headers: cors });
  }

  // ── Le style est CURATÉ (MASTER §53) : il doit exister et être ouvert.
  const { data: st } = await sb.from('artistic_styles').select('id,active')
    .eq('id', style_id).maybeSingle();
  if (!st?.active) return Response.json({ error: 'style' }, { status: 422, headers: cors });

  // ── Nom unique
  const { data: free } = await sb.rpc('name_available', { candidate: name });
  if (!free) return Response.json({ error: 'name taken' }, { status: 409, headers: cors });

  // ── Brouillon
  const { data: cloth, error } = await sb.from('totehm_clothes')
    .insert({
      garment_id, name, size, style_id, price: g.price, status: 'draft',
      user_id: user.id, email: user.email,
      message: snap.text,
      box_kind: box.kind, box_ref: String(box.ref),
      box_snapshot: snap, palette: snap.palette ?? [],
    })
    .select('id').single();
  if (error) {
    // 23505 = nom pris entre la vérification et l'insertion
    const taken = (error as { code?: string }).code === '23505';
    console.error('[create-checkout] insert', error.message);
    return Response.json({ error: taken ? 'name taken' : 'db' }, { status: taken ? 409 : 500, headers: cors });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email ?? undefined,
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: Math.round(Number(g.price) * 100),
        product_data: { name: `Totehm Cloth — ${name}`, description: `${g.title} · ${size} · Limited Original Piece` },
      },
      quantity: 1,
    }],
    shipping_address_collection: { allowed_countries: ['PT','FR','ES','DE','IT','BE','NL','GB','US','CA'] },
    // SÉCURITÉ : product:'cloth' isole ce flux dans le webhook (routage
    // sur metadata.product — ne jamais retirer ce filtre).
    metadata: { cloth_id: cloth.id, product: 'cloth' },
    // Chemins ABSOLUS sous cleanUrls (CLAUDE.md, 16/09).
    success_url: SITE_BOUT + '/streetwear?paid=1&cloth=' + cloth.id,
    cancel_url: SITE_BOUT + '/streetwear?cancel=1',
  });

  await sb.from('totehm_clothes').update({ stripe_session_id: session.id }).eq('id', cloth.id);
  return Response.json({ url: session.url }, { headers: cors });
});
