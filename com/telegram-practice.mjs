// A report locator conveys no permission. The native, authenticated site resolves it.
export function parsePracticeLink(hash){
 const m=typeof hash==='string'&&/^#practice=([1-9][0-9]{0,18})$/.exec(hash);
 return m&&(m[1].length<19||m[1]<='9223372036854775807')?m[1]:null;
}
// The Telegram SDK only adapts the window. It never supplies the site identity.
export function installTelegramShell(win=window,doc=document){
 if(new URLSearchParams(win.location.search).get('telegram')!=='1')return;
 const diag={sdk:false,back:false};win.__totehm_telegram=()=>({...diag});
 const attach=()=>{
  const app=win.Telegram?.WebApp;if(!app)return;
  diag.sdk=true;
  try{app.ready();app.expand();app.setHeaderColor?.('#000000');app.setBackgroundColor?.('#000000');}catch{}
  const sync=()=>{
   const back=win.__totehm_retour?.().ailleurs;
   diag.back=!!back||doc.body.classList.contains('is-xo')||doc.body.classList.contains('is-vx');
   try{if(diag.back)app.BackButton?.show();else app.BackButton?.hide();}catch{}
  };
  app.BackButton?.onClick(()=>{
   doc.activeElement?.blur?.();
   doc.body.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));
   win.setTimeout(sync,160);
  });
  new win.MutationObserver(sync).observe(doc.body,{attributes:true,attributeFilter:['class']});
  const member=doc.getElementById('member-window');if(member)new win.MutationObserver(sync).observe(member,{attributes:true,attributeFilter:['class']});
  sync();win.setTimeout(sync,200);
 };
 if(win.Telegram?.WebApp){attach();return;}
 const script=doc.createElement('script');script.src='https://telegram.org/js/telegram-web-app.js';script.async=true;
 script.onload=attach;doc.head.append(script); // SDK unavailable = the same native site, still usable.
}
