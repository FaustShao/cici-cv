import { versionedURL } from "./world-base.js";
import './icod.css';
import '../../../project-info.css';
import '../../../project-info.js';
const $ = id => document.getElementById(id);
const root = new URL('../assets/icod/', location.href);
const manifest = await fetch(versionedURL('manifest.json', root)).then(response => {
  if (!response.ok) throw new Error('ICoD archive could not be loaded');
  return response.json();
});
const sections = manifest.sections;
const state = { section: 'final', index: 0, view: 'space', zoom: false };
const asset = path => versionedURL(path, root);
const current = () => sections.find(section => section.id === state.section);
const pages = () => current()?.pages || [];
const image = (src, label, lazy = false) => {
  const img = new Image(); img.src = asset(src); img.alt = label; img.draggable = false;
  img.decoding = 'async'; img.loading = lazy ? 'lazy' : 'eager'; return img;
};
let wheelDistance = 0, wheelTime = 0, lastWheel = 0, gesture = null, suppressedClick = false;
const indexes = new Map();
for (const section of [...sections, { id: 'certificate', title: '参与证书', pages: [] }]) {
  const button = document.createElement('button'); button.type = 'button'; button.dataset.section = section.id;
  button.textContent = section.title;
  if (section.pages.length) { const count = document.createElement('small'); count.textContent = section.pages.length; button.append(count); }
  button.onclick = () => selectSection(section.id); $('sections').append(button);
}
function announce() { if(state.section==='certificate') { $('announcements').textContent='参与证书，2024 TASA–ICoD 暑期国际设计教育工作坊'; return; } $('announcements').textContent = `${current()?.title || '参与证书'}，${state.index + 1} / ${pages().length}，${pages()[state.index]?.label || ''}`; }
function selectSection(id) {
  if (state.section === id && $('cards').children.length) return;
  indexes.set(state.section, state.index); state.section = id; state.index = indexes.get(id) || 0;
  const certificate = id === 'certificate';
  $('space-view').hidden = certificate || state.view !== 'space';
  $('certificate-view').hidden = !certificate;
  $('section-description').textContent = current()?.subtitle || '参与记录 · TASA–ICoD 暑期国际设计教育工作坊';
  document.querySelectorAll('[data-section]').forEach(b => b.setAttribute('aria-current', String(b.dataset.section === id)));

  if (!certificate) buildCards();
  announce();
}
function selectView() {
  state.view = 'space';
  $('space-view').hidden = state.section === 'certificate';
}
function selectIndex(index) {
  const next = Math.max(0, Math.min(pages().length - 1, index)); if (next === state.index) return;
  state.index = next; indexes.set(state.section, next); updateCards(); announce();
  $('timeline').querySelector('[aria-current=true]')?.scrollIntoView({block:'nearest',inline:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function buildCards() {
  $('stage').classList.add('arranging');
  $('cards').replaceChildren(); $('timeline').replaceChildren();
  pages().forEach((page, index) => {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'archive-card'; card.dataset.index = index;
    card.setAttribute('aria-label', `${page.number} · ${page.label}，点击放大`);
    // Decode only the nearby cards. The rest stay unloaded until approached.
    card.dataset.source = page.preview;
    card.onclick = () => { if (suppressedClick) return; index === state.index ? openViewer() : selectIndex(index); };
    $('cards').append(card);
    const tick = document.createElement('button'); tick.type = 'button'; tick.textContent = String(page.number).padStart(2,'0'); tick.title = page.label;
    tick.setAttribute('aria-label', `${page.number} · ${page.label}`); tick.onclick = () => selectIndex(index); tick.dataset.index = index; $('timeline').append(tick);
  });
  updateCards();
  requestAnimationFrame(() => requestAnimationFrame(() => $('stage').classList.remove('arranging')));
}
function updateCards(dragOffset = 0) {
  const stage = $('stage'), width = stage.clientWidth;
  const cardWidth = Math.min(width * (width <= 600 ? .9 : width <= 900 ? .84 : .72), Math.max(1,stage.clientHeight-24)*16/9, 1240);
  stage.style.setProperty('--card-w',cardWidth+'px');
  $('space-view').style.setProperty('--caption-width',cardWidth+'px');
  const distance = cardWidth * .88;
  [...$('cards').children].forEach((card, index) => {
    const delta = index - state.index, visible = Math.abs(delta) <= 3, x = delta * distance + dragOffset;
    card.style.visibility = visible ? 'visible' : 'hidden'; card.style.zIndex = 10 - Math.abs(delta);
    card.style.opacity = visible ? String(delta === 0 ? 1 : Math.max(.35, 1 - Math.abs(delta) * .19)) : '0';
    const factor = Math.max(-1, Math.min(1, x / distance));
    card.style.transform = `translate(-50%,-50%) translate3d(${x}px,0,${-Math.abs(factor)*170-Math.max(0,Math.abs(delta)-1)*60}px) rotateY(${-factor*23}deg)`;
    card.dataset.active = String(delta === 0); card.tabIndex = delta === 0 ? 0 : -1;
    if (visible && !card.firstChild) card.append(image(card.dataset.source, pages()[index].label));
  });
  const page = pages()[state.index]; if (!page) return;
  $('current-number').textContent = `${String(page.number).padStart(2,'0')} / ${String(pages().length).padStart(2,'0')}`;
  $('current-label').textContent = page.label;
  $('previous').disabled = state.index === 0; $('next').disabled = state.index === pages().length-1;
  [...$('timeline').children].forEach((tick,index) => tick.setAttribute('aria-current',String(index === state.index)));
}
function buildOverview() {
  const container = $('overview-pages');
  if (container.children.length) return;
  for (const section of sections) {
    const heading = document.createElement('h3');
    heading.textContent = section.title;
    container.append(heading);
    const grid = document.createElement('div');
    grid.className = 'overview-grid';
    section.pages.forEach((page, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.append(image(page.thumb || page.preview, page.label, true));
      const caption = document.createElement('span');
      caption.textContent = String(page.number).padStart(2, '0') + '  ' + page.label;
      button.append(caption);
      button.onclick = () => {
        $('overview').close();
        selectSection(section.id);
        selectIndex(index);
        openViewer();
      };
      grid.append(button);
    });
    container.append(grid);
  }
}
$('open-overview').onclick = () => { buildOverview(); $('overview').showModal(); };
$('close-overview').onclick = () => $('overview').close();
// Pointer capture starts only once a deliberate horizontal drag has crossed the tap threshold.
$('stage').addEventListener('pointerdown',event => {
  if (event.button !== 0) return;
  suppressedClick = false; gesture = { id:event.pointerId, x:event.clientX, y:event.clientY, dx:0, moved:false };
});
$('stage').addEventListener('pointermove',event => {
  if (!gesture || gesture.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
  if (!gesture.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
    gesture.moved = true; $('stage').setPointerCapture(event.pointerId); $('stage').classList.add('dragging');
  }
  if (gesture.moved) { gesture.dx = dx; updateCards(dx*.8); }
});
function finishGesture(event) {
  if (!gesture || gesture.id !== event.pointerId) return;
  const {dx,moved} = gesture; gesture = null; $('stage').classList.remove('dragging');
  if (moved) {
    suppressedClick = true;
    const threshold = Math.min(75, innerWidth*.12);
    if (Math.abs(dx) > threshold && event.type !== 'pointercancel') selectIndex(state.index+(dx<0?1:-1));
    updateCards(); setTimeout(()=>suppressedClick=false,100);
  }
  if ($('stage').hasPointerCapture(event.pointerId)) $('stage').releasePointerCapture(event.pointerId);
}
$('stage').addEventListener('pointerup',finishGesture); $('stage').addEventListener('pointercancel',finishGesture);
$('stage').addEventListener('wheel',event => {
  if (event.ctrlKey || Math.abs(event.deltaX)+Math.abs(event.deltaY)<2) return;
  event.preventDefault();
  const time = performance.now(); if (time-lastWheel>160) wheelDistance=0;
  lastWheel=time; wheelDistance += Math.abs(event.deltaX)>Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (Math.abs(wheelDistance)>55 && time-wheelTime>480) { selectIndex(state.index+(wheelDistance>0?1:-1));wheelTime=time;wheelDistance=0; }
},{passive:false});
$('previous').onclick = () => selectIndex(state.index-1); $('next').onclick = () => selectIndex(state.index+1);

function viewerSource() { return state.section === 'certificate' ? manifest.certificate : pages()[state.index]; }
function updateViewer() {
  const page = viewerSource(); if (!page) return;
  $('full-image').src = asset(page.image); $('full-image').alt = page.label;
  $('viewer-section').textContent = current()?.title || '参与证书'; $('viewer-label').textContent = page.label;
  const certificate = state.section === 'certificate';
  $('viewer-position').textContent = certificate ? 'TASA–ICoD / 2024' : `${page.number} / ${pages().length}`;
  $('viewer-prev').hidden = $('viewer-next').hidden = certificate;
  $('viewer-prev').disabled = state.index === 0; $('viewer-next').disabled = state.index === pages().length-1;
  state.zoom = false; $('image-viewer').dataset.zoom = 'false'; $('zoom-toggle').textContent = '放大细节'; $('image-scroll').scrollTo(0,0);
}
function openViewer() { if (!viewerSource()) return; updateViewer(); $('image-viewer').showModal(); }
function closeViewer() { $('image-viewer').close(); $('full-image').removeAttribute('src'); }
function zoom() { state.zoom = !state.zoom; $('image-viewer').dataset.zoom = String(state.zoom); $('zoom-toggle').textContent = state.zoom ? '适应窗口' : '放大细节'; }
function turnViewer(step) { selectIndex(state.index+step); updateViewer(); }
$('viewer-prev').onclick = () => turnViewer(-1); $('viewer-next').onclick = () => turnViewer(1);
$('close-viewer').onclick = closeViewer; $('zoom-toggle').onclick = zoom; $('full-image').onclick = zoom;
$('image-scroll').onclick = event => { if (event.target === $('image-scroll')) closeViewer(); };
$('image-viewer').addEventListener('click', event => { if(event.target === $('image-viewer')) closeViewer(); });
document.addEventListener('keydown',event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,textarea,select') || $('overview').open || $('project-info').open) return;
  if (state.section === 'certificate') return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); const step = event.key === 'ArrowRight' ? 1 : -1;
    $('image-viewer').open ? turnViewer(step) : selectIndex(state.index+step);
  }
});
window.addEventListener('resize',() => { if(state.section!=='certificate') updateCards(); });
new ResizeObserver(()=>{if(state.section!=='certificate'&&state.view==='space')updateCards();}).observe($('stage'));

if (manifest.certificate) {
  $('archive-count').textContent='37 张 / 2 份档案 + 参与证书';
  const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-label','放大参与证书');
  button.append(image(manifest.certificate.preview || manifest.certificate.image,manifest.certificate.label));button.onclick = openViewer;$('certificate-art').append(button);
} else {
  // Preserve the supplied certificate facts without fabricating a replacement certificate or signature.
  const note=document.createElement('p'); note.textContent='王钰欣 · 青岛大学\n2024 TASA–ICoD 暑期国际设计教育工作坊参与记录';
  note.style.whiteSpace='pre-line'; $('certificate-art').append(note);
}
// The parent disposes this iframe on exit. Also reset a standalone browser-history restore.
window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  if ($('image-viewer').open) closeViewer();
  indexes.clear(); state.section=''; state.index=0;
  selectSection('final'); selectView('space');
});
state.section='';selectSection('final');
window.ICOD_ARCHIVE={state,manifest,selectSection,selectIndex,selectView,openViewer,closeViewer};
