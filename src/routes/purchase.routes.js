const express = require('express');
const { purchaseBook, getMyPurchases } = require('../controllers/purchase.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const router = express.Router();

router.post('/book/:id', verifyToken, purchaseBook);
router.get('/my', verifyToken, getMyPurchases);

module.exports = router;
