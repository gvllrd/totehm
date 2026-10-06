// Shared source, embedded into each workflow by the exporter. No secrets in items.
const SB_URL='https://abujjbkbbiumxrokozph.supabase.co';
const N8N_URL='https://n8n.higher.boutique';
const uuid=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value||''));
const sbHeaders={apikey:$env.SB_KEY,'Content-Type':'application/json'};
const pfHeaders={Authorization:'Bearer '+$env.PRINTFUL_TOKEN,'X-PF-Store-Id':String($env.PF_STORE_ID),'Content-Type':'application/json'};
const request=async options=>{
  let response;
  try{response=await this.helpers.httpRequest({...options,json:options.json!==false,
    returnFullResponse:true,ignoreHttpStatusErrors:true,timeout:options.timeout||30000});}
  catch{throw new Error('transport_'+String(options.method||'GET').toLowerCase());}
  if(response.statusCode>=400){const error=new Error('http_'+response.statusCode);error.status=response.statusCode;throw error;}
  return response.body;
};
const rpc=(name,body={})=>request({method:'POST',url:SB_URL+'/rest/v1/rpc/'+name,headers:sbHeaders,body});
const db=(path,method='GET',body,extra={})=>request({method,url:SB_URL+'/rest/v1/'+path,headers:{...sbHeaders,...extra},...(body!==undefined?{body}:{})});
const serviceAuth=async headers=>{
  const key=headers?.apikey||String(headers?.authorization||'').replace(/^Bearer\s+/i,'');
  if(!key)return false;
  const backendHeaders={apikey:key,'Content-Type':'application/json',...(!key.startsWith('sb_')?{Authorization:'Bearer '+key}:{})};
  try{return await request({method:'POST',url:SB_URL+'/rest/v1/rpc/streetwear_service_ready',headers:backendHeaders,body:{},timeout:5000})===true;}
  catch{return false;}
};
const failResult=(reason,http_status=400)=>[{json:{ok:false,reason,http_status}}];
const ticketResult=ticket=>[{json:{...ticket,http_status:ticket.ok?202:(ticket.reason==='not_found'?404:200)}}];
const checkpoint=(ticket,data,wait=false)=>rpc('streetwear_checkpoint',{p_cloth:ticket.cloth.id,p_stage:ticket.stage,p_token:ticket.token,p_data:data,p_wait:wait});
const complete=(ticket,result={})=>rpc('streetwear_complete',{p_cloth:ticket.cloth.id,p_stage:ticket.stage,p_token:ticket.token,p_result:result});
const fail=(ticket,code,retry=false)=>rpc('streetwear_fail',{p_cloth:ticket.cloth.id,p_stage:ticket.stage,p_token:ticket.token,p_code:String(code).slice(0,160),p_retry:retry});
const callFlow=(path,body)=>request({method:'POST',url:N8N_URL+'/webhook/'+path,headers:sbHeaders,body,timeout:10000});
const refreshAsset=body=>request({method:'POST',url:SB_URL+'/functions/v1/streetwear-assets',headers:sbHeaders,body});
const tg=(method,body)=>request({method:'POST',url:'https://api.telegram.org/bot'+$env.TG_TOKEN+'/'+method,body});
const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// SHA-256 only derives a separate provider webhook token; it never signs artwork.
function sha256(ascii){
  const rightRotate=(value,amount)=>(value>>>amount)|(value<<(32-amount));
  const maxWord=2**32,words=[],bitLength=ascii.length*8;
  let hash=[],constants=[],primeCounter=0;
  const composite={};
  for(let candidate=2;primeCounter<64;candidate++)if(!composite[candidate]){
    for(let i=0;i<313;i+=candidate)composite[i]=candidate;
    hash[primeCounter]=(Math.sqrt(candidate)*maxWord)|0;
    constants[primeCounter++]=(Math.cbrt(candidate)*maxWord)|0;
  }
  ascii+='\x80';while(ascii.length%64!==56)ascii+='\x00';
  for(let i=0;i<ascii.length;i++)words[i>>2]|=ascii.charCodeAt(i)<<(24-(i%4)*8);
  words.push((bitLength/maxWord)|0,bitLength);
  hash=hash.slice(0,8);
  for(let j=0;j<words.length;){
    const w=words.slice(j,j+=16),oldHash=hash.slice();
    for(let i=0;i<64;i++){
      const w15=w[i-15],w2=w[i-2],a=hash[0],e=hash[4];
      const temp1=hash[7]+(rightRotate(e,6)^rightRotate(e,11)^rightRotate(e,25))+((e&hash[5])^((~e)&hash[6]))+constants[i]+
        (w[i]=i<16?w[i]:(w[i-16]+(rightRotate(w15,7)^rightRotate(w15,18)^(w15>>>3))+w[i-7]+(rightRotate(w2,17)^rightRotate(w2,19)^(w2>>>10)))|0);
      const temp2=(rightRotate(a,2)^rightRotate(a,13)^rightRotate(a,22))+((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));
      hash=[(temp1+temp2)|0,a,hash[1],hash[2],(hash[3]+temp1)|0,hash[4],hash[5],hash[6]];
    }
    for(let i=0;i<8;i++)hash[i]=(hash[i]+oldHash[i])|0;
  }
  return hash.map(value=>(value>>>0).toString(16).padStart(8,'0')).join('');
}
