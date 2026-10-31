# Reports

A personalized industry-news PWA with its own deterministic news and email backend.
No ChatGPT task, Gmail connector, or model execution is used for email delivery.

## Use

In **Customize**, choose topics, publisher domains, exclusions, edition/language,
article count, recipient, cadence and digest size. Select **Save settings**, then
**Create issue** on GitHub to confirm with your usual sign-in. The owner-verified
workflow accepts only numeric account ID 52387967 and validates the request.
No pasted GitHub token is needed. The repository is public: confirmed settings,
including a custom recipient if chosen, are visible here. A blank recipient sends
to the privately configured sender address without publishing that address.

Reports uses the same shared dark theme as the store. Saved/read articles and
local preferences stay on this device. The feed supports search, topic, saved,
unread and publisher sorting, plus a digest preview/download. Its manifest and
service worker are scoped to apps/reports/ and cache the offline shell.

## Native news and email backend

The **Refresh Reports news** workflow collects public Google News RSS hourly and
runs `scripts/reports_email.py`. The settings workflow runs the same code after
applying owner-confirmed changes. Email eligibility uses `deliveryPlan` from the
app's `model.mjs` through `scripts/reports_plan.mjs`: enabled, due, matching settings,
fresh non-future collection, unseen HTTPS articles and configured digest size.

Email is sent directly over certificate-verified SMTP TLS. Feed content is escaped,
links are validated, and no generated claims are added. The public app reads the
sanitized `email-status.json` to show sender setup, last send, next eligibility,
errors or a pending review. Credentials never appear in source, page inputs,
delivery status or logs. Provider acceptance does not prove inbox placement.

The previous GPT email task is disabled. `delivery.json` preserves the existing
send history so migration does not resend already-delivered stories.

## Sender setup

One-time setup is necessary because a ChatGPT Gmail connection cannot be reused
as a credential by a GitHub-hosted application backend. Do not paste mail passwords
in ChatGPT, this repository, a settings issue, or the app.

In [GitHub Actions secrets](https://github.com/MundusMortem/Mundus-Apps/settings/secrets/actions),
add these **repository secrets**:

- `REPORTS_SMTP_USERNAME`: the sender's Gmail address.
- `REPORTS_SMTP_PASSWORD`: a [Google app password](https://myaccount.google.com/apppasswords),
  not the normal Google account password. Google requires two-step verification
  and an account that supports app passwords.

The default is Gmail at `smtp.gmail.com:465` with implicit TLS. If using a different
SMTP provider, set repository **variables** `REPORTS_SMTP_HOST` and
`REPORTS_SMTP_PORT`. Other ports use mandatory STARTTLS. If its login username is
not an email address, add the secret `REPORTS_SMTP_FROM` with your verified sender
address. The app's optional recipient overrides the sender-address default.

After adding secrets, run **Actions → Refresh Reports news → Run workflow**, or
wait for its hourly run. The app's email status will update after Pages deployment.
Normal cadence still applies: checking setup does not force a duplicate report.
There is no paid service required by this implementation.

## Delivery safety and recovery

All news/settings/email workflows share the same concurrency group. Before SMTP,
a pending delivery journal is committed using a fresh GitHub blob SHA. After
provider acceptance, lastSentAt and delivered article IDs are committed. State
updates merge the latest contents and retry only SHA conflicts, never the email.
Failures known to precede provider acceptance can retry on the next run. An
ambiguous disconnect or an interrupted confirmation leaves the pending journal
in place and blocks automatic resends.

If the app says a send needs review, search the sender's Sent Mail/provider logs
for the journal's Message-ID or `Reports digest [key]`. If accepted, merge its IDs
and actual timestamp into delivery.json and remove pending. If definitely not
sent, remove pending to permit the next run. Use GitHub's owner-authenticated web
editor for recovery; do not clear a pending record without checking the provider.

## Validation

Run `node --test tests/*.test.mjs` and
`python3 -m unittest discover -s tests -p 'test_reports*.py'`.
Chromium checks run with `node tests/reports-browser.mjs` on the local server.
Tests cover RSS safety, parsing, deduplication, exclusions and feed failures;
owner-only settings confirmation and recipient/header validation; dark theme,
mobile layout, filtering, saves, previews and offline scope; shared email cadence,
TLS authentication, HTML escaping, durable send reservation, refusal, ambiguous
failure, and state persistence failure after acceptance. Real provider delivery
can only be verified after the private sender secrets are configured.
