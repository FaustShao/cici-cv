const byId = id => document.getElementById(id);
const revision = document.querySelector('meta[name="cecilia-release"]')?.content;
function asset(name) {
  return 'assets/cardinal/' + name + (revision ? '?build=' + encodeURIComponent(revision) : '');
}
const screens = [
  {id:'battle', label:'战斗', note:'左侧记录对手状态，右侧是九宫格棋盘，手牌与钱袋收在左下角。'},
  {id:'map', label:'地图', note:'沿卷轴上的路线查看标记。点选剑、商店或骷髅节点。', pins:[
    [24,47,7,13,'单剑标记 · 战斗节点'], [57,65,8,14,'摊位标记 · 商店节点'], [85,43,8,13,'骷髅标记 · Boss 节点']]},
  {id:'event', label:'事件', note:'左页留给插图与叙事，右页的三张撕边纸条承载选项。点选一张纸条。'},
  {id:'event-alt', label:'事件变体', note:'相同的事件布局，搭配不同的文字与纸条焦点。点选右侧纸条。'},
  {id:'shop', label:'商店', note:'商品卡按行陈列，圆形价签贴在卡角；下方另列道具与移除卡牌的位置。'}
];
const eventPins = [[70,21,30,22,'上方事件纸条'],[70,48,30,22,'中间事件纸条'],[70,77,30,22,'下方事件纸条']];
const viewer = byId('viewer');
const viewport = viewer.querySelector('.viewport');

function openFull(screen) {
  byId('viewer-name').textContent = screen.label + ' · 1920 × 1080';
  byId('full').src = asset(screen.id + '.webp');
  byId('full').alt = screen.label + '界面原稿';
  viewport.classList.remove('actual');
  byId('actual').textContent = '原始尺寸';
  byId('screen-note').textContent = screen.note;
  const pins = byId('pins');
  pins.replaceChildren();
  for (const [x,y,w,h,label] of screen.pins || (screen.id.startsWith('event') ? eventPins : [])) {
    const pin = document.createElement('button');
    pin.className = 'pin';
    Object.assign(pin.style,{left:x+'%',top:y+'%',width:w+'%',height:h+'%'});
    pin.title = label;
    pin.setAttribute('aria-label',label);
    pin.setAttribute('aria-pressed',false);
    pin.onclick = () => {
      for (const button of pins.children) button.setAttribute('aria-pressed',button===pin);
      byId('screen-note').textContent = label;
    };
    pins.append(pin);
  }
  viewer.showModal();
  viewport.scrollTo(0,0);
}
for (const screen of screens) {
  const button = document.createElement('button');
  button.className = 'print';
  const image = new Image();
  image.src = asset(screen.id + '-preview.webp');
  image.alt = screen.label + '界面';
  image.loading = 'lazy';
  image.width = 1920;
  image.height = 1080;
  const caption = document.createElement('span');
  const action = document.createElement('small');
  action.textContent = '查看高清 ↗';
  caption.append(screen.label, action);
  button.append(image, caption);
  button.onclick = () => openFull(screen);
  byId('prints').append(button);
}
byId('actual').onclick = () => {
  const actual = viewport.classList.toggle('actual');
  byId('actual').textContent = actual ? '适应窗口' : '原始尺寸';
};
byId('dismiss').onclick = () => viewer.close();

// The same three slips start on the lower page and stay with the scrolling prints.
const stack = document.querySelector('.paper-stack');
const slips = [...stack.children];
const indexPage = byId('index');
const castSection = byId('cast');
const lastLeaf = document.querySelector('.last-leaf');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const clampUnit = value => Math.max(0, Math.min(1, value));
function smoothStep(value) {
  const t = clampUnit(value);
  return t*t*(3-2*t);
}
let queued = false;
function alignSlips() {
  queued = false;
  if (reducedMotion.matches) {
    slips.forEach(slip => slip.removeAttribute('style'));
    board.style.removeProperty('--approach');
    return;
  }
  const dock = stack.getBoundingClientRect();
  const page = indexPage.getBoundingClientRect();
  const focusY = dock.top + dock.height / 2;
  const gather = smoothStep((focusY - page.top - page.height * .51) / (page.height * .54));
  const matTop = board.getBoundingClientRect().top;
  board.style.setProperty('--approach',smoothStep((matTop / innerHeight - .36) / .63));
  const chapter = [
    smoothStep((focusY - castSection.getBoundingClientRect().top + dock.height) / (dock.height * 2)),
    smoothStep((focusY - lastLeaf.getBoundingClientRect().top + dock.height) / (dock.height * 2))
  ];
  const spread = [[-.54,.01,-8],[.50,-.12,8],[.04,.68,3]];
  slips.forEach((slip,i) => {
    const [x,y,angle] = spread[i];
    const turn = i === 2 ? 0 : chapter[i];
    const flick = Math.sin(Math.PI * turn);
    slip.style.setProperty('--dx', (x*(1-gather) + (i-1)*.025*gather - flick*.62)*dock.width + 'px');
    slip.style.setProperty('--dy', (y*(1-gather) + (i-1)*.025*gather - flick*.17)*dock.height + 'px');
    slip.style.setProperty('--turn', (angle*(1-gather) + (i-1)*3*gather - flick*10) + 'deg');
    slip.style.zIndex = gather < .52 ? String(i+1) : String(turn > .5 ? i+1 : 5-i);
  });
}
function queueSlips() {
  if (!queued) {
    queued = true;
    requestAnimationFrame(alignSlips);
  }
}
window.addEventListener('scroll',queueSlips,{passive:true});
window.addEventListener('resize',queueSlips);
reducedMotion.addEventListener('change',queueSlips);
new ResizeObserver(queueSlips).observe(document.querySelector('.sequence'));
queueSlips();

