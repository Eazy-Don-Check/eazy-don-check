const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('../models/User');
const Message = require('../models/Message');
const Room = require('../models/Room');

const {
  createNotification
} = require('../services/notificationService');

// ============================================================
// JWT CONFIGURATION
// ============================================================

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'fallback_secret_key';

// userId -> Set(socketId)
const onlineUsers = new Map();

// Active one-to-one calls. These are signaling/session states only;
// media itself is peer-to-peer via WebRTC.
const activeCalls = new Map();
const pendingCalls = new Map();
const CALL_RING_TIMEOUT_MS = 30000;

// ============================================================
// AUTHENTICATE SOCKET.IO CONNECTION
// ============================================================

/**
 * Authenticate Socket.IO connections using JWT.
 *
 * The token can come from:
 *
 * 1. socket.handshake.auth.token
 * 2. Authorization header
 * 3. query.token
 */
const authenticateSocket = async (
  socket,
  next
) => {
  try {
    let token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization ||
      socket.handshake.query?.token;

    // ----------------------------------------------------------
    // Validate token existence
    // ----------------------------------------------------------

    if (!token) {
      return next(
        new Error(
          'Authentication error: No token provided'
        )
      );
    }

    // ----------------------------------------------------------
    // Normalize Bearer token
    // ----------------------------------------------------------

    if (
      typeof token === 'string' &&
      token
        .toLowerCase()
        .startsWith('bearer ')
    ) {
      token = token
        .slice(7)
        .trim();
    }

    if (
      typeof token !== 'string' ||
      !token.trim()
    ) {
      return next(
        new Error(
          'Authentication error: Invalid token'
        )
      );
    }

    token = token.trim();

    // ----------------------------------------------------------
    // Verify JWT
    // ----------------------------------------------------------

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    console.log(
      '🔐 Socket JWT verified successfully for user:',
      decoded.id ||
        decoded._id ||
        decoded.userId
    );

    // ----------------------------------------------------------
    // Extract user ID
    // ----------------------------------------------------------

    const userId =
      decoded.id ||
      decoded._id ||
      decoded.userId;

    if (!userId) {
      return next(
        new Error(
          'Authentication error: Invalid token payload'
        )
      );
    }

    // ----------------------------------------------------------
    // Find user
    // ----------------------------------------------------------

    const user =
      await User.findById(userId)
        .select('-password');

    if (!user) {
      return next(
        new Error(
          'Authentication error: User not found'
        )
      );
    }

    // ----------------------------------------------------------
    // Account status
    // ----------------------------------------------------------

    if (
      user.accountStatus ===
        'suspended' ||
      user.accountStatus ===
        'banned'
    ) {
      return next(
        new Error(
          `Authentication error: Account ${user.accountStatus}`
        )
      );
    }

    // ----------------------------------------------------------
    // Attach authenticated user
    // ----------------------------------------------------------

    socket.user = user;

    next();
  } catch (error) {
    console.error(
      '❌ Socket authentication failure:',
      error.name,
      error.message
    );

    /*
     * Keep the public error message simple.
     *
     * The real error is already printed above in the
     * backend console.
     */
    if (
      error.name ===
      'TokenExpiredError'
    ) {
      return next(
        new Error(
          'Authentication error: Token expired'
        )
      );
    }

    if (
      error.name ===
      'JsonWebTokenError'
    ) {
      return next(
        new Error(
          'Authentication error: Invalid token'
        )
      );
    }

    return next(
      new Error(
        'Authentication error: Authentication failed'
      )
    );
  }
};

// ============================================================
// NORMALIZE ATTACHMENTS
// ============================================================

/**
 * Normalize attachments coming from the frontend.
 *
 * Message.js expects:
 *
 * {
 *   url,
 *   file_type,
 *   file_name,
 *   file_size
 * }
 */
const normalizeAttachments = (
  attachments
) => {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .map((attachment) => {
      // --------------------------------------------------------
      // Backward compatibility:
      // frontend may still send plain URL strings.
      // --------------------------------------------------------

      if (
        typeof attachment ===
        'string'
      ) {
        const url =
          attachment.trim();

        if (!url) {
          return null;
        }

        return {
          url,
          file_type: 'image'
        };
      }

      // --------------------------------------------------------
      // Invalid attachment
      // --------------------------------------------------------

      if (
        !attachment ||
        typeof attachment !==
          'object'
      ) {
        return null;
      }

      // --------------------------------------------------------
      // URL
      // --------------------------------------------------------

      const url =
        typeof attachment.url ===
        'string'
          ? attachment.url.trim()
          : '';

      if (!url) {
        return null;
      }

      // --------------------------------------------------------
      // File type
      // --------------------------------------------------------

      const allowedTypes = [
        'image',
        'document',
        'audio',
        'video'
      ];

      const fileType =
        allowedTypes.includes(
          attachment.file_type
        )
          ? attachment.file_type
          : 'image';

      // --------------------------------------------------------
      // Return normalized attachment
      // --------------------------------------------------------

      return {
        url,
        file_type:
          fileType,

        file_name:
          typeof attachment.file_name ===
          'string'
            ? attachment.file_name
            : undefined,

        file_size:
          typeof attachment.file_size ===
          'number'
            ? attachment.file_size
            : undefined
      };
    })
    .filter(Boolean);
};

