# -*- coding: utf-8 -*-
"""LES DEUX JUMEAUX DU TOTEHM — 13/09/2026

    python3 tools/jumeau.py

`wisdom.html` (rouge-violet) et `vision.html` (bleu clair) doivent donner
l'impression qu'on a seulement changé le FOND du Totehm. Tout le reste est
le MÊME objet, à la même place, au pixel : le T en haut, le rail à gauche,
le TOTEHM en bas, l'accès membre au-dessus du T, la croix en haut à droite,
et la piste de classement dans le rail.

POURQUOI ON LES GÉNÈRE AU LIEU DE LES ÉCRIRE
Deux copies tenues à la main divergent toujours, et ici la divergence se
verrait au premier saut de logo — c'est exactement ce que Wah a signalé
deux fois. La source est `totehm.html` ; le script en dérive les jumeaux.
On COPIE (règle du projet : produits indépendants = fichiers
indépendants), mais on copie par une machine, donc sans dérive.

CE QUI CHANGE, ET RIEN D'AUTRE
  1. le titre de la page ;
  2. `--paper` et `--skin` — le fond et la couleur des boîtes ;
  3. le moteur de liste : une table, un texte, une importance ;
  4. les trois carrés de vue disparaissent (il n'y a qu'une liste) ;
  5. la croix ramène au Totehm DÉPLOYÉ (`totehm.html#in`).

Chaque remplacement est ancré sur un repère qui doit exister EXACTEMENT
une fois. Si `totehm.html` a bougé, le script s'arrête et dit lequel, au
lieu de coller du code à côté de sa place. Il n'écrit qu'à la fin.
"""
# ⚠️ LE RÉSEAU SOCIAL VIT DANS `com/` DEPUIS LE SWAP DU 15/09/2026.
#    Le nom du dossier ne dit PLUS ce qu'il sert : `com/` = le Totehm,
#    `space/` = le branding. Le mapping Vercel n'a pas bougé (projet com
#    -> dossier com), donc ce sont les URL publiques qui ont changé de
#    rôle. Lire CLAUDE.md § « L'architecture technique » avant de
#    déplacer quoi que ce soit.
import io, os, sys

SC = os.path.dirname(os.path.abspath(__file__)) + '/'
SRC = SC + '../com/totehm.html'

JUMEAUX = [
    dict(nom='wisdom.html', titre='TOTEHM — my wisdom',
         table='wisdom', mot='teaching', bouton='Add a teaching',
         vide='no teaching yet',
         skin='#743169', paper='#5b2652', timbre='%23743169',
         dit="What you have learned. One lesson per box."),
    dict(nom='vision.html', titre='TOTEHM — my vision',
         table='visions', mot='vision', bouton='Add a vision',
         vide='no vision yet',
         skin='#36498c', paper='#2b3a73', timbre='%2336498c',
         dit="Only what you see coming, and only the good of it."),
]


def ech(s, vieux, neuf, quoi):
    n = s.count(vieux)
    if n != 1:
        sys.exit('ARRET · %s · le repere apparait %d fois :\n  %s'
                 % (quoi, n, vieux.strip()[:110]))
    return s.replace(vieux, neuf)


