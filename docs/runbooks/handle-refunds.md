# Runbook: Handling Refunds & Dispute Resolution

## 1. Overview
Protocol for reviewing customer refund requests, issuing full or partial refunds through payment gateways, revoking active subscription entitlements, and auditing transaction logs.

---

## 2. Refund Policy Guidelines
- **Annual / Monthly Subscriptions:** Refunds requested within 14 days of billing anniversary may be approved in full by superadmins.
- **Enterprise Contracts:** Subject to specific contract terms outlined in `Organization.deal.note`.
- **Role Authority:** Support staff **cannot** issue refunds; only `superadmin` users have access to refund controls.

---

## 3. Step-by-Step Refund Execution

1. **Locate Invoice in Admin Portal:**
   - Go to **Business** → **Revenue** (`/revenue`) or **Organizations** → Select Organization → **Billing** tab.
   - Locate the specific paid invoice under **Recent Transactions** or **Invoices**.

2. **Issue Refund:**
   - Click the invoice action and select **Refund Invoice**.
   - Review invoice details (Amount, Currency, Payment Provider).
   - Click **Confirm Refund**.

3. **Backend Actions Performed Automatically:**
   - The server calls the payment provider API (`razorpayProvider.refundPayment` or `paypalProvider.refundPayment`).
   - The invoice status transitions from `paid` to `refunded`.
   - If the refunded invoice covers the current active period, the organization subscription is automatically downgraded to Free (`applyRefund` in `admin.controller.js`).
   - An audit log entry `org.invoice_refunded` is logged with admin identity.
   - A Slack and email notification is dispatched via `alertRefundIssued`.

4. **Verify Gateway Confirmation:**
   - Check the invoice card status displays `Refunded`.
   - Verify refund transaction in Stripe/Razorpay/PayPal merchant dashboard.