// ============================================================
// POPULATE MESSAGE
// ============================================================

const populateMessage = async (
  message
) => {
  return Message.findById(
    message._id
  )
    .populate(
      'sender',
      'username avatar role email'
    )
    .populate(
      'recipient',
      'username avatar role email'
    );
};

// ============================================================
// CHECK ROOM MEMBERSHIP
// ============================================================

const userIsRoomMember = (
  room,
  userId
) => {
  if (
    !room ||
    !Array.isArray(room.members)
  ) {
    return false;
  }

  return room.members.some(
    (memberId) =>
      memberId.toString() ===
      userId.toString()
  );
};

// ============================================================
// SUPER ADMIN ACCESS
// ============================================================

const userIsSuperAdmin = (user) => {
  const role = String(user?.role || '').toLowerCase();
  return role === 'superadmin' || role === 'super_admin' || role === 'super-admin';
};

// ============================================================
// CALCULATE USER UNREAD MESSAGE COUNTS
// ============================================================

const getUserUnreadCounts = async (userId) => {
  try {
    const objectUserId =
      new mongoose.Types.ObjectId(userId);

    const targetUser = await User.findById(objectUserId)
      .select('role')
      .lean();

    const superAdmin = userIsSuperAdmin(targetUser);

    const roomFilter = superAdmin
      ? { is_archived: false }
      : { is_archived: false, members: objectUserId };

    const rooms = await Room.find(roomFilter)
      .select('_id name slug type members')
      .lean();

    if (!rooms.length) {
      return {
        totalUnread: 0,
        rooms: []
      };
    }

    const roomIds =
      rooms.map((room) => room._id);

    const unreadResults =
      await Message.aggregate([
        {
          $match: {
            room: {
              $in: roomIds
            },

            is_deleted: false,

            sender: {
              $ne: objectUserId
            },

            'read_by.user': {
              $ne: objectUserId
            }
          }
        },

        {
          $group: {
            _id: '$room',
            unreadCount: {
              $sum: 1
            }
          }
        }
      ]);

    const unreadMap =
      new Map();

    unreadResults.forEach(
      (item) => {
        unreadMap.set(
          item._id.toString(),
          Number(
            item.unreadCount
          ) || 0
        );
      }
    );

    const roomCounts =
      rooms.map((room) => {
        const roomId =
          room._id.toString();

        let recipientId = null;

        if (
          room.type ===
          'direct'
        ) {
          const otherMember =
            (room.members || [])
              .find(
                (memberId) =>
                  memberId.toString() !==
                  objectUserId.toString()
              );

          if (otherMember) {
            recipientId =
              otherMember.toString();
          }
        }

        return {
          roomId,
          roomName:
            room.name ||
            'Room',
          roomSlug:
            room.slug ||
            '',
          roomType:
            room.type,
          recipientId,
          unreadCount:
            unreadMap.get(
              roomId
            ) || 0
        };
      });

    const totalUnread =
      roomCounts.reduce(
        (total, room) =>
          total +
          room.unreadCount,
        0
      );

    return {
      totalUnread,
      rooms:
        roomCounts
    };
  } catch (error) {
    console.error(
      '❌ Error calculating unread counts:',
      error
    );

    return {
      totalUnread: 0,
      rooms: []
    };
  }
};

// ============================================================
// EMIT AUTHORITATIVE UNREAD COUNT
// ============================================================

const emitUnreadCount = async (io, userId, roomId = null) => {
  try {
    const unreadData = await getUserUnreadCounts(userId);
    const roomKey = roomId ? roomId.toString() : null;
    const roomItem = roomKey
      ? unreadData.rooms.find((item) => item.roomId === roomKey)
      : null;

    io.to(`user:${userId}`).emit('unread_message_count', {
      roomId: roomKey,
      recipientId: roomItem?.recipientId || null,
      unreadCount: roomItem?.unreadCount || 0,
      totalUnread: unreadData.totalUnread,
      rooms: unreadData.rooms
    });

    return unreadData;
  } catch (error) {
    console.error('❌ Error emitting unread count:', error);
    return null;
  }
};

// ============================================================
// DISPLAY NAME
// ============================================================

const getUserDisplayName = (
  user
) => {
  return (
    user?.username ||
    user?.name ||
    user?.email ||
    'Someone'
  );
};

// ============================================================
// PERSISTENT NOTIFICATION
// ============================================================

/**
 * Create and emit a persistent notification.
 *
 * createNotification() handles:
 *
 * 1. Saving the notification to MongoDB.
 * 2. Emitting "notification" through Socket.IO.
 */
const sendPersistentNotification =
  async ({
    io,
    recipient,
    sender,
    type,
    title,
    message,
    relatedRoom = null,
    relatedMessage = null,
    metadata = {}
  }) => {
    try {
      return await createNotification({
        io,
        recipient,
        sender,
        type,
        title,
        message,
        relatedRoom,
        relatedMessage,
        metadata
      });
    } catch (error) {
      console.error(
        '❌ PERSISTENT NOTIFICATION ERROR:',
        error
      );

      return null;
    }
  };

// ============================================================
// ONE-TO-ONE CALL HELPERS
// ============================================================

const clearPendingCall = (callId) => {
  const pending = pendingCalls.get(callId);
  if (pending?.timer) clearTimeout(pending.timer);
  pendingCalls.delete(callId);
  return pending;
};

const createMissedCall = async (io, pending, reason = 'no_answer') => {
  if (!pending || pending.missedRecorded) return;

  pending.missedRecorded = true;
  clearPendingCall(pending.callId);

  const callLabel = pending.withVideo ? 'video' : 'voice';

  try {
    io.to(`user:${pending.callerId}`).emit('call_no_answer', {
      callId: pending.callId,
      peerId: pending.targetUserId,
      withVideo: pending.withVideo,
      message: 'No Answer'
    });

    setTimeout(() => {
      io.to(`user:${pending.callerId}`).emit('call_ended', {
        callId: pending.callId,
        reason: 'no_answer'
      });
    }, 1800);

    io.to(`user:${pending.targetUserId}`).emit('call_ended', {
      callId: pending.callId,
      reason: 'missed'
    });

    const missedMessage = await Message.create({
      room: pending.roomId,
      sender: pending.callerId,
      recipient: pending.targetUserId,
      content: `Missed ${callLabel} call from ${pending.callerName}`,
      message_type: 'system',
      read_by: [
        { user: pending.callerId, read_at: new Date() }
      ]
    });

    const fullMessage = await populateMessage(missedMessage._id);
    io.to(`user:${pending.targetUserId}`).emit(
      'receive_direct_message',
      fullMessage
    );

    await sendPersistentNotification({
      io,
      recipient: pending.targetUserId,
      sender: pending.callerId,
      type: 'message',
      title: `Missed ${callLabel} call`,
      message: `${pending.callerName} called you and you did not answer.`,
      relatedRoom: pending.roomId,
      relatedMessage: missedMessage._id,
      metadata: {
        roomId: pending.roomId.toString(),
        messageId: missedMessage._id.toString(),
        callId: pending.callId,
        callType: callLabel,
        reason
      }
    });

    const unreadData = await getUserUnreadCounts(pending.targetUserId);
    const unreadCount = unreadData.rooms.find(
      (item) => item.roomId === pending.roomId.toString()
    )?.unreadCount || 0;

    io.to(`user:${pending.targetUserId}`).emit('unread_message_count', {
      roomId: pending.roomId.toString(),
      unreadCount,
      totalUnread: unreadData.totalUnread,
      rooms: unreadData.rooms
    });
  } catch (error) {
    console.error('❌ Failed to create missed call record:', error);
  } finally {
    if (activeCalls.get(pending.callerId) === pending.callId) {
      activeCalls.delete(pending.callerId);
    }
    if (activeCalls.get(pending.targetUserId) === pending.callId) {
      activeCalls.delete(pending.targetUserId);
    }
  }
};

// ============================================================
// INITIALIZE CHAT SOCKET
// ============================================================

module.exports =
  function initializeChatSocket(
    io
  ) {
    // ----------------------------------------------------------
    // Socket authentication middleware
    // ----------------------------------------------------------

    io.use(
      authenticateSocket
    );

    // ----------------------------------------------------------
    // Connection
    // ----------------------------------------------------------

    io.on(
      'connection',
      async (socket) => {  // <-- FIXED: Added 'async' here
        const userId =
          socket.user._id.toString();

        console.log(
          `⚡ Socket Connected: ${
            socket.user.username ||
            socket.user.email
          } (${socket.id})`
        );

        // ======================================================
        // ONLINE USER TRACKING
        // ======================================================

        if (
          !onlineUsers.has(userId)
        ) {
          onlineUsers.set(
            userId,
            new Set()
          );
        }

        onlineUsers
          .get(userId)
          .add(socket.id);

        // ------------------------------------------------------
        // Persist presence in MongoDB.
        //
        // The in-memory map remains the authoritative source for
        // Socket.IO presence on this server instance, while these
        // fields keep REST/API profile responses in sync.
        // ------------------------------------------------------

        try {
          await User.findByIdAndUpdate(
            userId,
            {
              $set: {
                isOnline: true,
                lastSeen: null
              }
            },
            { new: false }
          );
        } catch (presenceError) {
          console.error(
            '❌ Failed to persist online status:',
            presenceError
          );
        }

        // ------------------------------------------------------
        // Personal room
        // ------------------------------------------------------

        socket.join(
          `user:${userId}`
        );

        // Send the newly connected client the current presence
        // snapshot first. This prevents the client from having to
        // wait for future online/offline events.
        socket.emit(
          'online_users',
          Array.from(onlineUsers.keys())
        );

        // Notify every connected client about this user's status.
        io.emit(
          'user_online_status',
          {
            userId,
            isOnline: true
          }
        );

        // Re-deliver any still-ringing call when the recipient reconnects.
        for (const pending of pendingCalls.values()) {
          if (
            pending.targetUserId === userId &&
            !pending.accepted &&
            !pending.missedRecorded
          ) {
            socket.emit('incoming_call', {
              callId: pending.callId,
              callerId: pending.callerId,
              callerName: pending.callerName,
              withVideo: pending.withVideo
            });
          }
        }

        // ======================================================
        // JOIN ROOM
        // ======================================================

        socket.on(
          'join_room',
          async ({
            roomId
          } = {}) => {
            try {
              if (!roomId) {
                return;
              }

              const room =
                await Room.findById(
                  roomId
                );

              if (
                !room ||
                room.is_archived
              ) {
                return socket.emit(
                  'error_message',
                  {
                    message:
                      'Room does not exist.'
                  }
                );
              }

              const isMember =
                userIsRoomMember(
                  room,
                  userId
                );

              // ------------------------------------------------
              // All non-admin users must explicitly join a room.
              // Super Admin has unrestricted access.
              // ------------------------------------------------

              if (
                !userIsSuperAdmin(socket.user) &&
                !isMember
              ) {
                return socket.emit(
                  'error_message',
                  {
                    message:
                      'You do not have access to this room.'
                  }
                );
              }

              socket.join(
                `room:${roomId}`
              );

              console.log(
                `👤 ${
                  socket.user.username ||
                  socket.user.email
                } joined room:${roomId}`
              );

              socket
                .to(
                  `room:${roomId}`
                )
                .emit(
                  'user_joined_room',
                  {
                    roomId,

                    user: {
                      id: userId,

                      username:
                        socket.user
                          .username,

                      avatar:
                        socket.user
                          .avatar
                    },

                    timestamp:
                      new Date()
                  }
                );
            } catch (error) {
              console.error(
                '❌ Error joining room:',
                error
              );

              socket.emit(
                'error_message',
                {
                  message:
                    'Failed to join room.'
                }
              );
            }
          }
        );

        // ======================================================
        // LEAVE ROOM
        // ======================================================

        socket.on(
          'leave_room',
          ({
            roomId
          } = {}) => {
            if (!roomId) {
              return;
            }

            socket.leave(
              `room:${roomId}`
            );

            socket
              .to(
                `room:${roomId}`
              )
              .emit(
                'user_left_room',
                {
                  roomId,
                  userId,
                  timestamp:
                    new Date()
                }
              );
          }
        );

        // ======================================================
        // ROOM MESSAGE
        // ======================================================

        socket.on(
          'send_room_message',
          async (data) => {
            try {
              const {
                roomId,
                message,
                attachments = []
              } = data || {};

              if (!roomId) {
                return;
              }

              const room =
                await Room.findById(
                  roomId
                );

              if (
                !room ||
                room.is_archived
              ) {
                return socket.emit(
                  'error_message',
                  {
                    message:
                      'Room does not exist.'
                  }
                );
              }

              const isMember =
                userIsRoomMember(
                  room,
                  userId
                );

              if (
                !userIsSuperAdmin(socket.user) &&
                !isMember
              ) {
                return socket.emit(
                  'error_message',
                  {
                    message:
                      'You do not have access to this room.'
                  }
                );
              }

              const sanitizedMessage =
                typeof message ===
                'string'
                  ? message.trim()
                  : '';

              const validAttachments =
                normalizeAttachments(
                  attachments
                );

              if (
                !sanitizedMessage &&
                validAttachments.length ===
                  0
              ) {
                return;
              }

              const messageType =
                validAttachments.length >
                0
                  ? 'media'
                  : 'text';

              let newMessage =
                await Message.create({
                  room: roomId,

                  sender:
                    userId,

                  content:
                    sanitizedMessage,

                  attachments:
                    validAttachments,

                  message_type:
                    messageType,

                  read_by: [
                    {
                      user: userId,

                      read_at:
                        new Date()
                    }
                  ]
                });

              newMessage =
                await populateMessage(
                  newMessage
                );

              // ------------------------------------------------
              // Deliver message
              // ------------------------------------------------

              io.to(
                `room:${roomId}`
              ).emit(
                'receive_room_message',
                newMessage
              );

              // ------------------------------------------------
              // Persistent notifications
              // ------------------------------------------------

              const recipients =
                room.members
                  .map(
                    (memberId) =>
                      memberId.toString()
                  )
                  .filter(
                    (memberId) =>
                      memberId !== userId
                  );

              const senderName =
                getUserDisplayName(
                  newMessage.sender ||
                    socket.user
                );

              for (
                const memberId of
                  recipients
              ) {
                await sendPersistentNotification(
                  {
                    io,

                    recipient:
                      memberId,

                    sender:
                      userId,

                    type:
                      'room_message',

                    title:
                      `New message in ${
                        room.name ||
                        'room'
                      }`,

                    message:
                      `${senderName} posted a new message`,

                    relatedRoom:
                      roomId,

                    relatedMessage:
                      newMessage._id,

                    metadata: {
                      roomId:
                        roomId.toString(),

                      messageId:
                        newMessage._id.toString(),

                      roomName:
                        room.name ||
                        'Room'
                    }
                  }
                );
              }
            } catch (error) {
              console.error(
                '❌ Error sending room message:',
                error
              );

              socket.emit(
                'error_message',
                {
                  message:
                    'Failed to send room message.'
                }
              );
            }
          }
        );

        // ======================================================
        // DIRECT MESSAGE
        // ======================================================

        socket.on(
          'send_direct_message',
          async (data) => {
            try {
              const {
                roomId,
                recipientId,
                message,
                attachments = []
              } = data || {};

              const sanitizedMessage =
                typeof message ===
                'string'
                  ? message.trim()
                  : '';

              const validAttachments =
                normalizeAttachments(
                  attachments
                );

              if (
                (!roomId &&
                  !recipientId) ||
                (
                  !sanitizedMessage &&
                  validAttachments.length ===
                    0
                )
              ) {
                return;
              }

              let activeRoom =
                null;

              // ------------------------------------------------
              // Existing room
              // ------------------------------------------------

              if (roomId) {
                activeRoom =
                  await Room.findById(
                    roomId
                  );
              }

              // ------------------------------------------------
              // Find/create DM room
              // ------------------------------------------------

              if (
                !activeRoom &&
                recipientId
              ) {
                activeRoom =
                  await Room.findOne(
                    {
                      type: 'direct',

                      members: {
                        $all: [
                          userId,
                          recipientId
                        ]
                      }
                    }
                  );

                if (!activeRoom) {
                  const sortedIds =
                    [
                      userId,
                      recipientId
                    ].sort();

                  const slug =
                    `dm-${sortedIds.join(
                      '-'
                    )}`;

                  activeRoom =
                    await Room.create({
                      name:
                        'Direct Message',

                      slug,

                      type:
                        'direct',

                      members: [
                        userId,
                        recipientId
                      ],

                      created_by:
                        userId
                    });
                }
              }

              // ------------------------------------------------
              // Room creation failure
              // ------------------------------------------------

              if (!activeRoom) {
                return socket.emit(
                  'error_message',
                  {
                    message:
                      'Unable to initialize conversation.'
                  }
                );
              }

              // ------------------------------------------------
              // Sender membership
              // ------------------------------------------------

              if (
                !userIsRoomMember(
                  activeRoom,
                  userId
                )
              ) {
                return socket.emit(
                  'error_message',
                  {
                    message:
                      'You are not a member of this conversation.'
                  }
                );
              }

              // ------------------------------------------------
              // Recipient membership
              // ------------------------------------------------

              if (
                recipientId &&
                !userIsRoomMember(
                  activeRoom,
                  recipientId
                )
              ) {
                return socket.emit(
                  'error_message',
                  {
                    message:
                      'Recipient is not a member of this conversation.'
                  }
                );
              }

              const messageType =
                validAttachments.length >
                0
                  ? 'media'
                  : 'text';

              let dmMessage =
                await Message.create({
                  room:
                    activeRoom._id,

                  sender:
                    userId,

                  recipient:
                    recipientId ||
                    null,

                  content:
                    sanitizedMessage,

                  attachments:
                    validAttachments,

                  message_type:
                    messageType,

                  read_by: [
                    {
                      user: userId,

                      read_at:
                        new Date()
                    }
                  ]
                });

              dmMessage =
                await populateMessage(
                  dmMessage
                );

              // ------------------------------------------------
              // Deliver to recipient
              // ------------------------------------------------

              if (recipientId) {
                io.to(
                  `user:${recipientId}`
                ).emit(
                  'receive_direct_message',
                  dmMessage
                );

                // ------------------------------------------------
                // Persistent notification
                // ------------------------------------------------

                const senderName =
                  getUserDisplayName(
                    dmMessage.sender ||
                      socket.user
                  );

                await sendPersistentNotification(
                  {
                    io,

                    recipient:
                      recipientId,

                    sender:
                      userId,

                    type:
                      'message',

                    title:
                      'New message',

                    message:
                      `${senderName} sent you a message`,

                    relatedRoom:
                      activeRoom._id,

                    relatedMessage:
                      dmMessage._id,

                    metadata: {
                      roomId:
                        activeRoom._id.toString(),

                      messageId:
                        dmMessage._id.toString(),

                      senderId:
                        userId.toString(),

                      senderName
                    }
                  }
                );
              }

              // ------------------------------------------------
              // Update recipient unread message count
              // ------------------------------------------------

              if (recipientId) {
                const unreadData =
                  await getUserUnreadCounts(
                    recipientId
                  );

                io.to(
                  `user:${recipientId}`
                ).emit(
                  'unread_message_count',
                  {
                    roomId:
                      activeRoom._id.toString(),

                    unreadCount:
                      unreadData.rooms.find(
                        (roomItem) =>
                          roomItem.roomId ===
                          activeRoom._id.toString()
                      )?.unreadCount || 0,

                    totalUnread:
                      unreadData.totalUnread,

                    rooms:
                      unreadData.rooms
                  }
                );
              }

              // ------------------------------------------------
              // Confirm to sender
              // ------------------------------------------------

              socket.emit(
                'direct_message_sent',
                dmMessage
              );
            } catch (error) {
              console.error(
                '❌ Error sending direct message:',
                error
              );

              socket.emit(
                'error_message',
                {
                  message:
                    'Failed to send direct message.'
                }
              );
            }
          }
        );

        // ======================================================
        // MARK MESSAGES READ
        // ======================================================

        socket.on(
          'mark_messages_read',
          async ({
            roomId
          } = {}) => {
            try {
              if (!roomId) {
                return;
              }

              const room =
                await Room.findById(
                  roomId
                );

              if (!room) {
                return;
              }

              if (
                !userIsSuperAdmin(socket.user) &&
                !userIsRoomMember(
                  room,
                  userId
                )
              ) {
                return;
              }

              // --------------------------------------------------------
              // Find unread incoming messages
              // --------------------------------------------------------

              const unreadMessages =
                await Message.find({
                  room: roomId,

                  'read_by.user': {
                    $ne: userId
                  },

                  sender: {
                    $ne: userId
                  },

                  is_deleted: false
                }).select('_id');

              // --------------------------------------------------------
              // Mark messages as read
              // --------------------------------------------------------

              if (
                unreadMessages.length >
                0
              ) {
                await Message.updateMany(
                  {
                    _id: {
                      $in:
                        unreadMessages.map(
                          (message) =>
                            message._id
                        )
                    }
                  },
                  {
                    $push: {
                      read_by: {
                        user:
                          userId,

                        read_at:
                          new Date()
                      }
                    }
                  }
                );
              }

              // --------------------------------------------------------
              // Recalculate authoritative unread counts
              // --------------------------------------------------------

              const unreadData =
                await getUserUnreadCounts(
                  userId
                );

              // --------------------------------------------------------
              // Send updated count to the user who opened the room
              // --------------------------------------------------------

              socket.emit(
                'unread_message_count',
                {
                  roomId:
                    roomId.toString(),

                  unreadCount: 0,

                  totalUnread:
                    unreadData.totalUnread,

                  rooms:
                    unreadData.rooms
                }
              );

              // --------------------------------------------------------
              // Tell other sockets/users in this room that messages
              // were read.
              // --------------------------------------------------------

              socket
                .to(`room:${roomId}`)
                .emit(
                  'messages_read_update',
                  {
                    roomId:
                      roomId.toString(),

                    readByUserId:
                      userId,

                    unreadCount: 0
                  }
                );

            } catch (error) {
              console.error(
                '❌ Error marking messages read:',
                error
              );
            }
          }
        );


        // ======================================================
        // TYPING START
        // ======================================================

        socket.on(
          'typing_start',
          ({
            roomId,
            recipientId
          } = {}) => {
            const payload = {
              userId,

              username:
                socket.user
                  .username ||
                socket.user
                  .email,

              isTyping:
                true
            };

            if (roomId) {
              socket
                .to(
                  `room:${roomId}`
                )
                .emit(
                  'user_typing',
                  {
                    ...payload,
                    roomId
                  }
                );

              return;
            }

            if (recipientId) {
              io.to(
                `user:${recipientId}`
              ).emit(
                'user_typing',
                {
                  ...payload,

                  recipientId
                }
              );
            }
          }
        );

        // ======================================================
        // TYPING STOP
        // ======================================================

        socket.on(
          'typing_stop',
          ({
            roomId,
            recipientId
          } = {}) => {
            const payload = {
              userId,

              username:
                socket.user
                  .username ||
                socket.user
                  .email,

              isTyping:
                false
            };

            if (roomId) {
              socket
                .to(
                  `room:${roomId}`
                )
                .emit(
                  'user_typing',
                  {
                    ...payload,
                    roomId
                  }
                );

              return;
            }

            if (recipientId) {
              io.to(
                `user:${recipientId}`
              ).emit(
                'user_typing',
                {
                  ...payload,

                  recipientId
                }
              );
            }
          }
        );

        // ======================================================
        // ONE-TO-ONE VOICE / VIDEO CALL SIGNALING
        // ======================================================

        socket.on('call_user', async ({ targetUserId, callId, withVideo } = {}) => {
          try {
            if (!targetUserId || !callId || targetUserId.toString() === userId) return;

            const targetId = targetUserId.toString();
            const room = await Room.findOne({
              type: 'direct',
              members: { $all: [userId, targetId] }
            });

            if (!room) {
              return socket.emit('call_error', {
                message: 'Direct conversation not found.'
              });
            }

            if (activeCalls.has(userId) || activeCalls.has(targetId)) {
              return socket.emit('call_rejected', {
                callId,
                reason: 'busy'
              });
            }

            const pending = {
              callId: String(callId),
              callerId: userId,
              targetUserId: targetId,
              roomId: room._id,
              callerName: getUserDisplayName(socket.user),
              withVideo: Boolean(withVideo),
              accepted: false,
              missedRecorded: false,
              timer: null
            };

            activeCalls.set(userId, pending.callId);
            activeCalls.set(targetId, pending.callId);
            pending.timer = setTimeout(
              () => createMissedCall(io, pending, 'timeout'),
              CALL_RING_TIMEOUT_MS
            );
            pendingCalls.set(pending.callId, pending);

            if (onlineUsers.has(targetId)) {
              io.to(`user:${targetId}`).emit('incoming_call', {
                callId: pending.callId,
                callerId: userId,
                callerName: pending.callerName,
                withVideo: pending.withVideo
              });
            }
          } catch (error) {
            console.error('❌ Call initiation error:', error);
            socket.emit('call_error', {
              message: 'Unable to start call.'
            });
          }
        });

        socket.on('accept_call', ({ targetUserId, callId, withVideo } = {}) => {
          if (!targetUserId || !callId) return;
          const pending = pendingCalls.get(String(callId));
          if (!pending || pending.targetUserId !== userId) return;

          pending.accepted = true;
          if (pending.timer) {
            clearTimeout(pending.timer);
            pending.timer = null;
          }

          // Keep the call session in pendingCalls after acceptance.
          // WebRTC offer/answer/ICE signaling still needs this session
          // record until either side explicitly ends the call.
          io.to(`user:${pending.callerId}`).emit('call_accepted', {
            callId: pending.callId,
            peerId: userId,
            withVideo: Boolean(withVideo ?? pending.withVideo)
          });
        });

        socket.on('reject_call', ({ targetUserId, callId, reason = 'declined' } = {}) => {
          if (!targetUserId || !callId) return;
          const pending = pendingCalls.get(String(callId));
          if (!pending || pending.targetUserId !== userId) return;

          clearPendingCall(String(callId));
          io.to(`user:${pending.callerId}`).emit('call_rejected', {
            callId: pending.callId,
            reason
          });

          if (activeCalls.get(pending.callerId) === pending.callId) activeCalls.delete(pending.callerId);
          if (activeCalls.get(pending.targetUserId) === pending.callId) activeCalls.delete(pending.targetUserId);
        });

        socket.on('webrtc_offer', ({ targetUserId, callId, offer, withVideo } = {}) => {
          if (!targetUserId || !callId || !offer) return;
          const pending = pendingCalls.get(String(callId));
          if (!pending || pending.accepted === false) return;
          if (pending.callerId !== userId || pending.targetUserId !== targetUserId.toString()) return;

          io.to(`user:${targetUserId}`).emit('webrtc_offer', {
            callId: pending.callId,
            callerId: userId,
            offer,
            withVideo: Boolean(withVideo)
          });
        });

        socket.on('webrtc_answer', ({ targetUserId, callId, answer } = {}) => {
          if (!targetUserId || !callId || !answer) return;
          const pending = pendingCalls.get(String(callId));
          if (!pending || pending.targetUserId !== userId) return;
          if (pending.callerId !== targetUserId.toString()) return;

          io.to(`user:${targetUserId}`).emit('webrtc_answer', {
            callId: pending.callId,
            answer,
            peerId: userId
          });
        });

        socket.on('ice_candidate', ({ targetUserId, callId, candidate } = {}) => {
          if (!targetUserId || !callId || !candidate) return;
          const pending = pendingCalls.get(String(callId));
          if (!pending || !pending.accepted) return;
          if (![pending.callerId, pending.targetUserId].includes(userId)) return;
          if (![pending.callerId, pending.targetUserId].includes(targetUserId.toString())) return;

          io.to(`user:${targetUserId}`).emit('ice_candidate', {
            callId: pending.callId,
            candidate,
            peerId: userId
          });
        });

        socket.on('end_call', ({ targetUserId, callId } = {}) => {
          if (!targetUserId || !callId) return;
          const pending = pendingCalls.get(String(callId));
          if (!pending) return;
          if (![pending.callerId, pending.targetUserId].includes(userId)) return;

          clearPendingCall(String(callId));
          io.to(`user:${targetUserId}`).emit('call_ended', {
            callId: pending.callId,
            peerId: userId,
            reason: pending.accepted ? 'ended' : 'cancelled'
          });

          if (activeCalls.get(pending.callerId) === pending.callId) activeCalls.delete(pending.callerId);
          if (activeCalls.get(pending.targetUserId) === pending.callId) activeCalls.delete(pending.targetUserId);
        });

        // ========================================================
        // MESSAGE REACTIONS
        // ========================================================
        socket.on('toggle_message_reaction', async ({ messageId, emoji } = {}) => {
          try {
            if (!messageId || typeof emoji !== 'string') return;
            const allowedEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥'];
            if (!allowedEmojis.includes(emoji)) return socket.emit('error_message', { message: 'Unsupported reaction.' });
            if (!mongoose.Types.ObjectId.isValid(messageId)) return;

            const message = await Message.findById(messageId);
            if (!message || message.is_deleted) return socket.emit('error_message', { message: 'Message not found.' });
            const room = await Room.findById(message.room);
            if (!(userIsSuperAdmin(socket.user) || userIsRoomMember(room, userId))) return socket.emit('error_message', { message: 'You do not have access to this message.' });

            // One reaction per user per message. Clicking the currently selected
            // reaction removes it; selecting another reaction replaces the old one.
            let currentReaction = null;
            for (const item of message.reactions) {
              if (item.users.some((id) => id.toString() === userId)) {
                currentReaction = item.emoji;
                item.users = item.users.filter((id) => id.toString() !== userId);
              }
            }

            message.reactions = message.reactions.filter((item) => item.users.length);

            if (currentReaction !== emoji) {
              const targetReaction = message.reactions.find((item) => item.emoji === emoji);
              if (targetReaction) targetReaction.users.push(userId);
              else message.reactions.push({ emoji, users: [userId] });
            }

            await message.save();
            const fullMessage = await populateMessage(message._id);
            const payload = { ...fullMessage, reactions: fullMessage.reactions || [] };

            if (room.type === 'public' || room.type === 'private') {
              io.to(`room:${room._id}`).emit('message_reaction_updated', payload);
              io.to(`user:${userId}`).emit('message_reaction_updated', payload);
            } else {
              room.members.forEach((memberId) => io.to(`user:${memberId}`).emit('message_reaction_updated', payload));
            }
          } catch (error) {
            console.error('❌ Error toggling message reaction:', error);
            socket.emit('error_message', { message: 'Failed to update reaction.' });
          }
        });

        // ========================================================
        // EDIT / DELETE MESSAGES
        // ========================================================
        socket.on('edit_message', async ({ messageId, content } = {}) => {
          try {
            if (!messageId || typeof content !== 'string') return;
            if (!mongoose.Types.ObjectId.isValid(messageId)) return;

            const nextContent = content.trim();
            if (!nextContent) return socket.emit('error_message', { message: 'Edited message cannot be empty.' });

            const message = await Message.findById(messageId);
            if (!message || message.is_deleted) return socket.emit('error_message', { message: 'Message not found.' });
            if (message.sender.toString() !== userId) return socket.emit('error_message', { message: 'Only the sender can edit this message.' });
            if (message.message_type === 'system') return socket.emit('error_message', { message: 'System messages cannot be edited.' });

            const room = await Room.findById(message.room);
            if (!(userIsSuperAdmin(socket.user) || userIsRoomMember(room, userId))) return socket.emit('error_message', { message: 'You do not have access to this message.' });

            message.content = nextContent;
            message.is_edited = true;
            await message.save();

            const fullMessage = await populateMessage(message._id);
            const payload = { ...fullMessage, edited: true };

            if (room.type === 'direct') {
              room.members.forEach((memberId) => io.to(`user:${memberId}`).emit('message_updated', payload));
            } else {
              io.to(`room:${room._id}`).emit('message_updated', payload);
              io.to(`user:${userId}`).emit('message_updated', payload);
            }
          } catch (error) {
            console.error('❌ Error editing message:', error);
            socket.emit('error_message', { message: 'Failed to edit message.' });
          }
        });

        socket.on('delete_message', async ({ messageId } = {}) => {
          try {
            if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) return;

            const message = await Message.findById(messageId);
            if (!message) return socket.emit('error_message', { message: 'Message not found.' });
            const room = await Room.findById(message.room);
            if (!(userIsSuperAdmin(socket.user) || userIsRoomMember(room, userId))) return socket.emit('error_message', { message: 'You do not have access to this message.' });

            const isSender = message.sender.toString() === userId;

            if (isSender) {
              // Sender deletion removes the message for everyone.
              message.is_deleted = true;
              message.content = '';
              message.attachments = [];
              message.reactions = [];
              await message.save();

              const payload = {
                messageId: message._id.toString(),
                roomId: room._id.toString(),
                deletedForEveryone: true
              };

              if (room.type === 'direct') {
                room.members.forEach((memberId) => io.to(`user:${memberId}`).emit('message_deleted', payload));
                for (const memberId of room.members) await emitUnreadCount(io, memberId, room._id);
              } else {
                io.to(`room:${room._id}`).emit('message_deleted', payload);
                io.to(`user:${userId}`).emit('message_deleted', payload);
                if (room.type === 'public') {
                  for (const [memberId] of onlineUsers) await emitUnreadCount(io, memberId, room._id);
                } else {
                  for (const memberId of room.members) await emitUnreadCount(io, memberId, room._id);
                }
              }
              return;
            }

            // Recipient/member deletion only hides the message for that user.
            const alreadyHidden = message.deleted_for.some((id) => id.toString() === userId);
            if (!alreadyHidden) message.deleted_for.push(userId);
            await message.save();

            io.to(`user:${userId}`).emit('message_deleted', {
              messageId: message._id.toString(),
              roomId: room._id.toString(),
              deletedForEveryone: false,
              deletedForUserId: userId
            });
            await emitUnreadCount(io, userId, room._id);
          } catch (error) {
            console.error('❌ Error deleting message:', error);
            socket.emit('error_message', { message: 'Failed to delete message.' });
          }
        });



        // ======================================================
        // DISCONNECT
        // ======================================================

        socket.on(
          'disconnect',
          async (reason) => {
            console.log(
              `🔌 Socket Disconnected: ${socket.id} (${reason})`
            );

            const callId = activeCalls.get(userId);
            if (callId) {
              const pending = pendingCalls.get(callId);
              if (pending && !pending.accepted) {
                if (pending.callerId === userId) {
                  await createMissedCall(io, pending, 'caller_offline');
                } else {
                  io.to(`user:${pending.callerId}`).emit('call_waiting', {
                    callId: pending.callId,
                    reason: 'recipient_offline'
                  });
                }
              }
              activeCalls.delete(userId);
            }

            const userSockets =
              onlineUsers.get(
                userId
              );

            if (!userSockets) {
              return;
            }

            userSockets.delete(
              socket.id
            );

            if (
              userSockets.size ===
              0
            ) {
              onlineUsers.delete(
                userId
              );

              // Only mark the user offline after their LAST
              // Socket.IO connection has disconnected. This keeps
              // presence correct when the user has multiple tabs
              // or devices open.
              try {
                await User.findByIdAndUpdate(
                  userId,
                  {
                    $set: {
                      isOnline: false,
                      lastSeen: new Date()
                    }
                  },
                  { new: false }
                );
              } catch (presenceError) {
                console.error(
                  '❌ Failed to persist offline status:',
                  presenceError
                );
              }

              io.emit(
                'user_online_status',
                {
                  userId,

                  isOnline:
                    false
                }
              );
            }
          }
        );
      }
    );
  };