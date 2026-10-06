const router = require('express').Router();
const contactController = require('../controllers/contactController');
const validate = require('../middleware/validate');
const { contact: schemas } = require('../utils/validators');

router.post('/', validate({ body: schemas.send }), contactController.sendContactMessage);

module.exports = router;
