const mongoose = require('mongoose');

const feedCommentSchema = new mongoose.Schema(
  {
    // ==========================================
    // POST
    // ==========================================
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeedPost',
      required: true,
      index: true,
    },

    // ==========================================
    // COMMENT AUTHOR
    // ==========================================
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ==========================================
    // COMMENT CONTENT
    // ==========================================
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // ==========================================
    // STATUS
    // ==========================================
    status: {
      type: String,
      enum: ['published', 'hidden', 'deleted'],
      default: 'published',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// INDEXES
// ==========================================

feedCommentSchema.index({
  post: 1,
  status: 1,
  createdAt: -1,
});

feedCommentSchema.index({
  author: 1,
  createdAt: -1,
});

module.exports =
  mongoose.models.FeedComment ||
  mongoose.model('FeedComment', feedCommentSchema);