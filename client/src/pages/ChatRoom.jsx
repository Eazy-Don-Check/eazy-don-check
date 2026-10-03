import React, {
  useState,
  useEffect,
  useRef,
  useCallback
} from 'react';

import {
  useParams,
  useNavigate,
  useLocation
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useChatUnread } from '../context/ChatUnreadContext';

import Sidebar from '../components/layout/Sidebar';
import apiClient from '../utils/apiClient';
import DirectCallOverlay from '../components/chat/DirectCallOverlay';

import {
  Send,
  Hash,
  MessageSquare,
  UserCheck,
  Loader2,
  Plus,
  X,
  Lock,
  Globe,
  Paperclip,
  Search,
  Users,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  UserPlus,
  LogOut,
  Wifi,
  WifiOff,
  Smile,
  Mic,
  Phone,
  Video,
  Square,
  Trash2,
  Pencil,
  MoreVertical,
  Reply,
  Megaphone,
  ShoppingBag,
  CalendarDays,
  Palette,
  Printer,
  Music,
  Film,
  BriefcaseBusiness,
  BookOpen,
  Heart,
  Trophy,
  Gamepad2,
  Newspaper,
  Bell,
  HelpCircle,
  MessageCircle,
  Utensils,
  Plane,
  Camera,
  Dumbbell,
  Church,
  Laptop,
  WalletCards,
  Settings,
  Play,
  Pause
} from 'lucide-react';


