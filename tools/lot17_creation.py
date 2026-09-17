# -*- coding: utf-8 -*-
"""LOT DU 17/09/2026 · CREER NE FAIT PLUS ATTENDRE, ET CA NAIT EN BAS
    python3 tools/lot17_creation.py
⚠️ N'ECRIT QU'A LA FIN.
"""
import os, sys
SC = os.path.dirname(os.path.abspath(__file__)) + '/'
P  = SC + '../com/totehm.html'
rates = []

def ech(s, vieux, neuf, quoi, attendu=1):
    n = s.count(vieux)
    if n != attendu:
        rates.append('%s : %d fois, attendu %d\n      %s'
                     % (quoi, n, attendu, vieux.strip()[:96]))
        return s
    return s.replace(vieux, neuf)

s = open(P, encoding='utf-8').read()

VIEUX = s[s.index("async function creer(kind){"):s.index("/* ══ ATTACHER, DÉTACHER ══")]

NEUF = """/* ══ CRÉER · 17/09/2026 ══════════════════════════════════════════════
   DEUX CHANGEMENTS, ET LES DEUX VIENNENT DE CE QUE WAH A SENTI.

   1. ⚠️ LA BOÎTE NAÎT EN BAS, SOUS LE DOIGT. Elle naissait en tête de
      liste (`unshift`) : on appuie sur [+ Add a Vision], qui est en bas,
      et la boîte s'ouvre tout en haut — l'écran saute, on perd où on en
      était, et sur une liste de vingt on ne voit même pas qu'il s'est
      passé quelque chose. Elle naît maintenant À LA FIN, exactement là
      où le doigt vient d'appuyer.

   2. ⚠️ PLUS D'ATTENTE. On appelait le serveur et on n'ouvrait la boîte
      qu'à sa réponse : 300 à 600 ms de rien sur un vrai réseau — le
      « il y a de la latence » signalé sur [Add a Vision]. Tout le reste
      du fichier est OPTIMISTE (on pose, on dessine, on envoie) ; la
      création était la seule exception, sans raison.
      La boîte s'ouvre donc TOUT DE SUITE avec un identifiant provisoire
      (`tmp:…`), et l'identifiant réel le remplace quand le serveur
      répond. Si le serveur refuse, la ligne provisoire disparaît et on
      le DIT — une boîte fantôme qu'on croit enregistrée est le pire des
      états.

   ⚠️ CE QUI REND LE PROVISOIRE SÛR : tant que l'identifiant commence par
   `tmp:`, aucune écriture réseau ne part pour cet objet (`estProvisoire`
   garde `differe`, `attache` et `tue`). Sans ce verrou on enverrait un
   `vision_rename` sur un identifiant qui n'existe pas encore. */
let TSEQ=0;
const estProvisoire = id => String(id).startsWith('tmp:');

/* Le serveur a répondu : on remplace l'identifiant provisoire PARTOUT —
   dans la liste, dans la boîte ouverte, et dans le choix en cours. */
function baptise(liste, tmp, vrai){
  const o = liste.find(z=>String(z.id)===tmp); if(!o)return null;
  o.id = String(vrai);
  if(open && String(open.id)===tmp) open.id = String(vrai);
  if(pk   && String(pk.id)===tmp)   pk.id   = String(vrai);
  return o;
}
/* Le serveur a refusé : la ligne provisoire n'a jamais existé. */
function annule(liste, tmp, mot){
  const i = liste.findIndex(z=>String(z.id)===tmp);
  if(i>=0) liste.splice(i,1);
  if(open && String(open.id)===tmp){ open=null; pk=null; }
  dis(mot);
  renderZone();
}

async function creer(kind){
  if(kind==='h'){
    const x={id:'h'+(++HSEQ), t:'', t0:'', f:null, i:null, is:[], o:null};
    state.habits.push(x); state.ord=true; save(); ouvrir('h',x.id); return;}
  if(!me){$('member-window').classList.add('show');
          if(typeof memberPaint==='function')memberPaint();return;}

  const tmp = 'tmp:'+(++TSEQ);

  if(kind==='t'){
    TRIPS.push({id:tmp,text:'',target_at:null,days_left:null,habits:[],is:[],vs:[]});
    wDirty=true; ouvrir('t',tmp);
    const {data,error}=await sb.rpc('objective_create',{p_text:'',p_target:null});
    if(error||!data){console.error('[totehm] objective_create:',error&&error.message);
      return annule(TRIPS,tmp,'objective not saved — try again');}
    baptise(TRIPS,tmp,data); renderZone(); return;}

  if(kind==='r'){
    REPS.push({id:tmp,text:'',obstacle:'',hs:[],ws:[],is:[]});
    wDirty=true; ouvrir('r',tmp);
    const {data,error}=await sb.rpc('repulsion_create',{p_text:''});
    if(error||!data){console.error('[totehm] repulsion_create:',error&&error.message);
      return annule(REPS,tmp,'repulsion not saved — try again');}
    baptise(REPS,tmp,data); renderZone(); return;}

  if(kind==='w'){
    TEACH.push({id:tmp,t:'',t0:'',is:[],os:[]});
    wDirty=true; ouvrir('w',tmp);
    const {data,error}=await sb.rpc('teaching_create',{p_text:''});
    if(error||!data){console.error('[totehm] teaching_create:',error&&error.message);
      return annule(TEACH,tmp,'teaching not saved — try again');}
    baptise(TEACH,tmp,data); renderZone(); return;}

  if(kind==='v'){
    VIS.push({id:tmp,t:'',t0:'',is:[],os:[]});
    wDirty=true; ouvrir('v',tmp);
    const {data,error}=await sb.rpc('vision_create',{p_text:''});
    if(error||!data){console.error('[totehm] vision_create:',error&&error.message);
      return annule(VIS,tmp,'vision not saved — try again');}
    baptise(VIS,tmp,data); renderZone(); return;}
}

"""
s = ech(s, VIEUX, NEUF, 'creer() optimiste')

