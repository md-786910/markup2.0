# Phase 9: AI pack and MCP server

**Status: Planned · Size: M (about 2 weeks)**

## Goal
Use AI where it saves teams time on feedback, and let coding assistants (Claude Code, Cursor) read and resolve pins through an MCP server.

## Why
- BugHerd launched AI auto-titles, auto-tagging, similar-task detection and an MCP server in 2026; Userback has AI categorization, sentiment, video summaries and an MCP server; Huddlekit's MCP lets Claude and Cursor read comments, fix code and resolve them.
- AI triage is becoming table stakes, and an MCP server is cheap for us and strong for developer marketing.

## Part A: AI features
Use the Claude API (latest Haiku-class model for per-pin tasks, a Sonnet-class model for round summaries). Server-side only, `ANTHROPIC_API_KEY`; everything optional and off when the key is missing.

| Feature | When | Output |
|---|---|---|
| Auto title | Pin created (async job) | 3–8 word title stored on `Pin.title`, editable |
| Category and tags | Pin created | `bug` / `content` / `design` / `question` + up to 3 tags |
| Similar pins | Pin created | Up to 3 likely duplicates in the same project (embeddings or a short model comparison of titles), shown as "Looks similar to #12" |
| Round summary | On demand and when a version is created | Plain summary for the client: what was fixed, what's open, what needs their decision |
| Reply suggestions | On demand in the composer | A short draft reply (never sent automatically) |
| Translate | On demand | Comment translated into the reader's language |

Implementation notes:
- Queue jobs with BullMQ when Redis is available, else in-process; never block pin creation.
- Send only the comment text, page title and element text; never emails or names. Note it in the privacy policy and DPA (Anthropic as sub-processor).
- Per-org monthly AI budget (`limits.aiCreditsPerMonth`) and a kill switch in the admin panel.
- Store model outputs with `ai: { model, at }` so we can show "Suggested by AI".

## Part B: MCP server
A remote MCP server so assistants act on a project's feedback.
- Endpoint: `https://api.<domain>/mcp` (Streamable HTTP), OAuth or a personal access token created in Settings → API tokens (new `ApiToken` model: hashed token, scopes, last used, expiry).
- Tools:
  - `list_projects`
  - `list_open_pins { projectId, status?, assignee? }` → number, title, page URL, selector, device, technical context (Phase 3)
  - `get_pin { projectId, pinNumber }` → thread, screenshot URL, context
  - `add_comment { projectId, pinNumber, body }`
  - `resolve_pin { projectId, pinNumber, note? }`
- Access = the token owner's access level; every action is logged as activity "via Claude Code".
- Docs page on the website ("Use Kommently with Claude Code / Cursor") with copy-paste config.

## Plan rules
AI features on Pro and trial (Starter gets auto titles only); MCP and API tokens on Starter and up.

## Tests
- Without `ANTHROPIC_API_KEY`, pin creation is unchanged and AI fields stay empty.
- MCP token scoped to one org cannot read another's pins; revoked tokens fail.

## Acceptance criteria
- New pins get a useful title and category within seconds.
- A client can read a one-paragraph summary of each round.
- A developer can type "fix the open Kommently pins on the pricing page" in Claude Code and the assistant can list, read and resolve them.

## Sources
- [BugHerd launches AI features (Aug 2026)](https://www.cantechletter.com/newswires/bugherd-launches-ai-features-for-faster-website-bug-fixes/)
- [AI features in Userback](https://support.userback.io/en/articles/13265550-ai-features-in-userback)
- [Huddlekit MCP on Product Hunt](https://www.producthunt.com/posts/1264990)
