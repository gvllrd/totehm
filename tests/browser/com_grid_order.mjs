// Le classement reste distinct pour chaque grille et survit au rechargement.
import {launch,page,ok,USER} from './harness.mjs';
const browser=await launch();
const origin='https://www.totehm.com';
const now=Date.now();
const instant=i=>new Date(now+i*60000).toISOString();
const habit=t=>({t,t0:t,is:['focus']});
const media=(id,t,mime,name)=>({id,kind:'h',ref:t,path:USER.id+'/'+name,mime,name,created_at:instant(0)});
const spot=(id,habit,state)=>({id,habit,state,creator:'studio',mine:true,audience:'private',location:'on',
  exact:{lat:38.723,lng:-9.14,place:'The hill'},city:'Lisbon',starts_at:instant(state==='will'?15:-15),
  ends_at:instant(state==='was'?-5:30),comment:'first line\nsecond line',mode:'silent',
  duration_min:30,habit_box:{name:habit,ints:['focus']}});
try{
 for(const [nom,viewport,hasTouch] of [['mobile',{width:390,height:844},true],['ordinateur',{width:1280,height:800},false]]){
  const persisted={};
  let restituerOrdre;
  const attenteOrdre=new Promise(resolve=>{ restituerOrdre=resolve; });
  const {pg,ctx,log}=await page(browser,{dir:'com',origin,viewport,hasTouch,
    tables:{profiles:[{pseudo:'studio'}],totehms:[{user_id:USER.id,habits:[habit('Read'),habit('Walk')],vis:'private'}]},
    rpc:{
      my_landing:{signed_in:true,pseudo:'studio'},
      my_totehm:{signed_in:true,objectives:[],repulsions:[],stories:[],visions:[]},
      element_media_list:{ok:true,items:[media('1','Read','image/jpeg','photo.jpg'),media('2','Walk','application/pdf','route.pdf'),media('3','Read','audio/mpeg','audio.mp3')]},
      my_grid_orders:async()=>{
        await attenteOrdre;
        return {ok:true,orders:persisted};
      },
      element_media_remove:{ok:false,why:'retry'},
      grid_order_set:b=>{
        const revision=(persisted[b.p_kind]?.revision||0)+1;
        persisted[b.p_kind]={refs:b.p_refs,revision};
        return {ok:true,revision};
      },
      club_spots_of:b=>{
        const z={now:spot('1','Walk','am'),past:spot('2','Read','was'),future:spot('3','Walk','will')}[b.p_period];
        return {ok:true,items:[z],total:1,has_more:false,next_offset:1};
      }
    }});
  const visibleOrders=id=>pg.locator(id+' [data-order-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.orderId));
  const waitForVue=vue=>pg.waitForFunction(v=>{const d=window.__totehm_lv();return d.vue===v&&!d.bouge;},vue,{timeout:12000});
  const ouverture=async()=>{ await pg.goto(origin+'/totehm'); await pg.waitForSelector('body.member'); };
  await ouverture();
  await pg.click('#lvn-lf'); await waitForVue('g');
  await pg.locator('#lv-sh-f [data-order-id="em:3"]').waitFor();
  const cols=await pg.locator('#lv-sh-f .tlg').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
  ok(cols===(hasTouch?2:5)&&await pg.locator('#lv-sh-f .tlg > :first-child').getAttribute('aria-label')==='Add a media',
    nom+' · grille de médias redimensionnée avec le plus en tête');
  const loupeGrille=pg.locator('#lv-sh-f [data-order-id="em:1"] .loupe');
  if(hasTouch) await loupeGrille.tap(); else await loupeGrille.click();
  ok(await loupeGrille.getAttribute('aria-pressed')==='true'&&await pg.locator('#tlv').isHidden(),
    nom+' · la loupe de la grille agrandit la box sur place');
  await loupeGrille.press('Space');
  ok(await loupeGrille.getAttribute('aria-pressed')==='false',nom+' · la loupe rend la box au clavier');
  await pg.locator('#lv-sh-f [data-order-id="em:2"]').click();
  const lien=pg.getByRole('link',{name:'Open file',exact:true});
  await lien.waitFor();
  ok(!!await lien.getAttribute('href'),nom+' · un PDF s’ouvre depuis sa tuile');
  persisted.media={refs:['em:1','em:3','em:2'],revision:1};
  restituerOrdre();
  await pg.waitForFunction(()=>document.querySelectorAll('#lv-sh-f [data-order-id]')[1]?.dataset.orderId==='em:3');
  const fiche=pg.locator('#tlv .tlv-s:not([inert])');
  await fiche.getByText('Manage media',{exact:true}).click();
  await fiche.getByRole('button',{name:'delete',exact:true}).click();
  await fiche.getByRole('button',{name:'delete?',exact:true}).click();
  await fiche.getByText('Couldn’t remove this media. Try again.',{exact:true}).waitFor();
  ok(await lien.isVisible()&&(await visibleOrders('#lv-sh-f')).includes('em:2')
    &&log.rpc.filter(r=>r.name==='element_media_remove').map(r=>r.body.p_id).join()==='2'
    &&!log.upload.some(r=>r.method==='DELETE'),
    nom+' · le classement peut se charger dans le fond. Le retrait vise le PDF ouvert et un refus le laisse visible');
  await pg.locator('#tlv [data-tlv="x"]').click();
  ok(await pg.evaluate(()=>document.activeElement.dataset.orderId==='em:2'),
    nom+' · fermer rend le focus à la même tuile après réorganisation');

  await pg.click('#lv-sh-sort');
  await pg.locator('#lv-sh-f [data-order-id="em:3"]').click();
  await pg.locator('#lv-sh-order [data-rank=first]').click();
  await pg.waitForFunction(()=>document.querySelector('#lv-sh-order [data-rank-status]').textContent==='');
  ok((await visibleOrders('#lv-sh-f')).join() === 'em:3,em:1,em:2',nom+' · First remonte le média choisi');
  const from=await pg.locator('#lv-sh-f [data-order-id="em:2"] .rank-grip').boundingBox();
  const to=await pg.locator('#lv-sh-f [data-order-id="em:1"]').boundingBox();
  const a={x:Math.round(from.x+from.width/2),y:Math.round(from.y+from.height/2)};
  const b={x:Math.round(to.x+to.width/2),y:Math.round(to.y+to.height/2)};
  if(hasTouch){
    const cdp=await ctx.newCDPSession(pg);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
    for(let i=1;i<=8;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[
      {x:a.x+Math.round((b.x-a.x)*i/8),y:a.y+Math.round((b.y-a.y)*i/8)}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{
    await pg.mouse.move(a.x,a.y); await pg.mouse.down(); await pg.mouse.move(b.x,b.y,{steps:8}); await pg.mouse.up();
  }
  await pg.waitForFunction(()=>[...document.querySelectorAll('#lv-sh-f [data-order-id]')].map(n=>n.dataset.orderId).join()==='em:3,em:2,em:1');
  await pg.locator('#lv-sh-order [data-rank=done]').click();
  ok(persisted.media.refs.join()==='em:3,em:2,em:1'&&!persisted.spot,nom+' · le glissé n’écrit que l’ordre des médias');

  await pg.click('#lvn-rt'); await waitForVue('c');
  await pg.click('#lvn-rt'); await waitForVue('d');
  const locate=await pg.locator('#rdr-locate').boundingBox();
  ok(locate&&locate.x<viewport.width-20&&locate.y<viewport.height*.78,nom+' · la touche de position se cale près de la carte');
  await pg.click('#rdr-m-sel');
  await pg.locator('#rdr-g-f [data-order-id="sp:3"]').waitFor();
  ok((await visibleOrders('#rdr-g-f')).length===3
    &&await pg.locator('#rdr-g-f .tlg > :first-child').getAttribute('aria-label')==='Add a spot',
    nom+' · les trois temps figurent dans la grille, avec le plus en tête');
  const first=pg.locator('#rdr-g-f [data-order-id="sp:1"]');
  await first.click();
  const details=pg.locator('#rdr-sh [data-lsh-k="sp:1"] .spot-data');
  await details.waitFor();
  ok(await details.locator('.sd-say').textContent()==='first line\nsecond line',nom+' · le commentaire multiligne apparaît directement dans la box');
  await details.locator('[data-spot-zoom]').click();
  ok(await details.evaluate(e=>e.classList.contains('is-zoom')),nom+' · la loupe agrandit cette box sur place');
  await pg.locator('#rdr-x').click();
  await pg.click('#rdr-g-sort');
  await pg.locator('#rdr-g-f [data-order-id="sp:3"]').click();
  await pg.locator('#rdr-g-order [data-rank=first]').click();
  await pg.waitForFunction(()=>document.querySelector('#rdr-g-f [data-order-id]').dataset.orderId==='sp:3');
  await pg.locator('#rdr-g-order [data-rank=done]').click();
  ok(persisted.spot.refs[0]==='sp:3'&&persisted.media.refs[0]==='em:3',nom+' · première place enregistrée indépendamment pour les spots');

  await ouverture();
  await pg.click('#lvn-lf'); await waitForVue('g');
  await pg.waitForFunction(()=>document.querySelector('#lv-sh-f [data-order-id]')?.dataset.orderId==='em:3');
  ok((await visibleOrders('#lv-sh-f')).join()==='em:3,em:2,em:1'
    &&!log.errors.some(e=>e.startsWith('pageerror')),nom+' · l’ordre revient après rechargement');
  await ctx.close();
 }
}finally{await browser.close();}
