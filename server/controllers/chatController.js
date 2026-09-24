const mongoose = require('mongoose');
const Room = require('../models/Room');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * Normalize pagination values.
 */
const getPagination = (req) => {
  let page = parseInt(req.query.page, 10) || 1;
  let limit = parseInt(req.query.limit, 10) || 30;

  page = Math.max(page, 1);
  limit = Math.min(Math.max(limit, 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
};

/**
 * Validate MongoDB ObjectId.
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Build a safe room slug.
 */
const createSlug = (name) => {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 45);
};

/**
 * Check whether the current user is Super Admin.
 */
const isSuperAdmin = (user) => {
  const role = String(user?.role || '').toLowerCase();

  return (
    role === 'superadmin' ||
    role === 'super_admin' ||
    role === 'super-admin'
  );
};

/**
 * Check explicit room membership.
 */
const isRoomMember = (room, userId) => {
  if (!room || !Array.isArray(room.members)) {
    return false;
  }

  const targetId = String(userId);

  return room.members.some(
    (member) => String(member?._id || member) === targetId
  );
};

/**
 * Populate a room consistently for frontend use.
 */
const populateRoom = async (roomId, userId) => {
  const room = await Room.findById(roomId)
    .populate('created_by', 'username avatar role')
    .populate(
      'members',
      'username avatar role accountStatus isOnline lastSeen'
    )
    .lean();

  if (!room) {
    return null;
  }

  return {
    ...room,
    memberCount: Array.isArray(room.members)
      ? room.members.length
      : 0,
    isJoined: isRoomMember(room, userId)
  };
};

/**
 * Get rooms the current user has actually joined.
 */
const getJoinedRoomsForUser = async (
  userId,
  superAdmin = false
) => {
  const filter = {
    is_archived: false
  };

  if (!superAdmin) {
    filter.members = userId;
  }

  return Room.find(filter)
    .select('_id name slug type members')
    .lean();
};

/**
 * Get unread message counts for a user.
 */
const getUnreadCountDataForUser = async (
  userId,
  superAdmin = false
) => {
  if (!isValidObjectId(userId)) {
    return {
      totalUnread: 0,
      rooms: []
    };
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const rooms = await getJoinedRoomsForUser(
    userObjectId,
    superAdmin
  );

  if (!rooms.length) {
    return {
      totalUnread: 0,
      rooms: []
    };
  }

  const roomIds = rooms.map((room) => room._id);

  const unreadFilter = {
    room: { $in: roomIds },
    is_deleted: false,
    sender: { $ne: userObjectId },
    'read_by.user': { $ne: userObjectId },
    deleted_for: { $ne: userObjectId }
  };

  const unreadCounts = await Message.aggregate([
    {
      $match: unreadFilter
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

  const countMap = new Map(
    unreadCounts.map((item) => [
      item._id.toString(),
      Number(item.unreadCount) || 0
    ])
  );

  const resultRooms = rooms
    .map((room) => {
      const roomId = room._id.toString();
      const unreadCount = countMap.get(roomId) || 0;

      let recipientId = null;

      if (room.type === 'direct') {
        const otherMember = room.members?.find(
          (member) =>
            member.toString() !== userObjectId.toString()
        );

        recipientId = otherMember
          ? otherMember.toString()
          : null;
      }

      return {
        roomId,
        roomType: room.type,
        roomName: room.name,
        roomSlug: room.slug,
        recipientId,
        unreadCount
      };
    })
    .filter((room) => room.unreadCount > 0);

  const totalUnread = resultRooms.reduce(
    (total, room) => total + room.unreadCount,
    0
  );

  return {
    totalUnread,
    rooms: resultRooms
  };
};

/**
 * @desc    Get all persistent direct conversations for current user
 * @route   GET /api/v1/chat/direct/conversations
 * @access  Private
 *
 * IMPORTANT:
 * This does NOT return the general users list.
 *
 * It returns only direct rooms where the current user has
 * an actual persistent conversation.
 *
 * The other user remains in the list even when offline.
 */
const getDirectConversations = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(
      req.user._id.toString()
    );

    const rooms = await Room.find({
      type: 'direct',
      is_archived: false,
      members: userId
    })
      .select(
        '_id name slug type members created_by createdAt updatedAt'
      )
      .populate(
        'members',
        'username avatar role accountStatus isOnline lastSeen'
      )
      .lean();

    if (!rooms.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    const roomIds = rooms.map((room) => room._id);

    /*
     * Get the latest visible message for every direct room.
     */
    const latestMessages = await Message.aggregate([
      {
        $match: {
          room: { $in: roomIds },
          is_deleted: false,
          deleted_for: { $ne: userId }
        }
      },
      {
        $sort: {
          createdAt: -1,
          _id: -1
        }
      },
      {
        $group: {
          _id: '$room',
          messageId: { $first: '$_id' },
          content: { $first: '$content' },
          messageType: { $first: '$message_type' },
          sender: { $first: '$sender' },
          createdAt: { $first: '$createdAt' },
          attachments: { $first: '$attachments' },
          isDeleted: { $first: '$is_deleted' }
        }
      }
    ]);

    const latestMessageMap = new Map(
      latestMessages.map((message) => [
        message._id.toString(),
        message
      ])
    );

    /*
     * Get unread counts for each direct room.
     */
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          room: { $in: roomIds },
          is_deleted: false,
          deleted_for: { $ne: userId },
          sender: { $ne: userId },
          'read_by.user': { $ne: userId }
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

    const unreadMap = new Map(
      unreadCounts.map((item) => [
        item._id.toString(),
        Number(item.unreadCount) || 0
      ])
    );

    /*
     * Collect sender IDs from latest messages so we can
     * return sender information without relying on the
     * current user's online state.
     */
    const senderIds = latestMessages
      .map((message) => message.sender)
      .filter(Boolean);

    const senders = senderIds.length
      ? await User.find({
          _id: { $in: senderIds }
        })
          .select('_id username avatar role accountStatus isOnline lastSeen')
          .lean()
      : [];

    const senderMap = new Map(
      senders.map((sender) => [
        sender._id.toString(),
        sender
      ])
    );

    const conversations = rooms
      .map((room) => {
        const roomId = room._id.toString();

        const otherUser = room.members?.find(
          (member) =>
            String(member?._id || member) !==
            userId.toString()
        );

        /*
         * A valid DM room should always have another participant.
         */
        if (!otherUser) {
          return null;
        }

        const latestMessage =
          latestMessageMap.get(roomId) || null;

        const latestSender = latestMessage?.sender
          ? senderMap.get(
              latestMessage.sender.toString()
            ) || null
          : null;

        const unreadCount =
          unreadMap.get(roomId) || 0;

        return {
          roomId,
          roomType: 'direct',

          /*
           * Participant information is persistent and does
           * not depend on whether the user is currently online.
           */
          recipient: {
            _id: otherUser._id,
            username: otherUser.username || '',
            avatar: otherUser.avatar || '',
            role: otherUser.role || 'member',
            accountStatus:
              otherUser.accountStatus || 'active',
            isOnline: Boolean(otherUser.isOnline),
            lastSeen: otherUser.lastSeen || null
          },

          recipientId: otherUser._id,

          latestMessage: latestMessage
            ? {
                _id: latestMessage.messageId,
                content: latestMessage.content || '',
                messageType:
                  latestMessage.messageType || 'text',
                sender: latestSender,
                createdAt: latestMessage.createdAt,
                attachments:
                  latestMessage.attachments || [],
                isDeleted:
                  Boolean(latestMessage.isDeleted)
              }
            : null,

          unreadCount,

          createdAt: room.createdAt,
          updatedAt:
            latestMessage?.createdAt ||
            room.updatedAt ||
            room.createdAt
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = new Date(
          a.latestMessage?.createdAt ||
          a.updatedAt ||
          a.createdAt ||
          0
        ).getTime();

        const dateB = new Date(
          b.latestMessage?.createdAt ||
          b.updatedAt ||
          b.createdAt ||
          0
        ).getTime();

        return dateB - dateA;
      });

    return res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get room directory for current user
 * @route   GET /api/v1/chat/rooms
 * @access  Private
 */
const getRooms = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const rooms = await Room.find({
      is_archived: false,
      $or: [
        { type: 'public' },
        { type: 'private', members: userId },
        { type: 'direct', members: userId }
      ]
    })
      .populate('created_by', 'username avatar role')
      .populate(
        'members',
        'username avatar role accountStatus isOnline lastSeen'
      )
      .sort({ createdAt: 1 })
      .lean();

    const data = rooms.map((room) => ({
      ...room,
      memberCount: Array.isArray(room.members)
        ? room.members.length
        : 0,
      isJoined:
        isSuperAdmin(req.user) ||
        isRoomMember(room, userId),
      isSuperAdmin: isSuperAdmin(req.user)
    }));

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get unread message counts
 * @route   GET /api/v1/chat/unread-counts
 * @access  Private
 */
const getUnreadMessageCounts = async (req, res, next) => {
  try {
    const result = await getUnreadCountDataForUser(
      req.user._id,
      isSuperAdmin(req.user)
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Join a public room
 * @route   POST /api/v1/chat/rooms/:roomId/join
 * @access  Private
 */
const joinRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(roomId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room ID.'
      });
    }

    const room = await Room.findOne({
      _id: roomId,
      is_archived: false
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found.'
      });
    }

    if (isSuperAdmin(req.user)) {
      const adminRoom = await populateRoom(
        room._id,
        userId
      );

      return res.status(200).json({
        success: true,
        message:
          'Super Admin access granted. No room membership is required.',
        data: {
          ...adminRoom,
          isJoined: true,
          isSuperAdmin: true
        }
      });
    }

    if (room.type === 'direct') {
      return res.status(400).json({
        success: false,
        error:
          'Direct conversations cannot be joined.'
      });
    }

    if (room.type === 'private') {
      return res.status(403).json({
        success: false,
        error:
          'This is a private room. You must be invited to join it.'
      });
    }

    if (isRoomMember(room, userId)) {
      const alreadyJoinedRoom =
        await populateRoom(room._id, userId);

      return res.status(200).json({
        success: true,
        message:
          'You are already a member of this room.',
        data: alreadyJoinedRoom
      });
    }

    await Room.updateOne(
      { _id: room._id },
      {
        $addToSet: {
          members: userId
        }
      }
    );

    const joinedRoom = await populateRoom(
      room._id,
      userId
    );

    res.status(200).json({
      success: true,
      message: `You joined ${room.name}.`,
      data: joinedRoom
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Leave a public/private room
 * @route   POST /api/v1/chat/rooms/:roomId/leave
 * @access  Private
 */
const leaveRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(roomId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room ID.'
      });
    }

    const room = await Room.findOne({
      _id: roomId,
      is_archived: false
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found.'
      });
    }

    if (isSuperAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        error:
          'Super Admin has permanent access to all rooms and does not need to leave rooms.'
      });
    }

    if (room.type === 'direct') {
      return res.status(400).json({
        success: false,
        error:
          'Direct conversations cannot be left. End the conversation instead.'
      });
    }

    if (!isRoomMember(room, userId)) {
      return res.status(400).json({
        success: false,
        error:
          'You are not a member of this room.'
      });
    }

    if (
      room.created_by &&
      String(room.created_by) === String(userId)
    ) {
      return res.status(403).json({
        success: false,
        error:
          'The room creator cannot leave the room. Transfer ownership first.'
      });
    }

    await Message.updateMany(
      {
        room: room._id,
        is_deleted: false,
        sender: { $ne: userId },
        'read_by.user': { $ne: userId }
      },
      {
        $push: {
          read_by: {
            user: userId,
            read_at: new Date()
          }
        }
      }
    );

    await Room.updateOne(
      { _id: room._id },
      {
        $pull: {
          members: userId
        }
      }
    );

    const updatedRoom = await populateRoom(
      room._id,
      userId
    );

    res.status(200).json({
      success: true,
      message: `You left ${room.name}.`,
      data: updatedRoom || {
        _id: room._id,
        name: room.name,
        slug: room.slug,
        type: room.type,
        memberCount: Math.max(
          0,
          room.members.length - 1
        ),
        isJoined: false
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all unread messages in a joined room as read
 * @route   PATCH /api/v1/chat/rooms/:roomId/read
 * @access  Private
 */
const markRoomMessagesRead = async (
  req,
  res,
  next
) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(roomId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room ID.'
      });
    }

    const room = await Room.findOne({
      _id: roomId,
      is_archived: false
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found.'
      });
    }

    if (
      !isSuperAdmin(req.user) &&
      !isRoomMember(room, userId)
    ) {
      return res.status(403).json({
        success: false,
        error:
          'You must join this room before marking messages as read.'
      });
    }

    const unreadFilter = {
      room: room._id,
      is_deleted: false,
      sender: { $ne: userId },
      'read_by.user': { $ne: userId },
      deleted_for: { $ne: userId }
    };

    const updateResult = await Message.updateMany(
      unreadFilter,
      {
        $push: {
          read_by: {
            user: userId,
            read_at: new Date()
          }
        }
      }
    );

    const unreadData =
      await getUnreadCountDataForUser(
        userId,
        isSuperAdmin(req.user)
      );

    const currentRoom = unreadData.rooms.find(
      (item) => item.roomId === roomId.toString()
    );

    const unreadCount =
      currentRoom?.unreadCount || 0;

    res.status(200).json({
      success: true,
      data: {
        roomId: roomId.toString(),
        markedRead:
          updateResult.modifiedCount || 0,
        unreadCount,
        totalUnread: unreadData.totalUnread,
        recipientId:
          room.type === 'direct'
            ? room.members.find(
                (member) =>
                  member.toString() !==
                  userId.toString()
              )?.toString() || null
            : null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single room by slug
 * @route   GET /api/v1/chat/rooms/slug/:slug
 * @access  Private
 */
const getRoomBySlug = async (
  req,
  res,
  next
) => {
  try {
    const { slug } = req.params;
    const userId = req.user._id;

    const room = await Room.findOne({
      slug: String(slug).toLowerCase(),
      is_archived: false
    })
      .populate('created_by', 'username avatar role')
      .populate(
        'members',
        'username avatar role accountStatus isOnline lastSeen'
      )
      .lean();

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found.'
      });
    }

    const isJoined =
      isSuperAdmin(req.user) ||
      isRoomMember(room, userId);

    if (
      (room.type === 'private' ||
        room.type === 'direct') &&
      !isJoined
    ) {
      return res.status(403).json({
        success: false,
        error:
          room.type === 'private'
            ? 'You do not have access to this private room.'
            : 'You do not have access to this conversation.'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...room,
        memberCount: Array.isArray(room.members)
          ? room.members.length
          : 0,
        isJoined
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new public/private room
 * @route   POST /api/v1/chat/rooms
 * @access  Private
 */
const createRoom = async (
  req,
  res,
  next
) => {
  try {
    const {
      name,
      description = '',
      type = 'public',
      members = []
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Room name is required.'
      });
    }

    if (
      !['public', 'private'].includes(type)
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Room type must be public or private.'
      });
    }

    const slug = createSlug(name);

    if (!slug) {
      return res.status(400).json({
        success: false,
        error:
          'A valid room name is required.'
      });
    }

    const existingRoom =
      await Room.findOne({ slug });

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        error:
          'A room with this name already exists.'
      });
    }

    const validMembers = [];

    if (Array.isArray(members)) {
      for (const memberId of members) {
        if (!isValidObjectId(memberId)) {
          continue;
        }

        const userExists =
          await User.exists({
            _id: memberId
          });

        if (userExists) {
          validMembers.push(
            memberId.toString()
          );
        }
      }
    }

    const roomMembers = [
      ...new Set([
        ...validMembers,
        req.user._id.toString()
      ])
    ];

    const room = await Room.create({
      name: name.trim(),
      slug,
      description:
        String(description).trim(),
      type,
      members: roomMembers,
      created_by: req.user._id
    });

    const populatedRoom =
      await populateRoom(
        room._id,
        req.user._id
      );

    res.status(201).json({
      success: true,
      data: populatedRoom
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated messages for a joined room
 * @route   GET /api/v1/chat/rooms/:roomId/messages
 * @access  Private
 */
const getRoomMessages = async (
  req,
  res,
  next
) => {
  try {
    const { roomId } = req.params;
    const { page, limit, skip } =
      getPagination(req);

    if (!isValidObjectId(roomId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room ID.'
      });
    }

    const room = await Room.findOne({
      _id: roomId,
      is_archived: false
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found.'
      });
    }

    const userId = req.user._id;
    const isMember =
      isRoomMember(room, userId);

    if (
      !isMember &&
      !isSuperAdmin(req.user)
    ) {
      return res.status(403).json({
        success: false,
        error:
          room.type === 'public'
            ? 'Join this room to view its messages.'
            : 'You do not have access to this room.'
      });
    }

    const filter = {
      room: roomId,
      is_deleted: false,
      deleted_for: { $ne: userId }
    };

    const totalMessages =
      await Message.countDocuments(filter);

    const messages =
      await Message.find(filter)
        .populate(
          'sender',
          'username avatar role email'
        )
        .populate(
          'recipient',
          'username avatar role email'
        )
        .populate({
          path: 'reply_to',
          select:
            'content message_type sender createdAt',
          populate: {
            path: 'sender',
            select: 'username avatar'
          }
        })
        .sort({
          createdAt: -1,
          _id: -1
        })
        .skip(skip)
        .limit(limit)
        .lean();

    messages.reverse();

    res.status(200).json({
      success: true,
      count: messages.length,
      pagination: {
        page,
        limit,
        totalPages:
          Math.ceil(
            totalMessages / limit
          ),
        totalMessages
      },
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get or create direct-message room
 * @route   POST /api/v1/chat/direct/:recipientId
 * @access  Private
 */
const getOrCreateDirectMessageRoom =
  async (req, res, next) => {
    try {
      const { recipientId } =
        req.params;

      const userId =
        req.user._id.toString();

      if (
        !isValidObjectId(recipientId)
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Invalid recipient ID.'
        });
      }

      if (recipientId === userId) {
        return res.status(400).json({
          success: false,
          error:
            'Cannot create a direct room with yourself.'
        });
      }

      const recipient =
        await User.findById(
          recipientId
        ).select(
          'username avatar role accountStatus isOnline lastSeen'
        );

      if (!recipient) {
        return res.status(404).json({
          success: false,
          error:
            'Recipient not found.'
        });
      }

      if (
        recipient.accountStatus ===
          'suspended' ||
        recipient.accountStatus ===
          'banned'
      ) {
        return res.status(403).json({
          success: false,
          error:
            'This user cannot receive messages.'
        });
      }

      let room =
        await Room.findOne({
          type: 'direct',
          members: {
            $all: [
              req.user._id,
              recipientId
            ]
          }
        });

      if (!room) {
        const sortedIds = [
          userId,
          recipientId
        ].sort();

        const slug =
          `dm-${sortedIds.join('-')}`;

        room = await Room.create({
          name: 'Direct Message',
          slug,
          type: 'direct',
          members: [
            req.user._id,
            recipientId
          ],
          created_by:
            req.user._id
        });
      }

      const populatedRoom =
        await populateRoom(
          room._id,
          req.user._id
        );

      res.status(200).json({
        success: true,
        data: populatedRoom
      });
    } catch (error) {
      next(error);
    }
  };

/**
 * @desc    Get direct-message history
 * @route   GET /api/v1/chat/direct/:recipientId
 * @access  Private
 */
const getDirectMessages = async (
  req,
  res,
  next
) => {
  try {
    const { recipientId } =
      req.params;

    const { page, limit, skip } =
      getPagination(req);

    if (
      !isValidObjectId(recipientId)
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Invalid recipient ID.'
      });
    }

    if (
      recipientId ===
      req.user._id.toString()
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Cannot message yourself.'
      });
    }

    const room =
      await Room.findOne({
        type: 'direct',
        members: {
          $all: [
            req.user._id,
            recipientId
          ]
        }
      });

    if (!room) {
      return res.status(200).json({
        success: true,
        count: 0,
        pagination: {
          page,
          limit,
          totalPages: 0,
          totalMessages: 0
        },
        readState: {
          unreadCount: 0,
          firstUnreadMessageId: null,
          lastReadMessageId: null,
          lastReadAt: null
        },
        data: []
      });
    }

    const filter = {
      room: room._id,
      is_deleted: false,
      deleted_for: {
        $ne: req.user._id
      }
    };

    const unreadFilter = {
      room: room._id,
      is_deleted: false,
      deleted_for: {
        $ne: req.user._id
      },
      sender: {
        $ne: req.user._id
      },
      'read_by.user': {
        $ne: req.user._id
      }
    };

    const firstUnreadMessage =
      await Message.findOne(
        unreadFilter
      )
        .select(
          '_id createdAt sender'
        )
        .sort({
          createdAt: 1,
          _id: 1
        })
        .lean();

    let lastReadMessage = null;

    if (firstUnreadMessage) {
      lastReadMessage =
        await Message.findOne({
          ...filter,
          $or: [
            {
              createdAt: {
                $lt:
                  firstUnreadMessage.createdAt
              }
            },
            {
              createdAt:
                firstUnreadMessage.createdAt,
              _id: {
                $lt:
                  firstUnreadMessage._id
              }
            }
          ]
        })
          .select('_id createdAt')
          .sort({
            createdAt: -1,
            _id: -1
          })
          .lean();
    } else {
      lastReadMessage =
        await Message.findOne(
          filter
        )
          .select('_id createdAt')
          .sort({
            createdAt: -1,
            _id: -1
          })
          .lean();
    }

    const unreadCount =
      await Message.countDocuments(
        unreadFilter
      );

    const aroundMessageId =
      req.query.aroundMessageId;

    let historyFilter = {
      ...filter
    };

    const hasAnchor = Boolean(
      aroundMessageId &&
        isValidObjectId(
          aroundMessageId
        )
    );

    if (hasAnchor) {
      const anchor =
        await Message.findOne({
          ...filter,
          _id: aroundMessageId
        })
          .select(
            '_id createdAt'
          )
          .lean();

      if (anchor) {
        historyFilter = {
          ...filter,
          $or: [
            {
              createdAt: {
                $gt:
                  anchor.createdAt
              }
            },
            {
              createdAt:
                anchor.createdAt,
              _id: {
                $gte:
                  anchor._id
              }
            }
          ]
        };
      }
    }

    const totalMessages =
      await Message.countDocuments(
        filter
      );

    const historyTotal =
      await Message.countDocuments(
        historyFilter
      );

    const query =
      Message.find(historyFilter)
        .populate(
          'sender',
          'username avatar role email'
        )
        .populate(
          'recipient',
          'username avatar role email'
        )
        .populate({
          path: 'reply_to',
          select:
            'content message_type sender createdAt',
          populate: {
            path: 'sender',
            select:
              'username avatar'
          }
        });

    let messages;

    if (
      hasAnchor &&
      historyFilter.$or
    ) {
      messages =
        await query
          .sort({
            createdAt: 1,
            _id: 1
          })
          .limit(
            Math.min(
              Math.max(
                limit,
                1
              ),
              100
            )
          )
          .lean();
    } else {
      messages =
        await query
          .sort({
            createdAt: -1,
            _id: -1
          })
          .skip(skip)
          .limit(limit)
          .lean();

      messages.reverse();
    }

    return res.status(200).json({
      success: true,
      count: messages.length,
      pagination: {
        page,
        limit,
        totalPages:
          Math.ceil(
            historyTotal /
              limit
          ),
        totalMessages
      },
      readState: {
        unreadCount,
        firstUnreadMessageId:
          firstUnreadMessage?._id?.toString() ||
          null,
        lastReadMessageId:
          lastReadMessage?._id?.toString() ||
          null,
        lastReadAt:
          lastReadMessage?.createdAt ||
          null
      },
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRooms,
  getUnreadMessageCounts,
  markRoomMessagesRead,
  getRoomBySlug,
  createRoom,
  getRoomMessages,
  getOrCreateDirectMessageRoom,
  getDirectMessages,
  getDirectConversations,
  getUnreadCountDataForUser,
  joinRoom,
  leaveRoom
};