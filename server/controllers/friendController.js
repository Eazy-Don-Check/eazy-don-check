const mongoose = require('mongoose');

const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

const {
  createNotification
} = require('../services/notificationService');

// ============================================================
// PUBLIC USER FIELDS
// ============================================================

const publicUserFields = `
  _id
  name
  username
  avatarUrl
  coverPhoto
  bio
  statusUpdate
  location
  gender
  age
  relationshipStatus
  isOnline
  lastSeen
  createdAt
`;

// ============================================================
// HELPERS
// ============================================================

const getUserDisplayName = (user) => {
  if (!user) {
    return 'Someone';
  }

  return (
    user.name ||
    user.username ||
    user.email ||
    'Someone'
  );
};

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const getIo = (req) => {
  return req.app?.get('io') || null;
};

// ============================================================
// GET FRIENDS
// ============================================================

const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'friends',
        select: publicUserFields,
      })
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const friends = Array.isArray(user.friends)
      ? user.friends
      : [];

    return res.status(200).json({
      success: true,
      count: friends.length,
      data: friends,
    });
  } catch (error) {
    console.error(
      '❌ Error fetching friends:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch friends.',
    });
  }
};

// ============================================================
// GET FRIEND REQUESTS
// ============================================================

const getFriendRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      receiver: req.user._id,
      status: 'pending',
    })
      .populate(
        'sender',
        publicUserFields
      )
      .populate(
        'receiver',
        publicUserFields
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error(
      '❌ Error fetching friend requests:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch friend requests.',
    });
  }
};

// ============================================================
// SEND FRIEND REQUEST
// ============================================================

const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.userId;

    // ----------------------------------------------------------
    // Validate receiver ID
    // ----------------------------------------------------------

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    if (!isValidObjectId(receiverId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
      });
    }

    // ----------------------------------------------------------
    // Prevent self-request
    // ----------------------------------------------------------

    if (
      senderId.toString() ===
      receiverId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a friend request to yourself.',
      });
    }

    // ----------------------------------------------------------
    // Find sender
    // ----------------------------------------------------------

    const sender = await User.findById(
      senderId
    ).select(
      '_id name username email avatarUrl'
    );

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender account not found.',
      });
    }

    // ----------------------------------------------------------
    // Find receiver
    // ----------------------------------------------------------

    const receiver = await User.findById(
      receiverId
    ).select(
      '_id name username email avatarUrl accountStatus'
    );

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // ----------------------------------------------------------
    // Check account status
    // ----------------------------------------------------------

    if (
      receiver.accountStatus === 'suspended' ||
      receiver.accountStatus === 'banned'
    ) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a friend request to this user.',
      });
    }

    // ----------------------------------------------------------
    // Check existing friendship
    // ----------------------------------------------------------

    const senderUser = await User.findById(
      senderId
    ).select('friends');

    const alreadyFriends =
      Array.isArray(senderUser?.friends) &&
      senderUser.friends.some(
        (friendId) =>
          friendId.toString() ===
          receiverId.toString()
      );

    if (alreadyFriends) {
      return res.status(400).json({
        success: false,
        message: 'You are already friends with this user.',
      });
    }

    // ----------------------------------------------------------
    // Check existing pending request
    //
    // Check both directions so neither user can create
    // duplicate pending requests.
    // ----------------------------------------------------------

    const existingRequest =
      await FriendRequest.findOne({
        $or: [
          {
            sender: senderId,
            receiver: receiverId,
            status: 'pending',
          },
          {
            sender: receiverId,
            receiver: senderId,
            status: 'pending',
          },
        ],
      });

    if (existingRequest) {
      const requestIsIncoming =
        existingRequest.sender.toString() ===
        receiverId.toString();

      return res.status(400).json({
        success: false,
        message: requestIsIncoming
          ? 'This user has already sent you a friend request.'
          : 'Friend request already sent.',
        data: {
          requestId: existingRequest._id,
          friendRequestId: existingRequest._id,
          direction: requestIsIncoming
            ? 'incoming'
            : 'outgoing',
        },
      });
    }

    // ----------------------------------------------------------
    // Create friend request
    // ----------------------------------------------------------

    const request =
      await FriendRequest.create({
        sender: senderId,
        receiver: receiverId,
        status: 'pending',
      });

    // ----------------------------------------------------------
    // Populate request
    // ----------------------------------------------------------

    const populatedRequest =
      await FriendRequest.findById(
        request._id
      )
        .populate(
          'sender',
          publicUserFields
        )
        .populate(
          'receiver',
          publicUserFields
        );

    // ----------------------------------------------------------
    // CREATE PERSISTENT + REAL-TIME NOTIFICATION
    // ----------------------------------------------------------

    const io = getIo(req);

    const senderName =
      getUserDisplayName(sender);

    let notification = null;

    try {
      notification =
        await createNotification({
          io,

          recipient:
            receiver._id,

          sender:
            sender._id,

          type:
            'friend_request',

          title:
            'New Friend Request',

          message:
            `${senderName} sent you a friend request.`,

          metadata: {
            friendRequestId:
              request._id.toString(),

            requestId:
              request._id.toString(),

            senderId:
              sender._id.toString(),

            receiverId:
              receiver._id.toString(),

            userId:
              sender._id.toString()
          }
        });
    } catch (notificationError) {
      /*
       * Do not fail the friend request itself just because
       * notification creation failed.
       *
       * The friend request has already been successfully
       * created and can still be retrieved through
       * GET /friends/requests.
       */
      console.error(
        '❌ Failed to create friend-request notification:',
        notificationError
      );
    }

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    return res.status(201).json({
      success: true,
      message: 'Friend request sent successfully.',
      data: populatedRequest,
      notification: notification
        ? {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            createdAt: notification.createdAt,
            metadata: notification.metadata,
          }
        : null,
    });
  } catch (error) {
    console.error(
      '❌ Error sending friend request:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to send friend request.',
    });
  }
};

