(() => {
  const count = 31;
  const book = document.getElementById('book');
  const reader = document.getElementById('reader');
  const shell = document.querySelector('.book-shell');
  const status = document.getElementById('reader-message');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let flip;
  let lastSize = '';
  const leafToPdf = index => Math.min(index, count - 1);
  const pages = Array.from({length: count}, (_, i) => `assets/gazette/page-${String(i + 1).padStart(2, '0')}.webp`);
  function build() {
    const single = matchMedia('(max-width: 700px)').matches;
    const availableHeight = Math.max(150, reader.clientHeight - 36);
    const pageWidth = Math.floor(Math.min(550, (reader.clientWidth - 24) / (single ? 1 : 2), availableHeight * 2 / 3));
    const key = `${single}:${pageWidth}`;
    if (key === lastSize) return;
    const realPage = flip ? Math.max(0, leafToPdf(flip.getCurrentPageIndex())) : 0;
    if (flip) flip.destroy();
    lastSize = key;
    shell.style.width = `${pageWidth * (single ? 1 : 2)}px`;
    shell.style.height = `${pageWidth * 1.5}px`;
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
      const label = document.createElement('span'); label.className = 'page-placeholder'; label.textContent = `第 ${i + 1} 页 · 加载中`;
      const img = document.createElement('img'); img.alt = `Future Gazette 第 ${i + 1} 页`; img.draggable = false;
      // Image readiness never blocks the reader or any other page.
      img.addEventListener('load', () => { label.hidden = true; img.style.opacity = '1'; });
      img.addEventListener('error', () => { label.textContent = `第 ${i + 1} 页暂未加载，点击重试`; sheet.classList.add('load-failed'); });
      sheet.addEventListener('click', () => { if (sheet.classList.contains('load-failed')) { sheet.classList.remove('load-failed'); label.textContent = '正在重试…'; img.src = src; } });
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
      useMouseEvents: true, showPageCorners: false, disableFlipByClick: true,
      mobileScrollSupport: true, swipeDistance: 35, startPage: realPage === count - 1 ? count : realPage
    });
    flip.on('init', announce);
    flip.on('flip', announce);
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
  }
  book.remove();
  build();
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 200); });
  document.addEventListener('keydown', event => {
    if (event.target.closest('a') || event.altKey || event.ctrlKey || event.metaKey) return;
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
