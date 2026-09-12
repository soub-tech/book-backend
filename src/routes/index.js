const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/books', require('./bookRoutes'));
router.use('/purchases', require('./purchaseRoutes'));
router.use('/memberships', require('./membershipRoutes'));
router.use('/progress', require('./progressRoutes'));
router.use('/admin', require('./adminRoutes'));

router.get('/health', (req, res) => res.json({ success: true, message: 'API is healthy' }));

module.exports = router;
