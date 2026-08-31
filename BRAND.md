# BRAND.md — TOTEHM

**Source of truth for product, brand and ecosystem.**
Read this before writing any copy, naming anything, or designing any UI.
Technical rules live in `CLAUDE.md`. Product state lives in `backend/SYSTEM.md`.

---

## 0. THE NON-NEGOTIABLE

TOTEHM is not one product with three websites.
TOTEHM is an ecosystem of independent products that share one universe.

```
INDEPENDENT PRODUCTS
        ↓
CONNECTED ECOSYSTEM
```

Not:

```
ONE PRODUCT
 ├── .com
 ├── .space
 └── .boutique
```

Every product must stand alone. A user should understand and want one product
without knowing the other two exist. Connections deepen the journey — they never
explain the architecture.

**Three independent products. One world.**

They differ in: product, audience, promise, experience, acquisition channel,
commercial model, competitive reference, vocabulary.
They share: the TOTEHM universe, identity, brand language, common data
infrastructure where appropriate, natural cross-entry points.

---

## 1. THE ENTRY ARCHITECTURE

Everything starts at `higher.boutique`. That is the only place where the branding
is named and explained.

```
                    HIGHER.BOUTIQUE
                    HIGHER BY TOTEHM
                           │
                 EXPERIENCE THE BRANDING
                    /      |       \
                   /       |        \
        EXPERIENCE      EXPERIENCE    WRITE YOUR STRATEGY
        THE LOGO        THE SLOGAN      IN THE LOGO
             \             /                  │
              \           /                   │
               ↓         ↓                    ↓
              TOTEHM.COM                 TOTEHM.SPACE
           STONER EXPERIENCE            PERSONAL SYSTEM
```

- **EXPERIENCE THE LOGO → totehm.com**
- **EXPERIENCE THE SLOGAN → totehm.com**
- **WRITE YOUR STRATEGY IN THE LOGO → totehm.space**

Both branding experiences lead to `.com`. The logo and the slogan are the two
faces of the same experience: the visual language and `GET HIGHER`. The Stoner
Experience is where the branding proves it is useful.

`.space` is entered through a different promise entirely: you are not there to
experience the branding, you are there to build something.

### The rule that follows

The words "logo" and "slogan" belong to `higher.boutique`.
They are CTA labels, written on the boutique, where explaining the branding is
the point.

**Once the user is inside `.com` or `.space`, stop explaining that they are
experiencing the logo or the slogan.** Inside `.space` in particular: the logo is
the interface, that is a product-design fact, and it must be *discovered*, never
narrated.

Never write on `.space`:
> "Write your life strategy into the TOTEHM logo."
> "The logo is your life planner."

Write instead:
> BUILD YOUR SYSTEM.
> UNDERSTAND YOUR TIME.
> SHAPE YOUR HABITS.
> CHOOSE YOUR DIRECTION.

---

## 2. HIGHER.BOUTIQUE — HIGHER BY TOTEHM

The brand / fashion / artist / physical-object layer. The physical presentation
of the TOTEHM world. Not simply a shop.

**Competitive reference:** Supreme · Tommy Hilfiger · traditional brand-centric
fashion.

This is not a garment-quality comparison. It is a **branding-philosophy**
comparison.

```
TRADITIONAL              TOTEHM
BRAND                    PERSON
 ↓                        ↓
BRAND IDENTITY           STORY
 ↓                        ↓
CONSUMER WEARS           ARTWORK
THE BRAND                 ↓
                         GARMENT
```

The problem with brand-centric fashion: egocentric branding, impersonal
illustrations, garments that reflect the label instead of the wearer.

> Traditional brands put their identity on you.
> TOTEHM turns your identity into the object.

The internal theory is **Reflective Branding**. It is a doctrine, not a slogan —
the public should feel it in the product, not read it on the homepage.

### Totehm Cloth

Not merch. A physicalization of personal meaning.

