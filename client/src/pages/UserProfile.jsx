import React, {
  useEffect,
  useState,
} from 'react';

import {
  ArrowLeft,
  Check,
  Clock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  UserPlus,
  UserRound,
  UserMinus,
  Users,
  Star,
  Shield,
  AlertCircle,
  X,
} from 'lucide-react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import API from '../services/api';


// ============================================================
// DEFAULT AVATAR
// ============================================================

const DEFAULT_AVATAR =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="400"
      height="400"
      viewBox="0 0 400 400"
    >
      <rect width="400" height="400" fill="#e2e8f0"/>
      <circle cx="200" cy="145" r="75" fill="#94a3b8"/>
      <path
        d="M70 365c18-82 73-125 130-125s112 43 130 125"
        fill="#94a3b8"
      />
    </svg>
  `);


// ============================================================
// AVATAR HELPER
// ============================================================

const getAvatar = (value) => {
  if (!value) {
    return DEFAULT_AVATAR;
  }

  const avatarUrl =
    typeof value === 'string'
      ? value
      : value?.avatarUrl ||
        value?.avatar ||
        value?.profilePicture ||
        value?.profilePhoto ||
        value?.photoUrl;

  if (
    !avatarUrl ||
    typeof avatarUrl !== 'string'
  ) {
    return DEFAULT_AVATAR;
  }

  const normalized =
    avatarUrl.trim();

  if (!normalized) {
    return DEFAULT_AVATAR;
  }

  if (
    normalized.includes(
      'via.placeholder.com'
    )
  ) {
    return DEFAULT_AVATAR;
  }

  return normalized;
};


// ============================================================
// CACHE-BUST AVATAR
// ============================================================

const getAvatarWithVersion = (value) => {
  const avatarUrl =
    getAvatar(value);

  if (
    !avatarUrl ||
    avatarUrl === DEFAULT_AVATAR
  ) {
    return avatarUrl;
  }

  const version =
    value?.avatarUpdatedAt ||
    value?.profileUpdatedAt ||
    value?.updatedAt ||
    null;

  if (!version) {
    return avatarUrl;
  }

  const separator =
    avatarUrl.includes('?')
      ? '&'
      : '?';

  return `${avatarUrl}${separator}v=${encodeURIComponent(
    version
  )}`;
};


// ============================================================
// USER ID HELPER
// ============================================================

const getUserId = (value) => {
  if (!value) {
    return null;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    return String(value);
  }

  if (
    value?.$oid
  ) {
    return String(value.$oid);
  }

  if (
    value?._id?.$oid
  ) {
    return String(value._id.$oid);
  }

  const id =
    value?._id ||
    value?.id ||
    value?.userId ||
    value?.user_id ||
    value?.uid;

  if (
    id &&
    typeof id === 'object'
  ) {
    if (id?.$oid) {
      return String(id.$oid);
    }

    if (
      typeof id.toHexString === 'function'
    ) {
      return String(
        id.toHexString()
      );
    }
  }

  if (id) {
    return String(id);
  }

  if (
    typeof value?.toHexString === 'function'
  ) {
    return String(
      value.toHexString()
    );
  }

  return null;
};


// ============================================================
// ERROR MESSAGE HELPER
// ============================================================

const getErrorMessage = (
  requestError,
  fallback
) => {
  return (
    requestError?.response?.data?.message ||
    requestError?.response?.data?.error ||
    requestError?.message ||
    fallback
  );
};


// ============================================================
// COMPONENT
// ============================================================

export default function UserProfile() {
  const navigate =
    useNavigate();

  const {
    user,
  } = useAuth();

  const {
    onlineUsers,
    isConnected,
  } = useSocket();

  const {
    userId,
  } = useParams();


  // ==========================================================
  // STATE
  // ==========================================================

  const [profile, setProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [actionLoading, setActionLoading] =
    useState(false);

  const [requestStatus, setRequestStatus] =
    useState('none');

  const [actionMessage, setActionMessage] =
    useState('');

  // Profile picture preview state
  const [imagePreview, setImagePreview] =
    useState({
      open: false,
      src: '',
      name: '',
    });


  // ==========================================================
  // CURRENT USER ID
  // ==========================================================

  const currentUserId =
    getUserId(user);

  const profileId =
    getUserId(profile);

  const isSelf =
    Boolean(
      currentUserId &&
      profileId &&
      currentUserId === profileId
    );


  // ==========================================================
  // REAL-TIME ONLINE STATUS
  // ==========================================================

  const isProfileOnline =
    profileId
      ? Boolean(
          onlineUsers?.[profileId] ??
          onlineUsers?.[
            String(profileId)
          ] ??
          profile?.isOnline
        )
      : Boolean(
          profile?.isOnline
        );


  // ==========================================================
  // PROFILE IMAGE PREVIEW
  // ==========================================================

  const openImagePreview = (
    image,
    name
  ) => {
    const imageSrc =
      getAvatar(image);

    if (!imageSrc) {
      return;
    }

    setImagePreview({
      open: true,
      src: imageSrc,
      name:
        name ||
        'Profile picture',
    });
  };


  const closeImagePreview = () => {
    setImagePreview({
      open: false,
      src: '',
      name: '',
    });
  };


  // ==========================================================
  // IMAGE PREVIEW KEYBOARD / SCROLL CONTROL
  // ==========================================================

  useEffect(() => {
    if (!imagePreview.open) {
      return undefined;
    }

    const handleKeyDown = (
      event
    ) => {
      if (event.key === 'Escape') {
        setImagePreview({
          open: false,
          src: '',
          name: '',
        });
      }
    };

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [imagePreview.open]);


  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const normalizedUserId =
      String(
        userId || ''
      ).trim();

    if (!normalizedUserId) {
      setError(
        'Invalid user profile.'
      );
      setLoading(false);
      return undefined;
    }

    const loadProfile =
      async () => {
        try {
          setLoading(true);
          setError('');

          const response =
            await API.get(
              `/users/${encodeURIComponent(
                normalizedUserId
              )}`
            );

          if (cancelled) {
            return;
          }

          const result =
            response?.data;

          const userData =
            result?.user ||
            result?.data?.user ||
            result?.profile ||
            result?.data ||
            null;

          const relationship =
            result?.relationship ||
            result?.data?.relationship ||
            {};

          if (!userData) {
            throw new Error(
              'User profile was not found.'
            );
          }

          const normalizedRelationship = {
            ...relationship,

            isFriend:
              Boolean(
                relationship?.isFriend ??
                result?.isFriend ??
                userData?.isFriend
              ),

            requestSent:
              Boolean(
                relationship?.requestSent ??
                result?.requestSent ??
                userData?.requestSent
              ),

            requestReceived:
              Boolean(
                relationship?.requestReceived ??
                result?.requestReceived ??
                userData?.requestReceived
              ),

            friendRequestId:
              relationship?.friendRequestId ||
              relationship?.requestId ||
              result?.friendRequestId ||
              result?.requestId ||
              userData?.friendRequestId ||
              userData?.requestId ||
              null,
          };

          const normalizedProfile = {
            ...userData,

            relationship:
              normalizedRelationship,

            isFriend:
              normalizedRelationship.isFriend,

            requestSent:
              normalizedRelationship.requestSent,

            requestReceived:
              normalizedRelationship.requestReceived,

            friendRequestId:
              normalizedRelationship.friendRequestId,
          };

          console.log(
            'UserProfile API response:',
            result
          );

          console.log(
            'Normalized profile:',
            normalizedProfile
          );

          setProfile(
            normalizedProfile
          );

          if (
            normalizedRelationship.isFriend
          ) {
            setRequestStatus(
              'friends'
            );
          } else if (
            normalizedRelationship.requestReceived
          ) {
            setRequestStatus(
              'received'
            );
          } else if (
            normalizedRelationship.requestSent
          ) {
            setRequestStatus(
              'sent'
            );
          } else {
            setRequestStatus(
              'none'
            );
          }
        } catch (requestError) {
          console.error(
            'Unable to load user profile:',
            requestError
          );

          if (!cancelled) {
            setError(
              getErrorMessage(
                requestError,
                'Unable to load this user profile.'
              )
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);


  // ==========================================================
  // CLEAR ACTION MESSAGE
  // ==========================================================

  useEffect(() => {
    if (!actionMessage) {
      return undefined;
    }

    const timer =
      setTimeout(() => {
        setActionMessage('');
      }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [actionMessage]);


  // ==========================================================
  // SEND FRIEND REQUEST
  // ==========================================================

  const handleSendFriendRequest =
    async () => {
      if (
        actionLoading ||
        !profileId ||
        isSelf
      ) {
        return;
      }

      setActionLoading(true);
      setActionMessage('');

      try {
        await API.post(
          `/friends/request/${encodeURIComponent(
            profileId
          )}`
        );

        setRequestStatus(
          'sent'
        );

        setProfile(
          (previous) =>
            previous
              ? {
                  ...previous,

                  isFriend: false,
                  requestSent: true,
                  requestReceived: false,

                  relationship: {
                    ...(previous.relationship || {}),
                    isFriend: false,
                    requestSent: true,
                    requestReceived: false,
                  },
                }
              : previous
        );

        setActionMessage(
          'Friend request sent successfully.'
        );
      } catch (requestError) {
        console.error(
          'Send friend request error:',
          requestError
        );

        setActionMessage(
          getErrorMessage(
            requestError,
            'Unable to send friend request.'
          )
        );
      } finally {
        setActionLoading(false);
      }
    };


  // ==========================================================
  // REMOVE FRIEND
  // ==========================================================

  const handleRemoveFriend =
    async () => {
      if (
        actionLoading ||
        !profileId ||
        isSelf
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Remove ${
            profile?.name ||
            profile?.username ||
            'this user'
          } from your friends?`
        );

      if (!confirmed) {
        return;
      }

      setActionLoading(true);
      setActionMessage('');

      try {
        await API.delete(
          `/friends/${encodeURIComponent(
            profileId
          )}`
        );

        setRequestStatus(
          'none'
        );

        setProfile(
          (previous) =>
            previous
              ? {
                  ...previous,

                  isFriend: false,
                  requestSent: false,
                  requestReceived: false,

                  relationship: {
                    ...(previous.relationship || {}),
                    isFriend: false,
                    requestSent: false,
                    requestReceived: false,
                  },
                }
              : previous
        );

        setActionMessage(
          'Friend removed successfully.'
        );
      } catch (requestError) {
        console.error(
          'Remove friend error:',
          requestError
        );

        setActionMessage(
          getErrorMessage(
            requestError,
            'Unable to remove friend.'
          )
        );
      } finally {
        setActionLoading(false);
      }
    };


  // ==========================================================
  // ACCEPT FRIEND REQUEST
  // ==========================================================

  const handleAcceptFriendRequest =
    async () => {
      if (
        actionLoading ||
        !profileId ||
        isSelf
      ) {
        return;
      }

      const relationship =
        profile?.relationship || {};

      const requestId =
        relationship?.friendRequestId ||
        relationship?.requestId ||
        relationship?.incomingRequestId ||
        profile?.friendRequestId ||
        profile?.requestId ||
        profile?.incomingRequestId ||
        null;

      if (!requestId) {
        setActionMessage(
          'Unable to identify the friend request.'
        );
        return;
      }

      setActionLoading(true);
      setActionMessage('');

      try {
        await API.put(
          `/friends/request/${encodeURIComponent(
            requestId
          )}/accept`
        );

        setRequestStatus(
          'friends'
        );

        setProfile(
          (previous) =>
            previous
              ? {
                  ...previous,

                  isFriend: true,
                  requestSent: false,
                  requestReceived: false,

                  relationship: {
                    ...(previous.relationship || {}),
                    isFriend: true,
                    requestSent: false,
                    requestReceived: false,
                    friendRequestId:
                      requestId,
                  },
                }
              : previous
        );

        setActionMessage(
          'Friend request accepted.'
        );
      } catch (requestError) {
        console.error(
          'Accept friend request error:',
          requestError
        );

        setActionMessage(
          getErrorMessage(
            requestError,
            'Unable to accept friend request.'
          )
        );
      } finally {
        setActionLoading(false);
      }
    };


  // ==========================================================
  // GAMIFICATION
  // ==========================================================

  const xpPoints =
    Number(
      profile?.gamification?.xpPoints || 0
    );

  const starRank =
    profile?.gamification?.starRank ||
    'Newcomer';


  // ==========================================================
  // ROLE LABEL
  // ==========================================================

  const normalizedRole =
    String(
      profile?.role || ''
    )
      .trim()
      .toLowerCase()
      .replace(/-/g, '_');

  const roleLabel =
    normalizedRole === 'superadmin' ||
    normalizedRole === 'super_admin'
      ? 'Super Admin'
      : profile?.role
        ? String(profile.role)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) =>
              char.toUpperCase()
            )
        : 'Member';


  // ==========================================================
  // DISPLAY VALUES
  // ==========================================================

  const displayName =
    profile?.name ||
    profile?.username ||
    profile?.email ||
    'User';

  const displayUsername =
    profile?.username
      ? `@${profile.username}`
      : profile?.email || '';

  const displayAvatar =
    getAvatarWithVersion(
      profile
    );


  // ==========================================================
  // ABOUT VALUES
  // ==========================================================

  const bio =
    profile?.bio ||
    'No bio available.';

  const location =
    profile?.location ||
    '';

  const phone =
    profile?.phone ||
    '';

  const email =
    profile?.email ||
    '';


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-full bg-slate-50 transition-colors duration-200 dark:bg-dark-bg">
          <div className="mx-auto flex min-h-[70vh] w-full max-w-[1600px] items-center justify-center px-4 sm:px-6 lg:px-8 xl:px-10">

            <div className="flex flex-col items-center gap-3">

              <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />

              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Loading profile...
              </p>

            </div>

          </div>
        </div>
      </AppLayout>
    );
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error || !profile) {
    return (
      <AppLayout>

        <div className="min-h-full bg-slate-50 px-4 py-10 transition-colors duration-200 dark:bg-dark-bg sm:px-6 lg:px-8">

          <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/50 dark:bg-dark-card">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>

              <div className="min-w-0">

                <h2 className="font-bold text-slate-900 dark:text-white">
                  Unable to load profile
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {error ||
                    'The requested profile could not be found.'}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                navigate(-1)
              }
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </button>

          </div>

        </div>

      </AppLayout>
    );
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <AppLayout>

      <div className="min-h-full bg-slate-50 transition-colors duration-200 dark:bg-dark-bg">

        <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 xl:px-10 2xl:px-12">

          {/* BACK BUTTON */}

          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-dark-card dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>


          {/* PROFILE HEADER */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-card">

            {/* COVER */}

            <div className="relative h-32 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 sm:h-40">

              {profile?.coverPhoto && (
                <img
                  src={profile.coverPhoto}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display =
                      'none';
                  }}
                />
              )}

              <div className="absolute inset-0 bg-black/5" />

            </div>


            {/* PROFILE IDENTITY */}

            <div className="relative px-4 pb-6 sm:px-7">

              <div className="grid grid-cols-1 gap-5 pt-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end sm:gap-6">

                {/* AVATAR */}

                <div className="-mt-12 flex justify-center sm:-mt-16 sm:justify-start">

                  <div className="relative shrink-0">

                    {/* CLICKING THE PROFILE PICTURE OPENS PREVIEW */}

                    <button
                      type="button"
                      onClick={() =>
                        openImagePreview(
                          displayAvatar,
                          displayName
                        )
                      }
                      className="block h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-xl outline-none transition focus:ring-4 focus:ring-emerald-500/30 dark:border-dark-card dark:bg-slate-800 sm:h-32 sm:w-32"
                      title="View profile picture"
                      aria-label={`View ${displayName}'s profile picture`}
                    >

                      <img
                        src={displayAvatar}
                        alt={displayName}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          if (
                            event.currentTarget.src !==
                            DEFAULT_AVATAR
                          ) {
                            event.currentTarget.src =
                              DEFAULT_AVATAR;
                          }
                        }}
                      />

                    </button>

                    {/* NO AVATAR ONLINE INDICATOR */}

                  </div>

                </div>


                {/* NAME + USERNAME + DETAILS */}

                <div className="min-w-0 text-center sm:pb-1 sm:text-left">

                  <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">

                    <h1 className="max-w-full truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                      {displayName}
                    </h1>

                    {/* SINGLE PROFILE ONLINE INDICATOR */}

                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        isProfileOnline
                          ? 'bg-emerald-500'
                          : 'bg-slate-400'
                      }`}
                      title={
                        isProfileOnline
                          ? 'Online'
                          : 'Offline'
                      }
                    />

                  </div>


                  <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                    {displayUsername}
                  </p>


                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">

                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      {roleLabel}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">

                      <Star className="h-3.5 w-3.5" />

                      {starRank}

                    </span>

                    {isConnected && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">

                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                        Live

                      </span>
                    )}

                  </div>

                </div>


                {/* XP CARD */}

                <div className="flex justify-center sm:justify-end">

                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">

                      <Star className="h-4 w-4" />

                    </div>

                    <div className="min-w-[75px]">

                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        XP Points
                      </p>

                      <p className="text-base font-bold text-slate-900 dark:text-white">
                        {xpPoints.toLocaleString()}
                      </p>

                    </div>

                  </div>

                </div>

              </div>


              {/* ACTIONS */}

              {!isSelf && (
                <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div className="min-w-0">

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Connection
                      </p>

                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Connect with {displayName} and build your network.
                      </p>

                    </div>


                    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">

                      {requestStatus === 'friends' && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/messages?user=${profileId}`
                              )
                            }
                            disabled={
                              actionLoading
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Message
                          </button>

                          <button
                            type="button"
                            onClick={
                              handleRemoveFriend
                            }
                            disabled={
                              actionLoading
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <UserMinus className="h-4 w-4" />

                            {actionLoading
                              ? 'Removing...'
                              : 'Remove friend'}
                          </button>
                        </>
                      )}


                      {requestStatus === 'none' && (
                        <button
                          type="button"
                          onClick={
                            handleSendFriendRequest
                          }
                          disabled={
                            actionLoading
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <UserPlus className="h-4 w-4" />

                          {actionLoading
                            ? 'Sending...'
                            : 'Add friend'}
                        </button>
                      )}


                      {requestStatus === 'sent' && (
                        <button
                          type="button"
                          disabled
                          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        >
                          <Clock className="h-4 w-4" />
                          Request sent
                        </button>
                      )}


                      {requestStatus === 'received' && (
                        <button
                          type="button"
                          onClick={
                            handleAcceptFriendRequest
                          }
                          disabled={
                            actionLoading
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Check className="h-4 w-4" />

                          {actionLoading
                            ? 'Accepting...'
                            : 'Accept request'}
                        </button>
                      )}


                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        title="More options"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>

                    </div>

                  </div>


                  {actionMessage && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">

                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        {actionMessage}
                      </p>

                    </div>
                  )}

                </div>
              )}


              {/* SELF PROFILE MESSAGE */}

              {isSelf && (
                <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">

                    <div className="flex items-center gap-3">

                      <UserRound className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />

                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        This is your profile.
                      </p>

                    </div>

                  </div>

                </div>
              )}

            </div>

          </section>


          {/* PROFILE CONTENT */}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">

            {/* MAIN CONTENT */}

            <div className="min-w-0 space-y-6">

              {/* ABOUT */}

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-card">

                <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-7">

                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    About
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Personal information about this member.
                  </p>

                </div>


                <div className="p-5 sm:p-7">

                  <div className="space-y-5">

                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Bio
                      </p>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
                        {bio}
                      </p>

                    </div>


                    {location && (
                      <div className="flex items-start gap-3">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <MapPin className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">

                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Location
                          </p>

                          <p className="mt-1 break-words text-sm text-slate-700 dark:text-slate-200">
                            {location}
                          </p>

                        </div>

                      </div>
                    )}


                    {phone && (
                      <div className="flex items-start gap-3">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <Users className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">

                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Phone
                          </p>

                          <p className="mt-1 break-words text-sm text-slate-700 dark:text-slate-200">
                            {phone}
                          </p>

                        </div>

                      </div>
                    )}


                    {email && (
                      <div className="flex items-start gap-3">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <MessageCircle className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">

                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Email
                          </p>

                          <p className="mt-1 break-words text-sm text-slate-700 dark:text-slate-200">
                            {email}
                          </p>

                        </div>

                      </div>
                    )}

                  </div>

                </div>

              </section>


              {/* STATUS */}

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-card">

                <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-7">

                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Current status
                  </h2>

                </div>

                <div className="p-5 sm:p-7">

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/50">

                    <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                      {profile?.statusUpdate ||
                        'No status update yet.'}
                    </p>

                  </div>

                </div>

              </section>

            </div>


            {/* RIGHT SIDEBAR */}

            <aside className="min-w-0 space-y-6">

              {/* GAMIFICATION */}

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-card">

                <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">

                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Gamification
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Member progress and ranking.
                  </p>

                </div>


                <div className="space-y-4 p-5">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      <Star className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">

                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        XP Points
                      </p>

                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {xpPoints.toLocaleString()}
                      </p>

                    </div>

                  </div>


                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">

                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                      Star Rank
                    </p>

                    <p className="mt-1 text-base font-bold text-amber-800 dark:text-amber-300">
                      {starRank}
                    </p>

                  </div>

                </div>

              </section>


              {/* ACCOUNT */}

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-card">

                <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">

                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Account
                  </h2>

                </div>


                <div className="space-y-4 p-5">

                  <div className="flex items-start gap-3">

                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

                    <div className="min-w-0">

                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Role
                      </p>

                      <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {roleLabel}
                      </p>

                    </div>

                  </div>


                  <div className="flex items-start gap-3">

                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

                    <div className="min-w-0">

                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Connection
                      </p>

                      <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {requestStatus === 'friends'
                          ? 'Friends'
                          : requestStatus === 'sent'
                            ? 'Request sent'
                            : requestStatus === 'received'
                              ? 'Friend request received'
                              : 'Not connected'}
                      </p>

                    </div>

                  </div>


                  {/* ONLINE STATUS */}

                  <div className="flex items-start gap-3">

                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        isProfileOnline
                          ? 'bg-emerald-500'
                          : 'bg-slate-400'
                      }`}
                    />

                    <div className="min-w-0">

                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Status
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {isProfileOnline
                          ? 'Online'
                          : 'Offline'}
                      </p>

                    </div>

                  </div>

                </div>

              </section>

            </aside>

          </div>

        </div>

      </div>


      {/* ======================================================
          PROFILE PICTURE PREVIEW MODAL
          ====================================================== */}

      {imagePreview.open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${imagePreview.name} profile picture preview`}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeImagePreview();
            }
          }}
        >

          {/* CLOSE BUTTON */}

          <button
            type="button"
            onClick={
              closeImagePreview
            }
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
            aria-label="Close profile picture preview"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>


          {/* IMAGE */}

          <div
            className="relative flex max-h-[94vh] max-w-[94vw] flex-col items-center"
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
          >

            <img
              src={imagePreview.src}
              alt={imagePreview.name}
              className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
              onError={(event) => {
                if (
                  event.currentTarget.src !==
                  DEFAULT_AVATAR
                ) {
                  event.currentTarget.src =
                    DEFAULT_AVATAR;
                }
              }}
            />

          </div>

        </div>
      )}

    </AppLayout>
  );
}