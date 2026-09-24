import React from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  MessageCircle,
  Users,
  Heart,
  MessageSquare,
  CalendarDays,
  ShieldCheck,
  Info,
  ArrowLeft
} from 'lucide-react';

import {
  useNavigate
} from 'react-router-dom';

import {
  useNotifications
} from '../context/NotificationContext';

const getNotificationIcon = (
  type
) => {
  switch (type) {
    case 'message':
      return MessageCircle;

    case 'room_message':
      return MessageSquare;

    case 'friend_request':
      return Users;

    case 'friend_request_accepted':
      return CheckCheck;

    case 'comment':
      return MessageSquare;

    case 'like':
      return Heart;

    case 'event':
      return CalendarDays;

    case 'admin':
      return ShieldCheck;

    case 'system':
      return Info;

    default:
      return Bell;
  }
};

const formatNotificationTime = (
  date
) => {
  if (!date) {
    return '';
  }

  const notificationDate =
    new Date(date);

  if (
    Number.isNaN(
      notificationDate.getTime()
    )
  ) {
    return '';
  }

  const now = new Date();

  const diff =
    Math.floor(
      (
        now.getTime() -
        notificationDate.getTime()
      ) / 1000
    );

  if (diff < 60) {
    return 'Just now';
  }

  if (diff < 3600) {
    return `${Math.floor(
      diff / 60
    )}m ago`;
  }

  if (diff < 86400) {
    return `${Math.floor(
      diff / 3600
    )}h ago`;
  }

  if (diff < 604800) {
    return `${Math.floor(
      diff / 86400
    )}d ago`;
  }

  return notificationDate.toLocaleDateString(
    undefined,
    {
      day: 'numeric',
      month: 'short',
      year:
        notificationDate.getFullYear() !==
        now.getFullYear()
          ? 'numeric'
          : undefined
    }
  );
};

const getNotificationTarget = (notification) => {
  if (
    notification.type === 'message' ||
    notification.type === 'room_message'
  ) {
    if (notification.relatedRoom?.slug) {
      return `/chat/${notification.relatedRoom.slug}`;
    }

    if (notification.metadata?.roomId) {
      return `/chat/${notification.metadata.roomId}`;
    }

    return '/messages';
  }

  if (
    notification.type === 'friend_request' ||
    notification.type === 'friend_request_accepted'
  ) {
    const senderId =
      notification.metadata?.senderId ||
      notification.metadata?.userId ||
      notification.sender?._id ||
      notification.sender?.id;

    if (senderId) {
      return `/profile/${senderId}`;
    }
  }

  return null;
};

