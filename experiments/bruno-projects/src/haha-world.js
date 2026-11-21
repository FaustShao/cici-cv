import * as THREE from 'three';
import { LeafThroughObject, withSoftBasicShadows } from 'leafthrough';
import { getClickSound } from './click-sound.js';
import './haha-world.css';

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const assetRoot = new URL('../assets/haha-world/', location.href);
const manifest = await (await fetch(new URL('manifest.json', assetRoot))).json();
const sources = manifest.pages.map(p => ({ src: new URL(p.src, location.href).href, alt: `${p.number} / 30 · ${p.label}`, text: p.text }));
// A blank inside back cover keeps the 30 supplied pages intact and the printed back cover outside.
sources.push({ src: new URL('pages/inside-back.webp', assetRoot).href, alt: '封底内页（留白）' });
sources.push({ src: new URL('pages/back.webp', assetRoot).href, alt: '哈哈世界 · 品牌橙色封底' });
const aspect = manifest.height / manifest.width;
const state = { page: 0, visiblePages: [0], ready: false, zoomPage: 0, mode: 'webgl' };
const clicks = getClickSound(); clicks.bind(document);
let magazine, renderer, scene, camera, frameID, lastTime = 0, paused = false;
let cameraWidth = 2, bookX = -.5, open = 0;
const loaded = new Set(), pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false };
const bookGroup = new THREE.Group(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();

$('back-other').onclick = e => {
  try {
    if (parent !== window && parent.WORLD_STATE?.place === 'other') {
      e.preventDefault(); parent.document.getElementById('close-reader').click();
    }
  } catch {}
};
function feedback(text) { $('book-feedback').textContent = text; }
function label(index) { return index === 0 ? '封面' : index < 30 ? `${index + 1} / 30` : index === 30 ? '封底内页' : '封底'; }
function updateControls() {
  $('page-status').textContent = state.visiblePages.length === 2 && state.page < 29 ? `${state.page + 1}–${state.page + 2} / 30` : label(state.page);
  $('previous').disabled = state.page === 0;
  $('next').disabled = state.page === sources.length - 1;
  $('next').textContent = state.page === 0 ? '翻开' : '下一页';
  $('close-book').hidden = state.page === 0;
  $('reading-hint').textContent = state.page === 0 ? '点击封面，翻开手册' : '点击或拖动翻页 · 双击页面放大';
  document.body.dataset.open = state.page > 0 && state.page < sources.length - 1 ? 'true' : 'false';
  document.querySelectorAll('[data-page]').forEach(el => el.setAttribute('aria-current', String(state.visiblePages.includes(Number(el.dataset.page)))));
}
function changePage(detail) { Object.assign(state, { page: detail.page, visiblePages: [...detail.visiblePages] }); updateControls(); }
function turn(forward) {
  if (magazine) forward ? magazine.next() : magazine.prev();
  else goTo(Math.max(0, Math.min(sources.length - 1, state.page + (forward ? 1 : -1))));
}
function goTo(page, animate = false) {
  if (magazine) magazine.goTo(page, { animate });
  else { changePage({ page, visiblePages: [page] }); $('plain-page').src = sources[page].src; }
}
$('previous').onclick = () => turn(false);
$('next').onclick = () => turn(true);
$('close-book').onclick = () => goTo(0, true);
$('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else openZoom(state.page);
  } catch { openZoom(state.page); }
};
document.addEventListener('fullscreenchange', () => { $('fullscreen').textContent = document.fullscreenElement ? '退出全屏' : '全屏阅读'; });

// The original artwork is decoded only near the current spread; the full-resolution sheet is used for zoom.
const thumbnails = document.createDocumentFragment();
for (const page of manifest.pages) {
  const button = document.createElement('button'); button.type = 'button'; button.dataset.page = String(page.number - 1);
  const img = new Image(); img.src = new URL(page.thumb, location.href).href; img.alt = page.label; img.loading = 'lazy'; img.width = 320; img.height = 226;
  const span = document.createElement('span'); span.textContent = `${String(page.number).padStart(2, '0')} · ${page.number === 1 ? '封面' : page.label.slice(0, 12)}`;
  button.append(img, span); button.onclick = () => { goTo(page.number - 1); toggleContents(false); }; thumbnails.append(button);
}
$('page-thumbnails').append(thumbnails);
for (const [text, page] of [['品牌介绍', 1], ['标志规范', 5], ['色彩体系', 9], ['IP 与图形', 13], ['导视应用', 17], ['品牌物料', 23]]) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.onclick = () => { goTo(page); toggleContents(false); }; $('chapter-links').append(b);
}
function toggleContents(value = $('contents').hidden) { $('contents').hidden = !value; $('contents-trigger').setAttribute('aria-expanded', String(value)); }
$('contents-trigger').onclick = () => toggleContents(); $('close-contents').onclick = () => toggleContents(false);
document.addEventListener('pointerdown', e => { if (!e.target.closest('#contents,#contents-trigger')) toggleContents(false); });

