const express = require('express');
const { getStats, getUsers, updateUser, deleteUser, getAllComments, getAllReviews } = require('../controllers/admin.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const router = express.Router();

// All admin routes require system_admin role
router.use(verifyToken, requireRole(['system_admin']));

router.get('/stats', getStats);
router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/comments', getAllComments);
router.get('/reviews', getAllReviews);

module.exports = router;
