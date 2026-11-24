(() => {
  const {characters, sections} = cardinalCatalog;
  const file = name => asset('archive/' + name);
  const el = (tag, text) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  };
  const dialog = byId('archive-view');
  let activePlayer;
  let detailPlayer;
  let collection;
  let selected;
  const stage = (entry, full = false) => {
    const node = el('span');
    node.className = 'art-stage';
    const img = new Image();
    img.alt = entry.title;
    img.loading = full ? 'eager' : 'lazy';
    img.src = file(full ? entry.full : entry.thumb);
    node.append(img);
    return node;
  };

  // Draw decoded cells explicitly. Replacing an <img> URL cannot report whether its
  // animation has actually started, and some browsers freeze animated images.
  function player(surface, clip, notify) {
    let canvas, sheet, ctx, ready, index = 0, timer, request = 0, playing = false;
    function draw() {
      ctx.clearRect(0,0,clip.side,clip.side);
      ctx.drawImage(sheet, (index % clip.columns)*clip.side, Math.floor(index/clip.columns)*clip.side,
        clip.side,clip.side,0,0,clip.side,clip.side);
      if (!canvas.isConnected) surface.append(canvas);
      surface.classList.add('show-motion');
      notify(playing ? 'playing' : 'paused', index);
    }
    function advance() {
      timer = setTimeout(() => {
        index = (index+1) % clip.durations.length;
        draw();
        advance();
      },clip.durations[index]);
    }
    function stop() {
      request++;
      clearTimeout(timer);
      playing = false;
      index = 0;
      canvas?.remove();
      if (canvas) canvas.width = canvas.height = 0;
      if (sheet) sheet.removeAttribute('src');
      canvas = sheet = ctx = ready = null;
      surface.classList.remove('show-motion');
      if (activePlayer === api) activePlayer = null;
      notify('stopped', index);
    }
    async function show(run, step = 0) {
      if (activePlayer !== api) activePlayer?.stop();
      activePlayer = api;
      clearTimeout(timer);
      playing = false;
      const ticket = ++request;
      if (!ready) {
        canvas = el('canvas');
        canvas.width = canvas.height = clip.side;
        canvas.setAttribute('aria-hidden','true');
        ctx = canvas.getContext('2d');
        sheet = new Image();
        sheet.src = file(clip.sheet);
        ready = sheet.decode();
        notify('loading',index);
      }
      try {
        await ready;
        if (ticket !== request) return;
        index = (index + step + clip.durations.length) % clip.durations.length;
        playing = run;
        draw();
        if (run) advance();
      } catch {
        if (ticket !== request) return;
        stop();
        ready = null;
        notify('error',index);
      }
    }
    const api = {stop, show, get playing() {return playing;}};
    return api;
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) activePlayer?.stop(); });
  window.addEventListener('pagehide', () => activePlayer?.stop());
  function button(text, handler) {
    const node = el('button',text);
    node.type = 'button';
    node.onclick = handler;
    return node;
  }

  function characterCard(entry) {
    const card = el('article');
    card.className = 'character';
    const surface = stage(entry);
    const clip = entry.motions?.[0];
    const label = el('small');
    const art = button('', () => {
      if (!clip) return openItem(characters, entry);
      if (activePlayer === controller) controller.stop();
      else controller.show(true);
    });
    art.className = 'character-action';
    art.append(surface);
    const line = el('span',entry.title);
    line.className = 'character-caption';
    line.append(label);
    art.append(line);
    const controller = clip && player(surface,clip,(state,frame) => {
      label.textContent = {playing:'停止 □ '+(frame+1)+'/'+clip.durations.length,loading:'正在载入…',error:'重试播放',stopped:'播放动作 ▷'}[state];
      art.setAttribute('aria-pressed',String(state === 'playing'));
    });
    label.textContent = clip ? '播放动作 ▷' : '查看原画 ↗';
    if (clip) art.setAttribute('aria-pressed','false');
    card.append(art);
    if (clip) {
      const details = button('原画与分帧 ↗', () => openItem(characters,entry));
      details.className = 'art-details';
      card.append(details);
    }
    return card;
  }
  const featured = ['盾卫','火球法师','游侠','章鱼 Boss'];
  for (const label of featured) byId('characters').append(characterCard(characters.find(e=>e.title===label)));
  for (const entry of characters.filter(e=>!featured.includes(e.title))) byId('roster').append(characterCard(entry));

  const captions = {
    '低保真与界面方案':'线框稿记录九宫格和操作区的位置。彩色卡牌、书本和彩铅方案保留了各自的画板。',
    '角色与卡牌设定':'弓箭手、死灵法师、招募者和剑士的卡面可以切换合成图、背景和人物分层。',
    'Boss 与特效':'查看小幽灵、树精、烟雾与章鱼的不同状态，以及伤口笔画。带动作的条目支持逐帧查看。',
    '参考资料':'此处收录项目调研时保存的草图及游戏参考图。PureRef 参考板可以下载后查看。',
    '界面组件':'棋盘、纸框、卡底和按钮的拆分原件。牌堆卡边与状态条笔画均按原导出展示。'
  };
  function chooseSection(index) {
    const section = sections[index];
    const grid = byId('archive-grid');
    grid.replaceChildren();
    [...byId('archive-tabs').children].forEach((tab,i)=>tab.setAttribute('aria-pressed',String(i===index)));
    byId('archive-caption').textContent = captions[section.title] || '';
    for (const entry of section.items) {
      const card = button('',()=>openItem(section.items,entry));
      card.append(stage(entry),el('span',entry.title));
      if (entry.motions) card.append(el('small','查看动作 ▷'));
      grid.append(card);
    }
  }
  sections.forEach((section,i)=>byId('archive-tabs').append(button(section.title,()=>chooseSection(i))));
  chooseSection(0);

  function openItem(items,entry) {
    collection = items;
    selected = collection.indexOf(entry);
    if (!dialog.open) dialog.showModal();
    showItem();
  }
  function showItem() {
    activePlayer?.stop();
    const entry = collection[selected];
    byId('archive-name').textContent = entry.title;
    const variants = byId('archive-versions');
    variants.replaceChildren();
    const options = [{name:entry.overall || (entry.layers ? '完整卡面' : '原画'), image:entry},
      ...(entry.layers || []).map(layer=>({name:layer.title.split(' · ').pop(),image:layer})),
      ...(entry.motions || []).map(clip=>({name:clip.title,clip}))];
    function select(i) {
      activePlayer?.stop();
      detailPlayer = null;
      const {image,clip} = options[i];
      const surface = stage(image || entry,true);
      const stageBox = byId('archive-stage');
      stageBox.classList.remove('magnified');
      stageBox.replaceChildren(surface);
      const zoom = byId('archive-zoom');
      zoom.hidden = Boolean(clip);
      zoom.textContent = '放大细看';
      zoom.setAttribute('aria-pressed','false');
      [...variants.children].forEach((v,n)=>v.setAttribute('aria-pressed',String(n===i)));
      byId('archive-playback').hidden = !clip;
      const paths = (image || clip).sources;
      byId('archive-source').textContent = paths.length > 2 ? paths[0]+' … '+paths.at(-1) : paths.join(' ｜ ');
      if (clip) {
        detailPlayer = player(surface,clip,(state,frame)=>{
          byId('frame-number').textContent = (frame+1)+' / '+clip.durations.length;
          byId('frame-play').textContent = {playing:'暂停',loading:'正在载入…',error:'重试播放',paused:'继续播放',stopped:'播放动作'}[state];
        });
        detailPlayer.show(true);
      }
    }
    if (options.length>1) options.forEach((v,i)=>variants.append(button(v.name,()=>select(i))));
    select(entry.motions && !characters.includes(entry) ? 1 : 0);
    const download = byId('archive-download');
    download.hidden = !entry.download;
    if (entry.download) download.href = file(entry.download);
    byId('item-prev').disabled = selected === 0;
    byId('item-next').disabled = selected === collection.length - 1;
    dialog.querySelector('.archive-body').scrollTop = 0;
  }
  byId('frame-prev').onclick = () => detailPlayer?.show(false,-1);
  byId('frame-next').onclick = () => detailPlayer?.show(false,1);
  byId('frame-play').onclick = () => detailPlayer?.show(!detailPlayer.playing);
  byId('item-prev').onclick = () => {selected--;showItem();};
  byId('item-next').onclick = () => {selected++;showItem();};
  byId('archive-zoom').onclick = event => {
    const stageBox = byId('archive-stage');
    const enabled = stageBox.classList.toggle('magnified');
    stageBox.style.setProperty('--source-width',(stageBox.querySelector('img').naturalWidth || 960)+'px');
    event.currentTarget.setAttribute('aria-pressed',String(enabled));
    event.currentTarget.textContent = enabled ? '适应窗口' : '放大细看';
  };
  byId('archive-close').onclick = () => dialog.close();
  dialog.addEventListener('close',()=>{detailPlayer?.stop();detailPlayer=null;});
})();
