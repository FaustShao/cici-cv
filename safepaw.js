// A continuous project reader, following the Dream Sentinel board layout.
// All wording/type and illustration pixels remain the user's exported PNGs.
(() => {
  const main=document.getElementById('project-document');
  const readingButton=document.getElementById('reading-size');
  const layouts=window.SAFEPAW_LAYOUT;
  const svgNS='http://www.w3.org/2000/svg';
  const headings=['项目概述、背景研究与儿童犬咬伤相关数据','用户画像、用户旅程、传感技术与系统架构','App 信息架构、界面设计与数据展示','草图推演、建模造型与应用场景','产品结构与功能细节、使用情景故事板'];
  const blend={MULTIPLY:'multiply',LINEAR_BURN:'multiply',LUMINOSITY:'luminosity',HARD_LIGHT:'hard-light',DARKEN:'darken'};
  const views=[],cards=[];
  const loadBoard=section=>{
    const pending=[...section.querySelectorAll('image[data-src]')].map(image=>new Promise(resolve=>{
      image.addEventListener('load',()=>{image.dataset.ready='true';resolve(true);},{once:true});
      image.addEventListener('error',()=>{image.dataset.ready='error';resolve(false);},{once:true});
      image.setAttribute('href',window.CeciliaAssetURL(image.dataset.src));delete image.dataset.src;
    }));
    Promise.all(pending).then(results=>section.dataset.loaded=results.every(Boolean)?'true':'error');
  };
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){loadBoard(entry.target);observer.unobserve(entry.target);}}),{rootMargin:'1000px 0px'}):null;
  let enlarged=false,fitOnMobile=false;
  const generic=/^(Group |Rectangle |Frame |Mask group|image |Ellipse |Arrow|Union|Vector|Guts\s*\/|Highlight|Misc_|Paper Tape|Underline|Polygon)/;
  const cardIds=new Set(['54:187','54:217','54:246','54:2512','54:957','54:1091','54:1241','54:1312','54:1468','54:1604','54:1717','54:1819','54:1935','54:2051','54:2137']);
  const cardNames={'54:187':'用户画像：王女士','54:217':'用户画像：张先生','54:246':'用户画像：李先生','54:2512':'儿童与宠物犬互动插画'};
  const resetCards=()=>cards.forEach(card=>card.setAttribute('aria-pressed','false'));
  for(const [index,layout] of layouts.entries()){
    const section=document.createElement('section');section.className='board-viewport';section.tabIndex=0;
    section.id=`section-${index+1}`;section.setAttribute('aria-label',`${index+1}. ${headings[index]}，可放大并横向浏览`);section.setAttribute('aria-describedby','reading-hint');
    const heading=document.createElement('h2');heading.className='sr-only';heading.textContent=headings[index];section.append(heading);
    const stage=document.createElement('div');stage.className='board-stage';
    const board=document.createElementNS(svgNS,'svg');board.classList.add('design-board');board.id=`board-${index+1}`;board.style.background=layout.background;
    board.setAttribute('viewBox','0 0 3488 1744');board.setAttribute('width','3488');board.setAttribute('height','1744');
    for(const layer of layout.layers){
      const zoom=window.ProjectUIZoom?.get('safepaw',layer.id);
      const interactive=cardIds.has(layer.id)||index===4&&/^Group 336(19|2[0-6])$/.test(layer.name);
      const node=document.createElementNS(svgNS,'g');node.classList.add('design-layer');node.dataset.node=layer.id;
      if(blend[layer.blend])node.style.mixBlendMode=blend[layer.blend];
      const image=document.createElementNS(svgNS,'image');image.dataset.src=`assets/safepaw-family/${layer.file}`;
      for(const [key,value] of Object.entries({x:layer.x,y:layer.y,width:layer.w,height:layer.h}))image.setAttribute(key,String(value));
      image.setAttribute('preserveAspectRatio','xMidYMid meet');
      if(generic.test(layer.name))image.setAttribute('aria-hidden','true');else{image.setAttribute('role','img');image.setAttribute('aria-label',layer.name);}
      node.append(image);
      if(zoom||interactive){
        const label=cardNames[layer.id]||(generic.test(layer.name)?'使用情景故事板图卡':layer.name);
        node.setAttribute('role','button');node.tabIndex=0;
        node.setAttribute('aria-label',`${zoom?'放大查看':'高亮'}：${label}`);
        if(zoom){
          node.classList.add('ui-zoom-trigger');node.setAttribute('aria-haspopup','dialog');
          node.addEventListener('click',()=>window.ProjectUIZoom.open(zoom,node));
        }else{
          node.setAttribute('aria-pressed','false');
          node.addEventListener('click',()=>{const wasActive=node.getAttribute('aria-pressed')==='true';resetCards();node.setAttribute('aria-pressed',String(!wasActive));});cards.push(node);
        }
        node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();node.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
      }
      board.append(node);
    }
    stage.append(board);section.append(stage);main.append(section);views.push({section,stage,board});
    if(index===0||!observer)loadBoard(section);else observer.observe(section);
    let drag=null,suppressClick=false;
    section.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.pointerType!=='mouse'||section.scrollWidth<=section.clientWidth)return;
      drag={x:e.clientX,left:section.scrollLeft,id:e.pointerId,moved:false};suppressClick=false;
    });
    section.addEventListener('pointermove',e=>{
      if(!drag)return;const dx=e.clientX-drag.x;
      if(Math.abs(dx)>5){drag.moved=true;section.setPointerCapture(e.pointerId);section.classList.add('dragging');section.scrollLeft=drag.left-dx;}
    });
    const release=()=>{if(drag){suppressClick=drag.moved;if(section.hasPointerCapture(drag.id))section.releasePointerCapture(drag.id);}drag=null;section.classList.remove('dragging');};
    section.addEventListener('pointerup',release);section.addEventListener('pointercancel',release);section.addEventListener('lostpointercapture',release);
    section.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
    section.addEventListener('keydown',e=>{if(e.target!==section)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();section.scrollBy({left:e.key==='ArrowRight'?260:-260,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}});
  }
  function resize(){
    const mobile=innerWidth<=900;
    const reading=mobile?!fitOnMobile:enlarged;
    for(const {section,stage,board} of views){
      const width=Math.max(section.clientWidth,reading?(mobile?1800:2400):0),scale=width/3488;
      stage.style.width=`${width}px`;stage.style.height=`${1744*scale}px`;
      section.classList.toggle('can-scroll',width>section.clientWidth);
    }
    document.body.classList.toggle('reading-mode',reading);readingButton.setAttribute('aria-pressed',String(reading));readingButton.textContent=reading?'适应宽度':'放大阅读';
  }
  readingButton.addEventListener('click',()=>{if(innerWidth<=900)fitOnMobile=!fitOnMobile;else enlarged=!enlarged;resize();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')resetCards();});
  new ResizeObserver(resize).observe(main);resize();
  window.SAFEPAW_READER={views,resize};
})();
