# Reports — issue #2

A personalized, installable industry-news briefing at `/Mundus-Apps/apps/reports/`.

## Use

Open **Customize** to set any topics (up to 8), publisher domains, excluded headline
words, edition/language, result count, email cadence and digest length. Save locally,
then publish with an owner GitHub token scoped to this repository with
**Contents: Read and write**. Settings in this public repository are public. Tokens
are verified against owner ID 52387967 and never persisted. A token with only
Issues permission cannot publish settings. Unsaved form changes are not published.

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
off initially; choose your topics, enable email, and publish settings to opt in.
It emails only the connected Gmail account, following published cadence and length,
and skips already-sent stories, stale feeds, unmatched settings and empty updates.
There is no SMTP password or email address in this public repository. Gmail and
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
partial/total feed failures, owner enforcement, settings validation and UTF-8 sync,
email opt-in/cadence/staleness/deduplication, saved articles, filtering, digest preview,
mobile layout and token clearing. Actual collection and provider delivery are checked
separately against their live services before the issue is marked complete.
