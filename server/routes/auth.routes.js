const router = require('express').Router();
const { signup, login, getMe, forgotPassword, resetPassword, updateProfile, changePassword, uploadAvatar, deleteAccount, updateOrganization, validateEmail, sendOtp, verifyOtp, getOrgActivity, exportOrganization, requestOrganizationDeletion, cancelOrganizationDeletion } = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const { checkActivityLogsLimit } = require('../middleware/orgLimits');
const { loginEmailLimiter, passwordResetEmailLimiter, otpEmailLimiter } = require('../middleware/rateLimiters');
const upload = require('../middleware/upload');

router.post('/validate-email', validateEmail);
router.post('/send-otp', otpEmailLimiter, sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/signup', signup);
router.post('/login', loginEmailLimiter, login);
router.get('/me', auth, getMe);
router.patch('/profile', auth, updateProfile);
router.patch('/change-password', auth, changePassword);
router.post('/avatar', auth, upload.single('avatar'), uploadAvatar);
router.delete('/account', auth, deleteAccount);
router.patch('/organization', auth, upload.single('logo'), updateOrganization);
router.get('/organization/activity', auth, checkActivityLogsLimit, getOrgActivity);
router.get('/organization/export', auth, exportOrganization);
router.post('/organization/delete', auth, requestOrganizationDeletion);
router.post('/organization/cancel-deletion', auth, cancelOrganizationDeletion);
router.post('/forgot-password', passwordResetEmailLimiter, forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;
