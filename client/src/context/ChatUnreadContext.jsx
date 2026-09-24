import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import apiClient from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const ChatUnreadContext = createContext(null);

export function ChatUnreadProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket();

  const [roomUnreadCounts, setRoomUnreadCounts] = useState({});
  const [directUnreadCounts, setDirectUnreadCounts] = useState({});
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(false);

  /*
   * Keep the latest state in refs.
   *
   * This prevents async mark-as-read operations from using
   * stale state when several messages arrive quickly.
   */
  const roomUnreadCountsRef = useRef({});
  const directUnreadCountsRef = useRef({});
  const totalUnreadMessagesRef = useRef(0);

  useEffect(() => {
    roomUnreadCountsRef.current = roomUnreadCounts;
  }, [roomUnreadCounts]);

  useEffect(() => {
    directUnreadCountsRef.current = directUnreadCounts;
  }, [directUnreadCounts]);

  useEffect(() => {
    totalUnreadMessagesRef.current = totalUnreadMessages;
  }, [totalUnreadMessages]);

  /**
   * Reset all counts.
   */
  const clearUnreadCounts = useCallback(() => {
    roomUnreadCountsRef.current = {};
    directUnreadCountsRef.current = {};
    totalUnreadMessagesRef.current = 0;

    setRoomUnreadCounts({});
    setDirectUnreadCounts({});
    setTotalUnreadMessages(0);
  }, []);

  /**
   * Load unread counts from MongoDB.
   *
   * MongoDB/read_by remains the source of truth.
   */
  const refreshUnreadCounts = useCallback(async () => {
    if (!isAuthenticated || !user) {
      clearUnreadCounts();
      return;
    }

    try {
      setLoading(true);

      const response = await apiClient.get('/chat/unread-counts');

      const root = response?.data || {};
      const data = root.data || root;

      const total = Number(data.totalUnread) || 0;
      const rooms = Array.isArray(data.rooms)
        ? data.rooms
        : [];

      const roomMap = {};
      const directMap = {};

      rooms.forEach((item) => {
        const count = Number(item.unreadCount) || 0;

        if (!count) {
          return;
        }

        if (item.roomId) {
          roomMap[String(item.roomId)] = count;
        }

        if (item.recipientId) {
          directMap[String(item.recipientId)] = count;
        }
      });

      roomUnreadCountsRef.current = roomMap;
      directUnreadCountsRef.current = directMap;
      totalUnreadMessagesRef.current = total;

      setRoomUnreadCounts(roomMap);
      setDirectUnreadCounts(directMap);
      setTotalUnreadMessages(total);
    } catch (error) {
      console.error(
        'Failed to load unread message counts:',
        error?.response?.data || error.message
      );
    } finally {
      setLoading(false);
    }
  }, [
    isAuthenticated,
    user,
    clearUnreadCounts
  ]);

  /**
   * Get unread count for a room.
   */
  const getRoomUnreadCount = useCallback(
    (roomId) => {
      if (!roomId) {
        return 0;
      }

      return (
        Number(
          roomUnreadCountsRef.current[String(roomId)]
        ) || 0
      );
    },
    []
  );

  /**
   * Get unread count for a direct conversation.
   */
  const getDirectUnreadCount = useCallback(
    (recipientId) => {
      if (!recipientId) {
        return 0;
      }

      return (
        Number(
          directUnreadCountsRef.current[
            String(recipientId)
          ]
        ) || 0
      );
    },
    []
  );

  /**
   * Mark one room/conversation as read.
   *
   * MongoDB is the final authority.
   */
  const markRoomAsRead = useCallback(
    async (roomId) => {
      if (
        !roomId ||
        !isAuthenticated ||
        !user
      ) {
        return;
      }

      const key = String(roomId);

      const previousRoomCount =
        Number(
          roomUnreadCountsRef.current[key]
        ) || 0;

      /*
       * Optimistically remove the room badge.
       */
      if (previousRoomCount > 0) {
        const nextRooms = {
          ...roomUnreadCountsRef.current
        };

        delete nextRooms[key];

        roomUnreadCountsRef.current = nextRooms;

        setRoomUnreadCounts(nextRooms);

        /*
         * Temporarily reduce total.
         */
        const optimisticTotal = Math.max(
          0,
          Number(
            totalUnreadMessagesRef.current
          ) - previousRoomCount
        );

        totalUnreadMessagesRef.current =
          optimisticTotal;

        setTotalUnreadMessages(
          optimisticTotal
        );
      }

      try {
        const response =
          await apiClient.patch(
            `/chat/rooms/${encodeURIComponent(
              roomId
            )}/read`
          );

        const root =
          response?.data || {};

        const data =
          root.data || root;

        const serverRoomUnread =
          Number(data.unreadCount) || 0;

        const serverTotalUnread =
          Number(data.totalUnread);

        /*
         * Update room count from server.
         */
        const nextRooms = {
          ...roomUnreadCountsRef.current
        };

        if (serverRoomUnread > 0) {
          nextRooms[key] =
            serverRoomUnread;
        } else {
          delete nextRooms[key];
        }

        roomUnreadCountsRef.current =
          nextRooms;

        setRoomUnreadCounts(
          nextRooms
        );

        /*
         * IMPORTANT:
         *
         * A direct conversation may be represented in
         * directUnreadCounts rather than roomUnreadCounts.
         *
         * If the backend provides recipientId, remove it
         * immediately.
         */
        if (data.recipientId) {
          const recipientKey =
            String(data.recipientId);

          const nextDirect = {
            ...directUnreadCountsRef.current
          };

          delete nextDirect[recipientKey];

          directUnreadCountsRef.current =
            nextDirect;

          setDirectUnreadCounts(
            nextDirect
          );
        }

        /*
         * If the server gives us the authoritative total,
         * always use it.
         */
        if (
          Number.isFinite(
            serverTotalUnread
          )
        ) {
          totalUnreadMessagesRef.current =
            Math.max(
              0,
              serverTotalUnread
            );

          setTotalUnreadMessages(
            Math.max(
              0,
              serverTotalUnread
            )
          );
        } else {
          /*
           * Otherwise reload the complete
           * unread state from MongoDB.
           */
          await refreshUnreadCounts();
        }

        /*
         * Keep Socket.IO state synchronized.
         */
        if (socket?.connected) {
          socket.emit(
            'mark_messages_read',
            {
              roomId
            }
          );
        }
      } catch (error) {
        console.error(
          'Failed to mark messages as read:',
          error?.response?.data ||
            error.message
        );

        /*
         * If the request failed, restore the
         * authoritative server state.
         */
        await refreshUnreadCounts();
      }
    },
    [
      isAuthenticated,
      user,
      socket,
      refreshUnreadCounts
    ]
  );

  /**
   * Initial load.
   */
  useEffect(() => {
    if (
      !isAuthenticated ||
      !user
    ) {
      clearUnreadCounts();
      return;
    }

    refreshUnreadCounts();
  }, [
    isAuthenticated,
    user,
    refreshUnreadCounts,
    clearUnreadCounts
  ]);

  /**
   * New socket notification.
   *
   * A message notification means MongoDB may now contain
   * a new unread message, so reload the authoritative counts.
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
        const type =
          notification?.type;

        if (
          type === 'message' ||
          type === 'room_message'
        ) {
          refreshUnreadCounts();
        }
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
    refreshUnreadCounts
  ]);

  /**
   * Refresh after Socket.IO reconnects.
   */
  useEffect(() => {
    if (
      !socket ||
      !isAuthenticated
    ) {
      return undefined;
    }

    const handleConnect =
      () => {
        refreshUnreadCounts();
      };

    socket.on(
      'connect',
      handleConnect
    );

    return () => {
      socket.off(
        'connect',
        handleConnect
      );
    };
  }, [
    socket,
    isAuthenticated,
    refreshUnreadCounts
  ]);

  const value = useMemo(
    () => ({
      roomUnreadCounts,
      directUnreadCounts,

      totalUnreadMessages,

      /*
       * Backward-compatible alias.
       */
      unreadMessages:
        totalUnreadMessages,

      loading,

      getRoomUnreadCount,
      getDirectUnreadCount,

      markRoomAsRead,

      refreshUnreadCounts,

      clearUnreadCounts
    }),
    [
      roomUnreadCounts,
      directUnreadCounts,
      totalUnreadMessages,
      loading,
      getRoomUnreadCount,
      getDirectUnreadCount,
      markRoomAsRead,
      refreshUnreadCounts,
      clearUnreadCounts
    ]
  );

  return (
    <ChatUnreadContext.Provider
      value={value}
    >
      {children}
    </ChatUnreadContext.Provider>
  );
}

export function useChatUnread() {
  const context =
    useContext(
      ChatUnreadContext
    );

  if (!context) {
    throw new Error(
      'useChatUnread must be used inside ChatUnreadProvider'
    );
  }

  return context;
}

export default ChatUnreadContext;