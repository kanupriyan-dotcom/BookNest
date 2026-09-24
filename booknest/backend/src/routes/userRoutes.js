const express = require('express');
const router = express.Router();
const { getUsers, updateUser, lookupUser } = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/', protect, authorize('librarian', 'admin'), getUsers);
router.get('/lookup/:code', protect, authorize('librarian', 'admin'), lookupUser);
router.put('/:id', protect, authorize('librarian', 'admin'), updateUser);

module.exports = router;
