const Book = require('../models/Book');
const Category = require('../models/Category');

// @desc    Get all books with search, filter, and pagination
// @route   GET /api/books
// @access  Public
const getBooks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, category, status, sortBy } = req.query;

    let query = {};

    // Text search on title, authors, description, or exact ISBN match
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { authors: { $regex: search, $options: 'i' } },
        { isbn: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by Category
    if (category) {
      query.categories = category;
    }

    // Filter by Availability Status
    if (status === 'available') {
      query.availableCopies = { $gt: 0 };
    } else if (status === 'unavailable') {
      query.availableCopies = { $eq: 0 };
    }

    // Dynamic sorting
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'title_asc') sortOptions = { title: 1 };
    if (sortBy === 'title_desc') sortOptions = { title: -1 };
    if (sortBy === 'year_desc') sortOptions = { publicationYear: -1 };

    const totalBooks = await Book.countDocuments(query);
    const books = await Book.find(query)
      .populate('categories', 'name')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      totalBooks,
      totalPages: Math.ceil(totalBooks / limit),
      currentPage: page,
      books,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single book by ID
// @route   GET /api/books/:id
// @access  Public
const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate('categories', 'name');
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new book
// @route   POST /api/books
// @access  Private (Librarian, Admin)
const createBook = async (req, res) => {
  try {
    const {
      title,
      isbn,
      authors,
      categories,
      publisher,
      publicationYear,
      description,
      totalCopies,
      shelfLocation,
      coverImage,
      condition,
      replacementCost,
    } = req.body;

    const existingBook = await Book.findOne({ isbn });
    if (existingBook) {
      return res.status(400).json({ message: 'A book with this ISBN already exists.' });
    }

    const book = await Book.create({
      title,
      isbn,
      authors,
      categories,
      publisher,
      publicationYear,
      description,
      totalCopies,
      availableCopies: totalCopies, // Initially, all copies are available
      shelfLocation,
      coverImage: coverImage || '',
      condition: condition || 'good',
      replacementCost: replacementCost ? Number(replacementCost) : 25.0,
    });

    res.status(201).json({ message: 'Book created successfully.', book });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update book details
// @route   PUT /api/books/:id
// @access  Private (Librarian, Admin)
const updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    const updatedBook = await Book.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ message: 'Book updated successfully.', book: updatedBook });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update book image by librarian at will
// @route   PUT /api/books/:id/image
// @access  Private (Librarian, Admin)
const updateBookImage = async (req, res) => {
  try {
    const { coverImage } = req.body;
    if (!coverImage) {
      return res.status(400).json({ message: 'Cover image is required.' });
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    book.coverImage = coverImage;
    await book.save();

    res.status(200).json({ message: 'Book image updated successfully.', book });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a book
// @route   DELETE /api/books/:id
// @access  Private (Librarian, Admin)
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    await book.deleteOne();
    res.status(200).json({ message: 'Book deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  updateBookImage,
  deleteBook,
};