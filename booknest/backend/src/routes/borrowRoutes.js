const express = require('express');
const router = express.Router();
const {
  issueBook,
  returnBook,
  getMyLoans,
  reserveBook,
  cancelReservation,
  getAllBorrowings,
  getAllReservations,
  payFine,
  scanOverdueNow,
  inspectLoanDamage,
} = require('../controllers/borrowController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Member routes
router.get('/my-loans', protect, getMyLoans);
router.post('/reserve', protect, reserveBook);
router.delete('/reserve/:id', protect, cancelReservation);

// Librarian & Admin routes
router.get('/all', protect, authorize('librarian', 'admin'), getAllBorrowings);
router.get('/reservations', protect, authorize('librarian', 'admin'), getAllReservations);
router.post('/issue', protect, authorize('librarian', 'admin'), issueBook);
router.post('/return/:id', protect, authorize('librarian', 'admin'), returnBook);
router.put('/inspect/:id', protect, authorize('librarian', 'admin'), inspectLoanDamage);
router.post('/pay-fine/:id', protect, authorize('librarian', 'admin'), payFine);
router.post('/scan-overdue', protect, authorize('librarian', 'admin'), scanOverdueNow);

module.exports = router;