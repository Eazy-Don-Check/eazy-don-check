const express = require('express');

const router = express.Router();

const {
  protect,
} = require('../middleware/authMiddleware');

const {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} = require('../controllers/friendController');


// ============================================================
// ALL FRIEND ROUTES REQUIRE AUTHENTICATION
// ============================================================

router.use(protect);


// ============================================================
// FRIENDS
// ============================================================

router.get(
  '/',
  getFriends
);


// ============================================================
// RECEIVED REQUESTS
// ============================================================

router.get(
  '/requests',
  getFriendRequests
);


// ============================================================
// SEND REQUEST
// ============================================================

router.post(
  '/request/:userId',
  sendFriendRequest
);


// ============================================================
// ACCEPT REQUEST
// ============================================================

router.put(
  '/request/:requestId/accept',
  acceptFriendRequest
);


// ============================================================
// REJECT REQUEST
// ============================================================

router.put(
  '/request/:requestId/reject',
  rejectFriendRequest
);


// ============================================================
// REMOVE FRIEND
// ============================================================

router.delete(
  '/:userId',
  removeFriend
);


module.exports = router;