# Runbook: Refund an invoice

Only **superadmins** can refund; support agents don't see the Refund button and
the API refuses them. Payments go through Razorpay (INR) or PayPal (USD).

## Before refunding

- Decide according to the refund terms in your published Terms of Service, or
  the contract for an enterprise deal (`Organization.deal.note`). The app has
  no refund window of its own.
- A refund is always the **full** invoice amount.
- Refunding the invoice for the **current** paid period also ends the paid
  plan: the organization moves to Free at once (its data stays; limits drop).

## Steps

1. Admin panel → **Organizations** → the organization → **Billing** tab.
2. Find the paid invoice and click **Refund**, then confirm.
3. The server asks the payment provider to refund (`refundPayment` in
   `server/payments/`), then records it (`server/payments/refundInvoice.js`):
   the invoice becomes `refunded`, and for the current period the plan moves
   to Free.
4. It is logged in the action log (`org.invoice_refunded`, with your name) and
   the team gets a "Refund issued" alert (email to `ADMIN_ALERTS_EMAIL`, and
   Slack if configured).

## Check

- The invoice shows **Refunded** on the Billing tab; the toast says whether
  the organization moved to Free.
- The refund is visible in the Razorpay or PayPal dashboard.

## If it fails

"The payment provider rejected the refund" means nothing changed in Kommently.
Check the reason in the provider's dashboard (already refunded there, too old,
insufficient balance), fix it there, then click Refund again; a refund already
recorded is not applied twice.
