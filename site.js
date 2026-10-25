// Shared navigation, theme and data-backed overview pages.
(() => {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.topbar nav a').forEach(a => {
    if (a.getAttribute('href') === page) a.setAttribute('aria-current', 'page');
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
  if (!archive) return;
  const el = (tag, text, className) => { const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node; };
  data.projects.filter(project => project.url !== 'portfolio.html').forEach(project => {
    const card = el('article', '', 'project-card');
    card.append(el('p', project.category, 'eyebrow'), el('h2', project.name), el('p', project.description, 'description'));
    const tags = el('div', '', 'tags');
    project.tags.forEach(tag => tags.append(el('span', tag)));
    card.append(tags);
    if (project.details?.length) {
      const details = el('details', '');
      details.append(el('summary', '研究与设计过程'));
      const list = el('ul', '', 'project-details');
      project.details.forEach(text => list.append(el('li', text)));
      details.append(list); card.append(details);
    }
    archive.append(card);
  });
})();
