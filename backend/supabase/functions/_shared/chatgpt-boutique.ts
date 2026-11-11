// An optional locator into the member-controlled boutique flow, never a checkout.
import {ContextReadError,validElementRef,elementURL,type ElementRef} from './chatgpt-context.ts';
type Row=Record<string,any>;
const STREETWEAR='https://www.higher.boutique/streetwear';
export function enrichBoutique(result:Row,requested:unknown){
  if(requested===undefined||requested===false)return result;
  if(requested!==true)throw new ContextReadError('invalid_request');
  if(result.source!=='owner_totehm')return {...result,boutique:{available:false,why:'personal_elements_only'}};
  const seen=new Set<string>();
  const selected=(Array.isArray(result.items)?result.items:[]).filter((item:any)=>{
    const source=item?.source;
    if(!validElementRef(item)||(source!==undefined&&source!=='owner_totehm'))return false;
    const key=JSON.stringify([item.kind,item.ref]);if(seen.has(key))return false;seen.add(key);return true;
  });
  const candidates=selected.slice(0,3).map((item:any)=>{
    const element:ElementRef={kind:item.kind,ref:item.ref};
    // UUIDs/numeric IDs are unsigned locators that the boutique rechecks against
    // my_trips after sign-in. Habit text stays out of HTTP query strings.
    const preselected=item.kind!=='habit'&&item.ref.length<=160;
    return {element:{...element,url:elementURL(element)},
      url:preselected?STREETWEAR+'?'+new URLSearchParams({wear:item.kind+':'+item.ref}):STREETWEAR,
      element_preselected:preselected,selection_required:true};
  });
  return {...result,boutique:{available:true,scope:'selected_personal_elements',url:STREETWEAR,candidates,
    omitted_elements:Math.max(0,selected.length-candidates.length),checkout_required:true,
    photos_selected:false,style_selected:false,order_created:false}};
}
