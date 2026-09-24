import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AlertCircle,
  AudioLines,
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  FileImage,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  PenLine,
  Play,
  Send,
  Share2,
  Trash2,
  Upload,
  User as UserIcon,
  Video,
  X,
  Heart,
  Users,
  UsersRound,
  MessageSquare,
  Globe2,
  Link2,
} from 'lucide-react';

import AppLayout from '../components/layout/AppLayout';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import apiClient from '../utils/apiClient';

const MAX_MEDIA_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const formatDate = (date) => {
  if (!date) return '';

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return '';
  }

  const now = new Date();
  const diff = now.getTime() - value.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return 'Just now';
  }

  if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes}m ago`;
  }

  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}h ago`;
  }

  if (diff < 7 * day) {
    const days = Math.floor(diff / day);
    return `${days}d ago`;
  }

  return value.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getInitials = (name = '') => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return 'U';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getApiMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const getPostId = (post) =>
  post?._id ||
  post?.id ||
  post?.postId ||
  null;

const getUserId = (user) =>
  user?._id ||
  user?.id ||
  user?.userId ||
  null;

const getAuthorName = (author) => {
  if (!author) {
    return 'EAZY CHECK User';
  }

  const fullName = [
    author.firstName,
    author.middleName,
    author.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    author.name ||
    fullName ||
    author.username ||
    'EAZY CHECK User'
  );
};

const getMediaType = (file) => {
  if (file.type.startsWith('image/')) {
    return 'image';
  }

  if (file.type.startsWith('video/')) {
    return 'video';
  }

  if (file.type.startsWith('audio/')) {
    return 'audio';
  }

  return 'file';
};

