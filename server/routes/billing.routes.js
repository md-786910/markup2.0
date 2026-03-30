const router = require('express').Router();
const auth = require('../middleware/auth');
const { getPlan, upgradePlan, createCheckoutSession, createPortalSession } = require('../controllers/billing.controller');

router.use(auth);
router.get('/plan', getPlan);
router.post('/upgrade', upgradePlan);
router.post('/checkout-session', createCheckoutSession);
router.post('/portal-session', createPortalSession);

module.exports = router;
