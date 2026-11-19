(() => {
  const data = window.GAZETTE_RESEARCH;
  if (!data) return;
  const workspace = document.getElementById('research-workspace');
  const detail = document.getElementById('research-detail');
  const content = document.getElementById('research-detail-content');
  const scroller = document.getElementById('research-detail-scroll');
  const title = document.getElementById('research-detail-title');
  const status = document.getElementById('research-status');
  const mobile = matchMedia('(max-width: 760px)');
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  const labels = ['小镇与AI','地图与邮票','居民访谈','留学生访谈','旅程与设计','制作与未来'];
  const rails = [document.getElementById('research-left'),document.getElementById('research-right')];
  const tabs = [], previews = [];
  const shell=document.querySelector('.book-shell');
  function syncDesk(){
    workspace.dataset.bookOpen=String(shell.dataset.cover==='false'&&shell.dataset.backCover==='false');
    workspace.style.setProperty('--book-half',shell.offsetWidth/2+'px');
  }
  syncDesk();document.addEventListener('gazette-page-change',syncDesk);new ResizeObserver(syncDesk).observe(shell);

  const paper=elPaper();
  function elPaper(){const n=document.createElement('div');n.className='research-paper';while(detail.firstChild)n.append(detail.firstChild);detail.append(n);detail.setAttribute('role','dialog');detail.setAttribute('aria-modal','true');detail.setAttribute('aria-labelledby','research-detail-title');return n;}
  const icons=[
    '<path d="M11 32h28M15 32V19l12-9 11 9v13M22 32v-9h9v9"/><path d="m33 8 2-4m3 9 5-1"/>',
    '<path d="m8 14 11-5 12 5 12-5v28l-12 5-12-5-11 5zM19 9v28m12-23v28"/><circle cx="31" cy="23" r="4"/>',
    '<path d="M8 11h30v23H23l-9 8v-8H8z"/><path d="M15 19h16m-16 7h10"/>',
    '<path d="m5 17 21-9 21 9-21 9zM13 21v13q13 10 26 0V21M44 19v17"/>',
    '<path d="M9 37q2-15 12-10t13-8q0-6 7-9" stroke-dasharray="3 4"/><circle cx="9" cy="37" r="3"/><path d="m35 10 6-6 6 6-6 10z"/>',
    '<path d="M9 8h32v35H9zM16 15h18m-18 7h18m-18 7h10"/><path d="m30 35 5 5 10-13"/>'
  ];
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
    const r=tabs[index].getBoundingClientRect(),w=workspace.getBoundingClientRect();
    const width=Math.min(285,w.width-32);
    preview.style.setProperty('--preview-x',Math.max(12,Math.min(w.width-width-12,side===0?r.right-w.left+8:r.left-w.left-width-8))+'px');
    preview.style.setProperty('--preview-y',Math.max(12,Math.min(w.height-440,r.top-w.top-65))+'px');
    const open=el('button','research-open');open.type='button';open.setAttribute('aria-label','详细查看'+labels[index]);
    open.append(artwork(data.cards[index]),el('span','preview-caption','查看完整研究 ↗'));open.addEventListener('click',()=>openDetail(index,open));
    preview.append(open);
  }
  function hidePreview(){clearTimeout(timer);active=null;pinned=false;delete workspace.dataset.side;tabs.forEach(t=>t.setAttribute('aria-expanded','false'));previews.forEach(p=>p.hidden=true);}
  rails.forEach((rail,side)=>{
    for(let i=side*3;i<side*3+3;i++){
      const tab=el('button','research-tab');tab.type='button';tab.dataset.number=String(i+1).padStart(2,'0');tab.style.setProperty('--note-index',i%3);tab.id='research-tab-'+(i+1);tab.setAttribute('aria-controls','research-preview-'+side);tab.setAttribute('aria-expanded','false');tab.append(el('span','tab-label',labels[i]));
      const badge=el('span','research-badge');badge.setAttribute('aria-hidden','true');badge.innerHTML='<svg viewBox="0 0 52 52" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'+icons[i]+'</svg>';tab.prepend(badge);
      tab.addEventListener('pointerenter',()=>{if(hover.matches)showPreview(i);});
      tab.addEventListener('focus',()=>{if(tab.matches(':focus-visible'))showPreview(i);});
      tab.addEventListener('click',()=>{
        showPreview(i,true);
      });
      rail.append(tab);tabs.push(tab);
    }
    const preview=el('div','research-preview');preview.id='research-preview-'+side;preview.hidden=true;workspace.append(preview);previews.push(preview);
    preview.addEventListener('pointerenter',()=>clearTimeout(timer));
    preview.addEventListener('pointerleave',()=>{if(!pinned)timer=setTimeout(hidePreview,350);});
    preview.addEventListener('focusin',()=>clearTimeout(timer));
    rail.addEventListener('pointerenter',()=>clearTimeout(timer));
    rail.addEventListener('pointerleave',()=>{if(!pinned&&!mobile.matches)timer=setTimeout(hidePreview,350);});
    rail.addEventListener('focusout',()=>{if(!pinned)timer=setTimeout(()=>{if(!rail.contains(document.activeElement)&&!previews.some(p=>p.contains(document.activeElement)))hidePreview();},280);});
  });

  function syncZoom(){
    content.style.setProperty('--research-zoom',zoom);scroller.classList.toggle('is-zoomed',zoom>1);
    document.getElementById('research-zoom-reset').textContent=zoom===1?'适应宽度':Math.round(zoom*100)+'%';
    document.getElementById('research-zoom-out').disabled=zoom===1;
    document.getElementById('research-zoom-in').disabled=zoom>=3;
  }
  function openDetail(index,trigger){
    const origin=(trigger||tabs[index]).getBoundingClientRect();
    returnFocus=tabs[index];detailId=index;hidePreview();workspace.dataset.detail=String(index+1);detail.hidden=false;
    title.textContent=String(index+1).padStart(2,'0')+' / '+labels[index];content.replaceChildren(artwork(data.details[index]));
    document.getElementById('research-transcript').textContent=data.details[index].layers.filter(l=>l.text).map(l=>l.text).join('\n');
    content.firstChild.setAttribute('aria-describedby','research-transcript');
    scroller.scrollTop=0;scroller.scrollLeft=0;zoom=1;syncZoom();
    document.getElementById('research-close-detail').focus({preventScroll:true});
    document.getElementById('reader').inert=true;document.querySelector('.reader-toolbar').inert=true;rails.forEach(r=>r.inert=true);
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const from=origin,to=paper.getBoundingClientRect();
      paper.animate([{transform:`translate(${from.x+from.width/2-to.x-to.width/2}px,${from.y+from.height/2-to.y-to.height/2}px) scale(.36) rotate(-7deg)`,opacity:.35},{transform:'translate(0,-8px) scale(1.015) rotate(.4deg)',opacity:1},{transform:'none',opacity:1}],{duration:480,easing:'cubic-bezier(.2,.7,.2,1)'});
    }
    announce('已打开'+labels[index]+'，画册页码已保留。');
  }
  function closeDetail(){
    if(detailId===null)return;
    detail.hidden=true;delete workspace.dataset.detail;detailId=null;document.getElementById('reader').inert=false;document.querySelector('.reader-toolbar').inert=false;rails.forEach(r=>r.inert=false);
    returnFocus?.focus({preventScroll:true});announce('已返回画册，继续原来的页码。');

  }
  detail.addEventListener('click',event=>{if(event.target===detail)closeDetail();});
  document.addEventListener('pointerdown',event=>{if(detailId===null&&active!==null&&!event.target.closest('.research-preview,.research-tab'))hidePreview();});
  detail.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const controls=[...detail.querySelectorAll('button:not(:disabled),[tabindex="0"]')];const first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
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
