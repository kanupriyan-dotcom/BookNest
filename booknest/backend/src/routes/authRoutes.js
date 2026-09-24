const express = require('express');
const router = express.Router();
const {
  registerMember,
  loginUser,
  getMe,
  logoutUser,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', registerMember);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/logout', logoutUser);

module.exports = router;