const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllPricing = async (req, res) => {
  try {
    const pricing = await prisma.pricing.findMany();
    res.status(200).json(pricing);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pricing', error: error.message });
  }
};

const updatePricing = async (req, res) => {
  const { id } = req.params;
  const { price } = req.body;
  try {
    const pricing = await prisma.pricing.upsert({
      where: { id: id.toLowerCase() },
      update: { price: parseFloat(price) },
      create: { id: id.toLowerCase(), price: parseFloat(price) },
    });
    res.status(200).json(pricing);
  } catch (error) {
    res.status(500).json({ message: 'Error updating pricing', error: error.message });
  }
};

module.exports = {
  getAllPricing,
  updatePricing,
};
