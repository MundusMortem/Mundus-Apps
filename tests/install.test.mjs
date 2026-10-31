import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {installationSteps} from '../install.mjs';
test('manual install guidance covers iOS/iPad, Android, Safari Mac and desktop',()=>{
 assert.match(installationSteps({userAgent:'iPhone',platform:'iPhone'}).join(' '),/Share.*Add to Home Screen/);
 assert.match(installationSteps({userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:5}).join(' '),/Share/);
 assert.match(installationSteps({userAgent:'Android Chrome'}).join(' '),/Add to Home screen/);
 assert.match(installationSteps({userAgent:'Safari',platform:'MacIntel'}).join(' '),/Add to Dock/);
 assert.match(installationSteps({userAgent:'Chrome',platform:'Linux'}).join(' '),/address bar/);
});
test('each app has real PNG install icons with correct dimensions and stable scope',async()=>{
 for(const root of ['../','../apps/macro-tracker/','../apps/reports/']){
  const base=new URL(root,import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.webmanifest',base)));
  assert.equal(manifest.id,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
  for(const size of [192,512]){const icon=manifest.icons.find(i=>i.sizes===`${size}x${size}`&&i.type==='image/png');assert.ok(icon);const data=await readFile(new URL(icon.src,base));assert.equal(data.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(data.readUInt32BE(16),size);assert.equal(data.readUInt32BE(20),size);}
 }
});