# ── le renommage differe ne part jamais sur un identifiant provisoire
s = ech(s,
"""      else if(p[0]==='t'){ const z=tripOf(p[1]); if(!z)return; z.text=v; wDirty=true;
        differe('t:'+z.id,()=>apres(sb.rpc('objective_rename',{p_obj:z.id,p_text:z.text}))); }""",
"""      /* ⚠️ RIEN NE PART TANT QUE L'OBJET EST PROVISOIRE. Le texte
         s'écrit en mémoire ; la minuterie est posée sur l'identifiant
         COURANT, qui sera le vrai quand elle se déclenchera (`baptise`
         l'a remplacé entre-temps). Envoyer un `rename` sur un `tmp:`
         ferait une erreur serveur et perdrait la frappe. */
      else if(p[0]==='t'){ const z=tripOf(p[1]); if(!z)return; z.text=v; wDirty=true;
        differe('t:'+z.id,()=>{ if(estProvisoire(z.id))return;
          apres(sb.rpc('objective_rename',{p_obj:z.id,p_text:z.text})); }); }""",
'rename objectif garde')

s = ech(s,
"""        differe('r:'+r.id,()=>apres(sb.rpc('repulsion_rename',
          {p_id:Number(r.id), p_text:r.text}))); }""",
"""        differe('r:'+r.id,()=>{ if(estProvisoire(r.id))return;
          apres(sb.rpc('repulsion_rename',{p_id:Number(r.id), p_text:r.text})); }); }""",
'rename repulsion garde')

s = ech(s,
"""      else if(p[0]==='w'){ const w=teachOf(p[1]); if(!w)return; w.t=v; wDirty=true;
        differe('w:'+w.id,()=>apres(sb.rpc('teaching_rename',{p_id:w.id,p_text:w.t}))); }
      else { const z=visOf(p[1]); if(!z)return; z.t=v; wDirty=true;
        differe('v:'+z.id,()=>apres(sb.rpc('vision_rename',{p_id:z.id,p_text:z.t}))); }""",
"""      else if(p[0]==='w'){ const w=teachOf(p[1]); if(!w)return; w.t=v; wDirty=true;
        differe('w:'+w.id,()=>{ if(estProvisoire(w.id))return;
          apres(sb.rpc('teaching_rename',{p_id:w.id,p_text:w.t})); }); }
      else { const z=visOf(p[1]); if(!z)return; z.t=v; wDirty=true;
        differe('v:'+z.id,()=>{ if(estProvisoire(z.id))return;
          apres(sb.rpc('vision_rename',{p_id:z.id,p_text:z.t})); }); }""",
'rename lecon/vision garde')

