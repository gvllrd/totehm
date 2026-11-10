// Private self-report views; the SQL reader owns all counts and permissions.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number.isFinite(Number(v))?Number(v):0;
const source=ref=>'https://www.totehm.com/totehm#'+new URLSearchParams({element:'habit',ref});
const barrierNames={time:'time',energy:'energy',place:'place',overload:'overload',other:'another obstacle'};
export function renderPractice(s){
 const c=s.counts??{},habits=s.habits??[],days=s.days??[],settings=s.settings??{};
 let html=(s.stale?'<p class="tracking-caption">Showing the last available reports. Refresh is temporarily unavailable.</p>':'')+'<div class="db"><p class="db-t">My practice<i>'+number(s.days_count)+' days · self-reported</i></p>';
 html+='<div class="db-k"><div><i>done</i><b>'+number(c.done)+'</b><i>'+number(c.attempts)+' reported attempts</i></div>'
  +'<div><i>in part</i><b>'+number(c.partial)+'</b><i>'+number(c.skipped)+' set aside</i></div>'
  +'<div><i>no answer</i><b>'+number(c.unanswered)+'</b><i>unknown</i></div></div>';
 if(s.source_complete===false)html+='<p class="tracking-caption">This is part of the recorded practice.</p>';
 html+='<p class="tracking-caption">No answer stays unknown. Setting a Habit aside is a choice.</p></div>';
 let matrix='<div class="db-m"><span></span>'+days.map(d=>'<span class="h">'+esc(new Date(d.day+'T12:00:00').toLocaleDateString('en-GB',{weekday:'narrow'}))+'</span>').join('')+'<span class="h">done</span>';
 for(const h of habits){const color=({fight:'#E24B4A',flow:'#e48b31',enrich:'#fcbe21',focus:'#378ADD',express:'#1D9E75',celebrate:'#7F77DD',love:'#639922'})[(h.intentions??[])[0]]??'#b8b8c2';
  matrix+='<div class="db-n" style="--c:'+color+'"><a href="'+esc(source(h.ref))+'">'+esc(h.habit)+'</a><small>'+number(h.done)+' done · '+number(h.partial)+' in part · '+number(h.unanswered)+' unknown</small></div>'
   +(h.days??[]).map(v=>'<span class="db-c'+(['d','p','m','s','a'].includes(v)?' is-'+v:'')+'" style="--c:'+color+'"></span>').join('')
   +'<span class="db-s">'+number(h.done)+'/'+number(h.attempts)+'</span>';
 }
 matrix+='</div>';
 html+='<div class="db"><p class="db-t">My Habits<i>last seven days · open an original</i></p>'+(habits.length?matrix:'<p class="db-vide">Your first Habit starts the system.</p>')
  +'<div class="db-leg"><span>● done</span><span>◐ in part</span><span>— not done</span><span>· set aside</span><span>○ unknown</span></div></div>';
 const barrier=(s.barriers??[]).find(x=>number(x.count)>=2);
 if(barrier)html+='<div class="db"><p class="db-t">What gets in the way<i>reported by you</i></p><p class="tracking-caption">You mentioned '+esc(barrierNames[barrier.kind]??'an obstacle')+' '+number(barrier.count)+' times. Consider a smaller version or a different setting. Your Habit stays yours to change.</p></div>';
 const t=s.trend??{};
 if(t.state==='more_done'||t.state==='fewer_done')html+='<div class="db"><p class="db-t">Two weeks compared<i>reported attempts</i></p><p class="tracking-caption">'+number(t.recent_done)+' / '+number(t.recent_attempts)+' done, compared with '+number(t.previous_done)+' / '+number(t.previous_attempts)+' previously. This describes your reports.</p></div>';
 else if(number(c.answered)<6)html+='<p class="tracking-caption">More reports are needed before comparing periods.</p>';
 if(number(c.energy_reports)>=3)html+='<p class="tracking-caption">Reported energy: '+esc(c.energy_mean)+' / 5 · '+number(c.energy_reports)+' observations.</p>';
 if(number(c.duration_reports)>0)html+='<p class="tracking-caption">'+number(c.reported_minutes)+' minutes explicitly reported. Rhythm is not duration.</p>';
 if(number(s.delivery?.failed)||number(s.delivery?.unconfirmed))html+='<p class="tracking-caption">Some questions could not be delivered or confirmed. They are not counted as unanswered practice.</p>';
 html+='<div class="db-tg"><span>'+esc(settings.paused?'Questions paused':settings.linked?'Telegram connected':'Connect Telegram to report')+' · '+(settings.share_chatgpt?'practice summaries shared with ChatGPT':'practice sharing with ChatGPT off')+'</span><button type="button" class="vs-act" data-track-manage>Manage</button></div>';
 html+='<div class="db"><p class="db-t">My intentions<i>one report can carry several intentions</i></p><div class="db-i">';
 const ints=['fight','flow','enrich','focus','express','celebrate','love'],max=Math.max(1,...ints.map(i=>number(s.intentions?.[i]?.done)));
 for(const i of ints){const n=number(s.intentions?.[i]?.done);html+='<i>'+esc(i)+'</i><div class="tr"><span style="width:'+100*n/max+'%"></span></div><b>'+n+'</b>';}
 return html+'</div></div>';
}
export function createTrackingControls({sb,host,button,getUserId,onChange}){
 let seq=0,loadedUser=null,current=null,busy=false;
 const message=(text)=>{let p=host.querySelector('[data-track-notice]');if(!p){p=document.createElement('p');p.dataset.trackNotice='';p.className='tracking-caption';p.role='status';host.append(p);}p.textContent=text;};
 const reset=()=>{seq++;loadedUser=null;current=null;busy=false;host.replaceChildren();host.parentElement.classList.remove('is-open');host.inert=true;button.setAttribute('aria-expanded','false');};
 const draw=s=>{
  const hr=(name,label,value)=>'<label>'+label+'<input name="'+name+'" type="number" min="0" max="23" value="'+number(value)+'" required></label>';
  host.innerHTML='<form class="tracking-form"><p class="db-t">Tracking settings</p><label>Timezone<input name="timezone" value="'+esc(s.timezone)+'" maxlength="80" required></label>'
   +'<div class="tracking-hours">'+hr('quiet_from','Quiet from',s.quiet_from)+hr('quiet_to','Quiet until',s.quiet_to)+'</div>'
   +'<label>Questions per day · 0 stops questions, maximum 6<input name="max_daily" type="number" min="0" max="6" value="'+number(s.max_daily)+'" required></label>'
   +'<label class="tracking-check"><input name="paused" type="checkbox"'+(s.paused?' checked':'')+'>Pause questions</label>'
   +'<label class="tracking-check"><input name="share_chatgpt" type="checkbox"'+(s.share_chatgpt?' checked':'')+'> <span>Use my practice in <svg class="vs-hi" viewBox="0 0 600 200" aria-label="Higher"><use href="#higher-badge"/></svg> ChatGPT</span></label>'
   +'<p class="tracking-caption">Includes reported outcomes, obstacle categories and energy. Private notes stay private. Turning this off stops future reads.</p>'
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
