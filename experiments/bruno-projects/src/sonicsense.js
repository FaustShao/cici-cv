import { versionedURL } from './world-base.js';
import '../../../project-info.css';
import './sonicsense.css';
import { SpatialFilm } from './sonicsense-ribbon.js';
const $=id=>document.getElementById(id);
const root=new URL('../assets/sonicsense/',location.href);
const asset=path=>versionedURL(path,root);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
try { if(parent!==window)document.documentElement.dataset.embedded='true'; } catch {}
let manifest;
try {
  const response=await fetch(asset('manifest.json'));
  if(!response.ok)throw new Error('Document unavailable');
  manifest=await response.json();
} catch(error) {
  $('film-error').hidden=false;
  throw error;
}
const {pages,chapters}=manifest,stage=$('film-stage'),track=$('film-track');
const state={index:0,offset:0,target:0};
let ribbon, width=0,frameWidth=0,frame=0,lastTime=0,floatTime=0,velocity=0,drag=null,suppressClickUntil=0,viewerToken=0,disposed=false;
const clamp=n=>Math.max(0,Math.min((pages.length-1)*frameWidth,n));
const chapterFor=index=>chapters.find(c=>c.id===pages[index].chapter);
const number=index=>String(index+1).padStart(2,'0');
const cards=pages.map((page,index)=>{
  const article=document.createElement('article');article.className='film-frame';
  const button=document.createElement('button');button.type='button';button.className='frame-art';button.setAttribute('aria-label',`阅读第 ${index+1} 页：${page.title}`);
  const image=new Image();image.alt=page.title;image.width=1500;image.height=Math.round(1500*page.height/page.width);image.draggable=false;image.decoding='async';
  button.append(image);button.addEventListener('click',()=>{if(performance.now()<suppressClickUntil)return;go(index);openViewer(index)});
  image.addEventListener('load',schedule);
  article.append(button);track.append(article);return {article,button,image};
});
const chapterButtons=chapters.map(chapter=>{
  const button=document.createElement('button');button.type='button';button.dataset.chapter=chapter.id;button.append(document.createTextNode(chapter.title));
  const sub=document.createElement('small');sub.textContent=chapter.en;button.append(sub);
  button.onclick=()=>go(chapter.start);$('chapters').append(button);return button;
});
function loadNear(){
  const approximate=state.offset/frameWidth;
  cards.forEach((card,index)=>{
    if(Math.abs(index-approximate)<3&&!card.image.getAttribute('src'))card.image.src=asset(pages[index].preview);
    card.button.tabIndex=index===state.index?0:-1;
  });
}
function updateCaption(){
  const page=pages[state.index],chapter=chapterFor(state.index);
  $('frame-number').textContent=`${number(state.index)} / ${pages.length}`;
  $('frame-title').textContent=page.title;$('frame-description').textContent=page.description;
  chapterButtons.forEach(b=>b.setAttribute('aria-current',String(b.dataset.chapter===chapter.id)));
  $('film-scrub').setAttribute('aria-valuetext',`${chapter.title}，第 ${state.index+1} 页，共 ${pages.length} 页`);
  $('announcements').textContent=`${chapter.title}：${page.title}，${state.index+1} / ${pages.length}`;
  document.querySelectorAll('#overview-pages button').forEach((b,index)=>b.setAttribute('aria-current',String(index===state.index)));
}
function paint(){

  const progress=state.offset/((pages.length-1)*frameWidth)||0;
  // A shared physical displacement drives both the strip and the reel, in either direction.
  $('reel-directory').style.setProperty('--reel-angle',`${state.offset/2.8}deg`);
  $('chapter-progress').style.width=`${progress*100}%`;
  $('film-scrub').value=String(1+progress*(pages.length-1));
  const next=Math.max(0,Math.min(pages.length-1,Math.round(state.offset/frameWidth)));
  if(next!==state.index){state.index=next;updateCaption();}
  loadNear();
  ribbon?.update(state.offset/frameWidth,floatTime,velocity,reduced.matches);
}
function animate(time){
  frame=0;if(disposed)return;
  const dt=lastTime?Math.min(48,time-lastTime):16;lastTime=time;
  const distance=state.target-state.offset;
  state.offset=reduced.matches||Math.abs(distance)<.3?state.target:state.offset+distance*(1-Math.exp(-dt/85));
  velocity=distance/frameWidth;floatTime+=dt/1000;
  if(!document.hidden&&!document.querySelector('dialog[open]'))paint();
  if(state.offset!==state.target||(!reduced.matches&&!document.querySelector('dialog[open]')))frame=requestAnimationFrame(animate);else lastTime=0;
}
function schedule(){if(!frame&&!disposed)frame=requestAnimationFrame(animate);}
function go(index,instant=false){
  index=Math.max(0,Math.min(pages.length-1,index));state.target=index*frameWidth;
  if(instant||reduced.matches){state.offset=state.target;state.index=Math.round(index);updateCaption();paint();}else schedule();
}
function layout(){
  const old=frameWidth?state.offset/frameWidth:0,target=frameWidth?state.target/frameWidth:0;
  const bounds=stage.getBoundingClientRect();width=bounds.width;
  ribbon?.resize();
  frameWidth=ribbon?.pixelsPerFrame||width*.8;
  state.offset=old*frameWidth;state.target=target*frameWidth;paint();
}
try{ribbon=new SpatialFilm(stage,pages,cards.map(c=>c.image));document.body.dataset.spatial='true';}
catch(error){document.body.dataset.spatial='false';$('film-error').hidden=false;$('film-error').textContent='当前设备无法显示空间胶片，可点击总览查看全部画面。';}
const resize=new ResizeObserver(layout);resize.observe(stage);
stage.addEventListener('click',event=>{
  if(!ribbon||performance.now()<suppressClickUntil||event.target.closest('.frame-art'))return;
  const index=ribbon.pick(event.clientX,event.clientY);if(index!==null)openViewer(index);
});
stage.addEventListener('pointermove',event=>{if(ribbon){const r=stage.getBoundingClientRect();ribbon.pointer.x=(event.clientX-r.left)/r.width-.5;ribbon.pointer.y=(event.clientY-r.top)/r.height-.5;}});
stage.addEventListener('pointerleave',()=>{if(ribbon)ribbon.pointer={x:0,y:0}});
function wheel(event){
  if(document.querySelector('dialog[open]')||event.ctrlKey)return;
  const delta=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)*(event.deltaMode===1?18:event.deltaMode===2?stage.clientWidth:1);
  if(!delta)return;event.preventDefault();state.target=clamp(state.target+delta*.95);schedule();
}
$('film-main').addEventListener('wheel',wheel,{passive:false});$('reel-directory').addEventListener('wheel',wheel,{passive:false});
stage.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.target.closest('input'))return;
  drag={id:event.pointerId,x:event.clientX,start:state.target,lastX:event.clientX,lastTime:performance.now(),velocity:0,moved:false};
});
stage.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.id)return;
  const now=performance.now(),delta=event.clientX-drag.x;
  if(!drag.moved&&Math.abs(delta)<7)return;
  if(!drag.moved){drag.moved=true;stage.setPointerCapture(event.pointerId);stage.classList.add('is-dragging');}
  drag.velocity=(event.clientX-drag.lastX)/Math.max(8,now-drag.lastTime);drag.lastX=event.clientX;drag.lastTime=now;
  state.target=clamp(drag.start-delta);schedule();
});
function releaseDrag(event){
  if(!drag||event.pointerId!==drag.id)return;
  const gesture=drag;drag=null;stage.classList.remove('is-dragging');
  if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
  if(gesture.moved){suppressClickUntil=performance.now()+300;const velocity=performance.now()-gesture.lastTime<90?gesture.velocity:0;state.target=clamp(state.target-velocity*140);schedule();}
}
stage.addEventListener('pointerup',releaseDrag);stage.addEventListener('pointercancel',releaseDrag);
$('film-scrub').oninput=event=>go(Number(event.target.value)-1,true);
$('reel-start').onclick=()=>go(0);
let overviewBuilt=false;
function openOverview(){
  if(!overviewBuilt){pages.forEach((page,index)=>{
    const button=document.createElement('button');button.type='button';button.dataset.index=index;
    const image=new Image();image.src=asset(page.thumb);image.alt='';image.width=440;image.height=311;image.loading='lazy';image.draggable=false;
    const n=document.createElement('small');n.textContent=number(index);button.append(image,n,document.createTextNode(page.title));
    button.onclick=()=>{$('overview').close();go(index,true);openViewer(index)};$('overview-pages').append(button);
  });overviewBuilt=true;}
  updateCaption();$('overview').showModal();
}
$('reel-end').onclick=()=>go(pages.length-1);
$('open-overview').onclick=$('open-overview-inline').onclick=openOverview;$('close-overview').onclick=()=>$('overview').close();
function setReaderOpen(open){
  try{if(parent!==window){const reader=parent.document.getElementById('reader');if(reader)reader.dataset.imageOpen=String(open)}}catch{}
}
function showPage(index){
  go(index,true);$('page-scroll').scrollTo(0,0);const page=pages[state.index],token=++viewerToken;
  $('viewer-number').textContent=chapterFor(state.index).en;$('viewer-title').textContent=page.title;$('viewer-description').textContent=page.description;
  $('viewer-position').textContent=`${number(state.index)} / ${pages.length}`;
  $('page-media').replaceChildren();
  const links=state.index===24?[['播放拼贴影片','https://youtu.be/e8wFDxjReWE']]:state.index===8?[['情境影片 1','https://www.youtube.com/watch?v=9cn4zRSCnRI'],['情境影片 2','https://www.youtube.com/watch?v=S3Mz64pxB5Y'],['情境影片 3','https://www.youtube.com/watch?v=smpbphoSOnM']]:[];
  links.forEach(([label,url])=>{const a=document.createElement('a');a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';$('page-media').append(a)});
  $('viewer-previous').disabled=state.index===0;$('viewer-next').disabled=state.index===pages.length-1;
  const target=$('full-page');target.alt=page.title;target.src=asset(page.preview);
  const high=new Image();high.src=asset(page.image);
  high.decode().then(()=>{if(token===viewerToken&&!disposed)target.src=high.src;}).catch(()=>{});
}
function openViewer(index=state.index){showPage(index);if(!$('page-viewer').open)$('page-viewer').showModal();setReaderOpen(true);}
function closeViewer(){++viewerToken;$('page-viewer').close();$('full-page').removeAttribute('src');}
$('close-page').onclick=closeViewer;
$('viewer-previous').onclick=()=>showPage(state.index-1);$('viewer-next').onclick=()=>showPage(state.index+1);
$('page-scroll').onclick=event=>{if(event.target===$('page-scroll'))closeViewer()};
for(const id of ['overview','project-info','page-viewer'])$(id).addEventListener('click',event=>{if(event.target===$(id)){const rect=$(id).getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)$(id).close();}});
$('page-viewer').addEventListener('close',()=>{++viewerToken;setReaderOpen(false);cards[state.index].button.focus({preventScroll:true})});
$('about-project-inline').onclick=$('about-project').onclick=()=>$('project-info').showModal();$('close-info').onclick=()=>$('project-info').close();
document.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input'))return;
  if($('overview').open||$('project-info').open)return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
    event.preventDefault();const index=state.index+(event.key==='ArrowRight'?1:-1);$('page-viewer').open?showPage(index):go(index);
  }else if(event.key==='Enter'&&event.target===stage&&!document.querySelector('dialog[open]')){event.preventDefault();openViewer();
  }else if(!document.querySelector('dialog[open]')&&(event.key==='Home'||event.key==='End')){event.preventDefault();go(event.key==='Home'?0:pages.length-1);}
});
$('back-other').onclick=event=>{
  try{if(parent!==window&&parent.WORLD_STATE?.place==='other'){event.preventDefault();parent.document.getElementById('close-reader').click()}}catch{}
};
function dispose(){setReaderOpen(false);disposed=true;cancelAnimationFrame(frame);frame=0;lastTime=0;resize.disconnect();ribbon?.dispose();ribbon=null;++viewerToken;}
addEventListener('pagehide',dispose);
addEventListener('pageshow',event=>{if(event.persisted){disposed=false;ribbon=new SpatialFilm(stage,pages,cards.map(c=>c.image));resize.observe(stage);for(const d of document.querySelectorAll('dialog[open]'))d.close();go(0,true);layout();schedule();}});
layout();updateCaption();cards[0].image.src=asset(pages[0].preview);
try{await Promise.all([...cards.slice(0,2).map(card=>card.image.decode()),document.fonts.ready])}catch{$('film-error').hidden=false;}
document.body.dataset.ready='true';paint();schedule();
for(const d of document.querySelectorAll('dialog'))d.addEventListener('close',schedule);
addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
window.SONIC_FILM={state,manifest,go,openViewer,closeViewer,openOverview,dispose,get ribbon(){return ribbon}};

// Notify the host once this module has installed its reading controls.
document.documentElement.dataset.readerReady = "true";
try { window.frameElement?.dispatchEvent(new Event("cecilia-project-ready")); } catch {}
