// 06/10/2026 — la loupe EN PLACE (COM, SPACE), My spaces sur SPACE, supprimer un space
// (COM et SPACE), le papier SPACE qui grandit/rapetisse entre les vues, l'invitation lisible.
// Tout est simulé (comptes, RPC, fonctions) : aucune écriture en production.
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';const browser=await launch();
const now=Date.now(),iso=m=>new Date(now+m*60000).toISOString();
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
try{
 /* ── 1 · COM : une loupe sur chaque Box des cinq vues ; elle agrandit EN PLACE ── */
 {const source={ok:true,pseudo:'studio',steps:[{t:'Deep practice',is:['focus']}],objs:{'Deep practice':['o1']},trips:[{id:'o1',text:'Build a practice',is:['focus']}],reps:[{id:71,text:'Put the phone away',is:['focus'],hs:['Deep practice']}],wisdom:[{id:'w1',text:'Attention is a choice',is:['focus']}],visions:[{id:'v1',text:'A focused life',is:['focus']}]};
  const {pg,log}=await page(browser,{dir:'com',origin:'https://www.totehm.com',tables:{profiles:[{pseudo:'wah'}]},rpc:{totehm_of:source,habit_spaces:{ok:true,mine:false,habits:[]}}});
  await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto('https://www.totehm.com/totehm?ro=studio');await pg.waitForSelector('body.ro:not(.gate)');await pg.waitForTimeout(400);
  for(const [key,label] of [[null,'Habit'],['ArrowUp','Objective'],['ArrowLeft','Repulsion'],['ArrowRight','Wisdom'],['ArrowDown','Vision']]){
   if(key)await pg.keyboard.press(key);await pg.waitForTimeout(350);
   const boxes=await pg.locator('#habits .habit:not(.add):not(.filtre) .v-col:visible').count(),loupes=await pg.locator('#habits .loupe:visible').count();
   const col=pg.locator('#habits .v-col:visible').first(),h0=await col.evaluate(e=>e.getBoundingClientRect().height);
   await pg.locator('#habits .loupe:visible').first().evaluate(e=>e.click());await pg.waitForTimeout(120);
   const z=await col.evaluate(e=>({on:e.classList.contains('is-zoom'),h:e.getBoundingClientRect().height,zoom:getComputedStyle(e).zoom}));
   ok(boxes>0&&loupes===boxes&&z.on&&z.h>h0*1.1&&await pg.locator('.eco-sheet,[role=dialog]:visible').count()===0&&!(await pg.evaluate(()=>window.__totehm_zone?.boite_ouverte)),label+' : une loupe par Box, elle agrandit en place ('+Math.round(h0)+' → '+Math.round(z.h)+' px), sans ouvrir ni fenêtre');
   await pg.locator('#habits .loupe:visible').first().evaluate(e=>e.click());await pg.waitForTimeout(80);
   ok(!(await col.evaluate(e=>e.classList.contains('is-zoom'))),label+' : un deuxième tap la rend à sa taille');
  }
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(300);
  await pg.locator('#habits [data-open]').first().evaluate(e=>e.click());await pg.waitForTimeout(300);
  const mini=await pg.$eval('#habits .mini',e=>getComputedStyle(e).padding).catch(()=>null);
  ok(mini===null||['3px 7px','4px 8px'].includes(mini),'les mini-boxes gardent leur format d\'origine (padding '+mini+' : 3px 7px, 4px 8px au téléphone)');
  await pg.screenshot({path:OUT+'/loupe_com.png'});
  ok(!erreurs(log).length&&!log.rpc.some(x=>/rename|_create|_set|_delete|totehm_save/.test(x.name)),'COM : la loupe ne lit ni n\'écrit rien');await pg.context().close();
 }
 /* ── 2 · COM My spaces : supprimer (deux taps), le space disparaît, les habits se relisent ── */
 {const rows=[{id:'11111111-2222-4333-8444-555555555555',habit:'Run',visibility:'shared',starts_at:iso(-1),ends_at:iso(60),city:'Lisbon'},{id:'planned',habit:'Walk',visibility:'shared',starts_at:iso(1440),ends_at:iso(1500),city:'Lisbon'}];
  const {pg,log}=await page(browser,{dir:'com',origin:'https://www.totehm.com',tables:{profiles:[{pseudo:'wah'}]},rpc:{my_spaces:{ok:true,spaces:rows,more:false},habit_spaces:{ok:true,mine:true,habits:[]}},functions:{'space-delete':{ok:true,removed:{clip:true,files:0}}}});
  await pg.goto('https://www.totehm.com/totehm');await pg.waitForSelector('body.member');await pg.click('#conn-bar');await pg.click('#myspaces-open');await pg.waitForSelector('[data-del]');
  const del=pg.locator('[data-del="'+rows[0].id+'"]');await del.click();
  ok(/Delete for good/.test(await del.textContent())&&!log.functions.some(f=>f.name==='space-delete'),'COM : un premier tap arme seulement (« Delete for good »)');
  const hs=log.rpc.filter(x=>x.name==='habit_spaces').length;
  await del.click();await pg.waitForFunction(id=>!document.querySelector('[data-row="'+id+'"]'),rows[0].id);
  ok(log.functions.some(f=>f.name==='space-delete'&&f.body.spot===rows[0].id)&&/Space deleted/.test(await pg.textContent('#myspaces-note'))&&log.rpc.filter(x=>x.name==='habit_spaces').length>hs,'COM : supprimé par space-delete, retiré de la liste, les habits se relisent');
  ok(!erreurs(log).length,'COM My spaces : aucune erreur');await pg.context().close();
 }
 /* ── 3 · SPACE : la loupe, My spaces, DELETE, le papier qui respire, l'invitation ── */
 {const habits=[{name:'Deep practice',freq:null,ints:['focus'],step:{id:'h1',t:'Deep practice',is:['focus']},objectives:[{text:'Build a practice'}],repulsions:[]}];
  const mine=(id,extra={})=>({id,habit:'Deep practice',intentions:['focus'],visibility:'shared',location:'on',mode:'silent',city:'Lisbon',starts_at:iso(60),ends_at:iso(120),duration_min:60,creator:'wah',mine:true,exact:null,...extra});
  const ids=['aaaaaaaa-1111-4111-8111-111111111111','bbbbbbbb-2222-4222-8222-222222222222'];
  let gone=new Set();
  const rpc={space_habits:{ok:true,habits},spot_rules:{clip_seconds:33,duration_min:5,duration_max:720,horizon_days:90},
   space_discover:b=>({spots:b.p_view==='list'?ids.filter(i=>!gone.has(i)).map(i=>mine(i)):[],more:false,match:'habit'}),
   my_spaces:()=>({ok:true,spaces:ids.filter(i=>!gone.has(i)).map(i=>({id:i,habit:'Deep practice',visibility:'shared',starts_at:iso(60),ends_at:iso(120),city:'Lisbon'})),more:false}),
   spot_get:b=>gone.has(b.p_id)?{ok:false}:{ok:true,spot:mine(b.p_id)}};
  const {pg,log}=await page(browser,{dir:'space',origin:'https://www.totehm.space',rpc,tables:{profiles:[{pseudo:'wah'}]},hasTouch:true,
   functions:{'space-delete':b=>{gone.add(b.spot);return {ok:true,removed:{clip:true,files:1}};},'create-bunny-upload':{available:false}}});
  await pg.goto('https://www.totehm.space/');await pg.waitForFunction(()=>window.__totehm_space?.().view==='radar');await pg.waitForTimeout(700);
  const hint=await pg.$eval('#tp-hint',e=>{const s=getComputedStyle(e);return {txt:e.textContent,color:s.color,size:parseFloat(s.fontSize),weight:s.fontWeight,bg:s.backgroundColor};});
  ok(/turn a habit into a space/i.test(hint.txt)&&hint.color==='rgb(255, 255, 255)'&&hint.size>=11&&Number(hint.weight)>=700&&hint.bg!=='rgba(0, 0, 0, 0)','l\'invitation se lit : blanche, grasse, '+hint.size+' px, sur sa boîte noire');
  await pg.screenshot({path:OUT+'/space_landing_hint.png'});
  const w0=(await pg.$eval('#totehm-paper',e=>e.getBoundingClientRect().width));
  await pg.click('#cur-d');await pg.waitForTimeout(160);
  const wMid=await pg.$eval('#totehm-paper',e=>e.getBoundingClientRect().width);await pg.waitForTimeout(900);
  const w1=await pg.$eval('#totehm-paper',e=>e.getBoundingClientRect().width);
  ok(w0===110&&w1===58&&wMid<w0&&wMid>w1-6&&wMid!==w1,'le papier rapetisse en glissant d\'une vue à l\'autre ('+w0+' → '+Math.round(wMid)+' → '+w1+' px)');
  await pg.click('#cur-g');await pg.waitForTimeout(900);
  ok(await pg.$eval('#totehm-paper',e=>e.getBoundingClientRect().width)===110,'et regrandit au retour sur le radar');
  // la loupe sur une Habit Box de SPACE
  await pg.click('#totehm-paper');await pg.waitForSelector('[data-filter-h] .eco-box-zoom');
  const box=pg.locator('[data-filter-h="0"]'),b0=await box.evaluate(e=>e.getBoundingClientRect().height);
  await box.locator('.eco-box-zoom').click();await pg.waitForTimeout(100);
  const b1=await box.evaluate(e=>({on:!!e.querySelector('.habit.is-zoom'),h:e.getBoundingClientRect().height}));
  ok(b1.on&&b1.h>b0*1.1&&await pg.locator('.eco-sheet').count()===0&&!(await pg.evaluate(()=>window.__totehm_space().habit_filter)),'SPACE : la loupe agrandit la Habit Box en place ('+Math.round(b0)+' → '+Math.round(b1.h)+' px), sans fenêtre ni choix');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(200);
  // My spaces
  await pg.click('#member');await pg.click('[data-myspaces]');await pg.waitForSelector('#msp-list [data-del]');
  ok(await pg.locator('#msp-list .msp-row').count()===2&&/I WILL BE HERE/.test(await pg.textContent('#msp-list'))&&log.rpc.some(x=>x.name==='my_spaces'),'SPACE : My spaces liste MES spaces publiés');
  await pg.screenshot({path:OUT+'/space_my_spaces.png'});
  const d=pg.locator('#msp-list [data-del="'+ids[0]+'"]');await d.click();ok(/DELETE FOR GOOD/.test(await d.textContent()),'SPACE : un premier tap arme seulement');
  await d.click();await pg.waitForFunction(id=>!document.querySelector('#msp-list [data-row="'+id+'"]'),ids[0]);
  ok(log.functions.some(f=>f.name==='space-delete'&&f.body.spot===ids[0])&&/deleted/i.test(await pg.textContent('#msp-note')),'SPACE : supprimé par space-delete, retiré de My spaces');
  await pg.click('#msp-list [data-open-space="'+ids[1]+'"]');await pg.waitForFunction(()=>window.__totehm_space().detail);
  ok(await pg.isHidden('#my-spaces')&&await pg.locator('#detail [data-del]').count()===1,'SPACE : ouvrir un de mes spaces → sa fiche, avec DELETE');
  await pg.click('#detail [data-del]');await pg.click('#detail [data-del]');await pg.waitForFunction(()=>!window.__totehm_space().detail);
  ok(log.functions.filter(f=>f.name==='space-delete').length===2,'SPACE : DELETE depuis la fiche, la fiche se ferme');
  await pg.click('#member');await pg.click('[data-myspaces]');await pg.waitForFunction(()=>/No space yet/.test(document.querySelector('#msp-note').textContent));
  ok(true,'SPACE : My spaces vide après les deux suppressions');await pg.keyboard.press('Escape');
  ok(await pg.isHidden('#my-spaces')&&!erreurs(log).length,'SPACE : Échap ferme, aucune erreur '+erreurs(log).join(' | '));await pg.context().close();
 }
}finally{await browser.close();}
