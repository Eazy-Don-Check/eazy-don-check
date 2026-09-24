const Notification = require('../models/Notification');

/**
 * Create a persistent notification and optionally
 * deliver it immediately through Socket.IO.
 *
 * This service is intentionally reusable so future
 * features such as friend requests, likes, comments,
 * events and admin announcements can use the same
 * notification system.
 */
const createNotification = async ({
  io = null,
  recipient,
  sender = null,
  type,
  title,
  message,
  relatedRoom = null,
  relatedMessage = null,
  metadata = {}
}) => {
  if (!recipient) {
    throw new Error(
      'Notification recipient is required.'
    );
  }

  if (!type) {
    throw new Error(
      'Notification type is required.'
    );
  }

  if (!title) {
    throw new Error(
      'Notification title is required.'
    );
  }

  if (!message) {
    throw new Error(
      'Notification message is required.'
    );
  }

  // ==========================================
  // CREATE DATABASE RECORD
  // ==========================================

  let notification =
    await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      relatedRoom,
      relatedMessage,
      metadata
    });

  // ==========================================
  // POPULATE SENDER / RELATED DATA
  // ==========================================

  notification =
    await Notification.findById(
      notification._id
    )
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
      );

  // ==========================================
  // REAL-TIME DELIVERY
  // ==========================================

  if (io && notification) {
    io.to(
      `user:${recipient.toString()}`
    ).emit(
      'notification',
      notification
    );
  }

  return notification;
};

/**
 * Mark one notification as read.
 */
const markNotificationRead = async (
  notificationId,
  userId
) => {
  const notification =
    await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

  if (!notification) {
    return null;
  }

  if (!notification.read) {
    notification.read = true;
    notification.readAt = new Date();

    await notification.save();
  }

  return notification;
};

module.exports = {
  createNotification,
  markNotificationRead
};