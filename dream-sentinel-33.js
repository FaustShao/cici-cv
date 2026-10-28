// 3.3: native PNG composition, linked annotations, no navigation or lightboxes.
(() => {
  const board=document.getElementById('board-33');
  const viewport=board.closest('.board-viewport');
  const stage=board.parentElement;
  const readingButton=document.getElementById('reading-size');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const layers=window.DREAM_SENTINEL_33_LAYERS;
  const nodes=new Map();
  const collageIds=['34:290','34:291','34:293','34:297','34:298','34:299','34:300'];
  for(const layer of layers){
    const wrapper=document.createElement('div');wrapper.className='design-layer';wrapper.dataset.node=layer.id;
    Object.assign(wrapper.style,{left:`${layer.x}px`,top:`${layer.y}px`,width:`${layer.w}px`,height:`${layer.h}px`});
    const img=document.createElement('img');img.src=`assets/dream-sentinel/3.3/${encodeURIComponent(layer.file)}`;
    img.alt=layer.alt;img.decoding='async';img.draggable=false;wrapper.append(img);
    if(collageIds.includes(layer.id)){wrapper.classList.add('collage-piece');wrapper.style.setProperty('--depth',String(.35+collageIds.indexOf(layer.id)*.08));}
    if(layer.id==='34:302')wrapper.classList.add('sketch-reveal');
    nodes.set(layer.id,wrapper);board.append(wrapper);
  }
  const controls=[];
  function addHotspot(label,rect,related,options={}){
    const button=document.createElement('button');button.type='button';button.className='signal-hotspot'+(options.point?' point':'');
    button.setAttribute('aria-label',label);button.setAttribute('aria-pressed','false');
    const[x,y,w,h]=rect;
    Object.assign(button.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
    const targets=related.map(id=>nodes.get(id)).filter(Boolean);
    if(options.component)targets.forEach(n=>n.classList.add('component-layer'));
    const control={button,targets,group:options.group,hovered:false,component:Boolean(options.component)};
    if(options.dot){
      const dot=document.createElement('span');dot.className='signal-dot';dot.setAttribute('aria-hidden','true');
      Object.assign(dot.style,{left:`${options.dot[0]-7}px`,top:`${options.dot[1]-7}px`});board.append(dot);control.dot=dot;
    }
    controls.push(control);board.append(button);
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
    const groups=new Set(active.map(c=>c.group).filter(Boolean));
    const related=controls.filter(c=>active.includes(c)||(c.group&&groups.has(c.group)));
    const targets=new Set(related.flatMap(c=>c.targets));
    controls.forEach(c=>{const on=related.includes(c);c.button.classList.toggle('is-related',on);c.dot?.classList.toggle('is-active',on);c.targets.forEach(n=>n.classList.toggle('is-active',targets.has(n)));});
    board.classList.toggle('has-active-component',related.some(c=>c.component));
  }
  function reset(){controls.forEach(c=>{c.hovered=false;c.button.setAttribute('aria-pressed','false');});update();}
  // Exact existing image / explanatory text / leader-line correspondences.
  [
    ['轻量固定绑带','34:261','34:262','34:270',[3246,441]],
    ['仿生骨架与感官反馈','34:257','34:266','34:273',[3246,659]],
    ['微型防护气囊','34:269','34:267','34:272',[3291,812]],
    ['气阀调节组件','34:268','34:265','34:271',[2991,1073]],
    ['轻量镂空骨架','34:256','34:264','34:259',[3186,1321]],
    ['核心控制单元','34:258','34:263','34:260',[3148,1585]]
  ].forEach(([label,imageId,textId,lineId,point],i)=>{
    const group=`component-${i}`;const related=[imageId,textId,lineId];
    const image=layers.find(l=>l.id===imageId),text=layers.find(l=>l.id===textId);
    addHotspot(`零件：${label}`,[image.x,image.y,image.w,image.h],related,{group,component:true});
    addHotspot(`说明：${label}`,[text.x-8,text.y-8,text.w+16,text.h+16],related,{group,component:true});
    addHotspot(`连接点：${label}`,[point[0]-30,point[1]-30,60,60],related,{group,component:true,point:true,dot:point});
  });
  ['34:379','34:380','34:381','34:382'].forEach((id,i)=>{
    const layer=layers.find(l=>l.id===id);const node=nodes.get(id);
    node.classList.add('mechanism-step');node.style.setProperty('--step-delay',`${i*.65}s`);
    const labels=['环境危险感知','危险识别与感官刺激','苏醒与环境信息投影','应急导航与撤离'];
    addHotspot(`设备运行机制 ${i+1}：${labels[i]}`,[layer.x-8,layer.y-8,layer.w+16,layer.h+16],[id]);
  });
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
  const clearParallax=()=>{board.style.setProperty('--collage-x','0px');board.style.setProperty('--collage-y','0px');};
  const release=()=>{if(drag&&viewport.hasPointerCapture(drag.id))viewport.releasePointerCapture(drag.id);drag=null;viewport.classList.remove('dragging');};
  viewport.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0&&!e.target.closest('button')&&stage.clientWidth>viewport.clientWidth)drag={x:e.clientX,left:viewport.scrollLeft,id:e.pointerId,moved:false};});
  viewport.addEventListener('pointermove',e=>{
    if(drag){const dx=e.clientX-drag.x;if(Math.abs(dx)>4){drag.moved=true;viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');viewport.scrollLeft=drag.left-dx;clearParallax();}return;}
    if(e.pointerType!=='mouse'||reducedMotion.matches)return;
    const rect=board.getBoundingClientRect(),scale=rect.width/3488;
    const x=(e.clientX-rect.left)/scale,y=(e.clientY-rect.top)/scale;
    if(x<1300&&y<733){board.style.setProperty('--collage-x',`${(x/1300-.5)*10}px`);board.style.setProperty('--collage-y',`${(y/733-.5)*10}px`);}else clearParallax();
  });
  viewport.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',release);viewport.addEventListener('lostpointercapture',release);
  viewport.addEventListener('pointerleave',()=>{if(drag&&!drag.moved)release();clearParallax();});
  viewport.addEventListener('keydown',e=>{if(e.target===viewport&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();viewport.scrollBy({left:e.key==='ArrowRight'?260:-260,behavior:reducedMotion.matches?'instant':'smooth'});}});
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)clearParallax();});
  let inView=false;
  const pause=()=>board.classList.toggle('board-paused',document.hidden||!inView);
  new IntersectionObserver(entries=>{inView=entries.some(e=>e.isIntersecting);pause();if(inView)board.classList.add('is-visible');},{threshold:.15}).observe(viewport);
  document.addEventListener('visibilitychange',pause);
})();
