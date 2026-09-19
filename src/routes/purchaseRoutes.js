const router = require('express').Router();
const purchaseController = require('../controllers/purchaseController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { purchase: schemas } = require('../utils/validators');

router.use(authenticate);

router.post('/', validate({ body: schemas.create }), purchaseController.purchaseBook);
router.post('/checkout', validate({ body: schemas.checkout }), purchaseController.checkoutCart);
router.get('/me', purchaseController.getMyPurchases);
router.get('/', authorize('ADMIN'), purchaseController.getAllPurchases);

module.exports = router;