```
WRITE → TOTEHMIZE → ARTWORK → CLOTH → WEAR → DECODE → STORY
```

A personal writing becomes an artwork. The artwork becomes a garment. The garment
becomes a portal. Decode brings you back to the story.

The physical object is part of the ecosystem, not the end of it.

---

## 3. TOTEHM.COM — THE STONER EXPERIENCE

A standalone experience product.

It sells: **THE STONER EXPERIENCE.**
It does not sell: `.space`, subscriptions, the social network, the Cloth, or
generic branding. Those are natural cross-entries, not the offer.

### The Stoner Method

An artistic + neurological performance experience embedded in TOTEHM's visual
language: interactive sequences, mental-performance techniques, High / Low entry
modes, audiovisual experience, cognitive framing.

Existing voice:
> Ten steps to turn it around. (Low)
> Ten steps to hold the altitude. (High)
> An artistic and neurological experience.

### TotehmPaper {THP} — le ticket d'entrée

Le paywall de `.com` n'est pas un formulaire d'achat. C'est un objet.

**Nom officiel :** TotehmPaper {THP}
**Prix :** 30 $ — fixe, unique, sans palier.
**Ce que ça donne :** accès à la méthode complète (stoner.html).

Interface d'achat (get_higher.html au 28/08/2026) :
- Le logo TOTEHM en grand, centré, comme un carré de papier à tenir entre les doigts.
- Un seul bouton : `Buy a TotehmPaper {THP} — $30` (perforé, Quantico).
- En dessous : `Simple terms of sale` — lien sobre, gris sombre, aucune case à cocher.
- En dessous : bouton `Play the street ↓` — ouvre le panneau de 22 panneaux de signalisation lisboètes (Play the Street).
- Rien d'autre. Aucun titre. Aucune description. L'objet parle.

**Référence concurrente :** l'acide en carré de papier buvard. La forme physique d'une
altération d'état. TOTEHM propose la même promesse, sans substance.

⚠️ **Le mot « TotehmPaper » n'apparaît nulle part sur les Discovers.** Il se découvre
au moment de l'achat. La promesse sur `.com` reste `GET HIGHER` — l'objet est la
surprise.

### Where Figher Club lives

**Figher Club never appears on `.com`.**

It is a cultural reversal — Fight Club → Figher Club — and a reversal only lands
on someone who already holds the reference. A gallery curator, or a passer-by who
just scanned a sticker on a Lisbon sign, has no context for it: they read a pun
whose key they were never given.

The same rule catches a second leak. The `.com` paywall must not describe "places
and events" — that is Tree, and Tree lives on `.space`. **Two products on one
payment screen is one product too many.**

What `.com` may say: `GET HIGHER` (the slogan works with zero context), the
numbered place, the ten steps, the artistic and neurological framing.

**Figher Club belongs to `totehm.space`.** Not to the boutique — the boutique is
where a story becomes an object, and Figher is not an object, it is a state of a
person. The buyer of the Stoner Experience discovers they have become a Figher
*on arriving at `.space`*, never as a sales argument beforehand. A revelation is
stronger than a promise.

Mechanically it already works and needs no bridge: `.com` writes to
`stoner_access` through the Stripe webhook, `.space` reads it. One database,
three domains — this is what the architecture was built for.

As Tree becomes collaborative, Figher becomes **the qualification to contribute**:
you did the method, so you can publish a spot. A club that does something, rather
than a club that decorates.

### The status layer, assumed on purpose

The Higher badge is visible next to other members' names. **This is a deliberate
exception to the Plant doctrine and it must be named as such**, not left to exist
by accident.

Plant exists to break `LOOK AT ME` in favour of `LEARN FROM ME`, and a badge beside
a pseudonym is, mechanically, a status marker. The exception holds only as long as
the badge carries *information* rather than rank: it says this person went through
the method, so their published habits and spots rest on something.

