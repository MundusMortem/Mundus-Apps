export function validateCatalog(data) {
  if (!Array.isArray(data)) throw new Error('The app catalog must be a list.');
  const ids = new Set();
  for (const app of data) {
    if (!app.id || typeof app.id !== 'string' || ids.has(app.id)) throw new Error('Each app needs a unique id.');
    ids.add(app.id);
    if (typeof app.name !== 'string' || !app.name.trim() || typeof app.description !== 'string') throw new Error('Each app needs a name and description.');
    if (typeof app.url !== 'string' || !/^(https:\/\/|\.\/apps\/)/.test(app.url)) throw new Error('Apps need an HTTPS or local apps URL.');
    const url = new URL(app.url, 'https://mundusmortem.github.io/Mundus-Apps/');
    if (url.protocol !== 'https:' || url.username || url.password || (app.url.startsWith('./') && !url.pathname.startsWith('/Mundus-Apps/apps/'))) throw new Error('Invalid app URL.');
    if (app.accent && !/^#[0-9a-f]{6}$/i.test(app.accent)) throw new Error('Accent must be a six-digit hex color.');
  }
  return data;
}
