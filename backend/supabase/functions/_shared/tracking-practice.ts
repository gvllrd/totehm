// TotehmBot's REMEMBER links (↺ Why · ↺ Trigger) and the native mini-app locator. No report, model, media export or new push.
import {retrieveOwnerGraph,type ContextGraph,type ContextItem,type ElementRef} from './chatgpt-context.ts';
import {TelegramAPIError} from './tracking-telegram.ts';
const APP='https://www.totehm.com/totehm';
export const validPracticeId=(v:unknown):v is string=>typeof v==='string'&&/^[1-9][0-9]{0,18}$/.test(v)&&(v.length<19||v<='9223372036854775807');
export function practiceURL(id?:string){
 if(id!==undefined&&!validPracticeId(id))throw new Error('invalid_outcome');
 return APP+'?telegram=1'+(id?'#practice='+id:'');
}
// A provider-rejected web_app button can fall back to a normal secure native URL.
// An uncertain request is never retried: Telegram may already have delivered it.
export async function practiceTelegram(telegram:(method:string,payload:any)=>Promise<any>,method:string,payload:any){
 try{return await telegram(method,payload);}catch(error){
  if(!(error instanceof TelegramAPIError)||!error.definite||error.code!==400)throw error;
  let changed=false;
  const rows=payload.reply_markup?.inline_keyboard?.map((row:any[])=>row.map(b=>{if(!b.web_app)return b;changed=true;return {text:b.text,url:b.web_app.url};}));
  if(!changed)throw error;
  return await telegram(method,{...payload,reply_markup:{inline_keyboard:rows}});
 }
}
const excerpt=(v:string,max=260)=>{
 const s=v.replace(/\s+/g,' ').trim();if(s.length<=max)return s;
 let end=max-1;if(/[\uD800-\uDBFF]/.test(s[end-1]??''))end--;return s.slice(0,end)+'…';
};
export async function practiceTarget(db:any,telegram:number,id:string){
 if(!validPracticeId(id))return null;
 const r=await db.rpc('tracking_practice_target',{p_telegram:telegram,p_outcome:id});
 if(r.error)throw new Error('practice_target_failed');
 return r.data?.ok&&typeof r.data.user_id==='string'&&typeof r.data.habit==='string'?r.data:null;
}

// A callback carries a stable native ref, never a label or a position in a mutable list.
// 19 outcome digits + UUID fit Telegram's 64-byte callback limit (62 bytes).
export function linkedPracticeCallback(id:string,category:'w'|'r',ref:string):string{
 if(!validPracticeId(id)||!((category==='w'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref))||(category==='r'&&validPracticeId(ref))))throw new Error('invalid_linked_box');
 return `t:x:${id}:${category}:${ref}`;
}
export function linkedPracticeBoxes(context:ContextGraph,habit:string):ContextItem[]{
 const root=context.items.find(i=>i.kind==='habit'&&i.ref===habit);
 if(!root)return [];
 const targets=new Set(context.edges.filter(e=>e.relation==='serves'&&e.from===root.key).map(e=>e.to));
 const triggers=new Set(context.edges.filter(e=>e.relation==='instead'&&e.to===root.key).map(e=>e.from));
 const order=(i:ContextItem)=>i.kind==='objective'?0:i.kind==='vision'?1:2;
 return context.items.filter(i=>((i.kind==='objective'||i.kind==='vision')&&targets.has(i.key))||(i.kind==='repulsion'&&triggers.has(i.key)))
  .map((item,index)=>({item,index})).sort((a,b)=>order(a.item)-order(b.item)||(a.item.rank??Infinity)-(b.item.rank??Infinity)||a.index-b.index).map(x=>x.item);
}
export function linkedPracticeRows(context:ContextGraph,habit:string,id:string,page=0):any[][]{
 if(!validPracticeId(id)||!Number.isInteger(page)||page<0||page>120)throw new Error('invalid_linked_page');
 if(!context.items.some(i=>i.kind==='habit'&&i.ref===habit))return [];
 const boxes=linkedPracticeBoxes(context,habit),last=boxes.length>2?Math.ceil((boxes.length-2)/10):0,current=Math.min(page,last);
 // 23/11 (Wah) : REMEMBER — « ↺ Why: » (objectif, vision) et « ↺ Trigger: » (la répulsion, méthode Stoner) ; deux au plus
 // sous la Habit, puis « ↺ +N more » ; un tap montre le texte entier et n'enregistre rien.
 const row=(box:any)=>[{text:(box.kind==='repulsion'?'↺ Trigger: ':'↺ Why: ')+excerpt(box.text,44),
  callback_data:linkedPracticeCallback(id,box.kind==='repulsion'?'r':'w',box.ref)}];
 if(current===0){
  const rows:any[][]=boxes.slice(0,2).map(row);
  if(boxes.length>2)rows.push([{text:'↺ +'+(boxes.length-2)+' more',callback_data:`t:k:${id}:1`}]);
  if(context.truncated&&boxes.length<=2)rows.push([{text:'More in my Habit',url:practiceURL(id)}]);
  return rows;
 }
 const rows:any[][]=boxes.slice(2+(current-1)*10,2+current*10).map(row);
 const navigation=[];
 navigation.push({text:'Previous links',callback_data:`t:k:${id}:${current-1}`});
 if(2+current*10<boxes.length)navigation.push({text:'More links',callback_data:`t:k:${id}:${current+1}`});
 if(navigation.length)rows.push(navigation);
 if(context.truncated)rows.push([{text:'More in my Habit',url:practiceURL(id)}]);
 return rows;
}
export function linkedPracticeText(context:ContextGraph,habit:string,category:'w'|'r',ref:string):string|null{
 const box=linkedPracticeBoxes(context,habit).find(i=>i.ref===ref&&(category==='r'?i.kind==='repulsion':i.kind==='objective'||i.kind==='vision'));
 if(!box)return null;
 const title=box.kind==='repulsion'?'Trigger':box.kind==='vision'?'Why · vision':'Why · Deadline: '+box.target_at;
 const partial=box.text_truncated||(box.text_length??box.text.length)>box.text.length;
 return title+'\n\n'+box.text+(partial?'\n\nThis text continues in the original box. Open my Habit to read it.':'');
}
export async function readPracticeLinks(db:any,target:{user_id:string;habit:string},focus?:ElementRef){
 const graph=await retrieveOwnerGraph(db,target.user_id,focus??{kind:'habit',ref:target.habit});
 // A why keeps its UUID when its deadline changes. Try the other partition only
 // when a physical cap hid the exact current view; all reads keep owner filters.
 if(focus?.kind==='objective'&&graph.truncated&&!graph.items.some(i=>(i.kind==='objective'||i.kind==='vision')&&i.ref===focus.ref)){
  return retrieveOwnerGraph(db,target.user_id,{kind:'vision',ref:focus.ref});
 }
 return graph;
}
