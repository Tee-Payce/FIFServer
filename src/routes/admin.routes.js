const express = require('express');
const { getStats, getUsers, updateUser, deleteUser } = require('../controllers/admin.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const router = express.Router();

// All admin routes require system_admin role
router.use(verifyToken, requireRole(['system_admin']));

router.get('/stats', getStats);
router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