const board = document.querySelector('.board');
const pieces = [
  ['warrior-card','战士 · 红色卡牌',34,42,-9,18],
  ['pupil-card','学徒 · 黄色卡牌',45,46,6,18],
  ['coins','钱袋与金币',69,30,5,17],
  ['scout-card','斥候 · 黄色卡牌',22,75,-7,17],
  ['map-preview','地图原稿',45,82,4,20],
  ['battle-preview','战斗原稿',85,58,-6,18],
  ['seal','蜡封按钮',73,73,-7,11]
];
let layer = 1;
const bound = (value,min,max) => Math.min(max,Math.max(min,value));
function addPiece([file,label,startX,startY,angle,size]) {
  const piece = document.createElement('button');
  const img = new Image();
  img.src = asset(file+'.webp');
  img.alt = '';
  img.draggable = false;
  piece.append(img);
  piece.className = 'piece';
  const proof = screens.find(screen => file === screen.id + '-preview');
  if (proof) {
    piece.classList.add('proof');
    piece.style.setProperty('--fly-x', startX < 50 ? '-13%' : '8%');
  }
  piece.title = label;
  piece.setAttribute('aria-label',label);
  piece.style.setProperty('--angle',angle+'deg');
  piece.style.setProperty('--size',size+'%');
  let x=startX, y=startY, grip;
  function position() {
    piece.style.setProperty('--x',x+'%');
    piece.style.setProperty('--y',y+'%');
  }
  function move(px,py) {
    const w=board.clientWidth, h=board.clientHeight;
    x=bound(px,piece.offsetWidth/2,w-piece.offsetWidth/2)*100/w;
    y=bound(py,piece.offsetHeight/2,h-piece.offsetHeight/2)*100/h;
    position();
  }
  function select() {
    piece.style.zIndex=++layer;
    byId('piece-name').textContent=label;
  }
  let dragged = false;
  piece.onclick = e => {
    select();
    if (proof && (!dragged || e.detail === 0)) openFull(proof);
  };
  function settle() {
    if (!proof || piece.hasAttribute('data-placed')) return;
    const rect = piece.getBoundingClientRect();
    const area = board.getBoundingClientRect();
    x = (rect.left + rect.width/2 - area.left) / area.width * 100;
    y = (rect.top + rect.height/2 - area.top) / area.height * 100;
    piece.dataset.placed = '';
    position();
  }
  piece.onpointerdown = e => {
    if (grip || e.button!==0) return;
    select();
    settle();
    dragged=false;
    const rect=board.getBoundingClientRect();
    grip={id:e.pointerId, startX:e.clientX, startY:e.clientY,x:e.clientX-rect.left-x*board.clientWidth/100,y:e.clientY-rect.top-y*board.clientHeight/100};
    piece.setPointerCapture(e.pointerId);
    piece.dataset.lift='';
  };
  piece.onpointermove = e => {
    if (e.pointerId!==grip?.id) return;
    if (Math.hypot(e.clientX-grip.startX,e.clientY-grip.startY)>4) dragged=true;
    if (!dragged) return;
    const rect=board.getBoundingClientRect();
    move(e.clientX-rect.left-grip.x,e.clientY-rect.top-grip.y);
  };
  piece.onlostpointercapture = () => {grip=null;delete piece.dataset.lift;};
  piece.onkeydown = e => {
    const delta={ArrowUp:[0,-12],ArrowDown:[0,12],ArrowLeft:[-12,0],ArrowRight:[12,0]}[e.key];
    if (!delta) return;
    e.preventDefault();
    select();
    settle();
    move(x*board.clientWidth/100+delta[0],y*board.clientHeight/100+delta[1]);
  };
  position();
  byId('pieces').append(piece);
  return () => { x=startX; y=startY; piece.style.zIndex=''; delete piece.dataset.placed; position(); };
}
const resets = pieces.map(addPiece);
byId('reset').onclick = () => {
  resets.forEach(reset=>reset());
  byId('piece-name').textContent='卡牌、钱袋与印章';
};
// Keep in-reader chapter jumps out of the parent station's Back history.
if (window.parent !== window) {
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    location.replace(link.hash);
  });
}
