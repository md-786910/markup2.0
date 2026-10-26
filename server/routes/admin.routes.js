const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const ctrl = require('../controllers/admin.controller');
const team = require('../controllers/adminUsers.controller');

// Admin panel users (AdminUser) only, with two-step sign-in on
router.use(adminAuth());

// Dashboard
router.get('/stats', ctrl.getDashboardStats);

// Organizations
router.get('/organizations', ctrl.getOrganizations);
router.get('/organizations/:id', ctrl.getOrganizationDetail);
router.patch('/organizations/:id/lock', ctrl.lockOrganization);
router.patch('/organizations/:id/unlock', ctrl.unlockOrganization);
router.patch('/organizations/:id/plan', ctrl.setOrganizationPlan);
router.post('/organizations/:id/extend-trial', ctrl.extendTrial);
router.post('/organizations/:id/notes', ctrl.addOrganizationNote);
router.patch('/organizations/:id/notes/:noteId', ctrl.updateOrganizationNote);
router.delete('/organizations/:id/notes/:noteId', ctrl.deleteOrganizationNote);
router.get('/audit', ctrl.getAuditLog);
router.patch('/organizations/:id/limits', ctrl.setOrganizationLimits);
router.post('/invoices/:id/refund', ctrl.refundInvoice);

// Users
router.get('/users', ctrl.getUsers);
router.get('/users/:id', ctrl.getUserDetail);

// Projects
router.get('/projects', ctrl.getProjects);

// Plans
router.get('/plans', ctrl.getPlans);
router.patch('/plans/:planId', ctrl.updatePlan);
router.patch('/plans/:planId/toggle', ctrl.togglePlan);

// Admin team
router.get('/admins', team.listAdmins);
router.post('/admins', team.inviteAdmin);
router.post('/admins/:adminId/resend', team.resendInvite);
router.patch('/admins/:adminId', team.setAdminStatus);
router.delete('/admins/:adminId', team.removeAdmin);
router.post('/admins/:adminId/reset-2fa', team.resetAdminTwoFactor);

// Payment provider settings
router.get('/payment-settings', ctrl.getPaymentSettings);
router.patch('/payment-settings', ctrl.updatePaymentSettings);

module.exports = router;
