(() => {
  const count = 31;
  const $ = id => document.getElementById(id);
  const book = $('book');
  const reader = $('reader');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let thumbsBuilt = false;
  const source = page => `assets/gazette/page-${String(page + 1).padStart(2, '0')}.jpg`;
  // An empty inside cover keeps the original cover on the right, while all
  // publication sheets remain soft and can fold under the pointer.
  const blank = document.createElement('div'); blank.className = 'paper inside-cover';
  book.append(blank);
  for (let page = 0; page < count; page++) {
    const sheet = document.createElement('div'); sheet.className = 'paper';
    const img = document.createElement('img');
    img.dataset.src = source(page); img.alt = `Future Gazette 第 ${page + 1} 页`; img.draggable = false;
    img.addEventListener('error', () => { $('reader-message').textContent = '页面加载失败，请刷新重试，或下载 PDF 阅读。'; });
    sheet.append(img); book.append(sheet);
  }
  const flip = new St.PageFlip(book, {
    width: 400, height: 600, size: 'stretch', minWidth: 260, maxWidth: 900,
    minHeight: 390, maxHeight: 1350, autoSize: true, usePortrait: true,
    showCover: false, drawShadow: true, maxShadowOpacity: .35,
    flippingTime: 850, useMouseEvents: !reduced.matches, showPageCorners: !reduced.matches,
    disableFlipByClick: true, mobileScrollSupport: true, swipeDistance: 35,
    startPage: 1
  });
  function render() {
    const index = flip.getCurrentPageIndex();
    const single = flip.getOrientation() === 'portrait';
    const indices = (single ? [index] : [index, index + 1]).filter(i => i > 0 && i <= count);
    const start = indices[0] || 1;
    const end = indices.at(-1) || 1;
    $('page-number').value = start;
    $('page-status').textContent = end === 1 ? '封面 · 第 1 页' : `第 ${start === end ? start : `${start}–${end}`} 页`;
    $('previous').disabled = index <= 1;
    $('next').disabled = end >= count;
    $('progress').style.width = `${end / count * 100}%`;
    document.querySelectorAll('.thumbnail').forEach((button, page) => {
      if (indices.includes(page + 1)) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    // Load the current sheets and their neighbours for immediate corner dragging.
    for (let i = Math.max(0, index - 2); i <= Math.min(count, index + 4); i++) {
      const img = flip.getPage(i).getElement().querySelector('img');
      if (img && !img.getAttribute('src')) img.src = img.dataset.src;
    }
  }
  function navigate(page) {
    const target = Math.max(0, Math.min(count - 1, page)) + 1;
    flip.turnToPage(target); render();
  }
  function step(direction) {
    if (direction < 0 && $('previous').disabled || direction > 0 && $('next').disabled) return;
    if (reduced.matches) {
      if (direction > 0) flip.turnToNextPage(); else flip.turnToPrevPage();
      render();
    } else if (direction > 0) flip.flipNext('bottom'); else flip.flipPrev('bottom');
  }
  flip.on('init', render);
  flip.on('flip', render);
  flip.on('changeOrientation', () => { if (flip.getOrientation() === 'portrait' && flip.getCurrentPageIndex() === 0) flip.turnToPage(1); render(); });
  flip.on('changeState', event => { reader.dataset.flipState = event.data; });
  flip.loadFromHTML(book.querySelectorAll('.paper'));
  $('previous').addEventListener('click', () => step(-1));
  $('next').addEventListener('click', () => step(1));
  $('page-form').addEventListener('submit', event => { event.preventDefault(); if ($('page-form').reportValidity()) navigate(Number($('page-number').value) - 1); });
  document.addEventListener('keydown', event => {
    if (event.target.closest('input,textarea,select,button,a') || event.altKey || event.ctrlKey || event.metaKey) return;
    if (['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) event.preventDefault();
    if (event.key === 'ArrowRight') step(1);
    if (event.key === 'ArrowLeft') step(-1);
    if (event.key === 'Home') navigate(0);
    if (event.key === 'End') navigate(count - 1);
  });
  $('thumbnails-toggle').addEventListener('click', () => {
    const show = $('thumbnails').hidden;
    if (!thumbsBuilt) {
      for (let page = 0; page < count; page++) {
        const button = document.createElement('button'); button.className = 'thumbnail'; button.type = 'button'; button.setAttribute('aria-label', `跳转到第 ${page + 1} 页`);
        const img = document.createElement('img');
        img.loading = 'lazy'; img.src = `assets/gazette/thumb-${String(page + 1).padStart(2, '0')}.jpg`;
        img.alt = `第 ${page + 1} 页缩略图`;
        const label = document.createElement('span'); label.textContent = page + 1;
        button.append(img, label); button.addEventListener('click', () => navigate(page)); $('thumbnails').append(button);
      }
      thumbsBuilt = true;
    }
    $('thumbnails').hidden = !show;
    $('thumbnails-toggle').setAttribute('aria-expanded', String(show));
    render();
  });
  $('zoom').addEventListener('click', () => {
    const zoomed = reader.classList.toggle('zoomed');
    $('zoom').setAttribute('aria-pressed', String(zoomed));
    $('zoom').textContent = zoomed ? '− 缩小' : '＋ 放大';
    $('viewport').scrollTo(0,0);
    setTimeout(() => flip.update(), 50);
  });
  if (!reader.requestFullscreen) $('fullscreen').hidden = true;
  $('fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await reader.requestFullscreen(); }
    catch { $('reader-message').textContent = '当前浏览器不支持全屏，请使用放大功能阅读。'; }
  });
  document.addEventListener('fullscreenchange', () => { $('fullscreen').textContent = document.fullscreenElement ? '⛶ 退出全屏' : '⛶ 全屏'; });
  render();
})();