# ═══════════════════════════════════════════════════════════════════════
# LE MOTEUR DU JUMEAU — il remplace celui des trois vues
# ═══════════════════════════════════════════════════════════════════════
MOTEUR = """
/* ══ LE MOTEUR DU JUMEAU (tools/jumeau.py) ══════════════════════════
   Une seule liste, une seule couleur, une seule table. La BOÎTE est
   exactement celle du Totehm — `boiteHTML` n'est pas réécrite, elle est
   appelée avec moins de choses à montrer. C'est tout l'intérêt d'avoir
   une seule boîte dans le produit.

   Pas de petit T à gauche du rail : `tickHTML` reçoit une liste vide.
   Une intention sur une leçon ou sur une vision ne voudrait rien dire —
   la même règle que pour les objectifs et les répulsions. */
let ITEMS=[], itemsCharges=false, ISEQ=0;
const itemOf=id=>ITEMS.find(x=>String(x.id)===String(id))||null;

async function chargeItems(){
  if(!me)return;
  await calme();
  const {data,error}=await sb.from('__TABLE__')
    .select('id,text,i,importance,created_at')
    .eq('user_id',me.id)
    .order('importance',{ascending:true,nullsFirst:false})
    .order('created_at',{ascending:true});
  if(error){console.error('[totehm] __TABLE__:',error.message);return;}
  ITEMS=(data||[]).map(r=>({id:r.id,t:r.text||'',t0:r.text||'',i:r.i||null,
                            rang:r.importance}));
  itemsCharges=true; renderZone();
}

/* L'IMPORTANCE EST UNE COLONNE, pas un ordre implicite. On la réécrit en
   entier quand le classement bouge : c'est une liste de quelques dizaines
   de lignes, et un rang sur deux qui manque produit un ordre instable. */
function poseRangs(){
  if(!me)return;
  const w=ITEMS.map((x,k)=>({id:x.id,importance:k}));
  w.forEach(r=>{ const x=itemOf(r.id); if(x)x.rang=r.importance; });
  apres(sb.from('__TABLE__').upsert(w.map(r=>({id:r.id,user_id:me.id,
        text:(itemOf(r.id)||{}).t||'', importance:r.importance})),
        {onConflict:'id'}));
}

async function creerItem(){
  if(!me){$('member-window').classList.add('show');
          if(typeof memberPaint==='function')memberPaint();return;}
  const {data,error}=await sb.from('__TABLE__')
    .insert({user_id:me.id,text:'',importance:0}).select('id').maybeSingle();
  if(error){console.error('[totehm] insert:',error.message);return;}
  const x={id:data.id,t:'',t0:'',i:null,rang:0};
  ITEMS.unshift(x); poseRangs(); ouvrir('w',x.id);
}

function tueItem(id){
  const x=itemOf(id); if(!x)return;
  pousse('w:'+id); wSlots.delete('w:'+id);
  ITEMS=ITEMS.filter(z=>String(z.id)!==String(id));
  apres(sb.from('__TABLE__').delete().eq('id',id));
  poseRangs(); fermer();
}

/* ── LE RENDU ────────────────────────────────────────────────────── */
function renderZone(){
  const box=$('habits'); if(!box)return;
  const sc=$('fv-inner'); const keep = sc?sc.scrollTop:null;

  let h='';
  h=ITEMS.map((x,k)=>{
    const ouverte = !!open && String(open.id)===String(x.id);
    return ligne(boiteHTML({kind:'w',id:x.id,titre:x.t,unit:'',minis:'',
                            ouverte,tue:'Delete __MOT__'}),
      ouverte?'open':'', null, k+1, x.id, k===0, k===ITEMS.length-1);
  }).join('');
  if(!ITEMS.length)h+='<div class="void">'
    +(me?(itemsCharges?'__VIDE__':'loading…'):'sign in to write')+'</div>';
  h+=ligne('<button type="button" class="add-box" data-add="w">+ <b>__BOUTON__</b></button>','add');

  box.innerHTML=h;
  /* ⚠️ LE JUMEAU DOIT PEINDRE LE MODE, LUI AUSSI. `paintZone()` du Totehm
     pose `body.ordering` — sans elle, le rail ne s'élargit pas et
     ORDER BY IMPORTANCE reste caché, alors que le classement FONCTIONNE.
     Un mode actif qui ne se voit pas est pire qu'un mode absent. */
  document.body.classList.toggle('ordering',ordering);
  if(keep!=null&&sc)sc.scrollTop=keep;
  window.__totehm_zone={vue:'__TABLE__', session:!!me, charge:itemsCharges,
    lignes:ITEMS.length, boite_ouverte:open?String(open.id):null,
    classement:ordering};
  cable(box);
}

function ouvrir(kind,id){
  open={kind:'w',id:String(id)}; pk=null; renderZone();
  const b=$('habits').querySelector('.habit.open'); if(!b)return;
  requestAnimationFrame(()=>{const sc=$('fv-inner'); if(!sc)return;
    sc.scrollTop=sc.scrollTop+b.getBoundingClientRect().top-sc.getBoundingClientRect().top-6;});
  const f=b.querySelector('.v-name[contenteditable]');
  if(f&&window.innerWidth>700)f.focus();
}
function fermer(){ pousse(); open=null; pk=null; renderZone(); }

/* ── LE CÂBLAGE — le même qu'au Totehm, avec moins de gestes ─────── */
let cableFait=false;
function cable(box){
  if(cableFait)return; cableFait=true;
  box.addEventListener('click',e=>{
    const el=e.target.closest('[data-open],[data-add],[data-x],[data-mv],[data-kill]');
    if(!el)return; const d=el.dataset;
    if(d.open){ ouvrir('w',d.open.split(':')[1]); return; }
    if(d.add){ creerItem(); return; }
    if(d.x!==undefined){ e.stopPropagation(); fermer(); return; }
    e.stopPropagation();
    if(d.mv){ const p=d.mv.split(':'); bouge(p[0],p[1]); return; }
    if(d.kill){ tueItem(d.kill.split(':')[1]); return; }
  });
  box.addEventListener('keydown',e=>{
    const el=e.target.closest&&e.target.closest('[data-open]');
    if(el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();
      ouvrir('w',el.dataset.open.split(':')[1]);}
  });
  /* TOUT S'ENREGISTRE EN ÉCRIVANT. Aucun bouton [Done], ici non plus. */
  box.addEventListener('input',e=>{
    const t=e.target; if(!t.dataset.edit)return;
    const x=itemOf(t.dataset.edit.split(':')[1]); if(!x)return;
    x.t=t.textContent;
    differe('w:'+x.id,()=>{ x.t0=x.t;
      apres(sb.from('__TABLE__').update({text:x.t}).eq('id',x.id)); });
  });
}

"""


