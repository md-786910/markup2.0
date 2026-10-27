# Phase 3: Developer-ready reports

**Status: Planned · Size: S (about 3 days)**

## Goal
Every pin carries the technical context a developer needs to reproduce the issue, captured automatically without asking the reviewer anything.

## Why
- Marker.io, Huddlekit and Userback attach browser, OS, screen size, console logs and network data to each report; it's Marker.io's main selling point.
- Console logs in reports are one of the most requested items in BugHerd reviews.
- We already inject a script into every proxied page, so capturing this is cheap for us.

## Scope
**In:** environment details for every new pin (website and document projects), recent console errors and failed network requests for website pins, a "Technical details" section in the pin thread, copy-as-text, the same data in Jira/Slack/Discord/Teams payloads.
**Out:** session replay (Phase 12 candidate), full network HAR, performance metrics.

## What to capture
| Field | Source | Website | Document |
|---|---|---|---|
| Browser + version, OS | `navigator.userAgentData` / UA (parsed server-side with a small parser, no new dependency if possible) | ✓ | ✓ |
| Real screen size and device pixel ratio | `window.screen`, `devicePixelRatio` (reviewer's actual screen) | ✓ | ✓ |
| Simulated device mode + viewport | already stored (`deviceMode`, viewport %) | ✓ | — |
| Page URL and title | proxy script (the real URL, not the proxy URL) | ✓ | — |
| Element selector + text snippet | already `selector`; add `elementText` (first 120 chars) | ✓ | — |
| Recent console errors/warnings | proxy script hooks `console.error/warn`, `window.onerror`, `unhandledrejection`; ring buffer of the last 20, each message max 500 chars | ✓ | — |
| Failed network requests | proxy script already patches fetch/XHR: record method, URL (query stripped), status for 4xx/5xx and network errors; last 20 | ✓ | — |
| Time zone, language | `Intl` | ✓ | ✓ |

## Data model
Add to `Pin`:
```js
context: {
  browser: String, os: String, screen: { w, h, dpr },
  pageTitle: String, elementText: String,
  consoleErrors: [{ level: 'error'|'warn', message: String, at: Date }],   // max 20
  failedRequests: [{ method: String, url: String, status: Number }],       // max 20
  timeZone: String, language: String,
}
```
Validate and truncate server-side (`pin.controller.js`), never trust lengths from the client. Strip query strings and fragments from captured URLs (tokens often live there).

## Implementation
- **Proxy script** (`server/utils/proxyRewriter.js`): add a small ring buffer installed before the site's own scripts run; include the buffer in the `MARKUP_CLICK` payload (`context` field). Keep it under 2 KB of injected code.
- **Client**: `useIframeMessages.js` passes `context` through; `ProjectView` adds browser/screen info from the parent window; `NewPinCommentPopup` sends it with the pin. Guests too (`GuestProjectPage`).
- **Document projects**: only the environment fields.
- **UI**: in `CommentSidebar`, a collapsible "Technical details" block under the screenshot: browser · OS · screen · device mode, page URL, then "3 console errors" / "1 failed request" expandable lists, and a "Copy details" button (Markdown).
- **Integrations**: Jira issue description and Slack/Discord/Teams messages get a short "Environment" line and error counts.
- **Privacy**: console messages can contain personal data. Add a project setting "Capture console errors" (on by default for members, off for guest reviewers unless the owner enables it), and mention it on the privacy page.

## Tests
- Smoke: a pin created with an oversized `context` is truncated; URLs lose query strings; guest pins accept environment fields.
- Manual: proxied test page that throws an error and calls a 404 URL, then pin → details show both.

## Acceptance criteria
- A developer opening a pin sees browser, OS, screen, page and the errors around the click without asking the reviewer.
- Jira issues created from pins include the same details.
- Captured data never contains query strings, cookies or form values.

## Sources
- [Marker.io: session replay and console logs](https://marker.io/features/session-replay)
- [BugHerd reviews (G2) – requests for console logs](https://g2.com/products/bugherd/reviews?page=4)
- [Huddlekit on Product Hunt – screenshot, browser, OS, selector per comment](https://www.producthunt.com/posts/1264990)
