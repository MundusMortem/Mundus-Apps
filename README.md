# Mundus Apps

A private, mobile-first app storefront for installable progressive web apps (PWAs).

## Launch locally

Open `index.html` in a local development server. Service workers require a secure context (HTTPS) or `localhost`.

## Adding an app

Edit the `apps` list in `app.js`. Each item supports:

- `name`, `tagline`, `description`
- `url` — the app's hosted PWA URL
- `accent` — a CSS color used by its card
- `icon` — an emoji or a short label
- `featured` — optional promotion badge

The storefront itself is installable. For the apps listed here, use **Open app** and then choose **Add to Home Screen** in your browser; that installs each app as its own PWA when its own manifest and service worker are configured.
