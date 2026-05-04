const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getSermons = async (req, res) => {
  try {
    const sermons = await prisma.sermon.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const { getSignedUrl } = require('../services/backblaze.service');
    
    const formattedSermons = await Promise.all(sermons.map(async (sermon) => {
      let coverUrl = sermon.coverUrl;
      if (coverUrl) {
        try {
          const urlObj = new URL(coverUrl);
          const fileName = decodeURIComponent(urlObj.pathname.substring(1));
          coverUrl = await getSignedUrl(fileName);
        } catch(err) {
          console.error("Failed to sign sermon cover:", err.message);
        }
      }
      return { ...sermon, coverUrl };
    }));

    res.status(200).json(formattedSermons);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sermons', error: error.message });
  }
};

const { uploadFile, getSignedUrl } = require('../services/backblaze.service');

const createSermon = async (req, res) => {
  const { title, description, videoUrl, duration, videoType } = req.body;
  const thumbnailFile = req.file;

  try {
    let coverUrl = null;
    if (thumbnailFile) {
      const coverName = `covers/sermons/${Date.now()}-${thumbnailFile.originalname}`;
      coverUrl = await uploadFile(thumbnailFile.buffer, coverName, thumbnailFile.mimetype);
    }

    const sermon = await prisma.sermon.create({
      data: { 
        title, 
        description, 
        videoUrl: videoUrl || '', 
        duration,
        videoType: videoType || 'url',
        coverUrl 
      }
    });
    
    let signedCoverUrl = coverUrl;
    if (coverUrl) {
      try {
        const urlObj = new URL(coverUrl);
        const fileName = decodeURIComponent(urlObj.pathname.substring(1));
        signedCoverUrl = await getSignedUrl(fileName);
      } catch (e) {
        console.error("Failed to sign created sermon cover:", e.message);
      }
    }

    const { getIO } = require('../socket');
    getIO().emit('sermon:created', { ...sermon, coverUrl: signedCoverUrl });

    res.status(201).json({ ...sermon, coverUrl: signedCoverUrl });
  } catch (error) {
    res.status(500).json({ message: 'Error creating sermon', error: error.message });
  }
};

module.exports = {
  getSermons,
  createSermon,
};
