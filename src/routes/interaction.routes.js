const express = require('express');
const { 
  addReaction, 
  addComment, 
  getComments, 
  deleteComment, 
  reactToComment 
} = require('../controllers/interaction.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const router = express.Router();

router.post('/reactions', verifyToken, addReaction);

router.get('/comments', verifyToken, getComments);
router.post('/comments', verifyToken, addComment);
router.delete('/comments/:id', verifyToken, requireRole(['system_admin', 'posts_admin']), deleteComment);

router.post('/comments/:id/react', verifyToken, reactToComment);

module.exports = router;
