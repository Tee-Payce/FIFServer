const express = require('express');
const { addReaction, addComment } = require('../controllers/interaction.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const router = express.Router();

router.post('/reactions', verifyToken, addReaction);
router.post('/comments', verifyToken, addComment);

module.exports = router;