The line not to cross: **one badge, binary, never a score, never a ranking, never a
leaderboard, never a count of anything comparable between members.** The moment
Higher becomes a quantity, Plant becomes the thing it was built against.

*(Internal identifier: the Postgres function is `higher_count`. The old
`figher_count` is deprecated — see `backend/SYSTEM.md` §7.)*

### CRITICAL DISTINCTION

**The Stoner Method is NOT the 7 Intentions.**

| Stoner Method | The 7 Intentions |
|---|---|
| Lives on `.com` | Live on `.space` |
| Performance, perception | Personal system |
| Neurological / experiential techniques | Attached to habits |
| Artistic experience | Structure development and recommendations |

Never collapse the two into one concept. Never put the 7 Intentions in a `.com`
Discover.

The layers that must never be confused: **Stoner Method · the 7 Intentions ·
Play the Street · Higher branding.**

### Lisbon version — MAKE THE STREET SUBLIME

**Competitive reference:** dead / inert urban signage for pedestrians.

Wavywah built the TOTEHM visual language with Lisbon's signage in mind — forms,
colors, visual logic. There is a formal link between TOTEHM and Lisbon's visual
language, and that link is what makes the reversal possible.

The point is not to add street art to Lisbon. The point is to give a **second
function** to signs that already exist.

```
YOU WALK
 ↓
YOU SEE THE SIGN
 ↓
THE SIGN TRIGGERS INTERACTION
 ↓
THE INTERACTION TRIGGERS EXPERIENCE
 ↓
THE CITY BECOMES A MENTAL ENVIRONMENT
```

This is **Play the Street**. Road signs, pedestrian signs, safety signs,
directional signs become interactive triggers for mental and artistic sequences.

Not street advertising. Not a city-guide app. Not an art campaign.

> The city is already talking. You just weren't listening.

**Implémentation au 28/08/2026 :** `discover_lisbon.html` superpose 22 panneaux de
signalisation lisboètes sur une photo de rue. Chaque signe est un bouton : cliquer
dessus lance sa vidéo dans une boîte en verre 3D rotative (système `.vbox-scene`,
voir `CLAUDE.md`). Le même panneau est accessible depuis `get_higher.html` via le
bouton **"Play the street ↓"**. Les vidéos sont servies depuis le bucket Supabase
public `play-signals`.

### International version — THE FIRST DIGITAL LSD

Outside Lisbon the street layer disappears. The product stays digital,
neurological, experiential.

**Competitive reference:** drugs / altered-perception experiences.

> Drugs alter perception chemically.
> TOTEHM explores altered perception digitally.

This is an artistic and experiential proposition about altered perception.
**It is not a pharmacological claim.** Keep the language underground — not cold
and scientific, not startup.

---

## 4. TOTEHM.SPACE — THE PERSONAL SYSTEM

An independent personal-development ecosystem: build a personal system, organize
habits, understand time, develop a direction, learn from other people, discover
places that matter.

```
SEED   BUILD YOUR SYSTEM
  ↓
PLANT  LEARN FROM REAL PEOPLE
  ↓
TREE   GO WHERE IT MAKES SENSE FOR YOU
```

Three levels, three distinct purposes, three distinct competitive references.
Never explained all at once.

### SEED — vs self-help tools

Self-improvement products become trackers, reminders, planners, motivation
layers. TOTEHM wants to be a personal operating system.

```
HABITS + TIME FREQUENCY + INTENTION = PERSONAL SYSTEM
```

The system generates and enriches the autobiography.

> Don't just track your life. Build it.

### PLANT — vs Instagram / social media

The attack is not "Instagram has worse features". The problem is cultural:
performative identity, attention economy, comparison, validation, displaying a
life instead of learning from one.

> INSTAGRAM: LOOK AT ME.
> TOTEHM: LEARN FROM ME.

Plant lets people discover real habits, actual strategies, genuine routines —
the practice, not the character.

