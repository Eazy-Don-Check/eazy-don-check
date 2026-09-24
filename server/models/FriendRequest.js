const mongoose = require('mongoose');

const FriendRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'rejected',
      ],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);


// ============================================================
// INDEXES
// ============================================================

FriendRequestSchema.index({
  sender: 1,
  receiver: 1,
});

FriendRequestSchema.index({
  receiver: 1,
  status: 1,
});

FriendRequestSchema.index({
  sender: 1,
  status: 1,
});


// ============================================================
// EXPORT
// ============================================================

module.exports =
  mongoose.models.FriendRequest ||
  mongoose.model(
    'FriendRequest',
    FriendRequestSchema
  );