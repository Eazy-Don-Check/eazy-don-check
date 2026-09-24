const mongoose = require('mongoose');

const OtpVerificationSchema = new mongoose.Schema(
  {
    purpose: {
      type: String,
      enum: [
        'SIGNUP',
        'PASSWORD_RESET',
      ],
      required: true,
      index: true,
    },

    channel: {
      type: String,
      enum: ['email', 'phone'],
      required: true,
    },

    destination: {
      type: String,
      required: true,
      trim: true,
    },

    // PendingRegistration._id for SIGNUP
    // User._id for PASSWORD_RESET
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    otpHash: {
      type: String,
      required: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    sendCount: {
      type: Number,
      default: 1,
    },

    lastSentAt: {
      type: Date,
      default: Date.now,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically remove expired OTP records.
OtpVerificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports =
  mongoose.models.OtpVerification ||
  mongoose.model(
    'OtpVerification',
    OtpVerificationSchema
  );