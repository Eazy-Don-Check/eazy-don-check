const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    qty: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
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
    // INVOICE IDENTIFICATION
    // ============================================================

    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "sent",
        "paid",
        "partially_paid",
        "overdue",
        "cancelled",
      ],
      default: "draft",
      index: true,
    },

    // ============================================================
    // BUSINESS / SELLER
    // ============================================================

    business: {
      name: {
        type: String,
        default: "",
        trim: true,
      },

      logoUrl: {
        type: String,
        default: "",
        trim: true,
      },

      address: {
        type: String,
        default: "",
        trim: true,
      },

      phone: {
        type: String,
        default: "",
        trim: true,
      },

      email: {
        type: String,
        default: "",
        trim: true,
      },

      website: {
        type: String,
        default: "",
        trim: true,
      },

      taxNumber: {
        type: String,
        default: "",
        trim: true,
      },
    },

    // ============================================================
    // CUSTOMER
    // ============================================================

    customer: {
      name: {
        type: String,
        default: "",
        trim: true,
      },

      companyName: {
        type: String,
        default: "",
        trim: true,
      },

      address: {
        type: String,
        default: "",
        trim: true,
      },

      phone: {
        type: String,
        default: "",
        trim: true,
      },

      email: {
        type: String,
        default: "",
        trim: true,
      },

      taxNumber: {
        type: String,
        default: "",
        trim: true,
      },
    },

    // ============================================================
    // INVOICE DATES
    // ============================================================

    invoiceDate: {
      type: String,
      default: "",
      trim: true,
    },

    dueDate: {
      type: String,
      default: "",
      trim: true,
    },

    // ============================================================
    // PAYMENT / CURRENCY
    // ============================================================

    currency: {
      type: String,
      default: "NGN",
      uppercase: true,
      trim: true,
    },

    paymentTerms: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    paymentDetails: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    // ============================================================
    // ITEMS
    // ============================================================

    items: {
      type: [invoiceItemSchema],
      default: [],
    },

    // ============================================================
    // CALCULATIONS
    // ============================================================

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    serviceCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    grandTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    balanceDue: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ============================================================
    // NOTES / TERMS
    // ============================================================

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
    },

    termsAndConditions: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },

    // ============================================================
    // DESIGN
    // ============================================================

    template: {
      type: String,
      enum: [
        "professional",
        "modern",
        "classic",
        "minimal",
      ],
      default: "professional",
    },

    // ============================================================
    // METADATA
    // ============================================================

    lastExportedAt: {
      type: Date,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

invoiceSchema.index({
  userId: 1,
  createdAt: -1,
});

invoiceSchema.index({
  userId: 1,
  invoiceNumber: 1,
});

invoiceSchema.index({
  userId: 1,
  status: 1,
});

// ============================================================
// UNIQUE INVOICE NUMBER PER USER
// ============================================================

invoiceSchema.index(
  {
    userId: 1,
    invoiceNumber: 1,
  },
  {
    unique: true,
  }
);

// ============================================================
// MODEL EXPORT
// ============================================================

module.exports =
  mongoose.models.Invoice ||
  mongoose.model("Invoice", invoiceSchema);