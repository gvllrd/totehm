# -*- coding: utf-8 -*-
"""LOT DU 18/09/2026 · LES PORTES, LE SLOGAN, ET LA MONETISATION
    python3 tools/lot18_monetisation.py
⚠️ N'ECRIT QU'A LA FIN.
"""
import os, sys
SC = os.path.dirname(os.path.abspath(__file__)) + '/'
P  = SC + '../com/totehm.html'
rates = []

def ech(s, vieux, neuf, quoi, attendu=1):
    n = s.count(vieux)
    if n != attendu:
        rates.append('%s : %d fois, attendu %d\n      %s' % (quoi, n, attendu, vieux.strip()[:96]))
        return s
    return s.replace(vieux, neuf)

s = open(P, encoding='utf-8').read()
HSVG = ('<svg class="higher-inline" viewBox="0 0 600 200" role="img" '
        'aria-label="Higher"><use href="#higher-badge"></use></svg>')

# ═══════════════════════════════════════════════════════════════════════
# 1 · « HIGHER » EST TOUJOURS LE SLOGAN, JAMAIS UN MOT TAPÉ
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""  <button class="door" id="door-next" type="button">My Higher Self</button>""",
"""  <!-- ⚠️ « HIGHER » NE S'ÉCRIT JAMAIS EN TEXTE — RÈGLE DE MARQUE.
       C'est un slogan, donc un SVG, partout et sans exception. Tapé au
       clavier il devient un mot ordinaire dans la fonte du système, et
       la marque s'éteint à l'endroit exact où elle devrait parler. -->
  <button class="door" id="door-next" type="button">My """ + HSVG + """ Self</button>""",
'My Higher Self en slogan')

# ── la porte du Club devient la porte de la boutique
s = ech(s,
"""  <!-- ══ LA PORTE DU CLUB · 15/09/2026 ═══════════════════════════════
       `totehm.space/club` — MÊME ORIGINE, donc même session. C'est
       toute la raison pour laquelle le Club n'est pas sur un quatrième
       domaine : on y entre sans se reconnecter.
       `figher.club` est un vanity URL qui redirige ici. -->
  <button class="door door-club" id="door-club" type="button">The Figher Club</button>""",
"""  <!-- ══ LA TROISIÈME PORTE MÈNE À LA BOUTIQUE · 18/09/2026 ══════════
       Elle menait au Club. Le Club devient une PAGE DE VENTE — il n'a
       rien à offrir à quelqu'un qui n'est pas encore membre, et une
       porte vers une page de vente depuis l'intérieur du produit, c'est
       une publicité chez soi.
       La boutique, elle, est le geste suivant naturel : on a son Totehm,
       on le porte. ⚠️ Autre domaine, donc autre session : elle passe par
       le pont. -->
  <button class="door door-club" id="door-club" type="button">Totehmize my cloth</button>""",
'porte de la boutique')

s = ech(s,
"""$('door-club').onclick=requireMember(()=>{ location.href='/club'; });""",
"""$('door-club').onclick=requireMember(()=>{
  ssoVersDomaine(sb,'boutique','https://higher.boutique/#menu'); });""",
'cablage de la boutique')

# ═══════════════════════════════════════════════════════════════════════
# 2 · LE NOM ET LA VISIBILITÉ REVIENNENT DANS L'ESPACE MEMBRE
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""      <!-- ══ TROIS BLOCS ONT QUITTÉ L'ESPACE MEMBRE · 15/09/2026 ═══════
           Le NOM, la VISIBILITÉ et la RECHERCHE sont maintenant sur
           l'ATTERRISSAGE, au-dessus du logo.

           Pourquoi : ce sont les trois seules choses qu'on règle AVANT
           d'entrer, pas pendant. Nommer son Totehm et décider qui le
           voit, c'est la carte de visite ; chercher celui d'un autre,
           c'est la porte d'à côté. Rien de tout ça n'est un réglage
           qu'on va chercher à deux gestes une fois dedans.
           Ce qui reste ici est ce qui ne concerne QUE le membre connecté :
           l'abonnement, le bot, le compte. -->
""",
"""      <!-- ══ LE NOM ET LA VISIBILITÉ REVIENNENT ICI · 18/09/2026 ══════
           Ils étaient passés sur l'atterrissage le 15/09, avec cette
           raison : « on les règle avant d'entrer, pas pendant ». Elle ne
           tient plus. La visibilité n'est plus un réglage de confort,
           c'est le COMMUTATEUR DE MONÉTISATION : choisir « visible to my
           paying followers », c'est ouvrir sa boutique. Ça ne se décide
           pas sur un écran d'accueil entre deux boutons — ça se décide
           dans son compte, à côté de l'abonnement et des virements.
           La RECHERCHE, elle, reste sur l'atterrissage : c'est la porte
           d'à côté, pas un réglage.

           ⚠️ CE SONT LES MÊMES NŒUDS, DÉPLACÉS — pas des copies. Deux
           champs « nom du Totehm » dans le même document finiraient par
           afficher deux valeurs différentes, et `paintNameButton()` n'en
           peindrait qu'un. -->
      <div class="set-block" id="ident-block">
        <button class="btn-sig gid" id="name-btn">Name of my Totehm</button>
        <input class="line-input hide" id="set-name" maxlength="24" placeholder="my Totehm" autocomplete="off" spellcheck="false">
        <div class="note dim hide" id="name-note"></div>

        <button class="btn-sig gid" id="vis-btn">Visibility</button>
        <div class="hide" id="vis-panel"><div class="row">
          <button class="size-btn" id="set-private">Private</button>
          <!-- ⚠️ LE MOT DIT CE QU'IL FAIT. « Visible to members » ne
               disait rien de l'argent ; c'est pourtant ce que ça
               déclenche. -->
          <button class="size-btn" id="set-members">Visible to my paying followers</button>
        </div></div>
      </div>

      <!-- ══ L'ESPACE CRÉATEUR S'OUVRE AVEC LA VISIBILITÉ PAYANTE ══════
           Il ne s'affiche que si le membre a choisi d'être suivi contre
           paiement : avant ce choix, il n'a rien à y faire. -->
      <div class="set-block hide" id="creator-block">
        <div class="mw-body">Your followers subscribe to your Totehm. You keep
          <b>80 %</b> of every payment — TOTEHM keeps 20 %.</div>
        <div class="note dim" id="creator-note"></div>
        <button class="btn-sig" id="creator-btn" type="button">Open my creator space</button>
      </div>
""",
'nom et visibilite dans l espace membre')

