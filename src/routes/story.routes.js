const express = require('express');
const multer = require('multer');
const { createStory, getActiveStories, deleteStory } = require('../controllers/story.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', verifyToken, requireRole(['system_admin', 'posts_admin']), upload.single('media'), createStory);
router.get('/', verifyToken, getActiveStories);
router.delete('/:id', verifyToken, requireRole(['system_admin', 'posts_admin']), deleteStory);

module.exports = router;
