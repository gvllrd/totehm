// Parcours de connexion de la page publique, avec Supabase Auth simulé.
import assert from 'node:assert/strict';
import {launch,page,USER} from './harness.mjs';
const origin='https://www.totehm.com',browser=await launch();
const email='account@example.test';
const session={access_token:'test-at',refresh_token:'test-rt',expires_in:3600,token_type:'bearer',user:{...USER,email}};
const res=(status,data)=>({status,contentType:'application/json',body:JSON.stringify(data)});
try{
 for(const mobile of [true,false]){
  let sends=0,verifies=0;
  const {pg,ctx,log}=await page(browser,{
   dir:'com',origin,session:false,hasTouch:mobile,viewport:mobile?{width:375,height:667}:{width:1280,height:800},
   tables:{profiles:[{pseudo:'fixture'}],totehms:[{user_id:USER.id,habits:[]}]},
   rpc:{my_landing:{signed_in:true,pseudo:'fixture'}},
   network:async(url,req)=>{
    if(url.pathname==='/auth/v1/otp'){
     assert.equal(JSON.parse(req.postData()).email,email);
     sends++;
     if(mobile&&sends===1) return res(429,{msg:'email rate limit exceeded',code:'over_email_send_rate_limit'});
     return res(200,{});
    }
    if(url.pathname==='/auth/v1/verify'){
     verifies++;
     const input=JSON.parse(req.postData());
     assert.equal(input.email,email);assert.equal(input.type,'email');
     return input.token==='123456'?res(200,session):res(403,{msg:'Token has expired or is invalid',code:'otp_expired'});
    }
    return null;
   }
  });
  pg.setDefaultTimeout(8000);
  await pg.goto(origin+'/totehm');
  await pg.getByRole('button',{name:'Sign in',exact:true}).click();
  const address=pg.getByRole('textbox',{name:'Email',exact:true}), code=pg.getByRole('textbox',{name:'Verification code'});
  await address.fill(email);
  if(mobile){
   await pg.getByRole('button',{name:'Send code',exact:true}).tap();
   await pg.waitForFunction(()=>document.getElementById('mw-note').textContent.includes('wait a minute'));
   await pg.getByRole('button',{name:'Send code',exact:true}).tap();
  }else await address.press('Enter');
  await code.waitFor();
  const resend=pg.getByRole('button',{name:'Resend code',exact:true});
  await resend.waitFor();
  if(mobile){
   await resend.tap();
   await pg.waitForFunction(()=>document.getElementById('mw-note').textContent.includes('check your email'));
  }else{
   await pg.reload();
   await pg.getByRole('button',{name:'Sign in',exact:true}).click();
   await code.waitFor();
   assert.equal(await address.inputValue(),email);
  }
  await code.fill('123450');
  await pg.waitForFunction(()=>document.getElementById('mw-note').textContent.includes('expired'));
  assert(await pg.getByRole('button',{name:'Resend code',exact:true}).isEnabled());
  await code.fill('123 456');
  await pg.waitForSelector('body.member');
  await pg.waitForSelector('#srch.is-open.is-pret #member-window.show');
  await pg.getByRole('button',{name:'Sign out',exact:true}).waitFor();
  await pg.click('#srch-x');
  await pg.getByRole('button',{name:'My account',exact:true}).click();
  await pg.waitForSelector('#srch.is-open.is-pret #member-window.show');
  assert.equal(sends,mobile?3:1);
  assert.equal(verifies,2);
  assert(!log.errors.some(e=>e.startsWith('pageerror')),JSON.stringify(log.errors));
  console.log('PASS '+(mobile?'mobile':'ordinateur')+' envoi, erreur récupérable, vérification et accès au compte');
  await ctx.close();
 }
}finally{await browser.close()}