def fabrique(src, j):
    s = src

    # 1 · LE TITRE
    s = ech(s, '<title>TOTEHM — My Totehm</title>',
            '<title>%s</title>' % j['titre'], 'le titre')

    # 2 · LA COULEUR — le fond et les boîtes, rien d'autre
    # ⚠️ SUR ORDINATEUR, CE QU'ON VOIT C'EST LE TIMBRE, PAS LE PAPIER.
    #    La page est NOIRE (`html,body{background:#000}` dans le bloc
    #    desktop) et toute la couleur vient du carré perforé `#stage`,
    #    peint par l'image `--logo-navy`. Je n'avais changé que `--paper`
    #    — donc sur téléphone le jumeau était bien rouge-violet, et sur
    #    ordinateur il restait NAVY. C'est exactement ce qui a été
    #    signalé : « wisdom doit avoir le background du timbre ».
    s = ech(s, "fill='%23333366'/%3E%3Ccircle",
            "fill='" + j['timbre'] + "'/%3E%3Ccircle", 'le timbre du jumeau')

    s = ech(s, '  --paper:#2b2b57;',
            """  /* LE JUMEAU N'A QU'UNE COULEUR. Le papier recule d'un ton sous
     elle, exactement comme au Totehm : un bloc de la couleur du papier
     est invisible (mesuré deux fois, ça ne se redémontre plus). */
  --paper:%s;""" % j['paper'], 'le papier du jumeau')

    s = ech(s, """#stage.v-h{--skin:var(--navy)}
#stage.v-o{--skin:var(--blue)}
#stage.v-r{--skin:var(--rep)}""",
            """/* Une seule peau : il n'y a qu'une liste. */
#stage,#stage.v-h,#stage.v-o,#stage.v-r{--skin:%s}""" % j['skin'],
            'la peau du jumeau')

    # 3 · LES TROIS CARRÉS DISPARAISSENT — il n'y a qu'une liste
    s = ech(s, '#views{position:fixed;',
            """/* PAS DE SÉLECTEUR DE VUE : le jumeau n'a qu'une liste. Le mot du
   haut dit ce qu'on écrit, et c'est tout ce qu'il y a à savoir. */
#views{display:none!important}
#views-off{position:fixed;""", 'les trois carres disparaissent')

    s = ech(s, '<div id="views" class="sink-el" role="tablist"',
            '<div id="views" class="sink-el" hidden role="tablist"',
            'et leur balisage aussi')

    # Le mot du haut, à la place des trois carrés.
    s = ech(s, '<div id="rail" class="sink-el"></div>',
            """<div id="rail" class="sink-el"></div>
<div id="jum-say" class="sink-el">%s</div>""" % j['dit'], 'le mot du haut')

    s = ech(s, '#vname` a disparu : chaque carré porte son nom (voir `.vt-n`). */',
            """#vname` a disparu : chaque carré porte son nom (voir `.vt-n`). */
/* LE MOT DU JUMEAU, à la place exacte des trois carrés : même hauteur,
   même bande fixe, donc le même écart avec la première boîte. */
/* LA FUSION : tout ce qui porte la couleur du jumeau revient au navy du
   Totehm, ensemble, en 200 ms. Une transition sur `background-color` et
   sur `--skin` suffit — rien ne bouge, seule la teinte voyage. */
#stage,.habit .h-body{transition:background-color .2s linear,background-image .2s linear}
body.vers-totehm{--skin:#333366}
body.vers-totehm #stage{background-image:none;background-color:#333366}
#jum-say{position:fixed;top:104px;left:50%;transform:translateX(-50%);
  z-index:33;max-width:min(80vw,420px);text-align:center;
  font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.2em;
  text-transform:uppercase;color:rgba(255,255,255,.42);
  line-height:1.7;pointer-events:none}""", 'le style du mot du haut')

    # Le gate cache et révèle le mot comme il fait des carrés.
    s = s.replace('body.gate #views,', 'body.gate #views,body.gate #jum-say,')
    s = s.replace('body.gate.entered #views,',
                  'body.gate.entered #views,body.gate.entered #jum-say,')

    # 4 · LE MOTEUR
    a = '/* ══ LA ZONE — UNE SEULE BOÎTE'
    b = '/* ══ LE CLASSEMENT PAR IMPORTANCE'
    i, k = s.find(a), s.find(b)
    if i < 0 or k < 0 or k < i:
        sys.exit('ARRET · les reperes du moteur sont introuvables')
    moteur = (MOTEUR.replace('__TABLE__', j['table'])
                    .replace('__MOT__', j['mot'])
                    .replace('__BOUTON__', j['bouton'])
                    .replace('__VIDE__', j['vide']))
    # On garde de la zone d'origine les briques partagées : la boîte, la
    # ligne, le rang. Elles sont AVANT le rendu — on les recopie telles quelles.
    zone = s[i:k]
    # ⚠️ UNE SEULE TRANCHE, PAS QUATRE. J'extrayais les briques par
    #    paires de repères qui se CHEVAUCHAIENT — `boiteHTML → ligne`
    #    contient déjà `rangHTML`, que je reprenais ensuite : d'où
    #    « Identifier 'rangHTML' has already been declared », et une
    #    SyntaxError emporte le module entier. Le début de la zone
    #    jusqu'à l'état d'ouverture est CONTIGU et contient exactement
    #    les briques partagées, dans l'ordre, une seule fois.
    fin = zone.find('/* ══ CE QUI EST OUVERT')
    if fin < 0:
        sys.exit('ARRET · la fin des briques partagees est introuvable')
    garde = ("""/* Ces briques sont RECOPIÉES de totehm.html par le script : la boîte
   d'un jumeau est la boîte du Totehm, au pixel. */
let pk=null;
""" + zone[:fin] + '\n')
    s = s[:i] + garde + moteur + '\n' + s[k:]

    # La liste du classement est celle du jumeau. On REMPLACE les
    # originaux au lieu d'en déclarer d'autres : `const` ne se réassigne
    # pas, et deux déclarations du même nom sont une SyntaxError qui
    # emporte tout le module.
    s = ech(s, """const listeDe=v=>v==='habits'?(state.habits||[]):v==='objectives'?TRIPS:REPS;""",
            """const listeDe=()=>ITEMS;""", 'la liste du classement')
    s = ech(s, """function poseListe(v,arr){
  if(v==='habits'){state.habits=arr;state.ord=true;save();}
  else if(v==='objectives')TRIPS=arr; else REPS=arr;}""",
            """function poseListe(_v,arr){ ITEMS=arr; poseRangs(); }""",
            'et la pose du classement')

    # 5 · LA CROIX RAMÈNE AU TOTEHM DÉPLOYÉ
    s = ech(s, "$('fold-x').onclick=()=>foldToGate();",
            """/* ⚠️ LA CROIX NE REPLIE PAS — ELLE REVIENT. Un jumeau n'a pas
   d'atterrissage à lui : il n'est accessible QUE depuis le Totehm
   déployé, donc le fermer veut dire retourner d'où l'on vient. `#in`
   dit à `totehm.html` de s'ouvrir déjà déployé, sans rejouer le
   dépliage — sinon on paierait l'animation à chaque aller-retour. */
$('fold-x').onclick=()=>{
  /* ⚠️ UNE FUSION, PAS UN SAUT · 15/09/2026. Le châssis est identique au
     pixel entre un jumeau et le Totehm : la SEULE chose qui change est la
     couleur. Alors on la change AVANT de naviguer — 200 ms de fondu vers
     le navy — et l'œil lit un seul écran qui se repeint, pas deux pages
     qui se remplacent. Le chargement se fait derrière le fondu, donc il
     ne coûte rien de plus. */
  document.body.classList.add('vers-totehm');
  setTimeout(()=>{ location.href='totehm.html#in'; },200);
};""",
            'la croix ramene au Totehm deploye')

    # 6 · LE JUMEAU N'A PAS D'ATTERRISSAGE — ON L'ARRACHE
    #     ⚠️ Retirer la CLASSE ne suffisait pas : `#gate` reste dans le
    #     document, et `#terms-corner` qui vit dedans est en `position:
    #     fixed` — mesuré, il interceptait le clic sur la croix pendant
    #     que tout le reste semblait normal. Un jumeau ne se déplie pas :
    #     le bloc entier part, et la classe avec.
    # Le repère porte le saut de ligne : sans lui il matche AUSSI la
    # mention du même texte dans un commentaire, plus bas. Un repère
    # ambigu, c'est un script qui colle du code à côté de sa place.
    s = ech(s, '<body class="gate">\n', '<body>\n', 'le corps sans atterrissage')
    # ⚠️ LA CARTE DE VISITE SURVIT AU GATE. `#gate-id` (le nom, la
    #    visibilité, la recherche) vit DANS `#gate` depuis le 15/09 —
    #    bonne place sur l'atterrissage, mais le module câble ses boutons
    #    sans condition. Arracher le gate emportait les nœuds et laissait
    #    les `$('name-btn').onclick` : TypeError à l'évaluation, donc
    #    MODULE MORT et jumeau blanc. On la garde, cachée.
    gi = s.find('<div id="gate-id">')
    # ⚠️ IL FAUT LA BALISE FERMANTE DU CONTENEUR, PAS CELLE DE SON
    #    DERNIER ENFANT. `#search-note` est un div vide : le premier
    #    `</div>` rencontré est le SIEN. Couper là rendait un bloc non
    #    fermé, tout le reste du document se nichait dedans — et
    #    `#gate-id` est en `display:none`. Symptôme : la croix du jumeau
    #    « n'est pas visible », et rien n'expliquait pourquoi.
    gn = s.find('<div class="note dim hide" id="search-note">', gi)
    gk = s.find('</div>', s.find('</div>', gn) + 6)
    carte = s[gi:gk + 6] if (gi >= 0 and gn > gi and gk > gn) else ''
    if carte:
        carte = carte.replace('<div id="gate-id">',
                              '<div id="gate-id" hidden style="display:none">', 1)

    i = s.find('<div id="gate">')
    k = s.find('<svg width="0" height="0" style="position:absolute"', i)
    if i < 0 or k < 0:
        sys.exit('ARRET · le bloc #gate est introuvable')
    s = (s[:i]
         + '<!-- ══ PAS D\'ATTERRISSAGE DANS UN JUMEAU · 13/09/2026 ═════════\n'
           '     `#gate` a été retiré par tools/jumeau.py. On n\'arrive ici que\n'
           '     depuis le Totehm DÉPLOYÉ : il n\'y a rien à déplier, et le\n'
           '     garder laissait `#terms-corner` (position:fixed) intercepter\n'
           '     les clics de toute la page. -->\n\n'
         + carte + '\n\n'
         + s[k:])
    # Le bloc qui décide de l'atterrissage n'a plus d'objet : un jumeau
    # n'en a pas. On le retire en entier plutôt que d'en neutraliser une
    # ligne — une moitié de mécanisme est pire qu'aucun.
    i2 = s.find("  const dedans = location.hash === '#in';")
    k2 = s.find("else { body.classList.add('gate'); }", i2)
    if i2 < 0 or k2 < 0:
        sys.exit("ARRET · le bloc d'atterrissage est introuvable")
    s = (s[:i2]
         + "  /* Pas d'atterrissage dans un jumeau : rien à décider. */\n"
         + s[k2 + len("else { body.classList.add('gate'); }"):])
    s = ech(s, """  if(me&&myProfile){await cloudLoad();}
  paint();""",
            """  if(me&&myProfile){await cloudLoad();}
  paint();
  chargeItems();""", 'le jumeau charge sa liste')

    # Les deux portes du bas n'ont rien à faire dans un jumeau.
    s = ech(s, '<div id="bottom-doors" class="sink-el">',
            '<div id="bottom-doors" class="sink-el" hidden>',
            'les portes du bas disparaissent')

    return s


