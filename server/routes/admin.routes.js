const router = require('express').Router();
const superadmin = require('../middleware/superadmin');
const ctrl = require('../controllers/admin.controller');

router.use(superadmin);

// Dashboard
router.get('/stats', ctrl.getDashboardStats);

// Organizations
router.get('/organizations', ctrl.getOrganizations);
router.get('/organizations/:id', ctrl.getOrganizationDetail);
router.patch('/organizations/:id/lock', ctrl.lockOrganization);
router.patch('/organizations/:id/unlock', ctrl.unlockOrganization);

// Users
router.get('/users', ctrl.getUsers);
router.get('/users/:id', ctrl.getUserDetail);

// Projects
router.get('/projects', ctrl.getProjects);

// Plans
router.get('/plans', ctrl.getPlans);
router.patch('/plans/:planId', ctrl.updatePlan);
router.patch('/plans/:planId/toggle', ctrl.togglePlan);

module.exports = router;
