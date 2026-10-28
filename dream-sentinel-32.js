// 3.2 stays in the same project document. No links, route changes, or dialogs.
(() => {
  const board=document.getElementById('board-32');
  const viewport=board.closest('.board-viewport');
  const stage=board.parentElement;
  const readingButton=document.getElementById('reading-size');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const nodes=new Map();
  for(const layer of window.DREAM_SENTINEL_32_LAYERS){
    const wrapper=document.createElement('div');
    wrapper.className='design-layer';wrapper.dataset.node=layer.id;
    Object.assign(wrapper.style,{left:`${layer.x}px`,top:`${layer.y}px`,width:`${layer.w}px`,height:`${layer.h}px`},layer.style||{});
    if(layer.file){
      const img=document.createElement('img');
      img.src=`assets/dream-sentinel/3.2/${encodeURIComponent(layer.file)}`;
      img.alt=layer.alt;img.decoding='async';img.draggable=false;
      wrapper.append(img);
    }
    nodes.set(layer.id,wrapper);board.append(wrapper);
  }
  const controls=[];
  const groups=new Map();
  function addHotspot(label,rect,related=[],options={}){
    const button=document.createElement('button');
    button.type='button';button.className='signal-hotspot'+(options.round?' round':'');
    button.setAttribute('aria-label',label);button.setAttribute('aria-pressed','false');
    const [x,y,w,h]=rect;
    Object.assign(button.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
    const targets=related.map(id=>nodes.get(id)).filter(Boolean);
    targets.forEach(n=>n.classList.add('signal-target'));
    const dot=document.createElement('span');dot.className='signal-dot';dot.setAttribute('aria-hidden','true');
    const dotPosition=options.dot||[x+w-10,y+10];
    Object.assign(dot.style,{left:`${dotPosition[0]-7}px`,top:`${dotPosition[1]-7}px`});
    const control={button,targets,dot,group:options.group,hovered:false};
    if(options.group){if(!groups.has(options.group))groups.set(options.group,[]);groups.get(options.group).push(control);}
    controls.push(control);
    button.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){control.hovered=true;update();}});
    button.addEventListener('pointerleave',()=>{control.hovered=false;update();});
    button.addEventListener('focus',update);button.addEventListener('blur',update);
    button.addEventListener('click',()=>{
      const selected=button.getAttribute('aria-pressed')!=='true';
      controls.forEach(c=>c.button.setAttribute('aria-pressed','false'));
      button.setAttribute('aria-pressed',String(selected));update();
    });
    board.append(button,dot);
    return control;
  }
  function update(){
    const active=controls.filter(c=>c.hovered||c.button.matches(':focus-visible')||c.button.getAttribute('aria-pressed')==='true');
    const activeGroups=new Set(active.map(c=>c.group).filter(Boolean));
    const activeTargets=new Set(active.flatMap(c=>c.targets));
    controls.forEach(c=>{
      const on=active.includes(c)||(c.group&&activeGroups.has(c.group));
      c.button.classList.toggle('is-related',Boolean(on));c.dot.classList.toggle('is-active',Boolean(on));
      c.targets.forEach(n=>n.classList.toggle('is-active',activeTargets.has(n)));
    });
  }
  function reset(){controls.forEach(c=>{c.hovered=false;c.button.setAttribute('aria-pressed','false');});update();}
  // Four original sensor columns: highlight the complete image + title + copy.
  ['早期预警系统','超声波传感器','红外传感器','烟雾传感器'].forEach((label,i)=>{
    addHotspot(label,[101+i*424,255,394,420],[],{dot:[297+i*424,246]});
  });
  // Numbered nodes follow the existing six-step concept map; keep every PNG intact.
  const steps=[
    ['34:627','战争冲突与安全风险',[2016,377,414,416],['34:601','34:612','34:606','34:608','34:615','34:619']],
    ['34:589','睡眠安全感知与提前预警',[2458,385,231,231],['34:604','34:614','34:609','34:610','34:620','34:621']],
    ['34:595','资源开发与生态环境变化',[2592,103,336,334],['34:587','34:611','34:607','34:616']],
    ['34:592','睡眠中的动作反应',[2763,426,329,329],['34:482','34:483']],
    ['34:623','睡眠感知降低与避险时机',[3116,33,230,230],['34:605','34:622']],
    ['34:598','梦境干预与身体反应',[3155,560,258,258],['34:588','34:613','34:602','34:603','34:617','34:618']]
  ];
  steps.forEach(([id,label,rect,related],i)=>{
    const layer=window.DREAM_SENTINEL_32_LAYERS.find(l=>l.id===id);
    const number=nodes.get(id);number.classList.add('mind-step');number.style.setProperty('--step-delay',`${i*.5}s`);
    const group=`step-${i}`;
    addHotspot(`思维导图 ${i+1}：${label}`,rect,[id,...related],{round:true,group,dot:[layer.x+layer.w+10,layer.y+layer.h/2]});
    addHotspot(`节点 ${i+1}`, [layer.x-10,layer.y-10,layer.w+20,layer.h+20],[id,...related],{round:true,group,dot:[layer.x+layer.w+10,layer.y+layer.h/2]});
  });
  // Existing anatomical points and their captions highlight each other locally.
  [
    ['光刺激与梦境体验',[3076,1278],[2550,1267,460,92]],
    ['骨传导与听觉刺激',[3414,1285],[2550,1423,490,90]],
    ['下颌骨与冲击防护',[3133.5,1535],[2550,1569,470,91]]
  ].forEach(([label,point,caption],i)=>{
    const group=`body-${i}`;
    addHotspot(label,[point[0]-42,point[1]-42,84,84],[],{round:true,group,dot:point});
    addHotspot(`${label}：说明`,caption,[],{group,dot:point});
  });
  board.addEventListener('click',e=>{if(!e.target.closest('.signal-hotspot'))reset();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(board.contains(document.activeElement))document.activeElement.blur();reset();}});
  function resize(){
    const reading=readingButton.getAttribute('aria-pressed')==='true';
    const width=Math.max(viewport.clientWidth,reading?1800:0);
    stage.style.width=`${width}px`;stage.style.height=`${width/2}px`;board.style.transform=`scale(${width/3488})`;
    viewport.classList.toggle('can-scroll',width>viewport.clientWidth);
  }
  new ResizeObserver(resize).observe(viewport);
  document.addEventListener('sentinel-reading-change',resize);resize();
  let drag=null;
  const release=()=>{if(drag&&viewport.hasPointerCapture(drag.id))viewport.releasePointerCapture(drag.id);drag=null;viewport.classList.remove('dragging');};
  viewport.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0&&!e.target.closest('button')&&stage.clientWidth>viewport.clientWidth)drag={x:e.clientX,left:viewport.scrollLeft,id:e.pointerId,moved:false};});
  viewport.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>4){drag.moved=true;viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');viewport.scrollLeft=drag.left-dx;}});
  viewport.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',release);viewport.addEventListener('lostpointercapture',release);
  viewport.addEventListener('pointerleave',()=>{if(drag&&!drag.moved)release();});
  viewport.addEventListener('keydown',e=>{if(e.target===viewport&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();viewport.scrollBy({left:e.key==='ArrowRight'?260:-260,behavior:reducedMotion.matches?'instant':'smooth'});}});
  // The introductory node sequence runs once, only when this board is visible.
  let inView=false;
  const pause=()=>board.classList.toggle('board-paused',document.hidden||!inView);
  new IntersectionObserver(entries=>{
    inView=entries.some(e=>e.isIntersecting);pause();
    if(inView)board.classList.add('is-visible');
  },{threshold:.15}).observe(viewport);
  document.addEventListener('visibilitychange',pause);
})();
