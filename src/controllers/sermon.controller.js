const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getSermons = async (req, res) => {
  try {
    const sermons = await prisma.sermon.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(sermons);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sermons', error: error.message });
  }
};

const createSermon = async (req, res) => {
  const { title, description, videoUrl, duration } = req.body;
  try {
    const sermon = await prisma.sermon.create({
      data: { title, description, videoUrl, duration }
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