# ── supprimer un objet encore provisoire : on ne parle pas au serveur
s = ech(s,
"""  else if(kind==='r'){ pousse('r:'+id); wSlots.delete('r:'+id);
    REPS=REPS.filter(z=>String(z.id)!==String(id));
    apres(sb.rpc('repulsion_retire',{p_id:Number(id)})); }
  else if(kind==='w'){ pousse('w:'+id); wSlots.delete('w:'+id);
    TEACH=TEACH.filter(z=>String(z.id)!==String(id));""",
"""  else if(kind==='r'){ pousse('r:'+id); wSlots.delete('r:'+id);
    REPS=REPS.filter(z=>String(z.id)!==String(id));
    if(!estProvisoire(id))apres(sb.rpc('repulsion_retire',{p_id:Number(id)})); }
  else if(kind==='w'){ pousse('w:'+id); wSlots.delete('w:'+id);
    TEACH=TEACH.filter(z=>String(z.id)!==String(id));""",
'tue repulsion garde')

s = ech(s,
"""    REPS.forEach(r=>{r.ws=(r.ws||[]).filter(z=>z!==String(id));});
    apres(sb.rpc('teaching_delete',{p_id:String(id)})); }
  else if(kind==='v'){ pousse('v:'+id); wSlots.delete('v:'+id);
    VIS=VIS.filter(z=>String(z.id)!==String(id));
    TRIPS.forEach(t=>{t.vs=(t.vs||[]).filter(z=>z!==String(id));});
    apres(sb.rpc('vision_delete',{p_id:String(id)})); }""",
"""    REPS.forEach(r=>{r.ws=(r.ws||[]).filter(z=>z!==String(id));});
    if(!estProvisoire(id))apres(sb.rpc('teaching_delete',{p_id:String(id)})); }
  else if(kind==='v'){ pousse('v:'+id); wSlots.delete('v:'+id);
    VIS=VIS.filter(z=>String(z.id)!==String(id));
    TRIPS.forEach(t=>{t.vs=(t.vs||[]).filter(z=>z!==String(id));});
    if(!estProvisoire(id))apres(sb.rpc('vision_delete',{p_id:String(id)})); }""",
'tue lecon/vision garde')

s = ech(s,
"""  else if(kind==='t'){ pousse('t:'+id); wSlots.delete('t:'+id);
    TRIPS=TRIPS.filter(t=>String(t.id)!==String(id));
    (state.habits||[]).forEach(x=>{ const k=srv(x); if(k&&OBJ[k]){
      OBJ[k]=OBJ[k].filter(o=>o!==String(id)); posePremier(x);} });
    apres(sb.rpc('objective_close',{p_obj:id,p_outcome:'dropped'})); }""",
"""  else if(kind==='t'){ pousse('t:'+id); wSlots.delete('t:'+id);
    TRIPS=TRIPS.filter(t=>String(t.id)!==String(id));
    (state.habits||[]).forEach(x=>{ const k=srv(x); if(k&&OBJ[k]){
      OBJ[k]=OBJ[k].filter(o=>o!==String(id)); posePremier(x);} });
    if(!estProvisoire(id))apres(sb.rpc('objective_close',{p_obj:id,p_outcome:'dropped'})); }""",
'tue objectif garde')

# ── lier un objet encore provisoire : on attend qu'il ait un nom
s = ech(s,
"""function attache(quoi,srcId,cibleId){""",
"""function attache(quoi,srcId,cibleId){
  /* ⚠️ ON NE LIE PAS CE QUI N'EXISTE PAS ENCORE. Une seconde après la
     création, l'objet a son vrai identifiant ; d'ici là, un lien partirait
     vers `tmp:3` et le serveur répondrait « not yours ». */
  if(estProvisoire(srcId)||estProvisoire(cibleId)){
    dis('one second — still saving'); return; }""",
'attache garde')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (creation)')
