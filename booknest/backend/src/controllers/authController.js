const User = require('../models/user');
const generateToken = require('../utils/generateToken');

// @desc    Register a new BookNest member
// @route   POST /api/auth/register
// @access  Public
const registerMember = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: 'A user with this email already exists.' });
    }

    // Role defaults to 'member'
    const user = await User.create({
      name,
      email,
      password,
      role: 'member',
    });

    const token = generateToken(res, user._id, user.role);

    res.status(201).json({
      message: 'Welcome to BookNest!',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        membershipStatus: user.membershipStatus,
        cardNumber: user.cardNumber,
        maxBorrowLimit: user.maxBorrowLimit,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      if (!user.cardNumber) {
        const randomSuffix = Math.floor(100000 + Math.random() * 900000);
        user.cardNumber = `BN-${randomSuffix}`;
        await user.save();
      }

      const token = generateToken(res, user._id, user.role);

      res.status(200).json({
        message: 'Login successful.',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          membershipStatus: user.membershipStatus,
          cardNumber: user.cardNumber,
          maxBorrowLimit: user.maxBorrowLimit,
        },
        token,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.status(200).json({ user: req.user });
};

// @desc    Log out user & clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully from BookNest.' });
};

module.exports = { registerMember, loginUser, getMe, logoutUser };