The objective is to destroy performative social media as the default model.
TOTEHM is not "Instagram with a better UI". It is a different social purpose.

### TREE — vs Google Maps

Maps answer *where is it*. TOTEHM answers *why does this place matter to me*.
Recommendations filtered by intentions, habits, strategic direction, current
objectives.

> Maps tell you where. TOTEHM tells you why.
> A map for the person you're becoming.

---

## Higher Map — Void Radar & Swipe Deck — 19/08/2026

**Le monde est vide jusqu'à ce que l'intention le projette.**

Rien ne charge à l'ouverture. Le système pose une seule question :
quelle est ton intention, là, maintenant. C'est seulement quand tu
réponds que le monde apparaît.

### Le flow, en trois temps

1. **Le vide.** Noir absolu. La question flotte au centre de l'écran.
   Il n'y a rien à regarder parce qu'il n'y a rien à faire tant que tu
   n'as pas décidé.
2. **L'ascension.** Tu choisis une intention. Le bloc monte et libère
   l'écran.
3. **La révélation.** Le monde apparaît, à la couleur de ton intention.

Ce n'est pas une animation : c'est la thèse du produit rendue visible.
Le monde ne te propose rien. C'est ton intention qui fait apparaître ce
qui compte.

### Deux rendus, un seul état

Le radar est juste sur un grand écran et mauvais sur un téléphone :
quinze marqueurs sur 390 px, ce sont quinze cibles collées les unes aux
autres. Le rendu bifurque donc à 700 px — mais **uniquement le rendu**.

| Écran | Rendu |
|---|---|
| ≥ 700 px | **Radar** — canvas, anneaux de portée, balayage, T positionnés autour de toi |
| < 700 px | **Swipe Deck** — carrousel horizontal, une carte par lieu, 4/5 de l'écran |

Une machine à états, un chargeur, **une seule carte de contenu servie
aux deux**. C'est la règle qui empêche cette bifurcation de doubler le
coût de maintenance pour toujours : le jour où la carte change, elle
change une fois.

### Les règles tenues

- **Le T marque ce vers quoi on peut aller.** Toi, tu n'es pas une
  destination : au centre du radar, tu es un **carré blanc**. Ça règle
  aussi une vraie confusion — un T blanc au milieu de T colorés se
  lisait comme un lieu sans intention.
- **Le T remplace la pastille.** Dans tous les menus d'intention, le
  glyphe TOTEHM, jamais un rond de couleur.
- **Un seul point d'entrée membre : le point vert en haut à gauche.**
  Aucun bouton natif posé au milieu du vide. Quand la position doit
  être relancée, c'est la ligne de statut elle-même qui devient
  cliquable.
- **La géolocalisation est silencieuse.** Si elle échoue, repli sur
  Lisbonne, annoncé sobrement. Un écran vide après une décision est un
  bug.
- **Quinze lieux maximum.** Au-delà, l'écran devient une soupe et le
  choix redevient impossible.

### Typographie — la hiérarchie passe par la lumière

- **Zéro italique.** Banni de l'UI.
- **Quantico, 14 px minimum, pour tout ce qui se LIT.**
- **Space Mono pour ce qui se MESURE** — coordonnées, distances, heure,
  température. La frontière entre la parole et la donnée.
- **Quatre valeurs de gris, jamais plus** : blanc pour ce qui compte
  maintenant, gris clair pour le secondaire, gris pour le contexte,
  gris sombre pour la structure.

### Unified Spot Model

Trois natures, **déduites** et non stockées :

| Nature | Déduite de | Affichage |
|---|---|---|
| `PLACE` | par défaut | ça reste |
| `LIVE_EVENT` | `expires_at` renseigné | compte à rebours |
| `MEMBER_DROP` | `user_id` renseigné | posé par un membre |

### Ce qui n'est pas affiché, et pourquoi

