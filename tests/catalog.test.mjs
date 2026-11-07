import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCatalog } from '../catalog.mjs';
test('catalog accepts completed app links and rejects unsafe or malformed records', () => {
  const app = {id:'test',name:'Test',description:'Example',url:'./apps/test/',accent:'#a882ff'};
  assert.equal(validateCatalog([app]).length, 1);
  for (const url of ['javascript:alert(1)', '//evil.example', 'http://example.com', './apps/../../outside', 'https://user:password@example.com']) {
    assert.throws(() => validateCatalog([{...app,url}]));
  }
  assert.throws(() => validateCatalog([app,app]));
  assert.throws(() => validateCatalog([{...app,accent:'red;display:none'}]));
  assert.throws(() => validateCatalog({}));
});
test('deployed catalog is valid and local app entrypoints exist', async () => {
  const apps = validateCatalog(JSON.parse(await readFile(new URL('../apps.json', import.meta.url))));
  for (const app of apps) {
    if (app.url.startsWith('./apps/')) await readFile(new URL(`../${app.url.replace(/\/$/, '/index.html')}`,import.meta.url));
  }
});
