// One continuous project document; subsequent boards can be appended to main.
(() => {
  const board = document.getElementById('board-31');
  const viewport = document.querySelector('.board-viewport');
  const stage = document.querySelector('.board-stage');
  const readingButton = document.getElementById('reading-size');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const nodes = new Map();
  const generic = /^(Group |Rectangle |Frame|Mask group|image |Ellipse |Arrow |\d+$)/;
  for (const layer of window.DREAM_SENTINEL_LAYERS) {
    const wrapper = document.createElement('div');
    wrapper.className = 'design-layer';wrapper.dataset.node = layer.id;
    Object.assign(wrapper.style, {left:`${layer.x}px`,top:`${layer.y}px`,width:`${layer.w}px`,height:`${layer.h}px`});
    const img = document.createElement('img');
    img.src = `assets/dream-sentinel/3.1/${encodeURIComponent(layer.file)}`;
    img.alt = layer.alt;img.decoding = 'async';img.draggable = false;
    // Preserve the original text PNGs and transparent export padding.
    if (!img.alt && !generic.test(layer.file)) img.alt = layer.file.slice(0,-4);
    wrapper.append(img);
    if (['34:821','34:922'].includes(layer.id)) wrapper.classList.add('luminosity');
    if (layer.id === '34:1100') wrapper.classList.add('background-device');
    if (['34:911','34:920','34:921'].includes(layer.id)) {
      wrapper.classList.add('intro-enter');
      wrapper.style.setProperty('--delay', layer.id === '34:911' ? '0s' : layer.id === '34:920' ? '.12s' : '.24s');
    }
    nodes.set(layer.id, wrapper);board.append(wrapper);
  }
  // These legend glyphs are absent from the exported chart PNG.
  [['意识混乱与反应迟滞',2655.24,1422.35],['尖叫反应',2810.13,1422.39],['应激反应',2893.88,1422.35]].forEach(([text,x,y]) => {
    const label=document.createElement('span');label.className='design-layer';label.textContent=text;
    Object.assign(label.style,{left:`${x}px`,top:`${y}px`,fontSize:'13.768px',whiteSpace:'nowrap',fontFamily:'serif'});board.append(label);
  });
  const controls = [];
  const addHotspot = (label, rect, related, dotPosition) => {
    const button=document.createElement('button');button.type='button';button.className='signal-hotspot';
    button.setAttribute('aria-label',label);button.setAttribute('aria-pressed','false');
    const [x,y,w,h]=rect;
    Object.assign(button.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
    const dot=document.createElement('span');dot.className='signal-dot';dot.setAttribute('aria-hidden','true');
    Object.assign(dot.style,{left:`${dotPosition[0]}px`,top:`${dotPosition[1]}px`});
    const targets=related.map(id=>nodes.get(id)).filter(Boolean);targets.forEach(node=>node.classList.add('signal-target'));
    let hovered=false;
    const update=()=>{const active=hovered||button.matches(':focus-visible')||button.getAttribute('aria-pressed')==='true';targets.forEach(node=>node.classList.toggle('is-active',active));dot.classList.toggle('is-active',active);};
    const reset=()=>{hovered=false;button.setAttribute('aria-pressed','false');update();};
    controls.push({button,reset,update});
    button.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hovered=true;update();}});
    button.addEventListener('pointerleave',()=>{hovered=false;update();});
    button.addEventListener('focus',update);button.addEventListener('blur',update);
    button.addEventListener('click',()=>{
      const active=button.getAttribute('aria-pressed')!=='true';controls.forEach(c=>{if(c.button!==button)c.reset();});
      button.setAttribute('aria-pressed',String(active));update();
    });
    board.append(button,dot);
  };
  // Local emphasis, never navigation or a zoom dialog.
  addHotspot('呼救与惊吓反应',[2145,1057,466,123],['34:818','34:858','34:1039','34:1062'],[2303,1108]);
  addHotspot('突然苏醒后的意识混乱',[2257,1202,340,123],['34:819','34:859','34:1027','34:989'],[2374,1260]);
  addHotspot('寻找异常声响来源',[2116,1346,455,123],['34:820','34:860','34:966','34:1010'],[2350,1409]);
  addHotspot('生理反应机制',[1588,991,252,112],['34:922'],[1852,1120]);
  addHotspot('外部环境刺激',[1893,1022,205,124],['34:922'],[2070,1050]);
  addHotspot('复合感官变化',[1563,1189,213,156],['34:922'],[1765,1250]);
  addHotspot('后续行为反应',[1907,1182,243,137],['34:922'],[2138,1210]);
  addHotspot('核心问题：意识恢复与反应延迟',[1705,1360,272,181],['34:922'],[1964,1420]);
  [[1200,1008,355,155],[1200,1170,355,133],[1200,1304,355,155],[3010,1008,365,135],[3010,1144,365,158],[3010,1300,365,165]].forEach((rect,i)=>{
    const labels=['心率变化','肌肉应激反应','抓握反应','睡眠言语','突然坐起','呼吸与紧张反应'];
    addHotspot(labels[i],rect,[],[rect[0]+rect[2]-12,rect[1]+12]);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){controls.forEach(c=>c.reset());if(board.contains(document.activeElement))document.activeElement.blur();}});
  board.addEventListener('click',e=>{if(!e.target.closest('.signal-hotspot'))controls.forEach(c=>c.reset());});
  let fitOnMobile=false,enlarged=false;
  function resize(){
    const mobile=viewport.clientWidth<=900;
    const reading=(mobile&&!fitOnMobile)||enlarged;
    const width=Math.max(viewport.clientWidth,reading?1800:0);
    const scale=width/3488;
    stage.style.width=`${width}px`;stage.style.height=`${1744*scale}px`;board.style.transform=`scale(${scale})`;
    document.body.classList.toggle('reading-mode',reading);
    viewport.classList.toggle('can-scroll',width>viewport.clientWidth);
    readingButton.setAttribute('aria-pressed',String(reading));readingButton.textContent=reading?'适应宽度':'放大阅读';
  }
  new ResizeObserver(resize).observe(viewport);resize();
  readingButton.addEventListener('click',()=>{
    if(viewport.clientWidth<=900){fitOnMobile=!fitOnMobile;enlarged=false;}else enlarged=!enlarged;
    resize();
  });
  let dragging=null;
  viewport.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('button')||stage.clientWidth<=viewport.clientWidth)return;
    dragging={x:e.clientX,left:viewport.scrollLeft,moved:false,id:e.pointerId};
  });
  viewport.addEventListener('pointermove',e=>{
    if(dragging){const dx=e.clientX-dragging.x;if(Math.abs(dx)>4){dragging.moved=true;viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');viewport.scrollLeft=dragging.left-dx;}return;}
    if(e.pointerType!=='mouse'||reducedMotion.matches)return;
    const rect=viewport.getBoundingClientRect();
    board.style.setProperty('--device-x',`${(e.clientX-rect.left)/rect.width*8-4}px`);
    board.style.setProperty('--device-y',`${(e.clientY-rect.top)/rect.height*8-4}px`);
  });
  const release=()=>{if(dragging&&viewport.hasPointerCapture(dragging.id))viewport.releasePointerCapture(dragging.id);dragging=null;viewport.classList.remove('dragging');};
  viewport.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',release);viewport.addEventListener('lostpointercapture',release);
  viewport.addEventListener('pointerleave',()=>{if(dragging&&!dragging.moved)release();board.style.setProperty('--device-x','0px');board.style.setProperty('--device-y','0px');});
  viewport.addEventListener('keydown',e=>{if(e.target!==viewport)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();viewport.scrollBy({left:e.key==='ArrowRight'?260:-260,behavior:reducedMotion.matches?'instant':'smooth'});}});
})();
