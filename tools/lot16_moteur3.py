# -*- coding: utf-8 -*-
"""LOT DU 16/09/2026 · 3/3 ter — CREER, LIER, SUPPRIMER, NAVIGUER
    python3 tools/lot16_moteur3.py
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

# ── les deux couleurs de mini-boite qui manquaient
s = ech(s,
""".m-h{background:var(--navy)}
.m-o{background:var(--blue)}
.m-r{background:var(--rep)}""",
""".m-h{background:var(--navy)}
.m-o{background:var(--blue)}
.m-r{background:var(--rep)}
/* Une vision est du futur (bleu), une lecon du passe (rouge-violet). */
.m-v{background:var(--blue)}
.m-w{background:var(--rep)}""",
'mini-boites v et w')

# ── le lookup sait teindre en vision et en lecon
s = ech(s,
""".pk-list .pk-o.k-h{background:var(--navy)}""",
""".pk-list .pk-o.k-h{background:var(--navy)}
.pk-list .pk-o.k-v{background:var(--blue)}
.pk-list .pk-o.k-w{background:var(--rep)}""",
'lookup pk-o k-v / k-w')
s = ech(s,
"""#habits .in.nw.k-h{background:var(--navy)}""",
"""#habits .in.nw.k-h{background:var(--navy)}
#habits .in.nw.k-v{background:var(--blue)}
#habits .in.nw.k-w{background:var(--rep)}""",
'champ neuf k-v / k-w')

# ═══════════════════════════════════════════════════════════════════════
# 1 · CREER — les cinq objets, la meme forme
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""  /* ══ UNE RÉPULSION PROTÈGE QUELQUE CHOSE — C'EST SA DÉFINITION ══════
     On ne peut donc pas la poser dans le vide : le serveur ne la rendrait
     plus, elle n'apparaît que PAR ses liens. Avant, on exigeait qu'une
     habitude existe déjà et on refusait par une alerte — un cul-de-sac.
     Maintenant on ouvre un BROUILLON : on écrit la répulsion, et c'est la
     première habitude attachée — reprise OU écrite là — qui la fait
     exister. Même format que les habitudes, logique différente. */
  REPS=REPS.filter(z=>z.id!=='new');
  REPS.unshift({id:'new',text:'',obstacle:'',hs:[],brouillon:true});
  ouvrir('r','new');
  /* APRÈS `ouvrir`, jamais avant : `ouvrir` remet le choix à zéro — c'est
     ce qui garantit qu'ouvrir une boîte n'hérite pas du menu de la
     précédente. Le brouillon ouvre donc son lookup ensuite. */
  pk={q:'lien',k:'hr',id:'new'}; renderZone();
}
/* Le brouillon devient réel : une répulsion, son premier lien, en un
   appel. `repulsion_set` crée la ligne ET le trigger pose le lien. */
