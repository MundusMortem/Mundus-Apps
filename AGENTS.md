# Mundus Apps requirements

## Appearance — applies to every generated app

All apps must use the app store's slick dark theme. Import the shared root
`theme.css` (for apps/<slug>/ use ../../theme.css). Use its background #080910,
panel #11131d, white text, muted gray, lime #d6ff5f, purple #a882ff, Plus Jakarta
Sans typography, rounded 20px panels, thin colored borders and subtle neon glows.
Keep readable contrast, responsive layouts and clear keyboard focus. Do not ship
cream, white, light-mode or unrelated visual themes unless the owner asks.
Scope app-specific layout rules so changing an app does not restyle the store.
Cache shared theme.css in each app's scoped offline shell and bump its cache
version when assets change. Theme checks and mobile browser checks must pass.

## Settings and identity

Do not require users to create, paste or manage personal access tokens to change
app settings. On this static GitHub Pages architecture, use the Reports pattern:
Save settings opens a prefilled GitHub confirmation; the signed-in owner confirms
with Create issue; a workflow checks numeric owner ID 52387967 and validates the
settings before applying. Keep the required GitHub confirmation clear in the UI.
Never substitute an unprotected public write endpoint or a client-only owner check.
Do not put credentials in source or browser storage. This repository is public:
explain when saving settings would publish personal information, including an
optional custom report recipient. Preserve existing preferences during changes.

## Publication

Preserve other apps and catalog records. Each completed app has one permanent
apps.json ID. Run repository and relevant app checks, verify the matching Pages
deployment, and report any verification limit. Use relevant tests, including real
workflow checks when changing authentication or settings writes.

## App runtime behavior

Build runtime features, including scheduled email, into deterministic app/backend
code. Do not substitute ChatGPT tasks for app functionality. Reports uses its own
GitHub Actions backend and SMTP sender. Keep the old GPT email task disabled.
Preserve Reports settings and delivery history; never reset a pending send journal
or mark a report sent before provider acceptance. Show concrete setup/errors in the
app and keep all sender credentials in private GitHub Secrets.
