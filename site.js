// Shared navigation, theme and data-backed overview pages.
(() => {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.topbar nav a').forEach(a => {
    if (a.getAttribute('href') === (page === 'gazette.html' ? 'portfolio.html' : page)) a.setAttribute('aria-current', 'page');
  });
  const button = document.getElementById('theme');
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    if (button) { button.setAttribute('aria-pressed', String(theme === 'dark')); button.textContent = theme === 'dark' ? '浅色模式' : '深色模式'; }
  }
  let saved;
  try { saved = localStorage.getItem('resume-theme'); } catch {}
  applyTheme(['light', 'dark'].includes(saved) ? saved : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  button?.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    try { localStorage.setItem('resume-theme', theme); } catch {}
  });
  const data = window.RESUME;
  if (!data) return;
  document.querySelectorAll('[data-profile]').forEach(node => { node.textContent = data[node.dataset.profile] || ''; });
  const archive = document.getElementById('other-projects');
  const portfolio = document.getElementById('portfolio-projects');
  const projects = portfolio || archive;
  if (!projects) return;
  const el = (tag, text, className) => { const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node; };
  data.projects.filter(project => portfolio ? project.collection === 'portfolio' : project.collection !== 'portfolio').forEach(project => {
    const card = el('article', '', 'project-card');
    if (portfolio && project.cover) {
      const preview = el('a', '', 'project-preview');preview.href = project.url;preview.setAttribute('aria-label', `打开 ${project.name}`);
      const cover = document.createElement('img');cover.src = project.cover;cover.alt = `${project.name} 项目封面`;cover.decoding = 'async';
      preview.append(cover);card.append(preview);
    }
    card.append(el('p', project.category, 'eyebrow'), el('h2', project.name), el('p', project.description, 'description'));
    const tags = el('div', '', 'tags');
    project.tags.forEach(tag => tags.append(el('span', tag)));
    card.append(tags);
    if (!portfolio && project.details?.length) {
      const details = el('details', '');
      details.append(el('summary', '研究与设计过程'));
      const list = el('ul', '', 'project-details');
      project.details.forEach(text => list.append(el('li', text)));
      details.append(list); card.append(details);
    }
    if (project.url && /^[-a-zA-Z0-9_/]+\.html$/.test(project.url)) {
      const link = el('a', '打开项目 →');
      link.href = project.url;
      card.append(link);
    }
    projects.append(card);
  });
})();
