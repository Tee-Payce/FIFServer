const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const purchaseBook = async (req, res) => {
  const { id: bookId } = req.params;
  const { id: userId } = req.user;

  try {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) return res.status(404).json({ message: 'Book not found' });

    const existingPurchase = await prisma.purchase.findFirst({
      where: { userId, bookId }
    });
    if (existingPurchase) {
      return res.status(400).json({ message: 'Book already purchased' });
    }

    const purchase = await prisma.purchase.create({
      data: { userId, bookId }
    });

    res.status(201).json({ message: 'Purchase successful', purchase });
  } catch (error) {
    res.status(500).json({ message: 'Error processing purchase', error: error.message });
  }
};

const getMyPurchases = async (req, res) => {
  const { id: userId } = req.user;
  try {
    const purchases = await prisma.purchase.findMany({
      where: { userId },
      include: {
        book: true
      }
    });
    res.status(200).json(purchases);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchases', error: error.message });
  }
};

module.exports = {
  purchaseBook,
  getMyPurchases,
};
