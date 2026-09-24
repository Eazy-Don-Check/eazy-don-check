const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    file_type: {
      type: String,
      enum: ['image', 'document', 'audio', 'video'],
      required: true
    },
    file_name: { type: String },
    file_size: { type: Number },
    mime_type: { type: String },
    duration: { type: Number, min: 0 }
  },
  { _id: false }
);

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true, trim: true },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    content: {
      type: String,
      trim: true,
      default: ''
    },
    reply_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
      index: true
    },
    attachments: [attachmentSchema],
    message_type: {
      type: String,
      enum: ['text', 'media', 'voice', 'system'],
      default: 'text'
    },
    reactions: {
      type: [reactionSchema],
      default: []
    },
    // Messages can be hidden for one recipient without deleting them for everyone.
    deleted_for: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    ],
    read_by: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        read_at: {
          type: Date,
          default: Date.now
        }
      }
    ],
    is_edited: {
      type: Boolean,
      default: false
    },
    is_deleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ 'reactions.users': 1 });

module.exports = mongoose.model('Message', messageSchema);