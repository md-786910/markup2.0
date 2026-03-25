const router = require('express').Router();
const { signup, login, getMe, forgotPassword, resetPassword, updateProfile, changePassword, uploadAvatar, deleteAccount } = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', auth, getMe);
router.patch('/profile', auth, updateProfile);
router.patch('/change-password', auth, changePassword);
router.post('/avatar', auth, upload.single('avatar'), uploadAvatar);
router.delete('/account', auth, deleteAccount);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;
