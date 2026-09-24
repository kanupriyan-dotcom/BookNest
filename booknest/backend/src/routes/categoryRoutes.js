const express = require('express');
const router = express.Router();
const { getCategories, createCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/', getCategories);
router.post('/', protect, authorize('librarian', 'admin'), createCategory);

module.exports = router;
