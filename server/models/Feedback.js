const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // User who submitted the feedback
    // --------------------------------------------------
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Snapshot of user information at submission time
    name: {
      type: String,
      trim: true,
      default: '',
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },

    // --------------------------------------------------
    // Feedback details
    // --------------------------------------------------
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    category: {
      type: String,
      required: true,
      enum: [
        'general',
        'bug',
        'feature',
        'verification',
        'community',
        'security',
        'other',
      ],
      default: 'general',
      index: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },

    suggestion: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },

    // --------------------------------------------------
    // Admin workflow
    // --------------------------------------------------
    status: {
      type: String,
      enum: [
        'new',
        'reviewed',
        'resolved',
      ],
      default: 'new',
      index: true,
    },

    adminNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// --------------------------------------------------
// Useful indexes for Admin Panel filtering/searching
// --------------------------------------------------

feedbackSchema.index({
  createdAt: -1,
});

feedbackSchema.index({
  rating: -1,
});

feedbackSchema.index({
  category: 1,
  status: 1,
});

feedbackSchema.index({
  email: 1,
});

module.exports = mongoose.model(
  'Feedback',
  feedbackSchema
);