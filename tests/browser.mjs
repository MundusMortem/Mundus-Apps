import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || undefined});
try {
  for (const width of [390,1280]) {
    const page = await browser.newPage({viewport:{width,height:844},serviceWorkers:'block'});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:8000');
    await page.getByText('No apps yet.',{exact:true}).waitFor();
    assert.equal(await page.locator('form, #requestDialog, #appGrid a').count(),0);
    assert.equal(await page.getByRole('button',{name:'Create new'}).count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(11, 11, 14)');
    await page.screenshot({path:`/tmp/mundus-${width}.png`,fullPage:true});
    await page.route('**/apps.json',route=>route.fulfill({json:[{id:'test',name:'Test <app>',description:'Functional description',url:'./apps/test/'}]}));
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page.getByRole('link',{name:'Test <app>',exact:true}).waitFor();
    assert.equal(await page.locator('#emptyState').isVisible(),false);
    assert.equal(await page.locator('#appGrid a').getAttribute('href'),'./apps/test/');
    await page.route('**/apps.json',route=>route.fulfill({status:503,body:'Unavailable'}));
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page.getByText('Could not load apps. Check your connection and refresh.').waitFor();
    assert.equal(await page.locator('#appGrid a').count(),1);
    await page.unroute('**/apps.json');
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page.getByText('No apps yet.',{exact:true}).waitFor();
    assert.equal(await page.locator('#appGrid a').count(),0);
    assert.deepEqual(errors,[]);
    await page.close();
  }
  console.log('Passed: mobile/desktop layout, empty catalog, removed requests, safe cards, refresh failure and recovery.');
} finally { await browser.close(); }
