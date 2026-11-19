// COM · 15/11/2026 — LES VIGNETTES (Wah : « passer aux vignettes »). Une tuile de la grille de gauche lit la VIGNETTE de sa
// photo (`<chemin>.jpg`, 520 px) et non la photo entière (1600 px) : 10 à 20 fois moins d'octets. Trois cas :
//   1 · la vignette existe → la tuile la lit, la photo entière n'est JAMAIS demandée ;
//   2 · elle manque et c'est MA photo → je la fabrique, je l'écris à côté de la photo, puis la tuile la lit ;
//   3 · à l'envoi d'une photo, sa vignette part avec elle.
// Comptes, stockage et RPC sont simulés. LANCER : node com_vignettes.mjs /tmp
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const PHOTO=UID+'/m-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg', VIGN=PHOTO+'.jpg';
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight'],f:'every_morning'}];
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,habits:STEPS,vis:'private'}]};
const LAND={signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false},higher:{active:false,price_cents:700,currency:'eur'},thp:false,subscriptions:0,subscribers:0,
  sm:{ready:true,habit:true,objective:true,higher:false,free_total:7,free_left:6,left:6}};
const items=[{id:'m1',kind:'h',ref:'Run the hill',path:PHOTO,mime:'image/jpeg',bytes:1200,name:'hill.jpg',created_at:'2026-10-15T10:00:00Z'}];
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const vers=(pg,v)=>pg.waitForFunction(v=>{const d=window.__totehm_lv();return d.vue===v&&!d.bouge;},v,{timeout:8000}).catch(()=>{});
const browser=await launch();
/* le stockage simulé : `existe` dit si la vignette est déjà là ; chaque image servie est notée */
function stockage(existe){
  const vues=[], signes=[]; let la=existe;
  const network=(url,req)=>{
    if(!url.pathname.startsWith('/storage/v1/object/')) return null;
    const p=decodeURIComponent(url.pathname);
    if(req.method()==='POST'&&p.startsWith('/storage/v1/object/sign/element-media/')){
      const cle=p.slice('/storage/v1/object/sign/element-media/'.length); signes.push(cle);
      if(cle===VIGN&&!la) return {status:400,contentType:'application/json',body:JSON.stringify({statusCode:'404',error:'not_found',message:'Object not found'})};
      return {status:200,contentType:'application/json',body:JSON.stringify({signedURL:'/object/sign/element-media/'+cle+'?token=t'})};
    }
    if(req.method()==='GET'&&p.startsWith('/storage/v1/object/sign/element-media/')){ vues.push(p.slice('/storage/v1/object/sign/element-media/'.length)); return {status:200,contentType:'image/png',headers:{'access-control-allow-origin':'*'},body:PNG}; }
    if(/^\/storage\/v1\/object\/element-media\//.test(p)&&req.method()!=='GET'&&p.endsWith(VIGN)) la=true;
    return null;
  };
  return {network,vues,signes};
}
async function ouvrirGauche(st){
  const {pg,ctx,log}=await page(browser,{dir:'com',origin,viewport:{width:390,height:844},hasTouch:true,network:st.network,tables,
    rpc:{my_landing:LAND,element_media_list:()=>({ok:true,items}),habit_spaces:{ok:true,habits:[]},element_cloths:{ok:true,elements:[]}}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);
  await pg.click('#lvn-lf');await vers(pg,'g');await pg.waitForTimeout(1500);
  return {pg,ctx,log};
}

// ── 1 · la vignette existe : la photo entière n'est jamais demandée ─────────────────────────────────────────────
{const st=stockage(true); const {pg,ctx,log}=await ouvrirGauche(st);
 const tuile=await pg.evaluate(()=>({n:document.querySelectorAll('#lv-sh .tl img[data-sh-src]').length,src:(document.querySelector('#lv-sh .tl img[data-sh-src]')||{}).src||''}));
 ok(tuile.n===1&&tuile.src.includes(VIGN),'1 · la tuile lit la VIGNETTE : '+tuile.src.replace(/^.*element-media\//,''));
 ok(st.vues.includes(VIGN)&&!st.vues.includes(PHOTO),'1 · la photo entière n\'est JAMAIS demandée ('+st.vues.map(x=>x.slice(-14)).join(' · ')+')');
 const d=await pg.evaluate(()=>window.__totehm_vignette());
 ok(d.lues===1&&d.fabriquees===0&&d.pleines===0,'1 · diagnostic : des compteurs, jamais une donnée → '+JSON.stringify(d));
 ok(!erreurs(log).length,'1 · aucune erreur '+erreurs(log).join(' | '));await ctx.close();}

// ── 2 · elle manque et c'est MA photo : je la fabrique, je l'écris à côté, puis la tuile la lit ──────────────────
{const st=stockage(false); const {pg,ctx,log}=await ouvrirGauche(st);
 await pg.waitForFunction(()=>window.__totehm_vignette().fabriquees>=1,null,{timeout:8000}).catch(()=>{});
 const ecrit=log.upload.filter(u=>u.path.endsWith('element-media/'+VIGN)&&u.size>0);
 ok(ecrit.length===1,'2 · la vignette manquante est FABRIQUÉE et écrite à côté de la photo : '+JSON.stringify(ecrit.map(u=>[u.method,u.path.slice(-24),u.size])));
 const src=await pg.evaluate(()=>(document.querySelector('#lv-sh .tl img[data-sh-src]')||{}).src||'');
 ok(src.includes(VIGN),'2 · puis la tuile lit sa vignette : '+src.replace(/^.*element-media\//,''));
 ok(!ecrit.some(u=>!u.path.includes('/'+UID+'/')),'2 · jamais dans le dossier d\'un autre membre');
 ok(!erreurs(log).length,'2 · aucune erreur '+erreurs(log).join(' | '));await ctx.close();}

// ── 3 · le bloc commun : réduire, sans jamais lever ─────────────────────────────────────────────────────────────
{const {pg,ctx}=await page(browser,{dir:'com',origin,viewport:{width:390,height:844},tables,rpc:{my_landing:LAND}});
 await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');
 const r=await pg.evaluate(async()=>{ const c=document.createElement('canvas'); c.width=1600; c.height=1200; const x=c.getContext('2d'); x.fillStyle='#c33'; x.fillRect(0,0,1600,1200);
   const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.9)), t=await window.TOTEHM_VIGNETTE.reduire(b), i=await createImageBitmap(t), n=await window.TOTEHM_VIGNETTE.reduire('data:text/plain,pas-une-image');
   return {pleine:b.size,vignette:t.size,w:i.width,h:i.height,type:t.type,casse:n}; });
 ok(r.w===520&&r.h===390&&r.type==='image/jpeg'&&r.vignette<r.pleine,'3 · 1600×1200 → '+r.w+'×'+r.h+' JPEG ('+Math.round(r.pleine/1024)+' → '+Math.round(r.vignette/1024)+' Ko)');
 ok(r.casse===null,'3 · une source illisible rend null, jamais une exception');await ctx.close();}
await browser.close();
