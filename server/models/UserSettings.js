const mongoose = require('mongoose');

const UserSettingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // ============================================================
    // APPEARANCE
    // ============================================================

    appearance: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
    },

    // ============================================================
    // NOTIFICATIONS
    // ============================================================

    notifications: {
      system: {
        type: Boolean,
        default: true,
      },

      messages: {
        type: Boolean,
        default: true,
      },

      friendRequests: {
        type: Boolean,
        default: true,
      },

      comments: {
        type: Boolean,
        default: true,
      },

      likes: {
        type: Boolean,
        default: true,
      },

      email: {
        type: Boolean,
        default: true,
      },
    },

    // ============================================================
    // PRIVACY
    // ============================================================

    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'public',
      },

      whoCanMessage: {
        type: String,
        enum: ['everyone', 'friends', 'nobody'],
        default: 'everyone',
      },

      showOnlineStatus: {
        type: Boolean,
        default: true,
      },

      showActivityStatus: {
        type: Boolean,
        default: true,
      },
    },

    // ============================================================
    // SECURITY
    // ============================================================

    security: {
      twoFactorEnabled: {
        type: Boolean,
        default: false,
      },

      biometricEnabled: {
        type: Boolean,
        default: false,
      },

      sensitiveActionConfirmation: {
        type: Boolean,
        default: true,
      },
    },

    // ============================================================
    // VERIFICATION
    // ============================================================

    verification: {
      scanNotifications: {
        type: Boolean,
        default: true,
      },

      verificationResults: {
        type: Boolean,
        default: true,
      },

      saveScanHistory: {
        type: Boolean,
        default: true,
      },
    },

    // ============================================================
    // COMMUNITY
    // ============================================================

    community: {
      friendRequests: {
        type: Boolean,
        default: true,
      },

      communityNotifications: {
        type: Boolean,
        default: true,
      },

      profileSuggestions: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

module.exports =
  mongoose.models.UserSettings ||
  mongoose.model('UserSettings', UserSettingsSchema);