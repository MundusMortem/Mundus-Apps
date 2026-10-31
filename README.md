# Mundus Apps

A mobile-first storefront for installable progressive web apps.

## Request an app

Select **Create new** and verify your account with a GitHub fine-grained token
restricted to **Mundus-Apps**, with **Issues: Read and write**. Only the verified
GitHub account with numeric user ID `52387967` (MundusMortem) can submit from the page.
Describe the app and select **Submit app request**. The token is sent directly to
GitHub, held only in page memory, and cleared after submission or dialog close.
It is never saved in browser storage. The identity is checked again before every submission.

A GitHub Actions rule also closes and locks `[App request]` issues from other
accounts if they bypass the page. On a public repository GitHub still permits
people to initially open an issue; those requests are rejected and the build task
must never process them. The repository and issues
are public; keep private information and credentials out of requests.

The linked ChatGPT task checks hourly for open `[App request]` issues created by
`MundusMortem`. It builds the requested app, runs suitable tests, publishes through
GitHub Pages, adds a home-page card, and sends a completion notification in ChatGPT.
This depends on the task remaining enabled and GitHub access remaining connected.
Requests requiring unavailable services or credentials may need more information.
No paid services are implicitly authorized.

## Completed apps

`apps.json` is the source of home-page cards. Add an entry only when its app has
passed relevant tests. Use a permanent unique `id`, `name`, `description`, `url`,
and optional `icon` and six-digit hex `accent`. Local apps live in `apps/<slug>/`
and use `./apps/<slug>/` URLs; external apps require HTTPS.
The home page refreshes every minute while open and when focused, and announces
newly available apps. ChatGPT notifications can arrive while the page is closed.

The Pages workflow validates the catalog and request URLs and tests the form,
card rendering, completion notice, and refresh errors in Chromium before deployment.
Future app-specific tests belong in `tests/`; the build task must add tests suitable
for each app's requirements. Only public runtime files are staged for publication.

## Develop

Serve this directory with `python3 -m http.server 8000`. Run:

```
node --test tests/*.test.mjs
node --check app.js
node --check sw.js
```

The GitHub workflow also runs browser tests using Playwright 1.56.1.
The storefront and each listed app can be installed separately when they provide
an appropriate manifest and service worker. GitHub Pages hosting is public;
the request form verifies the owner through GitHub, while browsing the app catalog remains public.


## Shared app design and Reports settings

All generated apps must use the store's shared dark theme.css and follow AGENTS.md.
Reports settings now use **Customize → Save settings → Create issue on GitHub**.
The owner-verified workflow applies confirmed changes with no pasted token. The
optional **Send reports to** field changes the recipient; blank uses connected Gmail.
A custom recipient is visible in this public repository if saved. This does not
change the storefront's existing request-authentication flow.
