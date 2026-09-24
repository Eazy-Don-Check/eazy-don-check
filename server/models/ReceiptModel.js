// models/receiptModel.js
const mongoose = require('mongoose');

const receiptItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Item description is required'],
    trim: true
  },
  qty: {
    type: Number,
    required: [true, 'Item quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  price: {
    type: Number,
    required: [true, 'Item unit price is required'],
    min: [0, 'Price cannot be negative']
  }
}, { _id: false });

const receiptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional if guest scans are allowed, or set to true if authentication is strictly required
  },
  verificationCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true // Indexed for rapid public verification lookups
  },
  vendorName: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'NGN',
    uppercase: true,
    trim: true
  },
  items: [receiptItemSchema],
  status: {
    type: String,
    enum: ['Verified', 'Pending', 'Flagged'],
    default: 'Verified'
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

const Receipt = mongoose.model('Receipt', receiptSchema);

module.exports = Receipt;