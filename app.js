import { requestURL, validateCatalog } from './catalog.mjs';
const grid = document.querySelector('#appGrid');
const status = document.querySelector('#catalogStatus');
const dialog = document.querySelector('#requestDialog');
let loading = false;
let currentIds = null;
function appCard(app) {
  const card = document.createElement('a');
  card.className = 'app-card';
  card.style.setProperty('--accent', app.accent || '#a882ff');
  card.href = app.url;
  card.target = '_blank';
  card.rel = 'noopener';
  for (const [tag, value, className] of [['div', app.icon || '✦', 'app-icon'], ['h2', app.name, ''], ['p', app.description, '']]) {
    const element = document.createElement(tag);
    element.textContent = value;
    element.className = className;
    card.append(element);
  }
  return card;
}
function render(apps) {
  grid.replaceChildren(...apps.map(appCard));
  const create = document.createElement('button');
  create.type = 'button';
  create.className = 'app-card create-card';
  create.innerHTML = '<span class="create-plus" aria-hidden="true">+</span><h2>Create new</h2><p>Tell me what you want to build.</p>';
  create.addEventListener('click', () => dialog.showModal());
  grid.append(create);
  document.querySelector('#appCount').textContent = `${apps.length} APP${apps.length === 1 ? '' : 'S'}`;
}
async function refresh() {
  if (loading) return;
  loading = true;
  try {
    const response = await fetch('./apps.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Catalog unavailable');
    const apps = validateCatalog(await response.json());
    let previous = currentIds;
    if (!previous) {
      try { previous = JSON.parse(localStorage.getItem('mundus-apps-seen') || '[]'); } catch { previous = []; }
      if (!Array.isArray(previous)) previous = [];
    }
    const added = apps.filter(app => !previous.includes(app.id));
    render(apps);
    status.textContent = apps.length ? '' : 'Your completed apps will appear here.';
    if (added.length) {
      const notice = document.querySelector('#readyNotice');
      notice.textContent = `Ready to open: ${added.map(app => app.name).join(', ')}`;
      notice.hidden = false;
    }
    currentIds = apps.map(app => app.id);
    try { localStorage.setItem('mundus-apps-seen', JSON.stringify(currentIds)); } catch { /* Catalog works with storage disabled. */ }
  } catch {
    status.textContent = 'Could not refresh your apps. Check your connection and try again.';
  } finally { loading = false; }
}
render([]);
refresh();
document.querySelector('#refreshButton').addEventListener('click', refresh);
window.addEventListener('focus', refresh);
setInterval(() => { if (!document.hidden) refresh(); }, 60000);
document.querySelector('#cancelRequest').addEventListener('click', () => dialog.close());
document.querySelector('#requestForm').addEventListener('submit', event => {
  event.preventDefault();
  const name = document.querySelector('#requestName').value;
  const details = document.querySelector('#requestDetails').value;
  window.location.assign(requestURL(name, details));
});
let deferredPrompt;
const installButton = document.querySelector('#installButton');
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredPrompt = event; installButton.hidden = false; });
installButton.addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; installButton.hidden = true; });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=5').catch(() => {}));
