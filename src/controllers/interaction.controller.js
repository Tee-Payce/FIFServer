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
        // Toggle off: remove reaction if same type
        await prisma.reaction.delete({ where: { id: existingReaction.id } });
      } else {
        // Update type: if different type
        await prisma.reaction.update({
          where: { id: existingReaction.id },
          data: { type }
        });
      }
    } else {
      // Create new
      await prisma.reaction.create({
        data: { type, entityId, entityType, userId }
      });
    }

    // Fetch updated count
    const count = await prisma.reaction.count({
      where: { entityId, entityType }
    });

    // Broadcast the updated count and entity info to everyone
    getIO().emit('reaction:update', { entityId, entityType, count });

    res.status(200).json({ message: 'Reaction updated', count });
  } catch (error) {
    res.status(500).json({ message: 'Error processing reaction', error: error.message });
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
        user: { select: { name: true } }
      }
    });

    // Broadcast to the specific entity room
    getIO().to(`${entityType}:${entityId}`).emit('comment:created', comment);

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: 'Error adding comment', error: error.message });
  }
};

module.exports = {
  addReaction,
  addComment
};
