import {createClient} from 'npm:@supabase/supabase-js@2';
import {createLisbonStreetMediaHandler} from '../_shared/lisbon-street-media.ts';

const projectUrl=Deno.env.get('SUPABASE_URL')!;
const admin=createClient(projectUrl,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});

Deno.serve(createLisbonStreetMediaHandler({
 async authenticate(authorization){
  const caller=createClient(projectUrl,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:{user},error}=await caller.auth.getUser();
  return !error&&user?.email?{email:user.email}:null;
 },
 async hasAccess(email){
  const {data,error}=await admin.from('stoner_access').select('email').eq('email',email).maybeSingle();
  if(error)throw new Error('entitlement_unavailable');
  return !!data;
 },
 async sign(filename,ttl){
  const {data,error}=await admin.storage.from('play-signals').createSignedUrl(filename,ttl);
  if(error)throw new Error('signature_unavailable');
  return data?.signedUrl||null;
 }
}));