import re

def audit_noeuds(s, nom):
    """TOUT `$('id')` DOIT TROUVER SON NŒUD.

    Retirer un élément du DOM sans retirer son câblage lève un TypeError
    À L'ÉVALUATION du module : ce n'est pas la liste qui casse, c'est TOUT
    le script, et la page s'affiche vide sans un mot. C'est exactement ce
    qui est arrivé en arrachant `#gate` alors que la carte de visite vivait
    dedans. La règle est déjà dans CLAUDE.md pour `port_prototype.py` ;
    elle vaut ici, et elle se mesure."""
    # ⚠️ ON NE FLAGUE QUE CE QUI DÉRÉFÉRENCE. `const b=$('x'); if(b)…`
    #    ne lève rien — c'est même la bonne façon d'écrire. Ce qui tue,
    #    c'est `$('x').onclick=…` sur un nœud absent. Un audit qui crie
    #    au loup sur les formes SÛRES finit par être désactivé, et le
    #    jour où il a raison personne ne le lit.
    cites = set(re.findall(r"\$\('([A-Za-z0-9_-]+)'\)\s*\.", s))
    poses = set(re.findall(r'id="([A-Za-z0-9_-]+)"', s))
    manquants = sorted(cites - poses)
    if manquants:
        for m in manquants:
            print('  ! %-14s $(\'%s\') ne trouve aucun noeud' % (nom, m))
        sys.exit("ARRET · un $('id') sur null leve a l'evaluation et "
                 'emporte tout le module.')


