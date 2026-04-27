const express = require('express');
const { 
  addReaction, 
  addComment, 
  getComments, 
  deleteComment, 
  reactToComment 
} = require('../controllers/interaction.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const router = express.Router();

router.post('/reactions', verifyToken, addReaction);

router.get('/comments', verifyToken, getComments);
router.post('/comments', verifyToken, addComment);
router.delete('/comments/:id', verifyToken, deleteComment);

router.post('/comments/:id/react', verifyToken, reactToComment);

module.exports = router;
