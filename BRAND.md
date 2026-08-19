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

## Higher Map — le Void Radar — 19/08/2026

**Le monde est vide jusqu'à ce que l'intention le projette.**

La Higher Map ne charge aucune tuile cartographique et ne charge aucun
lieu à l'ouverture. Fond noir, grille, anneaux de portée, un balayage
qui tourne, et ton T au centre. Rien d'autre. Le système pose une seule
question : quelle est ton intention, là, maintenant.

C'est seulement quand tu réponds que le monde apparaît.

### Le flow, en trois temps

1. **Le vide.** Swipe sur l'étage 1. Le radar tourne autour de toi. Il
   n'y a rien à regarder parce qu'il n'y a rien à faire tant que tu
   n'as pas décidé.
2. **La décision.** Tu choisis une intention. Une seule.
3. **La projection.** Les T naissent du centre vers l'extérieur, du
   plus proche au plus lointain. Le radar s'allume à la couleur de ton
   intention.

Ce n'est pas un détail d'animation : c'est la thèse du produit rendue
visible. Le monde ne te propose rien. C'est ton intention qui fait
apparaître ce qui compte.

### Les règles tenues

- **Le seul glyphe autorisé est le T.** Pas de pin, pas de goutte, pas
  d'icône de catégorie. Toi au centre en blanc pur, les lieux autour à
  la couleur de l'intention.
- **Le sélecteur montre TES intentions.** Il est construit depuis ton
  Totehm, pas depuis ce qui traîne autour de toi. Si tu n'as posé
  aucune intention sur tes habitudes, le radar te renvoie à tes
  habitudes — c'est le bon endroit pour commencer.
- **Le HUD dort.** Tout le texte d'interface démarre à 38 %. Un geste
  le réveille quatre secondes. Une intention choisie l'allume, puis le
  sélecteur s'efface pour laisser le radar respirer.
- **Un lieu écrit vaut plus qu'un lieu trouvé.** Les spots éditoriaux
  passent devant les lieux Google et leur T est plus lumineux. La
  distinction se voit sans être expliquée.
- **Quinze T maximum.** Au-delà l'écran devient une soupe et le choix
  redevient impossible.
- **Le radar s'affiche toujours.** Géolocalisation refusée, GPS muet,
  permission bloquée : repli sur Lisbonne, annoncé à l'écran. Un écran
  vide au démarrage est le design ; un écran vide après une décision
  est un bug.

### Aucune librairie de carte

Un `<canvas>` et des `<div>` suffisent. Le radar ne dépend plus d'un
script tiers pour s'afficher, et l'écran ne charge rien avant que le
membre ait décidé.

### Question ouverte

Le radar est derrière l'abonnement. Un membre Seed n'en voit rien — pas
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

## 12. ONE-SENTENCE SOURCE OF TRUTH

> TOTEHM is a connected ecosystem of independent products: an experience that
> changes how you perceive, a system that changes how you build yourself, and a
> brand that changes how your story becomes physical.

Never reduce one product to another.
Never make one domain depend on another for meaning.

**Independence creates the products. Connection creates the world.**
