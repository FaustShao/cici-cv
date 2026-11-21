(() => {
  const count = 31;
  const book = document.getElementById('book');
  const reader = document.getElementById('reader');
  const shell = document.querySelector('.book-shell');
  const status = document.getElementById('reader-message');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stage=document.getElementById('gazette-reader'),fullscreen=document.getElementById('fullscreen-book');
  let flip;
  let lastSize = '';
  const leafToPdf = index => Math.min(index, count - 1);
  const pages = Array.from({length: count}, (_, i) => window.CeciliaAssetURL(`assets/gazette/page-${String(i + 1).padStart(2, '0')}.webp`));
  // A quiet recording, unlocked by a real gesture; never block the reader on audio.
  let soundContext, soundBuffer, soundLoading, soundSource, soundTicket=0, lastSoundAt=-Infinity;
  const soundBytes=fetch('assets/gazette/audio/page-turn.mp3').then(r=>r.ok?r.arrayBuffer():null).catch(()=>null);
  function unlockPageSound(event){
    if(!event.isTrusted)return;
    if(!stage.contains(event.target)&&(event.type!=='keydown'||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)))return;
    try{
      if(!soundContext){
        const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
        soundContext=new Audio();
        soundLoading=soundBytes.then(bytes=>bytes?soundContext.decodeAudioData(bytes):null).then(buffer=>{soundBuffer=buffer;}).catch(()=>{});
      }
      if(soundContext.state==='suspended')soundContext.resume().catch(()=>{});
    }catch{/* Audio is optional; page controls keep working. */}
  }
  stage.addEventListener('pointerdown',unlockPageSound,{capture:true});
  document.addEventListener('keydown',unlockPageSound,{capture:true});
  function playPageSound(){
    if(!soundContext||!soundLoading||document.hidden)return;
    const ticket=++soundTicket,at=performance.now();
    soundLoading.then(()=>{
      if(ticket!==soundTicket||!soundBuffer||soundContext.state!=='running'||document.hidden||performance.now()-at>300||at-lastSoundAt<100)return;
      try{
        lastSoundAt=at;if(soundSource)soundSource.stop();
        const source=soundContext.createBufferSource(),gain=soundContext.createGain();
        source.buffer=soundBuffer;gain.gain.value=.16;source.connect(gain);gain.connect(soundContext.destination);
        soundSource=source;source.onended=()=>{source.disconnect();gain.disconnect();if(soundSource===source)soundSource=null;};source.start();
      }catch{/* Silence is preferable to interrupting a page turn. */}
    }).catch(()=>{});
  }

  function build() {
    const padding = getComputedStyle(reader);
    const availableHeight = Math.max(150, reader.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom) - 8);
    const availableWidth = reader.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
    const single = matchMedia('(max-width: 700px)').matches || availableWidth < 460;
    const pageWidth = Math.floor(Math.min(availableWidth / (single ? 1 : 2), availableHeight * 2 / 3));
    const key = `${single}:${pageWidth}`;
    if (key === lastSize) return;
    const realPage = flip ? Math.max(0, leafToPdf(flip.getCurrentPageIndex())) : 0;
    if (flip) flip.destroy();
    lastSize = key;
    shell.style.width = `${pageWidth * (single ? 1 : 2)}px`;
    shell.style.height = `${pageWidth * 1.5}px`;
    shell.style.setProperty('--page-width',pageWidth+'px');
    shell.dataset.single = String(single);
    const root = document.createElement('div'); root.id = 'book'; root.className = 'book';
    shell.prepend(root);
    const sheets = [];
    pages.forEach((src, i) => {
      // A rear board needs an inside face so the final PDF page closes alone.
      if (i === count - 1) {
        const inside = document.createElement('div'); inside.className = 'paper endpaper';
        inside.dataset.density = 'hard'; inside.setAttribute('aria-label', '封底内侧'); sheets.push(inside);
      }
      const sheet = document.createElement('div'); sheet.className = 'paper';
      if (i < 2 || i === count - 1) sheet.dataset.density = 'hard';
      sheet.dataset.pdfPage = String(i + 1);
      const label = document.createElement('div'); label.className = 'page-placeholder';
      label.hidden = true;
      const img = document.createElement('img'); img.alt = `Future Gazette 第 ${i + 1} 页`; img.draggable = false;
      // Image readiness never blocks the reader or any other page.
      img.addEventListener('load', () => { label.hidden = true; img.style.opacity = '1'; });
      img.addEventListener('error', () => { label.hidden = false; label.textContent = `第 ${i + 1} 页暂未加载，点击重试`; sheet.classList.add('load-failed'); });
      sheet.addEventListener('click', () => { if (sheet.classList.contains('load-failed')) { sheet.classList.remove('load-failed'); label.hidden=true;label.textContent='';img.src = src; } });
      img.decoding = 'async'; img.loading = Math.abs(i - realPage) < 2 ? 'eager' : 'lazy';
      img.fetchPriority = i === realPage ? 'high' : 'low';
      img.sizes = `${pageWidth}px`;
      img.srcset = `${src.replace('.webp', '-small.webp')} 640w, ${src} 1067w`;
      img.src = src;
      const surface = document.createElement('div'); surface.className = 'paper-surface';
      surface.append(label, img); sheet.append(surface); sheets.push(sheet);
    });
    flip = new St.PageFlip(root, {
      width: pageWidth, height: pageWidth * 1.5, size: 'fixed',
      autoSize: true, usePortrait: single, showCover: true,
      drawShadow: true, maxShadowOpacity: .48, flippingTime: 900,
      useMouseEvents: true, showPageCorners: false, disableFlipByClick: false,
      mobileScrollSupport: true, swipeDistance: 35, startPage: realPage === count - 1 ? count : realPage
    });
    let initialized=false,previousIndex=realPage;
    flip.on('init',()=>{initialized=true;previousIndex=flip.getCurrentPageIndex();announce();});
    flip.on('flip',()=>{
      const next=flip.getCurrentPageIndex();
      if(initialized&&next!==previousIndex)playPageSound();
      previousIndex=next;announce();
    });
    flip.on('changeState', event => { reader.dataset.flipState = event.data; });
    installSideDrag(flip);
    flip.loadFromHTML(sheets);
    reader.setAttribute('aria-busy', 'false');
  }
  // Adapt the pinned library's pointer coordinates without changing its source.
  // A grab in the middle band moves a vertical crease; corner grabs stay free.
  function installSideDrag(instance) {
    const start = instance.startUserTouch.bind(instance);
    const move = instance.userMove.bind(instance);
    const stop = instance.userStop.bind(instance);
    let grab = null;
    const mapped = point => grab ? { x: grab.edge + point.x - grab.x, y: grab.top + .1 } : point;
    instance.startUserTouch = point => {
      const rect = instance.getBoundsRect();
      const fraction = (point.y - rect.top) / rect.height;
      if (fraction > .28 && fraction < .72) {
        const single = instance.getOrientation() === 'portrait';
        const visibleLeft = rect.left + (single ? rect.pageWidth : 0);
        const backwards = point.x < (single ? visibleLeft + rect.width / 5 : rect.left + rect.pageWidth);
        grab = { x: point.x, top: rect.top, edge: backwards ? visibleLeft + .1 : rect.left + rect.width - .1 };
        shell.dataset.dragMode = 'side';
      } else { grab = null; shell.dataset.dragMode = 'corner'; }
      start(mapped(point));
    };
    instance.userMove = (point, touch) => move(mapped(point), touch);
    instance.userStop = (point, swipe) => { stop(mapped(point), swipe); grab = null; };
  }
  function announce() {
    const index = flip.getCurrentPageIndex();
    for (let i = Math.max(0, index - 2); i <= Math.min(count, index + 4); i++) {
      const img = flip.getPage(i).getElement().querySelector('img');
      if (img) img.loading = 'eager';
    }
    shell.dataset.cover = String(index === 0);
    shell.dataset.frontSpread = String(index <= 1);
    shell.dataset.rearSpread = String(index >= count - 2);
    shell.dataset.backCover = String(index === count);
    status.textContent = index === count - 1 ? '封底内侧' : `第 ${leafToPdf(index) + 1} 页，共 ${count} 页`;
    document.dispatchEvent(new CustomEvent('gazette-page-change',{detail:{page:index===count?count:Math.min(index+1,count-1),single:shell.dataset.single==='true'}}));
  }
  book.remove();
  build();
  window.GAZETTE_BOOK={
    getPage:()=>flip.getCurrentPageIndex()===count?count:Math.min(flip.getCurrentPageIndex()+1,count-1),
    isSingle:()=>shell.dataset.single==='true',
    goToPage(page){
      const target=Math.max(1,Math.min(count,Math.round(page)));
      flip.turnToPage(target===count?count:target-1);
      announce();
    }
  };
  if(!reduced.matches){
    reader.dataset.entering='true';
    reader.querySelector('.book-pose').addEventListener('animationend',()=>{delete reader.dataset.entering;},{once:true});
  }
  reduced.addEventListener('change',()=>{if(reduced.matches)delete reader.dataset.entering;});
  function syncFullscreen(){
    const active=!!document.fullscreenElement||stage.classList.contains('is-expanded');
    fullscreen.setAttribute('aria-pressed',String(active));fullscreen.textContent=active?'退出全屏 ⛶':'全屏阅读 ⛶';
    requestAnimationFrame(build);
  }
  fullscreen.addEventListener('click',async()=>{
    if(document.fullscreenElement){await document.exitFullscreen();return;}
    if(stage.classList.contains('is-expanded')){stage.classList.remove('is-expanded');syncFullscreen();return;}
    try{if(!stage.requestFullscreen)throw Error('Fullscreen unavailable');await stage.requestFullscreen();}
    catch{stage.classList.add('is-expanded');syncFullscreen();}
  });
  document.addEventListener('fullscreenchange',syncFullscreen);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&stage.classList.contains('is-expanded')){stage.classList.remove('is-expanded');syncFullscreen();}});
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 200); });
  new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 100); }).observe(reader);
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.target.closest('a,button,input,textarea,select,aside,.research-detail') || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = flip.getCurrentPageIndex();
    if (!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') flip.turnToPage(0);
    else if (event.key === 'End') flip.turnToPage(count);
    else if (event.key === 'ArrowRight' && index < count) {
      if (reduced.matches) flip.turnToNextPage(); else flip.flipNext('bottom');
    } else if (event.key === 'ArrowLeft' && index > 0) {
      if (reduced.matches) flip.turnToPrevPage(); else flip.flipPrev('bottom');
    }
  });
})();
