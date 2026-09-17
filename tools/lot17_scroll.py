# -*- coding: utf-8 -*-
"""LOT DU 17/09/2026 · ON NE CHANGE PLUS DE VUE PAR ACCIDENT
    python3 tools/lot17_scroll.py

LE BUG, DIT PAR WAH : « Je souhaitais seulement aller en bas pour ajouter
une box tout en restant dans la vue mais je suis passe a une autre vue a
mon insu. »

LA CAUSE. Le passage vertical se declenchait des qu'on ATTEIGNAIT le bout
de la liste avec assez d'elan. Or aller en bas de la liste, c'est ce
qu'on fait pour atteindre [+ Add a ...] : le geste normal et le geste de
navigation etaient LE MEME GESTE. Un seuil plus haut n'y change rien --
il faut juste pousser un peu plus fort pour se tromper.

LA REGLE, ET ELLE EST SIMPLE : **arriver au bout ne fait rien. Il faut
REPARTIR du bout.** On note l'instant ou la liste touche son bord ; tout
ce qui arrive dans les 420 ms suivantes est l'elan du geste precedent et
ne compte pas. Ensuite seulement, une traction franche (260 px a la
molette, 110 px au doigt, le doigt ayant commence AU BORD) fait passer.

Deux gestes distincts au lieu d'un geste plus long : c'est la seule
correction qui tienne.

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

# ═══════════════════════════════════════════════════════════════════════
# 1 · LE GARDE-FOU COMMUN : DEPUIS QUAND EST-ON AU BORD ?
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""function scrollEdges(){
  const sc=$('fv-inner');
  return {top:sc.scrollTop<=1, bottom:sc.scrollTop+sc.clientHeight>=sc.scrollHeight-1};
}""",
"""function scrollEdges(){
  const sc=$('fv-inner');
  return {top:sc.scrollTop<=1, bottom:sc.scrollTop+sc.clientHeight>=sc.scrollHeight-1};
}
/* ══ ARRIVER AU BOUT NE FAIT RIEN · 17/09/2026 ══════════════════════
   ⚠️ C'EST LA CORRECTION DE « je change de vue à mon insu ».

   Descendre au bout de la liste, c'est ce qu'on fait pour atteindre
   [+ Add a …]. Le geste normal et le geste de navigation étaient donc le
   MÊME GESTE, à l'élan près. Monter le seuil n'y change rien : on se
   trompe juste un peu plus fort.

   Ce compteur note QUAND la liste a touché son bord. Tout ce qui arrive
   dans les 420 ms suivantes appartient au geste qui nous a amenés là :
   ça défile, ça ne navigue pas. Il faut s'arrêter, puis repartir.
   Deux gestes au lieu d'un geste plus long. */
const REPOS=420;
let bordDepuis=0, bordQuel='';
(function(){
  const sc=$('fv-inner'); if(!sc)return;
  sc.addEventListener('scroll',()=>{
    const b=scrollEdges();
    const q = b.bottom?'b' : b.top?'h' : '';
    if(q!==bordQuel){ bordQuel=q; bordDepuis = q?Date.now():0; }
  },{passive:true});
})();
/* Vrai seulement si la liste est au bord DEPUIS assez longtemps pour que
   l'élan qui l'y a menée soit retombé. Une liste qui tient dans l'écran
   n'a pas d'élan : elle est au repos par construction. */
function bordCalme(sens){
  const b=scrollEdges();
  if(!(sens==='b'?b.bottom:b.top))return false;
  const sc=$('fv-inner');
  if(sc.scrollHeight<=sc.clientHeight+2)return true;
  return bordDepuis>0 && (Date.now()-bordDepuis)>REPOS;
}""",
'bordCalme')

# ═══════════════════════════════════════════════════════════════════════
# 2 · LE DOIGT
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""window.addEventListener('touchstart',(e)=>{x0=e.changedTouches[0].screenX;y0=e.changedTouches[0].screenY;axis=null;t0el=e.target;},{passive:true});""",
"""/* ⚠️ ON NOTE SI LE DOIGT A COMMENCÉ AU BORD. Un doigt qui part du milieu
   de la liste et finit au bord est en train de DÉFILER ; il ne navigue
   pas, même s'il termine sa course en butée. */
window.addEventListener('touchstart',(e)=>{x0=e.changedTouches[0].screenX;y0=e.changedTouches[0].screenY;
  axis=null;t0el=e.target;
  bordAuDepart = {h:bordCalme('h'), b:bordCalme('b')};},{passive:true});""",
'touchstart note le bord')

s = ech(s,
"""let y0=0,axis=null,t0el=null,x0=0;""",
"""let y0=0,axis=null,t0el=null,x0=0,bordAuDepart={h:false,b:false};""",
'declaration bordAuDepart')

s = ech(s,
"""  if(Math.abs(dy)<TH+18)return;
  const bord=scrollEdges();
  if(dy<0&&bord.bottom)versVoisin('b');
  else if(dy>0&&bord.top)versVoisin('h');""",
"""  /* 110 px, et le doigt devait DÉJÀ être au bord quand il s'est posé.
     Trois conditions au lieu d'une : la liste en butée, la butée
     ancienne, et une traction franche. */
  if(Math.abs(dy)<110)return;
  if(dy<0 && bordAuDepart.b && bordCalme('b'))      versVoisin('b');
  else if(dy>0 && bordAuDepart.h && bordCalme('h')) versVoisin('h');""",
'seuil du doigt')

# ═══════════════════════════════════════════════════════════════════════
# 3 · LA MOLETTE
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""    if(Math.abs(e.deltaY) > Math.abs(e.deltaX)*1.6){
      if(navBlocked())return;
      if(Date.now()<froid){accV=0;return;}
      const bord=scrollEdges();
      const versLeBas=e.deltaY>0;
      if(!(versLeBas?bord.bottom:bord.top)){accV=0;return;}
      const nowV=Date.now(); if(nowV-tV>260)accV=0; tV=nowV;
      accV+=e.deltaY;
      if(Math.abs(accV)<90)return;
      const cible=versLeBas?'b':'h';
      accV=0; froid=Date.now()+700;
      versVoisin(cible);
      return;
    }""",
"""    if(Math.abs(e.deltaY) > Math.abs(e.deltaX)*1.6){
      if(navBlocked())return;
      if(Date.now()<froid){accV=0;return;}
      const versLeBas=e.deltaY>0;
      /* ⚠️ `bordCalme` ET PAS `scrollEdges` : il faut que la liste soit
         en butée DEPUIS 420 ms. Sinon l'inertie du geste qui vient de
         nous amener en bas suffit à passer à la vue suivante — c'est
         exactement le bug signalé. */
      if(!bordCalme(versLeBas?'b':'h')){accV=0;return;}
      const nowV=Date.now(); if(nowV-tV>300)accV=0; tV=nowV;
      accV+=e.deltaY;
      /* 260 px accumulés : une traction délibérée, pas une fin de course. */
      if(Math.abs(accV)<260)return;
      const cible=versLeBas?'b':'h';
      accV=0; froid=Date.now()+900;
      versVoisin(cible);
      return;
    }""",
'seuil de la molette verticale')

# ── l'horizontale aussi remonte un peu : 70 px partait sur un scroll oblique
s = ech(s,
"""    if(Math.abs(acc)<70)return;""",
"""    /* 70 px partait sur un défilement un peu oblique. 130 : il faut
       vouloir aller à côté. */
    if(Math.abs(acc)<130)return;""",
'seuil de la molette horizontale')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (scroll)')
