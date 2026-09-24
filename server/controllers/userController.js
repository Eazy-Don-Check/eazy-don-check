const mongoose = require('mongoose');

const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');


// ============================================================
// PUBLIC USER FIELDS
// ============================================================

const publicUserFields = [
  '_id',
  'name',
  'username',
  'avatarUrl',
  'coverPhoto',
  'bio',
  'statusUpdate',
  'location',
  'gender',
  'age',
  'relationshipStatus',
  'isOnline',
  'lastSeen',
  'createdAt',
].join(' ');


// ============================================================
// GET USERS / PEOPLE SEARCH
// GET /api/v1/users
// ============================================================

const getUsers = async (
  req,
  res,
  next
) => {
  try {
    const search = String(
      req.query.search || ''
    ).trim();

    const limit = Math.min(
      parseInt(req.query.limit, 10) || 20,
      100
    );

    const filter = {
      _id: {
        $ne: req.user._id,
      },
      accountStatus: 'active',
    };


    // --------------------------------------------------------
    // Search by name, username or email
    // --------------------------------------------------------

    if (search) {
      const escapedSearch =
        search.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );

      const regex =
        new RegExp(
          escapedSearch,
          'i'
        );

      filter.$or = [
        {
          name: regex,
        },
        {
          username: regex,
        },
        {
          email: regex,
        },
      ];
    }


    const users =
      await User.find(filter)
        .select(
          `${publicUserFields} email`
        )
        .sort({
          name: 1,
          username: 1,
        })
        .limit(limit)
        .lean();


    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });

  } catch (error) {
    next(error);
  }
};


// ============================================================
// GET SINGLE USER PROFILE
// GET /api/v1/users/:userId
// ============================================================

const getUserById = async (
  req,
  res,
  next
) => {
  try {

    const {
      userId,
    } = req.params;


    // --------------------------------------------------------
    // VALIDATE TARGET USER ID
    // --------------------------------------------------------

    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
      });
    }


    // --------------------------------------------------------
    // GET TARGET USER
    // --------------------------------------------------------

    const user =
      await User.findOne({
        _id: userId,
        accountStatus: 'active',
      })
        .select(
          publicUserFields
        )
        .lean();


    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }


    // --------------------------------------------------------
    // CURRENT LOGGED-IN USER
    // --------------------------------------------------------

    const currentUserId =
      req.user._id;


    // --------------------------------------------------------
    // GET CURRENT USER FRIENDS
    // --------------------------------------------------------

    const currentUser =
      await User.findById(
        currentUserId
      )
        .select('friends')
        .lean();


    // --------------------------------------------------------
    // CHECK WHETHER ALREADY FRIENDS
    // --------------------------------------------------------

    const isFriend =
      currentUser?.friends?.some(
        (friendId) =>
          String(friendId) ===
          String(userId)
      ) || false;


    // ========================================================
    // FIND PENDING FRIEND REQUEST
    // ========================================================
    //
    // There can be two possible directions:
    //
    // 1. CURRENT USER -> PROFILE USER
    //    requestSent = true
    //
    // 2. PROFILE USER -> CURRENT USER
    //    requestReceived = true
    //
    // We check both directions.
    // ========================================================

    const pendingRequests =
      await FriendRequest.find({
        status: 'pending',
        $or: [
          {
            sender: currentUserId,
            receiver: userId,
          },
          {
            sender: userId,
            receiver: currentUserId,
          },
        ],
      })
        .select(
          '_id sender receiver status createdAt'
        )
        .sort({
          createdAt: -1,
        })
        .lean();


    // --------------------------------------------------------
    // DEFAULT RELATIONSHIP STATE
    // --------------------------------------------------------

    let requestSent = false;
    let requestReceived = false;

    let outgoingRequestId = null;
    let incomingRequestId = null;


    // --------------------------------------------------------
    // PROCESS PENDING REQUESTS
    // --------------------------------------------------------

    for (
      const request
      of pendingRequests
    ) {

      const senderId =
        String(
          request.sender
        );

      const receiverId =
        String(
          request.receiver
        );


      // ------------------------------------------------------
      // CURRENT USER SENT REQUEST TO PROFILE USER
      // ------------------------------------------------------

      if (
        senderId ===
          String(currentUserId) &&
        receiverId ===
          String(userId)
      ) {

        requestSent = true;

        outgoingRequestId =
          String(
            request._id
          );
      }


      // ------------------------------------------------------
      // PROFILE USER SENT REQUEST TO CURRENT USER
      // ------------------------------------------------------

      if (
        senderId ===
          String(userId) &&
        receiverId ===
          String(currentUserId)
      ) {

        requestReceived = true;

        incomingRequestId =
          String(
            request._id
          );
      }
    }


    // --------------------------------------------------------
    // FINAL RELATIONSHIP OBJECT
    // --------------------------------------------------------

    const relationship = {
      isFriend,

      requestSent,

      requestReceived,

      friendRequestId:
        incomingRequestId,

      incomingRequestId:
        incomingRequestId,

      outgoingRequestId:
        outgoingRequestId,

      requestId:
        incomingRequestId,
    };


    // --------------------------------------------------------
    // DEBUG LOG
    // --------------------------------------------------------

    console.log(
      '👥 USER PROFILE RELATIONSHIP',
      {
        currentUserId:
          String(currentUserId),

        profileUserId:
          String(userId),

        isFriend,

        requestSent,

        requestReceived,

        incomingRequestId,

        outgoingRequestId,

        pendingRequests:
          pendingRequests.length,
      }
    );


    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      data: {
        user,

        relationship,
      },

      // Also expose these at the top level
      // for compatibility with older frontend code.
      user,

      relationship,
    });

  } catch (error) {

    console.error(
      '❌ getUserById error:',
      error
    );

    next(error);
  }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getUsers,
  getUserById,
};