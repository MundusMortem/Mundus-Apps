import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:8000');
  await page.getByRole('button',{name:'Create new'}).click();
  await page.getByLabel('App name',{exact:true}).fill('Budget & bills');
  await page.getByLabel('What should it do?').fill('Track costs and export CSV');
  let request;
  await page.route('https://github.com/**', async route => {
    request = new URL(route.request().url());
    await route.fulfill({contentType:'text/html',body:'<h1>GitHub request</h1>'});
  });
  await page.getByRole('button',{name:'Continue to GitHub'}).click();
  await page.waitForURL('https://github.com/**');
  assert.equal(request.searchParams.get('title'),'[App request] Budget & bills');
  assert.match(request.searchParams.get('body'),/Track costs and export CSV/);
  await page.route('**/apps.json', route => route.fulfill({json:[{id:'budget',name:'Budget <app>',description:'Track expenses',url:'./apps/budget/'}]}));
  await page.goto('http://127.0.0.1:8000');
  await page.getByRole('link',{name:'Budget <app> Track expenses'}).waitFor();
  assert.match(await page.locator('#readyNotice').textContent(),/Ready to open: Budget <app>/);
  assert.equal(await page.locator('#appCount').textContent(),'1 APP');
  assert.equal(await page.locator('#appGrid a').getAttribute('href'),'./apps/budget/');
  await page.reload();
  await page.getByRole('link',{name:'Budget <app> Track expenses'}).waitFor();
  assert.equal(await page.locator('#readyNotice').isVisible(),false);
  await page.route('**/apps.json',route => route.fulfill({status:503,body:'Unavailable'}));
  await page.getByRole('button',{name:'Refresh apps'}).click();
  await page.getByText('Could not refresh your apps. Check your connection and try again.').waitFor();
  assert.equal(await page.locator('#appGrid a').count(),1);
  assert.deepEqual(errors,[]);
  console.log('Browser checks passed: request submission, safe cards, readiness notice, refresh failure.');
} finally { await browser.close(); }
