"""Smoke-check the published app after Pages deployment."""
import json
import time
import urllib.request
BASE='https://mundusmortem.github.io/Mundus-Apps/apps/reports/'
for attempt in range(6):
    try:
        with urllib.request.urlopen(BASE,timeout=20) as response:
            assert response.status==200
            assert 'Reports · Your daily perspective' in response.read().decode()
        with urllib.request.urlopen(BASE+'app.mjs',timeout=20) as response:
            assert 'syncConfig' in response.read().decode()
        with urllib.request.urlopen(BASE+'data.json',timeout=20) as response:
            data=json.load(response)
            assert isinstance(data['articles'],list)
            assert data['generatedAt'] and data['articles'], 'Waiting for initial live news collection'
        print(f"Published Reports verified: HTTP 200, app module, {len(data['articles'])} collected stories.")
        break
    except Exception:
        if attempt==5:raise
        time.sleep(10)
