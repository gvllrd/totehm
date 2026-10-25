import assert from 'node:assert/strict';
import {createPageGestures} from '../../space/origins-book.mjs';
let checks=0;const check=(v,msg)=>{assert(v,msg);checks++;};
function fixture(){const moves=[];let blocked=false;const g=createPageGestures({move:(direction,source)=>(moves.push({direction,source}),true),busy:()=>blocked});return{moves,g,block:v=>{blocked=v;}};}
{
 const {g,moves}=fixture();for(let i=0;i<120;i++)g.wheel(i<50?34:2,i*16);
 check(moves.length===1,'A long inertia tail can never advance another page even after the animation duration');
 g.wheel(40,120*16+241);check(moves.length===2,'A fresh wheel gesture begins only after quiet since the final event');
 check(moves.every(m=>m.direction===1&&m.source==='wheel'),'Wheel turns preserve direction and source');
}
{
 const {g,moves,block}=fixture();block(true);g.wheel(100,0);block(false);for(let t=16;t<1000;t+=16)g.wheel(100,t);
 check(moves.length===0,'A gesture started during a page turn remains consumed for its whole inertia burst');g.wheel(-40,1300);check(moves.length===1&&moves[0].direction===-1,'The next deliberate gesture can turn the previous page');
}
{
 const {g,moves}=fixture();g.wheel(12,0);g.wheel(12,20);check(moves.length===0,'Small trackpad deltas accumulate before a turn');g.wheel(12,40);check(moves.length===1,'The threshold accepts a single page');
 g.wheel(15,400);g.wheel(15,700);check(moves.length===1,'Separate sub-threshold gestures do not carry momentum into one another');
}
{
 const {g,moves}=fixture();for(const value of [NaN,Infinity,-Infinity])g.wheel(value,0);g.wheel(100,NaN);g.wheel(0,1);check(!moves.length,'Invalid and zero wheel values never turn a page');
 check(!g.swipe(10,4,10),'A short accidental drag does not turn a page');check(g.swipe(-80,12,250),'Horizontal left swipe turns a single page');check(g.swipe(4,80,250),'Vertical down swipe turns one previous page');
 check(moves.map(m=>m.direction).join(',')==='1,-1','Horizontal and vertical swipes preserve page direction');check(!g.swipe(4,25,500),'Slow short swipe is ignored');check(g.swipe(0,-25,35),'A short intentional flick is accepted');
 check(!g.key(1,true),'Repeated held arrow keys do not race through the book');check(g.key(1,false),'A fresh keypress turns one page');check(!g.key(0),'Unsupported key directions are ignored');
}
{
 let page=20;const g=createPageGestures({move:d=>{const next=Math.max(0,Math.min(20,page+d));if(next===page)return false;page=next;return true;}});
 check(!g.wheel(300,0)&&page===20,'The final artwork stays bounded');check(g.wheel(-300,300)&&page===19,'A new reverse gesture returns from the end');
 check(g.diagnostics().wheelTurns===1,'Only accepted bounded turns are counted');
}
console.log('PASS '+checks+' Origins one-page gesture checks');
