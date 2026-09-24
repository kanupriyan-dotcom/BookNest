const mongoose = require('mongoose');

const borrowingSchema = new mongoose.Schema(
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
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    returnDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['borrowed', 'returned', 'overdue'],
      default: 'borrowed',
    },
    fineAmount: {
      type: Number,
      default: 0.0,
      min: 0,
    },
    fineStatus: {
      type: String,
      enum: ['none', 'unpaid', 'paid', 'waived'],
      default: 'none',
    },
    beforeImage: {
      type: String,
      default: '',
    },
    afterImage: {
      type: String,
      default: '',
    },
    damageFee: {
      type: Number,
      default: 0.0,
      min: 0,
    },
    damageReport: {
      damageScore: { type: Number, default: 0 },
      damageLevel: {
        type: String,
        enum: ['none', 'minor', 'moderate', 'severe'],
        default: 'none',
      },
      defects: [{ type: String }],
      notes: { type: String, default: '' },
      damageFee: { type: Number, default: 0 },
      modelUsed: { type: String, default: 'AI Vision Inspection Engine' },
      assessedAt: { type: Date },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

borrowingSchema.virtual('totalFees').get(function () {
  return ((this.fineAmount || 0) + (this.damageFee || 0)).toFixed(2);
});

borrowingSchema.index({ user: 1, status: 1 });
borrowingSchema.index({ book: 1, status: 1 });
borrowingSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('Borrowing', borrowingSchema);