- **Pas d'image** : `image_url` pointe vers pollinations.ai sur 105 des
  121 spots — une image générée à la volée, par un service gratuit sans
  engagement, montrant un lieu réel qui n'a jamais ressemblé à ça. Dans
  un produit dont la thèse est le réel, c'est le pire champ à mettre en
  haut d'une carte. Ce qui est affiché est ce qui est vrai.
- **Pas de genre musical** : il n'apparaît que dans `tags`, sur une
  partie des lignes, sans garantie.

### Question ouverte

La carte est derrière l'abonnement. Un membre Seed n'en voit rien — pas
même le vide qui tourne, qui serait pourtant la meilleure publicité
pour Plant. À trancher.

---

## 5. THE SIX OPPOSITIONS

| Product | Opposition |
|---|---|
| SEED | Tools for self-improvement → **a system for becoming** |
| PLANT | Social media makes you perform → **TOTEHM lets you learn** |
| TREE | Maps tell you where → **TOTEHM tells you why** |
| COM / LISBON | The city shows you signs → **TOTEHM makes them stimuli** |
| COM / GLOBAL | Drugs alter perception chemically → **TOTEHM explores it digitally** |
| BOUTIQUE | Brands put their identity on you → **TOTEHM turns yours into the object** |

TOTEHM never says *we're better*.
TOTEHM says **you're using the wrong thing for the job.**

---

## 6. THINK SAME. BUT OPPOSITE.

Take an existing cultural code. Keep the energy. Reverse the direction.

- `JUST DO IT` → **`GET HIGHER`**
  What happens when everyone just does it? Raw action and individual optimization
  produce conflict when everyone pushes toward competing individual goals.
  GET HIGHER means: evolve, become more conscious, improve the quality of your
  actions — raise yourself rather than merely push yourself.

- `MAKE AMERICA GREAT AGAIN` → **`MAKE THE WORLD GREAT AGAIN`**
  A cultural analogy about the consequences of tribal optimization: from greatness
  centered on one group to collective elevation.
  **Not a political product. Not political campaigning.**

- `FIGHT CLUB` → **`FIGHER CLUB`**
  Conflict and energy redirected upward.

- brand-centric fashion → **person-centric reflective branding**

---

## 7. BRAND PERSONALITY

TOTEHM must feel:

**underground · street · neurological · minimalist · rebellious · provocative ·
artistic · culturally intelligent · useful**

It should feel like something people *discover*, not something a corporation
*announces*. The tone should say: *"There is something going on here."*

TOTEHM must never look like a productivity startup, a self-help app, a
traditional social network, a classic streetwear brand, or a digital art gallery.

### Minimalist
Few words. Much space. One sentence can beat a paragraph.

### Street
The language can be raw, cultural, slightly provocative, sometimes deliberately
strange.

### Underground
TOTEHM does not try to please everyone. The feeling to produce is having found
something before everyone else understood it.

### Rebellious
Challenge the conventions: social media · branding · self-help · maps ·
advertising · urban signage · perception.

### Provocative
Never gratuitously. **Every punchline must land on a concrete idea.**

> Fuck boring productivity.
> Don't perform your life.
> Your clothes should mean something.
> Those signs were never meant for you.

---

## 8. LANGUAGE RULES

**Prefer:**
GET HIGHER · BUILD YOUR SYSTEM · LEARN FROM REAL PEOPLE · MAKE THE STREET
SUBLIME · PLAY THE STREET · DECODE · TOTEHMIZE · WRITE IT · WEAR IT ·
EXPERIENCE THE BRANDING · EXPERIENCE THE LOGO · EXPERIENCE THE SLOGAN ·
WRITE YOUR STRATEGY IN THE LOGO

**Never:**
platform · solution · innovative · cutting-edge · seamless · empower users ·
next-generation · digital transformation · AI-powered ecosystem ·
community-driven

These words destroy the positioning on contact. TOTEHM should never sound like
SaaS.

---

