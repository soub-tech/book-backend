const router = require('express').Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { user: schemas } = require('../utils/validators');

router.use(authenticate, authorize('ADMIN'));

router.get('/stats', adminController.getPlatformStats);
router.get('/users', adminController.listUsers);
router.get('/users/:id', validate({ params: schemas.idParam }), adminController.getUser);
router.patch('/users/:id/active', validate({ params: schemas.idParam }), adminController.setUserActive);
router.patch('/users/:id/role', validate({ params: schemas.idParam }), adminController.setUserRole);

module.exports = router;
