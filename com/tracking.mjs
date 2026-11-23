// Private self-report views; the SQL reader owns all counts and permissions.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number.isFinite(Number(v))?Number(v):0;
/* 23/11 : la grille de pratique du verso est retirée (Wah : « juste ChatGPT et Telegram ») ; reste la configuration du bot. */
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