## 9. HOW TO WRITE A DISCOVER

Every Discover is an independent cultural argument. There are **six**, one per
product, not one per domain:

1. `totehm.com` — Lisbon
2. `totehm.com` — International
3. `totehm.space` — SEED
4. `totehm.space` — PLANT
5. `totehm.space` — TREE
6. `higher.boutique` — Branding / Cloth

### Structure

```
01 PROVOCATION      attack the norm
02 REFRAME          make the problem visible differently
03 TOTEHM'S OPPOSITE reveal the new paradigm
04 EXPERIENCE       make the product felt
05 ECOSYSTEM        show subtly that another door exists
06 ENTRY            make them want in
```

**Never open with:** "TOTEHM is a platform…" · "Our mission is…" · "Here are our
features."

**Open with the problem:**
> Everyone tracks their life. Who actually builds it?
> You see these signs every day. Why do they do nothing for you?
> Your feed is full of people performing a life. Who is teaching you to build one?

The reader should finish thinking:
> "Why doesn't this already exist?"
then
> "I want in."
then
> "I want to see what's behind the other doors."

Not: *"Cool website."*

---

## 10. EACH PRODUCT HAS ITS OWN DESIRE

| | |
|---|---|
| `totehm.com` | I want to experience this. |
| `totehm.space` | I want to build myself here. |
| `higher.boutique` | I want to wear something that actually means something. |

Never replace these with "Join the TOTEHM ecosystem."
The ecosystem is the underlying architecture. The product desire is the user's
immediate reason to enter.

---

## 11. THE ORDER OF QUESTIONS

When designing, writing or coding anything TOTEHM, in this order:

1. What does this product independently do?
2. What existing cultural function is it challenging?
3. Why would someone want it?
4. **Only then:** where can another TOTEHM product naturally become useful?

```
STRONG INDEPENDENT PRODUCTS
        +
NATURAL CROSSOVER
        =
STRONG TOTEHM ECOSYSTEM
```

---

## 13. VISUAL STYLE — RÈGLES ABSOLUES

Ces règles s'appliquent à `totehm.com`. Certaines sont transverses à tout l'écosystème.

### Polices

| Famille | Fallback | Usage | Poids |
|---|---|---|---|
| **Space Mono** | monospace | Textes narratifs (G — prose, descriptions) | 400 |
| **Quantico** | sans-serif | Accents (C), boutons, labels, inputs | 400 (accents) · 700 (boutons) |
| **Space Mono** | monospace | Métadonnées (M), hints, notes | 400 |
| **Montserrat Italic** | — | SVG `#higher-slogan` uniquement | 900 |

### Couleurs

**Variables CSS**

| Variable | Valeur | Usage |
|---|---|---|
| `--coral` | `#fbd5ca` | Uniquement le "Get" du bouton CTA |
| `--g-light` | `#e0e0e0` | Texte Space Mono (narration) |
| `--g-mid` | `#909090` | Hints (`disc-hint`, `vhint`) |
| `--g-dark` | `#606060` | Variable de référence — non utilisée directement |
| `--bg` | `#000` | Fond — noir absolu |
| `--plus` | `#36498c` | Navy — bordure perforée des boutons |

**Valeurs fixes**

| Valeur | Usage |
|---|---|
| `#ebebeb` | Quantico accent (C) dans le Discover |
| `#a0a0a0` | Boutons secondaires — Back, Close, trigger label, chevron, liens sobres |
| `#b0b0b0` | `.btn-sig` au repos |
| `#9a9a9a` | Notes / `.note.dim` |
| `#ffffff` | Glyphe T.svg — toujours blanc. État hover/actif de tous les éléments |

### Règles de design — non négociables

**1. Le coral est réservé au "Get"**
`#fbd5ca` n'apparaît que sur le mot "Get" dans le bouton CTA `Get [Higher]`.
Nulle part ailleurs dans le Discover. Dans le paywall, les labels coral sont tolérés.

