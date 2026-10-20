const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  getPlan,
  getBillingConfig,
  upgradePlan,
  createCheckoutSession,
  createPortalSession,
  verifyPayment,
  getInvoices,
  downloadInvoicePdf,
  cancelSubscription,
  resumeSubscription,
  getBillingDetails,
  updateBillingDetails,
} = require('../controllers/billing.controller');

router.use(auth);
router.get('/plan', getPlan);
router.get('/config', getBillingConfig);
router.post('/upgrade', upgradePlan);
router.post('/checkout-session', createCheckoutSession);
router.post('/portal-session', createPortalSession);
router.post('/verify-payment', verifyPayment);
router.get('/invoices', getInvoices);
router.get('/invoices/:id/pdf', downloadInvoicePdf);
router.post('/cancel', cancelSubscription);
router.post('/resume', resumeSubscription);
router.get('/details', getBillingDetails);
router.put('/details', updateBillingDetails);

module.exports = router;