export default function Notifications() {
  const navigate =
    useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasNextPage,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    loadMore
  } = useNotifications();

  const handleNotificationClick =
    async (notification) => {
      if (!notification.read) {
        await markAsRead(
          notification._id
        );
      }

      const target =
        getNotificationTarget(
          notification
        );

      if (target) {
        navigate(target);
      }
    };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* HEADER */}
        <div className="flex items-center justify-between gap-4 mb-6">

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() =>
                navigate(-1)
              }
              className="w-10 h-10 rounded-full
                flex items-center justify-center
                bg-white dark:bg-dark-card
                border border-slate-200
                dark:border-dark-border
                hover:bg-slate-100
                dark:hover:bg-dark-hover
                transition"
            >
              <ArrowLeft
                size={19}
              />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Notifications
              </h1>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${
                      unreadCount === 1
                        ? ''
                        : 's'
                    }`
                  : 'You are all caught up'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={
                  markAllAsRead
                }
                className="hidden sm:flex items-center gap-2
                  px-3 py-2 rounded-xl
                  text-sm font-medium
                  bg-brand-50 text-brand-700
                  hover:bg-brand-100
                  transition"
              >
                <CheckCheck
                  size={16}
                />
                Mark all read
              </button>
            )}

            {notifications.some(
              (notification) =>
                notification.read
            ) && (
              <button
                type="button"
                onClick={
                  deleteReadNotifications
                }
                className="hidden sm:flex items-center gap-2
                  px-3 py-2 rounded-xl
                  text-sm font-medium
                  text-red-600
                  hover:bg-red-50
                  transition"
              >
                <Trash2
                  size={16}
                />
                Clear read
              </button>
            )}
          </div>
        </div>

        {/* MOBILE ACTIONS */}
        {unreadCount > 0 && (
          <div className="sm:hidden flex gap-2 mb-4">
            <button
              type="button"
              onClick={
                markAllAsRead
              }
              className="flex-1 flex items-center
                justify-center gap-2
                px-3 py-2 rounded-xl
                text-sm font-medium
                bg-brand-50 text-brand-700"
            >
              <CheckCheck
                size={16}
              />
              Mark all read
            </button>

            {notifications.some(
              (notification) =>
                notification.read
            ) && (
              <button
                type="button"
                onClick={
                  deleteReadNotifications
                }
                className="flex-1 flex items-center
                  justify-center gap-2
                  px-3 py-2 rounded-xl
                  text-sm font-medium
                  text-red-600
                  bg-red-50"
              >
                <Trash2
                  size={16}
                />
                Clear read
              </button>
            )}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-9 h-9 border-4
              border-brand-500
              border-t-transparent
              rounded-full animate-spin"
            />
          </div>
        )}

        {/* EMPTY */}
        {!loading &&
          notifications.length === 0 && (
            <div className="bg-white dark:bg-dark-card
              rounded-2xl
              border border-slate-200
              dark:border-dark-border
              p-12 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4
                rounded-full
                bg-brand-50
                flex items-center justify-center"
              >
                <Bell
                  size={28}
                  className="text-brand-500"
                />
              </div>

              <h2 className="text-lg font-semibold
                text-slate-900
                dark:text-white"
              >
                No notifications yet
              </h2>

              <p className="mt-2 text-sm
                text-slate-500
                dark:text-slate-400"
              >
                New messages and other
                activity will appear here.
              </p>
            </div>
          )}

        {/* NOTIFICATIONS */}
        {!loading &&
          notifications.length > 0 && (
            <div className="space-y-3">

              {notifications.map(
                (notification) => {
                  const Icon =
                    getNotificationIcon(
                      notification.type
                    );

                  return (
                    <div
                      key={
                        notification._id
                      }
                      className={`relative
                        group
                        rounded-2xl
                        border
                        transition
                        ${
                          notification.read
                            ? 'bg-white dark:bg-dark-card border-slate-200 dark:border-dark-border'
                            : 'bg-brand-50/60 dark:bg-brand-950/20 border-brand-200 dark:border-brand-900'
                        }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleNotificationClick(
                            notification
                          )
                        }
                        className="w-full text-left p-4"
                      >
                        <div className="flex gap-3">

                          {/* ICON */}
                          <div
                            className={`flex-shrink-0
                              w-11 h-11
                              rounded-full
                              flex items-center
                              justify-center
                              ${
                                notification.read
                                  ? 'bg-slate-100 dark:bg-dark-hover text-slate-500'
                                  : 'bg-brand-100 text-brand-600'
                              }`}
                          >
                            <Icon
                              size={20}
                            />
                          </div>

                          {/* CONTENT */}
                          <div className="min-w-0 flex-1">

                            <div className="flex items-start justify-between gap-3">

                              <h3
                                className={`text-sm font-semibold
                                  ${
                                    notification.read
                                      ? 'text-slate-800 dark:text-slate-200'
                                      : 'text-slate-950 dark:text-white'
                                  }`}
                              >
                                {
                                  notification.title
                                }
                              </h3>

                              {!notification.read && (
                                <span
                                  className="flex-shrink-0
                                    w-2.5 h-2.5
                                    mt-1.5
                                    rounded-full
                                    bg-brand-500"
                                />
                              )}
                            </div>

                            <p className="mt-1 text-sm
                              text-slate-600
                              dark:text-slate-400"
                            >
                              {
                                notification.message
                              }
                            </p>

                            <p className="mt-2 text-xs
                              text-slate-400
                              dark:text-slate-500"
                            >
                              {formatNotificationTime(
                                notification.createdAt
                              )}
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* DELETE */}
                      <button
                        type="button"
                        onClick={() =>
                          deleteNotification(
                            notification._id
                          )
                        }
                        className="absolute
                          right-3 bottom-3
                          opacity-0
                          group-hover:opacity-100
                          p-2 rounded-lg
                          text-slate-400
                          hover:text-red-500
                          hover:bg-red-50
                          transition"
                        title="Delete notification"
                      >
                        <Trash2
                          size={15}
                        />
                      </button>
                    </div>
                  );
                }
              )}

              {/* LOAD MORE */}
              {hasNextPage && (
                <div className="pt-3 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-5 py-2.5
                      rounded-xl
                      bg-brand-500
                      text-white
                      text-sm font-medium
                      hover:bg-brand-600
                      disabled:opacity-50
                      transition"
                  >
                    {loadingMore
                      ? 'Loading...'
                      : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}