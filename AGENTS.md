# Mundus Apps requirements

## Workflow and content

Build and change apps only from the owner's instructions in ChatGPT chat.
Do not add a request form, token field, or automated issue-driven app builder.
Macro Tracker and Reports were explicitly removed; do not restore them.
Keep product text to functional labels and basic directions. Do not add slogans,
marketing copy, decorative text, or placeholder apps.

## Appearance

Match Ace Tools: near-black background, subtle red ambient light, restrained red
accents, system sans-serif typography, thin borders and rounded dark cards.
Import shared root theme.css in future apps (../../theme.css for apps/<slug>/).
Use compact functional layouts, responsive sizing, readable contrast and clear
keyboard focus. Scope app-specific styles. Bump offline cache versions when
assets change. Run theme and mobile browser checks.

## Settings and runtime

Do not require pasted personal access tokens. Keep credentials out of source and
browser storage. Build runtime features into deterministic app/backend code,
not ChatGPT tasks. Preserve existing preferences and data unless removal is
explicitly requested. Never expose secrets in this public repository.

## Publication

Preserve apps and catalog records outside the requested change. Each completed
app has one permanent apps.json ID. Run repository and relevant app checks,
verify the matching Pages deployment, and report any verification limit.

## Installation

Use shared install.mjs and install.css for each Install button. Use native prompts
when available and platform-specific steps otherwise; distinguish requested from
confirmed installation. Provide real 192px and 512px PNG icons and an Apple touch
icon. Cache shared installation assets in scoped app workers. Do not clear local
user data during installation or updates. Test fallback, dismissal, failure,
standalone state and manifest eligibility.
