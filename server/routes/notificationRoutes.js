const express = require('express');

const router = express.Router();

const {
  protect
} = require('../middleware/authMiddleware');

const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications
} = require(
  '../controllers/notificationController'
);

// ==========================================
// ALL NOTIFICATION ROUTES REQUIRE LOGIN
// ==========================================

router.use(protect);

// ==========================================
// GET NOTIFICATIONS
// ==========================================

router.get(
  '/',
  getNotifications
);

// ==========================================
// GET UNREAD COUNT
// ==========================================

router.get(
  '/unread-count',
  getUnreadCount
);

// ==========================================
// MARK ALL AS READ
// ==========================================

router.patch(
  '/read-all',
  markAllAsRead
);

// ==========================================
// DELETE ALL READ
// ==========================================

router.delete(
  '/read',
  deleteReadNotifications
);

// ==========================================
// MARK ONE AS READ
// ==========================================

router.patch(
  '/:id/read',
  markAsRead
);

// ==========================================
// DELETE ONE
// ==========================================

router.delete(
  '/:id',
  deleteNotification
);

module.exports = router;