# ── le bloc quitte l'atterrissage
s = ech(s,
"""  <!-- Le nom et la visibilité appartiennent à l'identité : ils restent
       collés sous le bouton, et n'existent que pour un membre. -->
  <div id="gate-id">
    <button class="btn-sig gid" id="name-btn">Name of my Totehm</button>
    <input class="line-input hide" id="set-name" maxlength="24" placeholder="my Totehm" autocomplete="off" spellcheck="false">
    <div class="note dim hide" id="name-note"></div>

    <button class="btn-sig gid" id="vis-btn">Visibility</button>
    <div class="hide" id="vis-panel"><div class="row"><button class="size-btn" id="set-private">Private</button><button class="size-btn" id="set-members">Visible to members</button></div></div>
  </div>
""",
"""  <!-- ⚠️ LE NOM ET LA VISIBILITÉ SONT REPARTIS DANS L'ESPACE MEMBRE le
       18/09 : la visibilité est devenue le commutateur de monétisation,
       et ça se règle dans son compte, pas sur l'écran d'accueil.
       `#gate-id` ne porte plus que la recherche. -->
""",
'retrait du bloc de l atterrissage')

# ── la recherche reste, dans son propre conteneur
s = ech(s,
"""#gate-id{display:flex;flex-direction:column;align-items:center;gap:7px;
  width:100%;max-width:340px;margin:0 auto;padding:0 18px}""",
"""/* `#gate-id` n'existe plus : la recherche a son propre bloc,
   `#gate-search`, et le nom et la visibilité sont dans l'espace membre. */""",
'CSS de gate-id')

# ═══════════════════════════════════════════════════════════════════════
# 3 · LE MOTEUR DE LA MONÉTISATION
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""$('set-private').onclick=()=>{state.vis='private';save();renderSettings();};
$('set-members').onclick=()=>{state.vis='members';save();renderSettings();};""",
"""$('set-private').onclick=()=>{state.vis='private';save();renderSettings();peintCreateur();};
$('set-members').onclick=()=>{state.vis='members';save();renderSettings();peintCreateur();};

/* ══ L'ESPACE CRÉATEUR · 18/09/2026 ══════════════════════════════════
   Il n'apparaît qu'une fois la visibilité payante choisie : avant ce
   choix, un membre n'a rien à y faire, et un bloc qui ne sert à rien
   apprend à ne plus regarder les autres.

   ⚠️ CE BLOC NE FAIT PAS LE TRAVAIL DE `/club/creator` : il l'ANNONCE et
   il y mène. Recopier ici les soldes, le prix et l'état Stripe, ce
   serait deux tableaux de bord à tenir d'accord — et le jour où ils
   divergeront, c'est sur un montant que ça se verra. */
async function peintCreateur(){
  const b=$('creator-block'); if(!b)return;
  const ouvert = !!me && state.vis==='members';
  b.classList.toggle('hide',!ouvert);
  if(!ouvert)return;
  const n=$('creator-note'); n.className='note dim'; n.textContent='';
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session)return;
    const r=await fetch('https://abujjbkbbiumxrokozph.supabase.co/functions/v1/creator-dashboard',{
      method:'POST',
      headers:{'authorization':'Bearer '+session.access_token,
               'apikey':SB_ANON,'content-type':'application/json'},
      body:'{}'});
    if(!r.ok){ console.error('[totehm] creator-dashboard',r.status); return; }
    const d=await r.json();
    if(d.etat==='aucun'){ n.textContent='not open yet — start with Stripe'; return; }
    const vivant=d.compte&&d.compte.charges_enabled&&d.compte.payouts_enabled;
    n.className=vivant?'note ok':'note dim';
    n.textContent = vivant
      ? (d.abonnes||0)+' subscriber'+((d.abonnes||0)===1?'':'s')
      : 'Stripe is still reviewing your account';
  }catch(e){ console.error('[totehm] creator',e&&e.message||e); }
}
$('creator-btn').onclick=()=>{ location.href='/club/creator'; };""",
'moteur de l espace createur')

# ── il se peint a l'ouverture du menu
s = ech(s,
"""$('conn-bar').onclick=()=>{
  if(!document.body.classList.contains('gate'))return;
  $('member-window').classList.add('show'); memberPaint(); };""",
"""$('conn-bar').onclick=()=>{
  if(!document.body.classList.contains('gate'))return;
  $('member-window').classList.add('show'); memberPaint(); peintCreateur(); };""",
'peinture a l ouverture')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (monetisation)')
