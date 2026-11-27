/* ══ LES COMMANDES D'UN SPOT — tools/spot_card.js ══ */
const ICONES_SPOT={
  go:'<path d="M3 4l10-2-2 10-3-5zM8 7l-4 5"/>',
  share:'<path d="M8 10V2m-3 3 3-3 3 3M3 7v6h10V7"/>',
  del:'<path d="M3 4.5h10m-7-2h4m-6 2 1 9h6l1-9M7 7v4m2-4v4"/>',
  pass:'<path d="M2 4h12v2a2 2 0 0 0 0 4v2H2v-2a2 2 0 0 0 0-4zM9 5.5v.5m0 1.5V8m0 1.5v.5"/>',
  ics:'<path d="M3 4h10v9H3zM5.5 2.5v3m5-3v3M3 7h10m-7 3h1m2 0h1"/>'
};
function toucheSpot(action,id,nom){
  const icone=ICONES_SPOT[action==='passes'?'pass':action];
  return '<button type="button" class="spot-key" data-'+action+'="'+esc(String(id))+'">'
    +'<span class="k2 spot-keycap" aria-hidden="true"><svg viewBox="0 0 16 16">'+icone+'</svg></span>'
    +'<span class="spot-key-label">'+esc(nom)+'</span></button>';
}
function nomToucheSpot(b,nom){
  const l=b.querySelector('.spot-key-label')||b;
  l.textContent=nom;
}
function loupeSpot(){
  return '<button type="button" class="spot-loupe" data-spot-zoom aria-pressed="false" aria-label="Bigger">'
    +'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M15 15l6 6M7.5 10h5M10 7.5v5"/></svg></button>';
}
function zoomSpot(b){
  const data=b.closest('.spot-data'), on=data.classList.toggle('is-zoom');
  b.setAttribute('aria-pressed',String(on));
  b.setAttribute('aria-label',on?'Smaller':'Bigger');
  b.querySelector('path').setAttribute('d','M15 15l6 6M7.5 10h5'+(on?'':'M10 7.5v5'));
}
/* ══ fin LES COMMANDES D'UN SPOT ══ */
