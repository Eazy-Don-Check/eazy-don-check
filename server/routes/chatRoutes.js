const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

const {
  getRooms,
  getUnreadMessageCounts,
  markRoomMessagesRead,
  getRoomBySlug,
  createRoom,
  getRoomMessages,
  getOrCreateDirectMessageRoom,
  getDirectMessages,
  joinRoom,
  leaveRoom
} = require('../controllers/chatController');

router.use(protect);

// =========================================================
// UNREAD STATE
// =========================================================
router.get('/unread-counts', getUnreadMessageCounts);

// =========================================================
// ROOM DIRECTORY
// =========================================================
router.get('/rooms', getRooms);
router.get('/rooms/slug/:slug', getRoomBySlug);
router.post('/rooms', createRoom);

// =========================================================
// ROOM MEMBERSHIP
// =========================================================
router.post('/rooms/:roomId/join', joinRoom);
router.post('/rooms/:roomId/leave', leaveRoom);

// =========================================================
// ROOM MESSAGE HISTORY / READ STATE
//
// GET /rooms/:roomId/messages automatically returns a window
// around the user's last-read boundary when no aroundMessageId
// is supplied. The frontend can also explicitly request an anchor.
// PATCH /rooms/:roomId/read accepts { throughMessageId } so only
// messages up to the visible boundary are marked as read.
// =========================================================
router.patch('/rooms/:roomId/read', markRoomMessagesRead);
router.get('/rooms/:roomId/messages', getRoomMessages);

// =========================================================
// DIRECT MESSAGES
// =========================================================
// Direct conversations are stored as rooms, so the same read
// endpoint can safely mark a direct room by roomId. The history
// endpoint also supports aroundMessageId and returns readState.
router.post('/direct/:recipientId', getOrCreateDirectMessageRoom);
router.get('/direct/:recipientId', getDirectMessages);

module.exports = router;