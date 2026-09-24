const mongoose = require("mongoose");

const SubscriptionTransactionSchema =
  new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      plan: {
        type: String,
        enum: [
          "free",
          "basic",
          "pro",
          "business",
        ],
        required: true,
      },

      reference: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
      },

      amount: {
        type: Number,
        required: true,
        min: 0,
      },

      currency: {
        type: String,
        default: "NGN",
        uppercase: true,
        trim: true,
      },

      status: {
        type: String,
        enum: [
          "initialized",
          "pending",
          "success",
          "failed",
          "abandoned",
          "ongoing",
          "processing",
          "queued",
          "reversed",
        ],
        default: "initialized",
        index: true,
      },

      provider: {
        type: String,
        enum: ["paystack"],
        default: "paystack",
      },

      providerTransactionId: {
        type: String,
        default: "",
        trim: true,
      },

      accessCode: {
        type: String,
        default: "",
        trim: true,
      },

      authorizationUrl: {
        type: String,
        default: "",
        trim: true,
      },

      customerEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },

      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },

      paystackData: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },

      verifiedAt: {
        type: Date,
        default: null,
      },

      fulfilledAt: {
        type: Date,
        default: null,
      },

      webhookReceivedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "SubscriptionTransaction",
    SubscriptionTransactionSchema
  );