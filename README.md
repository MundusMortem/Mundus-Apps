# Mundus Apps

Apps are built and changed through ChatGPT chat. The site lists completed apps;
there is no request form or issue-driven app builder.

Macro Tracker and Reports have been removed, including their scheduled workflows.

`apps.json` contains completed app cards with permanent unique IDs, names,
descriptions and HTTPS or `./apps/<slug>/` URLs. New apps use the shared theme and
installation helpers. Keep UI text to functional labels and basic directions.

## Develop

Serve with `python3 -m http.server 8000` and run:

```
node --test tests/*.test.mjs
node --check app.js
node --check sw.js
node tests/browser.mjs
node tests/install-browser.mjs
node tests/stage.mjs
```

Browser tests require Playwright 1.56.1 and Chromium. The Pages workflow runs these
checks and deploys public runtime files from `_site` on pushes to main.