let zoomScale = 1;
function sizeZoom() {
  const image = $('page-zoom').querySelector('.zoom-pages img');
  if (!image) return;
  const width = Math.min(1800, innerWidth - (innerWidth < 760 ? 20 : 48), (innerHeight - 145) / aspect);
  image.style.width = `${width * zoomScale}px`;
  image.style.maxWidth = image.style.maxHeight = 'none';
  image.style.cursor = zoomScale === 1 ? 'zoom-in' : 'zoom-out';
  $('detail-reset').textContent = `${Math.round(zoomScale * 100)}%`;
  $('detail-minus').disabled = zoomScale <= 1; $('detail-plus').disabled = zoomScale >= 4;
}
function changeZoom(value) { zoomScale = Math.max(1, Math.min(4, value)); sizeZoom(); }
$('detail-plus').onclick = () => changeZoom(zoomScale + .5);
$('detail-minus').onclick = () => changeZoom(zoomScale - .5);
$('detail-reset').onclick = () => changeZoom(1);
async function openZoom(index = state.page) {
  zoomScale = 1;
  state.zoomPage = Math.max(0, Math.min(sources.length - 1, index));
  const img = new Image(); img.src = sources[state.zoomPage].src; img.alt = sources[state.zoomPage].alt;
  $('page-zoom').querySelector('.zoom-pages').replaceChildren(img);
  img.onclick = () => changeZoom(zoomScale === 1 ? 2 : 1); sizeZoom();
  $('zoom-status').textContent = label(state.zoomPage);
  $('zoom-previous').disabled = state.zoomPage === 0; $('zoom-next').disabled = state.zoomPage === sources.length - 1;
  if (!$('page-zoom').open) { magazine && (magazine.enabled = false); $('page-zoom').showModal(); }
  // The original bitmap fills the available viewing area without perspective or paper shading.
  try { await img.decode(); } catch { feedback('该页暂未加载成功，请重试。'); }
}
function closeZoom() { $('page-zoom').close(); magazine && (magazine.enabled = true); }
$('zoom-page').onclick = () => openZoom(); $('close-zoom').onclick = closeZoom;
$('page-zoom').addEventListener('click', e => { if (e.target === $('page-zoom') || e.target.classList.contains('zoom-pages')) closeZoom(); });
$('page-zoom').addEventListener('cancel', e => { e.preventDefault(); closeZoom(); });
$('zoom-previous').onclick = () => openZoom(state.zoomPage - 1); $('zoom-next').onclick = () => openZoom(state.zoomPage + 1);
window.addEventListener('keydown', e => {
  if ($('page-zoom').open) { if (e.key === 'ArrowRight') openZoom(Math.min(sources.length - 1, state.zoomPage + 1)); if (e.key === 'ArrowLeft') openZoom(Math.max(0, state.zoomPage - 1)); }
  else if (e.key === 'Escape') toggleContents(false);
});

