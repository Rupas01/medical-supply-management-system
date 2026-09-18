const express = require('express');
const router = express.Router();
const supplier = require('../controllers/supplierController');
const { requireRole } = require('../middleware/authMiddleware');

router.get('/get_suppliers', supplier.getSuppliers);
router.get('/get_medicines', supplier.getMedicinesBySupplier);

// Supplier-protected endpoints
router.post('/add_medicine', requireRole('SUPPLIER'), supplier.addMedicine);
router.get('/get_requests', requireRole('SUPPLIER'), supplier.getRequests);
router.post('/update_request', requireRole('SUPPLIER'), supplier.updateRequest);

module.exports = router;