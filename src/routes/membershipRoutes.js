const router = require('express').Router();
const membershipController = require('../controllers/membershipController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { membershipPlan, membership: schemas } = require('../utils/validators');
const { idParam } = require('../utils/validators').book;

// Public: view available plans
router.get('/plans', membershipController.listPlans);

// Admin: manage plans
router.post(
  '/plans',
  authenticate,
  authorize('ADMIN'),
  validate({ body: membershipPlan.create }),
  membershipController.createPlan
);
router.patch(
  '/plans/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: idParam, body: membershipPlan.update }),
  membershipController.updatePlan
);
router.delete(
  '/plans/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: idParam }),
  membershipController.deletePlan
);

// User: subscribe / manage own membership
router.post('/subscribe', authenticate, validate({ body: schemas.subscribe }), membershipController.subscribe);
router.get('/me', authenticate, membershipController.getMyStatus);
router.get('/me/history', authenticate, membershipController.getMyHistory);
router.post('/me/:id/cancel', authenticate, validate({ params: idParam }), membershipController.cancelMyMembership);

// Admin: view all memberships
router.get('/', authenticate, authorize('ADMIN'), membershipController.listAllMemberships);

module.exports = router;
