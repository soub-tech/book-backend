const router = require('express').Router();
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { auth: schemas } = require('../utils/validators');

router.post('/register', authLimiter, validate({ body: schemas.register }), authController.register);
router.post('/login', authLimiter, validate({ body: schemas.login }), authController.login);
router.post('/refresh', validate({ body: schemas.refresh }), authController.refresh);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: schemas.forgotPassword }),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  authLimiter,
  validate({ body: schemas.resetPassword }),
  authController.resetPassword
);

module.exports = router;
