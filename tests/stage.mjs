import { mkdir, copyFile, cp, access } from 'node:fs/promises';
await mkdir('_site', {recursive:true});
for (const file of ['index.html','app.js','catalog.mjs','apps.json','styles.css','sw.js','icon.svg','manifest.webmanifest']) await copyFile(file, `_site/${file}`);
try { await access('apps'); await cp('apps','_site/apps',{recursive:true}); } catch(error) { if(error.code !== 'ENOENT') throw error; }
