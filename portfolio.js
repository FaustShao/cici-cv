(() => {
  const count = 31;
  const $ = id => document.getElementById(id);
  const book = $('book');
  const reader = $('reader');
  const mobile = matchMedia('(max-width: 700px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let busy = false;
  let thumbsBuilt = false;
  const source = page => `assets/gazette/page-${String(page + 1).padStart(2, '0')}.jpg`;
  const visible = () => mobile.matches ? [current] : current === 0 ? [-1, 0] : [current, current + 1];
  function image(page) {
    const img = document.createElement('img');
    img.src = source(page);
    img.alt = `Future Gazette 第 ${page + 1} 页`;
    img.draggable = false;
    img.addEventListener('error', () => { $('reader-message').textContent = '页面加载失败，请刷新重试，或下载原始 PDF 阅读。'; });
    return img;
  }
  function sheet(page) {
    const node = document.createElement('div');
    node.className = 'page';
    if (page < 0 || page >= count) node.classList.add('blank');
    else node.append(image(page));
    return node;
  }
  function render() {
    book.replaceChildren(...visible().map(sheet));
    const pages = visible().filter(p => p >= 0 && p < count);
    $('page-number').value = current + 1;
    $('page-status').textContent = current === 0 ? '封面 · 第 1 页' : `第 ${pages.map(p => p + 1).join('–')} 页`;
    $('previous').disabled = current === 0;
    $('next').disabled = current >= count - (mobile.matches ? 1 : 2);
    $('progress').style.width = `${(pages.at(-1) + 1) / count * 100}%`;
    document.querySelectorAll('.thumbnail').forEach((button, index) => {
      if (pages.includes(index)) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    // Preload only the following spread; avoid fetching the whole publication upfront.
    for (let p = pages.at(-1) + 1; p <= Math.min(count - 1, pages.at(-1) + 2); p++) {
      const img = new Image(); img.src = source(p);
    }
  }
  function normalize(page) {
    page = Math.max(0, Math.min(count - 1, page));
    return mobile.matches || page === 0 ? page : page % 2 ? page : page - 1;
  }
  async function navigate(page) {
    if (busy) return;
    const target = normalize(page);
    if (target === current) return;
    busy = true;
    const oldPages = visible();
    const forward = target > current;
    const oldCurrent = current;
    current = target;
    const newPages = visible();
    // Decode incoming images before starting the turn, to avoid a blank sheet.
    try {
      await Promise.all(newPages.filter(p => p >= 0 && p < count).map(p => { const img = new Image(); img.src = source(p); return img.decode(); }));
    } catch {
      current = oldCurrent;
      $('reader-message').textContent = '页面加载失败，请再次翻页重试，或下载 PDF。';
      busy = false;
      render();
      return;
    }
    $('reader-message').textContent = '';
    try {
      if (reduced.matches || reader.classList.contains('zoomed')) { render(); return; }
      if (mobile.matches) {
        await book.animate([{transform:'rotateY(0deg)',opacity:1},{transform:`rotateY(${forward ? -12 : 12}deg)`,opacity:0}],{duration:140,easing:'ease-in',fill:'none'}).finished;
        render();
        await book.animate([{transform:`rotateY(${forward ? 12 : -12}deg)`,opacity:0},{transform:'rotateY(0deg)',opacity:1}],{duration:180,easing:'ease-out'}).finished;
      } else {
        const overlay = document.createElement('div');
        overlay.className = `flip-sheet ${forward ? 'forward' : 'backward'}`;
        const front = document.createElement('div'); front.className = 'flip-face';
        const back = document.createElement('div'); back.className = 'flip-face reverse';
        const frontPage = oldPages[forward ? 1 : 0];
        const backPage = newPages[forward ? 0 : 1];
        if (frontPage >= 0 && frontPage < count) front.append(image(frontPage));
        if (backPage >= 0 && backPage < count) back.append(image(backPage));
        overlay.append(front, back);
        book.replaceChildren(sheet(forward ? oldPages[0] : newPages[0]), sheet(forward ? newPages[1] : oldPages[1]), overlay);
        await overlay.animate([{transform:'rotateY(0deg)'},{transform:`rotateY(${forward ? -180 : 180}deg)`}],{duration:650,easing:'cubic-bezier(.35,.05,.25,1)',fill:'forwards'}).finished;
        render();
      }
    } finally { busy = false; current = normalize(current); render(); }
  }
  function step(direction) {
    navigate(current + (mobile.matches ? direction : direction > 0 && current === 0 ? 1 : direction * 2));
  }
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
  let start;
  $('viewport').addEventListener('touchstart', event => { start = event.touches.length === 1 ? { x:event.touches[0].clientX, y:event.touches[0].clientY } : null; }, {passive:true});
  $('viewport').addEventListener('touchend', event => {
    if (!start || reader.classList.contains('zoomed')) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    start = null;
  }, {passive:true});
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
    if (!busy) render();
  });
  $('zoom').addEventListener('click', () => {
    const zoomed = reader.classList.toggle('zoomed');
    $('zoom').setAttribute('aria-pressed', String(zoomed));
    $('zoom').textContent = zoomed ? '− 缩小' : '＋ 放大';
    $('viewport').scrollTo(0,0);
  });
  if (!reader.requestFullscreen) $('fullscreen').hidden = true;
  $('fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await reader.requestFullscreen(); }
    catch { $('reader-message').textContent = '当前浏览器不支持全屏，请使用放大功能阅读。'; }
  });
  document.addEventListener('fullscreenchange', () => { $('fullscreen').textContent = document.fullscreenElement ? '⛶ 退出全屏' : '⛶ 全屏'; });
  mobile.addEventListener('change', () => { if (!busy) { current = normalize(current); render(); } });
  render();
})();
