(() => {
  'use strict';
  const frames = window.BOOMIND_FRAMES;
  const byId = (id) => document.getElementById(id);
  const stage = byId('stage'),
    popup = byId('popup'),
    content = byId('popup-content');
  const mobile = matchMedia('(max-width: 740px)');
  const revision = document.querySelector('meta[name="cecilia-release"]')?.content;
  const asset = (name) =>
    'assets/boomind/' + name + '.webp' + (revision ? '?build=' + encodeURIComponent(revision) : '');
  const full = [0, 0, 1194, 849];
  const menu = [
    ['home', 'Overview'],
    ['products', 'Products'],
    ['files', 'File library'],
    ['calendar', 'Schedules'],
    ['market', 'Material market'],
    ['statement', 'Statement'],
    ['profile', 'Settings'],
    ['inbox', 'Inbox', 18],
    ['notifications', 'Notifications', 2],
    ['comments', 'Comments', 20],
  ];
  const dashboards = new Set([
    'home',
    'products',
    'files',
    'calendar',
    'market',
    'profile',
    'inbox',
    'conversation',
    'comments',
  ]);
  const boardPages = new Set([
    'board',
    'board-focus',
    'canvas',
    'map',
    'map-branches',
    'layers',
    'member-focus',
  ]);
  const schedules = [
    ['Project 101', 'UI Design', 'Mon 20', '10:00'],
    ['Project 3D', 'Environment Design', 'Tue 21', '11:30'],
    ['Essay outline', 'Ergonomics', 'Wed 22', '12:00'],
    ['Project 2020', 'AI Design', 'Thu 23', '14:30'],
  ];
  const devices = [
    ['qwerrt', 'Cube', 'NOTWYX', '11 Jun 2024', 'Project 2250 · Project 101', '12h 45m'],
    ['Sapiens', 'Triangular prism', 'IF', '23 May 2024', 'Project Yeah', '5h 15m'],
    ['Collab', 'Round cake', 'TXT', '8 Apr 2024', 'Project Supernova', '1h 24m'],
  ];
  const originalBubbles = [
    ['yellow', 699, 159, 156, 277],
    ['blue-member', 397, 244, 189, 170],
    ['lilac', 293, 400, 139, 112],
    ['blue', 543, 474, 188, 150],
    ['violet', 959, 488, 73, 85],
    ['pink', 908, 649, 153, 138],
  ];
  function newBoard(name) {
    return {
      name,
      progress: 54,
      bubbles: originalBubbles.map(([art, x, y, w, h]) => ({ art, x, y, w, h, text: '' })),
      edges: [],
    };
  }
  const boards = [newBoard('Project Supernova')],
    history = [];
  const profile = {
    'Full name': 'Yuxin,Wang',
    'Display name': 'NOTWYX',
    Role: 'Lead Visual Designer',
    Team: '123',
    Bio: 'Lead Visual Designer at @123',
  };
  const saved = new Set(),
    replies = [],
    events = [];
  let page = 'home',
    current = 0,
    zoomed = false,
    selection = null,
    gesture,
    focusReturn,
    dialogType = '',
    transition;
  let avatar = null,
    hiddenAvatar = false,
    dismissed = false,
    folder = 'Your inbox',
    messageFolder = 'Your inbox',
    notificationOn = true;
  const login = { email: false, password: false, remember: false };
  const board = () => boards[current];
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function button(label, action, cls) {
    const b = el('button', cls, label);
    b.type = 'button';
    b.dataset.action = action;
    return b;
  }
  function picture(name, alt, cls) {
    const i = el('img', cls);
    i.src = asset(name);
    i.alt = alt;
    i.draggable = false;
    return i;
  }
  function section() {
    if (dialogType === 'notifications' && popup.open) return 'notifications';
    if (boardPages.has(page)) return 'files';
    return page === 'conversation' ? 'inbox' : page;
  }
  function markSelection() {
    byId('crumb').textContent =
      dialogType === 'notifications' && popup.open ? 'Notifications' : frames[page].title;
    document.querySelectorAll('.nav-link').forEach((b) => {
      if (b.dataset.action === section()) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
  }
  function navigation(compact = false) {
    const nav = el('nav', 'original-nav');
    nav.setAttribute('aria-label', 'Workspace sections');
    if (!compact) {
      const brand = el('span', 'nav-logo');
      brand.setAttribute('aria-label', 'BOOMIND');
      mountDesign(brand, 'nav-brand');
      nav.append(brand);
    }
    menu.forEach(([id, label, count], i) => {
      if (i === 0) nav.append(el('span', 'group-label', 'Admin tools'));
      if (i === 7) nav.append(el('span', 'nav-divider'), el('span', 'group-label insights', 'Insights'));
      const b = button('', id, 'nav-link');
      b.style.top =
        (compact
          ? i < 7
            ? 6 + i * 8.2
            : 68 + (i - 7) * 8.2
          : i < 7
            ? 16.6 + i * 5.48
            : 65.35 + (i - 7) * 5.5) + '%';
      const icon = el('i', 'nav-icon');
      icon.style.maskImage = 'url("' + designURL('nav-' + (id === 'home' ? 'overview' : id)) + '")';
      icon.setAttribute('aria-hidden', 'true');
      b.append(icon, el('span', '', label));
      b.setAttribute('aria-label', label);
      if (count) b.append(el('b', '', count));
      if (id === 'statement') {
        b.disabled = true;
        b.setAttribute('aria-disabled', 'true');
        b.title = 'Statement is not available in this prototype';
      }
      if (id === section()) b.setAttribute('aria-current', 'page');
      nav.append(b);
    });
    if (!compact) {
      const user = button('', 'profile', 'nav-user');
      user.setAttribute('aria-label', 'My profile');
      mountDesign(user, 'nav-user');
      nav.append(user);
    }
    return nav;
  }
  let pressedBackdrop = false;
  function openDialog(title, children, type = '') {
    pressedBackdrop = false;
    if (!popup.open) focusReturn = document.activeElement;
    dialogType = type;
    popup.lang = type === 'about' ? 'zh-CN' : 'en';
    popup.querySelector('[data-action=close]').setAttribute('aria-label', type === 'about' ? '关闭项目说明' : 'Close');
    popup.dataset.kind = type;
    popup.classList.toggle('nav-dialog', type === 'navigate');
    byId('popup-title').textContent = title;
    content.replaceChildren(...children);
    if (!popup.open) popup.showModal();
    markSelection();
  }
  function closeDialog() {
    if (popup.open) popup.close();
    dialogType = '';
    markSelection();
  }
  popup.addEventListener('close', () => {
    if (popup.open) return;
    dialogType = '';
    markSelection();
    if (focusReturn?.isConnected) focusReturn.focus({ preventScroll: true });
  });
  function outsidePopup(e) {
    if (e.target !== popup) return false;
    const r = popup.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  }
  popup.addEventListener('pointerdown', e => { pressedBackdrop = outsidePopup(e); });
  popup.addEventListener('pointercancel', () => { pressedBackdrop = false; });
  popup.addEventListener('click', e => {
    if (pressedBackdrop && outsidePopup(e)) closeDialog();
    pressedBackdrop = false;
  });
  function controls(items) {
    const div = el('div', 'overlay-actions');
    items.forEach(([label, target]) => div.append(button(label, target)));
    return div;
  }
  function form(title, label, value, submit, onSubmit, options = {}) {
    const f = el('form'),
      l = el('label', '', label),
      input = el(options.multiline ? 'textarea' : 'input');
    input.required = true;
    input.maxLength = 240;
    input.value = value;
    l.append(input);
    f.append(l);
    if (options.selector) f.append(options.selector);
    const save = el('button', 'accent', submit);
    save.type = 'submit';
    f.append(save);
    f.onsubmit = (e) => {
      e.preventDefault();
      if (input.value.trim()) onSubmit(input.value.trim());
    };
    openDialog(title, [f, ...(options.more || [])]);
    input.focus();
  }
  function notify(text) {
    const n = byId('notice');
    n.textContent = text;
    n.classList.add('visible');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => n.classList.remove('visible'), 2100);
  }
  function go(next, record = true, index = current) {
    if (!frames[next]) return;
    if (record && (page !== next || current !== index)) history.push([page, current]);
    closeDialog();
    clearTimeout(transition);
    page = next;
    current = index;
    selection = null;
    gesture = null;
    zoomed = false;
    render();
    byId('viewport').scrollLeft = 0;
    byId('workspace').scrollIntoView({ block: 'start' });
    stage.focus({ preventScroll: true });
    if (next === 'welcome')
      transition = setTimeout(() => {
        if (page === 'welcome') go('home', false);
      }, 1300);
  }
  function back() {
    const last = history.pop();
    if (last) go(last[0], false, last[1]);
  }
  function bounds(node, box, [x, y, w, h]) {
    const [a, b, width, height] = box;
    Object.assign(node.style, {
      left: ((x - a) / width) * 100 + '%',
      top: ((y - b) / height) * 100 + '%',
      width: (w / width) * 100 + '%',
      height: (h / height) * 100 + '%',
    });
  }
  function inside(box, rect) {
    const [x, y, w, h] = rect,
      [a, b, width, height] = box;
    return x + w / 2 >= a && y + h / 2 >= b && x + w / 2 <= a + width && y + h / 2 <= b + height;
  }
  // Each SVG contains separately positioned Figma components, their original
  // paths, glyphs, masks and control groups. Only the current artboard is loaded.
  const designSource = new Map();
  let mountId = 0;
  const buildQuery = revision ? '?build=' + encodeURIComponent(revision) : '';
  const designURL = (name) => 'assets/boomind/components/' + name + '.svg' + buildQuery;
  function loadDesign(name) {
    if (!designSource.has(name)) {
      const request = fetch(designURL(name)).then((response) => {
        if (!response.ok) throw new Error('Component unavailable: ' + name);
        return response.text();
      }).catch((error) => {
        designSource.delete(name);
        throw error;
      });
      designSource.set(name, request);
    }
    return designSource.get(name);
  }
  function mountDesign(host, name, box) {
    const layer = el('div', 'design-art');
    host.append(layer);
    const instance = 'fig' + (++mountId) + '-';
    async function populate() {
      try {
        const source = await loadDesign(name);
        if (!layer.isConnected) return;
        // A component can appear twice in adjacent mobile sections. Isolate
        // its clip paths, image patterns and glyph references in each instance.
        const svg = new DOMParser().parseFromString(source.replaceAll('uid-', instance), 'image/svg+xml').documentElement;
        if (svg.localName !== 'svg') throw new Error('Invalid component: ' + name);
        if (box) {
          const [x, y, w, h] = box;
          svg.setAttribute('viewBox', box.join(' '));
          for (const item of [...svg.children]) {
            if (!item.hasAttribute('data-component')) continue;
            const rect = ['x', 'y', 'width', 'height'].map((key) => Number(item.getAttribute(key)));
            const [left, top, width, height] = rect;
            if (left >= x + w || top >= y + h || left + width <= x || top + height <= y) item.remove();
          }
          for (const control of svg.querySelectorAll('[data-center]')) {
            const [cx, cy] = control.dataset.center.split(' ').map(Number);
            if (cx < x || cx > x + w || cy < y || cy > y + h) {
              control.removeAttribute('tabindex');
              control.removeAttribute('data-action');
              control.removeAttribute('role');
            }
          }
        }
        const sourceURL = new URL(designURL(name), document.baseURI);
        for (const image of svg.querySelectorAll('image[href]')) {
          const href = image.getAttribute('href');
          if (href.startsWith('bitmaps/')) image.setAttribute('href', new URL(href + buildQuery, sourceURL).href);
        }
        layer.replaceChildren(document.importNode(svg, true));
        layer.dataset.ready = name;
      } catch {
        if (!layer.isConnected) return;
        const retry = el('button', 'art-retry', 'Reload artwork');
        retry.onclick = (event) => {
          event.stopPropagation();
          populate();
        };
        layer.replaceChildren(retry);
      }
    }
    populate();
    return layer;
  }
  function overlayDesign(name, label) {
    const figure = el('div', 'authored-overlay overlay-' + name);
    figure.setAttribute('aria-label', label);
    mountDesign(figure, name);
    return figure;
  }
  function originalInput(slice, box, rect, label, value, save) {
    if (!inside(box, rect)) return;
    const input = el(label === 'Bio' ? 'textarea' : 'input', 'live-field');
    input.value = value;
    input.maxLength = 240;
    input.setAttribute('aria-label', label);
    input.addEventListener('input', () => save(input.value));
    bounds(input, box, rect);
    slice.append(input);
  }
  function note(slice, box, rect, text, cls = 'original-note') {
    if (!inside(box, rect)) return;
    const n = el('div', cls, text);
    bounds(n, box, rect);
    slice.append(n);
    return n;
  }
  function lines(surface) {
    const svg = surface.querySelector('.edges');
    if (!svg) return;
    svg.replaceChildren();
    for (const [a, b] of board().edges) {
      const p = board().bubbles[a],
        q = board().bubbles[b];
      if (!p || !q) continue;
      const line = document.createElementNS(svg.namespaceURI, 'line');
      for (const [k, v] of Object.entries({
        x1: p.x + p.w / 2,
        y1: p.y + p.h / 2,
        x2: q.x + q.w / 2,
        y2: q.y + q.h / 2,
      }))
        line.setAttribute(k, v);
      svg.append(line);
    }
  }
  function drawCanvas(slice) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('edges');
    svg.setAttribute('viewBox', '0 0 1194 849');
    slice.append(svg);
    lines(slice);
    board().bubbles.forEach((n, i) => {
      const b = button('', 'bubble:' + i, 'bubble');
      b.dataset.bubble = i;
      b.setAttribute('aria-label', n.text || 'Idea ' + (i + 1));
      mountDesign(b, 'idea-' + n.art);
      if (n.text) b.append(el('strong', '', n.text));
      if (selection === i) b.classList.add('selected');
      bounds(b, full, [n.x, n.y, n.w, n.h]);
      slice.append(b);
    });
  }
  function sliceView(box, fullView) {
    const slice = el('div', 'slice');
    slice.style.aspectRatio = box[2] + '/' + box[3];
    if (page === 'welcome') {
      const enter = button('', 'home', 'welcome-entry');
      enter.setAttribute('aria-label', 'Enter workspace');
      enter.append(picture('welcome-animation', 'Welcome'));
      slice.append(enter);
    } else {
      mountDesign(slice, page, box);
    }
    if (fullView && dashboards.has(page)) slice.append(navigation());
    if (page === 'canvas') drawCanvas(slice);
    if (board().progress !== 54 && ['board', 'map', 'board-focus', 'map-branches', 'layers'].includes(page)) {
      const rect = ['board', 'map'].includes(page) ? [506, 24, 640, 62] : [485, 47, 640, 62];
      const n = note(slice, box, rect, 'Layer Progress · ' + board().progress + '%');
      if (n) {
        n.classList.add('progress-control');
        n.replaceChildren(button('Layer Progress · ' + board().progress + '%', 'progress'));
      }
    }
    if (['board', 'map'].includes(page)) {
      const voice = button('', 'voice', 'voice-control');
      voice.setAttribute('aria-label', 'Connected device status');
      mountDesign(voice, 'voice');
      bounds(voice, box, [600, 110, 222, 52]);
      slice.append(voice);
    }
    if (page === 'profile') {
      for (const [key, x, y, w, h] of [
        ['Full name', 293.4, 439.8, 398, 47.9],
        ['Display name', 715, 439.8, 398, 47.9],
        ['Role', 293.4, 528.4, 398, 47.9],
        ['Team', 715, 528.4, 398, 47.9],
        ['Bio', 293.4, 620.8, 820.4, 134.3],
      ]) {
        originalInput(slice, box, [x, y, w, h], key, profile[key], (v) => (profile[key] = v));
      }
      if ((avatar || hiddenAvatar) && inside(box, [310, 303, 55, 55])) {
        const n = avatar ? el('img', 'profile-avatar') : el('div', 'original-note');
        if (avatar) n.src = avatar;
        bounds(n, box, [310, 303, 55, 55]);
        slice.append(n);
      }
    }
    if (page === 'home') {
      const n = note(slice, box, [266, 162, 521, 288], '');
      if (n) {
        n.classList.add('collapsed-welcome');
        n.append(button('Show welcome card', 'restore-welcome'), button('Create a brainstorming task', 'create'));
      }
    }
    if (page === 'login') {
      if (login.email) note(slice, box, [83, 451, 420, 37], 'guest@boomind.demo');
      if (login.password) note(slice, box, [83, 556, 374, 38], '••••••••');
      if (login.remember) note(slice, box, [74, 616, 19, 19], '✓');
    }
    if (['inbox', 'conversation'].includes(page)) {
      if (folder !== messageFolder) {
        const n = note(
          slice,
          box,
          [266, 281, 384, 528],
          'No messages in ' + folder + '.',
          'original-note mail-folder',
        );
        note(slice, box, [757, 159, 388, 633], 'Select a message to read it.');
      } else if (page === 'conversation') {
        originalInput(slice, box, [779, 606, 345, 82], 'Message', draft, (v) => (draft = v));
      }
    }
    return slice;
  }
  let draft = '';
  function render() {
    const split = mobile.matches && !zoomed && frames[page].mobile.length > 0;
    stage.toggleAttribute('data-welcome-dismissed', dismissed);
    stage.dataset.screen = page;
    stage.dataset.figma = frames[page].figma;
    stage.classList.toggle('reflow', !!split);
    stage.classList.toggle('zoomed', zoomed);
    stage.setAttribute('aria-label', frames[page].title);
    stage.replaceChildren(...(split ? frames[page].mobile : [full]).map((b) => sliceView(b, !split)));
    byId('crumb').textContent = frames[page].title;
    byId('go-back').hidden = !history.length;
    byId('zoom').setAttribute('aria-pressed', String(zoomed));
    byId('zoom').textContent = zoomed ? 'Fit' : 'Zoom';
    const extra = byId('extras');
    extra.replaceChildren();
    const actions = [];
    if (boardPages.has(page)) {
      extra.append(el('b', '', board().name));
      actions.push(
        ['Team canvas', 'canvas'],
        ['Mind map', 'map'],
        ['Layers', 'layers'],
        ['Add idea', 'add-idea'],
        [selection === null ? 'Connect ideas' : 'Choose two ideas', 'connect'],
      );
    }
    if (page === 'files') {
      for (const [i, b] of boards.entries()) if (i) actions.push([b.name, 'file:' + i]);
      for (const m of saved) actions.push([m, 'material:' + m]);
      actions.push(['New task', 'create']);
    }
    if (page === 'calendar')
      events.forEach((e, i) => actions.push([e[0] + ' · ' + e[3], 'event:' + (i + 4)]));
    if (page === 'conversation' && replies.length && folder === messageFolder)
      for (const r of replies) extra.append(el('p', '', r));
    if (mobile.matches && dashboards.has(page))
      actions.push(['Search', 'search'], ['Notifications', 'notifications']);
    for (const [label, target] of actions) extra.append(button(label, target));
    extra.hidden = !extra.children.length;
  }
  const details = (title, text, items = []) => openDialog(title, [el('p', '', text), controls(items)]);
  function createTask(template) {
    const l = el('label', '', 'Template'),
      select = el('select');
    for (const t of ['Basic mind map', 'Course Outline', 'Plan ideas']) select.add(new Option(t, t));
    select.value = template || 'Basic mind map';
    l.append(select);
    form(
      'New brainstorming task',
      'Task name',
      '',
      'Create task',
      (name) => {
        boards.push(newBoard(name));
        go(select.value === 'Basic mind map' ? 'map' : 'canvas', true, boards.length - 1);
      },
      { selector: l },
    );
  }
  function newEvent() {
    const l = el('label', '', 'Start time'),
      time = el('input');
    time.type = 'time';
    time.required = true;
    time.value = '10:00';
    l.append(time);
    form(
      'New Schedule',
      'Project or task',
      '',
      'Add to schedule',
      (title) => {
        events.push([title, 'Team session', 'This session', time.value]);
        closeDialog();
        render();
        notify('Schedule added');
      },
      { selector: l },
    );
  }
  function editBubble(i) {
    if (selection !== null) {
      if (selection === -1) {
        selection = i;
        render();
        notify('Select the second idea');
        return;
      }
      if (i !== selection && !board().edges.some((pair) => pair.includes(i) && pair.includes(selection)))
        board().edges.push([selection, i]);
      selection = null;
      render();
      return;
    }
    const n = board().bubbles[i];
    form(
      'Edit idea',
      'Idea',
      n.text || 'things',
      'Save idea',
      (text) => {
        n.text = text;
        closeDialog();
        render();
      },
      {
        more: [
          controls([
            ['Connect to another idea', 'link-from:' + i],
            ['Add idea', 'add-idea'],
          ]),
        ],
      },
    );
  }
  function search(messages = false) {
    const input = el('input');
    input.type = 'search';
    input.placeholder = messages ? 'Search messages' : 'Search screens and boards';
    input.setAttribute('aria-label', input.placeholder);
    const list = el('div', 'action-list');
    function update() {
      const entries = messages
        ? [['Joel Becker', 'thread']]
        : [
            ...menu.filter((m) => m[0] !== 'statement').map(([a, l]) => [l, a]),
            ['Work board', 'board'],
            ['Team canvas', 'canvas'],
            ['Login', 'login'],
            ...boards.map((b, i) => [b.name, 'file:' + i]),
          ];
      list.replaceChildren(
        ...entries
          .filter(([l]) => l.toLowerCase().includes(input.value.toLowerCase()))
          .map(([l, a]) => button(l, a)),
      );
      if (!list.children.length) list.textContent = 'No results';
    }
    input.oninput = update;
    update();
    openDialog('Search', [input, list]);
    input.focus();
  }
  function run(action) {
    const [id, ...rest] = action.split(':');
    const arg = rest.join(':');
    if (frames[id]) {
      if (id === 'home' && page === 'welcome') go(id, false);
      else go(id);
      return;
    }
    switch (id) {
      case 'close':
        closeDialog();
        break;
      case 'back':
        back();
        break;
      case 'zoom':
        zoomed = !zoomed;
        render();
        break;
      case 'navigate':
        openDialog(
          'Navigate',
          [
            navigation(true),
            controls([
              ['Work board', 'board'],
              ['Login', 'login'],
            ]),
          ],
          'navigate',
        );
        break;
      case 'about':
        openDialog('项目说明', [
          el('p', '', 'BOOMIND 为团队头脑风暴设计了一套共享工作台。成员可以选择模板建立讨论任务，把各自的想法放到同一张画布上，再用连线梳理观点之间的关系。'),
          el('p', '', '工作台把讨论用到的文件、设备和日程放在同一套导航下。你可以在这里试用英文界面，也可以在素材库单独查看画布节点、导航图标和界面控件。'),
        ], 'about');
        break;
      case 'search':
        search();
        break;
      case 'message-search':
        search(true);
        break;
      case 'recent':
        go('canvas');
        break;
      case 'dismiss':
      case 'restore-welcome': {
        dismissed = id === 'dismiss';
        stage.toggleAttribute('data-welcome-dismissed', dismissed);
        const nextAction = dismissed ? 'restore-welcome' : 'dismiss';
        stage.querySelector('[data-action="' + nextAction + '"]')?.focus({ preventScroll: true });
        break;
      }
      case 'create':
        createTask(arg);
        break;
      case 'file':
        go('canvas', true, Number(arg));
        break;
      case 'new-event':
        newEvent();
        break;
      case 'event': {
        const e = [...schedules, ...events][Number(arg)];
        details(e[0], e.slice(1).join(' · '), [['Open file library', 'files']]);
        break;
      }
      case 'day': {
        const matches = schedules.map((e, i) => [e, i]).filter(([e]) => e[2].startsWith(arg.slice(0, 3)));
        details(
          arg,
          matches.length ? 'Scheduled projects' : 'No scheduled projects.',
          matches.map(([e, i]) => [e[0] + ' · ' + e[3], 'event:' + i]),
        );
        break;
      }
      case 'targets':
        details('Project targets', 'August project dashboard · Achieved and target totals.', [
          ['Open file library', 'files'],
        ]);
        break;
      case 'device': {
        const d = devices[Number(arg)];
        details(d[0] + ' · ' + d[1], d.slice(2).join(' · '), [
          ['Involved projects', 'files'],
          ['Check settings', 'profile'],
        ]);
        break;
      }
      case 'device-filter':
        openDialog('Products', [controls(devices.map((d, i) => [d[0] + ' · ' + d[1], 'device:' + i]))]);
        break;
      case 'material':
        details(arg, 'Material market · BOOMIND', [
          [saved.has(arg) ? 'Remove from library' : 'Save to library', 'save:' + arg],
          ['File library', 'files'],
        ]);
        break;
      case 'save':
        if (saved.has(arg)) saved.delete(arg);
        else saved.add(arg);
        closeDialog();
        render();
        notify(saved.has(arg) ? 'Saved to file library' : 'Removed from library');
        break;
      case 'notifications': {
        const list = overlayDesign('notifications', 'Recent notifications');
        openDialog('Notifications', [list], 'notifications');
        break;
      }
      case 'field':
        form('Profile', arg, profile[arg], 'Save', (v) => {
          profile[arg] = v;
          closeDialog();
          render();
        });
        break;
      case 'preferences':
        openDialog('Settings', [
          controls([
            [notificationOn ? 'Mute notifications' : 'Enable notifications', 'toggle-notices'],
            ['Login screen', 'login'],
          ]),
        ]);
        break;
      case 'toggle-notices':
        notificationOn = !notificationOn;
        run('preferences');
        break;
      case 'account':
        details(arg, 'Account credentials are not required for this prototype.', [
          ['Open login screen', 'login'],
        ]);
        break;
      case 'upload': {
        const input = el('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.setAttribute('aria-label', 'Upload a profile image');
        input.onchange = () => {
          const f = input.files[0];
          if (!f || !f.type.startsWith('image/')) return;
          if (avatar) URL.revokeObjectURL(avatar);
          avatar = URL.createObjectURL(f);
          hiddenAvatar = false;
          closeDialog();
          render();
        };
        openDialog('Upload avatar', [input]);
        break;
      }
      case 'clear-avatar':
        if (avatar) URL.revokeObjectURL(avatar);
        avatar = null;
        hiddenAvatar = true;
        render();
        break;
      case 'remember':
        login.remember = !login.remember;
        render();
        break;
      case 'login-email':
      case 'login-password':
        login[id.slice(6)] = true;
        render();
        break;
      case 'demo-login':
        details('Demo account', 'Explore BOOMIND as a guest.', [['Enter workspace', 'welcome']]);
        break;
      case 'thread':
        folder = messageFolder;
        go('conversation');
        break;
      case 'reply':
        if (page !== 'conversation') {
          go('conversation');
          stage.querySelector('[aria-label="Message"]')?.focus();
        } else if (draft.trim()) {
          replies.push(draft.trim());
          draft = '';
          render();
          notify('Reply added');
        } else stage.querySelector('[aria-label="Message"]')?.focus();
        break;
      case 'folder':
        folder = arg;
        go('inbox');
        break;
      case 'mail-options':
        openDialog('Message options', [
          controls([
            ['Mark as done', 'move-mail:Done'],
            ['Save message', 'move-mail:Saved'],
            ['Archive', 'archive'],
          ]),
        ]);
        break;
      case 'move-mail':
        messageFolder = arg;
        folder = arg;
        go('inbox');
        notify('Moved to ' + arg);
        break;
      case 'remove-mail':
      case 'archive':
        messageFolder = id === 'archive' ? 'Archives' : 'Deleted';
        folder = 'Your inbox';
        go('inbox');
        notify(id === 'archive' ? 'Message archived' : 'Message removed');
        break;
      case 'attachment':
        details('Attachment.PNG', '3.6 MB · Joel Becker', [['Open conversation', 'thread']]);
        break;
      case 'comment':
        details(arg, arg === 'Donald Franklin' ? 'Comment on Collab.' : 'Comment on Sapiens.', [
          ['Open inbox', 'inbox'],
          ['Material market', 'market'],
        ]);
        break;
      case 'author':
        if (arg === 'NOTWYX') go('board-focus');
        else if (arg === 'TXT') go('layers');
        else {
          go('canvas');
          run('member:' + arg);
        }
        break;
      case 'progress':
        openDialog('Layer Progress', [
          controls(
            [20, 40, 50, 54, 60, 70, 100].map((v) => [v === 100 ? 'Done' : v + '%', 'set-progress:' + v]),
          ),
        ]);
        break;
      case 'set-progress':
        board().progress = Number(arg);
        closeDialog();
        render();
        break;
      case 'member':
        openDialog(arg, [
          overlayDesign('member', 'Contributor'),
          controls([['Focus on canvas', 'member-focus']]),
        ]);
        break;
      case 'voice':
        details('Connected device', 'Notwyx’s BOOM · 75%', [['Open products', 'products']]);
        break;
      case 'board-tools':
        openDialog('Board tools', [
          overlayDesign('tools', 'Radial board tools'),
          controls([
            ['Team canvas', 'canvas'],
            ['Add idea', 'add-idea'],
            ['Mind map', 'map'],
          ]),
        ]);
        break;
      case 'add-idea':
        form('Add idea', 'Idea', '', 'Add to canvas', (text) => {
          board().bubbles.push({
            art: 'lilac',
            x: 480 + (board().bubbles.length % 4) * 45,
            y: 290,
            w: 141,
            h: 113,
            text,
          });
          go('canvas');
        });
        break;
      case 'bubble':
        editBubble(Number(arg));
        break;
      case 'link-from':
        closeDialog();
        selection = Number(arg);
        render();
        notify('Select the second idea');
        break;
      case 'connect':
        if (page !== 'canvas') go('canvas');
        selection = selection === null ? -1 : null;
        render();
        if (selection !== null) notify('Select the first idea');
        break;
    }
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b || b.disabled) return;
    if (b.dataset.bubble !== undefined && b.dataset.handled && e.detail !== 0) return;
    run(b.dataset.action);
  });
  stage.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-bubble]');
    if (!b || e.button !== 0 || gesture) return;
    const i = Number(b.dataset.bubble),
      n = board().bubbles[i];
    delete b.dataset.handled;
    gesture = { i, b, id: e.pointerId, cx: e.clientX, cy: e.clientY, x: n.x, y: n.y, moved: false };
    b.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const g = gesture,
      dx = e.clientX - g.cx,
      dy = e.clientY - g.cy;
    if (!g.moved && Math.hypot(dx, dy) < 5) return;
    const r = g.b.parentElement.getBoundingClientRect(),
      n = board().bubbles[g.i];
    g.moved = true;
    g.b.classList.add('dragging');
    n.x = Math.max(0, Math.min(1194 - n.w, g.x + (dx * 1194) / r.width));
    n.y = Math.max(115, Math.min(849 - n.h, g.y + (dy * 849) / r.height));
    bounds(g.b, full, [n.x, n.y, n.w, n.h]);
    lines(g.b.parentElement);
  });
  stage.addEventListener('pointerup', (e) => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const g = gesture;
    gesture = null;
    g.b.dataset.handled = '1';
    g.b.classList.remove('dragging');
    if (!g.moved) editBubble(g.i);
  });
  for (const event of ['pointercancel', 'lostpointercapture'])
    stage.addEventListener(event, (e) => {
      if (gesture?.id === e.pointerId) {
        gesture.b.classList.remove('dragging');
        gesture = null;
      }
    });
  document.addEventListener('keydown', (e) => {
    if (byId('asset-library').open) return;
    const control = e.target.closest('svg [role="button"][data-action]');
    if (control && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      if (!e.repeat) run(control.dataset.action);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      search();
    }
  });
  if (parent !== window)
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (a && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        document.querySelector(a.hash)?.scrollIntoView();
      }
    });
  mobile.addEventListener('change', () => {
    zoomed = false;
    render();
  });
  render();
  try {
    window.frameElement?.dispatchEvent(new Event('cecilia-project-ready'));
  } catch {}
})();
