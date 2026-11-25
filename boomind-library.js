(() => {
  'use strict';
  const dialog = document.getElementById('asset-library');
  const index = document.getElementById('library-index');
  const detail = document.getElementById('library-detail');
  const filters = document.getElementById('library-filters');
  const grid = document.getElementById('library-items');
  const image = document.getElementById('library-image');
  const back = document.getElementById('library-back');
  const close = document.getElementById('library-close');
  const help = document.getElementById('library-help');
  const opener = document.getElementById('open-library');
  const revision = document.querySelector('meta[name="cecilia-release"]')?.content;
  const url = path => 'assets/boomind/' + path + (revision ? '?build=' + encodeURIComponent(revision) : '');
  let catalog, request, selectedCard, listScroll = 0;

  function showGroup(group) {
    const cards = [];
    for (const [i, item] of catalog.entries()) {
      if (group !== '全部' && item.group !== group) continue;
      const card = document.createElement('button');
      card.type = 'button';
      card.dataset.item = i;
      const thumb = new Image();
      thumb.loading = 'lazy';
      thumb.alt = '';
      if (item.light) thumb.classList.add('light-preview');
      thumb.src = url(item.thumb);
      const caption = document.createElement('span');
      caption.textContent = item.name;
      card.append(thumb, caption);
      cards.push(card);
    }
    grid.replaceChildren(...cards);
    for (const b of filters.children) b.setAttribute('aria-pressed', String(b.textContent === group));
    index.scrollTop = 0;
  }

  async function load() {
    help.textContent = '正在加载素材目录…';
    try {
      catalog = await (request ??= fetch(url('library/catalog.json')).then(r => {
        if (!r.ok) throw new Error('Catalog unavailable');
        return r.json();
      }));
      if (!filters.children.length) {
        for (const group of ['全部', ...new Set(catalog.map(item => item.group))]) {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = group;
          b.onclick = () => showGroup(group);
          filters.append(b);
        }
        showGroup('全部');
      }
      help.textContent = '右键或点按素材可放大查看。';
    } catch {
      request = null;
      help.textContent = '素材目录未能加载。';
      const retry = document.createElement('button');
      retry.textContent = '重新加载';
      retry.onclick = load;
      grid.replaceChildren(retry);
    }
  }

  function inspect(event) {
    const card = event.target.closest('[data-item]');
    if (!card) return;
    event.preventDefault();
    selectedCard = card;
    listScroll = index.scrollTop;
    const item = catalog[Number(card.dataset.item)];
    image.src = url(item.src);
    image.alt = item.name;
    image.classList.toggle('light-preview', !!item.light);
    document.getElementById('library-caption').textContent = item.name;
    index.hidden = help.hidden = true;
    detail.hidden = false;
    close.setAttribute('aria-label', '关闭素材预览');
    back.focus({preventScroll: true});
  }
  function toIndex() {
    detail.hidden = true;
    image.removeAttribute('src');
    index.hidden = help.hidden = false;
    close.setAttribute('aria-label', '关闭素材库');
    index.scrollTop = listScroll;
    selectedCard?.focus({preventScroll: true});
  }
  opener.onclick = () => {
    dialog.showModal();
    if (!catalog) load();
  };
  grid.addEventListener('contextmenu', inspect);
  grid.addEventListener('click', inspect);
  back.onclick = toIndex;
  close.onclick = () => detail.hidden ? dialog.close() : toIndex();
  dialog.addEventListener('cancel', event => {
    if (!detail.hidden) {
      event.preventDefault();
      toIndex();
    }
  });
  dialog.addEventListener('close', () => {
    if (!detail.hidden) toIndex();
    opener.focus({preventScroll: true});
  });
})();
