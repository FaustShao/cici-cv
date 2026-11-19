(() => {
  const data = window.GAZETTE_RESEARCH;
  if (!data) return;
  const workspace = document.getElementById('research-workspace');
  const detail = document.getElementById('research-detail');
  const content = document.getElementById('research-detail-content');
  const scroller = document.getElementById('research-detail-scroll');
  const title = document.getElementById('research-detail-title');
  const status = document.getElementById('research-status');
  const mobile = matchMedia('(max-width: 1000px)');
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  const labels = ['小镇与AI','地图与邮票','居民访谈','留学生访谈','旅程与设计','制作与未来'];
  const rails = [document.getElementById('research-left'),document.getElementById('research-right')];
  const tabs = [], previews = [];
  let active = null, pinned = false, timer, detailId = null, zoom = 1, returnFocus;
  const el = (tag, cls, text) => { const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n; };
  function artwork(board) {
    const art=el('div','research-artboard'+(board.kind==='detail'?' is-detail':''));
    art.style.setProperty('--art-w',board.width);art.style.setProperty('--art-h',board.height);
    art.setAttribute('role','img');art.setAttribute('aria-label',labels[board.id-1]+'，'+(board.kind==='detail'?'完整研究材料':'预览'));
    board.layers.forEach(layer=>{
      const img=new Image();img.src=layer.src;img.alt='';img.draggable=false;img.decoding='async';
      img.style.cssText=`left:${layer.x/board.width*100}%;top:${layer.y/board.height*100}%;width:${layer.w/board.width*100}%;height:${layer.h/board.height*100}%`;
      img.dataset.layer=layer.id;art.append(img);
    });
    return art;
  }
  function announce(message){status.textContent=message;}
  function showPreview(index, lock=false) {
    if(detailId!==null)return;
    clearTimeout(timer);if(active===index){pinned=lock;return;}active=index;pinned=lock;
    const side=index<3?0:1;
    workspace.dataset.side=side===0?'left':'right';
    tabs.forEach((tab,i)=>tab.setAttribute('aria-expanded',String(i===index)));
    previews.forEach((preview,i)=>{preview.hidden=i!==side;});
    const preview=previews[side];preview.replaceChildren();
    const open=el('button','research-open');open.type='button';open.setAttribute('aria-label','详细查看'+labels[index]);
    open.append(artwork(data.cards[index]));open.addEventListener('click',()=>openDetail(index,open));
    preview.append(open);
  }
  function hidePreview(){clearTimeout(timer);active=null;pinned=false;delete workspace.dataset.side;tabs.forEach(t=>t.setAttribute('aria-expanded','false'));previews.forEach(p=>p.hidden=true);}
  rails.forEach((rail,side)=>{
    for(let i=side*3;i<side*3+3;i++){
      const tab=el('button','research-tab');tab.type='button';tab.dataset.number=String(i+1).padStart(2,'0');tab.style.setProperty('--note-index',i%3);tab.id='research-tab-'+(i+1);tab.setAttribute('aria-controls','research-preview-'+side);tab.setAttribute('aria-expanded','false');tab.append(el('span','tab-label',labels[i]));
      tab.addEventListener('pointerenter',()=>{if(hover.matches&&!mobile.matches)showPreview(i);});
      tab.addEventListener('focus',()=>{if(tab.matches(':focus-visible')&&!mobile.matches)showPreview(i);});
      tab.addEventListener('click',()=>{
        if(!mobile.matches&&hover.matches){openDetail(i,tab);return;}
        if(active===i)openDetail(i,tab);else showPreview(i,true);
      });
      rail.append(tab);tabs.push(tab);
    }
    const preview=el('div','research-preview');preview.id='research-preview-'+side;preview.hidden=true;rail.append(preview);previews.push(preview);
    rail.addEventListener('pointerenter',()=>clearTimeout(timer));
    rail.addEventListener('pointerleave',()=>{if(!pinned&&!mobile.matches)timer=setTimeout(hidePreview,280);});
    rail.addEventListener('focusout',()=>{if(!pinned)timer=setTimeout(()=>{if(!rail.contains(document.activeElement))hidePreview();},280);});
  });

  function syncZoom(){
    content.style.setProperty('--research-zoom',zoom);scroller.classList.toggle('is-zoomed',zoom>1);
    document.getElementById('research-zoom-reset').textContent=zoom===1?'适应宽度':Math.round(zoom*100)+'%';
    document.getElementById('research-zoom-out').disabled=zoom===1;
    document.getElementById('research-zoom-in').disabled=zoom>=3;
  }
  function openDetail(index,trigger){
    returnFocus=tabs[index];detailId=index;hidePreview();workspace.dataset.detail=String(index+1);detail.hidden=false;
    title.textContent=String(index+1).padStart(2,'0')+' / '+labels[index];content.replaceChildren(artwork(data.details[index]));
    document.getElementById('research-transcript').textContent=data.details[index].layers.filter(l=>l.text).map(l=>l.text).join('\n');
    content.firstChild.setAttribute('aria-describedby','research-transcript');
    scroller.scrollTop=0;scroller.scrollLeft=0;zoom=1;syncZoom();
    document.getElementById('research-close-detail').focus({preventScroll:true});
    if(mobile.matches)detail.scrollIntoView({block:'start',behavior:'auto'});
    announce('已打开'+labels[index]+'，画册页码已保留。');
  }
  function closeDetail(){
    if(detailId===null)return;
    detail.hidden=true;delete workspace.dataset.detail;detailId=null;
    returnFocus?.focus({preventScroll:true});announce('已返回画册，继续原来的页码。');
    if(mobile.matches)document.getElementById('reader').scrollIntoView({block:'start',behavior:'auto'});
  }
  document.getElementById('research-close-detail').addEventListener('click',closeDetail);
  document.getElementById('research-zoom-in').addEventListener('click',()=>{zoom=Math.min(3,Math.round((zoom+.25)*100)/100);syncZoom();});
  document.getElementById('research-zoom-out').addEventListener('click',()=>{zoom=Math.max(1,Math.round((zoom-.25)*100)/100);syncZoom();});
  document.getElementById('research-zoom-reset').addEventListener('click',()=>{zoom=1;syncZoom();scroller.scrollLeft=0;});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&(detailId!==null||active!==null)){event.preventDefault();event.stopImmediatePropagation();if(detailId!==null)closeDetail();else{const previous=active;hidePreview();tabs[previous].focus();}}
  },true);
  let drag;
  scroller.addEventListener('pointerdown',event=>{
    if(zoom===1||event.button!==0||event.pointerType==='touch')return;
    drag={x:event.clientX,y:event.clientY,left:scroller.scrollLeft,top:scroller.scrollTop};scroller.setPointerCapture(event.pointerId);scroller.classList.add('is-dragging');
  });
  scroller.addEventListener('pointermove',event=>{if(drag){scroller.scrollLeft=drag.left+drag.x-event.clientX;scroller.scrollTop=drag.top+drag.y-event.clientY;}});
  function release(){drag=null;scroller.classList.remove('is-dragging');}
  scroller.addEventListener('pointerup',release);scroller.addEventListener('pointercancel',release);scroller.addEventListener('lostpointercapture',release);
  mobile.addEventListener('change',()=>{if(detailId===null)hidePreview();});
})();
