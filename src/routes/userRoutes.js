const router = require('express').Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { user: schemas } = require('../utils/validators');

router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', validate({ body: schemas.updateProfile }), userController.updateMe);
router.get('/me/dashboard', userController.getDashboard);

module.exports = router;
