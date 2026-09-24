import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';

import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

/*
|--------------------------------------------------------------------------
| SOCKET.IO URL
|--------------------------------------------------------------------------
|
| Desktop:
|   http://localhost:5173
|   -> http://localhost:5000
|
| Phone:
|   http://192.168.1.10:5173
|   -> http://192.168.1.10:5000
|
| This prevents "localhost" from pointing back to the phone itself.
|--------------------------------------------------------------------------
*/

const getSocketURL = () => {
  const browserHostname =
    typeof window !== 'undefined'
      ? window.location.hostname
      : 'localhost';

  const browserProtocol =
    typeof window !== 'undefined'
      ? window.location.protocol
      : 'http:';

  /*
   * Explicit VITE_SOCKET_URL can still be used.
   */
  const configuredURL =
    import.meta.env.VITE_SOCKET_URL?.trim();

  if (configuredURL) {
    try {
      const configured = new URL(
        configuredURL
      );

      /*
       * If the environment variable points to localhost
       * but the application is being opened from another
       * device, replace localhost with the browser hostname.
       *
       * This fixes the common phone-testing problem where:
       *
       * VITE_SOCKET_URL=http://localhost:5000
       *
       * works on PC but fails on phone.
       */
      const isLocalConfiguredHost =
        configured.hostname ===
          'localhost' ||
        configured.hostname ===
          '127.0.0.1' ||
        configured.hostname === '0.0.0.0';

      const isRemoteBrowser =
        browserHostname !== 'localhost' &&
        browserHostname !== '127.0.0.1';

      if (
        isLocalConfiguredHost &&
        isRemoteBrowser
      ) {
        configured.hostname =
          browserHostname;

        return configured.toString().replace(
          /\/$/,
          ''
        );
      }

      return configuredURL.replace(
        /\/$/,
        ''
      );
    } catch (error) {
      console.warn(
        '⚠️ Invalid VITE_SOCKET_URL. Falling back to dynamic Socket.IO URL.',
        error
      );
    }
  }

  /*
   * Dynamic local-network URL.
   *
   * Port 5000 is the backend Socket.IO port.
   */
  return `${browserProtocol}//${browserHostname}:5000`;
};

/*
|--------------------------------------------------------------------------
| NORMALIZE JWT
|--------------------------------------------------------------------------
*/

