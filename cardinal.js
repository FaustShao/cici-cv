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
let current;
function selectScreen(screen) {
  current = screen;
  byId('screen').src = asset(screen.id+'-preview.webp');
  byId('screen').alt = screen.label+'界面原稿';
  byId('screen-note').textContent = screen.note;
  for (const button of byId('screen-choices').children) button.setAttribute('aria-pressed',button.dataset.id===screen.id);
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
      byId('screen-note').textContent = '已选中 · '+label;
    };
    pins.append(pin);
  }
}
for (const screen of screens) {
  const button = document.createElement('button');
  button.textContent = screen.label;
  button.dataset.id = screen.id;
  button.onclick = () => selectScreen(screen);
  byId('screen-choices').append(button);
}
selectScreen(screens[0]);
const viewer = byId('viewer');
const viewport = viewer.querySelector('.viewport');
function openFull() {
  byId('viewer-name').textContent = current.label+' · 1920 × 1080';
  byId('full').src = asset(current.id+'.webp');
  byId('full').alt = current.label+'高清原稿';
  viewport.classList.remove('actual');
  byId('actual').textContent = '原始尺寸';
  viewer.showModal();
}
byId('enlarge').onclick = byId('zoom').onclick = openFull;
byId('actual').onclick = () => {
  const actual = viewport.classList.toggle('actual');
  byId('actual').textContent = actual ? '适应窗口' : '原始尺寸';
};
byId('dismiss').onclick = () => viewer.close();

const board = document.querySelector('.board');
const pieces = [
  ['warrior-card','战士 · 红色卡牌',30,50,-9],
  ['pupil-card','学徒 · 黄色卡牌',46,49,6],
  ['coins','钱袋与金币',65,39,5],
  ['seal','蜡封按钮',73,72,-7]
];
let layer = 1;
const bound = (value,min,max) => Math.min(max,Math.max(min,value));
function addPiece([file,label,startX,startY,angle]) {
  const piece = document.createElement('button');
  const img = new Image();
  img.src = asset(file+'.webp');
  img.alt = '';
  img.draggable = false;
  piece.append(img);
  piece.className = 'piece';
  piece.title = label;
  piece.setAttribute('aria-label',label);
  piece.style.setProperty('--angle',angle+'deg');
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
  piece.onclick=select;
  piece.onpointerdown = e => {
    if (grip || e.button!==0) return;
    select();
    const rect=board.getBoundingClientRect();
    grip={id:e.pointerId,x:e.clientX-rect.left-x*board.clientWidth/100,y:e.clientY-rect.top-y*board.clientHeight/100};
    piece.setPointerCapture(e.pointerId);
    piece.dataset.lift='';
  };
  piece.onpointermove = e => {
    if (e.pointerId!==grip?.id) return;
    const rect=board.getBoundingClientRect();
    move(e.clientX-rect.left-grip.x,e.clientY-rect.top-grip.y);
  };
  piece.onlostpointercapture = () => {grip=null;delete piece.dataset.lift;};
  piece.onkeydown = e => {
    const delta={ArrowUp:[0,-12],ArrowDown:[0,12],ArrowLeft:[-12,0],ArrowRight:[12,0]}[e.key];
    if (!delta) return;
    e.preventDefault();
    select();
    move(x*board.clientWidth/100+delta[0],y*board.clientHeight/100+delta[1]);
  };
  position();
  byId('pieces').append(piece);
  return () => { x=startX; y=startY; piece.style.zIndex=''; position(); };
}
const resets = pieces.map(addPiece);
byId('reset').onclick = () => {
  resets.forEach(reset=>reset());
  byId('piece-name').textContent='卡牌、钱袋与印章';
};
const cast = [
  ['guard','盾卫','guard.gif'],['mage','火球法师','mage.gif'],
  ['ranger','游侠','ranger.gif'],['octopus','章鱼 Boss','octopus-motion.webp']
];
let stopMotion;
for (const [file,label,motion] of cast) {
  const button=document.createElement('button');
  button.className='character';
  const img=new Image();
  img.loading='lazy';
  img.src=asset(file+'.webp');
  img.alt='';
  const action=document.createElement('small');
  action.textContent='播放动作 ▷';
  button.append(img,label,action);
  button.setAttribute('aria-pressed',false);
  button.onclick=()=>{
    const wasPlaying=button.getAttribute('aria-pressed')==='true';
    stopMotion?.();
    if (wasPlaying) return;
    img.src=asset(motion);
    button.setAttribute('aria-pressed',true);
    action.textContent='停止动作 □';
    stopMotion=()=>{
      img.src=asset(file+'.webp');
      button.setAttribute('aria-pressed',false);
      action.textContent='播放动作 ▷';
      stopMotion=null;
    };
  };
  byId('characters').append(button);
}