export default function ChatRoom() {

  const { user, token } = useAuth();

  const {
    socket,
    isConnected
  } = useSocket();

  const {
    getRoomUnreadCount,
    getDirectUnreadCount,
    markRoomAsRead,
    refreshUnreadCounts
  } = useChatUnread();

  const { roomSlug } = useParams();

  const navigate = useNavigate();
  const location = useLocation();


  // =========================================================
  // ROOM / USER STATE
  // =========================================================

  const [rooms, setRooms] = useState([]);

  const [usersList, setUsersList] =
    useState([]);

  const [activeRoom, setActiveRoom] =
    useState(null);

  const [activeRecipient, setActiveRecipient] =
    useState(null);

  const [chatMode, setChatMode] =
    useState(
      location.pathname.startsWith('/messages')
        ? 'direct'
        : 'room'
    );

  const [messages, setMessages] =
    useState([]);


  // =========================================================
  // LOADING
  // =========================================================

  const [isLoadingRooms, setIsLoadingRooms] =
    useState(true);

  const [isLoadingUsers, setIsLoadingUsers] =
    useState(false);

  const [isLoadingMessages, setIsLoadingMessages] =
    useState(false);


  // =========================================================
  // CHAT
  // =========================================================

  const [inputMessage, setInputMessage] =
    useState('');

  const [onlineUserMap, setOnlineUserMap] =
    useState({});

  const [typingUsers, setTypingUsers] =
    useState({});

  const [sidebarTab, setSidebarTab] =
    useState(
      location.pathname.startsWith('/messages')
        ? 'dms'
        : 'channels'
    );

  const [searchQuery, setSearchQuery] =
    useState('');


  // =========================================================
  // ATTACHMENTS
  // =========================================================

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState(null);

  const [isUploading, setIsUploading] =
    useState(false);


  // =========================================================
  // REACTIONS / VOICE NOTES / CALLS
  // =========================================================

  const [reactionPickerMessageId, setReactionPickerMessageId] =
    useState(null);

  const [messageMenuId, setMessageMenuId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥'];

  const [isRecordingVoice, setIsRecordingVoice] =
    useState(false);

  const [recordingSeconds, setRecordingSeconds] =
    useState(0);

  const [isUploadingVoice, setIsUploadingVoice] =
    useState(false);

  // Compact WhatsApp-style voice-note player state.
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [voiceProgress, setVoiceProgress] = useState({});
  const [voiceDurations, setVoiceDurations] = useState({});
  const voiceAudioRefs = useRef({});

  const mediaRecorderRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const voiceStreamRef = useRef(null);

  const [callState, setCallState] = useState(null);
  const [callError, setCallError] = useState('');
  const peerConnectionRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const ringtoneContextRef = useRef(null);
  const ringtoneTimerRef = useRef(null);
  const callTimeoutRef = useRef(null);


  // =========================================================
  // CREATE ROOM
  // =========================================================

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [isCreatingRoom, setIsCreatingRoom] =
    useState(false);

  const [roomFormData, setRoomFormData] =
    useState({
      name: '',
      description: '',
      isPrivate: false
    });

  const [modalError, setModalError] =
    useState('');

  // =========================================================
  // JOIN / LEAVE ROOM
  // =========================================================

  const [roomToJoin, setRoomToJoin] = useState(null);
  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [messageSettingsOpen, setMessageSettingsOpen] = useState(false);
  const [enterToSend, setEnterToSend] = useState(() => {
    try {
      return localStorage.getItem('eazy-don-check-enter-to-send') !== 'false';
    } catch (_) {
      return true;
    }
  });
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('eazy-don-check-enter-to-send', String(enterToSend));
    } catch (_) {
      // Ignore storage failures.
    }
  }, [enterToSend]);


  // =========================================================
  // ERROR
  // =========================================================

  const [chatError, setChatError] =
    useState('');


  // =========================================================
  // REFS
  // =========================================================

  const messagesEndRef =
    useRef(null);

  /*
   * For direct conversations, the first unread message is the
   * correct place to reopen the conversation. We keep the ID of
   * the last-read boundary so the initial render does not jump
   * straight to the newest message.
   */
  const initialConversationAnchorRef =
    useRef(null);

  /*
   * Stores the exact message through which the initial conversation
   * may be marked read. It is deliberately consumed only after the
   * anchor has actually been rendered and positioned in the DOM.
   */
  const initialReadThroughRef =
    useRef(null);

  const initialConversationLoadRef =
    useRef(null);

  const typingTimeoutRef =
    useRef(null);

  // Typing state refs keep the socket listener independent from React
  // re-renders. This is especially important when the mobile DM panel
  // collapses/opens and the active conversation changes quickly.
  const activeRoomIdRef = useRef(null);
  const activeRecipientIdRef = useRef(null);
  const chatModeRef = useRef(chatMode);
  const currentUserIdRef = useRef(null);

  const fileInputRef =
    useRef(null);

  /*
   * Keep the latest markRoomAsRead function
   * without making the active-room effect run
   * repeatedly whenever unread state changes.
   */
  const markRoomAsReadRef =
    useRef(markRoomAsRead);

  useEffect(() => {
    markRoomAsReadRef.current =
      markRoomAsRead;
  }, [markRoomAsRead]);

  /*
   * Prevent unnecessary duplicate read calls
   * for the same active conversation.
   */
  const lastMarkedRoomRef =
    useRef(null);


  // =========================================================
  // HELPERS
  // =========================================================

  const getId = useCallback(
    (value) => {

      if (!value) {
        return null;
      }

      if (typeof value === 'string') {
        return value;
      }

      if (typeof value === 'number') {
        return String(value);
      }

      if (typeof value === 'object') {

        if (value._id) {
          return value._id.toString();
        }

        if (value.id) {
          return value.id.toString();
        }

        if (
          typeof value.toString ===
          'function'
        ) {

          const stringValue =
            value.toString();

          if (
            stringValue &&
            stringValue !==
              '[object Object]'
          ) {
            return stringValue;
          }
        }
      }

      return null;
    },
    []
  );


  // Keep the current chat target available to the stable typing listener.
  // This effect is intentionally placed AFTER getId is initialized so the
  // first render cannot hit the JavaScript temporal dead zone.
  useEffect(() => {
    activeRoomIdRef.current = getId(activeRoom);
    activeRecipientIdRef.current = getId(activeRecipient);
    chatModeRef.current = chatMode;
    currentUserIdRef.current = getId(user);
  }, [activeRoom, activeRecipient, chatMode, user, getId]);


  const getRoomIsPrivate =
    useCallback(
      (room) =>
        room?.type === 'private',
      []
    );

  const normalizedRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin =
    normalizedRole === 'superadmin' ||
    normalizedRole === 'super_admin' ||
    normalizedRole === 'super-admin';

  const getRoomIcon = useCallback((room) => {
    const explicitIcon = String(room?.icon || room?.iconName || '').toLowerCase().trim();
    const name = String(room?.name || '').toLowerCase().trim();
    const slug = String(room?.slug || '').toLowerCase().trim();
    const source = `${explicitIcon} ${name} ${slug}`;

    // Specific channel identities first. This makes the channel list feel
    // like real social channels instead of giving every room a generic icon.
    if (name.includes('global lounge') || slug.includes('global-lounge') || source.includes('global')) {
      return Globe;
    }

    if (name === 'funny' || name.includes('funny') || slug.includes('funny') || source.includes('joke') || source.includes('humor') || source.includes('laugh')) {
      return ({ className = '', ...props }) => (
        <span className={`inline-flex items-center justify-center text-base leading-none ${className}`} {...props}>😂</span>
      );
    }

    if (name === 'dating' || name.includes('dating') || slug.includes('dating')) return Heart;
    if (name.includes('love') || source.includes('relationship') || source.includes('romance')) return Heart;
    if (source.includes('lounge') || source.includes('community')) return Globe;
    if (source.includes('food') || source.includes('recipe') || source.includes('cooking')) return Utensils;
    if (source.includes('travel') || source.includes('trip') || source.includes('tour')) return Plane;
    if (source.includes('photo') || source.includes('photography')) return Camera;
    if (source.includes('health') || source.includes('fitness')) return Dumbbell;
    if (source.includes('faith') || source.includes('church') || source.includes('prayer')) return Church;
    if (source.includes('tech') || source.includes('technology') || source.includes('coding')) return Laptop;
    if (source.includes('money') || source.includes('finance') || source.includes('investment')) return WalletCards;
    if (source.includes('announce') || source.includes('notice') || source.includes('news')) return Megaphone;
    if (source.includes('market') || source.includes('shop') || source.includes('business')) return ShoppingBag;
    if (source.includes('event') || source.includes('calendar')) return CalendarDays;
    if (source.includes('design') || source.includes('graphic') || source.includes('creative')) return Palette;
    if (source.includes('print')) return Printer;
    if (source.includes('music') || source.includes('song')) return Music;
    if (source.includes('movie') || source.includes('film') || source.includes('entertain')) return Film;
    if (source.includes('work') || source.includes('career') || source.includes('job')) return BriefcaseBusiness;
    if (source.includes('school') || source.includes('learn') || source.includes('study') || source.includes('education')) return BookOpen;
    if (source.includes('sport') || source.includes('football') || source.includes('success')) return Trophy;
    if (source.includes('game')) return Gamepad2;
    if (source.includes('help') || source.includes('support') || source.includes('faq')) return HelpCircle;
    if (source.includes('notification') || source.includes('alert')) return Bell;
    if (source.includes('general') || source.includes('chat') || source.includes('lounge')) return MessageCircle;

    return room?.type === 'private' ? Lock : MessageCircle;
  }, []);


  const getAttachmentUrl =
    useCallback(
      (attachment) => {

        if (!attachment) return null;
        const rawUrl = typeof attachment === 'string' ? attachment : attachment.url;
        if (!rawUrl) return null;

        // Uploaded chat files are served by the Express API. Resolve relative
        // paths against the API origin so audio works even when Vite runs on
        // a different port.
        if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
        try {
          const apiBase = apiClient?.defaults?.baseURL || window.location.origin;
          const baseOrigin = new URL(apiBase, window.location.origin).origin;
          return new URL(rawUrl, `${baseOrigin}/`).toString();
        } catch (_) {
          return rawUrl;
        }
      },
      []
    );


  const getDisplayName =
    useCallback(
      (member) => {

        if (!member) {
          return 'Member';
        }

        return (
          member.username ||
          member.name ||
          `${member.firstName || ''} ${
            member.lastName || ''
          }`.trim() ||
          'Member'
        );
      },
      []
    );


  const getAvatarUrl =
    useCallback(
      (member) => {
        if (!member) return null;

        const candidate =
          member.avatar ||
          member.photo ||
          member.profilePicture ||
          member.profile_picture ||
          member.profile_image ||
          member.profileImage ||
          member.profilePictureUrl ||
          member.avatarUrl ||
          member.avatar_url ||
          member.photoUrl ||
          member.image ||
          member.picture ||
          member.user?.avatar ||
          member.user?.photo ||
          member.user?.profilePicture ||
          member.user?.profile_picture ||
          member.user?.profile_image ||
          member.user?.profileImage ||
          member.user?.profilePictureUrl ||
          member.user?.avatarUrl ||
          member.user?.avatar_url ||
          member.user?.photoUrl ||
          member.user?.image ||
          member.user?.picture ||
          null;

        if (!candidate) return null;

        return getAttachmentUrl(candidate);
      },
      [getAttachmentUrl]
    );


  const toggleVoiceNote = useCallback((messageId, url) => {
    if (!messageId || !url) return;

    const currentId = String(messageId);
    const currentAudio = voiceAudioRefs.current[currentId];

    if (!currentAudio) return;

    Object.entries(voiceAudioRefs.current).forEach(([id, audio]) => {
      if (id !== currentId && audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    if (currentAudio.paused) {
      currentAudio.play().then(() => {
        setPlayingVoiceId(currentId);
      }).catch(() => {
        setPlayingVoiceId(null);
      });
    } else {
      currentAudio.pause();
      setPlayingVoiceId(null);
    }
  }, []);

  const handleVoiceTimeUpdate = useCallback((messageId, event) => {
    const audio = event.currentTarget;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;

    setVoiceProgress((previous) => ({
      ...previous,
      [String(messageId)]: duration > 0 ? (current / duration) * 100 : 0
    }));

    if (duration > 0) {
      setVoiceDurations((previous) => ({
        ...previous,
        [String(messageId)]: duration
      }));
    }
  }, []);

  const handleVoiceLoadedMetadata = useCallback((messageId, event) => {
    const duration = Number.isFinite(event.currentTarget.duration)
      ? event.currentTarget.duration
      : 0;

    if (duration > 0) {
      setVoiceDurations((previous) => ({
        ...previous,
        [String(messageId)]: duration
      }));
    }
  }, []);

  const handleVoiceEnded = useCallback((messageId) => {
    const key = String(messageId);
    setPlayingVoiceId((current) => current === key ? null : current);
    setVoiceProgress((previous) => ({
      ...previous,
      [key]: 0
    }));

    const audio = voiceAudioRefs.current[key];
    if (audio) audio.currentTime = 0;
  }, []);

  const formatVoiceDuration = useCallback((seconds) => {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }, []);

  const scrollToBottom =
    useCallback(() => {

      requestAnimationFrame(() => {

        messagesEndRef.current?.scrollIntoView(
          {
            behavior: 'smooth'
          }
        );

      });

    }, []);


  // =========================================================
  // SCROLL
  // =========================================================

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    const anchorId = initialConversationAnchorRef.current;
    const readThrough = initialReadThroughRef.current;

    const markInitialConversationRead = () => {
      if (!readThrough?.roomId || !readThrough?.throughMessageId || !socket) {
        return;
      }

      initialReadThroughRef.current = null;
      lastMarkedRoomRef.current = readThrough.roomId;

      socket.emit('mark_messages_read', {
        roomId: readThrough.roomId,
        throughMessageId: readThrough.throughMessageId
      });

      Promise.resolve(refreshUnreadCounts()).catch((error) => {
        console.warn('Unable to refresh initial unread counts:', error);
      });
    };

    if (anchorId) {
      let frame = 0;
      let cancelled = false;

      const locateAnchor = () => {
        if (cancelled) return;

        const escapedAnchorId =
          typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
            ? CSS.escape(String(anchorId))
            : String(anchorId).replace(/["\\]/g, '\\$&');

        const anchorElement = document.querySelector(
          `[data-message-id="${escapedAnchorId}"]`
        );

        if (anchorElement) {
          anchorElement.scrollIntoView({
            behavior: 'auto',
            block: 'start'
          });

          initialConversationAnchorRef.current = null;
          markInitialConversationRead();
          return;
        }

        frame += 1;

        // React may need several frames to paint a large/attachment-heavy
        // conversation. Do not jump to the bottom before the anchor has had
        // a fair chance to appear, and never mark the conversation read if
        // the boundary cannot be located.
        if (frame < 20) {
          requestAnimationFrame(locateAnchor);
          return;
        }

        cancelled = true;
        initialConversationAnchorRef.current = null;
        initialReadThroughRef.current = null;
        scrollToBottom();
      };

      requestAnimationFrame(locateAnchor);

      return () => {
        cancelled = true;
      };
    }

    // No unread boundary: preserve the existing newest-message behavior.
    scrollToBottom();
  }, [
    messages,
    scrollToBottom,
    socket,
    refreshUnreadCounts
  ]);


  // =========================================================
  // CLEAR FILE
  // =========================================================

  const clearSelectedFile =
    useCallback(() => {

      setSelectedFile(null);

      setPreviewUrl(
        (previousUrl) => {

          if (previousUrl) {
            URL.revokeObjectURL(
              previousUrl
            );
          }

          return null;
        }
      );

      if (fileInputRef.current) {
        fileInputRef.current.value =
          '';
      }

    }, []);


  // =========================================================
  // REACTIONS
  // =========================================================

  const toggleReaction = useCallback((messageId, emoji) => {
    if (!socket || !isConnected || !messageId || !emoji) return;

    const currentUserId = getId(user);

    // Optimistic update: show the reaction immediately. The server
    // response remains authoritative and will reconcile every client.
    setMessages((previous) => previous.map((message) => {
      if (message._id?.toString() !== messageId.toString()) return message;

      const existing = Array.isArray(message.reactions)
        ? message.reactions.map((reaction) => ({
            ...reaction,
            users: Array.isArray(reaction.users) ? [...reaction.users] : []
          }))
        : [];

      let selectedEmoji = null;
      const withoutCurrentUser = existing.map((reaction) => {
        const users = reaction.users.filter(
          (reactionUser) => getId(reactionUser) !== currentUserId
        );

        if (users.length !== reaction.users.length) {
          selectedEmoji = reaction.emoji;
        }

        return { ...reaction, users };
      }).filter((reaction) => reaction.users.length > 0);

      // Clicking the same reaction removes it. Choosing another reaction
      // replaces the user's previous reaction.
      if (selectedEmoji !== emoji) {
        const target = withoutCurrentUser.find(
          (reaction) => reaction.emoji === emoji
        );

        if (target) {
          target.users.push(currentUserId);
        } else {
          withoutCurrentUser.push({
            emoji,
            users: [currentUserId]
          });
        }
      }

      return {
        ...message,
        reactions: withoutCurrentUser
      };
    }));

    socket.emit('toggle_message_reaction', { messageId, emoji });
    setReactionPickerMessageId(null);
    setMessageMenuId(null);
  }, [socket, isConnected, user, getId]);

  const beginEditMessage = useCallback((message) => {
    if (!message?._id || message.message_type === 'system') return;
    const content = message.content || message.message || '';
    if (!content.trim()) return;
    setEditingMessageId(message._id.toString());
    setInputMessage(content);
    setMessageMenuId(null);
    setReactionPickerMessageId(null);
  }, []);

  const cancelEditMessage = useCallback(() => {
    setEditingMessageId(null);
    setInputMessage('');
  }, []);

  const beginReplyMessage = useCallback((message) => {
    if (!message?._id || message.is_deleted) return;
    setReplyingTo(message);
    setMessageMenuId(null);
    setReactionPickerMessageId(null);
    setEditingMessageId(null);
    requestAnimationFrame(() => {
      document.querySelector('[data-chat-composer-input]')?.focus();
    });
  }, []);

  const cancelReplyMessage = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const deleteMessage = useCallback((message) => {
    if (!socket || !isConnected || !message?._id) return;
    socket.emit('delete_message', { messageId: message._id });
    if (editingMessageId === message._id.toString()) {
      setEditingMessageId(null);
      setInputMessage('');
    }
    setMessageMenuId(null);
    setReactionPickerMessageId(null);
  }, [socket, isConnected, editingMessageId]);

  // =========================================================
  // VOICE NOTE HELPERS
  // =========================================================

  const stopVoiceStream = useCallback(() => {
    if (voiceStreamRef.current) {
      voiceStreamRef.current.getTracks().forEach((track) => track.stop());
      voiceStreamRef.current = null;
    }
  }, []);

  const cancelVoiceRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
    } catch (_) {}
    mediaRecorderRef.current = null;
    voiceChunksRef.current = [];
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    clearInterval(recordingTimerRef.current);
    stopVoiceStream();
  }, [stopVoiceStream]);

  const uploadVoiceNote = useCallback(async (blob, duration) => {
    const extension = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm';
    const file = new File([blob], `voice-note-${Date.now()}.${extension}`, {
      type: blob.type || 'audio/webm'
    });

    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/chat/upload', formData);
    const result = response?.data || {};
    if (!result.success) {
      throw new Error(result.error || result.message || 'Voice note upload failed.');
    }

    const url = result.data?.url || result.url;
    if (!url) throw new Error('Voice note uploaded but no URL was returned.');

    return {
      url,
      file_type: 'audio',
      file_name: file.name,
      file_size: file.size,
      mime_type: result.data?.mimetype || file.type || 'audio/webm',
      duration: Math.max(1, Math.round(duration))
    };
  }, []);

  const startVoiceRecording = useCallback(async () => {
    if (!socket || !isConnected || isUploadingVoice || isRecordingVoice) return;

    if (chatMode === 'room' && !activeRoom?._id) return;
    if (chatMode === 'direct' && !activeRecipient?._id) return;

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setChatError('Voice recording is not supported by this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      voiceChunksRef.current = [];

      const preferredMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus'
      ];
      const mimeType = preferredMimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      setRecordingSeconds(0);
      setIsRecordingVoice(true);
      setChatError('');

      recorder.ondataavailable = (event) => {
        if (event.data?.size) voiceChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const chunks = voiceChunksRef.current;
        const duration = recordingSecondsRef.current;
        voiceChunksRef.current = [];
        mediaRecorderRef.current = null;
        clearInterval(recordingTimerRef.current);
        setIsRecordingVoice(false);
        setRecordingSeconds(0);
        stopVoiceStream();

        if (!chunks.length || duration < 1) return;

        setIsUploadingVoice(true);
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const attachment = await uploadVoiceNote(blob, duration);

          if (chatMode === 'room') {
            socket.emit('send_room_message', {
              roomId: activeRoom._id,
              message: '',
              attachments: [attachment],
              messageType: 'voice'
            });
          } else {
            socket.emit('send_direct_message', {
              recipientId: activeRecipient._id,
              message: '',
              attachments: [attachment],
              messageType: 'voice'
            });
          }
        } catch (error) {
          console.error('Voice note error:', error);
          setChatError(error.response?.data?.message || error.response?.data?.error || error.message || 'Could not send voice note.');
        } finally {
          setIsUploadingVoice(false);
        }
      };

      recorder.start(250);
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((previous) => {
          const next = previous + 1;
          if (next >= 120) {
            try {
              if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop();
            } catch (_) {}
          }
          return next;
        });
      }, 1000);
    } catch (error) {
      console.error('Microphone access error:', error);
      setChatError('Microphone access was denied or unavailable. Please allow microphone access and try again.');
      stopVoiceStream();
    }
  }, [socket, isConnected, isUploadingVoice, isRecordingVoice, chatMode, activeRoom, activeRecipient, uploadVoiceNote, stopVoiceStream]);

  const stopVoiceRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    try {
      if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    } catch (_) {
      cancelVoiceRecording();
    }
  }, [cancelVoiceRecording]);

  // Ref used by MediaRecorder's asynchronous onstop callback.
  const recordingSecondsRef = useRef(0);
  useEffect(() => {
    recordingSecondsRef.current = recordingSeconds;
  }, [recordingSeconds]);

  // =========================================================
  // CALL RINGTONE HELPERS
  // Browser-generated ringtone: no external audio asset required.
  // =========================================================

  const stopCallRingtone = useCallback(() => {
    if (ringtoneTimerRef.current) {
      clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }

    try {
      const context = ringtoneContextRef.current;
      if (context) {
        context.close().catch(() => {});
      }
    } catch (_) {}

    ringtoneContextRef.current = null;
  }, []);

  const startCallRingtone = useCallback(() => {
    stopCallRingtone();

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const context = new AudioContextClass();
      ringtoneContextRef.current = context;

      const ring = () => {
        if (context.state === 'suspended') context.resume().catch(() => {});

        const now = context.currentTime;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        gain.gain.setValueAtTime(0.0001, now + 0.58);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.61);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.03);
        gain.connect(context.destination);

        [440, 523.25].forEach((frequency) => {
          const oscillator = context.createOscillator();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(frequency, now);
          oscillator.connect(gain);
          oscillator.start(now);
          oscillator.stop(now + 1.08);
        });
      };

      ring();
      ringtoneTimerRef.current = setInterval(ring, 2200);
    } catch (error) {
      console.warn('Call ringtone could not start:', error);
    }
  }, [stopCallRingtone]);

  const getMediaAccessError = useCallback((error, { video = false } = {}) => {
    const name = error?.name;

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return video
        ? 'Camera/microphone access was denied. Please allow camera and microphone access for EAZY DON CHECK and try again.'
        : 'Microphone access was denied. Please allow microphone access for EAZY DON CHECK and try again.';
    }

    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return video
        ? 'No camera or microphone was found on this device.'
        : 'No microphone was found on this device.';
    }

    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Your camera or microphone is already being used by another application.';
    }

    if (name === 'SecurityError') {
      return 'Camera and microphone access requires a secure HTTPS connection.';
    }

    return video
      ? 'Unable to access your camera and microphone. Please check browser permissions and try again.'
      : 'Unable to access your microphone. Please check browser permissions and try again.';
  }, []);

  const requestMediaStream = useCallback(async (withVideo = false) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('MEDIA_DEVICES_UNAVAILABLE');
    }

    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: Boolean(withVideo)
    });
  }, []);

  const getIceServers = useCallback(async () => {
    try {
      const response = await apiClient.get('/webrtc/ice-servers');
      const servers = response?.data?.iceServers;
      if (Array.isArray(servers) && servers.length) {
        return servers;
      }
    } catch (error) {
      console.warn('WebRTC ICE server discovery failed. Falling back to public STUN servers.', error);
    }

    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
  }, []);

  // =========================================================
  // DIRECT CALL HELPERS
  // =========================================================

  const closePeerConnection = useCallback(() => {
    try {
      peerConnectionRef.current?.getSenders?.().forEach((sender) => {
        try { sender.replaceTrack?.(null); } catch (_) {}
      });
      peerConnectionRef.current?.close();
    } catch (_) {}
    peerConnectionRef.current = null;
    pendingIceCandidatesRef.current = [];
  }, []);

  const stopLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
  }, []);

  const endCall = useCallback((notify = true) => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    stopCallRingtone();

    if (notify && socket && callState?.peerId) {
      socket.emit('end_call', { targetUserId: callState.peerId, callId: callState.callId });
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch (_) {}
      });
      remoteStreamRef.current = null;
    }

    closePeerConnection();
    stopLocalMedia();
    setCallState(null);
    setCallError('');
  }, [socket, callState, closePeerConnection, stopLocalMedia, stopCallRingtone]);

  const startDirectCall = useCallback(async (withVideo) => {
    if (!socket || !isConnected || chatMode !== 'direct' || !activeRecipient?._id) return;
    if (callState) return;

    const peerId = getId(activeRecipient);
    const callId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const stream = await requestMediaStream(withVideo);
      localStreamRef.current = stream;
      setCallError('');
      setCallState({ callId, peerId, peerName: getDisplayName(activeRecipient), direction: 'outgoing', withVideo, status: 'calling', localStream: stream, remoteStream: null, muted: false, cameraOff: false });
      startCallRingtone();
      socket.emit('call_user', { targetUserId: peerId, callId, withVideo });

      // Client-side safety timeout in case the signaling socket misses the
      // server timeout event. The server remains authoritative for the
      // persistent missed-call record.
      callTimeoutRef.current = setTimeout(() => {
        // Do not emit end_call here. The server's 30-second timer is
        // responsible for creating the recipient's missed-call record.
        // This client-side timer only guarantees that the caller UI cannot
        // remain stuck if the timeout event is delayed or lost.
        stopCallRingtone();
        closePeerConnection();
        stopLocalMedia();
        setCallState((previous) => previous && previous.callId === callId
          ? { ...previous, status: 'no_answer' }
          : previous
        );
        setTimeout(() => {
          setCallState((previous) => previous?.callId === callId ? null : previous);
        }, 1800);
      }, 30500);
    } catch (error) {
      console.error('Call media error:', error);
      setCallError(error?.message === 'MEDIA_DEVICES_UNAVAILABLE'
        ? 'This browser does not support camera/microphone calls.'
        : getMediaAccessError(error, { video: withVideo }));
    }
  }, [socket, isConnected, chatMode, activeRecipient, callState, getId, getDisplayName, startCallRingtone, stopCallRingtone, closePeerConnection, stopLocalMedia, requestMediaStream, getMediaAccessError]);

  const callBackFromMissedMessage = useCallback((message) => {
    if (!message || chatMode !== 'direct' || !activeRecipient?._id || callState) return;
    const text = String(message.content || message.message || '');
    const match = text.match(/^Missed\s+(voice|video)\s+call\s+from\s+/i);
    if (!match) return;
    startDirectCall(match[1].toLowerCase() === 'video');
  }, [chatMode, activeRecipient, callState, startDirectCall]);

  const createPeerConnection = useCallback(async (targetUserId, callId, withVideo) => {
    if (typeof RTCPeerConnection === 'undefined') {
      throw new Error('WebRTC is not supported by this browser.');
    }

    const iceServers = await getIceServers();
    const pc = new RTCPeerConnection({
      iceServers,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    peerConnectionRef.current = pc;
    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      const incomingTracks = [];

      if (event.streams?.[0]) {
        incomingTracks.push(...event.streams[0].getTracks());
      }

      if (event.track) {
        incomingTracks.push(event.track);
      }

      incomingTracks.forEach((track) => {
        if (!track || remoteStream.getTracks().some((existing) => existing.id === track.id)) {
          return;
        }
        remoteStream.addTrack(track);
        console.log('[WebRTC] Remote track received:', {
          kind: track.kind,
          id: track.id,
          readyState: track.readyState,
          withVideo
        });
      });

      setCallState((previous) => previous ? { ...previous, remoteStream } : previous);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', {
          targetUserId,
          callId,
          candidate: event.candidate
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);

      // A temporary "disconnected" state can recover, especially on mobile
      // networks. Only failed/closed should transition the call to ended.
      if (['failed', 'closed'].includes(pc.connectionState)) {
        setCallState((previous) => previous ? { ...previous, status: 'ended' } : previous);
      }
    };

    return pc;
  }, [socket, getIceServers]);

  // =========================================================
  // CALL SOCKET EVENTS
  // =========================================================

  useEffect(() => {
    if (!socket || !isConnected) return undefined;

    const onIncomingCall = ({ callId, callerId, callerName, withVideo }) => {
      if (callState) {
        socket.emit('reject_call', { targetUserId: callerId, callId, reason: 'busy' });
        return;
      }
      setCallState({ callId, peerId: callerId, peerName: callerName || 'Member', direction: 'incoming', withVideo: Boolean(withVideo), status: 'incoming', localStream: null, remoteStream: null, muted: false, cameraOff: false });
      startCallRingtone();
    };

    const onCallAccepted = async ({ callId, peerId, withVideo }) => {
      if (!callState || callState.callId !== callId) return;
      stopCallRingtone();
      if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
      try {
        const pc = await createPeerConnection(peerId, callId, withVideo);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { targetUserId: peerId, callId, offer, withVideo });
        setCallState((previous) => previous ? { ...previous, status: 'connecting' } : previous);
      } catch (error) {
        console.error('Offer creation failed:', error);
        endCall(false);
      }
    };

    const onWebrtcOffer = async ({ callId, callerId, offer, withVideo }) => {
      if (!callState || callState.callId !== callId) return;
      try {
        if (!localStreamRef.current) {
          localStreamRef.current = await requestMediaStream(withVideo);
          setCallState((previous) => previous ? { ...previous, localStream: localStreamRef.current } : previous);
        }
        const pc = await createPeerConnection(callerId, callId, withVideo);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { targetUserId: callerId, callId, answer });
        setCallState((previous) => previous ? { ...previous, status: 'connected' } : previous);
        for (const candidate of pendingIceCandidatesRef.current.splice(0)) await pc.addIceCandidate(candidate);
      } catch (error) {
        console.error('WebRTC offer handling failed:', error);
        setCallError('Could not establish the call.');
      }
    };

    const onWebrtcAnswer = async ({ callId, answer }) => {
      if (!callState || callState.callId !== callId || !peerConnectionRef.current) return;
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState((previous) => previous ? { ...previous, status: 'connected' } : previous);
        for (const candidate of pendingIceCandidatesRef.current.splice(0)) await peerConnectionRef.current.addIceCandidate(candidate);
      } catch (error) {
        console.error('WebRTC answer handling failed:', error);
      }
    };

    const onIceCandidate = async ({ callId, candidate }) => {
      if (!callState || callState.callId !== callId || !candidate) return;
      if (peerConnectionRef.current?.remoteDescription) {
        try { await peerConnectionRef.current.addIceCandidate(candidate); } catch (_) {}
      } else {
        pendingIceCandidatesRef.current.push(new RTCIceCandidate(candidate));
      }
    };

    const onCallRejected = ({ callId, reason }) => {
      if (!callState || callState.callId !== callId) return;
      stopCallRingtone();
      if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
      setCallError(reason === 'busy' ? 'The other member is currently on another call.' : 'Call declined.');
      endCall(false);
    };

    const onCallNoAnswer = ({ callId }) => {
      if (!callState || callState.callId !== callId) return;
      stopCallRingtone();
      if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
      setCallError('');
      setCallState((previous) => previous ? { ...previous, status: 'no_answer' } : previous);
    };

    const onCallEnded = ({ callId }) => {
      if (!callState || callState.callId !== callId) return;
      endCall(false);
    };

    const onCallError = ({ message }) => setCallError(message || 'Call failed.');

    socket.on('incoming_call', onIncomingCall);
    socket.on('call_accepted', onCallAccepted);
    socket.on('webrtc_offer', onWebrtcOffer);
    socket.on('webrtc_answer', onWebrtcAnswer);
    socket.on('ice_candidate', onIceCandidate);
    socket.on('call_rejected', onCallRejected);
    socket.on('call_no_answer', onCallNoAnswer);
    socket.on('call_ended', onCallEnded);
    socket.on('call_error', onCallError);

    return () => {
      socket.off('incoming_call', onIncomingCall);
      socket.off('call_accepted', onCallAccepted);
      socket.off('webrtc_offer', onWebrtcOffer);
      socket.off('webrtc_answer', onWebrtcAnswer);
      socket.off('ice_candidate', onIceCandidate);
      socket.off('call_rejected', onCallRejected);
      socket.off('call_no_answer', onCallNoAnswer);
      socket.off('call_ended', onCallEnded);
      socket.off('call_error', onCallError);
    };
  }, [socket, isConnected, callState, createPeerConnection, endCall, startCallRingtone, stopCallRingtone, requestMediaStream]);

  useEffect(() => () => {
    clearInterval(recordingTimerRef.current);
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    stopVoiceStream();
    stopCallRingtone();
    closePeerConnection();
    stopLocalMedia();
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch (_) {}
      });
      remoteStreamRef.current = null;
    }
  }, [stopVoiceStream, stopCallRingtone, closePeerConnection, stopLocalMedia]);

  // =========================================================
  // FETCH ROOMS
  // =========================================================

  useEffect(() => {

    let cancelled = false;

    const fetchRooms =
      async () => {

        if (!token) {

          setIsLoadingRooms(false);

          return;
        }

        try {

          setIsLoadingRooms(true);
          setChatError('');

          /*
           * apiClient baseURL:
           *
           * http://localhost:5000/api/v1
           *
           * Therefore:
           *
           * /chat/rooms
           *
           * becomes:
           *
           * http://localhost:5000/api/v1/chat/rooms
           */

          const response =
            await apiClient.get(
              '/chat/rooms'
            );

          const result =
            response?.data || {};

          if (!result.success) {

            throw new Error(
              result.error ||
              result.message ||
              'Failed to load chat rooms.'
            );
          }

          if (cancelled) {
            return;
          }

          const fetchedRooms =
            Array.isArray(
              result.data
            )
              ? result.data
              : [];

          setRooms(
            fetchedRooms
          );

        } catch (error) {

          console.error(
            'Failed to fetch rooms:',
            error
          );

          if (!cancelled) {

            setChatError(
              error.response?.data
                ?.error ||
              error.response?.data
                ?.message ||
              error.message ||
              'Unable to load chat rooms.'
            );
          }

        } finally {

          if (!cancelled) {

            setIsLoadingRooms(
              false
            );
          }
        }
      };

    fetchRooms();

    return () => {
      cancelled = true;
    };

  }, [token]);


  // =========================================================
  // SELECT ROOM FROM URL
  // =========================================================

  useEffect(() => {

    if (
      location.pathname.startsWith(
        '/messages'
      )
    ) {

      setChatMode('direct');
      setSidebarTab('dms');
      setActiveRoom(null);

      return;
    }

    setChatMode('room');
    setSidebarTab('channels');

    if (!rooms.length) {
      return;
    }

    if (!roomSlug) {

      // /chat is the Channels directory, not a conversation.
      // Never auto-select the first room here. The user must
      // explicitly choose a room before its conversation opens.
      setActiveRoom(null);
      setActiveRecipient(null);
      setMessages([]);
      setTypingUsers({});
      setChatError('');
      setShowRoomMenu(false);
      lastMarkedRoomRef.current = null;
      return;
    }

    const normalizedSlug =
      String(roomSlug)
        .trim()
        .toLowerCase();

    const matchingRoom =
      rooms.find(
        (room) =>
          String(
            room.slug || ''
          )
            .trim()
            .toLowerCase() ===
          normalizedSlug
      );

    if (!matchingRoom) {

      setActiveRoom(null);
      setMessages([]);

      setChatError(
        `The chat room "${roomSlug}" could not be found.`
      );

      return;
    }

    setChatError('');

    setActiveRoom(
      (previous) => {

        if (
          getId(previous) ===
          getId(matchingRoom)
        ) {
          return previous;
        }

        setMessages([]);
        setActiveRecipient(null);
        setTypingUsers({});

        return matchingRoom;
      }
    );

  }, [
    rooms,
    roomSlug,
    location.pathname,
    getId
  ]);


  // =========================================================
  // MARK ACTIVE ROOM AS READ
  // =========================================================

  useEffect(() => {

    if (
      chatMode !== 'room' ||
      !activeRoom?._id
    ) {
      return;
    }

    if (
      !isSuperAdmin &&
      activeRoom.type !== 'direct' &&
      activeRoom.isJoined === false
    ) {
      return;
    }

    const roomId =
      getId(activeRoom);

    if (!roomId) {
      return;
    }

    /*
     * Do not repeatedly call the read endpoint
     * simply because ChatUnreadContext updates.
     */
    if (
      lastMarkedRoomRef.current ===
      roomId
    ) {
      return;
    }

    /*
     * Do not mark the room read here. The history loader must first
     * inspect read_by and establish the user's last-read boundary.
     * It marks the room read only after the correct messages are loaded.
     */

  }, [
    activeRoom?._id,
    activeRoom?.isJoined,
    chatMode,
    getId,
    isSuperAdmin
  ]);


  // =========================================================
  // FETCH MEMBERS
  // =========================================================

  useEffect(() => {

    let cancelled = false;

    const fetchUsers =
      async () => {

        if (!token || !user) {
          return;
        }

        try {

          setIsLoadingUsers(true);

          const response =
            await apiClient.get(
              '/users'
            );

          const result =
            response?.data || {};

          if (cancelled) {
            return;
          }

          if (result.success) {

            const data =
              result.data ||
              result.users ||
              [];

            const currentUserId =
              getId(user);

            const filtered =
              Array.isArray(data)
                ? data.filter(
                    (member) =>
                      getId(member) !==
                      currentUserId
                  )
                : [];

            setUsersList(
              filtered
            );

          } else {

            setUsersList([]);
          }

        } catch (error) {

          /*
           * Do not break channel chat if the
           * member endpoint isn't mounted yet.
           */

          console.warn(
            'Members endpoint unavailable:',
            error.response?.data
              ?.message ||
            error.message
          );

          if (!cancelled) {
            setUsersList([]);
          }

        } finally {

          if (!cancelled) {

            setIsLoadingUsers(
              false
            );
          }
        }
      };

    fetchUsers();

    return () => {
      cancelled = true;
    };

  }, [
    token,
    user,
    getId
  ]);


  // =========================================================
  // FETCH MESSAGE HISTORY
  // =========================================================

  useEffect(() => {

    let cancelled = false;

    const isMessageReadByCurrentUser = (message) => {
      const currentUserId = getId(user);

      if (!currentUserId || !message) {
        return false;
      }

      /*
       * Messages sent by the current user are always considered
       * read from this user's perspective.
       */
      if (getId(message.sender) === currentUserId) {
        return true;
      }

      const readBy = Array.isArray(message.read_by)
        ? message.read_by
        : Array.isArray(message.readBy)
          ? message.readBy
          : [];

      return readBy.some(
        (entry) =>
          getId(entry?.user) === currentUserId ||
          getId(entry?.userId) === currentUserId
      );
    };

    const getHistoryRoomId = (historyMessages) => {
      if (!Array.isArray(historyMessages)) {
        return null;
      }

      return historyMessages.reduce(
        (foundRoomId, message) => {
          if (foundRoomId) {
            return foundRoomId;
          }

          return (
            getId(message?.room) ||
            getId(message?.roomId) ||
            null
          );
        },
        null
      );
    };

    const fetchRoomHistoryFromLastRead = async () => {
      const roomId = getId(activeRoom);

      if (!roomId) {
        return { messages: [], anchorId: null, readThroughId: null };
      }

      const pageSize = 50;
      const stateResponse = await apiClient.get(
        `/chat/rooms/${roomId}/messages`,
        {
          params: { page: 1, limit: pageSize }
        }
      );

      const stateResult = stateResponse?.data || {};

      if (!stateResult.success) {
        throw new Error(
          stateResult.error ||
          stateResult.message ||
          'Failed to load room message history.'
        );
      }

      const latestMessages = Array.isArray(stateResult.data)
        ? stateResult.data
        : [];
      const readState = stateResult.readState || {};
      const firstUnreadId = readState.firstUnreadMessageId || null;
      const lastReadId = readState.lastReadMessageId || null;
      const unreadCount = Number(readState.unreadCount) || 0;

      if (!firstUnreadId || !unreadCount) {
        return {
          messages: latestMessages,
          anchorId: null,
          readThroughId: null
        };
      }

      const aroundId = lastReadId || firstUnreadId;
      let historyMessages = latestMessages;

      /*
       * Request an anchored context only as an ADDITION to the normal
       * latest-history request. The anchored response must never replace
       * the normal history, because doing so makes older messages disappear.
       */
      try {
        const aroundResponse = await apiClient.get(
          `/chat/rooms/${roomId}/messages`,
          {
            params: {
              aroundMessageId: aroundId,
              page: 1,
              limit: 100
            }
          }
        );

        const aroundResult = aroundResponse?.data || {};
        const anchoredMessages = aroundResult.success && Array.isArray(aroundResult.data)
          ? aroundResult.data
          : [];

        if (anchoredMessages.length) {
          const merged = new Map();
          [...latestMessages, ...anchoredMessages].forEach((message) => {
            const id = getId(message);
            if (!id) return;
            merged.set(id, message);
          });

          historyMessages = Array.from(merged.values()).sort((a, b) => {
            const aTime = new Date(a?.createdAt || 0).getTime();
            const bTime = new Date(b?.createdAt || 0).getTime();
            if (aTime !== bTime) return aTime - bTime;
            return String(getId(a) || '').localeCompare(String(getId(b) || ''));
          });
        }
      } catch (error) {
        console.warn('Unable to load anchored room history; keeping normal history:', error);
      }

      return {
        messages: historyMessages,
        anchorId: aroundId,
        readThroughId: historyMessages.length
          ? getId(historyMessages[historyMessages.length - 1])
          : null
      };
    };

    const fetchDirectHistoryFromLastRead = async () => {
      const recipientId = getId(activeRecipient);

      if (!recipientId) {
        return { messages: [], roomId: null, anchorId: null, readThroughId: null };
      }

      const stateResponse = await apiClient.get(
        `/chat/direct/${recipientId}`,
        {
          params: { page: 1, limit: 50 }
        }
      );

      const stateResult = stateResponse?.data || {};

      if (!stateResult.success) {
        throw new Error(
          stateResult.error ||
          stateResult.message ||
          'Failed to load direct message read state.'
        );
      }

      const readState = stateResult.readState || {};
      const latestMessages = Array.isArray(stateResult.data)
        ? stateResult.data
        : [];

      let roomId = latestMessages.reduce(
        (found, message) =>
          found || getId(message?.room) || getId(message?.roomId) || null,
        null
      );

      const firstUnreadId = readState.firstUnreadMessageId || null;
      const lastReadId = readState.lastReadMessageId || null;
      const unreadCount = Number(readState.unreadCount) || 0;

      if (!firstUnreadId || !unreadCount) {
        return {
          messages: latestMessages,
          roomId,
          anchorId: null,
          readThroughId: null
        };
      }

      const aroundId = lastReadId || firstUnreadId;
      let historyMessages = latestMessages;

      try {
        const aroundResponse = await apiClient.get(
          `/chat/direct/${recipientId}`,
          {
            params: {
              aroundMessageId: aroundId,
              page: 1,
              limit: 100
            }
          }
        );

        const aroundResult = aroundResponse?.data || {};
        const anchoredMessages = aroundResult.success && Array.isArray(aroundResult.data)
          ? aroundResult.data
          : [];

        if (anchoredMessages.length) {
          const merged = new Map();
          [...latestMessages, ...anchoredMessages].forEach((message) => {
            const id = getId(message);
            if (!id) return;
            merged.set(id, message);
          });

          historyMessages = Array.from(merged.values()).sort((a, b) => {
            const aTime = new Date(a?.createdAt || 0).getTime();
            const bTime = new Date(b?.createdAt || 0).getTime();
            if (aTime !== bTime) return aTime - bTime;
            return String(getId(a) || '').localeCompare(String(getId(b) || ''));
          });
        }

        roomId = roomId || anchoredMessages.reduce(
          (found, message) =>
            found || getId(message?.room) || getId(message?.roomId) || null,
          null
        );
      } catch (error) {
        console.warn('Unable to load anchored direct history; keeping normal history:', error);
      }

      return {
        messages: historyMessages,
        roomId,
        anchorId: aroundId,
        readThroughId: historyMessages.length
          ? getId(historyMessages[historyMessages.length - 1])
          : null
      };
    };

    const fetchMessageHistory =
      async () => {

        if (!token) {
          return;
        }

        try {

          setIsLoadingMessages(true);
          setChatError('');
          initialConversationAnchorRef.current = null;
          initialReadThroughRef.current = null;

          let response;
          let historyMessages = [];
          let historyRoomId = null;
          let initialAnchorId = null;
          let initialReadThroughId = null;

          if (
            chatMode === 'room' &&
            activeRoom?._id &&
            (
              activeRoom.type === 'direct' ||
              activeRoom.isJoined !== false ||
              isSuperAdmin
            )
          ) {

            const roomHistory =
              await fetchRoomHistoryFromLastRead();

            historyMessages =
              roomHistory.messages;

            initialAnchorId =
              roomHistory.anchorId;

            initialReadThroughId =
              roomHistory.readThroughId;

          } else if (
            chatMode === 'direct' &&
            activeRecipient?._id
          ) {

            const directHistory =
              await fetchDirectHistoryFromLastRead();

            historyMessages =
              directHistory.messages;

            historyRoomId =
              directHistory.roomId;

            initialAnchorId =
              directHistory.anchorId;

            initialReadThroughId =
              directHistory.readThroughId;
          }

          if (
            cancelled
          ) {
            return;
          }

          setMessages(historyMessages);

          /*
           * Do not mark the conversation read here. React has not rendered
           * the history yet, so doing it here destroys the very read-state
           * information needed to position the conversation correctly.
           * The scroll effect consumes this boundary after the anchor is
           * actually present in the DOM.
           */
          initialConversationAnchorRef.current =
            initialAnchorId;

          const readRoomId =
            chatMode === 'direct'
              ? (historyRoomId || getHistoryRoomId(historyMessages))
              : getId(activeRoom);

          initialReadThroughRef.current =
            initialAnchorId && readRoomId && initialReadThroughId
              ? {
                  roomId: readRoomId,
                  throughMessageId: initialReadThroughId
                }
              : null;

        } catch (error) {

          console.error(
            'Failed to fetch message history:',
            error
          );

          if (!cancelled) {

            setMessages([]);

            setChatError(
              error.response?.data
                ?.error ||
              error.response?.data
                ?.message ||
              error.message ||
              'Unable to load message history.'
            );
          }

        } finally {

          if (!cancelled) {

            setIsLoadingMessages(false);
          }
        }
      };

    fetchMessageHistory();

    return () => {
      cancelled = true;
    };

  }, [
    token,
    chatMode,
    activeRoom?._id,
    activeRecipient?._id,
    getId,
    refreshUnreadCounts,
    isSuperAdmin,
    user
  ]);


  // =========================================================
  // SOCKET EVENTS
  // =========================================================

  useEffect(() => {

    if (
      !socket ||
      !isConnected
    ) {
      return undefined;
    }

    const currentRoomId =
      getId(activeRoom);

    const currentRecipientId =
      getId(activeRecipient);

    const currentUserId =
      getId(user);


    // -------------------------------------------------------
    // ONLINE STATUS
    // -------------------------------------------------------

    const handleOnlineStatus =
      ({
        userId,
        isOnline
      }) => {

        const normalizedUserId =
          getId(userId);

        if (!normalizedUserId) {
          return;
        }

        setOnlineUserMap(
          (previous) => ({
            ...previous,
            [normalizedUserId]:
              Boolean(isOnline)
          })
        );
      };


    // -------------------------------------------------------
    // ROOM MESSAGE
    // -------------------------------------------------------

    const handleReceiveRoomMessage =
      (message) => {

        if (
          chatMode !== 'room' ||
          !currentRoomId
        ) {
          return;
        }

        const messageRoomId =
          getId(message?.room) ||
          getId(
            message?.roomId
          );

        if (
          messageRoomId !==
          currentRoomId
        ) {
          return;
        }

        setMessages(
          (previous) => {

            if (
              message?._id &&
              previous.some(
                (item) =>
                  item._id?.toString() ===
                  message._id?.toString()
              )
            ) {
              return previous;
            }

            return [
              ...previous,
              message
            ];
          }
        );

        /*
         * The current room is open, so the
         * incoming message is immediately read.
         */
        socket.emit(
          'mark_messages_read',
          {
            roomId: currentRoomId,
            throughMessageId: getId(message)
          }
        );
      };


    // -------------------------------------------------------
    // DIRECT MESSAGE RECEIVED
    // -------------------------------------------------------

    const handleReceiveDirectMessage =
      (message) => {

        if (
          chatMode !== 'direct' ||
          !currentRecipientId
        ) {
          return;
        }

        const senderId =
          getId(
            message?.sender
          );

        const recipientId =
          getId(
            message?.recipient
          );

        const belongs =
          senderId ===
            currentRecipientId ||
          recipientId ===
            currentRecipientId;

        if (!belongs) {
          return;
        }

        setMessages(
          (previous) => {

            if (
              message?._id &&
              previous.some(
                (item) =>
                  item._id?.toString() ===
                  message._id?.toString()
              )
            ) {
              return previous;
            }

            return [
              ...previous,
              message
            ];
          }
        );

        /*
         * If the backend includes the direct room
         * ID on the received message, mark that
         * room read immediately.
         */
        const directRoomId =
          getId(message?.room) ||
          getId(message?.roomId);

        if (directRoomId) {

          socket.emit(
            'mark_messages_read',
            {
              roomId: directRoomId,
              throughMessageId: getId(message)
            }
          );
        }
      };


    // -------------------------------------------------------
    // DIRECT MESSAGE SENT
    // -------------------------------------------------------

    const handleDirectMessageSent =
      (message) => {

        if (
          chatMode !== 'direct' ||
          !currentRecipientId
        ) {
          return;
        }

        const senderId =
          getId(
            message?.sender
          );

        const recipientId =
          getId(
            message?.recipient
          );

        if (
          senderId !==
            currentUserId ||
          recipientId !==
            currentRecipientId
        ) {
          return;
        }

        setMessages(
          (previous) => {

            if (
              message?._id &&
              previous.some(
                (item) =>
                  item._id?.toString() ===
                  message._id?.toString()
              )
            ) {
              return previous;
            }

            return [
              ...previous,
              message
            ];
          }
        );
      };




    // -------------------------------------------------------
    // SOCKET ERROR
    // -------------------------------------------------------

    const handleSocketError =
      (payload) => {

        setChatError(
          payload?.message ||
          'Chat connection error.'
        );
      };


    // -------------------------------------------------------
    // MESSAGE REACTIONS
    // -------------------------------------------------------

    const handleReactionUpdate = (message) => {
      if (!message?._id) return;
      const currentRoomId = getId(activeRoom);
      const messageRoomId = getId(message.room) || getId(message.roomId);
      const senderId = getId(message.sender);
      const recipientId = getId(message.recipient);
      const currentRecipientId = getId(activeRecipient);
      const currentUserId = getId(user);

      const belongs = chatMode === 'room'
        ? messageRoomId === currentRoomId
        : ((senderId === currentRecipientId && recipientId === currentUserId) ||
           (senderId === currentUserId && recipientId === currentRecipientId));

      if (!belongs) return;
      setMessages((previous) => previous.map((item) =>
        item._id?.toString() === message._id?.toString()
          ? { ...item, reactions: message.reactions || [] }
          : item
      ));
    };

    socket.on('message_reaction_updated', handleReactionUpdate);

    const handleMessageUpdated = (message) => {
      if (!message?._id) return;
      const messageRoomId = getId(message.room) || getId(message.roomId);
      const senderId = getId(message.sender);
      const recipientId = getId(message.recipient);
      const belongs = chatMode === 'room'
        ? messageRoomId === currentRoomId
        : ((senderId === currentRecipientId && recipientId === currentUserId) || (senderId === currentUserId && recipientId === currentRecipientId));
      if (!belongs) return;
      setMessages((previous) => previous.map((item) => item._id?.toString() === message._id?.toString() ? message : item));
    };

    const handleMessageDeleted = ({ messageId, roomId, deletedForEveryone, deletedForUserId }) => {
      if (!messageId) return;
      const currentRoom = getId(activeRoom);
      const currentMessageRoom = getId(roomId);
      const shouldAffectCurrent = chatMode === 'room' ? currentRoom === currentMessageRoom : true;
      if (!shouldAffectCurrent) return;
      if (deletedForEveryone || !deletedForUserId || deletedForUserId === currentUserId) {
        setMessages((previous) => previous.filter((item) => item._id?.toString() !== messageId.toString()));
      }
      if (editingMessageId === messageId.toString()) {
        setEditingMessageId(null);
        setInputMessage('');
      }
    };

    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);

    // -------------------------------------------------------
    // REGISTER SOCKET LISTENERS
    // -------------------------------------------------------

    socket.on(
      'user_online_status',
      handleOnlineStatus
    );

    socket.on(
      'receive_room_message',
      handleReceiveRoomMessage
    );

    socket.on(
      'receive_direct_message',
      handleReceiveDirectMessage
    );

    socket.on(
      'direct_message_sent',
      handleDirectMessageSent
    );

    socket.on(
      'error_message',
      handleSocketError
    );


    // -------------------------------------------------------
    // JOIN ROOM
    // -------------------------------------------------------

    if (
      chatMode === 'room' &&
      currentRoomId &&
      (activeRoom?.type === 'direct' || activeRoom?.isJoined !== false || isSuperAdmin)
    ) {

      socket.emit(
        'join_room',
        {
          roomId:
            currentRoomId
        }
      );
    }


    // -------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------

    return () => {

      socket.off(
        'user_online_status',
        handleOnlineStatus
      );

      socket.off(
        'receive_room_message',
        handleReceiveRoomMessage
      );

      socket.off(
        'receive_direct_message',
        handleReceiveDirectMessage
      );

      socket.off(
        'direct_message_sent',
        handleDirectMessageSent
      );

      socket.off(
        'error_message',
        handleSocketError
      );

      socket.off(
        'message_reaction_updated',
        handleReactionUpdate
      );

      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_deleted', handleMessageDeleted);

      if (
        chatMode === 'room' &&
        currentRoomId
      ) {

        socket.emit(
          'leave_room',
          {
            roomId:
              currentRoomId
          }
        );
      }
    };

  }, [
    socket,
    isConnected,
    activeRoom,
    activeRecipient,
    chatMode,
    user,
    getId,
    editingMessageId
  ]);


  // =========================================================
  // STABLE TYPING SOCKET LISTENER
  // =========================================================

  useEffect(() => {
    if (!socket || !isConnected) return undefined;

    const handleUserTyping = (payload = {}) => {
      const typingUserId = getId(
        payload.userId ??
        payload.senderId ??
        payload.fromUserId ??
        payload.user?._id ??
        payload.user?.id
      );

      const currentUserId = currentUserIdRef.current;

      if (!typingUserId || typingUserId === currentUserId) {
        return;
      }

      const mode = chatModeRef.current;
      const currentRoomId = activeRoomIdRef.current;
      const currentRecipientId = activeRecipientIdRef.current;

      const eventRoomId = getId(
        payload.roomId ??
        payload.room?._id ??
        payload.room?.id
      );

      const eventRecipientId = getId(
        payload.recipientId ??
        payload.targetUserId ??
        payload.toUserId
      );

      // Room typing is scoped by room. For direct messages the server may
      // deliver the event to the recipient's personal socket, so validate
      // that the typing user is the active conversation partner and that any
      // explicit recipient/target points at the current user.
      const isRelevant =
        mode === 'room'
          ? Boolean(currentRoomId && eventRoomId === currentRoomId)
          : Boolean(
              currentRecipientId &&
              typingUserId === currentRecipientId &&
              (!eventRecipientId || eventRecipientId === currentUserId)
            );

      if (!isRelevant) {
        return;
      }

      const username =
        payload.username ||
        payload.user?.username ||
        payload.user?.name ||
        payload.sender?.username ||
        payload.sender?.name ||
        'Someone';

      if (Boolean(payload.isTyping)) {
        setTypingUsers((previous) => ({
          ...previous,
          [typingUserId]: {
            username,
            isTyping: true
          }
        }));
        return;
      }

      setTypingUsers((previous) => {
        if (!previous[typingUserId]) return previous;
        const next = { ...previous };
        delete next[typingUserId];
        return next;
      });
    };

    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, isConnected, getId]);

  // =========================================================
  // SELECT ROOM
  // =========================================================

  const handleRoomSelect =
    useCallback(
      async (room) => {

        if (!room?._id) {
          return;
        }

        setChatError('');
        setMessages([]);
        setTypingUsers({});
        setShowRoomMenu(false);
        setMessageSettingsOpen(false);

        setChatMode('room');

        setSidebarTab(
          'channels'
        );

        setActiveRecipient(
          null
        );

        /*
         * Reset the marker so this newly selected
         * room can be marked as read.
         */
        lastMarkedRoomRef.current =
          null;

        clearSelectedFile();

        if (
          !isSuperAdmin &&
          room.type !== 'direct' &&
          room.isJoined === false
        ) {
          setActiveRoom(null);
          setMessages([]);
          setRoomToJoin(room);
          setShowJoinRoomModal(true);
          return;
        }

        const selectableRoom =
          isSuperAdmin && room.type !== 'direct'
            ? { ...room, isJoined: true }
            : room;

        setActiveRoom(selectableRoom);

        /*
         * Do not mark this room as read yet. The message-history loader
         * first finds the last-read boundary, positions the conversation
         * there, and only then marks the room as read.
         */
        lastMarkedRoomRef.current = null;
        initialConversationAnchorRef.current = null;

        navigate(
          room.slug
            ? `/chat/${room.slug}`
            : '/chat'
        );
      },
      [
        navigate,
        clearSelectedFile,
        getId
      ]
    );


  // =========================================================
  // SELECT USER / DIRECT MESSAGE
  // =========================================================

  const handleUserSelect =
    useCallback(
      async (recipientUser) => {

        if (
          !recipientUser?._id
        ) {
          return;
        }

        setChatError('');
        setMessages([]);
        setTypingUsers({});
        setShowRoomMenu(false);
        setMessageSettingsOpen(false);

        setChatMode('direct');

        setSidebarTab('dms');

        setActiveRoom(null);

        setActiveRecipient(
          recipientUser
        );

        clearSelectedFile();

        /*
         * IMPORTANT:
         *
         * Do NOT mark the direct conversation as read here.
         *
         * The history loader must first inspect read_by and locate
         * the user's last-read boundary. If we mark the room read
         * before loading history, MongoDB immediately changes the
         * read state and the client loses the information needed
         * to reopen at the correct position.
         *
         * The history loader marks the conversation read only after
         * it has identified and rendered the unread boundary.
         */
        lastMarkedRoomRef.current = null;
        initialConversationAnchorRef.current = null;
        initialConversationLoadRef.current = null;

        navigate('/messages');
      },
      [
        rooms,
        navigate,
        clearSelectedFile,
        getId,
        refreshUnreadCounts
      ]
    );


  // =========================================================
  // FILE SELECT
  // =========================================================

  const handleFileSelect =
    (event) => {

      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      if (
        !file.type.startsWith(
          'image/'
        )
      ) {

        setChatError(
          'Please select a valid image file.'
        );

        event.target.value = '';

        return;
      }

      if (
        file.size >
        5 * 1024 * 1024
      ) {

        setChatError(
          'Image file size exceeds the 5MB limit.'
        );

        event.target.value = '';

        return;
      }

      if (previewUrl) {

        URL.revokeObjectURL(
          previewUrl
        );
      }

      setSelectedFile(file);

      setPreviewUrl(
        URL.createObjectURL(file)
      );

      setChatError('');
    };


  // =========================================================
  // UPLOAD IMAGE
  // =========================================================

  const uploadImageAttachment =
    async () => {

      if (!selectedFile) {
        return null;
      }

      const formData =
        new FormData();

      formData.append(
        'file',
        selectedFile
      );

      /*
       * apiClient automatically:
       *
       * - adds JWT
       * - uses /api/v1
       * - handles FormData
       *
       * Final URL:
       *
       * /api/v1/chat/upload
       */

      const response =
        await apiClient.post(
          '/chat/upload',
          formData
        );

      const result =
        response?.data || {};

      if (!result.success) {

        throw new Error(
          result.error ||
          result.message ||
          'Image upload failed.'
        );
      }

      const url =
        result.data?.url ||
        result.url;

      if (!url) {

        throw new Error(
          'Upload succeeded but no image URL was returned.'
        );
      }

      return {
        url,
        file_type: 'image',
        file_name:
          selectedFile.name,
        file_size:
          selectedFile.size
      };
    };


  // =========================================================
  // CREATE ROOM
  // =========================================================

  const handleCreateRoom =
    async (event) => {

      event.preventDefault();

      const name =
        roomFormData.name.trim();

      if (!name) {

        setModalError(
          'Channel name is required.'
        );

        return;
      }

      setIsCreatingRoom(true);
      setModalError('');

      try {

        const payload = {
          name,
          description:
            roomFormData.description.trim(),
          type:
            roomFormData.isPrivate
              ? 'private'
              : 'public'
        };

        const response =
          await apiClient.post(
            '/chat/rooms',
            payload
          );

        const result =
          response?.data || {};

        if (!result.success) {

          throw new Error(
            result.error ||
            result.message ||
            'Failed to create channel.'
          );
        }

        const newRoom =
          result.data;

        if (!newRoom) {

          throw new Error(
            'Server created the channel but returned no room data.'
          );
        }

        setRooms(
          (previous) => {

            const exists =
              previous.some(
                (room) =>
                  getId(room) ===
                  getId(newRoom)
              );

            if (exists) {
              return previous;
            }

            return [
              ...previous,
              newRoom
            ];
          }
        );

        setRoomFormData({
          name: '',
          description: '',
          isPrivate: false
        });

        setIsModalOpen(false);

        await handleRoomSelect(
          newRoom
        );

      } catch (error) {

        console.error(
          'Create room error:',
          error
        );

        setModalError(
          error.response?.data
            ?.error ||
          error.response?.data
            ?.message ||
          error.message ||
          'Server error while creating channel.'
        );

      } finally {

        setIsCreatingRoom(false);
      }
    };


  // =========================================================
  // JOIN ROOM
  // =========================================================

  const handleJoinRoom = async () => {
    if (!roomToJoin?._id || isJoiningRoom) return;
    setIsJoiningRoom(true);
    setModalError('');
    setChatError('');
    try {
      const response = await apiClient.post(`/chat/rooms/${roomToJoin._id}/join`);
      const result = response?.data || {};
      if (!result.success || !result.data) {
        throw new Error(result.error || result.message || 'Unable to join room.');
      }
      const joinedRoom = { ...roomToJoin, ...result.data, isJoined: true };
      setRooms((previous) => previous.map((room) => getId(room) === getId(joinedRoom) ? { ...room, ...joinedRoom, isJoined: true } : room));
      setRoomToJoin(null);
      setShowJoinRoomModal(false);
      setShowRoomMenu(false);
      setActiveRoom(joinedRoom);
      setActiveRecipient(null);
      setMessages([]);
      setTypingUsers({});
      lastMarkedRoomRef.current = null;
      if (socket?.connected) socket.emit('join_room', { roomId: joinedRoom._id });
      navigate(joinedRoom.slug ? `/chat/${joinedRoom.slug}` : '/chat');
      await refreshUnreadCounts();
    } catch (error) {
      setModalError(error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Unable to join room.');
    } finally { setIsJoiningRoom(false); }
  };

  // =========================================================
  // LEAVE ROOM
  // =========================================================

  const handleLeaveRoom = async () => {
    if (!activeRoom?._id || isLeavingRoom || isSuperAdmin) return;
    setIsLeavingRoom(true);
    setChatError('');
    try {
      const response = await apiClient.post(`/chat/rooms/${activeRoom._id}/leave`);
      const result = response?.data || {};
      if (!result.success) throw new Error(result.error || result.message || 'Unable to leave room.');
      const roomId = getId(activeRoom);
      if (socket?.connected) socket.emit('leave_room', { roomId });
      setRooms((previous) => previous.map((room) => getId(room) === roomId ? { ...room, ...(result.data || {}), isJoined: false } : room));
      setActiveRoom(null);
      setMessages([]);
      setTypingUsers({});
      setShowRoomMenu(false);
      setLeaveConfirmOpen(false);
      lastMarkedRoomRef.current = null;
      navigate('/chat');
      await refreshUnreadCounts();
    } catch (error) {
      setChatError(error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Unable to leave room.');
    } finally { setIsLeavingRoom(false); }
  };

  // =========================================================
  // INPUT / TYPING
  // =========================================================

  const handleInputChange =
    (event) => {

      const value =
        event.target.value;

      setInputMessage(value);

      clearTimeout(
        typingTimeoutRef.current
      );

      if (
        !socket ||
        !isConnected
      ) {
        return;
      }

      const mode = chatModeRef.current;
      const roomId = activeRoomIdRef.current;
      const recipientId = activeRecipientIdRef.current;

      const hasTarget =
        mode === 'room'
          ? Boolean(roomId)
          : Boolean(recipientId);

      if (!hasTarget) {
        return;
      }

      const payload =
        mode === 'room'
          ? { roomId }
          : { recipientId };

      // Empty input means the user stopped typing immediately.
      if (!value.trim()) {
        socket.emit('typing_stop', payload);
        return;
      }

      socket.emit(
        'typing_start',
        payload
      );

      typingTimeoutRef.current =
        setTimeout(() => {
          if (socket && isConnected) {
            socket.emit(
              'typing_stop',
              payload
            );
          }
        }, 1500);
    };


  // =========================================================
  // TYPING CLEANUP
  // =========================================================

  useEffect(() => {

    return () => {
      clearTimeout(
        typingTimeoutRef.current
      );

      if (socket && isConnected) {
        const roomId = activeRoomIdRef.current;
        const recipientId = activeRecipientIdRef.current;

        if (chatModeRef.current === 'room' && roomId) {
          socket.emit('typing_stop', { roomId });
        } else if (chatModeRef.current === 'direct' && recipientId) {
          socket.emit('typing_stop', { recipientId });
        }
      }
    };

  }, [socket, isConnected]);


  // =========================================================
  // SEND MESSAGE
  // =========================================================

  const handleSendMessage =
    async (event) => {

      event.preventDefault();

      const content =
        inputMessage.trim();

      if (
        !content &&
        !selectedFile
      ) {
        return;
      }

      if (
        !socket ||
        !isConnected
      ) {

        setChatError(
          'Chat connection is unavailable. Please wait for the connection to return.'
        );

        return;
      }

      if (
        chatMode === 'room' &&
        (!activeRoom?._id || (!isSuperAdmin && activeRoom.isJoined === false))
      ) {

        setChatError(
          'Please select a chat room first.'
        );

        return;
      }

      if (
        chatMode === 'direct' &&
        !activeRecipient?._id
      ) {

        setChatError(
          'Please select a member first.'
        );

        return;
      }

      setIsUploading(true);
      setChatError('');

      try {
        if (editingMessageId) {
          if (!content) {
            setChatError('Edited message cannot be empty.');
            return;
          }
          socket.emit('edit_message', {
            messageId: editingMessageId,
            content
          });
          setEditingMessageId(null);
          setReplyingTo(null);
          setInputMessage('');
          clearTimeout(typingTimeoutRef.current);
          if (chatMode === 'room' && activeRoom?._id) {
            socket.emit('typing_stop', { roomId: activeRoom._id });
          } else if (chatMode === 'direct' && activeRecipient?._id) {
            socket.emit('typing_stop', { recipientId: activeRecipient._id });
          }
          setIsUploading(false);
          return;
        }

        let attachment = null;

        if (selectedFile) {

          attachment =
            await uploadImageAttachment();
        }

        const attachments =
          attachment
            ? [attachment]
            : [];

        if (
          chatMode === 'room'
        ) {

          socket.emit(
            'send_room_message',
            {
              roomId:
                activeRoom._id,
              message:
                content,
              attachments,
              replyTo: replyingTo?._id || null
            }
          );

        } else {

          socket.emit(
            'send_direct_message',
            {
              recipientId:
                activeRecipient._id,
              message:
                content,
              attachments,
              replyTo: replyingTo?._id || null
            }
          );
        }

        setInputMessage('');
        setReplyingTo(null);

        clearSelectedFile();

        clearTimeout(
          typingTimeoutRef.current
        );

        const typingPayload =
          chatMode === 'room'
            ? {
                roomId:
                  activeRoom?._id
              }
            : {
                recipientId:
                  activeRecipient?._id
              };

        socket.emit(
          'typing_stop',
          typingPayload
        );

      } catch (error) {

        console.error(
          'Failed to send message:',
          error
        );

        setChatError(
          error.response?.data
            ?.message ||
          error.response?.data
            ?.error ||
          error.message ||
          'Could not send message.'
        );

      } finally {

        setIsUploading(false);
      }
    };


  // =========================================================
  // FILTERS
  // =========================================================

  const filteredRooms =
    rooms.filter(
      (room) =>
        String(
          room.name || ''
        )
          .toLowerCase()
          .includes(
            searchQuery
              .toLowerCase()
          )
    );


  const filteredUsers =
    usersList.filter(
      (member) =>
        getDisplayName(member)
          .toLowerCase()
          .includes(
            searchQuery
              .toLowerCase()
          )
    );


  const activeTypers =
    Object.values(
      typingUsers
    ).filter(
      (typingUser) =>
        typingUser?.isTyping
    );


  // =========================================================
  // RENDER
  // =========================================================

  return (

    <div className="fixed inset-0 w-full h-[100dvh] overflow-visible bg-[#efeae2] dark:bg-[#111b21] transition-colors duration-200 md:static md:w-auto md:h-auto md:min-h-screen md:overflow-visible md:flex">

      <Sidebar />

      <main className="flex-1 min-w-0 min-h-0 flex flex-col h-[100dvh] overflow-hidden md:h-screen md:min-h-0">

        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="sticky top-0 z-[90] h-[60px] min-h-[60px] bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#d1d7db] dark:border-[#2a3942] px-3 sm:px-4 flex items-center justify-between shrink-0 md:static md:h-[60px] md:min-h-[60px]">

          <div className="flex items-center gap-2 min-w-0 pl-12 md:pl-0">

            {(chatMode === 'direct' && activeRecipient?._id) || (chatMode === 'room' && activeRoom?._id) ? (
              <button
                type="button"
                onClick={() => {
                  if (chatMode === 'direct') {
                    setActiveRecipient(null);
                    setSidebarTab('dms');
                    navigate('/messages');
                  } else {
                    setActiveRoom(null);
                    setSidebarTab('channels');
                    navigate('/chat');
                  }
                  setMessages([]);
                  setTypingUsers({});
                  setChatError('');
                  setShowRoomMenu(false);
                  setMessageSettingsOpen(false);
                  setSearchQuery('');
                }}
                className="md:hidden relative z-[250] w-10 h-10 -ml-1 rounded-full bg-transparent text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center justify-center shrink-0 touch-manipulation"
                title={chatMode === 'direct' ? 'Back to Direct Messages' : 'Back to Channels'}
                aria-label={chatMode === 'direct' ? 'Back to Direct Messages' : 'Back to Channels'}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : null}

            <div className="w-10 h-10 rounded-full bg-[#dfe5e7] dark:bg-[#3b4a54] flex items-center justify-center text-slate-600 dark:text-slate-200 shrink-0 overflow-hidden">

              {chatMode === 'direct' && (getAvatarUrl(activeRecipient)) ? (
                <img
                  src={getAvatarUrl(activeRecipient)}
                  alt={getDisplayName(activeRecipient)}
                  className="w-full h-full object-cover"
                />
              ) : chatMode === 'room' ? (

                getRoomIsPrivate(
                  activeRoom
                ) ? (

                  <Lock className="w-5 h-5" />

                ) : (() => {
                  const RoomIcon = getRoomIcon(activeRoom);
                  return <RoomIcon className="w-5 h-5" />;
                })()

              ) : (

                <UserCheck className="w-5 h-5" />

              )}

            </div>


            <div className="min-w-0">

              <h1 className="text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef] flex items-center gap-2">

                <span className="truncate">

                  {chatMode ===
                  'room'

                    ? activeRoom?.name ||
                      'Select Channel'

                    : `@${
                        activeRecipient?.username ||
                        activeRecipient?.name ||
                        'member'
                      }`}

                </span>

                <span
                  className={`hidden sm:inline-block w-2 h-2 rounded-full shrink-0 ${
                    isConnected
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                  }`}
                />

              </h1>


              <p className="text-[11px] text-[#667781] dark:text-[#8696a0] truncate">

                {chatMode ===
                'room'

                  ? activeRoom?.description ||
                    (
                      getRoomIsPrivate(
                        activeRoom
                      )
                        ? 'Private Channel'
                        : 'Public Channel'
                    )

                  : 'Direct Conversation'}

              </p>

            </div>

          </div>


          <div className="flex items-center gap-1 shrink-0">

            {isConnected ? (

              <>

                <Wifi className="w-3.5 h-3.5 text-emerald-500" />

                <span className="hidden sm:inline text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Online
                </span>

              </>

            ) : (

              <>

                <WifiOff className="w-3.5 h-3.5 text-rose-500" />

                <span className="hidden sm:inline text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                  Offline
                </span>

              </>

            )}

          </div>

          {chatMode === 'direct' && activeRecipient?._id && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => startDirectCall(false)}
                disabled={!isConnected || Boolean(callState)}
                className="w-10 h-10 rounded-full border-0 bg-transparent text-slate-600 dark:text-slate-300 hover:text-brand-500 hover:border-brand-400 disabled:opacity-40 transition flex items-center justify-center"
                title="Voice call"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => startDirectCall(true)}
                disabled={!isConnected || Boolean(callState)}
                className="w-10 h-10 rounded-full border-0 bg-transparent text-slate-600 dark:text-slate-300 hover:text-brand-500 hover:border-brand-400 disabled:opacity-40 transition flex items-center justify-center"
                title="Video call"
              >
                <Video className="w-4 h-4" />
              </button>
            </div>
          )}

          {chatMode === 'direct' && activeRecipient?._id && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowRoomMenu((previous) => !previous)}
                className="w-10 h-10 rounded-full bg-transparent text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center touch-manipulation"
                title="Chat options"
                aria-label="Chat options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showRoomMenu && (
                <div className="absolute right-0 top-11 z-[120] w-60 rounded-lg border border-slate-200 dark:border-[#2a3942] bg-white dark:bg-[#233138] shadow-2xl p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMessageSettingsOpen((previous) => !previous);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2a3942] text-left"
                  >
                    <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> Message settings</span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${messageSettingsOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {messageSettingsOpen && (
                    <div className="mx-1 mb-1 rounded-lg bg-slate-50 dark:bg-[#202c33] border border-slate-200 dark:border-[#2a3942] p-2.5">
                      <button
                        type="button"
                        onClick={() => setEnterToSend((previous) => !previous)}
                        className="w-full flex items-center justify-between gap-3 text-left"
                      >
                        <span>
                          <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200">Enter to send</span>
                          <span className="block mt-0.5 text-[9px] text-slate-500 dark:text-slate-400">Press Enter to send a message</span>
                        </span>
                        <span className={`relative w-9 h-5 rounded-full transition ${enterToSend ? 'bg-[#1f4f8f]' : 'bg-slate-300 dark:bg-slate-600'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition ${enterToSend ? 'left-[18px]' : 'left-0.5'}`} />
                        </span>
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoomMenu(false);
                      setMessageSettingsOpen(false);
                      setActiveRecipient(null);
                      setMessages([]);
                      setTypingUsers({});
                      setSidebarTab('dms');
                      navigate('/messages');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2a3942] text-left"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Direct Messages
                  </button>
                </div>
              )}
            </div>
          )}

          {chatMode === 'room' && activeRoom?._id && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoomMenu((previous) => !previous)}
                className="w-10 h-10 rounded-full border-0 bg-transparent hover:bg-slate-100 dark:hover:bg-dark-bg text-slate-700 dark:text-white shadow-sm flex items-center justify-center touch-manipulation"
                title="Chat options"
                aria-label="Chat options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showRoomMenu && (
                <div className="absolute right-0 top-11 z-[120] w-60 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMessageSettingsOpen((previous) => !previous);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-bg text-left"
                  >
                    <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> Message settings</span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${messageSettingsOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {messageSettingsOpen && (
                    <div className="mx-1 mb-1 rounded-lg bg-slate-50 dark:bg-[#202c33] border border-slate-200 dark:border-dark-border p-2.5">
                      <button
                        type="button"
                        onClick={() => setEnterToSend((previous) => !previous)}
                        className="w-full flex items-center justify-between gap-3 text-left"
                      >
                        <span>
                          <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200">Enter to send</span>
                          <span className="block mt-0.5 text-[9px] text-slate-500 dark:text-slate-400">Press Enter to send a message</span>
                        </span>
                        <span className={`relative w-9 h-5 rounded-full transition ${enterToSend ? 'bg-[#1f4f8f]' : 'bg-slate-300 dark:bg-slate-600'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition ${enterToSend ? 'left-[18px]' : 'left-0.5'}`} />
                        </span>
                      </button>
                    </div>
                  )}
                  {isSuperAdmin ? (
                    <div className="px-3 py-2.5 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">Super Admin access: room management is available without leaving the channel.</div>
                  ) : getId(activeRoom?.created_by) === getId(user) ? (
                    <div className="px-3 py-2.5 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">You created this room. Transfer ownership before leaving.</div>
                  ) : activeRoom?.isJoined !== false ? (
                    <button type="button" onClick={() => { setShowRoomMenu(false); setLeaveConfirmOpen(true); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-500/10 text-left">
                      <LogOut className="w-4 h-4" /> Leave Room
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          )}

        </header>


        {/* ===================================================
            WORKSPACE
        =================================================== */}

        <div className="flex-1 min-h-0 flex overflow-hidden md:min-h-0 bg-[#efeae2] dark:bg-[#111b21]">


          {/* =================================================
              CHAT NAV
          ================================================= */}

          <div className="w-[300px] lg:w-[320px] bg-white dark:bg-[#111b21] border-r border-[#d1d7db] dark:border-[#2a3942] hidden md:flex flex-col p-0 shrink-0">


            {/* TABS */}

            <div className="flex rounded-none bg-[#f0f2f5] dark:bg-[#202c33] p-1 mb-0 border-b border-[#d1d7db] dark:border-[#2a3942]">

              <button
                type="button"
                onClick={() => {

                  setSidebarTab(
                    'channels'
                  );

                  setSearchQuery('');

                  setActiveRoom(null);
                  setActiveRecipient(null);
                  setMessages([]);
                  setTypingUsers({});
                  setShowRoomMenu(false);
                  navigate('/chat');
                }}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-md transition ${
                  sidebarTab ===
                  'channels'

                    ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-brand-400 shadow-sm'

                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Channels
              </button>


              <button
                type="button"
                onClick={() => {

                  setSidebarTab(
                    'dms'
                  );

                  setSearchQuery('');

                  navigate(
                    '/messages'
                  );
                }}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-md transition ${
                  sidebarTab === 'dms'

                    ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-brand-400 shadow-sm'

                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Direct Msgs
              </button>

            </div>


            {/* SEARCH */}

            <div className="px-3 py-2">

              <div className="relative">

                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

                <input
                  type="text"
                  placeholder={
                    sidebarTab ===
                    'channels'
                      ? 'Search channels...'
                      : 'Search members...'
                  }
                  value={
                    searchQuery
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchQuery(
                      event.target
                        .value
                    )
                  }
                  className="w-full bg-[#f0f2f5] dark:bg-[#202c33] border border-transparent rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
                />

              </div>

            </div>


            {/* =================================================
                CHANNELS
            ================================================= */}

            {sidebarTab ===
            'channels' ? (

              <div className="space-y-1 overflow-y-auto flex-1">

                <div className="flex items-center justify-between px-3 mb-2">

                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Channels
                  </span>

                  <button
                    type="button"
                    onClick={() => {

                      setModalError(
                        ''
                      );

                      setIsModalOpen(
                        true
                      );
                    }}
                    className="p-1 rounded-md bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 transition"
                    title="Create Channel"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                </div>


                {isLoadingRooms ? (

                  <div className="flex items-center justify-center p-6 text-slate-400 gap-2 text-xs">

                    <Loader2 className="w-4 h-4 animate-spin text-brand-500" />

                    Loading channels...

                  </div>

                ) : filteredRooms.length === 0 ? (

                  <div className="px-3 py-8 text-center">

                    <Hash className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-700 mb-2" />

                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      No channels found
                    </p>

                  </div>

                ) : (

                  filteredRooms.map(
                    (room) => {

                      const isActive =
                        chatMode ===
                          'room' &&
                        getId(
                          activeRoom
                        ) ===
                          getId(room);

                      const isPrivate =
                        getRoomIsPrivate(
                          room
                        );

                      /*
                       * NEW:
                       * Get unread count for this
                       * specific channel.
                       */
                      const unreadCount =
                        getRoomUnreadCount(
                          room._id
                        );

                      return (

                        <button
                          type="button"
                          key={
                            room._id
                          }
                          onClick={() =>
                            handleRoomSelect(
                              room
                            )
                          }
                          className={`w-full flex items-center justify-between px-3 py-3 rounded-none text-xs font-semibold transition-colors text-left border-b border-slate-100 dark:border-[#202c33] ${
                            isActive

                              ? 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef]'

                              : 'text-slate-700 dark:text-[#e9edef] hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
                          }`}
                        >

                          <div className="flex items-center gap-2.5 truncate min-w-0">

                            {(() => {
                              const RoomIcon = getRoomIcon(room);
                              return <RoomIcon className="w-4 h-4 shrink-0" />;
                            })()}

                            <span className="truncate">
                              {room.name}
                            </span>

                          </div>


                          <div className="flex items-center gap-1.5 shrink-0 ml-2">

                            {/* UNREAD BADGE */}

                            {unreadCount >
                              0 && (

                              <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">

                                {unreadCount >
                                99
                                  ? '99+'
                                  : unreadCount}

                              </span>
                            )}


                            {!isSuperAdmin && room.type !== 'direct' && room.isJoined === false && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-brand-500 dark:text-brand-400">Join</span>
                            )}
                            {isSuperAdmin && room.type !== 'direct' && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400">Admin</span>
                            )}
                            {isActive && (
                              <ChevronRight className="w-3.5 h-3.5 shrink-0" />

                            )}

                          </div>

                        </button>
                      );
                    }
                  )
                )}

              </div>

            ) : (


              /* =================================================
                 DIRECT MEMBERS
              ================================================= */

              <div className="space-y-1 overflow-y-auto flex-1">

                <div className="px-3 mb-2">

                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Workspace Members
                  </span>

                </div>


                {isLoadingUsers ? (

                  <div className="flex items-center justify-center p-6 text-slate-400 gap-2 text-xs">

                    <Loader2 className="w-4 h-4 animate-spin text-brand-500" />

                    Loading members...

                  </div>

                ) : filteredUsers.length === 0 ? (

                  <div className="px-3 py-8 text-center">

                    <Users className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-700 mb-2" />

                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      No members found
                    </p>

                  </div>

                ) : (

                  filteredUsers.map(
                    (member) => {

                      const memberId =
                        getId(
                          member
                        );

                      const isActive =
                        chatMode ===
                          'direct' &&
                        getId(
                          activeRecipient
                        ) ===
                          memberId;

                      const isOnline =
                        Boolean(
                          onlineUserMap[
                            memberId
                          ] ??
                          member.isOnline
                        );

                      const displayName =
                        getDisplayName(
                          member
                        );

                      /*
                       * NEW:
                       * Get unread count for this
                       * specific direct conversation.
                       */
                      const unreadCount =
                        getDirectUnreadCount(
                          memberId
                        );

                      return (

                        <button
                          type="button"
                          key={
                            member._id
                          }
                          onClick={() =>
                            handleUserSelect(
                              member
                            )
                          }
                          className={`w-full flex items-center justify-between px-3 py-3 rounded-none text-xs font-semibold transition-colors text-left border-b border-slate-100 dark:border-[#202c33] ${
                            isActive

                              ? 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef]'

                              : 'text-slate-700 dark:text-[#e9edef] hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
                          }`}
                        >

                          <div className="flex items-center gap-2.5 truncate min-w-0">

                            <div className="relative shrink-0">

                              {getAvatarUrl(member) ? (

                                <img
                                  src={
                                    getAvatarUrl(member)
                                  }
                                  alt={
                                    displayName
                                  }
                                  className="w-7 h-7 rounded-full object-cover"
                                />

                              ) : (

                                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300">

                                  {displayName
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}

                                </div>

                              )}

                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-dark-card ${
                                  isOnline
                                    ? 'bg-emerald-500'
                                    : 'bg-slate-400'
                                }`}
                              />

                            </div>


                            <span className="truncate">
                              @{displayName}
                            </span>

                          </div>


                          {/* DIRECT UNREAD BADGE */}

                          {unreadCount >
                            0 && (

                            <span className="ml-2 min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 leading-none">

                              {unreadCount >
                              99
                                ? '99+'
                                : unreadCount}

                            </span>

                          )}

                        </button>
                      );
                    }
                  )
                )}

              </div>

            )}

          </div>


          {/* =================================================
              MOBILE CHAT NAVIGATION

              The desktop chat navigator above is intentionally hidden
              below md. On phones we therefore render a dedicated
              navigator here instead of trying to squeeze the 18rem
              desktop sidebar beside the message workspace.
          ================================================= */}
          <div className={`md:hidden shrink-0 bg-white dark:bg-[#111b21] border-r border-[#d1d7db] dark:border-[#2a3942] p-0 ${
            (chatMode === 'direct' && activeRecipient?._id) || (chatMode === 'room' && activeRoom?._id)
              ? 'hidden'
              : 'block'
          }`}>

            <div className="flex rounded-none bg-[#f0f2f5] dark:bg-[#202c33] p-1 border-b border-[#d1d7db] dark:border-[#2a3942]">
              <button
                type="button"
                onClick={() => {
                  setSidebarTab('channels');
                  setSearchQuery('');
                  setActiveRoom(null);
                  setActiveRecipient(null);
                  setMessages([]);
                  setTypingUsers({});
                  setShowRoomMenu(false);
                  if (location.pathname !== '/chat') {
                    navigate('/chat');
                  }
                }}
                className={`flex-1 min-h-10 rounded-lg text-xs font-bold transition ${
                  sidebarTab === 'channels'
                    ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Channels
              </button>

              <button
                type="button"
                onClick={() => {
                  setSidebarTab('dms');
                  setSearchQuery('');
                  if (!location.pathname.startsWith('/messages')) {
                    navigate('/messages');
                  }
                }}
                className={`flex-1 min-h-10 rounded-lg text-xs font-bold transition ${
                  sidebarTab === 'dms'
                    ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Direct Msgs
              </button>
            </div>

            <div className="px-3 py-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={sidebarTab === 'channels' ? 'Search channels...' : 'Search members...'}
                className="w-full h-10 bg-[#f0f2f5] dark:bg-[#202c33] border border-transparent rounded-lg pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
              />
            </div>

            {sidebarTab === 'dms' ? (
              <div className="mt-3 max-h-[30vh] overflow-y-auto overscroll-contain space-y-1 pr-0.5">
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Direct Messages
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {filteredUsers.length} members
                  </span>
                </div>

                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-5 text-slate-400 gap-2 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                    Loading members...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-6 text-center">
                    <Users className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      No members found
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((member) => {
                    const memberId = getId(member);
                    const displayName = getDisplayName(member);
                    const isActive = chatMode === 'direct' && getId(activeRecipient) === memberId;
                    const isOnline = Boolean(onlineUserMap[memberId] ?? member.isOnline);
                    const unreadCount = getDirectUnreadCount(memberId);

                    return (
                      <button
                        type="button"
                        key={memberId}
                        onClick={() => handleUserSelect(member)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-none text-left transition border-b border-slate-100 dark:border-[#202c33] ${
                          isActive
                            ? 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef]'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-bg/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            {getAvatarUrl(member) ? (
                              <img
                                src={getAvatarUrl(member)}
                                alt={displayName}
                                className="w-11 h-11 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-dark-card ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">
                              {displayName}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              {isOnline ? 'Online' : 'Offline'}
                            </p>
                          </div>
                        </div>

                        {unreadCount > 0 && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="mt-3 max-h-[30vh] overflow-y-auto overscroll-contain space-y-1 pr-0.5">
                {isLoadingRooms ? (
                  <div className="flex items-center justify-center py-5 text-slate-400 gap-2 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                    Loading channels...
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    No channels found
                  </div>
                ) : (
                  filteredRooms.map((room) => {
                    const isActive = chatMode === 'room' && getId(activeRoom) === getId(room);
                    const unreadCount = getRoomUnreadCount(room._id);

                    return (
                      <button
                        type="button"
                        key={room._id}
                        onClick={() => handleRoomSelect(room)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition ${
                          isActive
                            ? 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef]'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-bg/60 border border-transparent'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {(() => {
                            const RoomIcon = getRoomIcon(room);
                            return <RoomIcon className="w-4 h-4 shrink-0" />;
                          })()}
                          <span className="truncate">{room.name}</span>
                        </span>
                        {unreadCount > 0 && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* =================================================
              MESSAGE WORKSPACE
          ================================================= */}

          <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] overflow-hidden md:min-h-0">


            {/* ERROR */}

            {chatError && (

              <div className="mx-4 mt-4 shrink-0">

                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">

                  <AlertCircle className="w-4 h-4 shrink-0" />

                  <span className="flex-1">
                    {chatError}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setChatError(
                        ''
                      )
                    }
                  >
                    <X className="w-4 h-4" />
                  </button>

                </div>

              </div>
            )}


            {/* =================================================
                MESSAGES
            ================================================= */}

            <div
              className="relative flex-1 min-h-0 overflow-hidden md:min-h-0"
              style={{
                backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(37,99,235,0.10) 0, transparent 28%), radial-gradient(circle at 85% 80%, rgba(59,130,246,0.08) 0, transparent 30%), repeating-linear-gradient(135deg, rgba(15,23,42,0.035) 0px, rgba(15,23,42,0.035) 1px, transparent 1px, transparent 14px)'
              }}
            >
              {/* Fixed watermark: multiple message icons + EAZY DON CHECK marks.
                  This layer is outside the scrolling message list and never moves. */}
              <div
                className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
                aria-hidden="true"
              >
                <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-10 sm:gap-14 place-items-center opacity-[0.065] rotate-[-12deg] scale-110">
                  {Array.from({ length: 16 }).map((_, watermarkIndex) => (
                    <div
                      key={`watermark-${watermarkIndex}`}
                      className="flex flex-col items-center justify-center gap-2 whitespace-nowrap text-brand-500 dark:text-brand-300"
                    >
                      <MessageSquare className="w-9 h-9 sm:w-12 sm:h-12" strokeWidth={1.6} />
                      <span className="text-[11px] sm:text-sm font-black tracking-[0.18em]">
                        EAZY DON CHECK
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Only this element scrolls. The watermark above remains fixed. */}
              <div className="relative z-10 h-full overflow-y-auto px-3 py-4 sm:px-6 space-y-2.5">
                <div className="relative z-10 flex flex-col space-y-4">

              {isLoadingMessages ? (

                <div className="h-full flex items-center justify-center text-slate-400 text-xs gap-2">

                  <Loader2 className="w-5 h-5 animate-spin text-brand-500" />

                  Loading message history...

                </div>

              ) : !activeRoom &&
                !activeRecipient ? (

                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">

                  <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500">

                    <MessageSquare className="w-7 h-7" />

                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Welcome to EAZY CHECK Chat
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                    Select a channel or member to start a conversation.
                  </p>

                </div>

              ) : messages.length ===
                0 ? (

                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">

                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500">

                    {chatMode ===
                    'room' ? (() => {
                      const RoomIcon = getRoomIcon(activeRoom);
                      return <RoomIcon className="w-6 h-6" />;
                    })() : (

                      <MessageSquare className="w-6 h-6" />

                    )}

                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    No messages yet
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">

                    {chatMode ===
                    'room'

                      ? `Be the first to say something in #${
                          activeRoom?.name ||
                          'this channel'
                        }.`

                      : `Start a conversation with @${
                          activeRecipient?.username ||
                          activeRecipient?.name ||
                          'this member'
                        }.`}

                  </p>

                </div>

              ) : (

                messages.map(
                  (
                    msg,
                    index
                  ) => {

                    const senderObj =
                      msg.sender &&
                      typeof msg.sender ===
                        'object'
                        ? msg.sender
                        : {};

                    const senderId =
                      getId(
                        msg.sender
                      ) ||
                      getId(
                        msg.senderId
                      );

                    /*
                     * Some message payloads contain only senderId or a
                     * minimal sender object. Resolve that ID against the
                     * already-loaded user list/current user/active recipient
                     * so real profile photos are still displayed.
                     */
                    const resolvedSender =
                      getAvatarUrl(senderObj)
                        ? senderObj
                        : (senderId === getId(user)
                            ? user
                            : (senderId === getId(activeRecipient)
                                ? activeRecipient
                                : usersList.find(
                                    (member) => getId(member) === senderId
                                  ) || senderObj));

                    const senderAvatarUrl =
                      getAvatarUrl(resolvedSender);

                    const currentUserId =
                      getId(user);

                    const isOwnMessage =
                      senderId ===
                      currentUserId;

                    const isSystemMessage = msg.message_type === 'system';
                    const isMissedCallMessage =
                      isSystemMessage &&
                      /^Missed\s+(voice|video)\s+call\s+from\s+/i.test(
                        String(msg.content || msg.message || '')
                      );

                    // Missed-call records belong only to the recipient.
                    // Never render a recipient's missed-call record in the caller's inbox.
                    if (
                      isMissedCallMessage &&
                      getId(msg.recipient) !== currentUserId
                    ) {
                      return null;
                    }

                    const isEditingThisMessage = editingMessageId === msg._id?.toString();

                    const attachments =
                      Array.isArray(
                        msg.attachments
                      )
                        ? msg.attachments
                        : msg.attachmentUrl
                          ? [
                              msg.attachmentUrl
                            ]
                          : [];

                    const senderName =
                      getDisplayName(
                        resolvedSender
                      );

                    return (

                      <div
                        key={
                          msg._id ||
                          `${senderId}-${msg.createdAt || index}-${index}`
                        }
                        data-message-id={
                          msg._id
                            ? String(msg._id)
                            : undefined
                        }
                        className={`flex flex-col ${
                          isOwnMessage
                            ? 'items-end'
                            : 'items-start'
                        } space-y-1`}
                      >

                        <div className={`flex items-end gap-2 w-full ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-[#2a3942] shrink-0 flex items-center justify-center self-end mb-1">
                            {senderAvatarUrl ? (
                              <img
                                src={senderAvatarUrl}
                                alt={senderName}
                                className="w-full h-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                {senderName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 max-w-[82%] sm:max-w-[70%] flex flex-col gap-1">
                            <div className={`flex items-center gap-1.5 px-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                              <span className={`${chatMode === 'room' && !isOwnMessage ? 'inline' : 'hidden'} text-[10px] font-semibold text-[#667781] dark:text-[#8696a0] max-w-[160px] truncate`}>
                                {isOwnMessage ? 'You' : senderName}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {msg.createdAt
                                  ? new Date(msg.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : ''}
                              </span>
                            </div>
                        <div className={`relative z-20 flex items-center gap-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                          <button
                            type="button"
                            onClick={() => beginReplyMessage(msg)}
                            className="w-8 h-8 rounded-full text-slate-400 hover:text-brand-500 hover:bg-white dark:hover:bg-dark-card border border-slate-200/50 dark:border-dark-border/50 sm:border-transparent transition flex items-center justify-center touch-manipulation"
                            title="Reply to this message"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setMessageMenuId((previous) => previous === msg._id ? null : msg._id)}
                              className="w-8 h-8 rounded-full text-slate-500 dark:text-slate-300 bg-white/90 dark:bg-[#202c33] border border-slate-200 dark:border-[#2a3942] shadow-sm hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-50 dark:hover:bg-dark-bg transition flex items-center justify-center touch-manipulation"
                              title="Message options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {messageMenuId === msg._id && (
                              <div className={`absolute top-8 ${isOwnMessage ? 'right-0' : 'left-0'} z-50 w-36 rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-xl p-1`}>
                                {isOwnMessage && !isSystemMessage && (
                                  <button type="button" onClick={() => beginEditMessage(msg)} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-bg text-left">
                                    <Pencil className="w-3.5 h-3.5" /> Edit message
                                  </button>
                                )}
                                <button type="button" onClick={() => deleteMessage(msg)} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-left">
                                  <Trash2 className="w-3.5 h-3.5" /> {isOwnMessage ? 'Delete message' : 'Delete for me'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div
                          className={`max-w-full px-3 py-2 rounded-lg text-[13px] leading-relaxed space-y-2 shadow-sm ${
                            isSystemMessage
                              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300'
                              : isOwnMessage
                                ? 'bg-[#1f4f8f] dark:bg-[#173f73] text-white rounded-tr-none'
                                : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none'
                          }`}
                        >

                          {msg.reply_to && (
                            <div className={`rounded-lg border-l-2 px-3 py-2 mb-1 ${isOwnMessage ? 'bg-white/10 border-white/50' : 'bg-slate-100 dark:bg-dark-bg border-brand-500/50'}`}>
                              <p className={`text-[10px] font-bold ${isOwnMessage ? 'text-white/90' : 'text-brand-600 dark:text-brand-400'}`}>
                                Reply to {getDisplayName(msg.reply_to.sender || {})}
                              </p>
                              <p className="text-[10px] opacity-70 truncate">
                                {msg.reply_to.content || (msg.reply_to.message_type === 'voice' ? 'Voice note' : 'Attachment')}
                              </p>
                            </div>
                          )}

                          {attachments.length >
                            0 && (

                            <div className="space-y-2">

                              {attachments.map(
                                (
                                  attachment,
                                  attachmentIndex
                                ) => {

                                  const url =
                                    getAttachmentUrl(
                                      attachment
                                    );

                                  if (!url) {
                                    return null;
                                  }

                                  const fileType =
                                    typeof attachment ===
                                    'object'
                                      ? attachment.file_type
                                      : 'image';

                                  if (
                                    fileType ===
                                    'audio'
                                  ) {
                                    const voiceId = `${msg._id || index}-voice-${attachmentIndex}`;
                                    const voiceProgressValue = Number(voiceProgress[String(voiceId)] || 0);
                                    const voiceDuration =
                                      voiceDurations[String(voiceId)] ||
                                      (typeof attachment === 'object' ? Number(attachment.duration) || 0 : 0);
                                    const isVoicePlaying = playingVoiceId === String(voiceId);

                                    return (
                                      <div
                                        key={voiceId}
                                        className={`w-[220px] max-w-[70vw] rounded-2xl px-2.5 py-2 ${isOwnMessage ? 'bg-white/10' : 'bg-slate-100 dark:bg-dark-bg'}`}
                                      >
                                        <audio
                                          ref={(element) => {
                                            if (element) voiceAudioRefs.current[String(voiceId)] = element;
                                            else delete voiceAudioRefs.current[String(voiceId)];
                                          }}
                                          preload="metadata"
                                          playsInline
                                          src={url}
                                          onTimeUpdate={(event) => handleVoiceTimeUpdate(voiceId, event)}
                                          onLoadedMetadata={(event) => handleVoiceLoadedMetadata(voiceId, event)}
                                          onEnded={() => handleVoiceEnded(voiceId)}
                                          className="hidden"
                                        />

                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => toggleVoiceNote(voiceId, url)}
                                            className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center ${isOwnMessage ? 'bg-white text-[#1f4f8f]' : 'bg-[#1f4f8f] text-white'} shadow-sm hover:scale-[1.03] transition-transform`}
                                            aria-label={isVoicePlaying ? 'Pause voice note' : 'Play voice note'}
                                          >
                                            {isVoicePlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                                          </button>

                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 h-5">
                                              {Array.from({ length: 24 }).map((_, barIndex) => {
                                                const threshold = ((barIndex + 1) / 24) * 100;
                                                const active = threshold <= voiceProgressValue;
                                                const heights = [6, 10, 14, 8, 12, 16, 9, 13, 7, 15, 11, 17];
                                                return (
                                                  <span
                                                    key={barIndex}
                                                    className={`w-[2px] rounded-full ${active ? (isOwnMessage ? 'bg-white' : 'bg-[#1f4f8f]') : (isOwnMessage ? 'bg-white/35' : 'bg-slate-300 dark:bg-slate-600')}`}
                                                    style={{ height: `${heights[barIndex % heights.length]}px` }}
                                                  />
                                                );
                                              })}
                                            </div>
                                            <div className="flex items-center justify-between mt-0.5 text-[9px] opacity-75">
                                              <span>{isVoicePlaying ? 'Playing' : 'Voice note'}</span>
                                              <span>{formatVoiceDuration(voiceDuration)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (
                                    fileType ===
                                    'image'
                                  ) {

                                    return (

                                      <div
                                        key={
                                          attachmentIndex
                                        }
                                        className="overflow-hidden rounded-xl border border-black/10"
                                      >

                                        <img
                                          src={
                                            url
                                          }
                                          alt={
                                            typeof attachment ===
                                            'object'
                                              ? attachment.file_name ||
                                                'Image attachment'
                                              : 'Image attachment'
                                          }
                                          className="w-full h-auto max-h-72 object-cover cursor-pointer hover:opacity-95 transition"
                                          onClick={() =>
                                            window.open(
                                              url,
                                              '_blank',
                                              'noopener,noreferrer'
                                            )
                                          }
                                        />

                                      </div>
                                    );
                                  }

                                  return (

                                    <a
                                      key={
                                        attachmentIndex
                                      }
                                      href={
                                        url
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2 underline"
                                    >

                                      <Paperclip className="w-3.5 h-3.5" />

                                      {typeof attachment ===
                                      'object'
                                        ? attachment.file_name ||
                                          'Attachment'
                                        : 'Attachment'}

                                    </a>
                                  );
                                }
                              )}

                            </div>
                          )}


                          {(msg.content ||
                            msg.message) && (

                            <p className="whitespace-pre-wrap break-words">
                              {isSystemMessage && <Phone className="w-3.5 h-3.5 inline-block mr-1.5 align-[-2px]" />}
                              {msg.content || msg.message}
                              {msg.is_edited && !isSystemMessage && (
                                <span className="ml-2 text-[9px] opacity-60">(edited)</span>
                              )}
                            </p>
                          )}

                        </div>

                          </div>
                        </div>

                        {/* MESSAGE REACTIONS */}
                        <div className={`flex items-center gap-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          {Array.isArray(msg.reactions) && msg.reactions.map((reaction) => {
                            const users = Array.isArray(reaction.users) ? reaction.users : [];
                            const reacted = users.some((reactionUser) => getId(reactionUser) === currentUserId);
                            if (!reaction.emoji || !users.length) return null;
                            return (
                              <button
                                key={reaction.emoji}
                                type="button"
                                onClick={() => toggleReaction(msg._id, reaction.emoji)}
                                className={`px-2 py-0.5 rounded-full border text-[11px] transition ${reacted ? 'bg-brand-500/10 border-brand-500/40 text-brand-600 dark:text-brand-400' : 'bg-white dark:bg-dark-card border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300'}`}
                                title={reacted ? 'Remove reaction' : 'React'}
                              >
                                {reaction.emoji} {users.length}
                              </button>
                            );
                          })}

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setReactionPickerMessageId((previous) => previous === msg._id ? null : msg._id)}
                              className="w-7 h-7 rounded-full bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-400 hover:text-brand-500 hover:border-brand-400 transition flex items-center justify-center"
                              title="Add reaction"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>

                            {reactionPickerMessageId === msg._id && (
                              <div className={`absolute bottom-9 ${isOwnMessage ? 'right-0' : 'left-0'} z-40 flex items-center gap-1 p-2 rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-xl`}>
                                {reactionEmojis.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => toggleReaction(msg._id, emoji)}
                                    className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-bg text-base transition"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  }
                )
              )}


              <div
                ref={
                  messagesEndRef
                }
              />
              </div>
              </div>

            </div>


            {/* =================================================
                TYPING
            ================================================= */}

            {activeTypers.length >
              0 && (

              <div className="px-6 py-1 text-[11px] italic text-slate-500 dark:text-slate-400 flex items-center gap-1.5 animate-pulse">

                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />

                {activeTypers
                  .map(
                    (
                      typingUser
                    ) =>
                      typingUser.username
                  )
                  .join(', ')}

                {activeTypers.length ===
                1
                  ? ' is typing...'
                  : ' are typing...'}

              </div>
            )}


            {/* =================================================
                IMAGE PREVIEW
            ================================================= */}

            {previewUrl && (

              <div className="px-4 py-2 bg-white dark:bg-dark-card border-t border-slate-200 dark:border-dark-border flex items-center justify-between">

                <div className="flex items-center gap-3 min-w-0">

                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-brand-500/30 bg-slate-100 dark:bg-dark-bg shrink-0">

                    <img
                      src={
                        previewUrl
                      }
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />

                  </div>


                  <div className="truncate">

                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">

                      {
                        selectedFile?.name
                      }

                    </p>

                    <p className="text-[10px] text-slate-400">

                      {selectedFile
                        ? (
                            selectedFile.size /
                            (
                              1024 *
                              1024
                            )
                          ).toFixed(2)
                        : '0.00'}{' '}
                      MB • Image Attachment

                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  onClick={
                    clearSelectedFile
                  }
                  disabled={
                    isUploading
                  }
                  className="p-1 text-slate-400 hover:text-rose-500 transition disabled:opacity-40"
                >

                  <X className="w-4 h-4" />

                </button>

              </div>
            )}


            {/* =================================================
                VOICE RECORDING STATUS
            ================================================= */}

            {(isRecordingVoice || isUploadingVoice) && (
              <div className="px-4 py-2 bg-white dark:bg-dark-card border-t border-slate-200 dark:border-dark-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${isRecordingVoice ? 'bg-rose-500 animate-pulse' : 'bg-brand-500'}`} />
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {isUploadingVoice ? 'Uploading voice note...' : `Recording ${Math.floor(recordingSeconds / 60)}:${String(recordingSeconds % 60).padStart(2, '0')}`}
                  </span>
                </div>
                {isRecordingVoice && (
                  <button type="button" onClick={cancelVoiceRecording} className="text-[11px] text-rose-500 hover:underline flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Cancel
                  </button>
                )}
              </div>
            )}

            {/* =================================================
                COMPOSER
            ================================================= */}

            <div className="sticky bottom-0 z-20 shrink-0 px-2 py-2 pb-[max(.5rem,env(safe-area-inset-bottom))] bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#d1d7db] dark:border-[#2a3942] md:static md:z-auto md:p-4 md:pb-4">

              {replyingTo && !editingMessageId && (
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-brand-500/20 bg-brand-500/5 px-3 py-2">
                  <Reply className="w-4 h-4 text-brand-500 shrink-0" />
                  <div className="min-w-0 flex-1 border-l-2 border-brand-500/30 pl-2">
                    <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400">Replying to {getDisplayName(replyingTo.sender || {})}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{replyingTo.content || (replyingTo.message_type === 'voice' ? 'Voice note' : 'Attachment')}</p>
                  </div>
                  <button type="button" onClick={cancelReplyMessage} className="text-slate-400 hover:text-rose-500" title="Cancel reply"><X className="w-4 h-4" /></button>
                </div>
              )}

              {editingMessageId && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-brand-500/20 bg-brand-500/5 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Pencil className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">Editing message</span>
                  </div>
                  <button type="button" onClick={cancelEditMessage} className="text-[11px] font-semibold text-slate-500 hover:text-rose-500">Cancel</button>
                </div>
              )}

              <form
                onSubmit={
                  handleSendMessage
                }
                className="flex items-center gap-2"
              >

                <input
                  type="file"
                  ref={
                    fileInputRef
                  }
                  onChange={
                    handleFileSelect
                  }
                  accept="image/*"
                  className="hidden"
                />


                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    isUploading ||
                    Boolean(editingMessageId) ||
                    !isConnected ||
                    (!activeRoom &&
                      !activeRecipient)
                  }
                  className="w-10 h-10 rounded-full bg-transparent border-0 text-slate-500 text-slate-500 hover:text-slate-900 dark:hover:text-white transition disabled:opacity-40"
                  title="Attach Image"
                >

                  <Paperclip className="w-4 h-4" />

                </button>


                <input
                  type="text"
                  placeholder={
                    editingMessageId ? 'Edit your message...' :
                    chatMode ===
                    'room'

                      ? `Message #${
                          activeRoom?.name ||
                          'channel'
                        }...`

                      : `Message @${
                          activeRecipient?.username ||
                          activeRecipient?.name ||
                          'member'
                        }...`
                  }
                  value={
                    inputMessage
                  }
                  onChange={
                    handleInputChange
                  }
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;

                    if (enterToSend && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    } else if (!enterToSend && event.ctrlKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  disabled={
                    isUploading ||
                    (!activeRoom &&
                      !activeRecipient)
                  }
                  data-chat-composer-input
                  className="flex-1 bg-white dark:bg-[#2a3942] border border-transparent rounded-full px-4 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors"
                />


                <button
                  type="button"
                  onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
                  disabled={isUploading || isUploadingVoice || !isConnected || (!activeRoom && !activeRecipient) || Boolean(editingMessageId)}
                  className={`w-10 h-10 rounded-full border-0 transition disabled:opacity-40 flex items-center justify-center ${isRecordingVoice ? 'bg-rose-500 text-white border-rose-500 animate-pulse' : 'bg-slate-100 dark:bg-dark-bg border-slate-200 dark:border-dark-border text-slate-500 hover:text-brand-500'}`}
                  title={isRecordingVoice ? 'Stop and send voice note' : 'Record voice note'}
                >
                  {isRecordingVoice ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  type="submit"
                  disabled={
                    (!inputMessage.trim() && !selectedFile) ||
                    !isConnected ||
                    isUploading ||
                    (
                      chatMode ===
                        'room' &&
                      !activeRoom
                    ) ||
                    (
                      chatMode ===
                        'direct' &&
                      !activeRecipient
                    )
                  }
                  className="w-10 h-10 inline-flex items-center justify-center bg-[#1f4f8f] hover:bg-[#173f73] disabled:opacity-50 text-white rounded-full shadow-sm transition-all gap-2"
                >

                  {isUploading ? (

                    <Loader2 className="w-3.5 h-3.5 animate-spin" />

                  ) : (

                    <Send className="w-3.5 h-3.5" />

                  )}

                  <span className="sr-only">Send</span>

                </button>

              </form>

            </div>

          </div>

        </div>

      </main>


      {callState && (
        <DirectCallOverlay
          callState={callState}
          onAccept={async () => {
            try {
              stopCallRingtone();
              if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
              const stream = await requestMediaStream(callState.withVideo);
              localStreamRef.current = stream;
              setCallState((previous) => previous ? { ...previous, status: 'connecting', localStream: stream } : previous);
              socket.emit('accept_call', { targetUserId: callState.peerId, callId: callState.callId, withVideo: callState.withVideo });
            } catch (error) {
              setCallError(getMediaAccessError(error, { video: callState.withVideo }));
            }
          }}
          onReject={() => {
            socket?.emit('reject_call', { targetUserId: callState.peerId, callId: callState.callId, reason: 'declined' });
            endCall(false);
          }}
          onEnd={() => endCall(true)}
          onToggleMute={() => {
            const track = localStreamRef.current?.getAudioTracks?.()[0];
            if (track) track.enabled = !track.enabled;
            setCallState((previous) => previous ? { ...previous, muted: !previous.muted } : previous);
          }}
          onToggleCamera={() => {
            const track = localStreamRef.current?.getVideoTracks?.()[0];
            if (track) track.enabled = !track.enabled;
            setCallState((previous) => previous ? { ...previous, cameraOff: !previous.cameraOff } : previous);
          }}
          error={callError}
        />
      )}

      {/* =====================================================
          JOIN ROOM MODAL
      ===================================================== */}
      {showJoinRoomModal && roomToJoin && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 mb-4"><UserPlus className="w-6 h-6" /></div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Join {roomToJoin.name}?</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{roomToJoin.description || 'Join this room to view messages and participate in the conversation.'}</p>
            <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400"><Users className="w-3.5 h-3.5" />{Number(roomToJoin.memberCount ?? roomToJoin.members?.length ?? 0).toLocaleString()} members</div>
            {modalError && <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">{modalError}</div>}
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" disabled={isJoiningRoom} onClick={() => { setShowJoinRoomModal(false); setRoomToJoin(null); setModalError(''); navigate('/chat'); }} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-50">Cancel</button>
              <button type="button" disabled={isJoiningRoom} onClick={handleJoinRoom} className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50">{isJoiningRoom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}Join Room</button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          LEAVE ROOM CONFIRMATION
      ===================================================== */}
      {leaveConfirmOpen && activeRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4"><LogOut className="w-6 h-6" /></div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Leave {activeRoom.name}?</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">You will stop receiving messages and notifications from this room. You can join again later.</p>
            <div className="flex justify-end gap-2 mt-6"><button type="button" disabled={isLeavingRoom} onClick={() => setLeaveConfirmOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-50">Cancel</button><button type="button" disabled={isLeavingRoom} onClick={handleLeaveRoom} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50">{isLeavingRoom && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Leave Room</button></div>
          </div>
        </div>
      )}

      {/* =====================================================
          CREATE CHANNEL MODAL
      ===================================================== */}

      {isModalOpen && (

        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative">


            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-dark-border">

              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">

                <Plus className="w-4 h-4 text-brand-500" />

                Create New Channel

              </h3>


              <button
                type="button"
                onClick={() => {

                  setIsModalOpen(
                    false
                  );

                  setModalError('');
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
              >

                <X className="w-5 h-5" />

              </button>

            </div>


            {modalError && (

              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs">

                {modalError}

              </div>
            )}


            <form
              onSubmit={
                handleCreateRoom
              }
              className="mt-4 flex flex-col gap-4"
            >


              <div>

                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">

                  Channel Name{' '}

                  <span className="text-brand-500">
                    *
                  </span>

                </label>


                <input
                  type="text"
                  required
                  maxLength={50}
                  placeholder="e.g. general-discussions"
                  value={
                    roomFormData.name
                  }
                  onChange={(event) =>
                    setRoomFormData(
                      (
                        previous
                      ) => ({
                        ...previous,
                        name:
                          event
                            .target
                            .value
                      })
                    )
                  }
                  className="w-full bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-dark-border focus:border-brand-500 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition"
                />

              </div>


              <div>

                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>


                <textarea
                  rows="3"
                  maxLength={250}
                  placeholder="What is this channel about?"
                  value={
                    roomFormData.description
                  }
                  onChange={(event) =>
                    setRoomFormData(
                      (
                        previous
                      ) => ({
                        ...previous,
                        description:
                          event
                            .target
                            .value
                      })
                    )
                  }
                  className="w-full bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-dark-border focus:border-brand-500 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition resize-none"
                />

              </div>


              <div className="flex items-center justify-between bg-slate-100 dark:bg-dark-bg/60 p-3 rounded-xl border border-slate-200 dark:border-dark-border">

                <div className="flex items-center gap-2.5">

                  {roomFormData.isPrivate ? (

                    <Lock className="w-4 h-4 text-brand-500" />

                  ) : (

                    <Globe className="w-4 h-4 text-slate-400" />

                  )}


                  <div>

                    <p className="text-xs font-bold text-slate-900 dark:text-white">

                      {roomFormData.isPrivate
                        ? 'Private Channel'
                        : 'Public Channel'}

                    </p>


                    <p className="text-[10px] text-slate-500 dark:text-slate-400">

                      {roomFormData.isPrivate
                        ? 'Only invited members can join'
                        : 'Anyone on the platform can join'}

                    </p>

                  </div>

                </div>


                <input
                  type="checkbox"
                  checked={
                    roomFormData.isPrivate
                  }
                  onChange={(event) =>
                    setRoomFormData(
                      (
                        previous
                      ) => ({
                        ...previous,
                        isPrivate:
                          event
                            .target
                            .checked
                      })
                    )
                  }
                  className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                />

              </div>


              <div className="flex justify-end gap-2 pt-2">

                <button
                  type="button"
                  onClick={() => {

                    setIsModalOpen(
                      false
                    );

                    setModalError('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={
                    isCreatingRoom ||
                    !roomFormData.name.trim()
                  }
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition flex items-center gap-2 disabled:opacity-50"
                >

                  {isCreatingRoom && (

                    <Loader2 className="w-3.5 h-3.5 animate-spin" />

                  )}

                  Create Channel

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}