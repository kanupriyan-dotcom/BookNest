const Book = require('../models/Book');
const Borrowing = require('../models/borrowing');
const { assessBookDamage, generateSimilarBooksReply } = require('../services/huggingFaceService');

// @desc    Run Hugging Face damage assessment comparing before & after images
// @route   POST /api/ai/damage-assess
// @access  Private (Librarian, Admin)
const assessDamage = async (req, res) => {
  try {
    const { beforeImage, afterImage, borrowingId, bookId, visualMetrics } = req.body;

    if (!afterImage) {
      return res.status(400).json({ message: 'After-loan book image is required for damage assessment.' });
    }

    let bookTitle = 'Book';
    let replacementCost = 25.0;
    let borrowing = null;

    if (borrowingId) {
      borrowing = await Borrowing.findById(borrowingId).populate('book').populate('user', 'name email');
      if (borrowing && borrowing.book) {
        bookTitle = borrowing.book.title;
        replacementCost = borrowing.book.replacementCost || 25.0;
      }
    } else if (bookId) {
      const book = await Book.findById(bookId);
      if (book) {
        bookTitle = book.title;
        replacementCost = book.replacementCost || 25.0;
      }
    }

    // Use existing beforeImage from borrowing if not re-uploaded
    const finalBeforeImage = beforeImage || (borrowing ? borrowing.beforeImage : null);

    const report = await assessBookDamage({
      beforeImage: finalBeforeImage,
      afterImage,
      replacementCost,
      bookTitle,
      visualMetrics,
    });

    // If linked to an active/returned borrowing record, update MongoDB
    if (borrowing) {
      if (finalBeforeImage) borrowing.beforeImage = finalBeforeImage;
      borrowing.afterImage = afterImage;
      borrowing.damageFee = report.damageFee;
      borrowing.damageReport = {
        damageScore: report.damageScore,
        damageLevel: report.damageLevel,
        defects: report.defects,
        notes: report.summary,
        damageFee: report.damageFee,
        modelUsed: report.modelUsed,
        assessedAt: report.assessedAt,
      };

      if (report.damageFee > 0 && borrowing.fineStatus === 'none') {
        borrowing.fineStatus = 'unpaid';
      }

      await borrowing.save();
    }

    res.status(200).json({
      success: true,
      report,
      borrowing,
      message: `Damage assessment completed. Severity: ${report.damageLevel.toUpperCase()} (₹${report.damageFee.toFixed(2)} damage fee assessed).`,
    });
  } catch (error) {
    console.error('Error assessing damage:', error);
    res.status(500).json({ message: error.message || 'Damage assessment failed.' });
  }
};

// @desc    AI Chatbot for finding similar books & catalog suggestions
// @route   POST /api/ai/chat
// @access  Public (accessible to librarian & patrons)
const chat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'A prompt or question is required.' });
    }

    // Retrieve active books from catalog for context
    const books = await Book.find().populate('categories', 'name');

    const response = await generateSimilarBooksReply({
      message: message.trim(),
      history: history || [],
      catalogBooks: books,
    });

    res.status(200).json({
      success: true,
      reply: response.reply,
      matchedBooks: response.matchedBooks,
      model: response.model,
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ message: error.message || 'Chatbot encountered an error.' });
  }
};

// @desc    Get AI configuration status
// @route   GET /api/ai/status
// @access  Public
const getAiStatus = (req, res) => {
  const hasKey = Boolean(process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN);
  res.status(200).json({
    connected: true,
    hasHfKey: hasKey,
    visionModel: process.env.HF_VISION_MODEL || 'google/vit-base-patch16-224',
    chatModel: process.env.HF_CHAT_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3',
    status: hasKey ? 'Hugging Face API active' : 'Built-in Vision & Semantic Engine active',
  });
};

// @desc    Update Hugging Face API key at runtime
// @route   POST /api/ai/config
// @access  Private (Librarian, Admin)
const updateAiConfig = (req, res) => {
  const { apiKey, visionModel, chatModel } = req.body;
  if (apiKey !== undefined) {
    process.env.HUGGINGFACE_API_KEY = apiKey.trim();
  }
  if (visionModel) {
    process.env.HF_VISION_MODEL = visionModel.trim();
  }
  if (chatModel) {
    process.env.HF_CHAT_MODEL = chatModel.trim();
  }

  res.status(200).json({
    success: true,
    message: 'AI configuration updated successfully.',
    hasHfKey: Boolean(process.env.HUGGINGFACE_API_KEY),
  });
};

module.exports = {
  assessDamage,
  chat,
  getAiStatus,
  updateAiConfig,
};
