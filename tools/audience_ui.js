/* ══ AUDIENCE — 13/10 : quatre niveaux, une pastille. COPIÉ tel quel depuis tools/audience_ui.js
   (jamais importé). PRIVATE = moi · FIGHER CLUB = les membres · MY SUBSCRIBERS = mes abonnés ·
   16/10 : FIGHER CLUB EST le plus ouvert (il n'y a plus de PUBLIC). Le serveur décide (`_audience_ok`) ;
   ceci ne fait que le dire. ══ */
/* ⚠️ TROIS NIVEAUX DEPUIS LE 16/10 (Wah : « y a pas de mode PUBLIC »). FIGHER CLUB est le plus ouvert :
   c'est le public, à condition d'avoir un Totehm (une habit, un objectif, une répulsion). La base normalise
   une ancienne valeur `public` en `figher` ; la page la LIT donc comme FIGHER CLUB et ne la propose plus. */
const AUD = [['private','PRIVATE'],['figher','FIGHER CLUB'],['subscribers','MY SUBSCRIBERS']];
const audNorm = a => a === 'public' ? 'figher' : a;
const AUD_ICON = {
  private:'<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.5" y="5.5" width="7" height="5" rx="1" fill="currentColor"/><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  figher:'<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="6" cy="6" r="2.2" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="6" cy="6" r=".9" fill="currentColor"/></svg>',
  subscribers:'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.2l1.4 3 3.3.4-2.4 2.3.6 3.3L6 8.6 3.1 10.2l.6-3.3L1.3 4.6l3.3-.4z" fill="currentColor"/></svg>',
  public:'<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M1.4 6h9.2M6 1.4c-2.6 2.6-2.6 6.6 0 9.2M6 1.4c2.6 2.6 2.6 6.6 0 9.2" fill="none" stroke="currentColor" stroke-width="1"/></svg>'
};
const audOf = s => audNorm(s?.audience || (s?.visibility === 'shared' ? 'figher' : 'private'));
const audName = a => (AUD.find(x => x[0] === audNorm(a)) || [])[1] || '';
const audPick = (cur0, attr) => { const cur = audNorm(cur0); return '<div class="aud" role="radiogroup" aria-label="Who sees it">' + AUD.map(([k, l]) =>
  '<button type="button" role="radio" aria-checked="' + (k === cur) + '"' + (k === cur ? ' class="is-on"' : '') + ' ' + attr + '="' + k + '">' + AUD_ICON[k] + '<span>' + l + '</span></button>').join('') + '</div>'; };
const audBadge = a => AUD_ICON[a] ? '<span class="audb" role="img" aria-label="' + audName(a) + '" title="' + audName(a) + '">' + AUD_ICON[a] + '</span>' : '';
const audMark = (root, attr, a0) => { const a = audNorm(a0); return root?.querySelectorAll('[' + attr + ']').forEach(b => { const on = b.getAttribute(attr) === a;
  b.classList.toggle('is-on', on); b.setAttribute('aria-checked', String(on)); }); };
/* ══ fin AUDIENCE ══ */
