const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { uploadFile, getSignedUrl } = require('../services/backblaze.service');

const getSermons = async (req, res) => {
  try {
    const sermons = await prisma.sermon.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Generate signed URLs for uploaded videos
    const sermonsWithSignedUrls = await Promise.all(sermons.map(async (sermon) => {
      if (sermon.videoType === 'upload' && sermon.videoUrl && sermon.videoUrl.startsWith('http')) {
        try {
          const urlObj = new URL(sermon.videoUrl);
          const fileName = decodeURIComponent(urlObj.pathname.substring(1));
          const signedUrl = await getSignedUrl(fileName);
          return { ...sermon, videoUrl: signedUrl };
        } catch (err) {
          console.error(`Failed to sign sermon ${sermon.id}:`, err.message);
          return sermon;
        }
      }
      return sermon;
    }));

    res.status(200).json(sermonsWithSignedUrls);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sermons', error: error.message });
  }
};

const createSermon = async (req, res) => {
  const { title, description, duration, videoUrl, videoType } = req.body;
  const files = req.files;

  try {
    let finalVideoUrl = videoUrl;
    let finalThumbnailUrl = null;

    // Handle Video Upload
    if (videoType === 'upload' && files?.video?.[0]) {
      const videoFile = files.video[0];
      const videoName = `sermons/${Date.now()}-${videoFile.originalname}`;
      finalVideoUrl = await uploadFile(videoFile.buffer, videoName, videoFile.mimetype);
    }

    // Handle Thumbnail Upload
    if (files?.thumbnail?.[0]) {
      const thumbFile = files.thumbnail[0];
      const thumbName = `thumbnails/${Date.now()}-${thumbFile.originalname}`;
      finalThumbnailUrl = await uploadFile(thumbFile.buffer, thumbName, thumbFile.mimetype);
    }

    const sermon = await prisma.sermon.create({
      data: {
        title,
        description,
        duration,
        videoUrl: finalVideoUrl,
        videoType: videoType || 'upload',
        thumbnailUrl: finalThumbnailUrl
      }
    });

    const { getIO } = require('../socket');
    getIO().emit('sermon:created', sermon);

    res.status(201).json(sermon);
  } catch (error) {
    res.status(500).json({ message: 'Error creating sermon', error: error.message });
  }
};

module.exports = {
  getSermons,
  createSermon,
};
