# Phase 4: Client approvals and feedback deadlines

**Status: Planned · Size: M (about 1.5 weeks)**

## Goal
A client can formally approve a review round (or request changes) from the review link, the team gets a dated record of who approved what, and the team can close a round to new feedback on a deadline.

## Why
- Agencies need proof of sign-off; Ybug records sign-off with a dated trail, Ziflow runs multi-stage approvals, BugHerd added Feedback Deadlines in 2025.
- We already have review rounds (`Version`: creating one tags un-versioned pins) and a project workflow status (`projectStatus` includes `in_review`, `approved`), but no client-facing decision.

## Concepts
- **Round** = the open set of pins since the last version, or a saved version. A decision applies to the current round.
- **Decision** = `approved` or `changes_requested`, made by a named reviewer (guest or member) with an optional note.
- **Feedback deadline** = a time after which new pins and comments are refused on the project (members with manage access can still reply).

## Data model
New `server/models/Approval.js`:
```js
{
  project: ObjectId, organization: ObjectId,
  version: ObjectId|null,            // null = current, unversioned round
  decision: 'approved'|'changes_requested',
  note: String,                       // max 2000
  reviewer: { user: ObjectId|null, guestName: String|null, guestEmail: String|null },
  openPinsAtDecision: Number,         // snapshot for the record
  ip: String, userAgent: String,      // audit trail
  createdAt: Date,
}
```
Add to `Project`:
```js
review: {
  approvalsEnabled: Boolean (default true on paid plans),
  requireAllResolved: Boolean (default false),   // approve only when no open pins
  deadlineAt: Date|null, deadlineMessage: String,
}
```
When a round is approved, set `projectStatus = 'approved'` (unless later pins arrive) and log `Activity` `review.approved` / `review.changes_requested`.

## API
- Guest: `POST /api/guest/:shareToken/decision` `{ decision, note, name, email }` (through `loadSharedProject`; respects `allowComments`; one decision per reviewer email per round, latest wins).
- Member: `POST /api/projects/:projectId/decision` (comment access).
- `GET /api/projects/:projectId/approvals` (history, manage access).
- `PATCH /api/projects/:projectId/review` `{ approvalsEnabled, requireAllResolved, deadlineAt, deadlineMessage }` (manage).
- Deadline enforcement: pin/comment create endpoints (member and guest) return 423 `FEEDBACK_CLOSED` with the deadline message after `deadlineAt`, except replies from manage-level members.

## UI
- **Guest review page:** a sticky "Your decision" bar: "Approve this round" / "Request changes", with the open-pin count; a confirmation dialog with optional note and the reviewer's name. After the deadline: a banner "Feedback closed on 12 Nov" and the composer disabled.
- **Workspace review page** (`GuestWorkspacePage`): each project card shows "Approved by Daniel, 3 Nov" or "Changes requested".
- **Member project view:** header pill (Awaiting decision / Approved / Changes requested), an "Approvals" tab in the sidebar with the dated history, and Share dialog settings: approvals on/off, require all resolved, deadline picker.
- **Dashboard card:** "Approved" badge.
- **Approval certificate:** "Download record" (PDF or printable page) with project, round, reviewer, time, note and open pins at the time.

## Notifications
- Decision → in-app notification and email to project managers (new template `reviewDecision`), Slack/Teams/Discord message.
- Deadline in 24 h → reminder email to guests who commented (if we have their email) and to members.

## Plan rules
`hasApprovals`: Starter and up (trial included). Free sees the feature locked in the Share dialog.

## Tests
- Guest can approve through a share link; password-protected links require the access token; expired links refuse.
- After `deadlineAt`, guest and comment-level pins are refused with 423; manage-level replies still work.
- `requireAllResolved` blocks approval while pins are open.
- Decision history is scoped to the project's organization.

## Acceptance criteria
- A client approves from the review link in two clicks, and the team sees who approved, when, with what note and how many pins were open.
- The team can set a deadline, and new feedback after it is politely refused.

## Sources
- [Ybug client approval](https://ybug.io/solutions/client-approval)
- [BugHerd 2025 product wrap-up – Feedback Deadlines](https://bugherd.com/blog/bugherd-2025-product-wrap-up)
- [Ziflow multi-stage review](https://approval.studio/blog/ziflow-review-comparison-with-approval-studio/)
