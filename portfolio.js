(async () => {
  const count = 31;
  const book = document.getElementById('book');
  const reader = document.getElementById('reader');
  const shell = document.querySelector('.book-shell');
  const status = document.getElementById('reader-message');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sheets = [];
  const images = [];
  const blank = document.createElement('div');
  blank.className = 'paper inside-cover';
  sheets.push(blank);
  for (let page = 1; page <= count; page++) {
    const sheet = document.createElement('div');
    sheet.className = 'paper';
    const img = document.createElement('img');
    img.alt = `Future Gazette 第 ${page} 页`;
    img.draggable = false;
    img.decoding = 'async';
    img.src = `assets/gazette/page-${String(page).padStart(2, '0')}.jpg`;
    sheet.append(img); sheets.push(sheet); images.push(img);
  }
  // Decode before enabling folds: a page must never load or decode mid-drag.
  // The book's dimensions and surrounding layout stay fixed during every turn.
  reader.setAttribute('aria-busy', 'true');
  try { await Promise.all(images.map(img => img.decode())); }
  catch {
    status.classList.remove('sr-only');
    status.textContent = '书页加载失败，请刷新重试，或下载源文件阅读。';
    reader.setAttribute('aria-busy', 'false');
    return;
  }
  book.append(...sheets);
  const flip = new St.PageFlip(book, {
    width: 400, height: 600, size: 'stretch', minWidth: 240, maxWidth: 900,
    minHeight: 360, maxHeight: 1350, autoSize: true, usePortrait: true,
    showCover: false, drawShadow: true, maxShadowOpacity: .28,
    flippingTime: 950, useMouseEvents: true, showPageCorners: false,
    disableFlipByClick: true, mobileScrollSupport: true, swipeDistance: 35,
    startPage: 1
  });
  function announce() {
    const index = flip.getCurrentPageIndex();
    shell.dataset.cover = String(index <= 1);
    status.textContent = `第 ${Math.max(1, index)} 页，共 ${count} 页`;
  }
  flip.on('init', announce);
  flip.on('flip', announce);
  flip.on('changeOrientation', () => {
    if (flip.getOrientation() === 'portrait' && flip.getCurrentPageIndex() === 0) flip.turnToPage(1);
    announce();
  });
  flip.on('changeState', event => { reader.dataset.flipState = event.data; });
  flip.loadFromHTML(sheets);
  reader.setAttribute('aria-busy', 'false');
  document.addEventListener('keydown', event => {
    if (event.target.closest('a') || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = flip.getCurrentPageIndex();
    const single = flip.getOrientation() === 'portrait';
    if (!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') flip.turnToPage(1);
    else if (event.key === 'End') flip.turnToPage(count);
    else if (event.key === 'ArrowRight' && index < (single ? count : count - 1)) {
      if (reduced.matches) flip.turnToNextPage(); else flip.flipNext('bottom');
    } else if (event.key === 'ArrowLeft' && index > 1) {
      if (reduced.matches) flip.turnToPrevPage(); else flip.flipPrev('bottom');
    }
  });
})();
