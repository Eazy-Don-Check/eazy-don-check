// controllers/receiptController.js

// TODO: Import your Receipt model when ready
// const Receipt = require('../models/ReceiptModel');

/**
 * @desc    Process and save a scanned receipt (AI itemization & storage)
 * @route   POST /api/receipts/scan
 * @access  Private
 */
const scanReceipt = async (req, res) => {
  try {
    const { items, totalAmount, currency, vendorName } = req.body;
    // const userId = req.user ? req.user.id : null; // From auth middleware

    // Generate a unique verification code for auditing
    const uniqueVerificationCode = 'RCP-' + Math.random().toString(36).substring(2, 9).toUpperCase();

    const newReceiptData = {
      // userId,
      verificationCode: uniqueVerificationCode,
      vendorName: vendorName || 'EAZY DON GRAPHIX AND PRINTS',
      totalAmount: totalAmount || 0,
      currency: currency || 'NGN',
      items: items || [],
      status: 'Verified',
      createdAt: new Date()
    };

    // TODO: Save to database
    // const savedReceipt = await Receipt.create(newReceiptData);

    return res.status(201).json({
      success: true,
      message: 'Receipt successfully scanned, itemized, and verified.',
      data: newReceiptData
    });
  } catch (error) {
    console.error('Controller Error - scanReceipt:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while processing receipt scan.'
    });
  }
};

/**
 * @desc    Public lookup to check receipt authenticity via unique code
 * @route   GET /api/receipts/verify/:code
 * @access  Public
 */
const verifyReceipt = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code || code.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required.'
      });
    }

    // TODO: Query database
    // const receipt = await Receipt.findOne({ verificationCode: code.toUpperCase() });
    // if (!receipt) { return res.status(404).json({ success: false, message: 'Receipt not found or invalid code.' }); }

    // Mock response for demonstration/lookup testing
    const mockReceiptResult = {
      verificationCode: code.toUpperCase(),
      vendorName: 'EAZY DON GRAPHIX AND PRINTS',
      totalAmount: 15500,
      currency: 'NGN',
      status: 'Authentic & Verified',
      items: [
        { description: 'Large Format Flex Banner', qty: 2, price: 5000 },
        { description: 'Branded T-Shirts & Custom Print', qty: 3, price: 1833 }
      ],
      verifiedAt: new Date()
    };

    return res.status(200).json({
      success: true,
      message: 'Receipt record verified successfully.',
      data: mockReceiptResult
    });
  } catch (error) {
    console.error('Controller Error - verifyReceipt:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during receipt verification lookup.'
    });
  }
};

/**
 * @desc    Get all receipts belonging to the authenticated user
 * @route   GET /api/receipts/history
 * @access  Private
 */
const getReceiptHistory = async (req, res) => {
  try {
    // TODO: Fetch from DB using authenticated user ID -> req.user.id
    const userReceipts = [
      {
        id: '1',
        verificationCode: 'RCP-A9F2K1',
        vendorName: 'EAZY DON HOST',
        totalAmount: 5000,
        currency: 'NGN',
        status: 'Verified',
        createdAt: new Date()
      }
    ];

    return res.status(200).json({
      success: true,
      count: userReceipts.length,
      data: userReceipts
    });
  } catch (error) {
    console.error('Controller Error - getReceiptHistory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve receipt history.'
    });
  }
};

module.exports = {
  scanReceipt,
  verifyReceipt,
  getReceiptHistory
};