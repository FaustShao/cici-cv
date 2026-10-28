(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const panel = $('place-panel'), reader = $('project-reader');
  const projects = (window.RESUME?.projects || []).filter(p => p.collection === 'portfolio');
  const names = {resume:'个人简历', portfolio:'作品集', other:'其他项目', contact:'联系方式'};
  let selected = 0, currentPlace = '', activeFrame;
  let touchX, touchY, archiveSwipedAt = -1000;
  const frames = new Map();
  const emit = (name, detail = {}) => window.dispatchEvent(new CustomEvent(`island:${name}`, {detail}));
  const syncModal = () => { document.body.classList.toggle('modal-open', panel.open || reader.open); emit('modal', {open: panel.open || reader.open}); };
  function setTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#172d51' : '#9dd8eb';
    $('island-theme').setAttribute('aria-pressed', String(dark));
    $('island-theme').setAttribute('aria-label', dark ? '切换至日间' : '切换至夜晚');
    document.querySelector('.theme-caption').textContent = dark ? '夜间' : '日间';
    try { localStorage.setItem('resume-theme', dark ? 'dark' : 'light'); } catch {}
    emit('theme', {dark});
  }
  let saved; try { saved = localStorage.getItem('resume-theme'); } catch {}
  setTheme(saved === 'dark');
  $('island-theme').onclick = () => setTheme(document.documentElement.dataset.theme !== 'dark');
  $('copyright-year').textContent = new Date().getFullYear();
  document.querySelector('[data-island-profile="summary"]').textContent = window.RESUME?.summary || '';
  function selectFile(index) {
    selected = (index + projects.length) % projects.length;
    const project = projects[selected]; if (!project) return;
    document.querySelectorAll('[data-file]').forEach((file, i) => {
      let offset = i - selected;
      if (offset > 1) offset -= projects.length;
      if (offset < -1) offset += projects.length;
      file.style.setProperty('--file-x', `${offset * 105}px`);
      file.style.setProperty('--file-rotation', `${offset ? offset * 9 : -2}deg`);
      file.style.setProperty('--file-y', `${offset ? 23 : 0}px`);
      file.style.setProperty('--file-scale', offset ? '.90' : '1');
      file.style.setProperty('--file-z', offset ? 3 - Math.abs(offset) : 5);
      file.setAttribute('aria-pressed', String(i === selected));
    });
    document.querySelectorAll('[data-select-file]').forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
    $('archive-position').textContent = String(selected + 1).padStart(2,'0');
    $('archive-category').textContent = project.category;
    $('archive-name').textContent = project.name;
    $('archive-description').textContent = project.description;
    $('archive-tags').replaceChildren(...(project.tags || []).map(tag => { const span = document.createElement('span'); span.textContent = tag; return span; }));
    $('project-direct').href = project.url;
  }
  document.querySelectorAll('[data-file]').forEach(file => file.onclick = () => {
    // A touch swipe can synthesize a click on the old card; don't undo the flip.
    if (performance.now() - archiveSwipedAt > 400) selectFile(Number(file.dataset.file));
  });
  document.querySelectorAll('[data-select-file]').forEach(button => button.onclick = () => selectFile(Number(button.dataset.selectFile)));
  $('archive-prev').onclick = () => selectFile(selected - 1);
  $('archive-next').onclick = () => selectFile(selected + 1);
  $('archive-fan').addEventListener('keydown', e => { if (['ArrowLeft','ArrowRight'].includes(e.key)) { e.preventDefault(); selectFile(selected + (e.key === 'ArrowRight' ? 1 : -1)); } });
  $('archive-fan').addEventListener('touchstart', e => {touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;}, {passive:true});
  $('archive-fan').addEventListener('touchend', e => {
    const distance = e.changedTouches[0].clientX - touchX;
    const vertical = e.changedTouches[0].clientY - touchY;
    if (Math.abs(distance) > 45 && Math.abs(distance) > Math.abs(vertical) * 1.2) {
      archiveSwipedAt = performance.now(); selectFile(selected + (distance < 0 ? 1 : -1));
    }
  }, {passive:true});
  selectFile(0);
  (window.RESUME?.projects || []).filter(p => p.collection !== 'portfolio').forEach((p, i) => {
    const card = document.createElement('article'); card.className = 'side-project';
    const number = document.createElement('span'); number.className = 'side-number'; number.textContent = `0${i + 1}`;
    const heading = document.createElement('h3'); heading.textContent = p.name;
    const description = document.createElement('p'); description.textContent = p.description;
    const tags = document.createElement('p'); tags.className = 'small-caps'; tags.textContent = (p.tags || []).join(' / ');
    card.append(number, heading, description, tags);
    if (p.details?.length) { const list = document.createElement('ul'); p.details.forEach(detail => {const li = document.createElement('li'); li.textContent = detail; list.append(li);}); card.append(list); }
    $('side-projects').append(card);
  });
  function closeReader() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (reader.open) reader.close();
    if (activeFrame) { try {activeFrame.contentDocument.querySelectorAll('video,audio').forEach(media => media.pause());} catch {} }
    syncModal();
  }
  function closePanel() {
    closeReader(); if (panel.open) panel.close(); currentPlace = '';
    history.replaceState(null, '', location.pathname + location.search);
    syncModal(); emit('reset');
  }
  function openPlace(place, updateHash = true) {
    if (!names[place]) return;
    closeReader(); currentPlace = place;
    document.querySelectorAll('[data-panel]').forEach(section => { section.hidden = section.dataset.panel !== place; });
    $('panel-title').textContent = names[place];
    $('panel-kicker').textContent = `${Object.keys(names).indexOf(place) + 1} / ${names[place]}`;
    if (!panel.open) panel.showModal();
    panel.scrollTop = 0;
    if (updateHash) history.pushState({place}, '', `#${place}`);
    emit('place', {place}); syncModal();
  }
  window.openIslandPlace = openPlace;
  document.querySelectorAll('[data-place]').forEach(link => link.addEventListener('click', e => { e.preventDefault(); openPlace(link.dataset.place); }));
  $('panel-close').onclick = closePanel;
  $('panel-home').onclick = e => {e.preventDefault(); closePanel();};
  panel.addEventListener('cancel', e => {e.preventDefault(); closePanel();});
  reader.addEventListener('cancel', e => {e.preventDefault(); closeReader();});
  $('reader-back').onclick = closeReader;
  $('reset-view').onclick = () => emit('reset');
  function readProject(url, name) {
    $('reader-title').textContent = name; $('reader-direct').href = url;
    $('reader-back').textContent = currentPlace === 'resume' ? '← 返回简历概览' : '← 返回档案';
    frames.forEach(frame => { frame.hidden = true; });
    let frame = frames.get(url);
    if (!frame) {
      frame = document.createElement('iframe'); frame.title = name; frame.src = url; frame.setAttribute('allow', 'fullscreen');
      $('reader-loading').hidden = false;
      frame.addEventListener('load', () => {
        frame.dataset.loaded = 'true'; if (activeFrame === frame) $('reader-loading').hidden = true;
        try { frame.contentDocument.addEventListener('click', e => {
          const link = e.target.closest('a'); if (!link || link.target === '_blank') return;
          const target = new URL(link.href); if (target.origin !== location.origin) return;
          const file = target.pathname.split('/').pop();
          const routes = {'portfolio.html':'portfolio','works.html':'other','resume.html':'resume'};
          if (file === 'index.html' || routes[file]) {e.preventDefault(); closeReader(); if (file === 'index.html') closePanel(); else openPlace(routes[file]);}
        }); } catch {}
      });
      frames.set(url, frame); $('reader-frames').append(frame);
    }
    activeFrame = frame; frame.hidden = false;
    $('reader-loading').hidden = frame.dataset.loaded === 'true';
    if (!reader.open) reader.showModal(); syncModal();
  }
  $('read-project').onclick = () => readProject(projects[selected].url, projects[selected].name);
  $('read-resume').onclick = () => readProject('resume.html', '王钰欣 / YUXIN WANG · 简历');
  $('browser-fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await reader.requestFullscreen(); } catch { $('browser-fullscreen').textContent = '请使用独立打开 ↗'; } };
  $('copy-wechat').onclick = async () => {try {await navigator.clipboard.writeText('Cecilia_cici68'); $('contact-feedback').textContent = '微信号已复制：Cecilia_cici68';} catch {$('contact-feedback').textContent = '微信号：Cecilia_cici68（请长按或选中复制）';} };
  window.addEventListener('popstate', () => {const place = location.hash.slice(1); if (names[place]) openPlace(place, false); else closePanel();});
  if (names[location.hash.slice(1)]) openPlace(location.hash.slice(1), false);
})();
