# Reports — issue #2

A personalized, installable industry-news briefing at `/Mundus-Apps/apps/reports/`.

## Use

Open **Customize** to set any topics (up to 8), publisher domains, excluded headline
words, edition/language, result count, email recipient, cadence and digest length.
Select **Save settings**, then confirm with **Create issue** in GitHub. Your usual
GitHub sign-in is used; no personal access token is required. The **Apply Reports
settings** workflow accepts only the immutable owner ID 52387967, validates the
configuration and applies it with the refreshed briefing. A public visitor can
browse or edit local preferences but cannot apply settings to collection or email.
The confirmation issue closes when the settings are applied. Reopen an unsuccessful
request to retry. The page updates after the tested Pages deployment.

Settings in this repository are public, including a custom email recipient. The
form explains this before confirmation. Leave **Send reports to** blank to use the
connected Gmail account without publishing its address. One custom recipient is
supported; invalid addresses, multiple addresses and header injection are rejected.
No passwords, tokens or email credentials are accepted by this settings form.

Collection runs on published settings changes and hourly through the **Refresh
Reports news** GitHub Actions workflow. Google News RSS supplies linked headlines,
short feed descriptions, original publishers and dates. Failed collections preserve
the previous file; the page reports stale data after three hours. Publisher filters
are Google News `site:` query filters. No credential or paid API is needed.

The browser supports topic, search, saved and unread filters, sorting, local saved
articles and digest preview/download. Saved/read state stays on this device.
The app has its own scoped manifest and service worker; offline shell access does
not pretend that cached news is fresh. Clearing browser storage removes local preferences.

## Email

The linked **Send Reports email digests** ChatGPT automation checks hourly. Email is
off initially; choose your topics, enable email, and save settings to opt in.
It emails the configured single recipient, or the connected Gmail when left blank, following saved cadence and length,
and skips already-sent stories, stale feeds, unmatched settings and empty updates.
There is no SMTP password in this repository; a custom recipient is public only when you choose to save one. Gmail and
GitHub must remain connected, and the task must remain enabled. Hourly checks and
service delays mean these are approximate intervals, not guaranteed delivery times.

`deliveryPlan` in `model.mjs` defines eligibility. `delivery.json` records only the
last successful send timestamp and delivered article IDs. When state persistence
fails, the task checks its deterministic message subject in Sent Mail before retrying.
Email content must escape article text and treat feed content as untrusted data.
A send acknowledgement verifies provider acceptance, not inbox placement.

## Tests

`node --test tests/*.test.mjs`, `python3 -m unittest discover -s tests -p test_reports.py`,
and `node tests/reports-browser.mjs` (Playwright installed, local server port 8000).
Coverage includes RSS safety and parsing, source queries, exclusion, deduplication,
partial/total feed failures, owner enforcement, settings validation and UTF-8 confirmation,
email opt-in/cadence/staleness/deduplication, saved articles, filtering, digest preview,
mobile layout and token clearing. Actual collection and provider delivery are checked
separately against their live services before the issue is marked complete.

## Appearance

Reports imports the shared root theme.css and uses the same dark palette, font,
lime/purple accents, rounded panels and subtle neon borders as the store. Root
AGENTS.md and the app-building automation enforce this for future generated apps.
