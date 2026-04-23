const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { uploadFile, getSignedUrl } = require('../services/backblaze.service');

const getBooks = async (req, res) => {
  const { user } = req;
  
  try {
    const books = await prisma.book.findMany();
    
    // Generate signed URLs for book covers/files if needed
    // Temporarily skip signing all URLs to prevent Network Error/Timeout
    // and map cover field if it's missing (using a placeholder for now)
    const formattedBooks = books.map(book => ({
      ...book,
      cover: book.fileUrl // Placeholder until schema has coverUrl
    }));

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

module.exports = {
  getBooks,
  createBook,
  getBookById,
  deleteBook,
  secureDownload,
};
