/* ══ LA VIGNETTE — copié de tools/vignette.js dans chaque page (jamais importé) ══
   Wah (15/11) : « passer aux vignettes ». Une photo est stockée en 1600 px ; une tuile de grille en montre ~190.
   Lire la photo entière pour la réduire à l'écran, c'est 10 à 20 fois trop d'octets. La vignette (520 px, JPEG
   à 80 %, ~30 Ko) vit À CÔTÉ de sa photo, sous `<chemin>.jpg` — la même convention que la vignette d'une
   vidéo dans `element-media`, lue par la même règle (`_element_media_readable`, `_clip_readable`).
   Ce bloc ne fait QUE réduire : il ne connaît ni les seaux ni la session. La page décide d'où lire, où écrire,
   et jamais dans le dossier d'un autre membre. Une vignette qui manque n'est pas une erreur : la grille
   retombe sur la photo entière, et son AUTEUR la fabrique la première fois qu'il la voit. */
window.TOTEHM_VIGNETTE = (() => {
  const COTE = 520, QUALITE = .8;                       /* le grand côté, en px : 2,7 × une tuile de 190 */
  const cle = p => p + '.jpg';
  const image = src => new Promise((ok, ko) => {
    const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = ko; i.src = src;
  });
  /* `source` : un Blob/File, ou une URL (signée). Rend un Blob JPEG, ou null — jamais une exception. */
  async function reduire(source){
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    try{
      const img = await image(url), w = img.naturalWidth, h = img.naturalHeight;
      if(!w || !h) return null;
      const k = Math.min(1, COTE / Math.max(w, h)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return await new Promise(r => c.toBlob(r, 'image/jpeg', QUALITE));
    }catch(_){ return null; }
    finally{ if(typeof source !== 'string') URL.revokeObjectURL(url); }
  }
  return { cle, reduire, COTE };
})();
/* ══ fin LA VIGNETTE ══ */
