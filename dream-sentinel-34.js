// All four uploaded folders form one board, not four routes or dashboard pages.
(() => {
  const board=document.getElementById('board-34');
  const viewport=board.closest('.board-viewport'),stage=board.parentElement;
  const readingButton=document.getElementById('reading-size');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const nodes=new Map();
  for(const layer of window.DREAM_SENTINEL_34_LAYERS){
    const wrapper=document.createElement('div');wrapper.className='design-layer';wrapper.dataset.node=layer.id;
    Object.assign(wrapper.style,{left:`${layer.x}px`,top:`${layer.y}px`,width:`${layer.w}px`,height:`${layer.h}px`});
    const img=document.createElement('img');
    img.src=`assets/dream-sentinel/3.4/${layer.file.split('/').map(encodeURIComponent).join('/')}`;
    img.addEventListener('error',()=>{img.src=`assets/dream-sentinel/3.4/${layer.sourceFile.split('/').map(encodeURIComponent).join('/')}`;},{once:true});
    img.alt=layer.alt;img.decoding='async';img.loading='lazy';img.draggable=false;wrapper.append(img);
    if(['34:758','34:759','34:760','34:761','34:768','34:769','34:774'].includes(layer.id))wrapper.classList.add('demo-layer');
    nodes.set(layer.id,wrapper);board.append(wrapper);
  }
  const controls=[];
  function addHotspot(label,rect,related=[],options={}){
    const button=document.createElement('button');button.type='button';button.className='signal-hotspot';
    button.setAttribute('aria-label',label);button.setAttribute('aria-pressed','false');
    const[x,y,w,h]=rect;Object.assign(button.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
    const targets=related.map(id=>nodes.get(id)).filter(Boolean);
    if(options.card)targets.forEach(n=>n.classList.add('ui-card'));
    const control={button,targets,hovered:false,...options};controls.push(control);board.append(button);
    button.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){control.hovered=true;update();}});
    button.addEventListener('pointerleave',()=>{control.hovered=false;update();});
    button.addEventListener('focus',update);button.addEventListener('blur',update);
    button.addEventListener('click',()=>{
      const selected=button.getAttribute('aria-pressed')!=='true';
      controls.forEach(c=>c.button.setAttribute('aria-pressed','false'));
      button.setAttribute('aria-pressed',String(selected));update();
    });
  }
  function update(){
    const active=controls.filter(c=>c.hovered||c.button.matches(':focus-visible')||c.button.getAttribute('aria-pressed')==='true');
    const targets=new Set(active.flatMap(c=>c.targets));
    controls.forEach(c=>{c.button.classList.toggle('is-related',active.includes(c));c.targets.forEach(n=>n.classList.toggle('is-active',targets.has(n)));});
    board.classList.toggle('demo-before',active.some(c=>c.demo==='before'));
    board.classList.toggle('demo-after',active.some(c=>c.demo==='after'));
    board.classList.toggle('projection-active',active.some(c=>c.projection));
  }
  function reset(){controls.forEach(c=>{c.hovered=false;c.button.setAttribute('aria-pressed','false');});update();}
  // Original BEFORE and AFTER images remain side by side, with all captions intact.
  // Hover/touch runs a local concept demonstration, not a real medical simulation.
  addHotspot('BEFORE：睡眠中未及时感知危险',[2048,150,632,448],['34:758','34:760'],{demo:'before'});
  addHotspot('AFTER：感官刺激与提前防护反应',[2740,150,626,448],['34:759','34:761','34:769'],{demo:'after'});
  [
    ['Page 1：首页与实时安全监测',[983,858,897,570],['34:799']],
    ['Page 2：环境风险感知',[2004,661,680,505],['34:739']],
    ['Page 3：用户身体状态',[2724,661,680,515],['34:740']],
    ['Page 4：安全撤离路线',[2004,1199,680,511],['34:746']],
    ['Page 5：设备连接与运行参数',[2724,1199,680,511],['34:747']]
  ].forEach(([label,rect,ids])=>addHotspot(label,rect,ids,{card:true}));
  addHotspot('实时投影导航：沿指引方向撤离',[1297,366,598,365],[],{projection:true});
  const dot=document.createElement('span');dot.className='projection-dot';dot.setAttribute('aria-hidden','true');board.append(dot);
  board.addEventListener('click',e=>{if(!e.target.closest('.signal-hotspot'))reset();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(board.contains(document.activeElement))document.activeElement.blur();reset();}});
  function resize(){
    const reading=readingButton.getAttribute('aria-pressed')==='true';
    const width=Math.max(viewport.clientWidth,reading?1800:0);
    stage.style.width=`${width}px`;stage.style.height=`${width/2}px`;board.style.transform=`scale(${width/3488})`;
    viewport.classList.toggle('can-scroll',width>viewport.clientWidth);
  }
  new ResizeObserver(resize).observe(viewport);document.addEventListener('sentinel-reading-change',resize);resize();
  let drag=null;
  const release=()=>{if(drag&&viewport.hasPointerCapture(drag.id))viewport.releasePointerCapture(drag.id);drag=null;viewport.classList.remove('dragging');};
  viewport.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0&&!e.target.closest('button')&&stage.clientWidth>viewport.clientWidth)drag={x:e.clientX,left:viewport.scrollLeft,id:e.pointerId,moved:false};});
  viewport.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>4){drag.moved=true;viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');viewport.scrollLeft=drag.left-dx;}});
  viewport.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',release);viewport.addEventListener('lostpointercapture',release);
  viewport.addEventListener('pointerleave',()=>{if(drag&&!drag.moved)release();});
  viewport.addEventListener('keydown',e=>{if(e.target===viewport&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();viewport.scrollBy({left:e.key==='ArrowRight'?260:-260,behavior:reducedMotion.matches?'instant':'smooth'});}});
  let inView=false;
  const pause=()=>board.classList.toggle('board-paused',document.hidden||!inView);
  new IntersectionObserver(entries=>{inView=entries.some(e=>e.isIntersecting);pause();},{threshold:.15}).observe(viewport);
  document.addEventListener('visibilitychange',pause);
})();
