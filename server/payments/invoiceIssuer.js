const { nextSequence } = require('../models/Counter');

// Tax invoice details: sequential numbering, seller/buyer snapshots and the GST
// split, assigned once when an invoice is paid (settleInvoice) and rendered by
// renderInvoicePdf. Seller details come from env (see .env.example).
//
// GST (INR invoices, only when SELLER_GSTIN is set): plan prices are GST-
// inclusive. Same state as the seller, or no buyer state given (place of supply
// defaults to the supplier for unregistered buyers) → CGST + SGST; another
// Indian state → IGST. Non-INR invoices carry no Indian GST.

const GST_RATE = parseFloat(process.env.GST_RATE || '18');

function getSeller() {
  return {
    legalName: process.env.SELLER_LEGAL_NAME || '',
    address: process.env.SELLER_ADDRESS || '',
    state: process.env.SELLER_STATE || '',
    country: process.env.SELLER_COUNTRY || '',
    gstin: process.env.SELLER_GSTIN || '',
    email: process.env.SELLER_EMAIL || '',
    // Optional note for zero-rated exports, e.g. "Supply meant for export under LUT without payment of IGST"
    exportNote: process.env.SELLER_EXPORT_NOTE || '',
  };
}

function buildBuyer(org, ownerEmail) {
  const d = (org.billingDetails && (org.billingDetails.toObject ? org.billingDetails.toObject() : org.billingDetails)) || {};
  return {
    name: d.legalName || org.name || '',
    address: d.address || '',
    state: d.state || '',
    country: d.country || '',
    taxId: d.taxId || '',
    email: ownerEmail || '',
  };
}

const sameState = (a, b) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

// Amounts in the smallest unit (paise / cents). Returns null when no GST applies.
function computeTax(amount, currency, seller, buyer) {
  if (currency !== 'INR' || !seller.gstin) return null;
  const taxable = Math.round((amount * 100) / (100 + GST_RATE));
  const totalTax = amount - taxable;
  const intraState = !buyer.state || sameState(buyer.state, seller.state);
  if (intraState) {
    const cgst = Math.floor(totalTax / 2);
    return { rate: GST_RATE, inclusive: true, taxable, cgst, sgst: totalTax - cgst, igst: 0, total: totalTax };
  }
  return { rate: GST_RATE, inclusive: true, taxable, cgst: 0, sgst: 0, igst: totalTax, total: totalTax };
}

// Indian financial year (April–March) as "2627" for FY 2026-27
function financialYear(date) {
  const y = date.getUTCFullYear();
  const start = date.getUTCMonth() >= 3 ? y : y - 1;
  return `${String(start).slice(-2)}${String(start + 1).slice(-2)}`;
}

/**
 * Assign number, snapshots and tax to a just-paid invoice (mutates; caller saves).
 * Numbers are gap-free per financial year: e.g. INV-2627-000001 (≤16 chars, as GST requires).
 */
async function assignInvoiceDetails(invoice, org, ownerEmail) {
  if (invoice.invoiceNumber) return;
  const paidAt = invoice.paidAt || new Date();
  const fy = financialYear(paidAt);
  const prefix = (process.env.INVOICE_PREFIX || 'INV').slice(0, 4);
  const seq = await nextSequence(`invoice-${fy}`);
  const seller = getSeller();
  const buyer = buildBuyer(org, ownerEmail);
  invoice.paidAt = paidAt;
  invoice.invoiceNumber = `${prefix}-${fy}-${String(seq).padStart(6, '0')}`;
  invoice.seller = seller;
  invoice.buyer = buyer;
  invoice.tax = computeTax(invoice.amount, invoice.currency, seller, buyer);
}

