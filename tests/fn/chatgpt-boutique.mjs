// Pure boutique handoff: no DB, HTTP, checkout, production or member data.
import assert from 'node:assert/strict';
import {enrichBoutique} from '../../backend/supabase/functions/_shared/chatgpt-boutique.ts';
import {ContextReadError,elementURL} from '../../backend/supabase/functions/_shared/chatgpt-context.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const STREETWEAR='https://www.higher.boutique/streetwear';
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
const item=(kind,ref)=>({kind,ref,url:elementURL({kind,ref})});
const personal={source:'owner_totehm',items:[item('wisdom',id(1))],edges:[{from:'a',to:'b'}]};
for(const flag of [undefined,false]){
 check(enrichBoutique(personal,flag)===personal,'No flag preserves the exact result object');
 const unreadable=new Proxy({},{get(){throw Error('An opt-out must not inspect source data');}});
 check(enrichBoutique(unreadable,flag)===unreadable,'Opt-out performs no source access');
}
for(const flag of ['true',1,null,{},[]]){
 assert.throws(()=>enrichBoutique(personal,flag),e=>e instanceof ContextReadError&&e.message==='invalid_request');checks++;
}
for(const source of [{kind:'subscribed_member',member:'artist',adopted_by_user:false},'subscribed_member',undefined]){
 const result=enrichBoutique({...personal,source},true);
 check(!result.boutique.available&&result.boutique.why==='personal_elements_only'&&!result.boutique.candidates&&!result.boutique.url,'Only an authenticated personal result can offer a clothing handoff');
}
const result=enrichBoutique(personal,true);
check(result.items===personal.items&&result.edges===personal.edges,'Handoff does not replace source choices, ordering or relationships');
check(result.boutique.available&&result.boutique.scope==='selected_personal_elements'&&result.boutique.url===STREETWEAR,'The optional payload scopes itself to selected personal elements');
check(result.boutique.checkout_required&&!result.boutique.photos_selected&&!result.boutique.style_selected&&!result.boutique.order_created,'The member still chooses, pays and initiates production in the boutique');
for(const [kind,ref] of [['wisdom',id(1)],['vision',id(2)],['objective',id(3)],['repulsion','9007199254740993']]){
 const candidate=enrichBoutique({source:'owner_totehm',items:[item(kind,ref)]},true).boutique.candidates[0];
 const url=new URL(candidate.url);
 check(url.origin+url.pathname===STREETWEAR&&url.searchParams.size===1&&url.searchParams.get('wear')===kind+':'+ref,'The supported non-text reference uses the real boutique prefill parser');
 check(candidate.element_preselected&&candidate.selection_required&&candidate.element.url===elementURL({kind,ref}),'An unsigned locator keeps the exact original and never completes the flow');
}
for(const ref of ['Practice the piano','私の習慣 🌍 & secret=personal-note','A'.repeat(16000)]){
 const candidate=enrichBoutique({source:'owner_totehm',items:[item('habit',ref)]},true).boutique.candidates[0];
 const url=new URL(candidate.url),original=new URL(candidate.element.url);
 check(candidate.url===STREETWEAR&&!url.search&&!url.hash&&!candidate.element_preselected&&candidate.selection_required,'Habit text is never sent in a boutique URL query, including short and long Habits');
 check(original.search===''&&new URLSearchParams(original.hash.slice(1)).get('ref')===ref,'The original Habit remains exact in its private fragment locator');
}
const large=enrichBoutique({source:'owner_totehm',items:[item('habit','Draw'),item('habit','Draw'),item('wisdom',id(1)),item('vision',id(2)),item('objective',id(3)),{kind:'objective',ref:'forged'},{kind:'habit',ref:''}]},true);
check(large.boutique.candidates.length===3&&large.boutique.omitted_elements===1,'The budget is three distinct valid selected elements and omissions are disclosed');
check(large.boutique.candidates.map(c=>c.element.kind).join('|')==='habit|wisdom|vision','Candidate ordering follows the personal selection without inventing a new rank');
const noValid=enrichBoutique({source:'owner_totehm',items:[{kind:'objective',ref:'not-a-uuid'},{kind:'repulsion',ref:'-1'}]},true);
check(noValid.boutique.candidates.length===0&&noValid.boutique.omitted_elements===0,'Malformed references never become wearable elements');
const noUrls=enrichBoutique({source:'owner_totehm',items:[{kind:'wisdom',ref:id(1)},{kind:'vision',ref:id(2),url:'https://evil.example/?access_token=DO_NOT_FORWARD'}]},true);
check(noUrls.boutique.candidates.every(c=>c.element.url===elementURL(c.element))&&!JSON.stringify(noUrls.boutique).includes('DO_NOT_FORWARD'),'Original links are reconstructed safely when absent or carrying unrelated credentials');
check(noUrls.boutique.candidates.every(c=>[...new URL(c.url).searchParams.keys()].every(k=>k==='wear')),'No user, authentication, payment, style or image parameters enter the handoff URL');
const nestedForeign=enrichBoutique({source:'owner_totehm',items:[{...item('wisdom',id(1)),source:{kind:'subscribed_member',member:'artist'}}]},true);
check(nestedForeign.boutique.candidates.length===0,'A nested creator attribution cannot be promoted to a personal clothing candidate');
check(!JSON.stringify(result.boutique).match(/"(?:price|style|size|pick|shots|payment_url|checkout_url)":/),'The helper invents no price, style, photo selection or payment session');
console.log(JSON.stringify({suite:'Boutique personal handoff',checks,passed:checks}));