// A paper-white specimen field: pointer displacement, quiet travelling lines and draggable glyph windows.
const background = $('paper-field'), bg = background.getContext('2d');
let bgW = 0, bgH = 0, backgroundFrame = 0, dragCard = null;
const cells = Array.from({ length: 76 }, (_, i) => ({ x: ((i * .61803398875) % 1), y: ((i * .38196601125 + (i % 7) / 7) % 1), seed: i * 1.89 }));
function drawBackground(t) {
  if (innerWidth !== bgW || innerHeight !== bgH) {
    bgW = innerWidth; bgH = innerHeight; const dpr = Math.min(devicePixelRatio, 1.5); background.width = bgW * dpr; background.height = bgH * dpr; bg.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  bg.clearRect(0, 0, bgW, bgH);
  const glow = bg.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, Math.max(bgW, bgH) * .65);
  glow.addColorStop(0, '#ffffffaa'); glow.addColorStop(1, '#dde2d933'); bg.fillStyle = glow; bg.fillRect(0, 0, bgW, bgH);
  bg.font = "13px 'Paper Mono',monospace"; bg.textAlign = 'center';
  for (const [i, cell] of cells.entries()) {
    let x = cell.x * bgW, y = cell.y * bgH;
    if (!reduced) { x += Math.sin(t * .00012 + cell.seed) * 9; y += Math.cos(t * .0001 + cell.seed) * 7; }
    const dx = x - pointer.x, dy = y - pointer.y, distance = Math.hypot(dx, dy), push = pointer.active && !reduced ? Math.max(0, 1 - distance / 150) : 0;
    x += dx * push * .25; y += dy * push * .25;
    const edge = Math.abs(x / bgW - .5) * 2;
    bg.fillStyle = `rgba(86,98,73,${.055 + edge * .08 + push * .06})`;
    bg.fillText(['h', 'a', '606', '╱', '│', '╭', '╮', '·'][i % 8], x, y);
  }
  bg.strokeStyle = '#7f8c7110'; bg.lineWidth = 1;
  const shift = reduced ? 0 : Math.sin(t * .00012) * 8;
  for (const x of [.08, .92]) { bg.beginPath(); bg.moveTo(bgW * x + shift, 95); bg.lineTo(bgW * x + shift, bgH - 100); bg.stroke(); }
  backgroundFrame++;
}
function movePointer(e) { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; }
window.addEventListener('pointermove', movePointer, { passive: true }); window.addEventListener('pointerout', e => { if (!e.relatedTarget) pointer.active = false; });
const cards = [...document.querySelectorAll('.specimen')];
function cardAt(x, y) { return cards.find(card => { const r = card.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }); }
function startCard(e, card) {
  dragCard = { card, startX: e.clientX, startY: e.clientY, x: Number(card.dataset.x || 0), y: Number(card.dataset.y || 0) }; card.classList.add('dragging'); card.focus({ preventScroll: true });
}
window.addEventListener('pointermove', e => {
  if (!dragCard) return;
  const d = dragCard, x = d.x + e.clientX - d.startX, y = d.y + e.clientY - d.startY;
  d.card.dataset.x = String(x); d.card.dataset.y = String(y); d.card.style.translate = `${x}px ${y}px`;
});
window.addEventListener('pointerup', () => { if (dragCard) { dragCard.card.classList.remove('dragging'); dragCard = null; if (magazine) magazine.enabled = !$('page-zoom').open; } });
cards.forEach(card => card.addEventListener('keydown', e => {
  const step = e.shiftKey ? 2 : 12; const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step], Home: [0, 0] }[e.key];
  if (!delta) return; e.preventDefault(); const x = e.key === 'Home' ? 0 : Number(card.dataset.x || 0) + delta[0], y = e.key === 'Home' ? 0 : Number(card.dataset.y || 0) + delta[1]; card.dataset.x = String(x); card.dataset.y = String(y); card.style.translate = `${x}px ${y}px`;
}));

function makeEdgeTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 256;
  const c = canvas.getContext('2d'); c.fillStyle = '#eeeee7'; c.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 5) { c.fillStyle = y % 3 ? '#d4d5cb' : '#e1e0d6'; c.fillRect(0, y, 64, 1); }
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
function getPagePoint(x, y) {
  ndc.set(x / innerWidth * 2 - 1, 1 - y / innerHeight * 2); ray.setFromCamera(ndc, camera);
  const origin = bookGroup.worldToLocal(ray.ray.origin.clone()), end = bookGroup.worldToLocal(ray.ray.origin.clone().add(ray.ray.direction));
  const direction = end.sub(origin); if (Math.abs(direction.z) < .0001) return null;
  const p = origin.addScaledVector(direction, -origin.z / direction.z);
  return p;
}
let pageBlocks = [], spine, thickness = .052, readCount = 0;
function setupBook() {
  renderer = new THREE.WebGLRenderer({ canvas: $('magazine-canvas'), alpha: true, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.BasicShadowMap;
  scene = new THREE.Scene(); camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .5, 12); camera.position.set(0, 0, 4); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight('#ffffff', '#a1aeaf', 1.5));
  const sun = new THREE.DirectionalLight('#ffffff', 2); sun.position.set(-3.5, 1.3, 4.1); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 1.8, bottom: -1.8, near: .5, far: 10 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -.001; sun.shadow.normalBias = .002;
  scene.add(sun, sun.target); scene.add(bookGroup);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: .17 })); floor.position.z = -.045; floor.receiveShadow = true;
  floor.material.onBeforeCompile = program => { program.fragmentShader = withSoftBasicShadows(program.fragmentShader); }; scene.add(floor);
  magazine = new LeafThroughObject({ renderer, camera }, {
    pages: sources, pageAspect: aspect, layout: 'spread', startPage: 0, preload: 3,
    paper: { grain: true, grainScale: 1.46, grainStrength: .17, showThrough: .025, inkGloss: .33, roughness: .5, metalness: .17, backColor: '#fcfcf9', sheetGap: thickness / 16, depthBias: false, wrinkles: .65, bulge: .65 },
    lighting: { shadows: true, sun: { position: [-3.5, 1.3, 4.1] } },
    motion: { speed: 1.1, hoverLift: .025, curl: 1, jitter: true, reducedMotion: 'auto' },
    interaction: { drag: true, click: false, hold: false, hover: true, keyboard: 'global' }
  });
  bookGroup.add(magazine);
  const edgeTexture = makeEdgeTexture();
  const edge = new THREE.MeshStandardMaterial({ map: edgeTexture, roughness: .9, color: '#fcfcf8' });
  const top = new THREE.MeshStandardMaterial({ color: '#f6f5ed', roughness: .9 });
  for (const side of [-1, 1]) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(.998, aspect - .004, 1), [edge, edge, edge, edge, top, top]);
    block.position.x = side * .5; block.receiveShadow = block.castShadow = true; block.userData.side = side; bookGroup.add(block); pageBlocks.push(block);
  }
  const spineCanvas = document.createElement('canvas'); spineCanvas.width = 128; spineCanvas.height = 1024; const ctx = spineCanvas.getContext('2d');
  ctx.fillStyle = '#ff8d06'; ctx.fillRect(0, 0, 128, 1024); ctx.save(); ctx.translate(64, 512); ctx.rotate(-Math.PI / 2); ctx.fillStyle = 'white'; ctx.font = '38px "Paper Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText('HAHA WORLD  /  VISUAL IDENTITY', 0, 12); ctx.restore();
  const spineTexture = new THREE.CanvasTexture(spineCanvas); spineTexture.colorSpace = THREE.SRGBColorSpace;
  const orange = new THREE.MeshStandardMaterial({ color: '#ff8d06', roughness: .62 });
  const printedSpine = new THREE.MeshStandardMaterial({ map: spineTexture, roughness: .6 });
  spine = new THREE.Mesh(new THREE.BoxGeometry(.022, aspect + .004, thickness + .006), [orange, printedSpine, orange, orange, orange, orange]);
  spine.position.set(-.014, 0, thickness * .5 - .003); spine.castShadow = true; bookGroup.add(spine);
  magazine.addEventListener('pagechange', e => changePage(e.detail));
  magazine.addEventListener('pageload', e => loaded.add(e.detail.page));
  magazine.addEventListener('ready', () => { state.ready = true; document.body.dataset.ready = 'true'; feedback(''); });
  magazine.addEventListener('error', () => { feedback('部分页面暂未加载成功，点击重试。'); $('book-feedback').onclick = () => { feedback(''); magazine.retry(); }; });
  resize();
  let pressedPoint, clickTimer;
  $('magazine-canvas').addEventListener('pointerdown', e => {
    if (!magazine.covers(e.clientX, e.clientY)) {
      const card = cardAt(e.clientX, e.clientY); if (card) { startCard(e, card); }
    }
    pressedPoint = { x: e.clientX, y: e.clientY };
  });
  $('magazine-canvas').addEventListener('pointermove', e => {
    $('magazine-canvas').style.cursor = dragCard ? 'grabbing' : magazine.covers(e.clientX, e.clientY) ? 'grab' : cardAt(e.clientX, e.clientY) ? 'grab' : 'default';
  });
  $('magazine-canvas').addEventListener('pointerup', e => {
    if (!pressedPoint || dragCard || Math.hypot(e.clientX - pressedPoint.x, e.clientY - pressedPoint.y) > 5 || !magazine.covers(e.clientX, e.clientY)) return;
    const p = getPagePoint(e.clientX, e.clientY);
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { if (!$('page-zoom').open) turn(p?.x >= 0); }, 220);
  });
  $('magazine-canvas').addEventListener('dblclick', e => {
    clearTimeout(clickTimer);
    if (!magazine.covers(e.clientX, e.clientY)) return;
    const p = getPagePoint(e.clientX, e.clientY), index = p?.x < 0 ? state.visiblePages[0] : state.visiblePages.at(-1); openZoom(index);
  });
}
function resize() {
  if (!renderer) return; renderer.setSize(innerWidth, innerHeight, false); camera.updateProjectionMatrix();
}
function render(now) {
  frameID = requestAnimationFrame(render);
  if (paused || document.hidden || now - lastTime < 32) return;
  const dt = Math.min(1, (now - lastTime) / 1000); lastTime = now;
  drawBackground(now);
  if (!magazine) return;
  magazine.enabled = !$('page-zoom').open && !dragCard;
  magazine.tick(now);
  const closedFront = state.page === 0, closedBack = state.page === sources.length - 1;
  const isOpen = !closedFront && !closedBack;
  const blend = reduced ? 1 : 1 - Math.exp(-dt * 7);
  open += (Number(isOpen) - open) * blend;
  const targetX = closedFront ? -.5 : closedBack ? .5 : 0;
  bookX += (targetX - bookX) * blend;
  bookGroup.position.set(bookX, innerWidth < 760 ? .10 : .015, 0);
  const hoverX = !reduced && pointer.active && !magazine.turning && !isOpen ? (pointer.x / innerWidth - .5) * .035 : 0;
  const hoverY = !reduced && pointer.active && !magazine.turning && !isOpen ? (pointer.y / innerHeight - .5) * .025 : 0;
  bookGroup.rotation.set(-.22 * (1 - open) + hoverY, .07 * (1 - open) + hoverX, -.085 * (1 - open));
  const a = innerWidth / innerHeight;
  const closedWidth = innerWidth < 760 ? Math.max(1.28, a * 1.1) : Math.max(1.6, a * 1.02);
  const openWidth = innerWidth < 760 ? 2.16 : Math.max(2.20, a * 1.03);
  const targetWidth = THREE.MathUtils.lerp(closedWidth, openWidth, open);
  cameraWidth += (targetWidth - cameraWidth) * blend;
  camera.left = -cameraWidth / 2; camera.right = cameraWidth / 2; camera.top = cameraWidth / a / 2; camera.bottom = -camera.top; camera.updateProjectionMatrix();
  const desiredRead = closedFront ? 0 : closedBack ? 16 : Math.ceil(state.page / 2);
  readCount += (desiredRead - readCount) * blend;
  for (const block of pageBlocks) {
    const count = block.userData.side < 0 ? readCount : 16 - readCount;
    const depth = Math.max(.0002, (count - 1) * thickness / 16 - .003);
    block.visible = count > .35; block.scale.z = depth; block.position.z = depth / 2 - .004;
  }
  spine.visible = open < .85; spine.scale.x = 1 - open * .7;
  renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera);
}
try { setupBook(); } catch (error) {
  console.warn('Magazine uses the flat reading fallback.', error);
  magazine?.dispose(); renderer?.dispose(); magazine = null; renderer = null;
  state.mode = 'plain'; state.ready = true; $('magazine-canvas').hidden = true; $('plain-book').hidden = false; $('plain-page').src = sources[0].src;
  $('plain-page').onclick = () => openZoom(state.page); document.body.dataset.ready = 'true';
}
window.addEventListener('resize', () => { resize(); sizeZoom(); }); updateControls(); requestAnimationFrame(render);
// Paused whenever the parent reader is closed; resume without rerunning entry or losing the spread.
if ('IntersectionObserver' in window) new IntersectionObserver(entries => { paused = !entries[0].isIntersecting; }).observe(document.documentElement);
window.HAHA_READER = {
  manifest, sources, state, loaded, get magazine() { return magazine; }, get renderer() { return renderer; }, get scene() { return scene; }, get camera() { return camera; }, bookGroup,
  goTo, turn, openZoom, closeZoom, get backgroundFrame() { return backgroundFrame; },
  pause() { paused = true; }, resume() { paused = false; },
  snapshot() { return { ...state, originalPages: manifest.pages.length, ratio: 1 / aspect, sheetGap: thickness / 16, backgroundFrame, loaded: [...loaded] }; }
};
