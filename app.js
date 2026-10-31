import { setupInstallButton } from './install.mjs';
import { verifyOwner, submitRequest } from './request-client.mjs';
import { validateCatalog } from './catalog.mjs';
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
const authForm = document.querySelector('#ownerAuthForm');
const requestForm = document.querySelector('#requestForm');
const requestStatus = document.querySelector('#requestStatus');
const tokenInput = document.querySelector('#ownerToken');
let ownerToken = '';
let authGeneration = 0;
function signOut() {
  authGeneration++;
  ownerToken = '';
  tokenInput.value = '';
  authForm.hidden = false;
  requestForm.hidden = true;
  requestStatus.textContent = '';
}
dialog.addEventListener('close', signOut);
document.querySelector('#cancelAuth').addEventListener('click', () => dialog.close());
document.querySelector('#cancelRequest').addEventListener('click', () => dialog.close());
authForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = authForm.querySelector('[type=submit]');
  const generation = authGeneration;
  const token = tokenInput.value.trim();
  tokenInput.value = '';
  button.disabled = true;
  requestStatus.textContent = 'Verifying your GitHub account…';
  try {
    await verifyOwner(token);
    if (generation !== authGeneration || !dialog.open) return;
    ownerToken = token;
    authForm.hidden = true;
    requestForm.hidden = false;
    requestStatus.textContent = 'Verified as MundusMortem.';
    document.querySelector('#requestName').focus();
  } catch(error) {
    if (generation === authGeneration) requestStatus.textContent = error.message.includes('MundusMortem') ? error.message : 'Could not verify your account. Check your token and connection.';
  } finally { button.disabled = false; }
});
requestForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!ownerToken) { signOut(); requestStatus.textContent = 'Verify your GitHub account first.'; return; }
  const button = requestForm.querySelector('[type=submit]');
  button.disabled = true;
  requestStatus.textContent = 'Submitting your request…';
  const generation = authGeneration;
  try {
    const issue = await submitRequest(ownerToken, document.querySelector('#requestName').value, document.querySelector('#requestDetails').value);
    if (generation !== authGeneration) return;
    requestForm.reset();
    signOut();
    requestStatus.textContent = `Request #${issue.number} submitted. It will be checked within an hour. `;
    const link = document.createElement('a');
    link.href = issue.url;
    link.textContent = 'View request';
    link.target = '_blank';
    link.rel = 'noopener';
    requestStatus.append(link);
  } catch(error) {
    if (generation !== authGeneration) return;
    const message = error.message;
    signOut();
    requestStatus.textContent = message.startsWith('Only ') || message.startsWith('Add an app') || message.startsWith('Request was not confirmed') ? message : 'Request was not confirmed. Check View requests before retrying, then verify your account again.';
  } finally { button.disabled = false; }
});
setupInstallButton(document.querySelector('#installButton'), {name:'Mundus Apps'});
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=8').catch(() => {}));
