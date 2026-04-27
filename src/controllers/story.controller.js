const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { uploadFile, getSignedUrl } = require('../services/backblaze.service');

const createStory = async (req, res) => {
  const { caption, mediaType } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'Media file is required' });
  }

  try {
    const fileName = `stories/${Date.now()}-${file.originalname}`;
    const mediaUrl = await uploadFile(file.buffer, fileName, file.mimetype);

    const story = await prisma.story.create({
      data: {
        mediaUrl,
        mediaType: (mediaType || 'image').toLowerCase(),
        caption,
        createdBy: req.user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      },
      include: {
        user: { select: { name: true } }
      }
    });

    // Generate signed URL before emitting so clients can render immediately
    const signedUrl = await getSignedUrl(fileName);

    const { getIO } = require('../socket');
    getIO().emit('story:created', {
      ...story,
      mediaUrl: signedUrl,
      reactionCount: 0,
      hasReacted: false,
      userReactionType: null,
    });

    res.status(201).json(story);
  } catch (error) {
    res.status(500).json({ message: 'Error creating story', error: error.message });
  }
};

const getActiveStories = async (req, res) => {
  const userId = req.user.id;
  try {
    const stories = await prisma.story.findMany({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch all reactions for these stories manually since relation is implicit
    const storyIds = stories.map(s => s.id);
    const allReactions = await prisma.reaction.findMany({
      where: {
        entityType: 'story',
        entityId: { in: storyIds }
      }
    });

    const commentCounts = await prisma.comment.groupBy({
      by: ['entityId'],
      where: {
        entityType: 'story',
        entityId: { in: storyIds }
      },
      _count: { id: true }
    });

    // Generate signed URLs and format data
    const storiesWithSignedUrls = await Promise.all(stories.map(async (story) => {
      try {
        // Robust extraction of fileName from the URL
        // Example URL: https://bucket.endpoint/stories/123-audio.mp3
        // We need 'stories/123-audio.mp3'
        let fileName = '';
        try {
          const urlObj = new URL(story.mediaUrl);
          // For B2 S3-compatible URLs, pathname starts with /bucket/ (if path-style) or / (if virtual-host style)
          // Our uploadFile returns https://bucket.endpoint/fileName
          // So pathname is /fileName
          fileName = decodeURIComponent(urlObj.pathname.substring(1));
        } catch (e) {
          // Fallback: if it's not a valid URL, maybe it's already a fileName or relative path
          fileName = story.mediaUrl;
        }

        const signedUrl = await getSignedUrl(fileName);
        
        const storyReactions = allReactions.filter(r => r.entityId === story.id);
        const userReaction = storyReactions.find(r => r.userId === userId);
        const commentCountData = commentCounts.find(c => c.entityId === story.id);

        return { 
          ...story, 
          mediaUrl: signedUrl,
          reactionCount: storyReactions.length,
          commentCount: commentCountData ? commentCountData._count.id : 0,
          hasReacted: !!userReaction,
          userReactionType: userReaction?.type || null
        };
      } catch (err) {
        console.error(`Failed to sign URL for story ${story.id}:`, err.message);
        return story;
      }
    }));

    res.status(200).json(storiesWithSignedUrls);
  } catch (error) {
    console.error('Error in getActiveStories:', error);
    res.status(500).json({ message: 'Error fetching stories', error: error.message });
  }
};

const deleteStory = async (req, res) => {
  const { id } = req.params;

  try {
    const story = await prisma.story.findUnique({ where: { id } });
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if user is the creator or an admin
    if (story.createdBy !== req.user.id && req.user.role !== 'system_admin' && req.user.role !== 'posts_admin') {
      return res.status(403).json({ message: 'Not authorized to delete this story' });
    }

    await prisma.story.delete({ where: { id } });
    
    const { getIO } = require('../socket');
    getIO().emit('story:deleted', id);

    res.status(200).json({ message: 'Story deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting story', error: error.message });
  }
};

module.exports = {
  createStory,
  getActiveStories,
  deleteStory,
};
