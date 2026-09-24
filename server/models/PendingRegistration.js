const mongoose = require('mongoose');

const PendingRegistrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 30,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      default: '',
      trim: true,
    },

    gender: {
      type: String,
      default: 'Not specified',
      trim: true,
    },

    relationshipStatus: {
      type: String,
      default: 'Single',
      trim: true,
    },

    education: {
      highestQualification: {
        type: String,
        default: '',
        trim: true,
      },

      institution: {
        type: String,
        default: '',
        trim: true,
      },

      courseOfStudy: {
        type: String,
        default: '',
        trim: true,
      },

      graduationYear: {
        type: String,
        default: '',
        trim: true,
      },
    },

    avatarUrl: {
      type: String,
      default: '',
      trim: true,
    },

    verificationChannel: {
      type: String,
      enum: ['email', 'phone'],
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically remove unfinished registrations.
PendingRegistrationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports =
  mongoose.models.PendingRegistration ||
  mongoose.model(
    'PendingRegistration',
    PendingRegistrationSchema
  );