function Avatar({
  user,
  size = 'md',
}) {
  const sizeClass =
    size === 'sm'
      ? 'h-9 w-9 text-xs'
      : size === 'lg'
        ? 'h-12 w-12 text-sm'
        : 'h-10 w-10 text-xs';

  const avatarUrl =
    user?.avatarUrl ||
    user?.avatar ||
    user?.profileImage ||
    null;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={getAuthorName(user)}
        className={`${sizeClass} rounded-full object-cover border border-slate-200 dark:border-slate-700`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600`}
    >
      {getInitials(getAuthorName(user))}
    </div>
  );
}

function MediaPreview({
  media,
  removable = false,
  onRemove,
}) {
  if (!media) {
    return null;
  }

  const type = media.type || media.mimetype;

  if (type === 'image' || type?.startsWith?.('image/')) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
        <img
          src={media.previewUrl || media.url}
          alt={media.originalName || 'Feed media'}
          className="w-full max-h-[520px] object-cover"
        />

        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white hover:bg-black/90 transition"
            aria-label="Remove media"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  if (type === 'video' || type?.startsWith?.('video/')) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-black">
        <video
          src={media.previewUrl || media.url}
          controls
          className="w-full max-h-[520px]"
        />

        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white hover:bg-black/90 transition"
            aria-label="Remove media"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  if (type === 'audio' || type?.startsWith?.('audio/')) {
    return (
      <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-200 dark:bg-slate-800 p-3">
            <AudioLines size={20} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {media.originalName || 'Audio file'}
            </p>

            <audio
              src={media.previewUrl || media.url}
              controls
              className="mt-2 w-full"
            />
          </div>
        </div>

        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 rounded-full bg-slate-900 p-2 text-white hover:bg-black transition"
            aria-label="Remove media"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-4">
      <Paperclip size={20} />

      <span className="truncate text-sm">
        {media.originalName || 'Attached file'}
      </span>

      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto rounded-full bg-slate-200 dark:bg-slate-800 p-2 hover:bg-slate-300 dark:hover:bg-slate-700"
          aria-label="Remove media"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function PostMedia({ media = [] }) {
  if (!media.length) {
    return null;
  }

  return (
    <div
      className={`mt-4 grid gap-2 ${
        media.length === 1
          ? 'grid-cols-1'
          : 'grid-cols-2'
      }`}
    >
      {media.map((item, index) => (
        <MediaPreview
          key={`${item.publicId || item.url || index}`}
          media={item}
        />
      ))}
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  postAuthorId,
  onDelete,
}) {
  const author = comment?.author || {};

  const commentAuthorId = getUserId(author);

  const canDelete =
    currentUserId &&
    (
      String(commentAuthorId) === String(currentUserId) ||
      String(postAuthorId) === String(currentUserId)
    );

  return (
    <div className="flex gap-3">
      <Avatar user={author} size="sm" />

      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {getAuthorName(author)}
              </p>

              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {formatDate(comment.createdAt)}
              </p>
            </div>

            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(comment)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-red-500 dark:hover:bg-slate-700"
                title="Delete comment"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-200">
            {comment.content}
          </p>
        </div>
      </div>
    </div>
  );
}


function ShareModal({
  post,
  mode,
  setMode,
  friends,
  rooms,
  loadingTargets,
  selectedFriendIds,
  setSelectedFriendIds,
  selectedRoomId,
  setSelectedRoomId,
  shareMessage,
  setShareMessage,
  actionLoading,
  onLoadTargets,
  onConfirm,
  onClose,
}) {
  if (!post) {
    return null;
  }

  const postId = getPostId(post);
  const author = post.author || {};
  const previewText =
    post.content?.trim() ||
    'Shared post from the EAZY DON CHECK community.';

  const toggleFriend = (friendId) => {
    setSelectedFriendIds((previous) =>
      previous.includes(String(friendId))
        ? previous.filter((id) => id !== String(friendId))
        : [...previous, String(friendId)]
    );
  };

  const modes = [
    {
      id: 'feed',
      label: 'Feed timeline',
      description: 'Share this post to your own timeline.',
      icon: Globe2,
    },
    {
      id: 'friends',
      label: 'Friends',
      description: 'Send this post directly to one or more friends.',
      icon: UsersRound,
    },
    {
      id: 'room',
      label: 'Room',
      description: 'Post this share inside one of your chat rooms.',
      icon: MessageSquare,
    },
    {
      id: 'link',
      label: 'Copy link',
      description: 'Copy a direct link to this post.',
      icon: Link2,
    },
  ];

  const canConfirm =
    mode === 'friends'
      ? selectedFriendIds.length > 0
      : mode === 'room'
        ? Boolean(selectedRoomId)
        : true;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !actionLoading) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-dark-card sm:rounded-3xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Share2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Share post
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose where you want to share it.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={actionLoading}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close share dialog"
          >
            <X size={19} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-start gap-3">
              <Avatar user={author} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {getAuthorName(author)}
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {previewText}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {modes.map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMode(item.id);
                    if (item.id === 'friends' || item.id === 'room') {
                      onLoadTargets(item.id);
                    }
                  }}
                  disabled={actionLoading}
                  className={`relative flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-dark-card dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs font-semibold">
                    {item.label}
                  </span>
                  {active && (
                    <span className="absolute right-2 top-2">
                      <Check size={13} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Message
            </label>
            <textarea
              value={shareMessage}
              onChange={(event) => setShareMessage(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Add a message with your share (optional)"
              disabled={actionLoading}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500"
            />
          </div>

          {mode === 'friends' && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Select friends
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {selectedFriendIds.length} selected
                  </p>
                </div>
              </div>

              {loadingTargets ? (
                <div className="flex items-center justify-center rounded-2xl border border-slate-200 py-10 dark:border-slate-800">
                  <Loader2 size={20} className="animate-spin text-slate-500" />
                </div>
              ) : friends.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center dark:border-slate-700">
                  <UsersRound className="mx-auto text-slate-400" size={24} />
                  <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    No friends available
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Add friends before sending posts directly to them.
                  </p>
                </div>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {friends.map((friend) => {
                    const friendId = getUserId(friend);
                    const selected = selectedFriendIds.includes(String(friendId));

                    return (
                      <button
                        key={friendId}
                        type="button"
                        onClick={() => toggleFriend(friendId)}
                        disabled={actionLoading}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                          selected
                            ? 'border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800'
                            : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Avatar user={friend} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                            {getAuthorName(friend)}
                          </span>
                          {friend.username && (
                            <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                              @{friend.username}
                            </span>
                          )}
                        </span>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                            selected
                              ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {selected && <Check size={12} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {mode === 'room' && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                Select a room
              </p>

              {loadingTargets ? (
                <div className="flex items-center justify-center rounded-2xl border border-slate-200 py-10 dark:border-slate-800">
                  <Loader2 size={20} className="animate-spin text-slate-500" />
                </div>
              ) : rooms.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center dark:border-slate-700">
                  <MessageSquare className="mx-auto text-slate-400" size={24} />
                  <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    No rooms available
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Join a chat room before sharing a post there.
                  </p>
                </div>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {rooms
                    .filter((room) => room?.is_archived !== true)
                    .map((room) => {
                      const roomId = room?._id || room?.id || room?.roomId;
                      const selected = String(selectedRoomId) === String(roomId);

                      return (
                        <button
                          key={roomId}
                          type="button"
                          onClick={() => setSelectedRoomId(roomId)}
                          disabled={actionLoading}
                          className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                            selected
                              ? 'border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800'
                              : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <MessageSquare size={18} />
                          </div>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                              {room.name || room.title || 'Chat room'}
                            </span>
                            <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                              {room.type === 'private' ? 'Private room' : 'Community room'}
                            </span>
                          </span>
                          {selected && <Check size={17} />}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {mode === 'feed' && (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
              <div className="flex items-start gap-3">
                <Globe2 size={18} className="mt-0.5 text-slate-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Share to your Feed timeline
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    The post will be published as a new timeline entry with a reference to the original post.
                  </p>
                </div>
              </div>
            </div>
          )}

          {mode === 'link' && (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
              <div className="flex items-start gap-3">
                <Link2 size={18} className="mt-0.5 text-slate-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Copy a direct post link
                  </p>
                  <p className="mt-1 break-all text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {window.location.origin}/feed?post={postId}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-slate-200 p-5 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={actionLoading}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm || actionLoading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {actionLoading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 size={17} />
                Share now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PostCard({
  post,
  currentUser,
  onLike,
  onComment,
  onShare,
  onDelete,
  onEdit,
  sharing = false,
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');

  const postId = getPostId(post);
  const currentUserId = getUserId(currentUser);
  const author = post.author || {};

  const authorId = getUserId(author);

  const canManage =
    currentUserId &&
    (
      String(currentUserId) === String(authorId) ||
      currentUser?.role === 'superadmin'
    );

  const loadComments = useCallback(async () => {
    if (!postId) return;

    setCommentsLoading(true);
    setCommentError('');

    try {
      const response = await apiClient.get(
        `/feed/${postId}/comments`
      );

      const payload = response.data?.data || response.data || {};

      setComments(
        Array.isArray(payload)
          ? payload
          : payload.comments || []
      );
    } catch (error) {
      setCommentError(
        getApiMessage(
          error,
          'Unable to load comments.'
        )
      );
    } finally {
      setCommentsLoading(false);
    }
  }, [postId]);

  const toggleComments = async () => {
    const next = !commentsOpen;

    setCommentsOpen(next);

    if (next && comments.length === 0) {
      await loadComments();
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();

    const content = commentText.trim();

    if (!content || !postId || commentSubmitting) {
      return;
    }

    setCommentSubmitting(true);
    setCommentError('');

    try {
      const response = await apiClient.post(
        `/feed/${postId}/comments`,
        { content }
      );

      const payload = response.data?.data || response.data || {};

      const newComment =
        payload.comment ||
        payload;

      if (newComment && newComment._id) {
        setComments((previous) => [
          ...previous,
          newComment,
        ]);
      } else {
        await loadComments();
      }

      setCommentText('');

      if (onComment) {
        onComment(postId);
      }
    } catch (error) {
      setCommentError(
        getApiMessage(
          error,
          'Unable to publish comment.'
        )
      );
    } finally {
      setCommentSubmitting(false);
    }
  };

  const deleteComment = async (comment) => {
    const commentId = comment?._id || comment?.id;

    if (!commentId || !postId) {
      return;
    }

    try {
      await apiClient.delete(
        `/feed/${postId}/comments/${commentId}`
      );

      setComments((previous) =>
        previous.filter(
          (item) =>
            String(item._id || item.id) !==
            String(commentId)
        )
      );

      if (onComment) {
        onComment(postId, -1);
      }
    } catch (error) {
      setCommentError(
        getApiMessage(
          error,
          'Unable to delete comment.'
        )
      );
    }
  };

  return (
    <article
      id={postId ? `feed-post-${postId}` : undefined}
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm overflow-hidden transition-shadow duration-300"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Avatar user={author} />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {getAuthorName(author)}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {author.username && (
                    <span>
                      @{author.username}
                    </span>
                  )}

                  {post.createdAt && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={12} />
                        {formatDate(post.createdAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(post)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                    title="Edit post"
                  >
                    <Edit3 size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(post)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                    title="Delete post"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {post.content && (
              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
                {post.content}
              </p>
            )}

            <PostMedia media={post.media || []} />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-4">
                <span>
                  {post.likesCount || 0}{' '}
                  {post.likesCount === 1 ? 'like' : 'likes'}
                </span>

                <span>
                  {post.commentsCount || 0}{' '}
                  {post.commentsCount === 1
                    ? 'comment'
                    : 'comments'}
                </span>

                <span>
                  {post.sharesCount || 0}{' '}
                  {post.sharesCount === 1
                    ? 'share'
                    : 'shares'}
                </span>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => onLike(post)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  post.likedByMe
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Heart
                  size={17}
                  fill={post.likedByMe ? 'currentColor' : 'none'}
                />
                <span className="hidden xs:inline sm:inline">
                  Like
                </span>
              </button>

              <button
                type="button"
                onClick={toggleComments}
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                <MessageCircle size={17} />
                <span>Comment</span>
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onShare(post);
                }}
                disabled={sharing}
                aria-label="Share this post"
                title="Share this post"
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                {sharing ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Share2 size={17} />
                )}
                <span>{sharing ? 'Sharing...' : 'Share'}</span>
              </button>
            </div>

            {commentsOpen && (
              <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                <form
                  onSubmit={submitComment}
                  className="flex items-end gap-2"
                >
                  <Avatar
                    user={currentUser}
                    size="sm"
                  />

                  <div className="flex-1">
                    <textarea
                      value={commentText}
                      onChange={(event) =>
                        setCommentText(event.target.value)
                      }
                      placeholder="Write a comment..."
                      rows={1}
                      maxLength={2000}
                      className="min-h-[42px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      !commentText.trim() ||
                      commentSubmitting
                    }
                    className="rounded-xl bg-slate-900 p-3 text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
                    title="Send comment"
                  >
                    {commentSubmitting ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Send size={17} />
                    )}
                  </button>
                </form>

                {commentError && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle
                      size={15}
                      className="mt-0.5 shrink-0"
                    />
                    <span>{commentError}</span>
                  </div>
                )}

                <div className="mt-4 space-y-4">
                  {commentsLoading ? (
                    <div className="flex items-center justify-center py-5 text-slate-500">
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="py-3 text-center text-sm text-slate-500 dark:text-slate-400">
                      No comments yet.
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <CommentItem
                        key={
                          comment._id ||
                          comment.id
                        }
                        comment={comment}
                        currentUserId={
                          currentUserId
                        }
                        postAuthorId={authorId}
                        onDelete={deleteComment}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function Feed() {
  const { user } = useAuth();
  const { sendDirectMessage, sendRoomMessage, isConnected } = useSocket();

  const fileInputRef = useRef(null);

  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [sharingPostId, setSharingPostId] = useState(null);

  const [shareModalPost, setShareModalPost] = useState(null);
  const [shareMode, setShareMode] = useState('feed');
  const [shareFriends, setShareFriends] = useState([]);
  const [shareRooms, setShareRooms] = useState([]);
  const [shareTargetsLoading, setShareTargetsLoading] = useState(false);
  const [selectedShareFriendIds, setSelectedShareFriendIds] = useState([]);
  const [selectedShareRoomId, setSelectedShareRoomId] = useState(null);
  const [shareMessage, setShareMessage] = useState('');
  const [shareActionLoading, setShareActionLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [openMenu, setOpenMenu] = useState(null);

  const location = useLocation();
  const focusedPostIdRef = useRef(null);

  const currentUserId = useMemo(
    () => getUserId(user) || getUserId(user?.user),
    [user]
  );

  const displayName =
    user?.name ||
    user?.username ||
    'there';

  const fetchFeed = useCallback(
    async ({
      requestedPage = 1,
      append = false,
    } = {}) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const response = await apiClient.get(
          '/feed',
          {
            params: {
              page: requestedPage,
              limit: 10,
            },
          }
        );

        const payload =
          response.data?.data ||
          response.data ||
          {};

        const incomingPosts =
          payload.posts ||
          payload.feed ||
          (Array.isArray(payload)
            ? payload
            : []);

        const pagination =
          payload.pagination ||
          {};

        setPosts((previous) =>
          append
            ? [...previous, ...incomingPosts]
            : incomingPosts
        );

        setPage(requestedPage);

        const nextHasMore =
          typeof pagination.hasMore === 'boolean'
            ? pagination.hasMore
            : Boolean(
                pagination.nextPage ||
                requestedPage <
                  Number(pagination.pages || 0)
              );

        setHasMore(nextHasMore);
      } catch (requestError) {
        setError(
          getApiMessage(
            requestError,
            'Unable to load the Feed.'
          )
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Open a shared Feed link directly on the original post. If the post is
  // outside the first page, fetch that exact post before scrolling to it.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetPostId = params.get('post');

    if (!targetPostId || loading) {
      return;
    }

    if (focusedPostIdRef.current === targetPostId) {
      return;
    }

    let cancelled = false;

    const focusOriginalPost = async () => {
      try {
        let targetExists = posts.some(
          (post) => String(getPostId(post)) === String(targetPostId)
        );

        if (!targetExists) {
          const response = await apiClient.get(`/feed/${targetPostId}`);
          const payload = response.data?.data || response.data || {};
          const targetPost = payload.post || payload;

          if (targetPost && getPostId(targetPost)) {
            setPosts((previous) => {
              const alreadyThere = previous.some(
                (post) => String(getPostId(post)) === String(getPostId(targetPost))
              );

              return alreadyThere ? previous : [targetPost, ...previous];
            });
            targetExists = true;
          }
        }

        if (!targetExists || cancelled) {
          return;
        }

        focusedPostIdRef.current = targetPostId;

        window.setTimeout(() => {
          if (cancelled) return;

          const element = document.getElementById(
            `feed-post-${targetPostId}`
          );

          if (!element) return;

          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });

          element.classList.add('ring-2', 'ring-brand-500', 'ring-offset-2', 'dark:ring-offset-dark-bg');

          window.setTimeout(() => {
            element.classList.remove('ring-2', 'ring-brand-500', 'ring-offset-2', 'dark:ring-offset-dark-bg');
          }, 3500);
        }, 150);
      } catch (requestError) {
        console.warn('Unable to open shared Feed post:', requestError);
      }
    };

    focusOriginalPost();

    return () => {
      cancelled = true;
    };
  }, [location.search, loading, posts]);

  const handleFileSelect = (event) => {
    const files = Array.from(
      event.target.files || []
    );

    if (!files.length) {
      return;
    }

    setError('');
    setSuccess('');

    const remainingSlots =
      MAX_MEDIA_FILES - selectedFiles.length;

    const candidates = files.slice(
      0,
      remainingSlots
    );

    const validFiles = [];

    for (const file of candidates) {
      if (
        !(
          file.type.startsWith('image/') ||
          file.type.startsWith('video/') ||
          file.type.startsWith('audio/')
        )
      ) {
        setError(
          `${file.name} is not a supported Feed media file.`
        );
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(
          `${file.name} is larger than the 50MB limit.`
        );
        continue;
      }

      validFiles.push({
        file,
        type: getMediaType(file),
        originalName: file.name,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setSelectedFiles((previous) => [
      ...previous,
      ...validFiles,
    ]);

    event.target.value = '';
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((previous) => {
      const target = previous[index];

      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return previous.filter(
        (_, itemIndex) => itemIndex !== index
      );
    });
  };

  const uploadFile = async (file) => {
    const formData = new FormData();

    formData.append('file', file);

    const response = await apiClient.post(
      '/feed/upload',
      formData
    );

    const payload =
      response.data?.data ||
      response.data ||
      {};

    return payload;
  };

  const handlePublish = async (event) => {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (
      !trimmedContent &&
      selectedFiles.length === 0
    ) {
      setError(
        'Write something or attach media before publishing.'
      );
      return;
    }

    if (publishing || uploadingMedia) {
      return;
    }

    setPublishing(true);
    setError('');
    setSuccess('');

    try {
      let uploadedMedia = [];

      if (selectedFiles.length > 0) {
        setUploadingMedia(true);

        uploadedMedia = await Promise.all(
          selectedFiles.map((item) =>
            uploadFile(item.file)
          )
        );

        setUploadingMedia(false);
      }

      const response = await apiClient.post(
        '/feed',
        {
          content: trimmedContent,
          media: uploadedMedia,
          visibility: 'public',
        }
      );

      const payload =
        response.data?.data ||
        response.data ||
        {};

      const newPost =
        payload.post ||
        payload;

      if (newPost && (newPost._id || newPost.id)) {
        setPosts((previous) => [
          newPost,
          ...previous,
        ]);
      } else {
        await fetchFeed();
      }

      selectedFiles.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });

      setContent('');
      setSelectedFiles([]);

      setSuccess('Your post has been published.');

      window.setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (requestError) {
      setUploadingMedia(false);

      setError(
        getApiMessage(
          requestError,
          'Unable to publish your post.'
        )
      );
    } finally {
      setPublishing(false);
    }
  };

  const handleLike = async (post) => {
    const postId = getPostId(post);

    if (!postId) return;

    setPosts((previous) =>
      previous.map((item) => {
        if (
          String(getPostId(item)) !==
          String(postId)
        ) {
          return item;
        }

        const liked = !item.likedByMe;

        return {
          ...item,
          likedByMe: liked,
          likesCount: Math.max(
            0,
            Number(item.likesCount || 0) +
              (liked ? 1 : -1)
          ),
        };
      })
    );

    try {
      const response = await apiClient.post(
        `/feed/${postId}/like`
      );

      const payload =
        response.data?.data ||
        response.data ||
        {};

      setPosts((previous) =>
        previous.map((item) =>
          String(getPostId(item)) ===
          String(postId)
            ? {
                ...item,
                likedByMe:
                  typeof payload.liked ===
                  'boolean'
                    ? payload.liked
                    : item.likedByMe,
                likesCount:
                  typeof payload.likesCount ===
                  'number'
                    ? payload.likesCount
                    : item.likesCount,
              }
            : item
        )
      );
    } catch (requestError) {
      setPosts((previous) =>
        previous.map((item) =>
          String(getPostId(item)) ===
          String(postId)
            ? post
            : item
        )
      );

      setError(
        getApiMessage(
          requestError,
          'Unable to update the like.'
        )
      );
    }
  };

  const handleCommentCount = (
    postId,
    adjustment = 1
  ) => {
    setPosts((previous) =>
      previous.map((item) =>
        String(getPostId(item)) ===
        String(postId)
          ? {
              ...item,
              commentsCount: Math.max(
                0,
                Number(item.commentsCount || 0) +
                  adjustment
              ),
            }
          : item
      )
    );
  };

  const handleShare = (post) => {
    const postId = getPostId(post);

    if (!postId || sharingPostId) {
      return;
    }

    setShareModalPost(post);
    setShareMode('feed');
    setSelectedShareFriendIds([]);
    setSelectedShareRoomId(null);
    setShareMessage('');
    setError('');
    setSuccess('');
  };

  const loadShareTargets = async (targetMode) => {
    setShareTargetsLoading(true);
    setError('');

    try {
      if (targetMode === 'friends') {
        const response = await apiClient.get('/users/me');
        const result = response.data || {};
        const responseData = result.data || {};
        const payload =
          result.user ||
          responseData.user ||
          responseData ||
          result;

        // The authenticated user can already contain the populated friends
        // list. Prefer the fresh /users/me response, but fall back to the
        // AuthContext copy so a stale response wrapper cannot hide friends.
        let fetchedFriends = Array.isArray(payload?.friends)
          ? payload.friends
          : Array.isArray(user?.friends)
            ? user.friends
            : [];

        // Some versions of the users endpoint return friend IDs instead
        // of populated friend objects. Resolve those IDs from /users so
        // the share dialog can still display and select the real users.
        const friendIds = fetchedFriends
          .map((friend) =>
            typeof friend === 'string'
              ? friend
              : getUserId(friend)
          )
          .filter(Boolean)
          .map(String);

        const needsPopulation = fetchedFriends.some(
          (friend) =>
            typeof friend === 'string' ||
            !getUserId(friend) ||
            (typeof friend === 'object' &&
              !friend.name &&
              !friend.username &&
              !friend.firstName &&
              !friend.lastName)
        );

        if (fetchedFriends.length && needsPopulation) {
          const usersResponse = await apiClient.get('/users');
          const usersResult = usersResponse.data || {};
          const usersPayload = usersResult.data || {};
          const allUsers =
            Array.isArray(usersResult.users)
              ? usersResult.users
              : Array.isArray(usersPayload.users)
                ? usersPayload.users
                : Array.isArray(usersPayload)
                  ? usersPayload
                  : [];

          const resolvedFriends = allUsers.filter((candidate) =>
            friendIds.includes(String(getUserId(candidate)))
          );

          if (resolvedFriends.length) {
            fetchedFriends = resolvedFriends;
          }
        }

        // Keep valid populated friend objects only. Do not accidentally remove
        // the only friend because current-user identity is temporarily absent.
        const normalizedFriends = fetchedFriends
          .filter(Boolean)
          .filter((friend) => Boolean(getUserId(friend)))
          .filter((friend) =>
            !currentUserId ||
            String(getUserId(friend)) !== String(currentUserId)
          );

        setShareFriends(normalizedFriends);
      }

      if (targetMode === 'room') {
        const response = await apiClient.get('/chat/rooms');
        const result = response.data || {};

        const fetchedRooms = Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.rooms)
            ? result.rooms
            : [];

        setShareRooms(
          fetchedRooms.filter(
            (room) => room?.is_archived !== true
          )
        );
      }
    } catch (requestError) {
      setError(
        getApiMessage(
          requestError,
          targetMode === 'friends'
            ? 'Unable to load your friends.'
            : 'Unable to load chat rooms.'
        )
      );
    } finally {
      setShareTargetsLoading(false);
    }
  };

  const recordPostShare = async (postId) => {
    const response = await apiClient.post(
      `/feed/${postId}/share`
    );

    const payload =
      response.data?.data ||
      response.data ||
      {};

    const returnedPost = payload.post || null;

    const returnedSharesCount =
      typeof payload.sharesCount === 'number'
        ? payload.sharesCount
        : typeof returnedPost?.sharesCount === 'number'
          ? returnedPost.sharesCount
          : null;

    setPosts((previous) =>
      previous.map((item) => {
        if (
          String(getPostId(item)) !==
          String(postId)
        ) {
          return item;
        }

        return {
          ...item,
          ...(returnedPost &&
          typeof returnedPost === 'object'
            ? returnedPost
            : {}),
          sharesCount:
            returnedSharesCount !== null
              ? returnedSharesCount
              : Number(item.sharesCount || 0) + 1,
        };
      })
    );
  };

  const copyTextToClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (!copied) {
      throw new Error('This browser could not copy the post link.');
    }
  };

  const handleConfirmShare = async () => {
    const post = shareModalPost;
    const postId = getPostId(post);

    if (!postId || shareActionLoading) {
      return;
    }

    const shareUrl =
      `${window.location.origin}/feed?post=${encodeURIComponent(postId)}`;

    const authorName = getAuthorName(post.author);
    const baseText =
      shareMessage.trim() ||
      `Check out this post from ${authorName} on EAZY DON CHECK.`;

    setShareActionLoading(true);
    setSharingPostId(postId);
    setError('');

    try {
      if (shareMode === 'feed') {
        const response = await apiClient.post('/feed', {
          content: `${baseText}\n\n${shareUrl}`,
          sharedFrom: postId,
          visibility: 'public',
        });

        const payload =
          response.data?.data ||
          response.data ||
          {};

        const newPost =
          payload.post ||
          payload;

        if (
          newPost &&
          (newPost._id || newPost.id)
        ) {
          setPosts((previous) => [
            newPost,
            ...previous,
          ]);
        } else {
          await fetchFeed();
        }

        await recordPostShare(postId);

        setSuccess('Post shared to your Feed timeline.');
      } else if (shareMode === 'friends') {
        if (!isConnected || typeof sendDirectMessage !== 'function') {
          throw new Error(
            'Chat is currently offline. Please reconnect and try again.'
          );
        }

        if (!selectedShareFriendIds.length) {
          throw new Error('Select at least one friend.');
        }

        let sentCount = 0;

        for (const friendId of selectedShareFriendIds) {
          const sent = await sendDirectMessage(
            String(friendId),
            `${baseText}\n\n${shareUrl}`,
            []
          );

          if (sent !== false) {
            sentCount += 1;
          }
        }

        if (sentCount === 0) {
          throw new Error(
            'The post could not be sent to the selected friends.'
          );
        }

        await recordPostShare(postId);

        setSuccess(
          `Post shared with ${sentCount} ${
            sentCount === 1 ? 'friend' : 'friends'
          }.`
        );
      } else if (shareMode === 'room') {
        if (!isConnected || typeof sendRoomMessage !== 'function') {
          throw new Error(
            'Chat is currently offline. Please reconnect and try again.'
          );
        }

        if (!selectedShareRoomId) {
          throw new Error('Select a room.');
        }

        const sent = await sendRoomMessage(
          String(selectedShareRoomId),
          `${baseText}\n\n${shareUrl}`,
          []
        );

        if (sent === false) {
          throw new Error(
            'The post could not be shared to this room.'
          );
        }

        await recordPostShare(postId);

        const selectedRoom = shareRooms.find(
          (room) =>
            String(room?._id || room?.id || room?.roomId) ===
            String(selectedShareRoomId)
        );

        setSuccess(
          `Post shared to ${
            selectedRoom?.name || 'the selected room'
          }.`
        );
      } else if (shareMode === 'link') {
        await copyTextToClipboard(shareUrl);
        await recordPostShare(postId);
        setSuccess('Post link copied.');
      }

      setShareModalPost(null);
      setShareMessage('');
      setSelectedShareFriendIds([]);
      setSelectedShareRoomId(null);
    } catch (requestError) {
      setError(
        getApiMessage(
          requestError,
          'Unable to share this post.'
        )
      );
    } finally {
      setShareActionLoading(false);
      setSharingPostId(null);
    }
  };

  const handleDelete = async (post) => {
    const postId = getPostId(post);

    if (!postId) return;

    const confirmed = window.confirm(
      'Delete this post? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    setError('');

    try {
      await apiClient.delete(
        `/feed/${postId}`
      );

      setPosts((previous) =>
        previous.filter(
          (item) =>
            String(getPostId(item)) !==
            String(postId)
        )
      );

      setSuccess('Post deleted.');

      window.setTimeout(() => {
        setSuccess('');
      }, 2500);
    } catch (requestError) {
      setError(
        getApiMessage(
          requestError,
          'Unable to delete this post.'
        )
      );
    }
  };

  const openEdit = (post) => {
    setEditingPost(post);
    setEditContent(post.content || '');
    setOpenMenu(null);
  };

  const handleSaveEdit = async () => {
    const postId = getPostId(editingPost);

    if (!postId) return;

    if (!editContent.trim()) {
      setError(
        'A post cannot be empty.'
      );
      return;
    }

    setSavingEdit(true);
    setError('');

    try {
      const response = await apiClient.put(
        `/feed/${postId}`,
        {
          content: editContent.trim(),
        }
      );

      const payload =
        response.data?.data ||
        response.data ||
        {};

      const updatedPost =
        payload.post ||
        payload;

      setPosts((previous) =>
        previous.map((item) =>
          String(getPostId(item)) ===
          String(postId)
            ? {
                ...item,
                ...(updatedPost || {}),
                content:
                  updatedPost?.content ??
                  editContent.trim(),
              }
            : item
        )
      );

      setEditingPost(null);
      setEditContent('');

      setSuccess('Post updated.');

      window.setTimeout(() => {
        setSuccess('');
      }, 2500);
    } catch (requestError) {
      setError(
        getApiMessage(
          requestError,
          'Unable to update this post.'
        )
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const loadMore = async () => {
    if (
      loadingMore ||
      loading ||
      !hasMore
    ) {
      return;
    }

    await fetchFeed({
      requestedPage: page + 1,
      append: true,
    });
  };

  return (
    <AppLayout>
      <div className="min-h-full">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <main className="min-w-0">
              <div className="mb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-dark-card dark:text-slate-300">
                      <CheckCircle2
                        size={14}
                      />
                      Community Feed
                    </div>

                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                      Stay connected, {displayName}
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Share updates, ideas, media and
                      useful information with the EAZY
                      DON CHECK community.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <div className="flex-1">
                    <p className="font-medium">
                      Something went wrong
                    </p>

                    <p className="mt-1">
                      {error}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setError('')}
                    className="rounded-lg p-1 hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {success && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
                  <CheckCircle2 size={18} />
                  <span>{success}</span>
                </div>
              )}

              <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-dark-card sm:p-5">
                <form onSubmit={handlePublish}>
                  <div className="flex gap-3">
                    <Avatar
                      user={user}
                      size="lg"
                    />

                    <div className="min-w-0 flex-1">
                      <textarea
                        value={content}
                        onChange={(event) =>
                          setContent(
                            event.target.value
                          )
                        }
                        placeholder="What's happening?"
                        maxLength={5000}
                        rows={4}
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500 dark:focus:bg-slate-900"
                      />

                      <div className="mt-2 flex justify-end text-[11px] text-slate-400">
                        {content.length}/5000
                      </div>
                    </div>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {selectedFiles.map(
                        (media, index) => (
                          <MediaPreview
                            key={`${media.originalName}-${index}`}
                            media={media}
                            removable
                            onRemove={() =>
                              removeSelectedFile(
                                index
                              )
                            }
                          />
                        )
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,audio/*"
                        multiple
                        hidden
                        onChange={
                          handleFileSelect
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                        disabled={
                          publishing ||
                          selectedFiles.length >=
                            MAX_MEDIA_FILES
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <ImageIcon
                          size={17}
                        />
                        Add media
                      </button>

                      <span className="text-xs text-slate-400">
                        Up to {MAX_MEDIA_FILES}{' '}
                        files · 50MB each
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        publishing ||
                        uploadingMedia ||
                        (
                          !content.trim() &&
                          selectedFiles.length ===
                            0
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      {publishing ||
                      uploadingMedia ? (
                        <>
                          <Loader2
                            size={17}
                            className="animate-spin"
                          />

                          {uploadingMedia
                            ? 'Uploading...'
                            : 'Publishing...'}
                        </>
                      ) : (
                        <>
                          <Send size={17} />
                          Publish
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </section>

              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Latest updates
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Recent community posts
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    fetchFeed({
                      requestedPage: 1,
                      append: false,
                    })
                  }
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-dark-card"
                    >
                      <div className="flex gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800" />

                        <div className="flex-1">
                          <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                          <div className="mt-2 h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                          <div className="mt-5 h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
                          <div className="mt-2 h-4 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-dark-card">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <PenLine
                      size={24}
                      className="text-slate-500"
                    />
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                    No posts yet
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Be the first person to share
                    something with the community.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard
                      key={getPostId(post)}
                      post={post}
                      currentUser={user}
                      onLike={handleLike}
                      onComment={
                        handleCommentCount
                      }
                      onShare={handleShare}
                      onDelete={handleDelete}
                      onEdit={openEdit}
                    />
                  ))}

                  {hasMore && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-dark-card dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        {loadingMore && (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        )}

                        {loadingMore
                          ? 'Loading...'
                          : 'Load more'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </main>

            <aside className="hidden xl:block">
              <div className="sticky top-6 space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-dark-card">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                      <Users
                        size={20}
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Community
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Your shared workspace
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Feed
                      </span>

                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        Active
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Media
                      </span>

                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        Enabled
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Discussions
                      </span>

                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        Available
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-dark-card">
                  <div className="flex items-center gap-2">
                    <Upload
                      size={17}
                      className="text-slate-500"
                    />

                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Media support
                    </h3>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <FileImage
                        size={16}
                        className="text-slate-500"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        Images
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Video
                        size={16}
                        className="text-slate-500"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        Videos
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <AudioLines
                        size={16}
                        className="text-slate-500"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        Audio
                      </span>
                    </div>
                  </div>
                </section>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {shareModalPost ? (
        <ShareModal
          post={shareModalPost}
          mode={shareMode}
          setMode={setShareMode}
          friends={shareFriends}
          rooms={shareRooms}
          loadingTargets={shareTargetsLoading}
          selectedFriendIds={selectedShareFriendIds}
          setSelectedFriendIds={setSelectedShareFriendIds}
          selectedRoomId={selectedShareRoomId}
          setSelectedRoomId={setSelectedShareRoomId}
          shareMessage={shareMessage}
          setShareMessage={setShareMessage}
          actionLoading={shareActionLoading}
          onLoadTargets={loadShareTargets}
          onConfirm={handleConfirmShare}
          onClose={() => {
            if (shareActionLoading) {
              return;
            }

            setShareModalPost(null);
            setSelectedShareFriendIds([]);
            setSelectedShareRoomId(null);
            setShareMessage('');
          }}
        />
      ) : null}

      {editingPost ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-dark-card">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Edit post
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Update your post content.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingPost(null);
                  setEditContent('');
                }}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <textarea
                value={editContent}
                onChange={(event) =>
                  setEditContent(
                    event.target.value
                  )
                }
                maxLength={5000}
                rows={7}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500"
              />

              <div className="mt-2 text-right text-[11px] text-slate-400">
                {editContent.length}/5000
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setEditingPost(null);
                  setEditContent('');
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={
                  savingEdit ||
                  !editContent.trim()
                }
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900"
              >
                {savingEdit && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}

                Save changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}

export default Feed;