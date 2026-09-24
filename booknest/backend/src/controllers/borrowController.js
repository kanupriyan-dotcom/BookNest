const Borrowing = require('../models/borrowing');
const Book = require('../models/Book');
const User = require('../models/user');
const Reservation = require('../models/Reservation');
const { runOverdueCheck } = require('../services/cronService');

// @desc    Issue a book to a member
// @route   POST /api/borrow/issue
// @access  Private (Librarian, Admin)
const issueBook = async (req, res) => {
  try {
    const { bookId, userId, daysToDue = 14, beforeImage = '' } = req.body;

    // 1. Verify User exists and is eligible
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Member not found.' });
    }
    if (user.membershipStatus !== 'active') {
      return res.status(403).json({ message: `Cannot issue book. Account status is ${user.membershipStatus}.` });
    }

    // 2. Check active loans limit
    const activeLoans = await Borrowing.countDocuments({ user: userId, status: { $in: ['borrowed', 'overdue'] } });
    if (activeLoans >= user.maxBorrowLimit) {
      return res.status(400).json({ message: `Borrow limit reached (${user.maxBorrowLimit} books maximum).` });
    }

    // 3. Verify Book availability or user's ready reservation
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    const userReservation = await Reservation.findOne({
      book: bookId,
      user: userId,
      status: { $in: ['ready_for_pickup', 'pending'] },
    });

    if (book.availableCopies < 1 && (!userReservation || userReservation.status !== 'ready_for_pickup')) {
      return res.status(400).json({ message: 'No copies currently available. Place a reservation instead.' });
    }

    // 4. Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(daysToDue));

    // 5. Create Borrow Record with optional before-inspection photo
    const borrowing = await Borrowing.create({
      book: bookId,
      user: userId,
      issuedBy: req.user._id,
      dueDate,
      status: 'borrowed',
      beforeImage: beforeImage || '',
    });

    // If book doesn't have a cover image yet and beforeImage is captured, store it
    if (beforeImage && !book.coverImage) {
      book.coverImage = beforeImage;
      await book.save();
    }

    // 6. Handle stock and reservation fulfillment
    if (userReservation) {
      userReservation.status = 'fulfilled';
      await userReservation.save();
    } else {
      if (book.availableCopies > 0) {
        book.availableCopies -= 1;
        await book.save();
      }
    }

    const populatedBorrowing = await Borrowing.findById(borrowing._id)
      .populate('book', 'title isbn authors shelfLocation coverImage')
      .populate('user', 'name email');

    res.status(201).json({
      message: 'Book successfully issued!',
      borrowing: populatedBorrowing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Return a borrowed book & compute fines / damage fee
// @route   POST /api/borrow/return/:id
// @access  Private (Librarian, Admin)
const returnBook = async (req, res) => {
  try {
    const borrowing = await Borrowing.findById(req.params.id);
    if (!borrowing) {
      return res.status(404).json({ message: 'Borrow record not found.' });
    }
    if (borrowing.status === 'returned') {
      return res.status(400).json({ message: 'This book has already been marked as returned.' });
    }

    const { afterImage, damageFee, damageReport } = req.body || {};

    const returnDate = new Date();
    let fine = 0;

    // Check if overdue: ₹5.00 per day late
    if (returnDate > borrowing.dueDate) {
      const diffTime = Math.abs(returnDate - borrowing.dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fine = Math.round(diffDays * 5.0 * 100) / 100; // ₹5.00 per day
    }

    if (afterImage) borrowing.afterImage = afterImage;
    if (damageFee !== undefined) borrowing.damageFee = Number(damageFee);
    if (damageReport) borrowing.damageReport = damageReport;

    const totalFees = fine + (borrowing.damageFee || 0);

    borrowing.returnDate = returnDate;
    borrowing.status = 'returned';
    borrowing.fineAmount = fine;
    borrowing.fineStatus = totalFees > 0 ? 'unpaid' : 'none';
    await borrowing.save();

    // Increment available book copies or assign to reservation
    const book = await Book.findById(borrowing.book);
    let nextUserReserved = null;

    if (book) {
      const nextReservation = await Reservation.findOne({
        book: book._id,
        status: 'pending',
      }).sort({ reservedAt: 1 }).populate('user', 'name email');

      if (nextReservation) {
        // Hold copy for the next person in line for 48 hours
        nextReservation.status = 'ready_for_pickup';
        nextReservation.notifiedAt = new Date();
        const holdDate = new Date();
        holdDate.setHours(holdDate.getHours() + 48);
        nextReservation.holdExpiresAt = holdDate;
        await nextReservation.save();
        nextUserReserved = nextReservation.user?.name;
      } else {
        book.availableCopies += 1;
        await book.save();
      }
    }

    const updatedBorrowing = await Borrowing.findById(borrowing._id)
      .populate('book', 'title isbn authors')
      .populate('user', 'name email');

    res.status(200).json({
      message: `Book returned successfully!${nextUserReserved ? ` Reserved copy held for ${nextUserReserved}.` : ''}`,
      returnDate,
      fineAccrued: fine,
      borrowing: updatedBorrowing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get member's own loans and reading history + reservations
// @route   GET /api/borrow/my-loans
// @access  Private (Member)
const getMyLoans = async (req, res) => {
  try {
    const loans = await Borrowing.find({ user: req.user._id })
      .populate('book', 'title isbn authors publisher shelfLocation availableCopies')
      .sort({ createdAt: -1 });

    const reservations = await Reservation.find({ user: req.user._id })
      .populate('book', 'title isbn authors publisher shelfLocation availableCopies')
      .sort({ createdAt: -1 });

    res.status(200).json({ loans, reservations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reserve an unavailable book
// @route   POST /api/borrow/reserve
// @access  Private (Member)
const reserveBook = async (req, res) => {
  try {
    const { bookId } = req.body;

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    if (book.availableCopies > 0) {
      return res.status(400).json({ message: 'Copies are currently available; you can borrow directly.' });
    }

    const existingReservation = await Reservation.findOne({
      book: bookId,
      user: req.user._id,
      status: { $in: ['pending', 'ready_for_pickup'] },
    });

    if (existingReservation) {
      return res.status(400).json({ message: 'You already have an active reservation for this book.' });
    }

    const reservation = await Reservation.create({
      book: bookId,
      user: req.user._id,
    });

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('book', 'title isbn authors');

    res.status(201).json({
      message: 'Book reserved successfully. We will hold a copy for you when returned.',
      reservation: populatedReservation,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel a reservation
// @route   DELETE /api/borrow/reserve/:id
// @access  Private (Member, Librarian, Admin)
const cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    // Check authorization: must be user who made it or librarian/admin
    if (
      reservation.user.toString() !== req.user._id.toString() &&
      !['librarian', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({ message: 'Not authorized to cancel this reservation.' });
    }

    const wasHeld = reservation.status === 'ready_for_pickup';
    reservation.status = 'cancelled';
    await reservation.save();

    // If it was held, release the copy to the next reservation or increment available copies
    if (wasHeld) {
      const book = await Book.findById(reservation.book);
      if (book) {
        const nextReservation = await Reservation.findOne({
          book: book._id,
          status: 'pending',
        }).sort({ reservedAt: 1 });

        if (nextReservation) {
          nextReservation.status = 'ready_for_pickup';
          nextReservation.notifiedAt = new Date();
          const holdDate = new Date();
          holdDate.setHours(holdDate.getHours() + 48);
          nextReservation.holdExpiresAt = holdDate;
          await nextReservation.save();
        } else {
          book.availableCopies += 1;
          await book.save();
        }
      }
    }

    res.status(200).json({ message: 'Reservation cancelled successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all borrowings (searchable, filterable)
// @route   GET /api/borrow/all
// @access  Private (Librarian, Admin)
const getAllBorrowings = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    let borrowings = await Borrowing.find(query)
      .populate('book', 'title isbn authors shelfLocation')
      .populate('user', 'name email membershipStatus')
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 });

    if (search) {
      const s = search.toLowerCase();
      borrowings = borrowings.filter((b) => {
        const bookTitle = b.book?.title?.toLowerCase() || '';
        const bookIsbn = b.book?.isbn?.toLowerCase() || '';
        const userName = b.user?.name?.toLowerCase() || '';
        const userEmail = b.user?.email?.toLowerCase() || '';
        return (
          bookTitle.includes(s) ||
          bookIsbn.includes(s) ||
          userName.includes(s) ||
          userEmail.includes(s)
        );
      });
    }

    res.status(200).json(borrowings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all reservations
// @route   GET /api/borrow/reservations
// @access  Private (Librarian, Admin)
const getAllReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate('book', 'title isbn authors availableCopies')
      .populate('user', 'name email membershipStatus')
      .sort({ createdAt: -1 });

    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Pay or waive fine
// @route   POST /api/borrow/pay-fine/:id
// @access  Private (Librarian, Admin)
const payFine = async (req, res) => {
  try {
    const { action = 'paid' } = req.body; // 'paid' or 'waived'
    const borrowing = await Borrowing.findById(req.params.id);

    if (!borrowing) {
      return res.status(404).json({ message: 'Borrow record not found.' });
    }

    if (borrowing.fineStatus !== 'unpaid' && borrowing.fineAmount <= 0) {
      return res.status(400).json({ message: 'No unpaid fine on this record.' });
    }

    borrowing.fineStatus = action === 'waived' ? 'waived' : 'paid';
    await borrowing.save();

    res.status(200).json({
      message: `Fine successfully marked as ${borrowing.fineStatus}.`,
      borrowing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Manual trigger of overdue scanner
// @route   POST /api/borrow/scan-overdue
// @access  Private (Librarian, Admin)
const scanOverdueNow = async (req, res) => {
  try {
    await runOverdueCheck();
    const overdueCount = await Borrowing.countDocuments({ status: 'overdue' });
    res.status(200).json({
      message: 'Overdue scan executed successfully.',
      currentOverdueLoans: overdueCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update damage inspection on a loan record
// @route   PUT /api/borrow/inspect/:id
// @access  Private (Librarian, Admin)
const inspectLoanDamage = async (req, res) => {
  try {
    const { beforeImage, afterImage, damageFee, damageReport } = req.body;
    const borrowing = await Borrowing.findById(req.params.id);
    if (!borrowing) {
      return res.status(404).json({ message: 'Borrow record not found.' });
    }

    if (beforeImage !== undefined) borrowing.beforeImage = beforeImage;
    if (afterImage !== undefined) borrowing.afterImage = afterImage;
    if (damageFee !== undefined) borrowing.damageFee = Number(damageFee);
    if (damageReport) borrowing.damageReport = damageReport;

    const totalDue = (borrowing.fineAmount || 0) + (borrowing.damageFee || 0);
    if (totalDue > 0 && borrowing.fineStatus === 'none') {
      borrowing.fineStatus = 'unpaid';
    }

    await borrowing.save();

    const populated = await Borrowing.findById(borrowing._id)
      .populate('book', 'title isbn authors coverImage shelfLocation')
      .populate('user', 'name email');

    res.status(200).json({
      message: 'Inspection record and damage fee updated successfully.',
      borrowing: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};