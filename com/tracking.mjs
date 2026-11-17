// Private self-report views; the SQL reader owns all counts and permissions.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number.isFinite(Number(v))?Number(v):0;
const source=ref=>typeof ref==='string'&&ref.length>0&&ref.length<=16000&&ref===ref.trim()&&!/[\u0000-\u001f\u007f]/.test(ref)?'https://www.totehm.com/totehm#'+new URLSearchParams({element:'habit',ref}):null;
const habitLink=(ref,label,content=esc(label))=>source(ref)?'<a class="tracking-source" href="'+esc(source(ref))+'" title="Open original">'+content+'</a>':'<div>'+content+'</div><small>Source link unavailable. Open this Habit directly in your TOTEHM.</small>';
const higher='<svg class="vs-hi" viewBox="0 0 600 200" aria-label="Higher"><use href="#higher-badge"/></svg>';
export const PRACTICE_REVIEW_PROMPT='Review my reported practice alongside my TOTEHM. Separate Done, Missed and missing reports. Explain what the evidence supports and suggest one small adjustment, without changing my TOTEHM.';
export function renderPractice(s,{requestedDays=s.days_count,renderHabit}={}){
 const habitPreview=h=>habitLink(h.ref,h.habit,renderHabit?renderHabit(h):esc(h.habit));
 const c=s.counts??{},habits=s.habits??[],days=s.days??[],settings=s.settings??{},span=number(s.days_count)||7;
 const pending=number(c.pending),unanswered=number(c.unanswered);
 let html='<div class="db"><p class="db-t">My practice<i>'+span+' days · self-reported</i></p>'
  +'<div class="tracking-period" role="group" aria-label="Practice period">'+[7,28].map(n=>'<button class="vs-act'+(Number(requestedDays)===n?' is-on':'')+'" type="button" data-track-period="'+n+'" aria-pressed="'+(Number(requestedDays)===n)+'">'+n+' days</button>').join('')+'</div>';
 if(s.stale)html+='<p class="tracking-caption" role="status">Showing the last available '+span+' days. Refresh is temporarily unavailable.</p>';
 /* ⚠️ 16/11 — L'ESSENTIEL (Wah : « le tableau du Go Higher laisse à désirer : garder seulement l'essentiel »). Trois
    chiffres, la grille des Habits, une rangée d'actions. Restent seulement les phrases qui empêchent de MAL LIRE un
    chiffre (un silence n'est pas un échec ; une période partielle ; une notification non livrée) — le reste est parti :
    la couverture, le décompte sous chaque box (la bande des jours le dit), « Worth a look » (la grille le montre), la
    tendance à deux semaines (« insufficient » le plus souvent). */
 html+='<div class="db-k"><div><i>Done</i><b>'+number(c.done)+'</b></div><div><i>Missed</i><b>'+number(c.missed)+'</b></div><div><i>No response</i><b>'+unanswered+'</b></div></div>'
  +'<p class="tracking-caption">No response is never a Missed.'+(pending?' '+pending+' pending.':'')+'</p>';
 if(number(c.partial)||number(c.skipped))html+='<p class="tracking-caption">Earlier reports: '+number(c.partial)+' in part · '+number(c.skipped)+' set aside. Kept as reported.</p>';
 if(s.source_complete===false)html+='<p class="tracking-caption">This is part of the recorded practice.</p>';
 html+='</div>';
 const legacy={d:'done',m:'missed',p:'partial',s:'skipped',a:'unanswered'};
 /* ⚠️ 14/11 — UNE BOX EST SACRÉE, DONC ELLE N'EST PLUS UNE COLONNE (Wah : « il faut revoir le dashboard
    notamment la partie My Habits, en particulier les box qui sont écrasées au niveau de la largeur …
    son format parent hérité du totehm est respecté le plus possible dans les autres endroits où elles
    apparaissent »). Avant : une grille `box | jour | jour | …`, la box coincée entre 95 et 150 px — un
    rendu natif écrasé. Maintenant : une LIGNE par Habit — la box sur TOUTE la largeur du tableau de bord,
    exactement comme dans le TOTEHM, et la bande des jours DESSOUS, en colonnes égales. Aucun défilement
    horizontal, donc aucune box tronquée. */
 let matrix='<div class="tracking-matrix'+(days.length<=7?' is-week':'')+'" style="--tracking-days:'+days.length+'" role="group" aria-label="Habit reports by day">'
  +'<div class="tracking-days tracking-head" aria-hidden="true">'+days.map(d=>'<span class="h" title="'+esc(d.day)+'">'+esc(new Date(d.day+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric'}))+'</span>').join('')+'</div>';
 for(const h of habits){
  const cells=h.day_counts??(h.days??[]).map((v,i)=>({day:days[i]?.day,...(legacy[v]?{[legacy[v]]:1}:{})}));
  matrix+='<div class="tracking-row"><div class="db-n tracking-name">'+habitPreview(h)+'</div>'
   +'<div class="tracking-days">';
  for(let i=0;i<days.length;i++){
   const v=cells[i]??{},done=number(v.done),missed=number(v.missed),partial=number(v.partial),skipped=number(v.skipped),unknown=number(v.unanswered),waiting=number(v.pending);
   const values=[done,missed,partial,skipped,unknown,waiting],labels=['done','missed','in part','set aside','unknown','pending'];
   const title=values.map((n,k)=>n?n+' '+labels[k]:'').filter(Boolean).join(' · ')||'No observation';
   const text=values.map((n,k)=>n?['✓','×','◐','·','?','…'][k]+(n>1?n:''):'').filter(Boolean).join(' ');
   matrix+='<span class="tracking-cell'+(done?' has-done':'')+(missed?' has-missed':'')+'" title="'+esc(days[i].day+': '+title)+'" aria-label="'+esc(days[i].day+': '+title)+'">'+esc(text||'—')+'</span>';
  }
  matrix+='</div></div>';
 }
 matrix+='</div>';
 html+='<div class="db"><p class="db-t">My Habits<i>'+span+' days</i></p>'+(habits.length?matrix:'<p class="db-vide">Your first Habit starts the system.</p>')
  +'<p class="tracking-caption">✓ Done · × Missed · ? no response · … pending'+(number(c.partial)||number(c.skipped)?' · ◐ in part · · set aside':'')+'</p></div>';
 if(number(s.delivery?.failed)||number(s.delivery?.unconfirmed))html+='<p class="tracking-caption">Some notifications could not be delivered or confirmed. They are not counted as unanswered practice.</p>';
 /* UNE rangée d'actions : la revue avec Higher GPT (le produit), puis le bot ; l'état du bot en une ligne dessous. */
 html+='<div class="db tracking-act"><div class="tracking-review"><a class="vs-act" href="/chatgpt">Review with '+higher+' ChatGPT</a><button type="button" class="vs-act" data-track-manage>TotehmBot</button></div>'
  +'<p class="tracking-caption tracking-state">'+esc(settings.paused?'Notifications paused':settings.linked?'Telegram connected':'Telegram not connected')+' · '+(settings.share_chatgpt?'practice summaries shared with ChatGPT':'practice sharing with ChatGPT off')
  +' · <button class="tracking-copy" type="button" data-track-copy>copy the review prompt</button></p><p class="tracking-caption" data-track-copy-status role="status"></p></div>';
 return html;
}
export function createTrackingControls({sb,host,button,getUserId,onChange}){
 let seq=0,loadedUser=null,current=null,busy=false;
 const message=(text)=>{let p=host.querySelector('[data-track-notice]');if(!p){p=document.createElement('p');p.dataset.trackNotice='';p.className='tracking-caption';p.role='status';host.append(p);}p.textContent=text;};
 const reset=()=>{seq++;loadedUser=null;current=null;busy=false;host.replaceChildren();host.parentElement.classList.remove('is-open');host.inert=true;button.setAttribute('aria-expanded','false');};
 const draw=s=>{
  const hr=(name,label,value)=>'<label>'+label+'<input name="'+name+'" type="number" min="0" max="23" value="'+number(value)+'" required></label>';
  host.innerHTML='<form class="tracking-form"><p class="db-t">Notifications</p><label>Timezone<input name="timezone" value="'+esc(s.timezone)+'" maxlength="80" required></label>'
   +'<div class="tracking-hours">'+hr('quiet_from','Quiet from',s.quiet_from)+hr('quiet_to','Quiet until',s.quiet_to)+'</div>'
   +'<label>Daily limit · 0 stops notifications, maximum 6<input name="max_daily" type="number" min="0" max="6" value="'+number(s.max_daily)+'" required></label>'
   +'<label class="tracking-check"><input name="paused" type="checkbox"'+(s.paused?' checked':'')+'>Pause notifications</label>'
   +'<label class="tracking-check"><input name="share_chatgpt" type="checkbox"'+(s.share_chatgpt?' checked':'')+'> <span>Use my practice in <svg class="vs-hi" viewBox="0 0 600 200" aria-label="Higher"><use href="#higher-badge"/></svg> ChatGPT</span></label>'
   +'<p class="tracking-caption">Shares practice summaries, including any earlier optional reports. Private notes stay private. Turning this off stops future reads.</p>'
   +'<button class="vs-act" type="submit">Save</button><p data-track-notice class="tracking-caption" role="status"></p></form>';
  host.querySelector('form').addEventListener('submit',async e=>{
   e.preventDefault();if(busy||getUserId()!==loadedUser){if(getUserId()!==loadedUser)reset();return;}
   const form=e.currentTarget,fields=new FormData(form),changes={timezone:String(fields.get('timezone')).trim(),quiet_from:Number(fields.get('quiet_from')),quiet_to:Number(fields.get('quiet_to')),max_daily:Number(fields.get('max_daily')),paused:fields.has('paused'),share_chatgpt:fields.has('share_chatgpt')};
   busy=true;form.querySelector('button').disabled=true;const ticket=++seq,uid=loadedUser;
   try{const r=await sb.rpc('tracking_settings_set',{p_changes:changes});if(ticket!==seq||getUserId()!==uid)return;
    if(r.error||!r.data?.ok){if(r.error)console.error('[tracking_settings_set]',r.error.message);message('Not saved. Check the timezone, hours and limit.');return;}
    current=r.data.settings;draw(current);message('Saved.');await onChange?.();
   }catch{if(ticket===seq)message('Not saved. Try again.');}
   finally{if(ticket===seq){busy=false;const b=host.querySelector('button');if(b)b.disabled=false;}}
  });
 };
 const open=async()=>{
  const uid=getUserId();if(!uid)return;const ticket=++seq;loadedUser=uid;
  host.parentElement.classList.add('is-open');host.inert=false;button.setAttribute('aria-expanded','true');message('Opening settings…');
  const r=await sb.rpc('tracking_settings_get');if(ticket!==seq||getUserId()!==uid)return;
  if(r.error||!r.data?.ok){if(r.error)console.error('[tracking_settings_get]',r.error.message);message('Tracking settings are unavailable. Try again.');return;}
  current=r.data.settings;draw(current);host.scrollIntoView({block:'nearest',behavior:'smooth'});
 };
 host.inert=true;button.setAttribute('aria-expanded','false');button.addEventListener('click',()=>host.parentElement.classList.contains('is-open')?reset():open());
 return {open,reset};
}
