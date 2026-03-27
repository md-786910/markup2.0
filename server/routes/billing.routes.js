const router = require('express').Router();
const auth = require('../middleware/auth');
const { getPlan, upgradePlan } = require('../controllers/billing.controller');

router.use(auth);
router.get('/plan', getPlan);
router.post('/upgrade', upgradePlan);

module.exports = router;