**2. "Higher" toujours en SVG slogan**
Le mot "Higher" est toujours rendu via `<use href="#higher-slogan">`.
Jamais écrit en texte, jamais en webfont, jamais en PNG dans une UI interactive.
En email uniquement : PNG.

**3. Le T de TOTEHM toujours en glyphe SVG**
`Time`, `Temporal` et toute occurrence du T TOTEHM utilisent `<use href="#t-glyph">`.
Le glyphe est **toujours blanc** (`fill="#ffffff"` hardcodé dans le symbole),
indépendamment du contexte couleur du texte parent.
Syntaxe inline : `<svg style='display:inline-block;width:.62em;height:.85em;vertical-align:-.08em' viewBox='0 0 60 80' aria-hidden='true'><use href='#t-glyph'/></svg>ime`

**4. Tous les textes gris → blanc au survol sur desktop**
Règle d'or : `@media(hover:hover)` — tout élément dont la couleur est un gris
(trois canaux < 230, ou blanc translucide) passe en `#fff` au survol.
Sans exception. Les couleurs d'intention et le coral gardent leur teinte.

**5. Deux familles de boutons**

- **CTA / achat** — `.btn-sig`, `.trigger-label` : Quantico Bold 700, 14px, `#b0b0b0`.
- **Navigation / retour** — `#disc-back`, `#xp-close`, `#world-close`, `#terms-link` : Space Mono 400, 10px, uppercase, `letter-spacing:.14em`, `#9a9a9a`.

Les deux passent en `#fff` au survol sur desktop.

**6. Fond noir, aucun fond gris**
`background: #000` partout. Un gris comme surface fait "application".
Le gris ne sert qu'au texte secondaire.

**7. Pas de flèches dans les boutons**
Les boutons de navigation (`Back`, `Play the street`, `Close`) n'ont pas d'icône fléchée.
Le texte suffit.

**8. Le contenu est toujours centré**
Tout contenu principal — texte, boutons, médias — est centré horizontalement et verticalement.
Aucun alignement gauche ou droite pour le contenu principal. Jamais de layout à colonnes.

**9. Les quatre coins — règle absolue**
```
[ESPACE MEMBRE]          [SIMPLE TERMS OF USE / SALE]
        ↑                           ↑
   coin haut gauche          coin haut droit
```
- **Coin haut gauche** : accès espace membre uniquement. Rien d'autre.
- **Coin haut droit** : lien sobre vers les conditions de vente ou d'utilisation (`Simple terms of sale` / `Simple terms of use`). Rien d'autre.
- **Simple terms of sale/use** : Space Mono 400, 10px, uppercase, `letter-spacing:.14em`, `#9a9a9a`, blanc au survol.
- **Espace membre** : Quantico Bold, `#a0a0a0`, blanc au survol.
- Ces deux éléments ne bougent pas quels que soient le scroll, les slides ou les overlays.

### Structure typographique du Discover (`totehm.com`)

| Type | Classe CSS | Rendu |
|---|---|---|
| `G(x)` | `.t-space-mono` | Space Mono 400, `#e0e0e0` — narration |
| `C(x)` | `.t-coral.coral-line` | Quantico 400, `#ebebeb` — passages mis en valeur |
| `M(x)` | `.t-mono` | Space Mono 400, `#9a9a9a` — métadonnées |
| CTA | `.btn-start` | "Get" coral + `#higher-slogan` SVG |

L'animation `settle` (blur → net) s'applique aux `.coral-line` au reveal.

---

## 12. ONE-SENTENCE SOURCE OF TRUTH

> TOTEHM is a connected ecosystem of independent products: an experience that
> changes how you perceive, a system that changes how you build yourself, and a
> brand that changes how your story becomes physical.

Never reduce one product to another.
Never make one domain depend on another for meaning.

**Independence creates the products. Connection creates the world.**
