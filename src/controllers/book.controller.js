const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { uploadFile, getSignedUrl } = require('../services/backblaze.service');

const getBooks = async (req, res) => {
  const { user } = req;
  
  try {
    const books = await prisma.book.findMany({
      include: {
        reviews: {
          select: { rating: true }
        }
      }
    });
    
    const formattedBooks = books.map(book => {
      const totalReviews = book.reviews.length;
      const averageRating = totalReviews > 0
        ? book.reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews
        : 0;

      return {
        ...book,
        cover: book.fileUrl,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews,
        reviews: undefined // don't send all reviews to the list
      };
    });

    res.status(200).json(formattedBooks);
  } catch (error) {
    console.error('SERVER ERROR IN GETBOOKS:', error);
    res.status(500).json({ message: 'Error fetching books', error: error.message });
  }
};

const createBook = async (req, res) => {
  const { title, author, category, price, pages } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'Book file is required' });
  }

  try {
    const fileName = `books/${Date.now()}-${file.originalname}`;
    const fileUrl = await uploadFile(file.buffer, fileName, file.mimetype);

    const book = await prisma.book.create({
      data: {
        title,
        author,
        category: (category || 'free').toLowerCase(),
        price: parseFloat(price) || 0,
        pages: parseInt(pages) || 0,
        fileUrl,
      },
    });

    const { getIO } = require('../socket');
    getIO().emit('book:created', book);

    res.status(201).json(book);
  } catch (error) {
    res.status(500).json({ message: 'Error creating book', error: error.message });
  }
};

const getBookById = async (req, res) => {
  const { id } = req.params;
  try {
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching book', error: error.message });
  }
};

const deleteBook = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.book.delete({ where: { id } });
    
    const { getIO } = require('../socket');
    getIO().emit('book:deleted', id);

    res.status(200).json({ message: 'Book deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting book', error: error.message });
  }
};

const secureDownload = async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  try {
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) return res.status(404).json({ message: 'Book not found' });

    let hasAccess = false;
    if (user.role !== 'general_user') {
      hasAccess = true;
    } else {
      const purchase = await prisma.purchase.findFirst({
        where: { userId: user.id, bookId: id }
      });
      if (purchase) {
        hasAccess = true;
      } else {
        const tierLevels = { 'free': 0, 'standard': 1, 'premium': 2, 'vvip': 3 };
        const userTier = tierLevels[user.subscriptionTier] || 0;
        const bookTier = tierLevels[book.category.toLowerCase()] || 0;
        if (userTier >= bookTier) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this book' });
    }

    const urlObj = new URL(book.fileUrl);
    const fileName = urlObj.pathname.substring(1); // remove leading slash
    const signedUrl = await getSignedUrl(fileName);

    res.status(200).json({ downloadUrl: signedUrl });
  } catch (error) {
    res.status(500).json({ message: 'Error generating download link', error: error.message });
  }
};

const getBookReviews = async (req, res) => {
  const { id } = req.params;
  try {
    const reviews = await prisma.bookReview.findMany({
      where: { bookId: id },
      include: {
        user: { select: { name: true, id: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const averageRating = reviews.length > 0
      ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
      : 0;

    res.status(200).json({
      reviews,
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews: reviews.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
};

const addBookReview = async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;

  try {
    const existing = await prisma.bookReview.findFirst({
      where: { bookId: id, userId }
    });

    if (existing) {
      return res.status(400).json({ message: 'You have already reviewed this book.' });
    }

    const review = await prisma.bookReview.create({
      data: {
        rating,
        comment,
        bookId: id,
        userId
      },
      include: {
        user: { select: { name: true, id: true } }
      }
    });

    const { getIO } = require('../socket');
    getIO().emit('review:created', review);

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error adding review', error: error.message });
  }
};

const deleteBookReview = async (req, res) => {
  const { reviewId } = req.params;
  try {
    const review = await prisma.bookReview.findUnique({ where: { id: reviewId } });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    
    // Only admins or the owner can delete
    if (review.userId !== req.user.id && req.user.role === 'general_user') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await prisma.bookReview.delete({ where: { id: reviewId } });
    
    res.status(200).json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting review', error: error.message });
  }
};

module.exports = {
  getBooks,
  createBook,
  getBookById,
  deleteBook,
  secureDownload,
  getBookReviews,
  addBookReview,
  deleteBookReview
};
