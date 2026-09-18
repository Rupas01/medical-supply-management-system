const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');

router.post('/login', auth.login);
router.post('/supplier_register', auth.registerSupplier);
router.post('/customer_register', auth.registerCustomer);

module.exports = router;