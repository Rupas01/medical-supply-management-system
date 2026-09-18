const express = require('express');
const router = express.Router();
const customer = require('../controllers/customerController');
const { requireRole } = require('../middleware/authMiddleware');

router.get('/get_status', requireRole('CUSTOMER'), customer.getStatus);
router.post('/submit_purchase', requireRole('CUSTOMER'), customer.submitPurchase);

module.exports = router;