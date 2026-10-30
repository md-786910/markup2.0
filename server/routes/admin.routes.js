const router = require('express').Router();
const mongoose = require('mongoose');
const adminAuth = require('../middleware/adminAuth');
const { requireAdminRole } = require('../middleware/adminAuth');
const ctrl = require('../controllers/admin.controller');
const team = require('../controllers/adminUsers.controller');
const support = require('../controllers/adminSupport.controller');
const notice = require('../controllers/siteNotice.controller');

// Admin panel users (AdminUser) only, with two-step sign-in on
router.use(adminAuth());

// Malformed ids in the URL are simply not found (instead of a cast error)
const notFoundUnlessId = (req, res, next, id) => (mongoose.isValidObjectId(id) ? next() : res.status(404).json({ message: 'Not found' }));
for (const name of ['id', 'noteId', 'adminId']) router.param(name, notFoundUnlessId);

// Dashboard
router.get('/stats', ctrl.getDashboardStats);

// Organizations
router.get('/organizations', ctrl.getOrganizations);
router.get('/organizations/:id', ctrl.getOrganizationDetail);
router.patch('/organizations/:id/lock', requireAdminRole('superadmin'), ctrl.lockOrganization);
router.patch('/organizations/:id/unlock', requireAdminRole('superadmin'), ctrl.unlockOrganization);
router.patch('/organizations/:id/plan', requireAdminRole('superadmin'), ctrl.setOrganizationPlan);
router.post('/organizations/:id/extend-trial', ctrl.extendTrial); // Support role can extend up to 14d (enforced in controller)
router.post('/organizations/:id/notes', ctrl.addOrganizationNote);
router.patch('/organizations/:id/notes/:noteId', ctrl.updateOrganizationNote);
router.delete('/organizations/:id/notes/:noteId', ctrl.deleteOrganizationNote);
router.get('/audit', requireAdminRole('superadmin'), ctrl.getAuditLog);
router.patch('/organizations/:id/limits', requireAdminRole('superadmin'), ctrl.setOrganizationLimits);
router.patch('/organizations/:id/deal', requireAdminRole('superadmin'), ctrl.setOrganizationDeal);
router.post('/invoices/:id/refund', requireAdminRole('superadmin'), ctrl.refundInvoice);

// Users
router.get('/users', ctrl.getUsers);
router.get('/users/:id', ctrl.getUserDetail);

// Projects
router.get('/projects', ctrl.getProjects);

// Plans (Superadmin only)
router.get('/plans', ctrl.getPlans);
router.get('/plans/:planId/impact', requireAdminRole('superadmin'), ctrl.getPlanUsageImpact);
router.patch('/plans/:planId', requireAdminRole('superadmin'), ctrl.updatePlan);
router.patch('/plans/:planId/toggle', requireAdminRole('superadmin'), ctrl.togglePlan);

// Revenue & Invoices (Superadmin only)
router.get('/revenue', requireAdminRole('superadmin'), ctrl.getRevenue);
router.get('/invoices', requireAdminRole('superadmin'), ctrl.getInvoices);

// Support inbox (Open to support and superadmin)
// Malformed ticket ids in the URL are simply not found
router.param('ticketId', (req, res, next, id) => (mongoose.isValidObjectId(id) ? next() : res.status(404).json({ message: 'Request not found.' })));
router.get('/support/stats', support.getStats);
router.get('/support/tickets', support.listTickets);
router.get('/support/tickets/:ticketId', support.getTicket);
router.post('/support/tickets/:ticketId/messages', support.replyToTicket);
router.patch('/support/tickets/:ticketId', support.updateTicket);

// Admin team (Superadmin only)
router.get('/admins', requireAdminRole('superadmin'), team.listAdmins);
router.post('/admins', requireAdminRole('superadmin'), team.inviteAdmin);
router.post('/admins/:adminId/resend', requireAdminRole('superadmin'), team.resendInvite);
router.patch('/admins/:adminId', requireAdminRole('superadmin'), team.setAdminStatus);
router.delete('/admins/:adminId', requireAdminRole('superadmin'), team.removeAdmin);
router.post('/admins/:adminId/reset-2fa', requireAdminRole('superadmin'), team.resetAdminTwoFactor);

// Payment provider settings (Superadmin only)
router.get('/payment-settings', requireAdminRole('superadmin'), ctrl.getPaymentSettings);
router.patch('/payment-settings', requireAdminRole('superadmin'), ctrl.updatePaymentSettings);

// Site maintenance notice (Superadmin only)
router.get('/site-notice', requireAdminRole('superadmin'), notice.getAdminNotice);
router.patch('/site-notice', requireAdminRole('superadmin'), notice.updateAdminNotice);

// Global trial settings (Superadmin only for updates)
router.get('/trial-settings', ctrl.getTrialSettings);
router.patch('/trial-settings', requireAdminRole('superadmin'), ctrl.updateTrialSettings);

module.exports = router;
