const router = require('express').Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.post('/create-intent', authenticate, paymentController.createIntent);

module.exports = router;