/** Stream an invoice PDF to `out` (an HTTP response or any writable stream). */
function renderInvoicePdf(invoice, org, out) {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(out);

  const isUsd = invoice.currency === 'USD';
  const fmtMoney = (units) => {
    const major = (units || 0) / 100;
    return isUsd
      ? '$' + major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : 'Rs. ' + major.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString(isUsd ? 'en-US' : 'en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const seller = invoice.seller || getSeller();
  const buyer = invoice.buyer || buildBuyer(org, '');
  const tax = invoice.tax || null;
  const number = invoice.invoiceNumber || invoice._id.toString().slice(-8).toUpperCase();
  const refunded = invoice.status === 'refunded';

  // Header: seller
  doc.fontSize(20).fillColor('#176b57').text(seller.legalName || 'Invoice');
  doc.fontSize(9).fillColor('#6b7280');
  if (seller.address) doc.text(seller.address);
  if (seller.gstin) doc.text('GSTIN: ' + seller.gstin);
  if (seller.email) doc.text(seller.email);
  doc.moveDown(1);

  doc.fontSize(16).fillColor('#111827').text((tax ? 'Tax Invoice ' : 'Invoice ') + number);
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor('#374151');
  doc.text('Invoice date: ' + fmtDate(invoice.paidAt || invoice.updatedAt || invoice.createdAt));
  if (invoice.periodStart && invoice.periodEnd) {
    doc.text('Service period: ' + fmtDate(invoice.periodStart) + ' to ' + fmtDate(invoice.periodEnd));
  }
  if (tax) doc.text('Place of supply: ' + (buyer.state || seller.state || '—'));
  doc.moveDown(0.8);

  // Buyer
  doc.fontSize(9).fillColor('#6b7280').text('BILLED TO');
  doc.fontSize(10).fillColor('#111827').text(buyer.name || org.name || 'Workspace');
  doc.fillColor('#374151');
  if (buyer.address) doc.text(buyer.address);
  const region = [buyer.state, buyer.country].filter(Boolean).join(', ');
  if (region) doc.text(region);
  if (buyer.taxId) doc.text((tax ? 'GSTIN: ' : 'Tax ID: ') + buyer.taxId);
  if (buyer.email) doc.text(buyer.email);
  doc.moveDown(1);

  // Line item
  const tableTop = doc.y;
  doc.fontSize(9).fillColor('#6b7280');
  doc.text('DESCRIPTION', 50, tableTop);
  if (tax) doc.text('SAC', 300, tableTop);
  doc.text('AMOUNT', 400, tableTop, { width: 145, align: 'right' });
  doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).strokeColor('#e5e7eb').stroke();

  let y = tableTop + 22;
  const planLabel = (invoice.plan || '').charAt(0).toUpperCase() + (invoice.plan || '').slice(1) + ' plan subscription (1 month)';
  doc.fontSize(11).fillColor('#111827').text(planLabel, 50, y, { width: 240 });
  if (tax) doc.text('998314', 300, y);
  doc.text(fmtMoney(tax ? tax.taxable : invoice.amount), 400, y, { width: 145, align: 'right' });
  y += 30;

  const row = (label, value, strong = false) => {
    doc.fontSize(strong ? 12 : 10).fillColor(strong ? '#111827' : '#374151');
    doc.text(label, 300, y, { width: 150, align: 'right' });
    doc.text(value, 450, y, { width: 95, align: 'right' });
    y += strong ? 20 : 16;
  };
  doc.moveTo(300, y - 6).lineTo(545, y - 6).strokeColor('#e5e7eb').stroke();
  if (tax) {
    row('Taxable value', fmtMoney(tax.taxable));
    if (tax.igst) row(`IGST @ ${tax.rate}%`, fmtMoney(tax.igst));
    else {
      row(`CGST @ ${tax.rate / 2}%`, fmtMoney(tax.cgst));
      row(`SGST @ ${tax.rate / 2}%`, fmtMoney(tax.sgst));
    }
  }
  row('Total', fmtMoney(invoice.amount), true);
  if (refunded) row('Refunded', '-' + fmtMoney(invoice.refundAmount || invoice.amount));

  doc.x = 50;
  doc.y = y + 10;
  doc.fontSize(11).fillColor(refunded ? '#b45309' : '#059669').text(refunded ? 'Status: REFUNDED' : 'Status: PAID');
  if (!tax && isUsd && seller.exportNote) {
    doc.moveDown(0.5).fontSize(9).fillColor('#6b7280').text(seller.exportNote);
  }

  doc.moveDown(1);
  doc.fontSize(8).fillColor('#9ca3af');
  if (invoice.provider === 'razorpay') {
    if (invoice.razorpayPaymentId) doc.text('Razorpay payment: ' + invoice.razorpayPaymentId);
  } else if (invoice.provider === 'paypal') {
    if (invoice.paypalCaptureId) doc.text('PayPal capture: ' + invoice.paypalCaptureId);
  }
  doc.moveDown(1.5);
  doc.text('This is a computer-generated invoice and does not require a signature.', { align: 'center' });

  doc.end();
  return doc;
}

module.exports = { assignInvoiceDetails, renderInvoicePdf, computeTax, financialYear, getSeller };
