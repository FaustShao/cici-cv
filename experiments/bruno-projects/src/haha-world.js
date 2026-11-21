import * as THREE from 'three';
import { LeafThroughObject } from 'leafthrough';
import { bindingDeform, makePaperEdges, fitPaperEdges } from './haha-binding.js';
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
let magazine, renderer, scene, camera, frameID, lastTime = 0, paused = false, bookAssetsReady = false;
let cameraWidth = 2, bookX = -.5, open = 0, sceneDirty = true, lastPaperSignature = '', bookFrames = 0;
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
  $('reading-hint').textContent = state.page === 0 ? '点击封面，翻开手册' : '点击左／右半页 · 横向拖动翻页 · 双击放大';
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
function returnToCover() {
  if ($('page-zoom').open) closeZoom();
  toggleContents(false);
  state.zoomPage = 0;
  goTo(0);
}
$('return-cover').onclick = returnToCover;
$('zoom-return-cover').onclick = returnToCover;
window.addEventListener('pageshow', event => {
  if (event.persisted) { paused = false; sceneDirty = true; returnToCover(); }
});
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
$('close-zoom').onclick = closeZoom;
$('page-zoom').addEventListener('click', e => { if (e.target === $('page-zoom') || e.target.classList.contains('zoom-pages')) closeZoom(); });
$('page-zoom').addEventListener('cancel', e => { e.preventDefault(); closeZoom(); });
$('zoom-previous').onclick = () => openZoom(state.zoomPage - 1); $('zoom-next').onclick = () => openZoom(state.zoomPage + 1);
window.addEventListener('keydown', e => {
  if ($('page-zoom').open) { if (e.key === 'ArrowRight') openZoom(Math.min(sources.length - 1, state.zoomPage + 1)); if (e.key === 'ArrowLeft') openZoom(Math.max(0, state.zoomPage - 1)); }
  else if (e.key === 'Escape') toggleContents(false);
  else if (!magazine && e.key === 'ArrowRight') turn(true);
  else if (!magazine && e.key === 'ArrowLeft') turn(false);
  else if (!magazine && e.key === 'Home') goTo(0);
});

