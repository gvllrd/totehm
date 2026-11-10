// Exact locators only. The caller loads the current account/authorized member
// before resolving; the fragment conveys no content, credentials or permission.
const types={habit:['habits','h'],objective:['objectives','t'],repulsion:['repulsions','r'],vision:['visions','v'],wisdom:['wisdom','w']};
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
  const [view,kind]=types[link.kind];
  const row=(lists[view]||[]).find(x=>link.kind==='habit' ? (x.t0??x.t)===link.ref
    : (typeof x.id!=='number'||Number.isSafeInteger(x.id))&&String(x.id)===link.ref);
  return row&&row.id!=null ? {view,kind,id:String(row.id)} : null;
}
