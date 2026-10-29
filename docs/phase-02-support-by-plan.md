# Phase 2: Support by plan

**Status: Done** (October 2026)

## Shipped
- Plan rules in `config/plans.js` (`support: { tickets, chat, priority, replyHours }`, `getSupportForPlan`; trial = Pro), exposed to the app as `user.orgSupport`; pricing feature lines updated (server plans and the website fallback).
- `SupportTicket` model (number from Counter `support_ticket` + 1000, plain-text messages, internal notes, attachments in `uploads/documents`, `priorityRank` for sorting, `customerLastReadAt` for unread dots).
- Customer API `/api/support/tickets` (`controllers/supportTicket.controller.js`): list (owners/admins see the org's, others their own), create (plan check → 403 `FEATURE_NOT_AVAILABLE`, up to 3 images/PDFs counted against storage, 10 per hour per user), read (marks replies read), reply (reopens), resolve. Guest-role users can't use it; locked orgs can. Context URL is stored without query strings.
- Admin API `/api/admin/support/*` (`controllers/adminSupport.controller.js`): inbox (views open/waiting/resolved/all, priority, assignee, overdue, search by subject/#number/org), stats, request with customer context, reply or internal note (first reply sets `firstResponseAt`, auto-assigns), update status/priority/assignee (resolving emails the customer once and is logged).
- Emails: `supportTicketForTeam` (to `SUPPORT_EMAIL`, urgent/high tagged in the subject, Reply-To the customer), `supportReply` (reply or resolved, link `APP_URL/dashboard?support=<id>`); in-app notification type `support_reply` (account-level, no project).
- App: Help & support drawer (`components/support/SupportPanel.js`, opened via `utils/supportPanel.openSupport()`) from the top-bar help icon (all screen sizes), the user menu, notifications and email links; free plans see email + upgrade note; chat button on plans with chat when Crisp is configured.
- Admin: Support in the sidebar with an open-count badge, inbox and request pages, Support tab on the organization page, Overview card and late replies in "Needs attention".
- GDPR export includes support requests (no internal notes); the org purge deletes them with their files.
- Tests: 35 smoke checks ("Phase 2" section) plus a browser end-to-end run (customer request with attachment → admin note and reply → notification and email link → customer reply → resolve).

### Launch review fixes (October 2026)
- Attachments are checked on the server: images and PDFs only, 5 MB each (`uploadDocument.supportAttachments`).
- Email links survive sign-in: a signed-out visitor (or an expired session) is sent back to the page they opened after login (`client/src/utils/returnTo.js`), so `/dashboard?support=<id>` opens the request.
- A closed request can't be marked resolved (and so reopened) by the customer; the panel shows it as closed without a reply box.
- Opening a request no longer bumps `updatedAt`, and only the requester's own reading marks replies read.
- An expired trial keeps in-app requests at Starter level (no chat, normal priority) instead of Pro.
- Changing a request's priority moves its reply deadline (until the first reply); priority, assignee and status changes and "reply and resolve" are in the action log.
- Analytics `support_panel_opened`, `support_chat_opened`; the client's fallback plan list has the support lines.
- Tests: support emails in `test/emailLinks.js` (team email → admin `/support/<id>`, reply → `/dashboard?support=<id>`), plus smoke checks for the fixes above.
- Still open (not bugs): per-org support overrides, in-panel FAQ for "Quick answers", MRR/activity on the admin customer card, the support address in the app is fixed (`client/src/utils/supportPanel.js`).

## Original spec

**Size: M (about 1.5 weeks)**

## Goal
Every customer can reach us from inside the app, through the channel their plan includes, and every request lands in one admin inbox with the customer's context next to it.

## Decisions already made
- Our own tickets (stored in our database) plus Crisp live chat as an extra on higher plans.
- Support is tiered by plan:

| Plan | Channels | First reply target |
|---|---|---|
| Free | Help center, email form (no in-app tickets) | Best effort |
| Starter | In-app tickets | 2 business days |
| Pro and trial | In-app tickets + live chat (Crisp) | 1 business day, priority |
| Enterprise | Tickets + chat + onboarding call | Same business day, highest priority |

## Scope
**In:** ticket model and API, in-app "Help & support" panel, admin Support inbox, replies by email both ways (outbound only in this phase), plan rules, notifications, Support tab on the admin organization page.
**Out (later):** inbound email parsing (customer replies by email), knowledge base CMS, SLA reports, assignment rules.

## Plan rules
Add to every plan in `server/config/plans.js`:
```js
support: { tickets: true|false, chat: true|false, priority: 'normal'|'high'|'urgent', replyHours: 48|24|8|null }
```
- Free: `{ tickets: false, chat: false, priority: 'normal', replyHours: null }`
- Starter: `{ tickets: true, chat: false, priority: 'normal', replyHours: 48 }`
- Pro, trial: `{ tickets: true, chat: true, priority: 'high', replyHours: 24 }`
- Enterprise: `{ tickets: true, chat: true, priority: 'urgent', replyHours: 8 }`

Expose through `GET /api/plans` and `userResponse` (`orgSupport`), make it editable per plan in PlanConfig (Phase 6) and per org in `limitOverrides`. Add one line per plan to the pricing pages' feature lists ("Email support", "In-app support", "Priority support + chat").

## Data model
New `server/models/SupportTicket.js`:
```js
{
  number: Number,                 // per-platform sequence (Counter 'ticket'), shown as #1042
  organization: ObjectId,         // ref Organization, indexed
  requester: ObjectId,            // ref User
  subject: String,                // max 140
  category: 'question'|'bug'|'billing'|'feature'|'account',
  status: 'open'|'waiting_on_customer'|'resolved'|'closed',
  priority: 'normal'|'high'|'urgent',  // from the plan at creation; admins can change
  assignee: ObjectId|null,        // ref AdminUser
  dueAt: Date|null,               // createdAt + replyHours (business hours: phase 7)
  firstResponseAt: Date|null,
  lastCustomerReplyAt, lastAdminReplyAt: Date,
  context: {                      // captured automatically by the client
    url, project, appVersion, userAgent, viewport, plan
  },
  messages: [{
    authorType: 'customer'|'admin', author: ObjectId, body: String (sanitized, max 10k),
    attachments: [{ path, name, mimetype, size }], internal: Boolean (admin notes), createdAt
  }],
}
```
Indexes: `{ organization, createdAt: -1 }`, `{ status, priority, dueAt }`, `{ assignee, status }`. Attachments count against storage (`utils/storage.js`) and are deleted by the org purge.

## API
Customer side (`/api/support`, `auth`):
- `GET /tickets` – the requester's org tickets (owners/admins see all of the org's, members their own).
- `POST /tickets` `{ subject, category, body, context }` + up to 3 attachments → 403 `FEATURE_NOT_AVAILABLE` when the plan has no tickets.
- `GET /tickets/:id`, `POST /tickets/:id/messages` `{ body }` (reopens a resolved ticket), `POST /tickets/:id/close`.
- Scope every lookup by organization (`SupportTicket.findOne({ _id, organization })`).

Admin side (`/api/admin/support`, `adminAuth()`):
- `GET /tickets?status=&priority=&assignee=&search=&page=` – inbox, sorted by priority then `dueAt`.
- `GET /tickets/:id` – ticket plus customer context (org plan, MRR, health, last active, recent activity: reuse `getOrganizationDetail` pieces).
- `POST /tickets/:id/messages` `{ body, internal }`, `PATCH /tickets/:id` `{ status, priority, assignee }`.
- `GET /stats` – open count by priority, overdue count (Overview card).

## UI
**App (`client/`)**
- Top bar: replace the Help icon with a "Help" menu: Help center (website `/support`), Contact support (opens the panel), Chat (only if `orgSupport.chat` and Crisp is configured).
- New `components/support/SupportPanel.js` (right-side drawer): "Quick answers" (the support FAQ), "New request" form (category, subject, message, attach screenshot), "Your requests" list with status pills, and a thread view.
- Free plan: the form becomes "Email us" with the address and an upgrade note ("In-app support starts on Starter").
- Context is filled in automatically: current URL, project id, app version, browser, viewport.

**Admin (`admin/`)**
- Sidebar: Support (with an open-count badge) under Customers.
- `pages/SupportInboxPage.js`: tabs Open / Waiting / Resolved, filters (priority, assignee, overdue), rows with org, plan, subject, age, due-in.
- `pages/SupportTicketPage.js`: thread on the left (customer and admin messages, internal notes in amber), reply box with "Internal note" toggle, status/priority/assignee on the right, customer card (plan, MRR, last active, open pins, link to the org page).
- Organization page: new Support tab listing that org's tickets.
- Overview: "Open tickets" card and overdue tickets in "Needs attention".

## Notifications
- New ticket → email to `SUPPORT_EMAIL` (urgent ones marked in the subject) and an in-panel badge for admins.
- Admin reply (not internal) → email to the requester (`supportReply` template, link to the app opening the ticket) and an in-app notification (new type `support_reply`).
- Ticket resolved → email with "Reply to reopen".

## Security and privacy
- Customers never see internal notes (`internal: true` filtered server-side).
- Bodies sanitized like comments (`utils/sanitizeComment.js`), rendered with DOMPurify.
- Rate limit ticket creation (10/hour per user).
- GDPR: tickets included in `GET /auth/organization/export`, deleted with the org purge.

## Analytics
`support_ticket_created { category }`, `support_panel_opened`, `support_chat_opened`.

## Tests (smoke)
- Free plan cannot create a ticket (403); Starter can.
- Member of org A cannot read org B's ticket; members see only their own unless owner/admin.
- Internal notes never appear in the customer API.
- Admin reply sets `firstResponseAt` once and sends `supportReply`.

## Acceptance criteria
- A Starter user can open a request from any page with context attached and sees the reply in the app and by email.
- An admin sees all open tickets sorted by priority and due time, with the customer's plan and activity on the same screen.
- Free users see help and email only, with a clear upgrade note.

## Open questions
- Business hours for `dueAt` (time zone, weekends): assume 24h calendar time in this phase, business hours in Phase 7.
- Who receives ticket emails: `SUPPORT_EMAIL` only, or every admin? Default: `SUPPORT_EMAIL`, plus the assignee once assigned.
