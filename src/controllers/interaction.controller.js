const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getIO } = require('../socket');

const addReaction = async (req, res) => {
  const { entityType, entityId, type } = req.body;
  const userId = req.user.id;

  try {
    const existingReaction = await prisma.reaction.findFirst({
      where: { userId, entityId, entityType }
    });

    if (existingReaction) {
      if (existingReaction.type === type) {
        await prisma.reaction.delete({ where: { id: existingReaction.id } });
      } else {
        await prisma.reaction.update({
          where: { id: existingReaction.id },
          data: { type }
        });
      }
    } else {
      await prisma.reaction.create({
        data: { type, entityId, entityType, userId }
      });
    }

    const count = await prisma.reaction.count({
      where: { entityId, entityType }
    });

    getIO().emit('reaction:update', { entityId, entityType, count });
    res.status(200).json({ message: 'Reaction updated', count });
  } catch (error) {
    res.status(500).json({ message: 'Error processing reaction', error: error.message });
  }
};

const getComments = async (req, res) => {
  const { entityType, entityId } = req.query;
  const userId = req.user.id;
  try {
    const comments = await prisma.comment.findMany({
      where: { entityType, entityId },
      include: {
        user: { select: { name: true, id: true } },
        reactions: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const formattedComments = comments.map(comment => {
      const userReaction = comment.reactions.find(r => r.userId === userId);
      return {
        ...comment,
        reactionCount: comment.reactions.length,
        userReactionType: userReaction ? userReaction.type : null,
      };
    });

    res.status(200).json(formattedComments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments', error: error.message });
  }
};

const addComment = async (req, res) => {
  const { entityType, entityId, content } = req.body;
  try {
    const comment = await prisma.comment.create({
      data: {
        content,
        entityId,
        entityType,
        userId: req.user.id
      },
      include: {
        user: { select: { name: true, id: true } },
        reactions: true
      }
    });

    const formattedComment = {
      ...comment,
      reactionCount: 0,
      userReactionType: null
    };

    getIO().to(`${entityType}:${entityId}`).emit('comment:created', formattedComment);
    res.status(201).json(formattedComment);
  } catch (error) {
    res.status(500).json({ message: 'Error adding comment', error: error.message });
  }
};

const deleteComment = async (req, res) => {
  const { id } = req.params;
  try {
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.userId !== req.user.id && req.user.role === 'general_user') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await prisma.comment.delete({ where: { id } });
    getIO().to(`${comment.entityType}:${comment.entityId}`).emit('comment:deleted', id);
    res.status(200).json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting comment', error: error.message });
  }
};

const reactToComment = async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;
  const userId = req.user.id;

  try {
    const existing = await prisma.commentReaction.findFirst({
      where: { userId, commentId: id }
    });

    if (existing) {
      if (existing.type === type) {
        await prisma.commentReaction.delete({ where: { id: existing.id } });
      } else {
        await prisma.commentReaction.update({
          where: { id: existing.id },
          data: { type }
        });
      }
    } else {
      await prisma.commentReaction.create({
        data: { type, commentId: id, userId }
      });
    }

    const count = await prisma.commentReaction.count({ where: { commentId: id } });
    getIO().emit('comment:reaction:update', { commentId: id, count });
    res.status(200).json({ message: 'Reaction updated', count });
  } catch (error) {
    res.status(500).json({ message: 'Error reacting', error: error.message });
  }
};

module.exports = {
  addReaction,
  addComment,
  getComments,
  deleteComment,
  reactToComment
};
