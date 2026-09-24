const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      unique: true,
      trim: true,
    },
    authors: {
      type: [String],
      required: [true, 'At least one author is required'],
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    publisher: {
      type: String,
      trim: true,
    },
    publicationYear: {
      type: Number,
    },
    description: {
      type: String,
      trim: true,
    },
    totalCopies: {
      type: Number,
      required: true,
      min: [1, 'Total copies must be at least 1'],
    },
    availableCopies: {
      type: Number,
      required: true,
      min: [0, 'Available copies cannot be negative'],
    },
    shelfLocation: {
      type: String,
      trim: true,
    },
    coverImage: {
      type: String,
      default: '',
    },
    condition: {
      type: String,
      enum: ['pristine', 'good', 'fair', 'damaged'],
      default: 'good',
    },
    replacementCost: {
      type: Number,
      default: 500.0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bookSchema.virtual('status').get(function () {
  return this.availableCopies > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK';
});

bookSchema.index({
  title: 'text',
  authors: 'text',
  description: 'text',
});

module.exports = mongoose.model('Book', bookSchema);
    