# Runbook: Handling Refunds & Dispute Resolution

## 1. Overview
Protocol for reviewing customer refund requests, issuing full refunds through the payment gateways (Razorpay, PayPal), revoking active subscription entitlements, and auditing transaction logs.

The admin panel only issues **full** refunds of a paid invoice. There is no partial refund action.

---

## 2. Refund Policy Guidelines
- **Annual / Monthly Subscriptions:** Refunds requested within 14 days of billing anniversary may be approved in full by superadmins.
- **Enterprise Contracts:** Subject to specific contract terms outlined in `Organization.deal.note`.
- **Role Authority:** Support staff **cannot** issue refunds; only `superadmin` admins have access to refund controls (`POST /api/admin/invoices/:id/refund`, `requireAdminRole('superadmin')`).

---

## 3. Step-by-Step Refund Execution

1. **Locate Invoice in Admin Portal:**
   - Go to **Organizations** → Select Organization → **Billing** tab.
   - Locate the specific paid invoice. Only invoices with status `paid` can be refunded.
   - **Business** → **Revenue** (`/revenue`) lists recent refunds under **Recent Transactions & Refunds**, but has no refund action.

2. **Issue Refund:**
   - Click **Refund** on the invoice row.
   - Review the amount in the confirmation (the full invoice amount goes back to the customer).
   - Click **Refund** to confirm.

3. **Backend Actions Performed Automatically:**
   - The server calls the payment provider API for the full amount (`razorpayProvider.refundPayment` or `paypalProvider.refundPayment`). If the provider rejects it, the admin sees a 502 error and nothing changes.
   - The invoice status transitions from `paid` to `refunded` (`applyRefund` in `server/payments/refundInvoice.js`).
   - If the refunded invoice covers the current active period and the organization is still on that plan, the organization is automatically moved to Free, its subscription is set to `canceled`, and its pending invoices are voided.
   - An audit log entry `org.invoice_refunded` is logged with admin identity.
   - An admin alert (`alertRefundIssued`) goes to the Slack webhook (`ADMIN_ALERTS_SLACK_WEBHOOK`) and email (`ADMIN_ALERTS_EMAIL`, else `SUPPORT_EMAIL`) when those are configured.

4. **Verify Gateway Confirmation:**
   - Check the invoice card status displays `Refunded`.
   - Verify refund transaction in the Razorpay or PayPal merchant dashboard.

---

## 4. Refunds Made in the Provider Dashboard

A refund made directly in the Razorpay or PayPal dashboard reaches the app through the provider webhook and is recorded by the same `applyRefund`:
- Full refund: same effect as the admin action (status `refunded`, move to Free if it covers the current period), but no `org.invoice_refunded` audit entry or admin alert.
- Partial refund: only the refunded amount is recorded on the invoice (`refundAmount`); the invoice stays `paid` and the plan is unchanged.