async function poseBrouillon(r,habitTexte){
  const {data,error}=await sb.rpc('repulsion_set',
    {p_habit:habitTexte,p_repulsion:r.text||'',p_obstacle:''});
  if(error){console.error('[totehm] repulsion_set:',error.message);return null;}
  r.id=String(data); r.brouillon=false; r.hs=[habitTexte];
  if(open&&open.kind==='r')open.id=String(data);
  if(pk&&pk.k==='hr')pk.id=String(data);
  wDirty=true; return r.id;
}""",
"""  /* ══ POURQUOI LE BROUILLON DE RÉPULSION A DISPARU · 16/09/2026 ══════
     ⚠️ C'EST LA CAUSE DE « ON NE PEUT PAS AJOUTER DE RÉPULSIONS ».
     On créait une ligne fantôme (`id:'new'`) et on ouvrait le lookup
     AVANT le texte, en comptant sur `repulsion_set` pour la faire
     exister au premier lien. Or `repulsion_set` LÈVE sur un texte
     vide — et à cet instant le texte est toujours vide. L'erreur
     partait dans la console, la boîte restait à l'écran, et rien
     n'existait en base. Un cul-de-sac silencieux.
     Une répulsion se crée maintenant comme les quatre autres objets :
     une ligne vide en base, puis on écrit dedans. `repulsion_create`
     n'exige rien et ne retire rien — voir la migration du 16/09. */
  if(kind==='r'){
    const {data,error}=await sb.rpc('repulsion_create',{p_text:''});
    if(error){console.error('[totehm] repulsion_create:',error.message);return;}
    REPS.unshift({id:String(data),text:'',obstacle:'',hs:[],ws:[],is:[]});
    wDirty=true; ouvrir('r',String(data)); return;}
  if(kind==='w'){
    const {data,error}=await sb.rpc('teaching_create',{p_text:''});
    if(error){console.error('[totehm] teaching_create:',error.message);return;}
    TEACH.unshift({id:String(data),t:'',t0:'',is:[],os:[]});
    wDirty=true; ouvrir('w',String(data)); return;}
  if(kind==='v'){
    const {data,error}=await sb.rpc('vision_create',{p_text:''});
    if(error){console.error('[totehm] vision_create:',error.message);return;}
    VIS.unshift({id:String(data),t:'',t0:'',is:[],os:[]});
    wDirty=true; ouvrir('v',String(data)); return;}
}""",
'creer les cinq objets')

# le brouillon n'existe plus : `fermer` n'a plus rien a nettoyer
s = ech(s,
"""  /* UN BROUILLON QU'ON FERME N'A JAMAIS EXISTÉ. Le laisser dans la liste
     ferait croire à une répulsion enregistrée qui disparaîtrait au
     rechargement — le pire des états : visible et faux. */
  REPS=REPS.filter(z=>!z.brouillon);""",
"""  /* Il n'y a plus de brouillon de répulsion : elle naît en base comme les
     quatre autres objets. Voir `creer()`. */""",
'fermer sans brouillon')

s = ech(s,
"""  if(open){ pousse(); open=null; pk=null;
    REPS=REPS.filter(z=>!z.brouillon); }""",
"""  if(open){ pousse(); open=null; pk=null; }""",
'setView sans brouillon')

# ═══════════════════════════════════════════════════════════════════════
# 2 · ATTACHER / DETACHER — les deux liens croises
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""  else { const r=repOf(srcId), x=habOf(cibleId), k=srv(x); if(!r||!x||!k)return;   /* 'hr' */
    if(r.brouillon){ poseBrouillon(r,k).then(()=>renderZone()); return; }
    if(!(r.hs||[]).includes(k)){r.hs.push(k);
      apres(sb.rpc('repulsion_link',{p_id:r.id,p_habit:k}));} }""",
"""  else if(quoi==='hr'){ const r=repOf(srcId), x=habOf(cibleId), k=srv(x); if(!r||!x||!k)return;
    if(!(r.hs||[]).includes(k)){r.hs.push(k);
      apres(sb.rpc('repulsion_link',{p_id:r.id,p_habit:k}));} }
  /* ══ LES DEUX LIENS CROISÉS · 16/09/2026 ═══════════════════════════
     ⚠️ ON TIENT LES DEUX CÔTÉS EN MÉMOIRE. `t.vs` et `v.os` décrivent le
     MÊME lien, vu de chaque bout. N'en écrire qu'un ferait qu'un lien
     posé depuis l'objectif serait invisible depuis la vision jusqu'au
     rechargement suivant — l'écran mentirait le temps d'un aller-retour,
     et c'est exactement la classe de bug qu'on vient de passer trois
     lots à éteindre. */
  else if(quoi==='ov'||quoi==='vo'){
    const t = quoi==='ov' ? tripOf(srcId) : tripOf(cibleId);
    const v = quoi==='ov' ? visOf(cibleId) : visOf(srcId);
    if(!t||!v)return;
    if(!(t.vs||[]).includes(String(v.id)))(t.vs=t.vs||[]).push(String(v.id));
    if(!(v.os||[]).includes(String(t.id)))(v.os=v.os||[]).push(String(t.id));
    apres(sb.rpc('objective_vision_link',{p_obj:t.id,p_vision:v.id})); }
  else { /* 'rw' | 'wr' */
    const r = quoi==='rw' ? repOf(srcId) : repOf(cibleId);
    const w = quoi==='rw' ? teachOf(cibleId) : teachOf(srcId);
    if(!r||!w)return;
    if(!(r.ws||[]).includes(String(w.id)))(r.ws=r.ws||[]).push(String(w.id));
    apres(sb.rpc('repulsion_teaching_link',{p_rep:Number(r.id),p_teaching:w.id})); }""",
