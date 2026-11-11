// Private self-report views; the SQL reader owns all counts and permissions.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number.isFinite(Number(v))?Number(v):0;
const source=ref=>typeof ref==='string'&&ref.length>0&&ref.length<=16000&&ref===ref.trim()&&!/[\u0000-\u001f\u007f]/.test(ref)?'https://www.totehm.com/totehm#'+new URLSearchParams({element:'habit',ref}):null;
const habitLink=(ref,label,content=esc(label))=>source(ref)?'<a class="tracking-source" href="'+esc(source(ref))+'" title="Open original">'+content+'</a>':'<div>'+content+'</div><small>Source link unavailable. Open this Habit directly in your TOTEHM.</small>';
const higher='<svg class="vs-hi" viewBox="0 0 600 200" aria-label="Higher"><use href="#higher-badge"/></svg>';
export const PRACTICE_REVIEW_PROMPT='Review my reported practice alongside my TOTEHM. Separate Done, Missed and missing reports. Explain what the evidence supports and suggest one small adjustment, without changing my TOTEHM.';
export function renderPractice(s,{requestedDays=s.days_count,renderHabit}={}){
 const habitPreview=h=>habitLink(h.ref,h.habit,renderHabit?renderHabit(h):esc(h.habit));
 const c=s.counts??{},habits=s.habits??[],days=s.days??[],settings=s.settings??{},span=number(s.days_count)||7,coverage=s.coverage??{};
 const answered=number(c.answered),pending=number(c.pending),unanswered=number(c.unanswered);
 const observed=coverage.observed_habits??habits.filter(h=>number(h.reports)>0||number(h.attempts)+number(h.unanswered)>0).length;
 let html='<div class="db"><p class="db-t">My practice<i>'+span+' days · self-reported</i></p>'
  +'<div class="tracking-period" role="group" aria-label="Practice period">'+[7,28].map(n=>'<button class="vs-act'+(Number(requestedDays)===n?' is-on':'')+'" type="button" data-track-period="'+n+'" aria-pressed="'+(Number(requestedDays)===n)+'">'+n+' days</button>').join('')+'</div>';
 if(s.stale)html+='<p class="tracking-caption" role="status">Showing the last available '+span+' days. Refresh is temporarily unavailable.</p>';
 html+='<div class="db-k"><div><i>Done</i><b>'+number(c.done)+'</b></div><div><i>Missed</i><b>'+number(c.missed)+'</b></div><div><i>No response</i><b>'+unanswered+'</b></div></div>'
  +'<p class="tracking-caption">'+answered+' responses · '+unanswered+' unknown'+(pending?' · '+pending+' pending':'')+'. No response is never a Missed.</p>'
  +'<p class="tracking-caption">'+number(observed)+' / '+number(coverage.total_habits??habits.length)+' Habits with observations. Notification limits can leave other Habits unobserved.</p>';
 if(number(c.partial)||number(c.skipped))html+='<p class="tracking-caption">Earlier reports: '+number(c.partial)+' in part · '+number(c.skipped)+' set aside. Kept as reported.</p>';
 if(s.source_complete===false)html+='<p class="tracking-caption">This is part of the recorded practice.</p>';
 html+='</div>';
 const legacy={d:'done',m:'missed',p:'partial',s:'skipped',a:'unanswered'};
 let matrix='<div class="tracking-scroll" tabindex="0" role="region" aria-label="Habit reports by day"><div class="tracking-matrix'+(days.length<=7?' is-week':'')+'" style="--tracking-days:'+days.length+'"><span class="tracking-name"></span>'+days.map(d=>'<span class="h" title="'+esc(d.day)+'">'+esc(new Date(d.day+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric'}))+'</span>').join('');
 for(const h of habits){
  const cells=h.day_counts??(h.days??[]).map((v,i)=>({day:days[i]?.day,...(legacy[v]?{[legacy[v]]:1}:{})}));
  matrix+='<div class="db-n tracking-name">'+habitPreview(h)+'<small>'+number(h.done)+' done · '+number(h.missed)+' missed · '+number(h.unanswered)+' unknown'+(number(h.partial)?' · '+number(h.partial)+' in part':'')+(number(h.skipped)?' · '+number(h.skipped)+' set aside':'')+'</small></div>';
  for(let i=0;i<days.length;i++){
   const v=cells[i]??{},done=number(v.done),missed=number(v.missed),partial=number(v.partial),skipped=number(v.skipped),unknown=number(v.unanswered),waiting=number(v.pending);
   const values=[done,missed,partial,skipped,unknown,waiting],labels=['done','missed','in part','set aside','unknown','pending'];
   const title=values.map((n,k)=>n?n+' '+labels[k]:'').filter(Boolean).join(' · ')||'No observation';
   const text=values.map((n,k)=>n?['✓','×','◐','·','?','…'][k]+(n>1?n:''):'').filter(Boolean).join(' ');
   matrix+='<span class="tracking-cell'+(done?' has-done':'')+(missed?' has-missed':'')+'" title="'+esc(days[i].day+': '+title)+'" aria-label="'+esc(days[i].day+': '+title)+'">'+esc(text||'—')+'</span>';
  }
 }
 matrix+='</div></div>';
 html+='<div class="db"><p class="db-t">My Habits<i>'+span+' days · open an original</i></p>'+(habits.length?matrix:'<p class="db-vide">Your first Habit starts the system.</p>')
  +'<p class="tracking-caption">✓ Done · × Missed · ? no response · … pending'+(number(c.partial)||number(c.skipped)?' · ◐ in part · · set aside':'')+'</p></div>';
 const missed=habits.filter(h=>number(h.missed)>=2).sort((a,b)=>number(b.missed)-number(a.missed))[0];
 if(missed)html+='<div class="db"><p class="db-t">Worth a look<i>'+span+' days</i></p><p class="tracking-caption">'+number(missed.missed)+' Missed reports for this Habit. The reports do not explain why.</p><div class="tracking-focus">'+habitPreview(missed)+'</div></div>';
 const t=s.trend??{};
 if(t.state==='more_done'||t.state==='fewer_done')html+='<div class="db"><p class="db-t">Two weeks compared<i>reported attempts</i></p><p class="tracking-caption">'+number(t.recent_done)+' / '+number(t.recent_attempts)+' Done, compared with '+number(t.previous_done)+' / '+number(t.previous_attempts)+' previously. This describes your reports.</p></div>';
 else if(t.state==='insufficient')html+='<p class="tracking-caption">More comparable reports are needed before describing a trend.</p>';
 if(number(s.delivery?.failed)||number(s.delivery?.unconfirmed))html+='<p class="tracking-caption">Some notifications could not be delivered or confirmed. They are not counted as unanswered practice.</p>';
 html+='<div class="db-tg"><span>'+esc(settings.paused?'Notifications paused':settings.linked?'Telegram connected':'Telegram not connected')+' · '+(settings.share_chatgpt?'practice summaries shared with ChatGPT':'practice sharing with ChatGPT off')+'</span><button type="button" class="vs-act" data-track-manage>Configure</button></div>';
 html+='<div class="db-tg tracking-review"><a class="vs-act" href="/chatgpt">Review with '+higher+' ChatGPT</a><button class="vs-act" type="button" data-track-copy>Copy prompt</button></div><p class="tracking-caption" data-track-copy-status role="status"></p>';
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
