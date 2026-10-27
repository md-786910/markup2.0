# Phase 6: Pricing and revenue

**Status: Planned · Size: M (about 1 week)**

## Goal
Manage plans and prices confidently from the admin panel and see revenue health at a glance.

## What already exists
- `PlanConfig` overrides (name, USD and INR price, labels, features, limits, popular badge, enabled), per-org `limitOverrides`, the old-style Plans & pricing and Payment settings pages (new header only), invoices with refunds, monthly revenue at list price on the Overview.
- Known gap: `getPlansWithOverrides` doesn't merge `maxWorkspaces` and `maxStorageMB` overrides consistently; plan `features` text and limits can disagree.

## Scope
**In:** plan editor redesign, limits and features generated from one source, support level per plan (Phase 2), a revenue page, custom deals per organization.
**Out:** coupons and promo codes, annual billing, usage-based pricing (separate decision).

## Plan editor (admin)
- One page per plan (`/pricing/:planId`) with sections: Display (name, price USD, price INR, period label, popular), Limits (all keys incl. workspaces, storage), Features on/off (integrations, activity log, versions, approvals, AI, support level), and a live preview of the pricing card as the website and in-app billing show it.
- **Generated feature list:** the bullet list on pricing cards is built from limits and flags (e.g. "15 projects", "3 workspaces", "In-app support") plus optional extra lines, so text and limits can't drift.
- Change log: every save is an admin action (`logAdminAction`, `plan.updated` with before/after), visible on the page.
- Guardrails: confirm dialog listing how many organizations are on the plan; lowering a limit below current usage shows a warning with the affected count.

## Revenue page (admin)
- Cards: MRR (list price) by plan, paying organizations, new MRR this month, churned MRR this month, trial-to-paid conversion (last 90 days).
- Upcoming renewals (next 14 days), unpaid and failed invoices with due dates, recent payments and refunds, cancellations scheduled at period end.
- Currency: show INR and USD separately (no FX conversion in totals).
- Export invoices CSV for a date range (accounting).

## Custom deals per organization
On the organization page Billing tab: a "Custom price" field and note (stored on `Organization.deal { price, currency, note, until }`), used for MRR and shown on the invoice when the next renewal is created.

## Server
- Fix `getPlansWithOverrides` to merge every limit key generically.
- `GET /admin/revenue?from=&to=` aggregating invoices and subscriptions.
- `GET /admin/invoices?status=&from=&to=&format=csv`.

## Tests
- Saving a plan updates `/api/plans` within the cache window and logs the change.
- Feature list text is derived from limits.
- Revenue aggregation for fixed invoice fixtures.

## Acceptance criteria
- Changing a price or limit takes one screen, shows the effect before saving, and is recorded.
- The revenue page answers: what do we earn per month, what renews soon, who hasn't paid.