def audit(s, nom):
    """AUCUN NOM DÉCLARÉ DEUX FOIS.

    Une redéclaration (`let`/`const`/`function`) est une SyntaxError, et
    une SyntaxError emporte le MODULE ENTIER : la page s'affiche, vide,
    sans un mot dans la console visible de l'utilisateur. J'y suis tombé
    trois fois de suite en dérivant ces fichiers — `open`, `rangHTML`,
    `listeDe`. On ne le cherche plus à la main : on le mesure.

    On ne lit que les déclarations en DÉBUT DE LIGNE, sans indentation :
    ce sont les seules qui vivent dans la portée du module."""
    vus = {}
    for m in re.finditer(r'(?m)^(?:let|const|var|function)\s+([A-Za-z_$][\w$]*)', s):
        vus.setdefault(m.group(1), []).append(m.start())
    doubles = {k: v for k, v in vus.items() if len(v) > 1}
    if doubles:
        for k, v in sorted(doubles.items()):
            lignes = [s.count('\n', 0, p) + 1 for p in v]
            print('  ! %-14s %-16s declare %d fois, lignes %s'
                  % (nom, k, len(v), lignes))
        sys.exit('ARRET · une redeclaration est une SyntaxError : '
                 'elle emporte tout le module, pas seulement la liste.')


src = io.open(SRC, encoding='utf-8').read()
for j in JUMEAUX:
    out = fabrique(src, j)
    audit(out, j['nom'])
    audit_noeuds(out, j['nom'])
    chemin = SC + '../com/' + j['nom']
    io.open(chemin, 'w', encoding='utf-8').write(out)
    print('  %-16s %d octets' % (j['nom'], len(out.encode('utf-8'))))
print('\nles deux jumeaux sont derives de totehm.html')
