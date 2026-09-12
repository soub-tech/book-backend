const router = require('express').Router();
const progressController = require('../controllers/progressController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { progress: schemas } = require('../utils/validators');

router.use(authenticate);

router.post('/', validate({ body: schemas.update }), progressController.updateProgress);
router.get('/continue-reading', progressController.getContinueReading);
router.get('/history', progressController.getHistory);
router.get('/:bookId', validate({ params: schemas.bookIdParam }), progressController.getProgressForBook);

module.exports = router;
