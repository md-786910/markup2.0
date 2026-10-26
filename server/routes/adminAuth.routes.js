const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const ctrl = require('../controllers/adminAuth.controller');
const { loginEmailLimiter, passwordResetEmailLimiter, twoFactorLimiter } = require('../middleware/rateLimiters');

// Admin panel sign-in and the signed-in admin's own account.
// Account routes skip the 2FA rule so an admin can still set it up.
const signedIn = adminAuth({ requireTwoFactor: false });

router.post('/login', loginEmailLimiter, ctrl.login);
router.post('/login/2fa', twoFactorLimiter, ctrl.loginTwoFactor);
router.post('/forgot-password', passwordResetEmailLimiter, ctrl.forgotPassword);
router.post('/reset-password/:token', ctrl.resetPassword);

router.get('/me', signedIn, ctrl.getMe);
router.post('/logout', signedIn, ctrl.logout);
router.patch('/profile', signedIn, ctrl.updateProfile);
router.patch('/password', signedIn, ctrl.changePassword);

router.get('/2fa', signedIn, ctrl.getTwoFactor);
router.post('/2fa/setup', signedIn, ctrl.startTwoFactorSetup);
router.post('/2fa/enable', signedIn, ctrl.enableTwoFactor);
router.post('/2fa/disable', signedIn, ctrl.disableTwoFactor);
router.post('/2fa/recovery-codes', signedIn, ctrl.regenerateRecoveryCodes);

module.exports = router;
