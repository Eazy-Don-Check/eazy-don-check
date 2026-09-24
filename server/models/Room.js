const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      maxlength: [50, 'Room name cannot exceed 50 characters']
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      maxlength: [250, 'Description cannot exceed 250 characters'],
      default: ''
    },
    type: {
      type: String,
      enum: ['public', 'private', 'direct'],
      default: 'public'
    },
    // For direct message (1-on-1) pairs or restricted rooms
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    // Room owner or admin moderators
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    is_archived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index slug for quick lookup when joining channels
roomSchema.index({ slug: 1 });

module.exports = mongoose.model('Room', roomSchema);