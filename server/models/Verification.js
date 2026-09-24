const mongoose = require("mongoose");

const lineItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      default: "",
      trim: true,
    },

    qty: {
      type: Number,
      default: 1,
      min: 0,
    },

    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const verificationSchema = new mongoose.Schema(
  {
    // ============================================================
    // OWNER
    // ============================================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ============================================================
    // DOCUMENT
    // ============================================================

    documentType: {
      type: String,
      enum: ["receipt", "invoice", "document"],
      default: "receipt",
    },

    fileName: {
      type: String,
      required: true,
      default: "receipt",
    },

    // ============================================================
    // EXTRACTED RECEIPT DATA
    // ============================================================

    extractedData: {
      vendorName: {
        type: String,
        default: "",
        trim: true,
      },

      merchantName: {
        type: String,
        default: "",
        trim: true,
      },

      invoiceNumber: {
        type: String,
        default: "",
        trim: true,
      },

      date: {
        type: String,
        default: "",
        trim: true,
      },

      currency: {
        type: String,
        default: "NGN",
        uppercase: true,
        trim: true,
      },

      category: {
        type: String,
        default: "General",
        trim: true,
      },

      // ==========================================================
      // CALCULATION VALUES
      // ==========================================================

      subtotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      taxAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      discountAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      serviceCharge: {
        type: Number,
        default: 0,
        min: 0,
      },

      /**
       * Total printed/extracted from the original receipt.
       *
       * This is kept separately from calculatedGrandTotal so
       * EAZY DON CHECK can detect discrepancies.
       */
      originalReceiptTotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      /**
       * Subtotal calculated by EAZY DON CHECK from:
       *
       * quantity × unit price
       */
      calculatedSubtotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      /**
       * Final amount calculated by EAZY DON CHECK.
       */
      calculatedGrandTotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      /**
       * Difference between the original printed total and
       * the application's calculated grand total.
       */
      calculationDifference: {
        type: Number,
        default: 0,
      },

      /**
       * Calculation state.
       *
       * verified     = calculated total matches receipt total
       * discrepancy  = calculated total differs
       * incomplete   = insufficient information to calculate
       */
      calculationStatus: {
        type: String,
        enum: [
          "verified",
          "discrepancy",
          "incomplete",
        ],
        default: "incomplete",
      },

      // ==========================================================
      // AI / OCR CONFIDENCE
      // ==========================================================

      confidenceScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      // ==========================================================
      // LINE ITEMS
      // ==========================================================

      lineItems: {
        type: [lineItemSchema],
        default: [],
      },

      // ==========================================================
      // RAW OCR / AI DATA
      // ==========================================================

      rawText: {
        type: String,
        default: "",
      },

      rawJson: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
    },

    // ============================================================
    // VERIFICATION STATUS
    // ============================================================

    status: {
      type: String,
      enum: ["success", "failed", "flagged"],
      default: "success",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

verificationSchema.index({
  userId: 1,
  createdAt: -1,
});

verificationSchema.index({
  documentType: 1,
  createdAt: -1,
});

verificationSchema.index({
  status: 1,
  createdAt: -1,
});

// ============================================================
// MODEL EXPORT
// ============================================================

module.exports =
  mongoose.models.Verification ||
  mongoose.model("Verification", verificationSchema);