// ============================================================
// ACCEPT FRIEND REQUEST
// ============================================================

const acceptFriendRequest = async (req, res) => {
  try {
    const currentUserId =
      req.user._id;

    const requestId =
      req.params.requestId;

    // ----------------------------------------------------------
    // Validate request ID
    // ----------------------------------------------------------

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Friend request ID is required.',
      });
    }

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid friend request ID.',
      });
    }

    // ----------------------------------------------------------
    // Find pending request
    // ----------------------------------------------------------

    const request =
      await FriendRequest.findOne({
        _id: requestId,
        receiver: currentUserId,
        status: 'pending',
      });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found or already processed.',
      });
    }

    // ----------------------------------------------------------
    // Load users
    // ----------------------------------------------------------

    const receiver =
      await User.findById(
        currentUserId
      ).select(
        '_id name username email avatarUrl friends'
      );

    const sender =
      await User.findById(
        request.sender
      ).select(
        '_id name username email avatarUrl friends'
      );

    if (!receiver || !sender) {
      return res.status(404).json({
        success: false,
        message: 'One or both users could not be found.',
      });
    }

    // ----------------------------------------------------------
    // Mark request accepted
    // ----------------------------------------------------------

    request.status = 'accepted';

    await request.save();

    // ----------------------------------------------------------
    // Add each user to the other's friends list
    // ----------------------------------------------------------

    const receiverAlreadyHasSender =
      Array.isArray(receiver.friends) &&
      receiver.friends.some(
        (friendId) =>
          friendId.toString() ===
          sender._id.toString()
      );

    if (!receiverAlreadyHasSender) {
      receiver.friends.push(
        sender._id
      );
    }

    const senderAlreadyHasReceiver =
      Array.isArray(sender.friends) &&
      sender.friends.some(
        (friendId) =>
          friendId.toString() ===
          receiver._id.toString()
      );

    if (!senderAlreadyHasReceiver) {
      sender.friends.push(
        receiver._id
      );
    }

    await Promise.all([
      receiver.save(),
      sender.save(),
    ]);

    // ----------------------------------------------------------
    // Reject other pending requests between the same users
    // ----------------------------------------------------------

    await FriendRequest.updateMany(
      {
        _id: {
          $ne: request._id,
        },

        $or: [
          {
            sender: sender._id,
            receiver: receiver._id,
          },
          {
            sender: receiver._id,
            receiver: sender._id,
          },
        ],

        status: 'pending',
      },
      {
        $set: {
          status: 'rejected',
        },
      }
    );

    // ----------------------------------------------------------
    // Create notification for original sender
    // ----------------------------------------------------------

    const io = getIo(req);

    const receiverName =
      getUserDisplayName(
        receiver
      );

    let notification = null;

    try {
      notification =
        await createNotification({
          io,

          recipient:
            sender._id,

          sender:
            receiver._id,

          type:
            'friend_request_accepted',

          title:
            'Friend Request Accepted',

          message:
            `${receiverName} accepted your friend request.`,

          metadata: {
            friendRequestId:
              request._id.toString(),

            requestId:
              request._id.toString(),

            senderId:
              receiver._id.toString(),

            receiverId:
              sender._id.toString(),

            userId:
              receiver._id.toString()
          }
        });
    } catch (notificationError) {
      /*
       * Friendship has already been established.
       * Do not fail the acceptance because notification
       * creation failed.
       */
      console.error(
        '❌ Failed to create friend-accepted notification:',
        notificationError
      );
    }

    // ----------------------------------------------------------
    // Return the newly added friend
    // ----------------------------------------------------------

    const friend =
      await User.findById(
        sender._id
      )
        .select(
          publicUserFields
        )
        .lean();

    return res.status(200).json({
      success: true,
      message: 'Friend request accepted.',
      data: friend,
      requestId: request._id,
      friendRequestId: request._id,
      notification: notification
        ? {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            createdAt: notification.createdAt,
            metadata: notification.metadata,
          }
        : null,
    });
  } catch (error) {
    console.error(
      '❌ Error accepting friend request:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to accept friend request.',
    });
  }
};