'attache liens croises')

s = ech(s,
"""  else { const r=repOf(aId), x=habOf(bId), k=srv(x); if(!r||!x||!k)return;          /* 'hr' */
    r.hs=(r.hs||[]).filter(t=>t!==k);
    apres(sb.rpc('repulsion_unlink',{p_id:r.id,p_habit:k})); }
  wDirty=true;
}""",
"""  else if(quoi==='hr'){ const r=repOf(aId), x=habOf(bId), k=srv(x); if(!r||!x||!k)return;
    r.hs=(r.hs||[]).filter(t=>t!==k);
    apres(sb.rpc('repulsion_unlink',{p_id:r.id,p_habit:k})); }
  else if(quoi==='ov'||quoi==='vo'){
    const t = quoi==='ov' ? tripOf(aId) : tripOf(bId);
    const v = quoi==='ov' ? visOf(bId)  : visOf(aId);
    if(!t||!v)return;
    t.vs=(t.vs||[]).filter(z=>z!==String(v.id));
    v.os=(v.os||[]).filter(z=>z!==String(t.id));
    apres(sb.rpc('objective_vision_unlink',{p_obj:t.id,p_vision:v.id})); }
  else { /* 'rw' | 'wr' */
    const r = quoi==='rw' ? repOf(aId) : repOf(bId);
    const w = quoi==='rw' ? teachOf(bId) : teachOf(aId);
    if(!r||!w)return;
    r.ws=(r.ws||[]).filter(z=>z!==String(w.id));
    apres(sb.rpc('repulsion_teaching_unlink',{p_rep:Number(r.id),p_teaching:w.id})); }
  wDirty=true;
}""",
'detache liens croises')

# ═══════════════════════════════════════════════════════════════════════
# 3 · NEUF ET ATTACHE
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""  if(quoi==='o'){
    const {data,error}=await sb.rpc('trip_create',{p_text:txt,p_target:null});
    if(error){console.error('[totehm] trip_create:',error.message);return;}
    TRIPS.unshift({id:data,text:txt,target_at:null,days_left:null,habits:[]});
    attache('o',srcId,data);}
  else if(quoi==='r'){
    const x=habOf(srcId); if(!x||!x.t)return;
    const {data,error}=await sb.rpc('repulsion_set',{p_habit:x.t,p_repulsion:txt,p_obstacle:''});
    if(error){console.error('[totehm] repulsion_set:',error.message);return;}
    REPS.unshift({id:data,text:txt,obstacle:'',hs:[x.t]});}""",
"""  if(quoi==='o'||quoi==='vo'){
    const {data,error}=await sb.rpc('objective_create',{p_text:txt,p_target:null});
    if(error){console.error('[totehm] objective_create:',error.message);return;}
    TRIPS.unshift({id:String(data),text:txt,target_at:null,days_left:null,habits:[],is:[],vs:[]});
    attache(quoi,srcId,String(data));}
  else if(quoi==='r'||quoi==='wr'){
    /* ⚠️ `repulsion_set` NE SERT PLUS À CRÉER : elle lève sur un texte
       vide et retire l'ancienne répulsion du même obstacle. Ici le texte
       n'est pas vide, mais la seconde règle mordrait quand même. */
    const {data,error}=await sb.rpc('repulsion_create',{p_text:txt});
    if(error){console.error('[totehm] repulsion_create:',error.message);return;}
    REPS.unshift({id:String(data),text:txt,obstacle:'',hs:[],ws:[],is:[]});
    attache(quoi,srcId,String(data));}
  else if(quoi==='ov'){
    const {data,error}=await sb.rpc('vision_create',{p_text:txt});
    if(error){console.error('[totehm] vision_create:',error.message);return;}
    VIS.unshift({id:String(data),t:txt,t0:txt,is:[],os:[]});
    attache('ov',srcId,String(data));}
  else if(quoi==='rw'){
    const {data,error}=await sb.rpc('teaching_create',{p_text:txt});
    if(error){console.error('[totehm] teaching_create:',error.message);return;}
    TEACH.unshift({id:String(data),t:txt,t0:txt,is:[],os:[]});
    attache('rw',srcId,String(data));}""",
'neufEtAttache')

# ═══════════════════════════════════════════════════════════════════════
# 4 · RENOMMER — cinq objets, cinq verbes
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""      else { const r=repOf(p[1]); if(!r)return; r.text=v; wDirty=true;
        /* Un brouillon s'écrit en mémoire : il n'a pas encore de ligne en
           base, et `repulsion_set` sans habitude en créerait une invisible. */
        if(r.brouillon)return;
        differe('r:'+r.id,()=>apres(sb.rpc('repulsion_set',
          {p_habit:(r.hs||[])[0]||'', p_repulsion:r.text, p_obstacle:r.obstacle||''}))); }""",
