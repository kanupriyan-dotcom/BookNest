const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'ready_for_pickup', 'fulfilled', 'cancelled', 'expired'],
      default: 'pending',
    },
    reservedAt: {
      type: Date,
      default: Date.now,
    },
    notifiedAt: {
      type: Date,
      default: null,
    },
    holdExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

reservationSchema.index(
  { book: 1, user: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'ready_for_pickup'] } },
  }
);

module.exports = mongoose.model('Reservation', reservationSchema);