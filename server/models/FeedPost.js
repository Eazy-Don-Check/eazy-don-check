const mongoose = require('mongoose');

const feedPostSchema = new mongoose.Schema(
  {
    // ==========================================
    // AUTHOR
    // ==========================================
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ==========================================
    // POST CONTENT
    // ==========================================
    content: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },

    // ==========================================
    // MEDIA
    // ==========================================
    media: [
      {
        url: {
          type: String,
          trim: true,
        },

        publicId: {
          type: String,
          trim: true,
          default: '',
        },

        type: {
          type: String,
          enum: ['image', 'video', 'audio', 'file'],
          default: 'image',
        },

        width: {
          type: Number,
          default: null,
        },

        height: {
          type: Number,
          default: null,
        },

        duration: {
          type: Number,
          default: null,
        },

        originalName: {
          type: String,
          trim: true,
          default: '',
        },
      },
    ],

    // ==========================================
    // POST VISIBILITY
    // ==========================================
    visibility: {
      type: String,
      enum: ['public', 'friends'],
      default: 'public',
      index: true,
    },

    // ==========================================
    // POST STATUS
    // ==========================================
    status: {
      type: String,
      enum: ['published', 'hidden', 'deleted'],
      default: 'published',
      index: true,
    },

    // ==========================================
    // ENGAGEMENT
    // ==========================================
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    sharedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ==========================================
    // SHARE REFERENCE
    // ==========================================
    sharedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeedPost',
      default: null,
    },

    // ==========================================
    // COUNTERS
    // ==========================================
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    sharesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// INDEXES
// ==========================================

// Main feed query
feedPostSchema.index({
  status: 1,
  visibility: 1,
  createdAt: -1,
});

// Author's posts
feedPostSchema.index({
  author: 1,
  status: 1,
  createdAt: -1,
});

// Shared posts
feedPostSchema.index({
  sharedFrom: 1,
  createdAt: -1,
});

// ==========================================
// VIRTUALS
// ==========================================

feedPostSchema.virtual('likes').get(function () {
  return this.likesCount;
});

feedPostSchema.virtual('comments').get(function () {
  return this.commentsCount;
});

feedPostSchema.virtual('shares').get(function () {
  return this.sharesCount;
});

feedPostSchema.set('toJSON', {
  virtuals: true,
});

feedPostSchema.set('toObject', {
  virtuals: true,
});

module.exports =
  mongoose.models.FeedPost ||
  mongoose.model('FeedPost', feedPostSchema);