// Telegram transport never logs URLs, member text, provider descriptions or credentials.
export class TelegramAPIError extends Error {
  method:string;httpStatus:number;code:number;definite:boolean;
  constructor(method:string,httpStatus:number,code:number,definite:boolean){
    super('telegram_'+(definite?'rejected':'uncertain'));this.name='TelegramAPIError';
    this.method=method;this.httpStatus=httpStatus;this.code=code;this.definite=definite;
  }
}
export function createTelegramTransport(token:string|undefined,fetcher:typeof fetch=fetch){
  return async(method:string,payload:unknown):Promise<any>=>{
    if(!token||!/^\w+$/.test(method))throw new TelegramAPIError('configuration',0,0,true);
    let response:Response;
    try{response=await fetcher(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});}
    catch{console.error('[telegram]',method,'network_uncertain');throw new TelegramAPIError(method,0,0,false);}
    let data:any;try{data=await response.json();}catch{data=null;}
    if(response.ok&&data?.ok===true)return data;
    const code=Number.isInteger(data?.error_code)?data.error_code:response.status;
    if(method.startsWith('editMessage')&&code===400&&typeof data?.description==='string'&&data.description.toLowerCase().includes('message is not modified'))return {ok:true,unchanged:true};
    const definite=code>=400&&code<500;
    console.error('[telegram]',method,'http',response.status,'code',code,definite?'rejected':'uncertain');
    throw new TelegramAPIError(method,response.status,code,definite);
  };
}
// Leave room for the same-message confirmation. Splitting at code points never cuts an emoji.
export function telegramTextParts(text:string,limit=3500):string[]{
  if(!Number.isInteger(limit)||limit<2||limit>4096)throw new Error('invalid_telegram_text_limit');
  const parts:string[]=[];let part='';
  for(const point of text){if(part.length+point.length>limit){parts.push(part);part='';}part+=point;}
  if(part)parts.push(part);return parts.length?parts:[' '];
}
