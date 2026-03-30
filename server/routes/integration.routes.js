const router = require('express').Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const {
  getIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegration,
} = require('../controllers/integration.controller');

router.use(auth);
router.use(authorize('owner', 'admin'));

router.get('/', getIntegrations);
router.post('/', createIntegration);
router.patch('/:id', updateIntegration);
router.delete('/:id', deleteIntegration);
router.post('/:id/test', testIntegration);

module.exports = router;
