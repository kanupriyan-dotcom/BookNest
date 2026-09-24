const mongoose = require('mongoose');
const User = require('../models/user');
const Borrowing = require('../models/borrowing');

// @desc    Get all users (searchable, filterable)
// @route   GET /api/users
// @access  Private (Librarian, Admin)
const getUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) {
      query.role = role;
    }

    if (status) {
      query.membershipStatus = status;
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });

    // Attach active loans count for each user
    const usersWithLoans = await Promise.all(
      users.map(async (u) => {
        const activeLoans = await Borrowing.countDocuments({
          user: u._id,
          status: { $in: ['borrowed', 'overdue'] },
        });
        const overdueLoans = await Borrowing.countDocuments({
          user: u._id,
          status: 'overdue',
        });
        const unpaidFinesResult = await Borrowing.aggregate([
          { $match: { user: u._id, fineStatus: 'unpaid' } },
          { $group: { _id: null, total: { $sum: '$fineAmount' } } },
        ]);
        const unpaidFines = unpaidFinesResult[0]?.total || 0;

        return {
          ...u.toObject(),
          activeLoans,
          overdueLoans,
          unpaidFines,
        };
      })
    );

    res.status(200).json(usersWithLoans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user status / details
// @route   PUT /api/users/:id
// @access  Private (Admin, Librarian)
const updateUser = async (req, res) => {
  try {
    const { membershipStatus, maxBorrowLimit, role } = req.body;
    const userToUpdate = await User.findById(req.params.id);

    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only admin can change user roles
    if (role && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can change user roles' });
    }

    if (membershipStatus) userToUpdate.membershipStatus = membershipStatus;
    if (maxBorrowLimit !== undefined) userToUpdate.maxBorrowLimit = Number(maxBorrowLimit);
    if (role && req.user.role === 'admin') userToUpdate.role = role;

    await userToUpdate.save();

    res.status(200).json({
      message: 'User updated successfully',
      user: {
        _id: userToUpdate._id,
        name: userToUpdate.name,
        email: userToUpdate.email,
        role: userToUpdate.role,
        membershipStatus: userToUpdate.membershipStatus,
        maxBorrowLimit: userToUpdate.maxBorrowLimit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lookup user by QR Code string / ID / CardNumber / Email
// @route   GET /api/users/lookup/:code
// @access  Private (Librarian, Admin)
const lookupUser = async (req, res) => {
  try {
    let { code } = req.params;
    code = decodeURIComponent(code).trim();

    // Check if code is a JSON string from a QR card
    let parsedId = null;
    let parsedCard = null;
    let parsedEmail = null;
    try {
      if (code.startsWith('{') && code.endsWith('}')) {
        const obj = JSON.parse(code);
        parsedId = obj.id || obj.userId || obj._id;
        parsedCard = obj.card || obj.cardNumber;
        parsedEmail = obj.email;
      }
    } catch (e) {
      // not JSON
    }

    const queryConditions = [];
    if (parsedId && mongoose.Types.ObjectId.isValid(parsedId)) {
      queryConditions.push({ _id: parsedId });
    }
    if (parsedCard) {
      queryConditions.push({ cardNumber: parsedCard });
    }
    if (parsedEmail) {
      queryConditions.push({ email: parsedEmail.toLowerCase() });
    }

    if (mongoose.Types.ObjectId.isValid(code)) {
      queryConditions.push({ _id: code });
    }
    queryConditions.push({ cardNumber: code });
    queryConditions.push({ email: code.toLowerCase() });

    let user = await User.findOne({ $or: queryConditions }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'No member found matching this QR code or card number.' });
    }

    // Ensure user has a cardNumber if legacy
    if (!user.cardNumber) {
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      user.cardNumber = `BN-${randomSuffix}`;
      await user.save();
    }

    // Attach active loans, overdues, and fines
    const activeLoans = await Borrowing.countDocuments({
      user: user._id,
      status: { $in: ['borrowed', 'overdue'] },
    });
    const overdueLoans = await Borrowing.countDocuments({
      user: user._id,
      status: 'overdue',
    });
    const unpaidFinesResult = await Borrowing.aggregate([
      { $match: { user: user._id, fineStatus: 'unpaid' } },
      { $group: { _id: null, total: { $sum: '$fineAmount' } } },
    ]);
    const unpaidFines = unpaidFinesResult[0]?.total || 0;

    // Get current borrowed books for quick summary
    const currentBorrowings = await Borrowing.find({
      user: user._id,
      status: { $in: ['borrowed', 'overdue'] },
    }).populate('book', 'title coverImage isbn authors');

    res.status(200).json({
      ...user.toObject(),
      activeLoans,
      overdueLoans,
      unpaidFines,
      currentBorrowings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUsers, updateUser, lookupUser };