// ============================================================
// REJECT FRIEND REQUEST
// ============================================================

const rejectFriendRequest = async (req, res) => {
  try {
    const currentUserId =
      req.user._id;

    const requestId =
      req.params.requestId;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Friend request ID is required.',
      });
    }

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid friend request ID.',
      });
    }

    const request =
      await FriendRequest.findOne({
        _id: requestId,
        receiver: currentUserId,
        status: 'pending',
      });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found or already processed.',
      });
    }

    request.status = 'rejected';

    await request.save();

    return res.status(200).json({
      success: true,
      message: 'Friend request rejected.',
      data: request,
    });
  } catch (error) {
    console.error(
      '❌ Error rejecting friend request:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to reject friend request.',
    });
  }
};

// ============================================================
// REMOVE FRIEND
// ============================================================

const removeFriend = async (req, res) => {
  try {
    const currentUserId =
      req.user._id;

    const friendId =
      req.params.userId;

    if (!friendId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    if (!isValidObjectId(friendId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
      });
    }

    if (
      currentUserId.toString() ===
      friendId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove yourself as a friend.',
      });
    }

    const [currentUser, friend] =
      await Promise.all([
        User.findById(
          currentUserId
        ).select('friends'),

        User.findById(
          friendId
        ).select('friends'),
      ]);

    if (!currentUser || !friend) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    currentUser.friends =
      (currentUser.friends || [])
        .filter(
          (id) =>
            id.toString() !==
            friendId.toString()
        );

    friend.friends =
      (friend.friends || [])
        .filter(
          (id) =>
            id.toString() !==
            currentUserId.toString()
        );

    await Promise.all([
      currentUser.save(),
      friend.save(),
    ]);

    // ----------------------------------------------------------
    // Reject any pending requests between these users
    // ----------------------------------------------------------

    await FriendRequest.updateMany(
      {
        $or: [
          {
            sender: currentUserId,
            receiver: friendId,
          },
          {
            sender: friendId,
            receiver: currentUserId,
          },
        ],

        status: 'pending',
      },
      {
        $set: {
          status: 'rejected',
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Friend removed successfully.',
    });
  } catch (error) {
    console.error(
      '❌ Error removing friend:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to remove friend.',
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
};