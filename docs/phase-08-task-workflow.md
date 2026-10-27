# Phase 8: Task workflow

**Status: Planned · Size: M (about 1.5–2 weeks)**

## Goal
Teams can run the fixes inside Kommently: assign each pin, set priority and due date, move it through statuses, and see the work on a board.

## Why
BugHerd's core is a Kanban board where every comment becomes a task; agencies expect to assign and track work where the feedback is. Today a pin is only `pending` or `resolved`.

## Data model
Extend `Pin`:
```js
status: 'open'|'in_progress'|'in_review'|'resolved'   // migrate pending → open
assignee: ObjectId|null      // ref User, must have comment+ access to the project
priority: 'low'|'normal'|'high'|'urgent' (default normal)
dueAt: Date|null
labels: [String]             // per project, max 10 per pin
position: Number             // order within a board column
```
Migration: `pending` → `open`; keep accepting `pending` in the API for one release. Colors: open stays brand blue, in progress amber, in review a brand-blue outline, resolved stays green everywhere.

## API
- `PATCH /api/projects/:projectId/pins/:pinId` `{ status, assignee, priority, dueAt, labels, position }` (comment access; assignee must have access).
- `GET /api/projects/:projectId/pins?status=&assignee=&priority=&label=` filters.
- `GET /api/my-tasks` – pins assigned to me across projects (respects access).
- Socket events `pin:updated` already exist; include the new fields.

## UI
- **Pin thread header:** status dropdown, assignee picker (project + workspace members), priority, due date, labels.
- **Sidebar list:** filters by assignee, status, priority; "Assigned to me" toggle.
- **Board view:** a "List / Board" switch in the project sidebar opens a full-width board with columns per status; drag to change status and order; cards show pin number, thumbnail, assignee avatar, priority, due date.
- **Dashboard:** "My tasks" section (due soon, overdue).
- **Guests** see status (Open / Resolved only) but not assignees or internal priority.

## Notifications
- Assigned to you → in-app + email (respect mutes).
- Due tomorrow / overdue → daily digest to the assignee.
- Status changed to In review → notify the pin's author.

## Integrations
Jira/Linear/ClickUp sync status and assignee where the mapping is clear (Phase 10).

## Plan rules
Status and assignee on all plans; board view, priority, due dates and labels on Starter and up.

## Tests
- Assignee must have project access; cross-org assignment refused.
- Status migration keeps old clients working.
- Board reorder is scoped to the project.

## Acceptance criteria
- A project manager assigns pins, sees them on a board, and each person sees their tasks on the dashboard.

## Sources
- [BugHerd on Capterra – Kanban task board](https://www.capterra.com/p/224784/BugHerd/)
