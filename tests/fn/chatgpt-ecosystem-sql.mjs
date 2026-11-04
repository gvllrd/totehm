// Runs both real additive migrations; native app RPCs are isolated fixtures.
// Never connects to production and never reads a real member.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333';
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
try{
 await db.exec(`
  create role anon;create role authenticated;create role service_role;
  create schema auth;create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  insert into auth.users values ('${A}'),('${B}');
  create table public.profiles(id uuid,pseudo text);
  insert into public.profiles values ('${B}','artist');
  create table public.creator_subscriptions(creator_id uuid,fan_id uuid,status text);
  insert into public.creator_subscriptions values ('${B}','${A}','active');
  create function public._subscriber_of(c uuid,f uuid) returns boolean language sql as $$select exists(select 1 from public.creator_subscriptions where creator_id=c and fan_id=f and status='active')$$;
  create function public.totehm_read(text) returns jsonb language sql as $$select jsonb_build_object('ok',true,'pseudo',$1,'viewer',auth.uid(),'steps','[{"t":"Shared"}]'::jsonb)$$;
  create function public.member_media(text) returns jsonb language sql as $$select jsonb_build_object('items','[{"id":"${C}","kind":"h","ref":"Shared","path":"secret","mime":"image/png"}]'::jsonb)$$;
  create function public.club_spots(text,jsonb,double precision,double precision,integer,integer,timestamptz) returns jsonb language sql as $$select jsonb_build_object('ok',true,'viewer',auth.uid(),'items',jsonb_build_array(jsonb_build_object('id','${C}','creator','someone else')),'period',$1,'next_offset',$6+$5)$$;
  create function public.club_spots_of(text,text,jsonb,double precision,double precision,integer,integer,timestamptz) returns jsonb language sql as $$select public.club_spots($2,$3,$4,$5,$6,$7,$8)$$;
 `);
 for(const file of ['20261101090000_chatgpt_connector.sql','20261104140000_chatgpt_ecosystem.sql'])
  await db.exec(await readFile(new URL('../../backend/supabase/migrations/'+file,import.meta.url),'utf8'));
 const cid=await scalar("insert into public.chatgpt_clients(name,redirect_uris) values ('Fixture',array['https://chatgpt.example.test/callback']) returning client_id");
 const rid=await scalar("insert into public.chatgpt_requests(client_id,redirect_uri,code_challenge,state,resource) values ($1,'https://chatgpt.example.test/callback',$2,'state','https://www.totehm.com/mcp') returning id",[cid,'A'.repeat(43)]);
 const code='b'.repeat(64);
 const issued=await scalar('select public.chatgpt_authorize_ecosystem($1,$2,$3)',[rid,A,code]);
 assert.equal(issued.ok,true);
 const grant=await scalar('select grant_id from public.chatgpt_codes where code_hash=$1',[code]);
 assert.equal(await scalar('select version from public.chatgpt_ecosystem_consents where grant_id=$1',[grant]),1);
 const read=async(action,pseudo=null)=>scalar('select public.chatgpt_read_ecosystem($1,$2,$3)',[grant,action,pseudo]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[B]);
 assert.equal((await read('member','artist')).viewer,A);
 assert.equal(await scalar('select auth.uid()'),B,'Subject claims restored after the RPC');
 const members=await read('members');
 assert.equal(members.items[0].pseudo,'artist');
 assert.equal((await read('member','unknown')).ok,false);
 assert(!JSON.stringify(await read('media','artist')).includes('secret'),'Storage paths never leave media RPC');
 assert.equal((await read('spots')).items[0].creator,'someone else','Club discovery covers other members, not just subscriptions');
 await db.query("update public.creator_subscriptions set status='cancelled' where fan_id=$1",[A]);
 assert.equal((await read('member','artist')).ok,false,'Subscription is checked on each read');
 assert.equal((await read('members')).items.length,0);
 await db.exec('set role authenticated');
 await assert.rejects(()=>read('spots'),e=>e.code==='42501');
 await db.exec('reset role');
 const old=await scalar("insert into public.chatgpt_grants(user_id,client_id,resource) values ($1,$2,'https://www.totehm.com/mcp') returning id",[A,cid]);
 assert.equal((await scalar("select public.chatgpt_read_ecosystem($1,'spots')",[old])).why,'consent_required');
 await db.query('update public.chatgpt_grants set revoked_at=now() where id=$1',[grant]);
 assert.equal((await read('spots')).why,'consent_required');
 console.log('Ecosystem SQL: consent, subject restoration, subscription cancellation, Club and ACL passed');
}finally{await db.close();}
