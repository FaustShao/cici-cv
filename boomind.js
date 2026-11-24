(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const revision = document.querySelector('meta[name="cecilia-release"]')?.content;
  const art = (name, cls = '', alt = '') =>
    '<img class="' +
    cls +
    '" src="assets/boomind/' +
    name +
    '.webp' +
    (revision ? '?build=' + encodeURIComponent(revision) : '') +
    '" alt="' +
    esc(alt) +
    '" draggable="false">';
  const paths = {
    overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    board: 'M6 7l11 5M6 18l11-6 M3 4h5v5H3z M16 9h5v5h-5z M3 16h5v5H3z',
    files: 'M3 6h6l2 2h10v11H3z',
    devices: 'M4 4h16v13H4z M8 21h8m-4-4v4',
    schedule: 'M3 6h18v15H3z M7 3v5m10-5v5M3 11h18',
    market: 'M3 9l2-5h14l2 5v3H3z M5 12v8h14v-8',
    inbox: 'M3 7l4-3h10l4 3v13H3z M3 9l9 6 9-6',
    activity: 'M3 4h18v13H9l-5 4v-4H3z',
    settings: 'M4 7h16M4 17h16 M9 4v6m7 4v6',
    bell: 'M5 17h14l-2-3V9a5 5 0 00-10 0v5z M10 20h4',
  };
  const icon = (id) =>
    '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round" stroke-linecap="round"><path d="' +
    paths[id] +
    '"/></svg>';
  const routes = {
    overview: ['Overview', '工作概览'],
    board: ['Work board', '思维画布'],
    files: ['File library', '文件库'],
    devices: ['Products', '连接设备'],
    schedule: ['Schedules', '项目日程'],
    market: ['Material market', '素材市场'],
    inbox: ['Inbox', '收件箱'],
    activity: ['Comments', '团队动态'],
    settings: ['Settings', '个人设置'],
  };
  const templates = [
    [
      'Basic mind map',
      '基础思维导图',
      'mind-map',
      ['设计主题', '使用场景', '关键问题', '初步想法', '下一步'],
    ],
    ['Course outline', '课程大纲', 'outline', ['课程主题', '学习目标', '内容单元', '练习', '复盘']],
    ['Plan ideas', '方案构思', 'idea', ['项目方向', '用户需求', '设计机会', '备选方案', '行动计划']],
  ];
  const products = [
    ['Cube', 'cube', 'NOTWYX', 'owner', '2024.06.11', 'Project 2250 · Project 101', '12h 45m'],
    ['Triangular prism', 'prism', 'IF', 'member', '2024.05.23', 'Project Yeah', '5h 15m'],
    ['Round cake', 'ring', 'TXT', 'mentor', '2024.04.08', 'Project Supernova', '1h 24m'],
  ];
  const materials = [
    ['Spiral', 'spiral'],
    ['Orbit', 'orbit'],
    ['Ripple', 'ripple'],
    ['Prism', 'pyramid'],
    ['Star', 'star'],
    ['Sphere', 'sphere'],
  ];
  const screens = [
    ['home', '首页', 'overview'],
    ['wireframe', '首页线框', 'overview'],
    ['canvas', '团队构思', 'board'],
    ['layers', '图层进度', 'board'],
    ['products', '连接设备', 'devices'],
    ['calendar', '项目日程', 'schedule'],
    ['market', '素材市场', 'market'],
    ['login', '登录入口', 'login'],
  ];
  const progressSteps = [20, 40, 50, 60, 54, 70, 100];
  const scheduled = [
    ['Mon', '19', '08:00', 'UI Design', 'Project 101'],
    ['Wed', '21', '11:30', 'Environment Design', 'Project 3D'],
    ['Thu', '22', '14:30', 'Ergonomics', 'Project 2020'],
  ];
  const state = {
    page: 'overview',
    trail: [],
    current: 0,
    boards: [],
    profile: 'NOTWYX',
    saved: new Set(),
    zoom: 1,
    link: null,
    unread: true,
    archived: false,
    reply: [],
    archiveTab: false,
    notifications: true,
  };
  function makeBoard(name, t, progress = 20) {
    const points = [
      [45, 50],
      [24, 27],
      [70, 25],
      [71, 68],
      [28, 76],
    ];
    return {
      name,
      template: t,
      nodes: templates[t][3].map((text, i) => ({ id: i, text, x: points[i][0], y: points[i][1] })),
      edges: [
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
      ],
      next: 5,
      layer: 0,
      progress,
    };
  }
  state.boards.push(
    makeBoard('Basic mind map', 0, 100),
    makeBoard('Course outline', 1, 40),
    makeBoard('Plan ideas', 2, 50),
  );
  const board = () => state.boards[state.current];
  const btn = (label, action, value = '', cls = '') =>
    '<button type="button" class="' +
    cls +
    '" data-action="' +
    action +
    '" data-value="' +
    esc(value) +
    '">' +
    label +
    '</button>';
  const routeButton = (page, label) => btn(label, 'route', page);
  const panelHead = (name, cn, action = '') =>
    '<header class="panel-heading"><div><small>' +
    esc(cn) +
    '</small><h2>' +
    esc(name) +
    '</h2></div>' +
    action +
    '</header>';
  const dlg = $('popup'),
    body = $('popup-content');
  let noticeTimer, focusReturn;
  function tell(msg) {
    $('notice').textContent = msg;
    $('notice').classList.add('visible');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => $('notice').classList.remove('visible'), 2200);
  }
  function modal(title, html) {
    if (!dlg.open) focusReturn = document.activeElement;
    dlg.classList.remove('screen-dialog');
    $('popup-title').textContent = title;
    body.innerHTML = html;
    if (!dlg.open) dlg.showModal();
    body.querySelector('[autofocus]')?.focus();
  }
  function close() {
    if (dlg.open) dlg.close();
  }
  dlg.addEventListener('close', () => {
    if (focusReturn?.isConnected) focusReturn.focus({ preventScroll: true });
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) {
      const r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
    }
  });
  function menu(open) {
    $('workspace').classList.toggle('menu-open', open);
    document.querySelector('.mobile-menu').setAttribute('aria-expanded', String(open));
  }
  function locate() {
    $('workspace').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function go(page, item = state.current, remember = true) {
    close();
    menu(false);
    if (remember && (state.page !== page || (page === 'board' && state.current !== item)))
      state.trail.push([state.page, state.current]);
    state.page = page;
    state.current = item;
    state.link = null;
    state.zoom = 1;
    render();
    locate();
    $('panel').focus({ preventScroll: true });
  }
  function sidebar() {
    const links = (ids) =>
      ids
        .map(
          (id) =>
            '<button data-action="route" data-value="' +
            id +
            '" ' +
            (state.page === id ? 'aria-current="page"' : '') +
            '>' +
            icon(id) +
            '<span>' +
            routes[id][0] +
            '</span></button>',
        )
        .join('');
    $('sidebar').innerHTML =
      '<div class="side-brand">' +
      art('mark') +
      ' BOOMIND</div><nav aria-label="项目功能">' +
      links(['overview', 'board', 'files', 'devices', 'schedule', 'market']) +
      '<hr>' +
      links(['inbox', 'activity', 'settings']) +
      '</nav>' +
      btn(
        art('profile') + '<span><b>' + esc(state.profile) + '</b><small>TXT’s Team</small></span>',
        'route',
        'settings',
        'profile',
      );
  }
  function projectProgress() {
    return ['Folio Agency', 'Folio Designer', 'Unity Comps']
      .map(
        (label, i) =>
          '<button class="progress-row" data-action="progress" data-value="' +
          i +
          '">' +
          art(['spiral', 'sphere', 'orbit'][i]) +
          '<span>' +
          label +
          '<i><em style="width:' +
          [75, 62, 2][i] +
          '%"></em></i></span><b>' +
          [75, 62, 2][i] +
          '%</b></button>',
      )
      .join('');
  }
  const chart =
    '<svg class="chart" viewBox="0 0 260 72" preserveAspectRatio="none" aria-label="近期工作时间变化" role="img"><path fill="none" stroke="#bdabff" stroke-width="3" d="M0 53C14 53 15 28 33 30S53 60 74 47 92 4 112 15 135 60 158 40 186 6 201 16 225 44 242 20 255 9 260 8"/><path fill="none" stroke="#6899ce" stroke-width="1.7" d="M0 62C23 65 29 42 49 45S75 64 95 51 121 25 145 39 174 57 198 43 226 24 260 30"/></svg>';
  function overview() {
    return (
      panelHead(
        'Welcome back',
        'Hi ' + state.profile + ',',
        btn(icon('bell') + (state.unread ? '<i class="unread"></i>' : ''), 'notifications', '', 'bell'),
      ) +
      '<div class="dash-grid"><div class="dash-main"><article class="welcome"><div><small>Work board</small><h3>Create a new<br>brainstorming task.</h3>' +
      btn('新建构思任务 →', 'create', '', 'light') +
      '</div>' +
      art('orbit', 'welcome-orbit') +
      art('mark', 'welcome-mark') +
      '</article><div class="dash-bottom"><article class="tile"><h3>Template type</h3>' +
      templates
        .map((t, i) =>
          btn(
            art(t[2]) + '<span>' + t[0] + '<small>' + t[1] + '</small></span><b>↗</b>',
            'template',
            i,
            'template-row',
          ),
        )
        .join('') +
      '</article><article class="tile last-open"><h3>Last opened</h3><p>' +
      esc(board().name) +
      '</p>' +
      art('map-sheet', 'map-preview') +
      btn('继续编辑 ↗', 'route', 'board', 'text-btn') +
      '</article></div></div><div class="dash-right"><article class="tile hours"><h3>Working hours</h3><p><strong>47.9</strong> h</p>' +
      chart +
      btn('查看本周日程 ↗', 'route', 'schedule', 'text-btn') +
      '</article><article class="tile"><h3>Project progress</h3>' +
      projectProgress() +
      '</article></div></div>'
    );
  }
  function boardView() {
    const b = board();
    return (
      panelHead(b.name, 'Work board', btn('＋ 节点', 'add-node', '', 'accent')) +
      '<div class="board-toolbar">' +
      btn('文件库', 'route', 'files') +
      btn('关联节点', 'link', '', 'link-control') +
      '<label>图层 <select id="layer" aria-label="选择图层">' +
      ['全部', '主题', '分支']
        .map(
          (x, i) => '<option value="' + i + '" ' + (i === b.layer ? 'selected' : '') + '>' + x + '</option>',
        )
        .join('') +
      '</select></label><span></span>' +
      btn('−', 'zoom', '-0.2') +
      '<output id="scale">' +
      Math.round(state.zoom * 100) +
      '%</output>' +
      btn('＋', 'zoom', '0.2') +
      '</div>' +
      '<div class="map-view"><div id="map-stage"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg><div id="map-nodes"></div></div></div><div class="board-status"><label>Layer Progress <select id="progress-level" aria-label="构思进度">' +
      progressSteps
        .map(
          (v) =>
            '<option value="' +
            v +
            '" ' +
            (v === b.progress ? 'selected' : '') +
            '>' +
            (v === 100 ? 'Done' : v + '%') +
            '</option>',
        )
        .join('') +
      '</select></label><p class="board-help" id="board-help">拖动节点调整位置，点选节点编辑想法。</p></div>'
    );
  }
  function paintMap() {
    const b = board(),
      nodes = b.nodes.filter((n) => b.layer === 0 || (b.layer === 1 ? n.id === 0 : n.id !== 0));
    const map = new Map(nodes.map((n) => [n.id, n]));
    $('map-stage').style.width = state.zoom * 100 + '%';
    $('map-stage').style.height = state.zoom * 100 + '%';
    $('map-stage').querySelector('svg').innerHTML = b.edges
      .filter(([a, c]) => map.has(a) && map.has(c))
      .map(
        ([a, c]) =>
          '<line x1="' +
          map.get(a).x +
          '" y1="' +
          map.get(a).y +
          '" x2="' +
          map.get(c).x +
          '" y2="' +
          map.get(c).y +
          '" />',
      )
      .join('');
    $('map-nodes').innerHTML = nodes
      .map(
        (n) =>
          '<button class="map-node ' +
          (n.id === 0 ? 'central ' : '') +
          (state.link === n.id ? 'selected' : '') +
          '" style="left:' +
          n.x +
          '%;top:' +
          n.y +
          '%" data-color="' +
          (n.id % 4) +
          '" data-node="' +
          n.id +
          '">' +
          esc(n.text) +
          '</button>',
      )
      .join('');
    document.querySelector('.link-control').setAttribute('aria-pressed', String(state.link !== null));
    $('board-help').textContent =
      state.link === null
        ? '拖动节点调整位置，点选节点编辑想法。'
        : state.link === -1
          ? '点选起点，再点选要关联的节点。'
          : '现在点选关联的另一个节点。';
    $('scale').textContent = Math.round(state.zoom * 100) + '%';
  }
  function fileView() {
    return (
      panelHead('File library', '文件库', btn('＋ 新建画布', 'create', '', 'accent')) +
      '<div class="file-grid">' +
      state.boards
        .map((b, i) =>
          btn(
            '<div class="file-art">' +
              art(templates[b.template][2]) +
              '</div><strong>' +
              esc(b.name) +
              '</strong><small>' +
              b.nodes.length +
              ' 个节点 · ' +
              b.edges.length +
              ' 条关联 · ' +
              (b.progress === 100 ? 'Done' : b.progress + '%') +
              '</small>',
            'open-file',
            i,
            'file-card',
          ),
        )
        .join('') +
      [...state.saved]
        .map((i) =>
          btn(
            art(materials[i][1]) + '<strong>' + materials[i][0] + '</strong><small>已收藏素材</small>',
            'material',
            i,
            'file-card',
          ),
        )
        .join('') +
      '</div>'
    );
  }
  function deviceView() {
    return (
      panelHead('Your products', '已连接设备', routeButton('settings', '检查设置')) +
      '<p class="intro-text">查看工作台关联的设备和项目记录。</p><div class="product-list">' +
      products
        .map((p, i) =>
          btn(
            art(p[1]) +
              '<span><b>' +
              p[0] +
              '</b><small>' +
              p[5] +
              '</small></span><span class="person">' +
              art(p[3]) +
              p[2] +
              '</span><strong>' +
              p[6] +
              ' ↗</strong>',
            'product',
            i,
            'product-row',
          ),
        )
        .join('') +
      '</div>'
    );
  }
  function scheduleView() {
    return (
      panelHead('Schedules', '项目日程') +
      '<div class="schedule"><h3>August <small>2024</small></h3><div class="calendar">' +
      ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => '<b>' + x + '</b>').join('') +
      '<i></i><i></i><i></i>' +
      Array.from({ length: 31 }, (_, i) => {
        const match = scheduled.findIndex((row) => row[1] === String(i + 1));
        return match < 0 ? '<span>' + (i + 1) + '</span>' : btn(String(i + 1), 'event', match, 'event-day');
      }).join('') +
      '</div></div><div class="agenda">' +
      scheduled
        .map((s, i) =>
          btn('<time>Aug ' + s[1] + ' · ' + s[2] + '</time><b>' + s[3] + '</b><span>↗</span>', 'event', i),
        )
        .join('') +
      '</div>'
    );
  }
  function marketView() {
    return (
      panelHead('Material market', '素材市场') +
      '<div class="file-grid market">' +
      materials
        .map((m, i) =>
          btn(
            art(m[1]) +
              '<strong>' +
              m[0] +
              '</strong><small>' +
              (state.saved.has(i) ? '已收藏' : '查看素材 ↗') +
              '</small>',
            'material',
            i,
            'file-card',
          ),
        )
        .join('') +
      '</div>'
    );
  }
  function inboxView() {
    const show = state.archiveTab === state.archived;
    return (
      panelHead('Your inbox', '团队消息') +
      '<div class="board-toolbar">' +
      btn('收件箱', 'mail-tab', 'current') +
      btn('已归档', 'mail-tab', 'archived') +
      '</div><div class="tile mail"><h3>' +
      (state.archiveTab ? '已归档' : '收件箱') +
      '</h3>' +
      (show
        ? btn(
            art('profile') +
              '<span><b>Joel Becker</b><small>When is the Sketch version available for download?</small></span>',
            'thread',
            '',
            'product-row',
          )
        : '<p>此处暂无消息。</p>') +
      '</div>'
    );
  }
  function activityView() {
    return (
      panelHead('Your activity', '团队动态') +
      '<div class="tile">' +
      ['Donald Franklin', 'Ollie White']
        .map((name, i) =>
          btn(
            art(i ? 'member' : 'owner') +
              '<span><b>' +
              name +
              '</b><small>' +
              ['评论了团队项目', '分享了对插画的反馈'][i] +
              '</small></span><b>↗</b>',
            'comment',
            i,
            'product-row',
          ),
        )
        .join('') +
      '</div>'
    );
  }
  function settingsView() {
    return (
      panelHead('Profile', '个人设置') +
      '<form class="tile settings-form" id="profile-form">' +
      art('profile') +
      '<label>演示昵称<input name="name" required maxlength="30" value="' +
      esc(state.profile) +
      '"></label><label class="check"><input type="checkbox" name="notifications" ' +
      (state.notifications ? 'checked' : '') +
      '> 展示团队通知</label><div><button class="accent">保存设置</button> ' +
      btn('登录界面', 'login') +
      '</div></form>'
    );
  }
  const views = {
    overview,
    board: boardView,
    files: fileView,
    devices: deviceView,
    schedule: scheduleView,
    market: marketView,
    inbox: inboxView,
    activity: activityView,
    settings: settingsView,
  };
  function render() {
    sidebar();
    $('crumb').textContent = routes[state.page][0];
    $('go-back').hidden = !state.trail.length;
    $('panel').innerHTML = views[state.page]();
    if (state.page === 'board') paintMap();
  }
  function create(t = 0) {
    modal(
      '新建构思任务',
      '<form id="create-form"><label>任务名称<input name="title" maxlength="45" required autofocus placeholder="为这次讨论命名"></label><label>画布模板<select name="template">' +
        templates
          .map(
            (v, i) =>
              '<option value="' +
              i +
              '" ' +
              (i === t ? 'selected' : '') +
              '>' +
              v[1] +
              ' · ' +
              v[0] +
              '</option>',
          )
          .join('') +
        '</select></label><button class="accent">创建并进入画布 →</button></form>',
    );
  }
  function editNode(id) {
    const b = board(),
      n = b.nodes.find((n) => n.id === id);
    if (state.link !== null) {
      if (state.link === -1) {
        state.link = id;
        paintMap();
        return;
      }
      if (
        state.link !== id &&
        !b.edges.some(([a, c]) => (a === id && c === state.link) || (a === state.link && c === id))
      )
        b.edges.push([state.link, id]);
      state.link = null;
      paintMap();
      return;
    }
    modal(
      '编辑想法',
      '<form id="node-form" data-id="' +
        id +
        '"><label>节点文字<input name="text" maxlength="40" required autofocus value="' +
        esc(n.text) +
        '"></label><div class="form-actions"><button class="accent">保存</button>' +
        btn('添加关联想法', 'child', id) +
        (id === 0 ? '' : btn('删除节点', 'delete-node', id)) +
        '</div></form>',
    );
  }
  function addNode(parent = 0) {
    modal(
      '添加想法',
      '<form id="add-form" data-parent="' +
        parent +
        '"><label>节点文字<input name="text" maxlength="40" required autofocus placeholder="写下一个想法"></label><button class="accent">添加到画布</button></form>',
    );
  }
  function searchResults(query) {
    const matches = (s) => s.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    const pages = Object.keys(routes)
      .filter((k) => matches(routes[k].join(' ')))
      .map((k) => routeButton(k, routes[k][0] + ' · ' + routes[k][1]));
    const files = state.boards.flatMap((b, i) =>
      matches(b.name) ? [btn('画布 · ' + esc(b.name), 'open-file', i)] : [],
    );
    $('results').innerHTML = [...pages, ...files].join('') || '<p>未找到匹配项。</p>';
  }
  function thread() {
    modal(
      'Joel Becker',
      '<article class="message"><b>Joel Becker</b><p>When is the Sketch version available for download?</p></article>' +
        state.reply
          .map(
            (r) =>
              '<article class="message"><b>' + esc(state.profile) + '</b><p>' + esc(r) + '</p></article>',
          )
          .join('') +
        '<form id="reply-form"><label>演示回复<input name="reply" required maxlength="250"></label><div class="form-actions"><button class="accent">添加回复</button>' +
        btn(state.archived ? '移回收件箱' : '归档会话', 'archive-mail') +
        '</div></form>',
    );
  }
  function showScreen(index) {
    const [asset, title, page] = screens[index];
    modal(
      title,
      '<div class="screen-viewport">' +
        art('screen-' + asset, '', title + '设计稿') +
        '</div><div class="screen-controls">' +
        btn('← 上一张', 'screen', (index + screens.length - 1) % screens.length) +
        '<span>' +
        (index + 1) +
        ' / ' +
        screens.length +
        '</span>' +
        btn('下一张 →', 'screen', (index + 1) % screens.length) +
        btn('放大', 'screen-zoom', '', 'zoom-screen') +
        btn('体验此界面 ↗', page === 'login' ? 'login' : 'route', page, 'accent') +
        '</div>',
    );
    dlg.classList.add('screen-dialog');
  }
  const actions = {
    screen: (v) => showScreen(Number(v)),
    'screen-zoom'() {
      const view = dlg.querySelector('.screen-viewport');
      const zoomed = view.classList.toggle('enlarged');
      dlg.querySelector('.zoom-screen').textContent = zoomed ? '适应宽度' : '放大';
    },
    about() {
      modal(
        '项目说明',
        '<p>BOOMIND 是一个围绕团队头脑风暴设计的工作台。首页提供课程大纲、基础思维导图和方案构思三种模板，团队可以用节点记录想法，以连线表达关联。</p><p>文件库存放画布，设备页显示负责人、关联项目与连接时长，日程页把设计任务放进具体时段。页面使用原 Figma 文件中的标志、几何体、头像与模板图标制作。</p><p class="fine">交互演示中的编辑保留在本次打开的工作台内。</p>',
      );
    },
    close,
    menu() {
      menu(!$('workspace').classList.contains('menu-open'));
    },
    back() {
      const prev = state.trail.pop();
      if (prev) go(prev[0], prev[1], false);
    },
    route: (k) => go(k),
    'open-board': () => go('board'),
    'open-devices': () => go('devices'),
    'open-file': (v) => go('board', Number(v)),
    create: () => create(),
    template: (v) => create(Number(v)),
    'add-node': () => addNode(),
    child: (v) => addNode(Number(v)),
    link() {
      state.link = state.link === null ? -1 : null;
      paintMap();
    },
    zoom: (v) => {
      state.zoom = Math.min(1.8, Math.max(0.8, Math.round((state.zoom + Number(v)) * 10) / 10));
      paintMap();
    },
    'delete-node': (v) => {
      const b = board(),
        id = Number(v);
      b.nodes = b.nodes.filter((n) => n.id !== id);
      b.edges = b.edges.filter((e) => !e.includes(id));
      close();
      paintMap();
    },
    search() {
      modal(
        '搜索工作台',
        '<label>页面或画布名称<input type="search" id="query" autofocus placeholder="例如：日程、Basic mind map"></label><div id="results" class="search-results"></div>',
      );
      searchResults('');
    },
    notifications() {
      state.unread = false;
      render();
      modal(
        '团队通知',
        state.notifications
          ? '<div class="search-results">' +
              btn('Joel Becker · 收件箱有一条消息 ↗', 'thread') +
              routeButton('activity', '查看团队动态 ↗') +
              '</div>'
          : '<p>团队通知已关闭。</p>' + routeButton('settings', '前往设置'),
      );
    },
    progress: (v) => {
      const i = Number(v);
      modal(
        ['Folio Agency', 'Folio Designer', 'Unity Comps'][i],
        '<p>项目进度 ' +
          [75, 62, 2][i] +
          '%</p><div class="form-actions">' +
          routeButton('schedule', '查看日程 →') +
          routeButton('files', '打开文件库') +
          '</div>',
      );
    },
    product: (v) => {
      const p = products[Number(v)];
      modal(
        p[0],
        art(p[1], 'detail-art') +
          '<dl><dt>负责人</dt><dd>' +
          p[2] +
          '</dd><dt>连接日期</dt><dd>' +
          p[4] +
          '</dd><dt>关联项目</dt><dd>' +
          p[5] +
          '</dd><dt>连接时长</dt><dd>' +
          p[6] +
          '</dd></dl>' +
          routeButton('schedule', '查看工作日程 →'),
      );
    },
    event: (v) => {
      const e = scheduled[Number(v)];
      modal(
        e[3],
        '<p>2024 年 8 月 ' +
          e[1] +
          ' 日 · ' +
          e[2] +
          '</p><p>' +
          e[4] +
          '</p>' +
          routeButton('files', '打开项目文件库 →'),
      );
    },
    material: (v) => {
      const i = Number(v);
      modal(
        materials[i][0],
        art(materials[i][1], 'detail-art') +
          btn(state.saved.has(i) ? '移出文件库' : '收藏到文件库', 'save-material', i, 'accent'),
      );
    },
    'save-material': (v) => {
      const i = Number(v);
      if (state.saved.has(i)) state.saved.delete(i);
      else state.saved.add(i);
      close();
      render();
      tell(state.saved.has(i) ? '已收藏到文件库' : '已移出文件库');
    },
    'mail-tab': (v) => {
      state.archiveTab = v === 'archived';
      render();
    },
    thread,
    'archive-mail': () => {
      state.archived = !state.archived;
      close();
      render();
      tell(state.archived ? '会话已归档' : '已移回收件箱');
    },
    comment: (v) =>
      modal(
        '团队评论',
        '<p>' +
          [
            'Donald Franklin · 对按钮文字的对齐方式提出了问题。',
            'Ollie White · “Love this so much! What tools do you use to create your 3d illustrations?”',
          ][Number(v)] +
          '</p>' +
          routeButton('market', '查看素材市场 →'),
      ),
    login() {
      modal(
        'Login now',
        art('mark', 'login-mark') +
          '<p>以演示成员身份进入 BOOMIND。</p>' +
          btn('以 ' + esc(state.profile) + ' 进入 →', 'route', 'overview', 'accent'),
      );
    },
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (a && actions[a.dataset.action]) actions[a.dataset.action](a.dataset.value);
    if (e.target.closest('#panel') && $('workspace').classList.contains('menu-open')) menu(false);
  });
  document.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target,
      data = new FormData(f),
      val = (k) => (data.get(k) || '').trim();
    if (f.id === 'create-form' && val('title')) {
      state.boards.push(makeBoard(val('title'), Number(val('template'))));
      go('board', state.boards.length - 1);
    }
    if (f.id === 'node-form' && val('text')) {
      board().nodes.find((n) => n.id === Number(f.dataset.id)).text = val('text');
      close();
      paintMap();
    }
    if (f.id === 'add-form' && val('text')) {
      const b = board(),
        p = b.nodes.find((n) => n.id === Number(f.dataset.parent)),
        id = b.next++;
      b.nodes.push({
        id,
        text: val('text'),
        x: Math.min(86, Math.max(14, p.x + (id % 2 ? 19 : -19))),
        y: Math.min(83, Math.max(17, p.y + ((id % 3) - 1) * 20 + 8)),
      });
      b.edges.push([p.id, id]);
      b.layer = 0;
      state.link = null;
      close();
      render();
    }
    if (f.id === 'profile-form' && val('name')) {
      state.profile = val('name');
      state.notifications = data.has('notifications');
      render();
      tell('本次演示的设置已保存');
    }
    if (f.id === 'reply-form' && val('reply')) {
      state.reply.push(val('reply'));
      thread();
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'query') searchResults(e.target.value);
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'progress-level') board().progress = Number(e.target.value);
    if (e.target.id === 'layer') {
      board().layer = Number(e.target.value);
      state.link = null;
      paintMap();
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      actions.search();
    }
    if (e.key === 'Escape' && !dlg.open) menu(false);
  });
  let grip;
  $('panel').addEventListener('pointerdown', (e) => {
    const node = e.target.closest('[data-node]');
    if (!node || e.button !== 0 || grip) return;
    delete node.dataset.handled;
    const n = board().nodes.find((n) => n.id === Number(node.dataset.node));
    grip = { pointer: e.pointerId, node, n, x: n.x, y: n.y, cx: e.clientX, cy: e.clientY, moved: false };
    node.setPointerCapture(e.pointerId);
  });
  $('panel').addEventListener('pointermove', (e) => {
    if (grip?.pointer !== e.pointerId) return;
    const { n, cx, cy, node } = grip,
      dx = e.clientX - cx,
      dy = e.clientY - cy;
    if (!grip.moved && Math.hypot(dx, dy) < 5) return;
    grip.moved = true;
    const r = $('map-stage').getBoundingClientRect();
    n.x = Math.max(12, Math.min(88, grip.x + (100 * dx) / r.width));
    n.y = Math.max(14, Math.min(86, grip.y + (100 * dy) / r.height));
    node.style.left = n.x + '%';
    node.style.top = n.y + '%';
    const boardNodes = new Map(board().nodes.map((x) => [x.id, x]));
    const visible = board().edges.filter((pair) =>
      pair.every((id) => $('map-nodes').querySelector('[data-node="' + id + '"]')),
    );
    $('map-stage')
      .querySelectorAll('line')
      .forEach((line, i) => {
        const [a, b] = visible[i].map((id) => boardNodes.get(id));
        for (const [k, v] of Object.entries({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })) line.setAttribute(k, v);
      });
  });
  $('panel').addEventListener('pointerup', (event) => {
    if (grip?.pointer !== event.pointerId) return;
    const {node, n, moved} = grip;
    grip = null;
    node.dataset.handled = 'true';
    if (!moved) editNode(n.id);
  });
  function cancelGesture(event) {
    if (grip?.pointer === event.pointerId) grip = null;
  }
  $('panel').addEventListener('pointercancel', cancelGesture);
  $('panel').addEventListener('lostpointercapture', cancelGesture);
  $('panel').addEventListener('click', (event) => {
    const node = event.target.closest('[data-node]');
    if (node && (event.detail === 0 || !node.dataset.handled)) editNode(Number(node.dataset.node));
  });
  // Internal jumps in a scene reader must not add joint history entries.
  if (parent !== window)
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      document.querySelector(a.hash)?.scrollIntoView();
    });
  $('screen-gallery').innerHTML = screens
    .map(([name, label], i) =>
      btn(
        '<img src="assets/boomind/screen-' +
          name +
          '.webp' +
          (revision ? '?build=' + encodeURIComponent(revision) : '') +
          '" loading="lazy" alt=""><span>' +
          label +
          ' ↗</span>',
        'screen',
        i,
        'screen-card',
      ),
    )
    .join('');
  render();
  // Bind the exhibit's return link as soon as the controls are interactive.
  try {
    window.frameElement?.dispatchEvent(new Event('cecilia-project-ready'));
  } catch {
    // A cross-origin embed can still use the standalone navigation.
  }
})();
