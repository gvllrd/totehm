/* ══ L'APPUI D'UNE TOUCHE — copié de tools/ps2.js dans chaque page (jamais importé) ══
   Wah (26/11) : « sur version mobile ET ordinateur, on doit vraiment sentir que c'est des boutons quand on appuie
   dessus. » Le `:active` d'un navigateur de téléphone n'est pas fiable : il n'arrive pas tant que le doigt n'a pas
   été jugé immobile, et il disparaît au moindre glissement. On pose donc l'état NOUS-MÊMES, au `pointerdown`, et on
   le retire dès que le doigt part (`pointerup`, `pointercancel`, sortie). Le dessin de l'enfoncement vit dans
   `tools/ps2.css` (`.is-press`) ; ici, rien que le moment où il s'applique. Passif : aucun geste n'est avalé. */
(function(){
  var SEL='.k2,.k2r';
  var tenue=null;
  function poser(e){
    var t=e.target&&e.target.closest?e.target.closest(SEL):null;
    if(!t||t.hasAttribute('disabled')) return;
    lacher(); tenue=t; t.classList.add('is-press');
  }
  function lacher(){ if(tenue){ tenue.classList.remove('is-press'); tenue=null; } }
  document.addEventListener('pointerdown',poser,{passive:true,capture:true});
  for(var i=0,n=['pointerup','pointercancel','pointerleave','dragstart','blur'];i<n.length;i++)
    document.addEventListener(n[i],lacher,{passive:true,capture:true});
  /* un glissement qui sort de la touche la relâche, comme un vrai bouton */
  document.addEventListener('pointermove',function(e){
    if(!tenue) return;
    var t=e.target&&e.target.closest?e.target.closest(SEL):null;
    if(t!==tenue) lacher();
  },{passive:true,capture:true});
})();
/* ══ fin ps2.js ══ */
