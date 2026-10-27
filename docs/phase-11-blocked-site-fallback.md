# Phase 11: Fallback for sites that block the proxy

**Status: Planned · Size: L (about 3 weeks)**

## Goal
Feedback works on every site, including ones with bot protection or strict login flows that our proxy can't load.

## Why
Our proxy is the "no install" advantage, but sites behind Cloudflare/Akamai bot walls, some SSO logins and some single-page apps (see the Webflow chunk issue in `CLAUDE.md`) fail. Today the app shows "This site blocks review tools". BugHerd, Marker.io and Userback avoid this with a script snippet or a browser extension that runs on the real site.

## Options
| Option | How it works | Pros | Cons |
|---|---|---|---|
| **A. Script snippet** | Site owner adds `<script src="https://api…/embed.js" data-project="…">` to staging | Works for every visitor, no proxy, real cookies and logins | Needs access to the site's code; not for client-owned production sites |
| **B. Browser extension** (Chrome, Edge, Firefox) | Reviewer installs it; it injects our overlay into the real tab | No code change on the site; works behind logins | Reviewers must install it (breaks "no install" for guests) |
| **C. Bookmarklet** | One-click script for a session | No install | Blocked by many CSPs; fragile |

**Recommendation:** build A first (smallest, reuses the injected script), then B for members. Keep the proxy as the default and offer A/B from the blocked-site panel.

## Shared piece: the overlay bundle
Extract the injected script in `proxyRewriter.js` (pin overlay, click capture, screenshots, technical context) into a standalone bundle `server/public/embed/overlay.js` that runs both inside the proxy and on a real site. Communication:
- In the proxy: `postMessage` to the parent app (as today).
- On a real site: its own small panel (composer, pin list) talking to the API directly with a project-scoped token.

## A. Script snippet
- Project setting "Install on your site" shows the snippet with a project token restricted to the project's domain (checked against `Origin`/`Referer`).
- The snippet loads the overlay only when the URL has `?kommently=1` or the reviewer is signed in (cookie on the API domain), so normal visitors never see it.
- Guests open the site through a special link that sets a short-lived review cookie.
- CORS: allow the project's origin for the embed endpoints only.

## B. Browser extension
- Manifest V3, content script injects the overlay into the active tab when the URL matches a project's site.
- Sign in with the app account (OAuth-style handoff), choose project, comment.
- Publish to Chrome Web Store, Edge Add-ons, Firefox AMO.

## Screenshots
On a real site use `chrome.tabs.captureVisibleTab` (extension) for pixel-perfect shots; html2canvas for the snippet.

## Tests
- Embed token works only from the project's domain.
- Overlay bundle size budget (< 60 KB gzipped).

## Acceptance criteria
- When the proxy is blocked, the panel offers "Add the snippet" and "Use the extension", and both let the team pin feedback on the real site.
