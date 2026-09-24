const express = require('express');
const router = express.Router();
const {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  updateBookImage,
  deleteBook,
} = require('../controllers/bookController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Public routes for catalog discovery
router.get('/', getBooks);
router.get('/:id', getBookById);

// Protected routes (Librarian & Admin only)
router.post('/', protect, authorize('librarian', 'admin'), createBook);
router.put('/:id', protect, authorize('librarian', 'admin'), updateBook);
router.put('/:id/image', protect, authorize('librarian', 'admin'), updateBookImage);
router.delete('/:id', protect, authorize('librarian', 'admin'), deleteBook);

module.exports = router;