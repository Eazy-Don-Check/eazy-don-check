const mongoose = require('mongoose');
const Notification = require('../models/Notification');

/*
====================================================
GET NOTIFICATIONS
====================================================
GET /api/v1/notifications
*/
const getNotifications = async (
  req,
  res
) => {
  try {
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 20,
        1
      ),
      50
    );

    const skip =
      (page - 1) * limit;

    const userId =
      req.user._id || req.user.id;

    const query = {
      recipient: userId
    };

    // Optional unread-only filter
    if (req.query.unread === 'true') {
      query.read = false;
    }

    const [
      notifications,
      total,
      unreadCount
    ] = await Promise.all([
      Notification.find(query)
        .populate(
          'sender',
          'name username avatarUrl role'
        )
        .populate(
          'relatedRoom',
          'name slug type'
        )
        .populate(
          'relatedMessage',
          'content message_type createdAt'
        )
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Notification.countDocuments(query),

      Notification.countDocuments({
        recipient: userId,
        read: false
      })
    ]);

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(total / limit),
        hasNextPage:
          page <
          Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(
      'GET NOTIFICATIONS ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to retrieve notifications.'
    });
  }
};

/*
====================================================
GET UNREAD NOTIFICATION COUNT
====================================================
GET /api/v1/notifications/unread-count
*/
const getUnreadCount = async (
  req,
  res
) => {
  try {
    const userId =
      req.user._id || req.user.id;

    const unreadCount =
      await Notification.countDocuments({
        recipient: userId,
        read: false
      });

    return res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error(
      'GET UNREAD COUNT ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to retrieve unread notification count.'
    });
  }
};

/*
====================================================
MARK SINGLE NOTIFICATION AS READ
====================================================
PATCH /api/v1/notifications/:id/read
*/
const markAsRead = async (
  req,
  res
) => {
  try {
    const userId =
      req.user._id || req.user.id;

    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid notification ID.'
      });
    }

    const notification =
      await Notification.findOne({
        _id: id,
        recipient: userId
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message:
          'Notification not found.'
      });
    }

    notification.read = true;
    notification.readAt =
      notification.readAt ||
      new Date();

    await notification.save();

    return res.status(200).json({
      success: true,
      message:
        'Notification marked as read.',
      notification
    });
  } catch (error) {
    console.error(
      'MARK NOTIFICATION READ ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to mark notification as read.'
    });
  }
};

/*
====================================================
MARK ALL NOTIFICATIONS AS READ
====================================================
PATCH /api/v1/notifications/read-all
*/
const markAllAsRead = async (
  req,
  res
) => {
  try {
    const userId =
      req.user._id || req.user.id;

    await Notification.updateMany(
      {
        recipient: userId,
        read: false
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    return res.status(200).json({
      success: true,
      message:
        'All notifications marked as read.'
    });
  } catch (error) {
    console.error(
      'MARK ALL NOTIFICATIONS READ ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to mark notifications as read.'
    });
  }
};

/*
====================================================
DELETE ONE NOTIFICATION
====================================================
DELETE /api/v1/notifications/:id
*/
const deleteNotification = async (
  req,
  res
) => {
  try {
    const userId =
      req.user._id || req.user.id;

    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid notification ID.'
      });
    }

    const notification =
      await Notification.findOneAndDelete({
        _id: id,
        recipient: userId
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message:
          'Notification not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'Notification deleted successfully.'
    });
  } catch (error) {
    console.error(
      'DELETE NOTIFICATION ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to delete notification.'
    });
  }
};

/*
====================================================
DELETE ALL READ NOTIFICATIONS
====================================================
DELETE /api/v1/notifications/read
*/
const deleteReadNotifications = async (
  req,
  res
) => {
  try {
    const userId =
      req.user._id || req.user.id;

    const result =
      await Notification.deleteMany({
        recipient: userId,
        read: true
      });

    return res.status(200).json({
      success: true,
      message:
        'Read notifications deleted successfully.',
      deletedCount:
        result.deletedCount
    });
  } catch (error) {
    console.error(
      'DELETE READ NOTIFICATIONS ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to delete read notifications.'
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications
};