const Book = require('../models/Book');
const Borrowing = require('../models/borrowing');
const User = require('../models/user');
const Category = require('../models/Category');

// @desc    Get aggregated library analytics & KPIs
// @route   GET /api/analytics/dashboard
// @access  Private (Admin, Librarian)
const getDashboardMetrics = async (req, res) => {
  try {
    const [
      totalBooks,
      totalMembers,
      activeBorrows,
      overdueLoans,
      totalFines,
    ] = await Promise.all([
      Book.countDocuments(),
      User.countDocuments({ role: 'member' }),
      Borrowing.countDocuments({ status: 'borrowed' }),
      Borrowing.countDocuments({ status: 'overdue' }),
      Borrowing.aggregate([
        { $match: { fineStatus: { $in: ['unpaid', 'paid'] } } },
        { $group: { _id: null, total: { $sum: '$fineAmount' } } },
      ]),
    ]);

    // Top 5 Most Borrowed Books
    const popularBooks = await Borrowing.aggregate([
      { $group: { _id: '$book', borrowCount: { $sum: 1 } } },
      { $sort: { borrowCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'bookDetails',
        },
      },
      { $unwind: '$bookDetails' },
      {
        $project: {
          _id: 1,
          borrowCount: 1,
          title: '$bookDetails.title',
          isbn: '$bookDetails.isbn',
          authors: '$bookDetails.authors',
        },
      },
    ]);

    // Category Distribution
    const categoryDistribution = await Book.aggregate([
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },
      { $unwind: '$categoryDetails' },
      {
        $project: {
          _id: 1,
          categoryName: '$categoryDetails.name',
          count: 1,
        },
      },
    ]);

    res.status(200).json({
      summary: {
        totalBooks,
        totalMembers,
        activeBorrows,
        overdueLoans,
        totalFinesAccumulated: totalFines[0]?.total || 0,
      },
      popularBooks,
      categoryDistribution,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboardMetrics };