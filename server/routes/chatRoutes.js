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
  getDirectConversations,
  joinRoom,
  leaveRoom
} = require('../controllers/chatController');

router.use(protect);

/*
 * ============================================================
 * UNREAD COUNTS
 * ============================================================
 */
router.get(
  '/unread-counts',
  getUnreadMessageCounts
);

/*
 * ============================================================
 * GENERAL CHAT ROOMS
 * ============================================================
 */
router.get(
  '/rooms',
  getRooms
);

router.get(
  '/rooms/slug/:slug',
  getRoomBySlug
);

router.post(
  '/rooms',
  createRoom
);

router.post(
  '/rooms/:roomId/join',
  joinRoom
);

router.post(
  '/rooms/:roomId/leave',
  leaveRoom
);

router.patch(
  '/rooms/:roomId/read',
  markRoomMessagesRead
);

router.get(
  '/rooms/:roomId/messages',
  getRoomMessages
);

/*
 * ============================================================
 * DIRECT MESSAGES
 * ============================================================
 *
 * IMPORTANT:
 * /direct/conversations MUST appear before
 * /direct/:recipientId so Express does not interpret
 * "conversations" as a recipient ID.
 */

/*
 * Persistent DM list.
 *
 * Returns ONLY users with whom the current user has
 * an existing direct conversation.
 */
router.get(
  '/direct/conversations',
  getDirectConversations
);

/*
 * Create/find a persistent DM room.
 */
router.post(
  '/direct/:recipientId',
  getOrCreateDirectMessageRoom
);

/*
 * Get conversation history with a specific user.
 */
router.get(
  '/direct/:recipientId',
  getDirectMessages
);

module.exports = router;