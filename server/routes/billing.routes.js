const router = require('express').Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const {
  getPlan,
  getBillingConfig,
  upgradePlan,
  createCheckoutSession,
  verifyPayment,
  getInvoices,
  downloadInvoicePdf,
  cancelSubscription,
  resumeSubscription,
  getBillingDetails,
  updateBillingDetails,
} = require('../controllers/billing.controller');

router.use(auth);
// Subscription, invoices and buyer tax details are for the people who run
// billing (owner/admin), never members or guests (e.g. an agency's client)
const billingReaders = authorize('owner', 'admin');
router.get('/plan', billingReaders, getPlan);
router.get('/config', getBillingConfig);
router.post('/upgrade', upgradePlan);
router.post('/checkout-session', createCheckoutSession);
router.post('/verify-payment', verifyPayment);
router.get('/invoices', billingReaders, getInvoices);
router.get('/invoices/:id/pdf', billingReaders, downloadInvoicePdf);
router.post('/cancel', cancelSubscription);
router.post('/resume', resumeSubscription);
router.get('/details', billingReaders, getBillingDetails);
router.put('/details', updateBillingDetails);

module.exports = router;
