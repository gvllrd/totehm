// Exact locators only. The caller loads the current account/authorized member
// before resolving; the fragment conveys no content, credentials or permission.
// 19/11 — les mots de Wah : la 5e box est STORY (vue `stories`) ; `wisdom` reste lu, c'est l'ancien nom que
// portent les liens déjà envoyés par ChatGPT et Telegram.
const types={habit:['habits','h'],objective:['objectives','t'],repulsion:['repulsions','r'],vision:['visions','v'],story:['stories','w'],wisdom:['stories','w']};
// Objectif et vision sont la MÊME box (19/11) : la date décide de la vue, l'identifiant ne change jamais.
// Un lien `objective` vers une box devenue vision (ou l'inverse) la retrouve dans l'autre vue.
const MEME_BOX={objective:'vision',vision:'objective'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseElementLink(hash){
  if(typeof hash!=='string'||hash.length>256000||!hash.startsWith('#element='))return null;
  const p=new URLSearchParams(hash.slice(1)),kind=p.get('element'),ref=p.get('ref');
  if(p.size!==2||p.getAll('element').length!==1||p.getAll('ref').length!==1||!Object.hasOwn(types,kind)||typeof ref!=='string')return null;
  if(kind==='habit' ? !ref.length||ref.length>16000||ref!==ref.trim()||/[\u0000-\u001f\u007f]/.test(ref)
    : kind==='repulsion' ? !/^[1-9][0-9]{0,18}$/.test(ref) : !uuid.test(ref))return null;
  return {kind,ref};
}
export function resolveElementLink(link,lists){
  if(!link||!Object.hasOwn(types,link.kind))return null;
  const chercher=k=>{ const [view,kind]=types[k];
    const row=(lists[view]||[]).find(x=>k==='habit' ? (x.t0??x.t)===link.ref
      : (typeof x.id!=='number'||Number.isSafeInteger(x.id))&&String(x.id)===link.ref);
    return row&&row.id!=null ? {view,kind,id:String(row.id)} : null; };
  return chercher(link.kind) || (MEME_BOX[link.kind] ? chercher(MEME_BOX[link.kind]) : null);
}
