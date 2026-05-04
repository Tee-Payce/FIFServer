const express = require('express');
const { getStats, getUsers, updateUser, deleteUser, getAllComments, getAllReviews } = require('../controllers/admin.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const router = express.Router();

// All admin routes require system_admin role
// Admin stats accessible to all admins
router.get('/stats', verifyToken, requireRole(['system_admin', 'posts_admin', 'library_admin']), getStats);

// User management restricted to system_admin
router.get('/users', verifyToken, requireRole(['system_admin']), getUsers);
router.patch('/users/:id', verifyToken, requireRole(['system_admin']), updateUser);
router.delete('/users/:id', verifyToken, requireRole(['system_admin']), deleteUser);

// Moderation routes restricted by specific admin roles
router.get('/comments', verifyToken, requireRole(['system_admin', 'posts_admin']), getAllComments);
router.get('/reviews', verifyToken, requireRole(['system_admin', 'library_admin']), getAllReviews);

module.exports = router;
