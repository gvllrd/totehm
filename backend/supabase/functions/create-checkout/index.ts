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
//
// 05/10 : le paiement est traité par `stripe-webhook` (cas `cloth`) — la
// pièce passe `paid`, la génération n8n est déclenchée. Un testeur actif
// (`_boutique_test_mode`) paie en MODE TEST Stripe, la pièce porte `test`.
//
// 08/10 : le NOM est posé ici (`0.` = l'année de collection, juin → mai) ; un
// paiement abandonné puis repris REPREND son brouillon (`_cloth_draft_put` :
// même pièce, son ancien Checkout est fermé) au lieu de buter sur « name
// taken » ; un style épuisé est refusé ; le Checkout expire en 31 min (le
// ménage `cleanup-drafts` efface les brouillons de plus de 2 h : aucun ne
// peut être payé après). Réponse : { url, name }.
// ═══════════════════════════════════════════════════════════════════════
import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, SITE_BOUT } from '../_shared/origins.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } });

const KINDS = ['habit', 'objective', 'repulsion', 'wisdom', 'vision'];

// L'année de collection : 0 = juin 2026 → mai 2027 (comme compose-artwork et luxury-quote).
function epochPrefix(): string {
  const d = new Date(), y = d.getUTCFullYear(), ey = d.getUTCMonth() >= 5 ? y : y - 1;
  return Math.max(ey - 2026, 0) + '.';
}

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
  // Le préfixe vient du SERVEUR : ce que la page envoie après « 0. » seulement.
  const raw = String(body.name ?? '').trim().replace(/^\d+\./, '').replace(/\s+/g, ' ').trim();
  const name = epochPrefix() + raw;
  const size = String(body.size ?? '');
  const style_id = String(body.style_id ?? '');
  const box = (body.box ?? {}) as { kind?: string; ref?: string };

  if (!box.kind || !KINDS.includes(box.kind) || !box.ref) {
    return Response.json({ error: 'choose a box' }, { status: 422, headers: cors });
  }
  if (raw.length < 2 || raw.length > 40) {
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
  //    08/10 : et pas épuisé (7 pièces par style, `remaining_capacity`).
  const { data: st } = await sb.from('artistic_styles').select('id,active,status,remaining_capacity')
    .eq('id', style_id).maybeSingle();
  if (!st?.active || (st.status && st.status !== 'active')) return Response.json({ error: 'style' }, { status: 422, headers: cors });
  if (st.remaining_capacity != null && st.remaining_capacity <= 0) return Response.json({ error: 'style sold out' }, { status: 409, headers: cors });

  // ── Le mode test (05/10 soir) : un testeur actif paie avec la clé TEST de
  //    Stripe (carte 4242…), au vrai prix — aucun argent réel. Sans la clé
  //    test, on refuse : jamais un testeur débité en live par erreur.
  const { data: test, error: tErr } = await sb.rpc('_boutique_test_mode', { p_user: user.id });
  if (tErr) {
    console.error('[create-checkout] test mode', tErr.message);
    return Response.json({ error: 'try again' }, { status: 503, headers: cors });
  }
  const testKey = Deno.env.get('STRIPE_TEST_SECRET_KEY');
  if (test === true && !testKey) return Response.json({ error: 'test_unavailable' }, { status: 503, headers: cors });
  const pay = test === true ? new Stripe(testKey!) : stripe;

  // ── Brouillon : posé ou REPRIS en une transaction (verrou sur le nom). Le nom
  //    est libre s'il n'est tenu que par MON brouillon (paiement abandonné).
  const { data: put, error } = await sb.rpc('_cloth_draft_put', {
    p_user: user.id, p_email: user.email ?? null, p_name: name, p_garment: garment_id, p_size: size,
    p_style: style_id, p_price: g.price, p_test: test === true, p_kind: box.kind, p_ref: String(box.ref), p_snap: snap,
  });
  if (error) {
    console.error('[create-checkout] draft', error.message);
    return Response.json({ error: 'try again' }, { status: 503, headers: cors });
  }
  if (!put?.ok) return Response.json({ error: put?.error === 'name' ? 'name' : 'name taken' }, { status: 409, headers: cors });
  const cloth = { id: String(put.id) };

  // Le Checkout précédent de CE brouillon est fermé : jamais deux sessions
  // payables pour une seule pièce. Déjà expiré ou fermé : rien à faire.
  if (put.old_session) {
    const old = put.old_test ? (testKey ? new Stripe(testKey) : null) : stripe;
    try { await old?.checkout.sessions.expire(String(put.old_session)); }
    catch (e) { console.log('[create-checkout] old session', String((e as Error)?.message ?? e).slice(0, 120)); }
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await pay.checkout.sessions.create({
      mode: 'payment',
      // 31 min : sous les 2 h du ménage des brouillons, jamais une pièce effacée payable.
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      customer_email: user.email ?? undefined,
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(Number(g.price) * 100),
          product_data: { name: `${test ? 'TEST · ' : ''}Totehm Cloth — ${name}`, description: `${g.title} · ${size} · Limited Original Piece` },
        },
        quantity: 1,
      }],
      shipping_address_collection: { allowed_countries: ['PT','FR','ES','DE','IT','BE','NL','GB','US','CA'] },
      // SÉCURITÉ : product:'cloth' isole ce flux dans le webhook (routage
      // sur metadata.product — ne jamais retirer ce filtre).
      metadata: { cloth_id: cloth.id, product: 'cloth', test: test === true ? '1' : '0' },
      // Chemins ABSOLUS sous cleanUrls (CLAUDE.md, 16/09).
      success_url: SITE_BOUT + '/streetwear?paid=1&cloth=' + cloth.id,
      cancel_url: SITE_BOUT + '/streetwear?cancel=1',
    });
  } catch (e) {
    console.error('[create-checkout] stripe', String((e as Error)?.message ?? e).slice(0, 200));
    return Response.json({ error: 'stripe' }, { status: 502, headers: cors });
  }

  const { error: uErr } = await sb.from('totehm_clothes').update({ stripe_session_id: session.id })
    .eq('id', cloth.id).eq('status', 'draft');
  if (uErr) console.error('[create-checkout] session id', uErr.message);
  return Response.json({ url: session.url, name }, { headers: cors });
});
