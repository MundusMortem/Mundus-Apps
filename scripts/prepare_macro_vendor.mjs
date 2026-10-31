import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('apps/macro-tracker/vendor',{recursive:true});
await copyFile('node_modules/@zxing/browser/umd/zxing-browser.min.js','apps/macro-tracker/vendor/zxing-browser.min.js');
for(const [source,target]of[['node_modules/@zxing/browser/LICENSE','ZXING-BROWSER-LICENSE'],['node_modules/@zxing/library/LICENSE','ZXING-LIBRARY-LICENSE']])await copyFile(source,'apps/macro-tracker/vendor/'+target);
console.log('Prepared pinned, local ZXing decoder and licenses.');
