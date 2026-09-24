const express = require('express');
const router = express.Router();
const {
  assessDamage,
  chat,
  getAiStatus,
  updateAiConfig,
} = require('../controllers/aiController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Public route for finding similar books chatbot
router.post('/chat', chat);
router.get('/status', getAiStatus);

// Staff routes for damage inspection & configuration
router.post('/damage-assess', protect, authorize('librarian', 'admin'), assessDamage);
router.post('/config', protect, authorize('librarian', 'admin'), updateAiConfig);

module.exports = router;
