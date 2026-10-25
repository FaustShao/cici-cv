const data = window.RESUME;
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const set = (id, value) => { document.getElementById(id).textContent = value; };
function safeUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
function link(label, value) {
  const url = safeUrl(value);
  const node = el(url ? 'a' : 'span', '', label);
  if (url) { node.href = url; if (url.startsWith('http')) { node.target = '_blank'; node.rel = 'noopener noreferrer'; } }
  return node;
}
document.title = `${data.name} · 个人简历`;
document.querySelector('meta[name="description"]').content = `${data.name}｜${data.role}`;
for (const [id, value] of Object.entries({ name: data.name, role: data.role, summary: data.summary, about: data.about, initial: data.name.slice(-2), 'english-name': data.englishName, location: data.location, availability: data.availability, 'footer-name': `${data.name} / PERSONAL RESUME` })) set(id, value);
const photo = document.getElementById('portrait-photo');
photo.src = data.photo;
photo.alt = `${data.name}的照片`;
(data.personal || []).forEach(item => document.getElementById('personal').append(el('span', '', item)));
data.contacts.forEach(item => document.getElementById('contacts').append(link(item.label, item.url)));
data.experience.forEach(item => {
  const article = el('article', 'experience-item');
  article.append(el('p', 'period', item.period), el('h3', '', item.title), el('p', 'company', item.company), el('p', 'description', item.description));
  const list = el('ul'); item.achievements.forEach(value => list.append(el('li', '', value))); article.append(list);
  document.getElementById('experience-list').append(article);
});
data.projects.forEach(item => {
  const card = el('article', 'project-card');
  card.append(el('p', 'eyebrow', item.category), el('h3', '', item.name), el('p', 'description', item.description));
  if (item.details) { const list = el('ul', 'project-details'); item.details.forEach(text => list.append(el('li', '', text))); card.append(list); }
  const tags = el('div', 'tags'); item.tags.forEach(tag => tags.append(el('span', '', tag))); card.append(tags);
  if (safeUrl(item.url)) card.append(link('查看项目 ↗', item.url));
  document.getElementById('project-list').append(card);
});
data.skills.forEach(group => {
  const block = el('div', 'skill-group'); block.append(el('h3', '', group.name));
  const tags = el('div', 'tags'); group.items.forEach(item => tags.append(el('span', '', item))); block.append(tags); document.getElementById('skills').append(block);
});
data.education.forEach(item => { const block = el('article', 'education'); block.append(el('p', 'period', item.period), el('h3', '', item.school), el('p', 'description', item.degree)); if (item.details) block.append(el('p', 'description', item.details)); document.getElementById('education').append(block); });
const contact = data.contacts.find(item => item.url.startsWith('mailto:'));
if (contact) { const href = safeUrl(contact.url); if (href) document.getElementById('contact-link').href = href; }
const themeButton = document.getElementById('theme');
function applyTheme(theme) { document.documentElement.dataset.theme = theme; themeButton.setAttribute('aria-pressed', String(theme === 'dark')); themeButton.textContent = theme === 'dark' ? '浅色模式' : '深色模式'; }
let savedTheme;
try { savedTheme = localStorage.getItem('resume-theme'); } catch { /* Storage may be disabled. */ }
applyTheme(['light', 'dark'].includes(savedTheme) ? savedTheme : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
themeButton.addEventListener('click', () => { const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; applyTheme(theme); try { localStorage.setItem('resume-theme', theme); } catch { /* Theme still works without storage. */ } });
document.getElementById('print').addEventListener('click', () => window.print());

(data.awards || []).forEach(item => { const block = el('article', 'award'); block.append(el('p', 'period', item.period), el('h3', '', item.name), el('p', 'description', item.description)); document.getElementById('awards').append(block); });
