// Optional preparation after an explicit request. No report, model, media export or new push.
import {retrieveElement,retrieveOwnerGraph,type ContextResult,type ContextGraph,type ContextItem,type ElementRef} from './chatgpt-context.ts';
import {TelegramAPIError} from './tracking-telegram.ts';
const APP='https://www.totehm.com/totehm';
export const STONER_URL='https://www.totehm.space/stoner';
export const validPracticeId=(v:unknown):v is string=>typeof v==='string'&&/^[1-9][0-9]{0,18}$/.test(v)&&(v.length<19||v<='9223372036854775807');
export function practiceURL(id?:string){
 if(id!==undefined&&!validPracticeId(id))throw new Error('invalid_outcome');
 return APP+'?telegram=1'+(id?'#practice='+id:'');
}
export function practiceKeyboard(id:string,confirm=false){
 const open={text:'Open my Habit',web_app:{url:practiceURL(id)}};
 return {inline_keyboard:[...(confirm?[[{text:'Show linked text here',callback_data:`t:p:${id}:show`}]]:[]),[open],[{text:'Stoner method',url:STONER_URL}]]};
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
// Display only existing canonical choices; reading a phrase never changes the bot schedule.
export function practiceCadence(value:string|undefined):string|null{
 const labels:Record<string,string>={hourly:'every hour',several_daily:'several times a day',daily:'daily',twice_week:'twice a week',weekly:'weekly',biweekly:'every two weeks',twice_month:'twice a month',monthly:'monthly',every_1st_month:'every 1st of the month',every_15th_month:'every 15th of the month',seasonal:'every season change',quarterly:'every quarter',semiannual:'every six months',yearly:'yearly',randomly:'randomly',sometimes:'sometimes'};
 if(!value)return null;
 if(Object.hasOwn(labels,value))return labels[value];
 return /^every_(minute|morning|afternoon|evening|weekday|night|other_day|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|birthday|newyear)$/.test(value)?value.replace(/_/g,' ').replace('newyear','new year'):null;
}
export function preparationText(context:ContextResult,habit:string):string{
 const root=context.items.find(i=>i.kind==='habit'&&i.ref===habit);
 if(!root)return 'This Habit is no longer available. Open your TOTEHM to choose a current step.';
 const byKey=new Map(context.items.map(i=>[i.key,i]));
 const select=(keys:string[],kind?:ContextItem['kind'])=>[...new Set(keys)].map(k=>byKey.get(k)).filter((x):x is ContextItem=>!!x&&(!kind||x.kind===kind))
  .sort((a,b)=>(a.rank??Infinity)-(b.rank??Infinity)).slice(0,2);
 const triggers=select(context.edges.filter(e=>e.relation==='instead'&&e.to===root.key).map(e=>e.from));
 const whys=context.edges.filter(e=>e.relation==='serves'&&e.from===root.key).map(e=>e.to);
 const goals=select(whys,'objective');
 const visions=select(whys,'vision');
 const stories=select(context.edges.filter(e=>e.relation==='learned_from'&&triggers.some(r=>r.key===e.to)).map(e=>e.from));
 const lines=['My next step','Your recorded links · excerpts'];
 const group=(title:string,items:ContextItem[])=>{if(items.length)lines.push(title,items.map(i=>'“'+excerpt(i.text)+'”').join('\n'));};
 group('TRIGGER · INSTEAD OF',triggers);group(triggers.length?'INSTEAD · MY HABIT':'MY HABIT',[root]);
 if(root.rhythm_text)lines.push('MY TIMING · MY WORDS','“'+excerpt(root.rhythm_text)+'”');
 const cadence=practiceCadence(root.freq);if(cadence)lines.push('SAVED CHECK-IN RHYTHM',cadence);
 if(root.rhythm_text)lines.push('Check-in cadence does not schedule an exact alert time.');
 if(root.usual_place?.source==='habit_spots'&&root.usual_place.text)lines.push('WHERE I USUALLY DO IT','“'+excerpt(root.usual_place.text,160)+'”','Your saved usual place, not your current position or a timed spot.');
 group('WHY',goals);group('VISION · THE BIG WHY',visions);group('MY STORY · LINKED TO THIS TRIGGER',stories);
 if(!triggers.length&&!goals.length&&!visions.length&&!stories.length)lines.push('No linked why or trigger is available in this view. You can add your own in the Habit.');
 if(context.coverage&&(!context.coverage.source_complete||context.coverage.omitted_related))lines.push('This is part of your linked context. Open the original to see more.');
 lines.push('Notice the trigger. Choose your next step.','Open the Habit for full text, private media and dated spots.');
 return lines.join('\n\n');
}
export async function practiceTarget(db:any,telegram:number,id:string){
 if(!validPracticeId(id))return null;
 const r=await db.rpc('tracking_practice_target',{p_telegram:telegram,p_outcome:id});
 if(r.error)throw new Error('practice_target_failed');
 return r.data?.ok&&typeof r.data.user_id==='string'&&typeof r.data.habit==='string'?r.data:null;
}
export async function readPreparation(db:any,target:{user_id:string;habit:string}){
 return preparationText(await retrieveElement(db,target.user_id,{kind:'habit',ref:target.habit},12),target.habit);
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
 const boxes=linkedPracticeBoxes(context,habit),last=Math.max(0,Math.ceil(boxes.length/10)-1),current=Math.min(page,last);
 const rows:any[][]=boxes.slice(current*10,current*10+10).map(box=>[{text:(box.kind==='repulsion'?'Instead of: ':'Why: ')+excerpt(box.text,48),
  callback_data:linkedPracticeCallback(id,box.kind==='repulsion'?'r':'w',box.ref)}]);
 const navigation=[];
 if(current>0)navigation.push({text:'Previous links',callback_data:`t:k:${id}:${current-1}`});
 if(current<last)navigation.push({text:'More links',callback_data:`t:k:${id}:${current+1}`});
 if(navigation.length)rows.push(navigation);
 if(context.truncated)rows.push([{text:'More in my Habit',url:practiceURL(id)}]);
 return rows;
}
export function linkedPracticeText(context:ContextGraph,habit:string,category:'w'|'r',ref:string):string|null{
 const box=linkedPracticeBoxes(context,habit).find(i=>i.ref===ref&&(category==='r'?i.kind==='repulsion':i.kind==='objective'||i.kind==='vision'));
 if(!box)return null;
 const title=box.kind==='repulsion'?'Instead of':box.kind==='vision'?'Why · vision':'Why · Deadline: '+box.target_at;
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