const normalizeToken = (value) => {
  if (
    !value ||
    typeof value !== 'string'
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  if (!trimmed) {
    return null;
  }

  if (
    trimmed
      .toLowerCase()
      .startsWith('bearer ')
  ) {
    return trimmed
      .slice(7)
      .trim();
  }

  return trimmed;
};

/*
|--------------------------------------------------------------------------
| SOCKET PROVIDER
|--------------------------------------------------------------------------
*/

export const SocketProvider = ({
  children,
  token: propToken,
}) => {
  const {
    token: authContextToken,
    isAuthenticated,
  } = useAuth();

  // ============================================================
  // STATE
  // ============================================================

  const [socket, setSocket] =
    useState(null);

  const [isConnected, setIsConnected] =
    useState(false);

  const [onlineUsers, setOnlineUsers] =
    useState({});

  const [messages, setMessages] =
    useState([]);

  const [typingUsers, setTypingUsers] =
    useState({});

  // ============================================================
  // REFS
  // ============================================================

  const socketRef =
    useRef(null);

  const joinedRoomRef =
    useRef(null);

  const pendingRoomRef =
    useRef(null);

  const tokenRef =
    useRef(null);

  const connectionGenerationRef =
    useRef(0);

  const authenticationFailedRef =
    useRef(false);

  // ============================================================
  // CURRENT TOKEN
  // ============================================================

  const getCurrentToken =
    useCallback(() => {
      const contextToken =
        normalizeToken(
          authContextToken
        );

      if (contextToken) {
        return contextToken;
      }

      const passedToken =
        normalizeToken(
          propToken
        );

      if (passedToken) {
        return passedToken;
      }

      if (
        typeof window !==
        'undefined'
      ) {
        const storedToken =
          normalizeToken(
            localStorage.getItem(
              'eazy_check_token'
            )
          );

        if (storedToken) {
          return storedToken;
        }

        /*
         * Compatibility fallback.
         */
        const legacyToken =
          normalizeToken(
            localStorage.getItem(
              'token'
            )
          );

        if (legacyToken) {
          return legacyToken;
        }
      }

      return null;
    }, [
      authContextToken,
      propToken,
    ]);

  // ============================================================
  // TOKEN REF
  // ============================================================

  useEffect(() => {
    tokenRef.current =
      getCurrentToken();
  }, [
    getCurrentToken,
  ]);

  // ============================================================
  // DESTROY SOCKET
  // ============================================================

  const destroySocket =
    useCallback(
      (socketInstance) => {
        if (!socketInstance) {
          return;
        }

        try {
          socketInstance.io.opts.reconnection =
            false;

          socketInstance.removeAllListeners();

          socketInstance.io.removeAllListeners();

          if (
            socketInstance.connected ||
            socketInstance.active
          ) {
            socketInstance.disconnect();
          }
        } catch (error) {
          console.warn(
            '⚠️ Error while destroying Socket.IO connection:',
            error
          );
        }
      },
      []
    );

  // ============================================================
  // SOCKET CONNECTION
  // ============================================================

  useEffect(() => {
    const authToken =
      getCurrentToken();

    tokenRef.current =
      authToken;

    const generation =
      connectionGenerationRef.current +
      1;

    connectionGenerationRef.current =
      generation;

    authenticationFailedRef.current =
      false;

    /*
     * Calculate the URL at runtime.
     *
     * This is important because window.location.hostname
     * is different on the PC and phone.
     */
    const socketURL =
      getSocketURL();

    console.log(
      '🌐 Socket.IO target:',
      socketURL
    );

    // ==========================================================
    // NO AUTHENTICATION
    // ==========================================================

    if (
      !isAuthenticated ||
      !authToken
    ) {
      console.log(
        '🔐 No valid authentication session. Socket.IO will remain disconnected.'
      );

      const existingSocket =
        socketRef.current;

      if (existingSocket) {
        destroySocket(
          existingSocket
        );

        socketRef.current =
          null;
      }

      setSocket(null);
      setIsConnected(false);
      setOnlineUsers({});
      setTypingUsers({});
      setMessages([]);

      joinedRoomRef.current =
        null;

      pendingRoomRef.current =
        null;

      return undefined;
    }

    // ==========================================================
    // CLOSE PREVIOUS SOCKET
    // ==========================================================

    const previousSocket =
      socketRef.current;

    if (previousSocket) {
      console.log(
        '🔄 Closing previous Socket.IO connection...'
      );

      destroySocket(
        previousSocket
      );

      socketRef.current =
        null;
    }

    // ==========================================================
    // CREATE SOCKET
    // ==========================================================

    const socketInstance =
      io(socketURL, {
        auth: {
          token: authToken,
        },

        transports: [
          'polling',
          'websocket',
        ],

        withCredentials: true,

        autoConnect: false,

        reconnection: true,

        reconnectionAttempts:
          Infinity,

        reconnectionDelay:
          1000,

        reconnectionDelayMax:
          5000,

        randomizationFactor:
          0.5,

        timeout: 15000,

        upgrade: true,
      });

    socketRef.current =
      socketInstance;

    setSocket(
      socketInstance
    );

    // ==========================================================
    // CONNECT
    // ==========================================================

    const handleConnect =
      () => {
        if (
          socketRef.current !==
            socketInstance ||
          connectionGenerationRef.current !==
            generation
        ) {
          return;
        }

        authenticationFailedRef.current =
          false;

        console.log(
          '⚡ Socket.IO connected:',
          socketInstance.id
        );

        console.log(
          '🌐 Socket.IO server:',
          socketURL
        );

        setIsConnected(true);

        /*
         * Clear stale online status.
         *
         * The server will send fresh status events.
         */
        setOnlineUsers(
          (previous) => ({
            ...previous,
          })
        );

        // ------------------------------------------------------
        // REJOIN PENDING ROOM
        // ------------------------------------------------------

        if (
          pendingRoomRef.current
        ) {
          const pendingRoomId =
            pendingRoomRef.current;

          console.log(
            '📦 Joining queued room:',
            pendingRoomId
          );

          if (
            joinedRoomRef.current &&
            joinedRoomRef.current !==
              pendingRoomId
          ) {
            socketInstance.emit(
              'leave_room',
              {
                roomId:
                  joinedRoomRef.current,
              }
            );
          }

          socketInstance.emit(
            'join_room',
            {
              roomId:
                pendingRoomId,
            }
          );

          joinedRoomRef.current =
            pendingRoomId;

          pendingRoomRef.current =
            null;

          return;
        }

        // ------------------------------------------------------
        // REJOIN PREVIOUS ROOM
        // ------------------------------------------------------

        if (
          joinedRoomRef.current
        ) {
          console.log(
            '🔄 Rejoining room:',
            joinedRoomRef.current
          );

          socketInstance.emit(
            'join_room',
            {
              roomId:
                joinedRoomRef.current,
            }
          );
        }
      };

    // ==========================================================
    // DISCONNECT
    // ==========================================================

    const handleDisconnect =
      (reason) => {
        if (
          socketRef.current !==
            socketInstance ||
          connectionGenerationRef.current !==
            generation
        ) {
          return;
        }

        console.log(
          '🔌 Socket.IO disconnected:',
          reason
        );

        setIsConnected(false);
      };

    // ==========================================================
    // CONNECTION ERROR
    // ==========================================================

    const handleConnectError =
      (error) => {
        if (
          socketRef.current !==
            socketInstance ||
          connectionGenerationRef.current !==
            generation
        ) {
          return;
        }

        const message =
          error?.message ||
          'Unknown Socket.IO connection error';

        console.warn(
          '⚠️ Socket.IO connection error:',
          message
        );

        console.warn(
          '🌐 Socket.IO URL:',
          socketURL
        );

        setIsConnected(false);

        const isAuthenticationError =
          /invalid.*token/i.test(
            message
          ) ||
          /expired.*token/i.test(
            message
          ) ||
          /authentication/i.test(
            message
          ) ||
          /unauthorized/i.test(
            message
          ) ||
          /jwt/i.test(
            message
          );

        if (
          isAuthenticationError
        ) {
          authenticationFailedRef.current =
            true;

          socketInstance.io.opts.reconnection =
            false;

          console.error(
            '🔐 Socket authentication failed. Automatic reconnection disabled.'
          );

          destroySocket(
            socketInstance
          );

          if (
            socketRef.current ===
            socketInstance
          ) {
            socketRef.current =
              null;

            setSocket(null);
            setIsConnected(false);
          }
        }
      };

    // ==========================================================
    // RECONNECT ATTEMPT
    // ==========================================================

    const handleReconnectAttempt =
      (attempt) => {
        if (
          authenticationFailedRef.current
        ) {
          return;
        }

        console.log(
          `🔄 Socket.IO reconnect attempt #${attempt}`
        );
      };

    // ==========================================================
    // RECONNECTED
    // ==========================================================

    const handleReconnect =
      (attempt) => {
        if (
          socketRef.current !==
            socketInstance ||
          connectionGenerationRef.current !==
            generation ||
          authenticationFailedRef.current
        ) {
          return;
        }

        console.log(
          `✅ Socket.IO reconnected after ${attempt} attempt(s):`,
          socketInstance.id
        );

        setIsConnected(true);

        // ------------------------------------------------------
        // PENDING ROOM
        // ------------------------------------------------------

        if (
          pendingRoomRef.current
        ) {
          const pendingRoomId =
            pendingRoomRef.current;

          if (
            joinedRoomRef.current &&
            joinedRoomRef.current !==
              pendingRoomId
          ) {
            socketInstance.emit(
              'leave_room',
              {
                roomId:
                  joinedRoomRef.current,
              }
            );
          }

          socketInstance.emit(
            'join_room',
            {
              roomId:
                pendingRoomId,
            }
          );

          joinedRoomRef.current =
            pendingRoomId;

          pendingRoomRef.current =
            null;

          return;
        }

        // ------------------------------------------------------
        // PREVIOUS ROOM
        // ------------------------------------------------------

        if (
          joinedRoomRef.current
        ) {
          socketInstance.emit(
            'join_room',
            {
              roomId:
                joinedRoomRef.current,
            }
          );
        }
      };

    // ==========================================================
    // RECONNECT ERROR
    // ==========================================================

    const handleReconnectError =
      (error) => {
        console.warn(
          '⚠️ Socket.IO reconnection error:',
          error?.message ||
            error
        );
      };

    // ==========================================================
    // RECONNECT FAILED
    // ==========================================================

    const handleReconnectFailed =
      () => {
        console.warn(
          '⚠️ Socket.IO reconnection failed.'
        );

        if (
          socketRef.current ===
            socketInstance &&
          connectionGenerationRef.current ===
            generation
        ) {
          setIsConnected(false);
        }
      };

    // ==========================================================
    // ONLINE USER STATUS
    // ==========================================================

    const handleUserOnlineStatus =
      (payload = {}) => {
        const {
          userId,
          isOnline,
        } = payload;

        if (!userId) {
          return;
        }

        const normalizedUserId =
          String(userId);

        console.log(
          '👤 User online status:',
          normalizedUserId,
          Boolean(isOnline)
        );

        setOnlineUsers(
          (previous) => ({
            ...previous,

            [normalizedUserId]:
              Boolean(isOnline),
          })
        );
      };

    // ==========================================================
    // ONLINE USERS LIST
    // ==========================================================
    /*
     * Some Socket.IO backends send the complete online-user
     * list when a client connects instead of individual
     * user_online_status events.
     *
     * Supporting both formats makes the client much more
     * reliable.
     */

    const handleOnlineUsers =
      (payload) => {
        let users =
          payload;

        if (
          payload &&
          !Array.isArray(payload) &&
          Array.isArray(
            payload.users
          )
        ) {
          users =
            payload.users;
        }

        if (
          !Array.isArray(users)
        ) {
          return;
        }

        const normalized = {};

        users.forEach(
          (userId) => {
            if (
              userId &&
              typeof userId ===
                'object'
            ) {
              const id =
                userId._id ||
                userId.id ||
                userId.userId;

              if (id) {
                normalized[
                  String(id)
                ] = true;
              }

              return;
            }

            normalized[
              String(userId)
            ] = true;
          }
        );

        setOnlineUsers(
          (previous) => ({
            ...previous,
            ...normalized,
          })
        );
      };

    // ==========================================================
    // ROOM MESSAGE
    // ==========================================================

    const handleRoomMessage =
      (newMessage) => {
        if (!newMessage) {
          return;
        }

        setMessages(
          (previous) => [
            ...previous,
            newMessage,
          ]
        );
      };

    // ==========================================================
    // DIRECT MESSAGE
    // ==========================================================

    const handleDirectMessage =
      (newMessage) => {
        if (!newMessage) {
          return;
        }

        setMessages(
          (previous) => [
            ...previous,
            newMessage,
          ]
        );
      };

    // ==========================================================
    // DIRECT MESSAGE SENT
    // ==========================================================

    const handleDirectMessageSent =
      (newMessage) => {
        if (!newMessage) {
          return;
        }

        setMessages(
          (previous) => [
            ...previous,
            newMessage,
          ]
        );
      };

    // ==========================================================
    // TYPING
    // ==========================================================

    const handleUserTyping =
      ({
        userId,
        username,
        isTyping,
        roomId,
        recipientId,
      } = {}) => {
        if (!userId) {
          return;
        }

        const normalizedUserId =
          String(userId);

        let key;

        if (roomId) {
          key =
            `room_${String(
              roomId
            )}`;
        } else if (
          recipientId
        ) {
          key =
            `dm_${String(
              recipientId
            )}`;
        } else {
          key =
            `dm_${normalizedUserId}`;
        }

        setTypingUsers(
          (previous) => {
            const updated = {
              ...previous,
            };

            if (isTyping) {
              updated[key] = {
                userId:
                  normalizedUserId,

                username:
                  username ||
                  'Someone',
              };
            } else {
              delete updated[key];
            }

            return updated;
          }
        );
      };

    // ==========================================================
    // SERVER ERROR
    // ==========================================================

    const handleSocketError =
      (error) => {
        console.error(
          '❌ Socket server error:',
          error
        );
      };

    // ==========================================================
    // CHAT ERROR
    // ==========================================================

    const handleChatError =
      (error) => {
        console.error(
          '❌ Chat socket error:',
          error
        );
      };

    // ==========================================================
    // REGISTER SOCKET EVENTS
    // ==========================================================

    socketInstance.on(
      'connect',
      handleConnect
    );

    socketInstance.on(
      'disconnect',
      handleDisconnect
    );

    socketInstance.on(
      'connect_error',
      handleConnectError
    );

    socketInstance.io.on(
      'reconnect_attempt',
      handleReconnectAttempt
    );

    socketInstance.io.on(
      'reconnect',
      handleReconnect
    );

    socketInstance.io.on(
      'reconnect_error',
      handleReconnectError
    );

    socketInstance.io.on(
      'reconnect_failed',
      handleReconnectFailed
    );

    socketInstance.on(
      'user_online_status',
      handleUserOnlineStatus
    );

    /*
     * Support alternate event names if the backend
     * provides a complete online-user list.
     */
    socketInstance.on(
      'online_users',
      handleOnlineUsers
    );

    socketInstance.on(
      'online_users_list',
      handleOnlineUsers
    );

    socketInstance.on(
      'receive_room_message',
      handleRoomMessage
    );

    socketInstance.on(
      'receive_direct_message',
      handleDirectMessage
    );

    socketInstance.on(
      'direct_message_sent',
      handleDirectMessageSent
    );

    socketInstance.on(
      'user_typing',
      handleUserTyping
    );

    socketInstance.on(
      'error',
      handleSocketError
    );

    socketInstance.on(
      'chat_error',
      handleChatError
    );

    // ==========================================================
    // CONNECT
    // ==========================================================

    console.log(
      '🚀 Starting Socket.IO connection...'
    );

    socketInstance.connect();

    // ==========================================================
    // CLEANUP
    // ==========================================================

    return () => {
      console.log(
        '🧹 Cleaning up Socket.IO connection...'
      );

      pendingRoomRef.current =
        null;

      if (
        socketRef.current ===
        socketInstance
      ) {
        socketRef.current =
          null;

        setSocket(null);
        setIsConnected(false);
      }

      destroySocket(
        socketInstance
      );
    };
  }, [
    getCurrentToken,
    isAuthenticated,
    destroySocket,
  ]);

  // ============================================================
  // JOIN ROOM
  // ============================================================

  const joinRoom =
    useCallback(
      (roomId) => {
        if (!roomId) {
          console.warn(
            '⚠️ Cannot join room: roomId is missing.'
          );

          return false;
        }

        const normalizedRoomId =
          String(roomId);

        const activeSocket =
          socketRef.current;

        if (
          !activeSocket ||
          !activeSocket.connected
        ) {
          pendingRoomRef.current =
            normalizedRoomId;

          console.log(
            '📦 Queueing room join:',
            normalizedRoomId
          );

          return true;
        }

        if (
          joinedRoomRef.current ===
          normalizedRoomId
        ) {
          pendingRoomRef.current =
            null;

          return true;
        }

        pendingRoomRef.current =
          null;

        if (
          joinedRoomRef.current
        ) {
          activeSocket.emit(
            'leave_room',
            {
              roomId:
                joinedRoomRef.current,
            }
          );
        }

        activeSocket.emit(
          'join_room',
          {
            roomId:
              normalizedRoomId,
          }
        );

        joinedRoomRef.current =
          normalizedRoomId;

        console.log(
          '🏠 Joining chat room:',
          normalizedRoomId
        );

        return true;
      },
      []
    );

  // ============================================================
  // LEAVE ROOM
  // ============================================================

  const leaveRoom =
    useCallback(
      (roomId) => {
        if (!roomId) {
          return false;
        }

        const normalizedRoomId =
          String(roomId);

        if (
          pendingRoomRef.current ===
          normalizedRoomId
        ) {
          pendingRoomRef.current =
            null;
        }

        const activeSocket =
          socketRef.current;

        if (
          !activeSocket ||
          !activeSocket.connected
        ) {
          if (
            joinedRoomRef.current ===
            normalizedRoomId
          ) {
            joinedRoomRef.current =
              null;
          }

          return true;
        }

        activeSocket.emit(
          'leave_room',
          {
            roomId:
              normalizedRoomId,
          }
        );

        if (
          joinedRoomRef.current ===
          normalizedRoomId
        ) {
          joinedRoomRef.current =
            null;
        }

        console.log(
          '🚪 Leaving chat room:',
          normalizedRoomId
        );

        return true;
      },
      []
    );

  // ============================================================
  // SEND ROOM MESSAGE
  // ============================================================

  const sendRoomMessage =
    useCallback(
      (
        roomId,
        message,
        attachments = []
      ) => {
        const activeSocket =
          socketRef.current;

        if (
          !activeSocket ||
          !activeSocket.connected
        ) {
          console.warn(
            '⚠️ Cannot send room message: Socket is not connected.'
          );

          return false;
        }

        if (!roomId) {
          return false;
        }

        const normalizedMessage =
          typeof message ===
          'string'
            ? message.trim()
            : '';

        const normalizedAttachments =
          Array.isArray(
            attachments
          )
            ? attachments
            : [];

        if (
          !normalizedMessage &&
          normalizedAttachments.length ===
            0
        ) {
          return false;
        }

        activeSocket.emit(
          'send_room_message',
          {
            roomId:
              String(roomId),

            message:
              normalizedMessage,

            attachments:
              normalizedAttachments,
          }
        );

        return true;
      },
      []
    );

  // ============================================================
  // SEND DIRECT MESSAGE
  // ============================================================

  const sendDirectMessage =
    useCallback(
      (
        recipientId,
        message,
        attachments = []
      ) => {
        const activeSocket =
          socketRef.current;

        if (
          !activeSocket ||
          !activeSocket.connected
        ) {
          console.warn(
            '⚠️ Cannot send direct message: Socket is not connected.'
          );

          return false;
        }

        if (!recipientId) {
          return false;
        }

        const normalizedMessage =
          typeof message ===
          'string'
            ? message.trim()
            : '';

        const normalizedAttachments =
          Array.isArray(
            attachments
          )
            ? attachments
            : [];

        if (
          !normalizedMessage &&
          normalizedAttachments.length ===
            0
        ) {
          return false;
        }

        activeSocket.emit(
          'send_direct_message',
          {
            recipientId:
              String(recipientId),

            message:
              normalizedMessage,

            attachments:
              normalizedAttachments,
          }
        );

        return true;
      },
      []
    );

  // ============================================================
  // TYPING INDICATOR
  // ============================================================

  const emitTyping =
    useCallback(
      ({
        roomId = null,
        recipientId = null,
        isTyping = false,
      } = {}) => {
        const activeSocket =
          socketRef.current;

        if (
          !activeSocket ||
          !activeSocket.connected
        ) {
          return;
        }

        const eventName =
          isTyping
            ? 'typing_start'
            : 'typing_stop';

        activeSocket.emit(
          eventName,
          {
            roomId: roomId
              ? String(roomId)
              : null,

            recipientId:
              recipientId
                ? String(
                    recipientId
                  )
                : null,
          }
        );
      },
      []
    );

  // ============================================================
  // CLEAR MESSAGES
  // ============================================================

  const clearMessages =
    useCallback(() => {
      setMessages([]);
    }, []);

  // ============================================================
  // CLEAR TYPING USERS
  // ============================================================

  const clearTypingUsers =
    useCallback(() => {
      setTypingUsers({});
    }, []);

  // ============================================================
  // CONTEXT VALUE
  // ============================================================

  const value = {
    socket,

    isConnected,

    connected:
      isConnected,

    onlineUsers,

    messages,

    typingUsers,

    joinRoom,
    leaveRoom,

    sendRoomMessage,
    sendDirectMessage,

    emitTyping,

    clearMessages,
    clearTypingUsers,
  };

  return (
    <SocketContext.Provider
      value={value}
    >
      {children}
    </SocketContext.Provider>
  );
};

// ============================================================
// USE SOCKET
// ============================================================

export const useSocket = () => {
  const context =
    useContext(
      SocketContext
    );

  if (!context) {
    throw new Error(
      'useSocket must be used within a SocketProvider'
    );
  }

  return context;
};

export default SocketContext;