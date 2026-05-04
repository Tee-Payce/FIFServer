const express = require('express');
const multer = require('multer');
const { getBooks, createBook, getBookById, deleteBook, secureDownload, getBookReviews, addBookReview, deleteBookReview } = require('../controllers/book.controller');
const { getSermons, createSermon } = require('../controllers/sermon.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Books
router.get('/books', verifyToken, getBooks);
router.get('/books/:id', verifyToken, getBookById);
router.post('/books', verifyToken, requireRole(['system_admin', 'library_admin']), upload.fields([{ name: 'book', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), createBook);
router.delete('/books/:id', verifyToken, requireRole(['system_admin', 'library_admin']), deleteBook);
router.get('/secure/book/:id', verifyToken, secureDownload);

// Book Reviews
router.get('/books/:id/reviews', verifyToken, getBookReviews);
router.post('/books/:id/reviews', verifyToken, addBookReview);
router.delete('/reviews/:reviewId', verifyToken, requireRole(['system_admin', 'library_admin']), deleteBookReview);

// Sermons
router.get('/sermons', verifyToken, getSermons);
router.post('/sermons', verifyToken, requireRole(['system_admin', 'library_admin']), upload.single('thumbnail'), createSermon);

module.exports = router;