// Reference graph paper: 20 × 40 px blue cells and a fading, density-coded ASCII cursor trail.
const background = $('paper-field'), bg = background.getContext('2d');
const grid = { width: 20, height: 40, margin: 18, columns: 0, rows: 0, ink: new Float32Array(), stampedAt: new Float64Array(), lastX: null, lastY: null, lastTime: 0, activeCells: 0 };
let bgW = 0, bgH = 0, backgroundFrame = 0, dragCard = null;
function resizeGrid() {
  if (innerWidth === bgW && innerHeight === bgH) return;
  bgW = innerWidth; bgH = innerHeight;
  const dpr = Math.min(devicePixelRatio, 2);
  background.width = Math.round(bgW * dpr); background.height = Math.round(bgH * dpr);
  bg.setTransform(dpr, 0, 0, dpr, 0, 0);
  grid.columns = Math.ceil((bgW - grid.margin * 2) / grid.width);
  grid.rows = Math.ceil(bgH / grid.height);
  grid.ink = new Float32Array(grid.columns * grid.rows); grid.stampedAt = new Float64Array(grid.ink.length);
  grid.lastX = grid.lastY = null;
}
function stampGrid(x, y) {
  const now = performance.now();
  const col = Math.floor((x - grid.margin) / grid.width), row = Math.floor(y / grid.height);
  for (let r = Math.max(0, row - 2); r <= Math.min(grid.rows - 1, row + 2); r++) {
    for (let c = Math.max(0, col - 5); c <= Math.min(grid.columns - 1, col + 5); c++) {
      const dx = (grid.margin + (c + .5) * grid.width - x) / 108, dy = ((r + .5) * grid.height - y) / 86;
      const power = Math.max(0, 1 - Math.hypot(dx, dy));
      const at = r * grid.columns + c;
      const old = grid.ink[at] * Math.exp(-Math.max(0, now - grid.stampedAt[at]) / 1000 * 1.4);
      grid.ink[at] = Math.min(1, Math.max(old, Math.pow(power, .65))); grid.stampedAt[at] = now;
    }
  }
}
function traceGrid(x, y) {
  resizeGrid();
  const lastX = grid.lastX ?? x, lastY = grid.lastY ?? y;
  const steps = Math.min(80, Math.max(1, Math.ceil(Math.hypot(x - lastX, y - lastY) / 12)));
  for (let i = 1; i <= steps; i++) stampGrid(lastX + (x - lastX) * i / steps, lastY + (y - lastY) * i / steps);
  grid.lastX = x; grid.lastY = y;
}
function drawBackground(t) {
  resizeGrid();
  const dt = grid.lastTime ? Math.min(1, (t - grid.lastTime) / 1000) : 0;
  grid.lastTime = t;
  bg.fillStyle = '#f7f7f5'; bg.fillRect(0, 0, bgW, bgH);
  bg.lineWidth = 1; bg.strokeStyle = '#c9ddf8'; bg.beginPath();
  for (let c = 0; c <= grid.columns; c++) { const x = grid.margin + c * grid.width + .5; bg.moveTo(x, 0); bg.lineTo(x, bgH); }
  for (let r = 0; r <= grid.rows; r++) { const y = r * grid.height + .5; bg.moveTo(grid.margin, y); bg.lineTo(bgW - grid.margin, y); }
  bg.stroke(); bg.font = "22px 'Paper Mono',monospace"; bg.textAlign = 'center'; bg.textBaseline = 'middle';
  grid.activeCells = 0;
  for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.columns; c++) {
    const at = r * grid.columns + c, power = grid.ink[at] * Math.exp(-Math.max(0, t - grid.stampedAt[at]) / 1000 * 1.4);
    if (power < .045) { grid.ink[at] = 0; continue; }
    grid.activeCells++;
    const variation = ((r * 17 + c * 23) % 11) / 11;
    const level = power * .86 + variation * .12;
    const glyph = (r + c + Math.floor(level * 4)) % 2 ? 'h' : 'a';
    bg.fillStyle = `rgba(120,165,232,${.27 + Math.min(.58, power * .58)})`;
    bg.fillText(glyph, grid.margin + (c + .5) * grid.width, (r + .5) * grid.height + 1);
  }
  backgroundFrame++;
}
function movePointer(e) { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; traceGrid(e.clientX, e.clientY); }
window.addEventListener('pointermove', movePointer, { passive: true }); window.addEventListener('pointerout', e => { if (!e.relatedTarget) { pointer.active = false; grid.lastX = grid.lastY = null; } });
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
  const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 1024;
  const c = canvas.getContext('2d'); c.fillStyle = '#f2f2ec'; c.fillRect(0, 0, 32, 1024);
  for (let y = 0; y < 1024; y += 64) {
    const line = c.createLinearGradient(0, y, 0, y + 8);
    line.addColorStop(0, '#c8c9c120'); line.addColorStop(.5, '#b9bcb54a'); line.addColorStop(1, '#f2f2ec00');
    c.fillStyle = line; c.fillRect(0, y, 32, 8);
  }
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
function getPagePoint(x, y) {
  ndc.set(x / innerWidth * 2 - 1, 1 - y / innerHeight * 2); ray.setFromCamera(ndc, camera);
  const origin = bookGroup.worldToLocal(ray.ray.origin.clone()), end = bookGroup.worldToLocal(ray.ray.origin.clone().add(ray.ray.direction));
  const direction = end.sub(origin); if (Math.abs(direction.z) < .0001) return null;
  const p = origin.addScaledVector(direction, -origin.z / direction.z);
  return p;
}
let pageBlocks = [], spine, gutter, thickness = .052, readCount = 0;
const bindingOpen = { value: 0 };
function setupBook() {
  renderer = new THREE.WebGLRenderer({ canvas: $('magazine-canvas'), alpha: true, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  scene = new THREE.Scene(); camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .5, 12); camera.position.set(0, 0, 4); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight('#ffffff', '#ffffff', 1.65));
  const sun = new THREE.DirectionalLight('#ffffff', 2); sun.position.set(-3.5, 1.3, 4.1); sun.castShadow = true;
  const shadowSize = innerWidth >= 1200 ? 4096 : 2048; sun.shadow.mapSize.set(shadowSize, shadowSize); Object.assign(sun.shadow.camera, { left: -1.5, right: 1.5, top: 1, bottom: -1, near: .5, far: 10 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -.001; sun.shadow.normalBias = .002;
  scene.add(sun, sun.target); scene.add(bookGroup);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: .13 }));
  floor.name = 'bound-book-contact-shadow'; floor.position.z = -.008; floor.receiveShadow = true;
  bookGroup.add(floor);
  magazine = new LeafThroughObject({ renderer, camera }, {
    pages: sources, pageAspect: aspect, layout: 'spread', startPage: 0, preload: 3,
    paper: { grain: true, grainScale: 1.46, grainStrength: .025, showThrough: 0, inkGloss: .08, roughness: .78, metalness: 0, backColor: '#ffffff', sheetGap: thickness / 16, depthBias: false, wrinkles: .16, bulge: .24 },
    deform: { glsl: bindingDeform, uniforms: { uBindingOpen: bindingOpen } },
    lighting: { shadows: true, sun: { position: [-3.5, 1.3, 4.1] } },
    motion: { speed: 1.1, dragDistance: .42, commitThreshold: .07, hoverLift: .018, curl: 1, jitter: true, reducedMotion: 'auto' },
    interaction: { drag: true, click: false, hold: false, hover: true, keyboard: 'global' }
  });
  // Keep printed RGB artwork neutral: a very low paper sheen must not wash orange ink with white light.
  magazine.traverse(mesh => {
    if (!mesh.isMesh) return;
    const material = mesh.material, compile = material.onBeforeCompile, key = material.customProgramCacheKey;
    material.onBeforeCompile = function(program, renderer) {
      compile.call(this, program, renderer);
      mesh.userData.shapeUniforms = program.uniforms;
      program.fragmentShader = program.fragmentShader.replace('#include <lights_physical_fragment>',
        '#include <lights_physical_fragment>\nmaterial.specularColor *= 0.08;\nmaterial.specularColorBlended *= 0.08;');
    };
    material.customProgramCacheKey = function() { return key.call(this) + '/neutral-matte-ink'; };
  });
  bookGroup.add(magazine);
  const edgeTexture = makeEdgeTexture();
  edgeTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const edge = new THREE.MeshStandardMaterial({ map: edgeTexture, roughness: .94, color: '#fcfcf8', side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const block = new THREE.Mesh(makePaperEdges(side, aspect - .002), edge);
    block.name = side < 0 ? 'left-paper-cut-edges' : 'right-paper-cut-edges';
    block.receiveShadow = false; block.castShadow = true; block.userData.side = side;
    block.frustumCulled = false; bookGroup.add(block); pageBlocks.push(block);
  }
  gutter = new THREE.Mesh(new THREE.PlaneGeometry(.005, aspect), new THREE.MeshBasicMaterial({ color: '#ecece8', side: THREE.DoubleSide }));
  gutter.name = 'continuous-glued-hinge'; gutter.position.z = .0001; bookGroup.add(gutter);
  const spineCanvas = document.createElement('canvas'); spineCanvas.width = 128; spineCanvas.height = 1024; const ctx = spineCanvas.getContext('2d');
  ctx.fillStyle = '#ff8d06'; ctx.fillRect(0, 0, 128, 1024); ctx.save(); ctx.translate(64, 512); ctx.rotate(-Math.PI / 2); ctx.fillStyle = 'white'; ctx.font = '38px "Paper Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText('HAHA WORLD  /  VISUAL IDENTITY', 0, 12); ctx.restore();
  const spineTexture = new THREE.CanvasTexture(spineCanvas); spineTexture.colorSpace = THREE.SRGBColorSpace;
  const orange = new THREE.MeshStandardMaterial({ color: '#ff8d06', roughness: .62 });
  const printedSpine = new THREE.MeshStandardMaterial({ map: spineTexture, roughness: .6 });
  spine = new THREE.Mesh(new THREE.BoxGeometry(.022, aspect + .004, thickness + .006), [orange, printedSpine, orange, orange, orange, orange]);
  spine.position.set(-.014, 0, thickness * .5 - .003); spine.castShadow = true; bookGroup.add(spine);
  magazine.addEventListener('pagechange', e => changePage(e.detail));
  magazine.addEventListener('pageload', e => loaded.add(e.detail.page));
  magazine.addEventListener('ready', () => { bookAssetsReady = true; sceneDirty = true; });
  magazine.addEventListener('error', () => { feedback('部分页面暂未加载成功，点击重试。'); $('book-feedback').onclick = () => { feedback(''); magazine.retry(); }; });
  resize();
  let pressedPoint, clickTimer;
  function pageHit(x, y) {
    const p = getPagePoint(x, y);
    if (!p || Math.abs(p.y) > aspect / 2 + .09) return null;
    const first = magazine.page === 0, last = magazine.page === sources.length - 1;
    const min = first ? -.10 : -1.14, max = last ? .10 : 1.14;
    return p.x >= min && p.x <= max ? p : null;
  }
  const canvas = $('magazine-canvas');
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const p = pageHit(e.clientX, e.clientY);
    if (!p) { const card = cardAt(e.clientX, e.clientY); if (card) startCard(e, card); pressedPoint = null; return; }
    pressedPoint = { x: e.clientX, y: e.clientY, page: magazine.page, forward: p.x >= 0, id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    const p = pageHit(e.clientX, e.clientY);
    canvas.style.cursor = dragCard || pressedPoint ? 'grabbing' : p ? p.x < 0 ? 'w-resize' : 'e-resize' : cardAt(e.clientX, e.clientY) ? 'grab' : 'default';
  });
  canvas.addEventListener('pointerup', e => {
    const press = pressedPoint; pressedPoint = null;
    if (!press || e.pointerId !== press.id || dragCard) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y;
    // A short purposeful swipe still turns the page if the native curl did not commit it.
    if (Math.abs(dx) >= 20 && Math.abs(dx) >= Math.abs(dy) * .7) {
      clearTimeout(clickTimer);
      if (magazine.page === press.page) turn(dx < 0);
      return;
    }
    if (Math.hypot(dx, dy) > 9 || !pageHit(e.clientX, e.clientY)) return;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { if (!$('page-zoom').open && magazine.page === press.page) turn(press.forward); }, 180);
  });
  canvas.addEventListener('pointercancel', () => { pressedPoint = null; clearTimeout(clickTimer); });
  canvas.addEventListener('dblclick', e => {
    clearTimeout(clickTimer);
    const p = pageHit(e.clientX, e.clientY); if (!p) return;
    const visible = magazine.visiblePages;
    openZoom(p.x < 0 ? visible[0] : visible.at(-1));
  });
}
function resize() {
  sceneDirty = true;
  if (!renderer) return; renderer.setSize(innerWidth, innerHeight, false); camera.updateProjectionMatrix();
}
function paperSignature() {
  const values = [];
  magazine.traverse(mesh => {
    if (!mesh.isMesh) return;
    const u = mesh.userData.shapeUniforms;
    if (!u) { values.push(mesh.material.id); return; }
    for (const key of ['uFlipProgress','uBendAngle','uStackLift','uStackGap','uWrinkleSide','uDirection']) values.push(Math.round((u[key]?.value || 0) * 100000));
    for (const key of ['uFold','uCurl','uFlipRotation']) { const v = u[key]?.value; values.push(Math.round((v?.x || 0) * 100000), Math.round((v?.y || 0) * 100000)); }
    values.push(u.uFront?.value?.id, u.uBack?.value?.id, mesh.castShadow);
  });
  return values.join(',');
}
function render(now) {
  frameID = requestAnimationFrame(render);
  if (paused || document.hidden || now - lastTime < 32) return;
  const dt = Math.min(1, (now - lastTime) / 1000); lastTime = now;
  drawBackground(now);
  if (!magazine) return;
  magazine.enabled = !$('page-zoom').open && !dragCard;
  const paperMoved = magazine.tick(now);
  const oldPose = [open, bookX, cameraWidth, readCount, ...bookGroup.rotation.toArray().slice(0, 3)];
  const closedFront = state.page === 0, closedBack = state.page === sources.length - 1;
  const isOpen = !closedFront && !closedBack;
  const blend = !state.ready || reduced ? 1 : 1 - Math.exp(-dt * 7);
  open += (Number(isOpen) - open) * blend;
  if (Math.abs(open - Number(isOpen)) < .0001) open = Number(isOpen);
  bindingOpen.value = open;
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
  if (Math.abs(readCount - desiredRead) < .0001) readCount = desiredRead;
  for (const block of pageBlocks) {
    const count = block.userData.side < 0 ? readCount : 16 - readCount;
    const depth = Math.max(.0002, (count - 1) * thickness / 16 * (1 - .82 * open) + .003);
    block.visible = count > .35; block.scale.z = depth; block.position.z = -.004;
    fitPaperEdges(block.geometry, open);
  }
  spine.visible = open < .55; spine.scale.x = 1 - open * .7;
  gutter.visible = open > .4;
  const pose = [open, bookX, cameraWidth, readCount, ...bookGroup.rotation.toArray().slice(0, 3)];
  const poseMoved = pose.some((v, i) => Math.abs(v - oldPose[i]) > .000001);
  const signature = paperMoved ? paperSignature() : lastPaperSignature;
  if (signature !== lastPaperSignature || poseMoved || sceneDirty) {
    renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); sceneDirty = false;
    lastPaperSignature = paperSignature(); bookFrames++;
    if (!state.ready && bookAssetsReady && loaded.has(0)) {
      state.ready = true; document.body.dataset.ready = 'true'; feedback('');
    }
  }
}
try { setupBook(); } catch (error) {
  console.warn('Magazine uses the flat reading fallback.', error);
  magazine?.dispose(); renderer?.dispose(); magazine = null; renderer = null;
  state.mode = 'plain'; state.ready = true; $('magazine-canvas').hidden = true; $('plain-book').hidden = false; $('plain-page').src = sources[0].src;
  const flat = $('plain-book'); let flatPress, flatClick;
  flat.addEventListener('pointerdown', e => { flatPress = { x: e.clientX, y: e.clientY }; });
  flat.addEventListener('pointerup', e => {
    if (!flatPress) return;
    const dx = e.clientX - flatPress.x, dy = e.clientY - flatPress.y; flatPress = null;
    if (Math.abs(dx) >= 20 && Math.abs(dx) > Math.abs(dy)) { clearTimeout(flatClick); turn(dx < 0); return; }
    if (Math.hypot(dx, dy) > 9) return;
    clearTimeout(flatClick); const r = $('plain-page').getBoundingClientRect();
    flatClick = setTimeout(() => turn(e.clientX >= r.left + r.width / 2), 180);
  });
  flat.addEventListener('dblclick', () => { clearTimeout(flatClick); openZoom(state.page); });
  document.body.dataset.ready = 'true';
}
window.addEventListener('resize', () => { resize(); sizeZoom(); }); updateControls(); requestAnimationFrame(render);
// Off-screen views stop drawing; the parent disposes this project on exit so each entry is fresh.
if ('IntersectionObserver' in window) new IntersectionObserver(entries => { paused = !entries[0].isIntersecting; }).observe(document.documentElement);
window.HAHA_READER = {
  manifest, sources, state, loaded, get magazine() { return magazine; }, get renderer() { return renderer; }, get scene() { return scene; }, get camera() { return camera; }, bookGroup,
  goTo, turn, openZoom, closeZoom, returnToCover, get backgroundFrame() { return backgroundFrame; },
  pause() { paused = true; }, resume() { paused = false; },
  dispose() { paused = true; cancelAnimationFrame(frameID); magazine?.dispose(); renderer?.dispose(); },
  snapshot() { return { ...state, originalPages: manifest.pages.length, ratio: 1 / aspect, bindingOpen: bindingOpen.value, bookFrames, gridCells: grid.activeCells, sheetGap: thickness / 16, backgroundFrame, loaded: [...loaded] }; }
};
