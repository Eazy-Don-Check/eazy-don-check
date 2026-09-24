const express = require('express');

const router = express.Router();

const {
  getAdminStats,

  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
  updateUserQuota,

  getAllVerifications,

  // Feedback
  getFeedbackStats,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
} = require('../controllers/adminController');

const {
  protect,
  restrictTo,
} = require('../middleware/authMiddleware');

// ======================================================
// Protect ALL admin routes
// ======================================================

router.use(protect);

router.use(
  restrictTo('superadmin')
);

// ======================================================
// Dashboard
// ======================================================

router.get(
  '/stats',
  getAdminStats
);

router.get(
  '/metrics',
  getAdminStats
);

// ======================================================
// User Management
// ======================================================

// Get all users
router.get(
  '/users',
  getAllUsers
);

// Get one user
router.get(
  '/users/:id',
  getUserById
);

// Update user profile
router.put(
  '/users/:id',
  updateUser
);

// Delete user
router.delete(
  '/users/:id',
  deleteUser
);

// Suspend / Activate account
router.patch(
  '/users/:id/status',
  updateUserStatus
);

// Increase scan quota
router.patch(
  '/users/:id/quota',
  updateUserQuota
);

// ======================================================
// Verification Logs
// ======================================================

router.get(
  '/verifications',
  getAllVerifications
);

// Alias
router.get(
  '/logs',
  getAllVerifications
);

// ======================================================
// Feedback Management
// ======================================================

// Feedback statistics
router.get(
  '/feedback/stats',
  getFeedbackStats
);

// Get all feedback
router.get(
  '/feedback',
  getAllFeedback
);

// Get single feedback
router.get(
  '/feedback/:id',
  getFeedbackById
);

// Update feedback status / admin note
router.patch(
  '/feedback/:id/status',
  updateFeedbackStatus
);

// Delete feedback
router.delete(
  '/feedback/:id',
  deleteFeedback
);

module.exports = router;