"""Verify the published Macro Tracker runtime without touching personal data."""
import json,time,urllib.request
base='https://mundusmortem.github.io/Mundus-Apps/apps/macro-tracker/'
for attempt in range(6):
 try:
  with urllib.request.urlopen(base,timeout=20) as response:
   assert response.status==200
   assert 'Macro Tracker · Mundus Apps' in response.read().decode()
  for name,marker in [('app.mjs','saveState'),('storage.mjs','indexedDB'),('vendor/zxing-browser.min.js','ZXingBrowser')]:
   with urllib.request.urlopen(base+name,timeout=20) as response:assert marker in response.read().decode()
  with urllib.request.urlopen(base+'manifest.webmanifest',timeout=20) as response:assert json.load(response)['scope']=='./'
  print('Published Macro Tracker verified: HTTP 200, local storage runtime, bundled barcode decoder and scoped manifest.')
  break
 except Exception:
  if attempt==5:raise
  time.sleep(10)
