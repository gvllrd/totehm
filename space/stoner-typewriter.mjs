const active=new WeakMap();
const logoSelector='.higher-inline,.higher-inline-p,.higher-top,[data-type-logo]';
const letterEdges=[18,26,44,61,77,100];

export function finishStonerWriting(element){
  active.get(element)?.();
}

export function writeStonerContent(element,{characterMs=29,maxDuration=2450}={}){
  finishStonerWriting(element);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const cues=[];
  function visit(node){
    if(node.nodeType===3){
      if(!node.textContent.trim())return;
      const fragment=document.createDocumentFragment();
      for(const token of node.textContent.split(/(\s+)/u)){
        if(!token)continue;
        if(!token.trim()){fragment.append(token);continue;}
        const word=document.createElement('span');word.className='writing-word';
        for(const letter of token){
          const glyph=document.createElement('span');glyph.className='writing-glyph';glyph.textContent=letter;
          word.append(glyph);cues.push(()=>glyph.classList.add('written'));
        }
        fragment.append(word);
      }
      node.replaceWith(fragment);return;
    }
    if(node.nodeType!==1||node.matches('.nb-src,svg,.writing-word'))return;
    if(node.matches(logoSelector)){
      const logo=node.querySelector('svg');
      if(!logo)return;
      logo.classList.add('writing-logo');logo.style.setProperty('--written','0%');
      for(const percent of letterEdges)cues.push(()=>logo.style.setProperty('--written',percent+'%'));
      return;
    }
    for(const child of Array.from(node.childNodes))visit(child);
  }
  visit(element);
  if(!cues.length)return;
  let written=0,start,frame=0;
  const duration=Math.min(maxDuration,cues.length*characterMs);
  function finish(){
    cancelAnimationFrame(frame);
    while(written<cues.length)cues[written++]();
    active.delete(element);
  }
  function tick(now){
    start??=now;
    const goal=Math.min(cues.length,Math.floor((now-start)/duration*cues.length));
    while(written<goal)cues[written++]();
    if(written===cues.length)finish();else frame=requestAnimationFrame(tick);
  }
  active.set(element,finish);
  frame=requestAnimationFrame(tick);
}
