import { mkdir, copyFile, cp, access, rm } from 'node:fs/promises';
await rm('_site', {recursive:true,force:true});
await mkdir('_site', {recursive:true});
for (const file of ['index.html','app.js','catalog.mjs','apps.json','styles.css','theme.css','install.mjs','install.css','icon-192.png','icon-512.png','sw.js','icon.svg','manifest.webmanifest']) await copyFile(file, `_site/${file}`);
try { await access('apps'); await cp('apps','_site/apps',{recursive:true}); } catch(error) { if(error.code !== 'ENOENT') throw error; }
