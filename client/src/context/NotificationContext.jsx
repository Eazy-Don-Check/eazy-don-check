import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  useLocation
} from 'react-router-dom';

import apiClient from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotificationContext =
  createContext(null);

export function NotificationProvider({
  children
}) {
  const {
    user,
    isAuthenticated
  } = useAuth();

  const { socket } =
    useSocket();

  const location =
    useLocation();

  const [
    notifications,
    setNotifications
  ] = useState([]);

  const [
    unreadCount,
    setUnreadCount
  ] = useState(0);

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    loadingMore,
    setLoadingMore
  ] = useState(false);

  const [
    page,
    setPage
  ] = useState(1);

  const [
    hasNextPage,
    setHasNextPage
  ] = useState(false);

  /*
   * Prevent duplicate "read all" requests while
   * React effects are running.
   */
  const markingAllAsReadRef =
    useRef(false);

  /**
   * Load notifications.
   */
  const loadNotifications =
    useCallback(
      async (
        requestedPage = 1,
        append = false
      ) => {
        if (
          !isAuthenticated ||
          !user
        ) {
          setNotifications([]);
          setUnreadCount(0);
          setPage(1);
          setHasNextPage(false);
          return;
        }

        try {
          if (append) {
            setLoadingMore(true);
          } else {
            setLoading(true);
          }

          const response =
            await apiClient.get(
              '/notifications',
              {
                params: {
                  page: requestedPage,
                  limit: 20
                }
              }
            );

          const root =
            response?.data || {};

          const data =
            root.data || root;

          const incomingNotifications =
            Array.isArray(
              data.notifications
            )
              ? data.notifications
              : [];

          const serverUnreadCount =
            Number(
              data.unreadCount
            ) || 0;

          const nextPage =
            data.pagination?.page ||
            requestedPage;

          const nextHasNext =
            Boolean(
              data.pagination
                ?.hasNextPage
            );

          if (append) {
            setNotifications(
              (previous) => [
                ...previous,
                ...incomingNotifications
              ]
            );
          } else {
            setNotifications(
              incomingNotifications
            );
          }

          setUnreadCount(
            serverUnreadCount
          );

          setPage(nextPage);
          setHasNextPage(
            nextHasNext
          );
        } catch (error) {
          console.error(
            'Failed to load notifications:',
            error?.response?.data ||
              error.message
          );
        } finally {
          setLoading(false);
          setLoadingMore(false);
        }
      },
      [
        isAuthenticated,
        user
      ]
    );

  /**
   * Mark all notifications as read.
   *
   * This is used when the user actually opens
   * the Notifications page.
   */
  const markAllAsRead =
    useCallback(
      async () => {
        if (
          !isAuthenticated ||
          !user
        ) {
          return;
        }

        if (
          markingAllAsReadRef.current
        ) {
          return;
        }

        /*
         * Nothing to do.
         */
        if (
          Number(unreadCount) <= 0
        ) {
          return;
        }

        markingAllAsReadRef.current =
          true;

        /*
         * Optimistic UI update.
         *
         * The number disappears immediately.
         */
        setNotifications(
          (previous) =>
            previous.map(
              (notification) => ({
                ...notification,
                read: true,
                readAt:
                  notification.readAt ||
                  new Date().toISOString()
              })
            )
        );

        setUnreadCount(0);

        try {
          await apiClient.patch(
            '/notifications/read-all'
          );
        } catch (error) {
          console.error(
            'Failed to mark all notifications as read:',
            error?.response?.data ||
              error.message
          );

          /*
           * Restore authoritative state.
           */
          await loadNotifications(
            1,
            false
          );
        } finally {
          markingAllAsReadRef.current =
            false;
        }
      },
      [
        isAuthenticated,
        user,
        unreadCount,
        loadNotifications
      ]
    );

  /**
   * Initial notification load.
   */
  useEffect(() => {
    if (
      !isAuthenticated ||
      !user
    ) {
      setNotifications([]);
      setUnreadCount(0);
      setPage(1);
      setHasNextPage(false);
      return;
    }

    loadNotifications(
      1,
      false
    );
  }, [
    isAuthenticated,
    user,
    loadNotifications
  ]);

  /**
   * IMPORTANT:
   *
   * When the user opens the Notifications page,
   * mark the notifications as read.
   *
   * This fixes the situation where the user clicks
   * the bell but the badge remains visible.
   */
  useEffect(() => {
    if (
      location.pathname !==
      '/notifications'
    ) {
      return;
    }

    if (
      !isAuthenticated ||
      !user
    ) {
      return;
    }

    if (
      Number(unreadCount) <= 0
    ) {
      return;
    }

    markAllAsRead();
  }, [
    location.pathname,
    isAuthenticated,
    user,
    unreadCount,
    markAllAsRead
  ]);

  /**
   * Handle new socket notification.
   */
  useEffect(() => {
    if (
      !socket ||
      !isAuthenticated
    ) {
      return undefined;
    }

    const handleNotification =
      (notification) => {
        if (!notification) {
          return;
        }

        const notificationId =
          notification._id ||
          notification.id;

        /*
         * If the notification already exists,
         * don't duplicate it.
         */
        if (
          notificationId
        ) {
          setNotifications(
            (previous) => {
              const alreadyExists =
                previous.some(
                  (item) =>
                    String(
                      item._id ||
                        item.id
                    ) ===
                    String(
                      notificationId
                    )
                );

              if (
                alreadyExists
              ) {
                return previous;
              }

              return [
                notification,
                ...previous
              ].slice(0, 20);
            }
          );
        } else {
          setNotifications(
            (previous) => [
              notification,
              ...previous
            ].slice(0, 20)
          );
        }

        /*
         * If the Notifications page is currently open,
         * the new notification should immediately be
         * considered read.
         */
        if (
          location.pathname ===
          '/notifications'
        ) {
          setTimeout(() => {
            markAllAsRead();
          }, 0);

          return;
        }

        /*
         * Otherwise increment the badge.
         */
        setUnreadCount(
          (previous) =>
            Math.max(
              0,
              Number(previous) + 1
            )
        );
      };

    socket.on(
      'notification',
      handleNotification
    );

    return () => {
      socket.off(
        'notification',
        handleNotification
      );
    };
  }, [
    socket,
    isAuthenticated,
    location.pathname,
    markAllAsRead
  ]);

  /**
   * Mark one notification as read.
   */
  const markAsRead =
    useCallback(
      async (notificationId) => {
        if (
          !notificationId
        ) {
          return;
        }

        let wasUnread =
          false;

        setNotifications(
          (previous) =>
            previous.map(
              (notification) => {
                if (
                  String(
                    notification._id
                  ) !==
                  String(
                    notificationId
                  )
                ) {
                  return notification;
                }

                wasUnread =
                  notification.read !==
                  true;

                return {
                  ...notification,
                  read: true,
                  readAt:
                    notification.readAt ||
                    new Date().toISOString()
                };
              }
            )
        );

        /*
         * Optimistically reduce the badge.
         */
        if (wasUnread) {
          setUnreadCount(
            (previous) =>
              Math.max(
                0,
                Number(previous) - 1
              )
          );
        }

        try {
          await apiClient.patch(
            `/notifications/${encodeURIComponent(
              notificationId
            )}/read`
          );
        } catch (error) {
          console.error(
            'Failed to mark notification as read:',
            error?.response?.data ||
              error.message
          );

          /*
           * Restore server state.
           */
          await loadNotifications(
            1,
            false
          );
        }
      },
      [
        loadNotifications
      ]
    );

  /**
   * Delete notification.
   */
  const deleteNotification =
    useCallback(
      async (notificationId) => {
        if (
          !notificationId
        ) {
          return;
        }

        const target =
          notifications.find(
            (item) =>
              String(item._id) ===
              String(
                notificationId
              )
          );

        try {
          await apiClient.delete(
            `/notifications/${encodeURIComponent(
              notificationId
            )}`
          );

          setNotifications(
            (previous) =>
              previous.filter(
                (item) =>
                  String(
                    item._id
                  ) !==
                  String(
                    notificationId
                  )
              )
          );

          if (
            target &&
            target.read !== true
          ) {
            setUnreadCount(
              (previous) =>
                Math.max(
                  0,
                  Number(previous) - 1
                )
            );
          }
        } catch (error) {
          console.error(
            'Failed to delete notification:',
            error?.response?.data ||
              error.message
          );
        }
      },
      [notifications]
    );

  /**
   * Delete all read notifications.
   */
  const deleteReadNotifications =
    useCallback(
      async () => {
        try {
          await apiClient.delete(
            '/notifications/read'
          );

          setNotifications(
            (previous) =>
              previous.filter(
                (notification) =>
                  notification.read !==
                  true
              )
          );
        } catch (error) {
          console.error(
            'Failed to delete read notifications:',
            error?.response?.data ||
              error.message
          );
        }
      },
      []
    );

  /**
   * Load next page.
   */
  const loadMore =
    useCallback(
      async () => {
        if (
          loadingMore ||
          !hasNextPage
        ) {
          return;
        }

        await loadNotifications(
          page + 1,
          true
        );
      },
      [
        loadingMore,
        hasNextPage,
        page,
        loadNotifications
      ]
    );

  /**
   * Refresh notifications.
   */
  const refreshNotifications =
    useCallback(
      async () => {
        await loadNotifications(
          1,
          false
        );
      },
      [loadNotifications]
    );

  const value =
    useMemo(
      () => ({
        notifications,

        unreadNotifications:
          notifications.filter(
            (notification) =>
              notification.read !==
              true
          ),

        unreadCount,

        /*
         * Backward-compatible alias.
         */
        unreadNotificationCount:
          unreadCount,

        loading,
        loadingMore,

        page,
        hasNextPage,

        isConnected:
          socket?.connected ||
          false,

        loadNotifications,
        loadMore,
        refreshNotifications,

        markAsRead,
        markAllAsRead,

        deleteNotification,
        deleteReadNotifications
      }),
      [
        notifications,
        unreadCount,
        loading,
        loadingMore,
        page,
        hasNextPage,
        socket,
        loadNotifications,
        loadMore,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteReadNotifications
      ]
    );

  return (
    <NotificationContext.Provider
      value={value}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context =
    useContext(
      NotificationContext
    );

  if (!context) {
    throw new Error(
      'useNotifications must be used inside NotificationProvider'
    );
  }

  return context;
}

export default NotificationContext;