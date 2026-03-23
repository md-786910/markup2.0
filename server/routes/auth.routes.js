const router = require('express').Router();
const { signup, login, getMe, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', auth, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;
