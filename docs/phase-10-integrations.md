# Phase 10: More integrations

**Status: Planned · Size: S per integration (2–3 days each)**

## Goal
Send feedback to the tools teams already use: Linear, ClickUp, Asana, Trello and GitHub Issues, next to the existing Slack, Jira, Discord and Teams.

## Why
Integrations are the most common request in BugHerd reviews; Huddlekit, Marker.io and BugHerd all offer Linear, ClickUp, Asana or Trello.

## Approach
Generalize what `jiraSync.js` does into an "issue tracker" interface:
```js
// server/integrations/<type>.js
module.exports = {
  type: 'linear',
  validateConfig(config) { … },        // on connect
  testConnection(config) { … },        // "Send test"
  createIssue({ pin, project, comment, context, screenshotUrl }) → { externalId, url },
  updateStatus({ externalId, status }),      // Phase 8 statuses
  handleWebhook(req) → { pinId, status }?,   // optional two-way sync
};
```
- `Integration.type` enum grows; `Pin.external: [{ type, id, url }]` records links, shown in the pin thread ("Open in Linear").
- Auth: API keys or personal tokens first (simple); OAuth apps later for Linear/Asana/ClickUp marketplace listings.
- Tokens masked in responses like Jira's today.

## Order
1. **Linear** (developer teams, simple GraphQL API, webhooks for two-way status).
2. **GitHub Issues** (open-source and dev agencies).
3. **ClickUp** and **Asana** (agencies).
4. **Trello** (small teams).

## UI
Integrations page: one card per tool with connect, project mapping (Kommently project → tracker project/board/list), "Create issue for every new pin" vs "Only when I click Send", and status sync on/off. In the pin thread, "Send to Linear" when auto-create is off.

## Plan rules
Same as today (`hasIntegrations`: Starter and up).

## Tests
Each tracker module unit-tested with mocked HTTP; smoke checks that tokens are masked and org-scoped.

## Acceptance criteria
A pin can create an issue in each tracker with title, description, screenshot link and technical context, and resolving it on either side updates the other when two-way sync is on.

## Sources
- [BugHerd reviews (Capterra) – integration requests](https://www.capterra.com/p/224784/BugHerd/reviews/)
- [Huddlekit – Linear, ClickUp, Notion, Asana, Slack](https://www.producthunt.com/posts/1264990)
