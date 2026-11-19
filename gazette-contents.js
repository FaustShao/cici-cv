// Physical PDF pages, including the cover; chapter starts match the original publication.
(() => {
 const book=window.GAZETTE_BOOK,reader=document.getElementById('reader'),workspace=document.getElementById('research-workspace');
 if(!book)return;
 const chapters=[
  {page:4,end:8,en:'Entering Forres',zh:'走进 Forres'},
  {page:9,end:14,en:'Stones, Streets and Public Memory',zh:'石刻、街道与公共记忆'},
  {page:15,end:19,en:'Public Landscapes and Environmental Memory',zh:'公共景观与环境记忆'},
  {page:20,end:29,en:'Living Forres',zh:'Forres 的日常生活'}
 ];
 const titles=[
  ['Cover','封面'],['What Makes a Place?','前言：地方由什么构成？'],['Contents','目录'],
  ['Entering Forres','走进 Forres'],['Forres Footpath Map','Forres 步行地图'],['Forres Town Identity','小镇身份'],['Cluny Hill & Findhorn Maps','Cluny Hill 与 Findhorn 地图'],['The Landscape Memory','景观记忆'],
  ['Stones, Streets and Public Memory','石刻、街道与公共记忆'],['High Street','高街：日常生活的中心'],['Sueno’s Stone','苏埃诺石'],['Tolbooth','建筑中的社会记忆'],['Nelson’s Tower','纳尔逊塔'],['Grant Park','每个人共享的公园'],
  ['Public Landscapes and Environmental Memory','公共景观与环境记忆'],['Gardens','花园与照料'],['Woodlands','林地与日常生活'],['Woodlands Map','林地地图'],['Water and the Town','水与小镇'],
  ['Living Forres','Forres 的日常生活'],['Forres Highland Games','高地运动会'],['Town Hall','市政厅与公共生活'],['Falconer Museum','法尔科纳博物馆'],['Whisky','土地、劳动与时间'],['Under the Leaves','书店中的地方故事'],['Findhorn Bay Arts','共同创作地方故事'],['FACT','日常生活背后的社区网络'],['Be Like Pablo','青年声音与未来遗产'],['GSA Highlands Campus','历史景观中的未来学习空间'],['Conclusion','结语：持续增补的地方记忆'],['Back Cover','封底']
 ];
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
 const dock=el('nav','gazette-contents');dock.setAttribute('aria-label','木质画册目录与页码检索');
 const handle=el('button','contents-handle');handle.type='button';handle.id='contents-toggle';handle.setAttribute('aria-expanded','false');handle.setAttribute('aria-controls','contents-panel');handle.append(el('span','','目录'),el('span','contents-handle-en','CONTENTS'));
 const panel=el('div','contents-panel');panel.id='contents-panel';panel.inert=true;panel.setAttribute('aria-hidden','true');
 const headings=el('div','contents-chapters'),track=el('div','contents-ticks');
 const tip=el('output','contents-tooltip');tip.hidden=true;tip.id='contents-tooltip';
 const range=document.createElement('input');range.type='range';range.min='1';range.max='31';range.step='1';range.value=String(book.getPage());range.className='contents-range';range.setAttribute('aria-label','拖动木楔定位画册页码');
 const marker=el('div','contents-marker');marker.setAttribute('aria-hidden','true');
 let current=book.getPage(),open=false,pinned=false,dragging=false,timer;
 const coarse=matchMedia('(hover: none), (pointer: coarse)');
 for(const c of chapters){
  const b=el('button','contents-chapter');b.type='button';b.dataset.page=c.page;
  b.style.left=((c.page-1)/30*100)+'%';b.style.width=((c.end-c.page+1)/30*100)+'%';
  b.append(el('span','chapter-en',c.en),el('span','chapter-zh',c.zh));b.setAttribute('aria-label',c.en+'，'+c.zh+'，第'+c.page+'页');
  b.addEventListener('click',()=>go(c.page));headings.append(b);
 }
 for(let page=1;page<=31;page++){
  const major=chapters.some(c=>c.page===page),tick=el('button','contents-tick'+(major?' is-major':''));tick.type='button';tick.dataset.page=page;tick.style.left=((page-1)/30*100)+'%';tick.style.setProperty('--cut',((page*7)%5)*2+'px');
  tick.setAttribute('aria-label','第'+page+'页 · '+titles[page-1].join(' / '));
  tick.addEventListener('pointerenter',()=>{if(!dragging&&!major)showTip(page);});tick.addEventListener('pointerleave',()=>{if(!dragging)tip.hidden=true;});
  tick.addEventListener('focus',()=>showTip(page));tick.addEventListener('blur',()=>{if(!dragging)tip.hidden=true;});tick.addEventListener('click',()=>go(page));track.append(tick);
 }
 const canvas=el('div','contents-canvas');canvas.append(headings,track,range,marker);panel.append(canvas);dock.append(handle,panel,tip);reader.append(dock);
 function showTip(page){
  const t=titles[page-1];tip.replaceChildren(el('span','tooltip-en',t[0]),el('span','tooltip-zh',t[1]+' · '+page+' / 31'));
  const x=panel.offsetLeft+(page-1)/30*canvas.clientWidth-panel.scrollLeft;tip.style.left=Math.max(dock.clientWidth*.17,Math.min(dock.clientWidth*.83,x))+'px';tip.hidden=false;
 }
 function sync(page){
  current=page;if(!dragging)range.value=String(page);marker.style.left=((page-1)/30*100)+'%';
  range.setAttribute('aria-valuetext','第'+page+'页，'+titles[page-1].join('，'));
  const visibleEnd=Math.min(31,page+(book.isSingle()?0:1));
  const active=chapters.filter(c=>c.page<=visibleEnd).at(-1);
  headings.querySelectorAll('button').forEach(b=>{if(Number(b.dataset.page)===active?.page)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current');});
  track.querySelectorAll('button').forEach(b=>b.classList.toggle('is-current',Number(b.dataset.page)===page));
 }
 function go(page){book.goToPage(page);sync(book.getPage());tip.hidden=true;}
 function fitBook(){
  if(!open)return;
  const pose=reader.querySelector('.book-pose'),h=reader.querySelector('.book-shell').offsetHeight;
  const available=reader.clientHeight-dock.offsetHeight-38;
  const scale=Math.min(1,Math.max(.25,available/h));
  reader.style.setProperty('--toc-scale',scale);
  reader.style.setProperty('--toc-shift',(12+h*scale/2-pose.offsetTop-h/2)+'px');
 }
 function setOpen(value){
  clearTimeout(timer);if(workspace.hasAttribute('data-detail'))value=false;
  open=value;dock.classList.toggle('is-open',value);reader.classList.toggle('toc-open',value);handle.setAttribute('aria-expanded',String(value));panel.inert=!value;panel.setAttribute('aria-hidden',String(!value));
  if(value)fitBook();else{tip.hidden=true;reader.style.removeProperty('--toc-scale');reader.style.removeProperty('--toc-shift');}
 }
 handle.addEventListener('click',()=>{pinned=!open;setOpen(pinned);});
 dock.addEventListener('pointerenter',()=>{clearTimeout(timer);if(!coarse.matches)setOpen(true);});
 dock.addEventListener('pointerleave',()=>{if(!pinned&&!dragging)timer=setTimeout(()=>setOpen(false),260);});
 dock.addEventListener('focusin',e=>{if(e.target.matches(':focus-visible'))setOpen(true);});
 dock.addEventListener('focusout',()=>{setTimeout(()=>{if(!dock.contains(document.activeElement)&&!dock.matches(':hover')&&!dragging){pinned=false;setOpen(false);}},0);});
 range.addEventListener('pointerdown',()=>{dragging=true;showTip(Number(range.value));});
 range.addEventListener('input',()=>{const page=Number(range.value);showTip(page);marker.style.left=((page-1)/30*100)+'%';});
 range.addEventListener('change',()=>{dragging=false;go(Number(range.value));});
 range.addEventListener('pointerup',()=>{dragging=false;if(!dock.matches(':hover')&&!pinned)timer=setTimeout(()=>setOpen(false),260);});
 range.addEventListener('pointercancel',()=>{dragging=false;sync(current);tip.hidden=true;});
 dock.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();pinned=false;setOpen(false);handle.focus({preventScroll:true});}});
 document.addEventListener('pointerdown',e=>{if(open&&coarse.matches&&!dock.contains(e.target)){pinned=false;setOpen(false);}});
 document.addEventListener('gazette-page-change',e=>{sync(e.detail.page);requestAnimationFrame(fitBook);});
 new ResizeObserver(()=>{if(open)requestAnimationFrame(fitBook);}).observe(reader);
 new MutationObserver(()=>{dock.hidden=workspace.hasAttribute('data-detail');if(dock.hidden){pinned=false;setOpen(false);}}).observe(workspace,{attributes:true,attributeFilter:['data-detail']});
 sync(current);
})();
