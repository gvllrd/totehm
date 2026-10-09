/* COM member navigation. Copied into independent pages; no runtime import. */
const COM_HIGHER_BADGE = '<svg viewBox="0 0 600 200" role="img" aria-label="Higher"><defs><mask id="cm-hbmask"><rect width="600" height="200" fill="white"/><circle cx="60" cy="0" r="14" fill="black"/><circle cx="140" cy="0" r="14" fill="black"/><circle cx="220" cy="0" r="14" fill="black"/><circle cx="300" cy="0" r="14" fill="black"/><circle cx="380" cy="0" r="14" fill="black"/><circle cx="460" cy="0" r="14" fill="black"/><circle cx="540" cy="0" r="14" fill="black"/><circle cx="60" cy="200" r="14" fill="black"/><circle cx="140" cy="200" r="14" fill="black"/><circle cx="220" cy="200" r="14" fill="black"/><circle cx="300" cy="200" r="14" fill="black"/><circle cx="380" cy="200" r="14" fill="black"/><circle cx="460" cy="200" r="14" fill="black"/><circle cx="540" cy="200" r="14" fill="black"/><circle cx="0" cy="70" r="14" fill="black"/><circle cx="0" cy="130" r="14" fill="black"/><circle cx="600" cy="70" r="14" fill="black"/><circle cx="600" cy="130" r="14" fill="black"/></mask></defs><rect width="600" height="200" fill="#333366" mask="url(#cm-hbmask)"/><g fill="#ffffff" transform="translate(34.32, 144.42)"><path transform="translate(0.000,0) scale(0.144,-0.144)" d="M596 700H832L692 0H456ZM238 0H2L142 700H378ZM523 258H274L313 452H562Z"/><path transform="translate(115.776,0) scale(0.144,-0.144)" d="M-5 0 104 547H329L220 0ZM241 591Q182 591 147.5 622.0Q113 653 113 698Q113 751 152.5 786.0Q192 821 257 821Q316 821 350.5 792.0Q385 763 385 718Q385 662 345.5 626.5Q306 591 241 591Z"/><path transform="translate(162.576,0) scale(0.144,-0.144)" d="M255 -204Q172 -204 103.5 -187.0Q35 -170 -16 -136L80 18Q113 -7 161.5 -21.5Q210 -36 259 -36Q325 -36 355.0 -8.5Q385 19 395 68L409 138L450 294L485 464L501 547H716L629 110Q596 -57 499.5 -130.5Q403 -204 255 -204ZM260 30Q200 30 146.0 58.0Q92 86 58.0 139.0Q24 192 24 266Q24 327 46.5 379.5Q69 432 109.5 472.0Q150 512 203.5 534.5Q257 557 318 557Q379 557 424.5 533.0Q470 509 490.0 451.5Q510 394 493 294Q478 204 446.0 145.5Q414 87 367.0 58.5Q320 30 260 30ZM332 207Q361 207 383.0 219.5Q405 232 417.0 255.0Q429 278 429 309Q429 340 408.5 359.5Q388 379 350 379Q321 379 299.0 366.5Q277 354 264.5 331.0Q252 308 252 277Q252 246 273.5 226.5Q295 207 332 207Z"/><path transform="translate(264.960,0) scale(0.144,-0.144)" d="M470 557Q535 557 584.0 528.5Q633 500 654.5 443.5Q676 387 659 302L599 0H373L428 275Q437 320 424.0 343.5Q411 367 375 367Q337 367 311.0 341.5Q285 316 274 263L221 0H-5L143 742H369L300 396L260 436Q299 499 356.5 528.0Q414 557 470 557Z"/><path transform="translate(366.048,0) scale(0.144,-0.144)" d="M321 -10Q231 -10 163.5 21.0Q96 52 58.0 109.0Q20 166 20 243Q20 333 62.0 404.0Q104 475 180.5 516.0Q257 557 359 557Q447 557 509.0 526.0Q571 495 604.0 441.0Q637 387 637 316Q637 291 633.5 267.0Q630 243 625 221H200L221 330H521L427 301Q435 333 426.5 355.5Q418 378 398.0 390.5Q378 403 349 403Q308 403 284.0 381.0Q260 359 249.5 324.0Q239 289 239 251Q239 200 266.5 178.5Q294 157 347 157Q378 157 409.0 166.5Q440 176 466 195L560 58Q504 20 443.5 5.0Q383 -10 321 -10Z"/><path transform="translate(459.360,0) scale(0.144,-0.144)" d="M-5 0 104 547H317L286 392L265 436Q299 501 359.5 529.0Q420 557 498 557L458 357Q444 359 432.5 360.0Q421 361 409 361Q353 361 318.5 336.0Q284 311 272 253L221 0Z"/></g></svg>';
function comMemberLinks(home = false, enabled = null) {
  const item = (content, hint) => '<div class="cm-item">' + content + '<p class="cm-hint">' + hint + '</p></div>';
  return '<nav class="cm-menu" aria-label="My TOTEHM ecosystem">' +
    item('<a class="cm-action" data-com-open href="/totehm#in">Open my TOTEHM</a>', 'Tap on it') +
    item('<a class="cm-action" href="/search">Search a TOTEHM</a>', 'Turn it over') +
    item('<a class="cm-action" id="btn-get-higher" data-com-bridge="boutique" href="https://www.higher.boutique/get_higher">Get ' + COM_HIGHER_BADGE + '</a>', 'Put it on your tongue') +
    item('<a class="cm-action" href="/higherself">Reflect with my TOTEHM</a>', 'Higher Self · TotehmBot') +
    item(home ? '<button class="cm-action" id="myspaces-open" type="button">My TOTEHM spaces</button>' : '<a class="cm-action" href="/totehm?spaces=1">My TOTEHM spaces</a>', 'My TOTEHM, right now, right here · in SPACE') +
    item('<a class="cm-action" id="wear-btn" data-com-bridge="boutique" href="https://www.higher.boutique/">Totehmize my cloth</a>', 'HIGHER BOUTIQUE') +
    item('<a class="cm-action" data-com-monetize href="' + (enabled === false ? '/monetize' : '/console') + '">' + (enabled === false ? 'Monetize my TOTEHM ecosystem' : 'Manage my subscriptions') + '</a>', '<span data-com-offer-hint>' + (enabled === false ? 'Your audience · your annual subscription' : enabled === true ? 'My offer · my subscribers · my subscriptions' : 'Subscription settings') + '</span>') +
    '</nav>';
}
function paintComMemberOffer(enabled) {
  document.querySelectorAll('[data-com-monetize]').forEach(link => {
    link.href = enabled === false ? '/monetize' : '/console';
    link.textContent = enabled === false ? 'Monetize my TOTEHM ecosystem' : 'Manage my subscriptions';
  });
  document.querySelectorAll('[data-com-offer-hint]').forEach(hint => {
    hint.textContent = enabled === false ? 'Your audience · your annual subscription' : enabled === true ? 'My offer · my subscribers · my subscriptions' : 'Subscription settings';
  });
}
let comOfferSeq = 0;
function resetComMemberOffer() { comOfferSeq++; paintComMemberOffer(null); }
async function readComMemberOffer(sb, currentUser) {
  const uid = currentUser()?.id || null, seq = ++comOfferSeq;
  if (!uid) { paintComMemberOffer(false); return false; }
  try {
    const { data, error } = await sb.rpc('my_console');
    if (seq !== comOfferSeq || uid !== currentUser()?.id) return;
    if (error) { console.error('[member offer]', error.message); paintComMemberOffer(null); return; }
    const enabled=data?.signed_in && typeof data.offer?.enabled === 'boolean' ? data.offer.enabled : null;
    paintComMemberOffer(enabled);return enabled;
  } catch (error) {
    if (seq !== comOfferSeq || uid !== currentUser()?.id) return;
    console.error('[member offer]', error?.message || error); paintComMemberOffer(null);
  }
}
function wireComMemberMenu(host, { open, bridge } = {}) {
  host.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
    if (link.hasAttribute('data-com-open') && open) { event.preventDefault(); open(link); }
    else if (link.dataset.comBridge && bridge) { event.preventDefault(); bridge(link.dataset.comBridge, link.href); }
  });
}
/* Same 60s, one-use SSO bridge as tools/sso_snippet.js. No session in URLs. */
async function comMemberBridge(sb, target, url, apiURL, publicKey) {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const response = await fetch(apiURL + '/functions/v1/sso-mint', {
        method: 'POST', headers: { authorization: 'Bearer ' + session.access_token, apikey: publicKey, 'content-type': 'application/json' },
        body: JSON.stringify({ target })
      });
      if (response.ok) {
        const { code } = await response.json();
        if (code) { location.href = url + (url.includes('#') ? '&' : '#') + 'sso=' + code; return; }
      } else console.error('[member bridge]', response.status);
    }
  } catch (error) { console.error('[member bridge]', error?.message || error); }
  location.href = url;
}
