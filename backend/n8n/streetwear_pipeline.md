# STREETWEAR PIPELINE — 100% AUTOMATED (v1)
> TOTEHM · higher.boutique · Revenue Engine
> stack : streetwear.html → Supabase (DB + Storage + Edge Functions) → Stripe → n8n → OpenAI → Telegram → Printful → Resend
> doctrine : le client ne voit jamais le rendu. collaboration, pas customisation.

---

## 0. LA MACHINE À ÉTATS (colonne `totehm_clothes.status`)

```
draft → paid → generating → curation → approved → production → shipped → archived
                                 ↘ (timeout curation 24h → relance Telegram)
```

why : un seul champ pilote tout le pipeline. chaque workflow n8n lit un état et écrit le suivant.
how : contrainte CHECK en base, jamais de statut libre.
what : traçabilité totale, zéro commande fantôme.

**Règle cashflow : rien n'existe tant que Stripe n'a pas dit `checkout.session.completed`.**
Le `draft` ne bloque PAS le stock. `claimed` s'incrémente uniquement au passage `paid` (trigger SQL).

---

## BRIQUE 0 — SUPABASE : MIGRATION SQL

Copier-coller dans SQL Editor (ou je l'applique via `apply_migration`) :

```sql
-- 1. étendre totehm_clothes pour le pipeline
alter table totehm_clothes
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent text,
  add column if not exists paid_at timestamptz,
  add column if not exists artwork_final_url text,
  add column if not exists artwork_print_url text,
  add column if not exists printful_order_id text,
  add column if not exists tracking_number text,
  add column if not exists tracking_url text,
  add column if not exists shipping jsonb default '{}'::jsonb;

-- 2. machine à états
alter table totehm_clothes drop constraint if exists totehm_clothes_status_check;
alter table totehm_clothes add constraint totehm_clothes_status_check
  check (status in ('draft','paid','generating','curation','approved','production','shipped','archived','cancelled'));
alter table totehm_clothes alter column status set default 'draft';

-- 3. concepts générés (curation Telegram)
create table if not exists cloth_concepts (
  id uuid primary key default gen_random_uuid(),
  cloth_id uuid not null references totehm_clothes(id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  selected boolean default false,
  created_at timestamptz default now()
);
alter table cloth_concepts enable row level security;

-- 4. stock : claimed s'incrémente au paiement, pas avant
create or replace function bump_claimed() returns trigger as $$
begin
  if new.status = 'paid' and old.status = 'draft' then
    update totehm_cloth_support set claimed = claimed + 1 where id = new.garment_id;
  end if;
  if new.status = 'cancelled' and old.status = 'paid' then
    update totehm_cloth_support set claimed = greatest(claimed - 1, 0) where id = new.garment_id;
  end if;
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists trg_bump_claimed on totehm_clothes;
create trigger trg_bump_claimed after update of status on totehm_clothes
  for each row execute function bump_claimed();

-- 5. RLS : le front (anon) ne peut plus insérer directement — tout passe par l'edge function
drop policy if exists "anon insert clothes" on totehm_clothes;
drop policy if exists "read own clothes" on totehm_clothes;
create policy "read own clothes" on totehm_clothes
  for select using (auth.uid() = user_id);
-- (la vérif de dispo du nom passe par une RPC, voir brique 2)

-- 6. RPC publique pour vérifier la dispo d'un nom sans exposer la table
create or replace function name_available(candidate text) returns boolean
language sql security definer stable as $$
  select not exists (select 1 from totehm_clothes where lower(name) = lower(candidate));
$$;
```

**Storage :** créer le bucket privé `streetwear-generations` (Dashboard → Storage → New bucket, private).
URLs signées uniquement — exclusivité des œuvres.

---

## BRIQUE 1 — EDGE FUNCTION `create-checkout`

why : la clé secrète Stripe ne peut pas vivre dans streetwear.html. le prix vient de la DB, jamais du client.
how : le front envoie l'ordre → la function crée le `draft` + la session Stripe → renvoie l'URL.
what : `supabase/functions/create-checkout/index.ts`

```ts
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
    metadata: { cloth_id: cloth.id },
    success_url: 'https://higher.boutique/streetwear.html?paid=1&cloth=' + cloth.id,
    cancel_url: 'https://higher.boutique/streetwear.html?cancel=1',
  });

  await sb.from('totehm_clothes').update({ stripe_session_id: session.id }).eq('id', cloth.id);
  return Response.json({ url: session.url }, { headers: cors });
});
```

Déploiement (Claude Code terminal) :
```bash
supabase functions deploy create-checkout --project-ref abujjbkbbiumxrokozph
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx --project-ref abujjbkbbiumxrokozph
```

---

## BRIQUE 2 — PATCH streetwear.html (3 edits chirurgicaux)

**Edit 1 — la vérif de nom passe par la RPC** (remplace le select direct) :
```js
const {data:free}=await sb.rpc('name_available',{candidate:full});
if(!free){note.className='note no';note.textContent='already taken';...}
```

**Edit 2 — `order-btn` : plus d'insert direct, appel edge function + redirect Stripe** :
```js
$('order-btn').onclick=async()=>{
  if(!order.name||!order.size||!order.message||!order.style)return;
  const note=$('order-note');note.className='note dim';note.textContent='encoding…';
  $('order-btn').style.pointerEvents='none';
  const r=await fetch('https://abujjbkbbiumxrokozph.supabase.co/functions/v1/create-checkout',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({garment_id:order.support.id,message:order.message,name:order.name,
      size:order.size,style_id:order.style.id,user_id:me?me.id:null,email:me?me.email:null})
  });
  const j=await r.json();
  $('order-btn').style.pointerEvents='';
  if(!r.ok){note.className='note no';note.textContent=j.error==='name taken'?'that name was just taken':'error, try again';return;}
  location.href=j.url;   // → Stripe Checkout
};
```

**Edit 3 — retour de Stripe (`?paid=1`)** : au chargement, si `paid=1` → afficher `#done` avec le nom du cloth ("In process").

Validation : `node --check` sur le JS extrait avant push.

---

## BRIQUE 3 — STRIPE (ce que TU fais dans le dashboard)

1. Récupérer `sk_live_...` (Developers → API keys) → `supabase secrets set`.
2. Developers → Webhooks → Add endpoint :
   - URL : `https://TON-N8N.app/webhook/stripe-streetwear`
   - Event : `checkout.session.completed`
3. Copier le `whsec_...` → variable n8n pour vérifier la signature.
4. Settings → Checkout : activer Apple Pay / Google Pay (conversion mobile = ton audience).

Rien d'autre. Pas de produits à créer : `price_data` dynamique, le prix vit dans `totehm_cloth_support`.

---

## BRIQUE 4 — n8n WORKFLOW A : « PAYMENT »

```
[Webhook /stripe-streetwear]
→ [Code : vérifier signature whsec]
→ [Supabase update] totehm_clothes SET status='paid', paid_at=now(),
     stripe_payment_intent=..., shipping=session.shipping_details WHERE id = metadata.cloth_id
     (le trigger SQL bump_claimed incrémente le stock)
→ [Execute Workflow B : GENERATION] (async)
→ [Resend] email client « Your message is being encoded. » (confirmation, pas de visuel)
```

---

## BRIQUE 5 — n8n WORKFLOW B : « GENERATION »

```
[Trigger: appelé par A avec cloth_id]
→ [Supabase get] cloth + style (artistic_styles.name) + support
→ [Supabase update] status='generating'
→ [OpenAI images/generations] modèle gpt-image-1, n=3, size 1024x1536
     prompt = système TOTEHM :
     "original artwork born from this message: «{message}».
      artistic style: {style.name}. no text, no letters in the image.
      museum-grade composition, printable on garment, high contrast on {couleur du support}."
→ [Loop x3] upload → Supabase Storage bucket streetwear-generations/{cloth_id}/concept-{i}.png
→ [Supabase insert x3] cloth_concepts
→ [Supabase update] status='curation'
→ [Telegram sendMediaGroup] au chat Curateur : les 3 visuels + le message client
→ [Telegram sendMessage] inline keyboard : [① ] [② ] [③ ] [REGEN]
     callback_data = "pick:{concept_id}" / "regen:{cloth_id}"
```

---

## BRIQUE 6 — n8n WORKFLOW C : « CURATION » (Telegram callback)

```
[Webhook Telegram /curation]
→ [Switch callback_data]
   ├─ regen:{cloth_id} → relance WORKFLOW B
   └─ pick:{concept_id}
      → [Supabase update] cloth_concepts SET selected=true
      → [HTTP Replicate] real-esrgan upscale x4 du concept choisi (~0.01€/image)
      → [HTTP → Edge Function compose-artwork] (brique 6bis)
           body: { cloth_id }  → fusionne : artwork HD + logo TOTEHM + "{epoch}.{Name}"
           → upload artwork_print_url (fichier print 300dpi) + artwork_final_url
      → [Supabase update] status='approved'
      → [Execute Workflow D : PRINTFUL]
      → [Telegram answerCallbackQuery] "✓ encoded"
```

### BRIQUE 6bis — EDGE FUNCTION `compose-artwork`
why : n8n cloud ne manipule pas d'images proprement. Deno + `imagescript` le fait en 30 lignes.
how : télécharge l'artwork upscalé, superpose `totehm_logo.png` + le Totehm Cloth Name (police Quantico embarquée), exporte PNG 300dpi au gabarit print Printful (ex. 3600×4800).
what : retourne `{ print_url }` (URL signée 7 jours pour Printful).

---

## BRIQUE 7 — n8n WORKFLOW D : « PRINTFUL »

```
[Trigger: cloth_id]
→ [Supabase get] cloth (size, shipping, artwork_print_url signé)
→ [HTTP POST api.printful.com/orders]  (confirm: true → full auto)
   {
     recipient: {...shipping},        // récupéré de Stripe
     items: [{
       variant_id: VARIANT_MAP[support][size],   // table de mapping en variable n8n
       files: [{ type: "default", url: artwork_print_url }]
     }]
   }
→ [Supabase update] printful_order_id, status='production'
```

**Mapping variants** : dans Printful Dashboard tu choisis ton produit (ex. AS Colour 5001 / Stanley Stella), tu relèves les `variant_id` par taille, tu les stockes en variable n8n `VARIANT_MAP`. Une fois. C'est tout.

---

## BRIQUE 8 — n8n WORKFLOW E : « TRACKING → RESEND »

```
[Webhook /printful-events]   (configuré dans Printful → Settings → Webhooks : package_shipped)
→ [Supabase update] tracking_number, tracking_url, status='shipped'
→ [Resend send] template « Your Totehm Cloth has left the atelier. »
   + tracking + rappel Decode : "Its story is preserved. Decode it when it arrives."
→ (à la livraison, cron hebdo n8n : status='archived' → l'œuvre entre dans la Decode Database)
```

---

## CE QUE TU FAIS, OUTIL PAR OUTIL (checklist)

| Outil | Action unique de setup | Durée |
|---|---|---|
| **Supabase** | GO pour que j'applique la migration + créer bucket `streetwear-generations` (private) | 5 min |
| **Stripe** | clé secrète → supabase secrets · webhook → n8n · activer wallets | 10 min |
| **Supabase CLI** | `supabase functions deploy create-checkout` puis `compose-artwork` | 5 min |
| **GitHub** | push du streetwear.html patché (je te livre le fichier) → Vercel auto-deploy | 2 min |
| **OpenAI** | créer une clé API dédiée « totehm-n8n » → credentials n8n | 3 min |
| **Telegram** | @BotFather → bot Curateur · récupérer ton chat_id · webhook → n8n | 10 min |
| **Printful** | créer le compte · choisir le produit support · relever les variant_id · webhook package_shipped → n8n | 30 min |
| **Resend** | vérifier le domaine higher.boutique (DNS Hostinger) · clé API → n8n | 15 min |
| **n8n** | importer les 5 workflows JSON (je les génère à la brique suivante) | 20 min |

**Total setup humain : ~1h40. Ensuite : 0 intervention par commande, sauf 1 tap Telegram (curation).**
La curation reste humaine par doctrine — c'est elle qui fait que c'est une œuvre curatée, pas du POD.

---

## ORDRE D'EXÉCUTION (brique par brique, validation entre chaque)

1. **Brique 0** — migration SQL + bucket. Test : `name_available('test')` renvoie true.
2. **Briques 1+2+3** — checkout bout-en-bout en mode test Stripe (carte 4242). Test : draft→paid, claimed+1.
3. **Brique 4+5** — génération + réception Telegram. Test : 3 concepts dans le bucket.
4. **Brique 6** — tap Telegram → artwork final composé. Test : print file 300dpi correct.
5. **Brique 7** — commande Printful en draft (confirm:false d'abord !), vérifier le rendu sur mockup, PUIS confirm:true.
6. **Brique 8** — email tracking.

⚠️ Point à trancher avant la brique 2 : **préfixe d'époque `0.` (code actuel) vs `1.` (doctrine higher_boutique_v2)**.
