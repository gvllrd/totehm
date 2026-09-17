# -*- coding: utf-8 -*-
"""LOT DU 17/09/2026 · LE TOTEHM D'UN AUTRE EST LE MEME TOTEHM
    python3 tools/lot17_lecture.py

CE QUE WAH DIT : « le resultat de recherche, c'est le totehm mais
simplement en mode READ ONLY. La le systeme est fucked up ! »

IL A RAISON, ET C'ETAIT PIRE QU'INCOMPLET.
  · `loadRO()` ne chargeait QUE `steps` : quatre vues sur cinq etaient
    vides chez la personne qu'on regarde ;
  · changer de vue appelait `loadTrips()`, qui rend l'arbre DE CELUI QUI
    REGARDE -- on voyait donc SES PROPRES objectifs a l'interieur du
    Totehm de quelqu'un d'autre. C'est ca, « fucked up » ;
  · `is` etait jete : une habitude a trois intentions n'en montrait
    qu'une, donc le trait de gauche mentait.

UN TOTEHM EN LECTURE EST LE MEME OBJET. Cinq vues, les memes curseurs,
la meme boite -- seulement, rien ne s'ecrit. Une seule fonction serveur
(`totehm_of`), un seul aller-retour, la visibilite verifiee EN BASE.

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

# ── 1 · loadRO charge les CINQ listes
s = ech(s,
"""async function loadRO(){
  const {data:ps}=await sb.from('profiles').select('id,pseudo').ilike('pseudo',RO).limit(1);
  const prof=(ps&&ps[0])||null;
  if(!prof){ roFail('no Totehm by that name'); return false; }
  const {data:rows}=await sb.from('totehms')
    .select('steps,totehm_visibility').eq('user_id',prof.id).eq('totehm_visibility','members');
  if(!rows||!rows.length){ roFail('this Totehm is private'); return false; }
  const habits=[];const seen={};
  rows.forEach(r=>{(Array.isArray(r.steps)?r.steps:[]).forEach(x=>{
    const k=norm(x.t); if(x.t&&!seen[k]){seen[k]=1;
      habits.push({t:x.t,f:FREQ_BY_ID[x.f]?x.f:null,i:INT_BY_ID[x.i]?x.i:null,o:x.o||null});}});});
  state={habits, vis:'members'};
  document.body.classList.add('ro');
  $('ro-who').textContent=prof.pseudo;
  if(await isHigher(prof.id))$('ro-who').insertAdjacentHTML('beforeend',HI_SVG);
  renderHabits();
  return true;
}""",
"""async function loadRO(){
  /* ⚠️ UN SEUL APPEL, ET IL RAMÈNE LES CINQ LISTES. Avant, on lisait
     `totehms.steps` à la main et on s'arrêtait là : quatre vues sur cinq
     restaient vides chez la personne qu'on regarde. `totehm_of` rend la
     même forme que `my_trips` — c'est le même Totehm, vu du dehors. */
  const {data,error}=await sb.rpc('totehm_of',{p_pseudo:RO});
  if(error){ console.error('[totehm] totehm_of:',error.message);
             roFail('this Totehm could not be read'); return false; }
  if(!data||!data.ok){
    roFail(data&&data.why==='nobody'  ? 'no Totehm by that name'
         : data&&data.why==='signin'  ? 'sign in to read a Totehm'
         :                              'this Totehm is private');
    return false; }

  const habits=[];const seen={};
  (Array.isArray(data.steps)?data.steps:[]).forEach(x=>{
    const k=norm(x.t); if(!x.t||seen[k])return; seen[k]=1;
    /* `is` EST TRANSPORTÉ. Sans lui, une habitude à trois intentions
       n'en montrait qu'une et le trait de gauche mentait — c'est ce
       trait qui porte la couleur héritée des objectifs et des
       répulsions, donc le mensonge se propageait à trois vues. */
    const li=Array.isArray(x.is)?x.is.filter(z=>INT_BY_ID[z]):[];
    habits.push({t:x.t, t0:x.t, f:FREQ_BY_ID[x.f]?x.f:null,
      i:INT_BY_ID[x.i]?x.i:(li[0]||null), is:li, o:x.o||null});});
  state={habits, vis:'members'};

  TRIPS=(data.trips||[]).map(t=>Object.assign({},t,{
    is:Array.isArray(t.is)?t.is:[], vs:(t.visions||[]).map(String)}));
  OBJ={}; const oj=data.objs||{};
  Object.keys(oj).forEach(k=>{ OBJ[k]=(oj[k]||[]).map(String); });
  REPS=(data.reps||[]).map(r=>({id:r.id, text:r.text||'', obstacle:r.obstacle||'',
    hs:(r.hs||[]).slice(), ws:(r.ws||[]).map(String), is:Array.isArray(r.is)?r.is:[]}));
  TEACH=(data.wisdom||[]).map(w=>({id:String(w.id), t:w.text||'', t0:w.text||'',
    is:Array.isArray(w.is)?w.is:[], os:(w.os||[]).map(String)}));
  VIS=(data.visions||[]).map(v=>({id:String(v.id), t:v.text||'', t0:v.text||'',
    is:Array.isArray(v.is)?v.is:[], os:(v.os||[]).map(String)}));
  /* ⚠️ `tripsLoaded` À VRAI, ET C'EST ESSENTIEL. C'est ce drapeau qui
     empêche `loadTrips()` de partir chercher l'arbre DE CELUI QUI
     REGARDE et de l'afficher dans le Totehm d'un autre. Sans lui, on
     voyait ses propres objectifs chez quelqu'un d'autre. */
  tripsLoaded=true;

  document.body.classList.add('ro');
  $('ro-who').textContent=data.pseudo||RO;
  renderHabits();
  return true;
}""",
'loadRO charge tout')

# ── 2 · loadTrips ne part JAMAIS en mode lecture
s = ech(s,
"""async function loadTrips(force){
  if(!me)return;
  if(tripsLoaded&&!force)return;""",
"""async function loadTrips(force){
  /* ⚠️ EN LECTURE, ON NE CHARGE JAMAIS SON PROPRE ARBRE. `my_trips()`
     rend l'arbre DU DEMANDEUR : appelée ici, elle remplaçait les
     objectifs de la personne qu'on regarde par les siens. Le verrou est
     à l'entrée de la fonction, pas chez ses quinze appelants. */
  if(RO)return;
  if(!me)return;
  if(tripsLoaded&&!force)return;""",
'loadTrips verrouille en lecture')

# ── 3 · les cinq vues sont accessibles en lecture (elles ne l'etaient pas :
#        `setView` exigeait une session pour tout sauf les habitudes)
s = ech(s,
"""  if(v!=='habits'&&!me){
    $('member-window').classList.add('show');
    if(typeof memberPaint==='function')memberPaint();
    return;
  }""",
"""  /* ⚠️ EN LECTURE, LES CINQ VUES SONT OUVERTES. Les données sont déjà
     là — `loadRO` les a toutes ramenées en un appel. Demander une
     session ici aurait bloqué quatre vues sur cinq chez quelqu'un dont
     on regarde justement le Totehm. */
  if(v!=='habits'&&!me&&!RO){
    $('member-window').classList.add('show');
    if(typeof memberPaint==='function')memberPaint();
    return;
  }""",
'setView ouvert en lecture')

# ── 4 · rien ne s'ecrit, rien ne se cree, rien ne se supprime
s = ech(s,
"""async function creer(kind){
  if(kind==='h'){""",
"""async function creer(kind){
  /* ⚠️ TROISIÈME VERROU. `save()` et `cloudSave()` bloquent déjà l'écriture
     locale et nuage, mais `creer` parle DIRECTEMENT au serveur : sans
     cette ligne, on aurait créé un objectif chez soi en regardant le
     Totehm d'un autre. La boîte [+ Add] est masquée en CSS — masquer
     n'est pas interdire. */
  if(RO)return;
  if(kind==='h'){""",
'creer verrouille')

s = ech(s,
"""/* SUPPRIMER — ici, et nulle part ailleurs. */
function tue(kind,id){""",
"""/* SUPPRIMER — ici, et nulle part ailleurs. */
function tue(kind,id){
  if(RO)return;                      /* même raison que dans `creer` */""",
'tue verrouille')

s = ech(s,
"""function attache(quoi,srcId,cibleId){
  /* ⚠️ ON NE LIE PAS CE QUI N'EXISTE PAS ENCORE.""",
"""function attache(quoi,srcId,cibleId){
  if(RO)return;                      /* même raison que dans `creer` */
  /* ⚠️ ON NE LIE PAS CE QUI N'EXISTE PAS ENCORE.""",
'attache verrouille')

s = ech(s,
"""function detache(quoi,aId,bId){""",
"""function detache(quoi,aId,bId){
  if(RO)return;                      /* même raison que dans `creer` */""",
'detache verrouille')

# ── 5 · en lecture, la boite ne s'edite pas : on la LIT
s = ech(s,
"""function boiteHTML(o){
  const nom = o.ouverte""",
"""function boiteHTML(o){
  /* ⚠️ EN LECTURE, UNE BOÎTE OUVERTE RESTE UNE BOÎTE : elle montre ses
     liens, elle ne se modifie pas. Le titre cesse d'être éditable, et
     [Delete] disparaît — un bouton qui ne marche pas est pire qu'un
     bouton absent. */
  if(RO) o=Object.assign({},o,{tue:null});
  const nom = (o.ouverte&&!RO)""",
'boite en lecture')

# ── 6 · la barre de lecture dit ce qu'on peut faire
s = ech(s,
"""body.ro .habit.add,
body.ro .h-x,
body.ro #bottom-doors,
body.ro #fv-status{display:none!important}""",
"""/* ══ CE QUI DISPARAÎT EN LECTURE · 17/09/2026 ════════════════════════
   Tout ce qui écrit. Les CURSEURS RESTENT : on lit les cinq vues de
   quelqu'un d'autre exactement comme on lit les siennes — c'est toute
   la demande. */
body.ro .habit.add,
body.ro .h-x,
body.ro #bottom-doors,
body.ro #ordbtn,
body.ro .dash,
body.ro .mini-x,
body.ro #fv-status{display:none!important}""",
'CSS lecture')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (lecture)')
