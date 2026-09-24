const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // ==========================================
    // RECIPIENT
    // ==========================================
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // ==========================================
    // SENDER
    // ==========================================
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },

    // ==========================================
    // NOTIFICATION TYPE
    // ==========================================
    type: {
      type: String,
      enum: [
        'message',
        'room_message',
        'friend_request',
        'friend_request_accepted',
        'comment',
        'like',
        'event',
        'system',
        'admin'
      ],
      required: true,
      index: true
    },

    // ==========================================
    // DISPLAY CONTENT
    // ==========================================
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },

    // ==========================================
    // READ STATUS
    // ==========================================
    read: {
      type: Boolean,
      default: false,
      index: true
    },

    readAt: {
      type: Date,
      default: null
    },

    // ==========================================
    // RELATED CHAT ROOM
    // ==========================================
    relatedRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
      index: true
    },

    // ==========================================
    // RELATED MESSAGE
    // ==========================================
    relatedMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
      index: true
    },

    // ==========================================
    // OPTIONAL EXTRA DATA
    // ==========================================
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// ==========================================
// PERFORMANCE INDEXES
// ==========================================

// Latest notifications for a user
notificationSchema.index({
  recipient: 1,
  createdAt: -1
});

// Unread notifications for a user
notificationSchema.index({
  recipient: 1,
  read: 1,
  createdAt: -1
});

module.exports = mongoose.model(
  'Notification',
  notificationSchema
);