"""      else if(p[0]==='r'){ const r=repOf(p[1]); if(!r)return; r.text=v; wDirty=true;
        /* ⚠️ `repulsion_rename`, PAS `repulsion_set`. `repulsion_set`
           RETIRE l'ancienne répulsion du même obstacle avant d'insérer :
           utilisée à chaque frappe, elle empilait une ligne morte par
           lettre tapée. */
        differe('r:'+r.id,()=>apres(sb.rpc('repulsion_rename',
          {p_id:Number(r.id), p_text:r.text}))); }
      else if(p[0]==='w'){ const w=teachOf(p[1]); if(!w)return; w.t=v; wDirty=true;
        differe('w:'+w.id,()=>apres(sb.rpc('teaching_rename',{p_id:w.id,p_text:w.t}))); }
      else { const z=visOf(p[1]); if(!z)return; z.t=v; wDirty=true;
        differe('v:'+z.id,()=>apres(sb.rpc('vision_rename',{p_id:z.id,p_text:z.t}))); }""",
'renommer les cinq')

# ═══════════════════════════════════════════════════════════════════════
# 5 · SUPPRIMER
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""  else { const r=repOf(id); pousse('r:'+id); wSlots.delete('r:'+id);
    REPS=REPS.filter(z=>String(z.id)!==String(id));
    if(r&&!r.brouillon)apres(sb.rpc('repulsion_retire',{p_id:Number(id)})); }
  wDirty=true; fermer();""",
"""  else if(kind==='r'){ pousse('r:'+id); wSlots.delete('r:'+id);
    REPS=REPS.filter(z=>String(z.id)!==String(id));
    apres(sb.rpc('repulsion_retire',{p_id:Number(id)})); }
  else if(kind==='w'){ pousse('w:'+id); wSlots.delete('w:'+id);
    TEACH=TEACH.filter(z=>String(z.id)!==String(id));
    /* Une leçon supprimée ne doit pas rester accrochée aux répulsions
       qu'elle éclairait : la table de liens tombe avec la ligne côté
       serveur, on fait la même chose en mémoire. */
    REPS.forEach(r=>{r.ws=(r.ws||[]).filter(z=>z!==String(id));});
    apres(sb.rpc('teaching_delete',{p_id:String(id)})); }
  else if(kind==='v'){ pousse('v:'+id); wSlots.delete('v:'+id);
    VIS=VIS.filter(z=>String(z.id)!==String(id));
    TRIPS.forEach(t=>{t.vs=(t.vs||[]).filter(z=>z!==String(id));});
    apres(sb.rpc('vision_delete',{p_id:String(id)})); }
  wDirty=true; fermer();""",
'supprimer les cinq')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (etape 3/3 du moteur)')
