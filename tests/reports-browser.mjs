import { chromium } from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/apps/reports/data.json',route=>route.fulfill({json:{generatedAt:new Date().toISOString(),errors:[],articles:[{id:'1',title:'AI industry update <safe>',source:'Example',url:'https://example.com/story',themes:['Technology'],publishedAt:'2026-10-31T00:00:00Z',summary:'An industry update.'}]}}));
 await page.goto('http://127.0.0.1:8000/apps/reports/');await page.getByRole('link',{name:'AI industry update <safe>'}).waitFor();
 await page.getByRole('button',{name:'Save AI industry update <safe>',exact:true}).click();await page.getByLabel('Saved articles',{exact:true}).check();assert.equal(await page.locator('.story').count(),1);
 await page.getByLabel('Search headlines and publishers').fill('unmatched');assert.equal(await page.locator('.story').count(),0);await page.getByLabel('Search headlines and publishers').fill('');
 await page.getByRole('button',{name:'Preview email report'}).click();assert.match(await page.locator('#digestText').textContent(),/https:\/\/example.com\/story/);await page.locator('#closeDigest').click();
 await page.getByRole('button',{name:'Customize',exact:true}).click();await page.getByLabel('Topics · one per line, up to 8',{exact:true}).fill('Technology\nClean energy');await page.getByLabel('Send reports to my connected Gmail account').check();await page.getByRole('button',{name:'Save on this device',exact:true}).click();await page.getByText('Saved on this device. Publish saved settings below to apply collection and email changes.',{exact:true}).waitFor();
 let writes=0;await page.route('https://api.github.com/user',route=>route.fulfill({json:{id:123,login:'MundusMortem'}}));await page.route('https://api.github.com/repos/**',route=>{writes++;return route.fulfill({json:{}});});
 await page.getByLabel('GitHub token · Mundus-Apps, Contents: Read and write',{exact:true}).fill('fake-secret');await page.getByRole('button',{name:'Publish saved settings',exact:true}).click();await page.getByText('Only MundusMortem can publish settings. Check your token.',{exact:true}).waitFor();assert.equal(writes,0);assert.equal(await page.locator('#syncToken').inputValue(),'');
 await page.locator('#closeSettings').click();await page.reload();await page.getByRole('button',{name:'Clean energy',exact:true}).waitFor();assert.ok(!(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).includes('fake-secret'));assert.deepEqual(errors,[]);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));console.log('Reports browser checks passed: filtering, saving, digest preview, settings persistence, owner enforcement, token clearing, mobile layout.');
}finally{await browser.close();}
