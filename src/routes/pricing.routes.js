const express = require('express');
const { getAllPricing, updatePricing } = require('../controllers/pricing.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const router = express.Router();

router.get('/', verifyToken, getAllPricing);
router.patch('/:id', verifyToken, requireRole(['system_admin']), updatePricing);

module.exports = router;
