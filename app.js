import { setupInstallButton } from './install.mjs';
import { validateCatalog } from './catalog.mjs';
const grid = document.querySelector('#appGrid');
const status = document.querySelector('#catalogStatus');
const refreshButton = document.querySelector('#refreshButton');
let loading = false;
function appCard(app) {
  const card = document.createElement('a');
  card.className = 'app-card';
  card.href = app.url;
  const icon = document.createElement('span');
  icon.className = 'app-icon';
  icon.textContent = app.icon || app.name.charAt(0);
  icon.setAttribute('aria-hidden', 'true');
  const name = document.createElement('h2');
  name.textContent = app.name;
  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.textContent = '→';
  arrow.setAttribute('aria-hidden', 'true');
  card.append(icon, name, arrow);
  return card;
}
async function refresh() {
  if (loading) return;
  loading = true;
  refreshButton.disabled = true;
  status.textContent = 'Loading apps…';
  try {
    const response = await fetch('./apps.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Catalog unavailable');
    const apps = validateCatalog(await response.json());
    grid.replaceChildren(...apps.map(appCard));
    document.querySelector('#emptyState').hidden = apps.length > 0;
    status.textContent = '';
  } catch {
    status.textContent = 'Could not load apps. Check your connection and refresh.';
  } finally {
    loading = false;
    refreshButton.disabled = false;
  }
}
refresh();
refreshButton.addEventListener('click', refresh);
window.addEventListener('focus', refresh);
setInterval(() => { if (!document.hidden) refresh(); }, 60000);
setupInstallButton(document.querySelector('#installButton'), {name:'Mundus Apps'});
if ('serviceWorker' in navigator) window.addEventListener('load', async () => {
  try {
    const retired = ['apps/macro-tracker/', 'apps/reports/'].map(path => new URL(path, document.baseURI).href);
    for (const registration of await navigator.serviceWorker.getRegistrations()) {
      if (retired.includes(registration.scope)) await registration.unregister();
    }
    await navigator.serviceWorker.register('./sw.js?v=9');
  } catch { /* The catalog remains usable without offline support. */ }
});
