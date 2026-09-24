import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Camera,
  Check,
  Edit3,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  Star,
  User as UserIcon,
  Users,
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
  Search,
  MessageCircle,
  X,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

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
        value?.profilePhoto;

  if (
    !avatarUrl ||
    typeof avatarUrl !== 'string'
  ) {
    return DEFAULT_AVATAR;
  }

  const normalized = avatarUrl.trim();

  if (!normalized) {
    return DEFAULT_AVATAR;
  }

  if (
    normalized.includes('via.placeholder.com')
  ) {
    return DEFAULT_AVATAR;
  }

  return normalized;
};


// ============================================================
// USER ID HELPER
// ============================================================

const getUserId = (value) => {
  if (!value) {
    return null;
  }

  const id =
    value?._id ||
    value?.id ||
    value?.userId ||
    value;

  return id ? String(id) : null;
};


// ============================================================
// COMPONENT
// ============================================================

export default function Profile() {
  const navigate = useNavigate();

  const {
    user,
    updateProfile,
  } = useAuth();

  const {
    onlineUsers,
    isConnected,
  } = useSocket();

  // ==========================================================
  // STATE
  // ==========================================================

  const [activeTab, setActiveTab] =
    useState('profile');

  const [success, setSuccess] =
    useState('');

  const [error, setError] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [friends, setFriends] =
    useState([]);

  const [loadingFriends, setLoadingFriends] =
    useState(false);

  const [statusMessage, setStatusMessage] =
    useState('');

  const [tempStatus, setTempStatus] =
    useState('');

  const [isEditingStatus, setIsEditingStatus] =
    useState(false);

  const [avatarPreview, setAvatarPreview] =
    useState('');

  const [avatarFile, setAvatarFile] =
    useState(null);

  const [formData, setFormData] =
    useState({
      name: '',
      email: '',
      username: '',
      role: '',
      bio: '',
      phone: '',
      location: '',
    });

  const [passwordData, setPasswordData] =
    useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

  const [showPasswords, setShowPasswords] =
    useState({
      current: false,
      new: false,
      confirm: false,
    });

  // ==========================================================
  // PROFILE PHOTO PREVIEW MODAL
  // ==========================================================

  const [previewImage, setPreviewImage] =
    useState('');

  const [previewName, setPreviewName] =
    useState('');

  const fileInputRef =
    useRef(null);


  // ==========================================================
  // CURRENT USER ID
  // ==========================================================

  const currentUserId =
    getUserId(user);


  // ==========================================================
  // REAL-TIME ONLINE STATUS
  // ==========================================================

  const isCurrentUserOnline =
    currentUserId
      ? Boolean(
          onlineUsers?.[currentUserId] ??
          onlineUsers?.[String(currentUserId)] ??
          user?.isOnline
        )
      : Boolean(user?.isOnline);


  // ==========================================================
  // SYNC USER DATA
  // ==========================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData({
      name: user.name || '',
      email: user.email || '',
      username: user.username || '',
      role: user.role || '',
      bio: user.bio || '',
      phone: user.phone || '',
      location: user.location || '',
    });

    const currentStatus =
      user.statusUpdate || '';

    setStatusMessage(currentStatus);
    setTempStatus(currentStatus);

    setAvatarPreview(
      getAvatar(user)
    );
  }, [user]);


  // ==========================================================
  // CLEANUP OBJECT URL
  // ==========================================================

  useEffect(() => {
    return () => {
      if (
        avatarPreview &&
        avatarPreview.startsWith('blob:')
      ) {
        URL.revokeObjectURL(
          avatarPreview
        );
      }
    };
  }, [avatarPreview]);


  // ==========================================================
  // CLOSE PHOTO PREVIEW WITH ESCAPE
  // ==========================================================

  useEffect(() => {
    if (!previewImage) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setPreviewImage('');
        setPreviewName('');
      }
    };

    document.addEventListener(
      'keydown',
      handleKeyDown
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [previewImage]);


  // ==========================================================
  // OPEN PHOTO PREVIEW
  // ==========================================================

  const openPhotoPreview = (
    image,
    name = 'Profile picture'
  ) => {
    const imageUrl =
      getAvatar(image);

    if (!imageUrl) {
      return;
    }

    setPreviewImage(imageUrl);
    setPreviewName(
      name ||
      'Profile picture'
    );
  };


  // ==========================================================
  // CLOSE PHOTO PREVIEW
  // ==========================================================

  const closePhotoPreview = () => {
    setPreviewImage('');
    setPreviewName('');
  };


  // ==========================================================
  // LOAD FRIENDS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const loadFriends = async () => {
      try {
        setLoadingFriends(true);

        const response =
          await API.get('/friends');

        const result =
          response?.data;

        const list =
          Array.isArray(result)
            ? result
            : Array.isArray(result?.data)
              ? result.data
              : Array.isArray(result?.friends)
                ? result.friends
                : Array.isArray(result?.users)
                  ? result.users
                  : [];

        if (!cancelled) {
          setFriends(list);
        }
      } catch (requestError) {
        console.warn(
          'Unable to load friends:',
          requestError
        );

        if (!cancelled) {
          setFriends([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingFriends(false);
        }
      }
    };

    if (user) {
      loadFriends();
    }

    return () => {
      cancelled = true;
    };
  }, [user]);


  // ==========================================================
  // CLEAR ALERTS
  // ==========================================================

  useEffect(() => {
    if (!success && !error) {
      return undefined;
    }

    const timer =
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [success, error]);


  // ==========================================================
  // INPUT HANDLERS
  // ==========================================================

  const handleInputChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };


  const handlePasswordChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setPasswordData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };


  // ==========================================================
  // AVATAR SELECTION
  // ==========================================================

  const handleAvatarChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setSuccess('');
    setError('');

    if (
      !file.type.startsWith('image/')
    ) {
      setError(
        'Please select a valid image file.'
      );

      event.target.value = '';
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        'Profile photo must not exceed 5 MB.'
      );

      event.target.value = '';
      return;
    }

    if (
      avatarPreview?.startsWith('blob:')
    ) {
      URL.revokeObjectURL(
        avatarPreview
      );
    }

    const preview =
      URL.createObjectURL(file);

    setAvatarFile(file);
    setAvatarPreview(preview);
  };


  // ==========================================================
  // SAVE PROFILE
  // ==========================================================

  const handleSaveProfile = async (
    event
  ) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setSuccess('');
    setError('');

    try {
      const payload = {
        name:
          formData.name.trim(),

        email:
          formData.email.trim(),

        username:
          formData.username.trim(),

        bio:
          formData.bio.trim(),

        phone:
          formData.phone.trim(),

        location:
          formData.location.trim(),
      };

      if (avatarFile) {
        payload.avatar =
          avatarFile;
      }

      await updateProfile(
        payload
      );

      setAvatarFile(null);

      setSuccess(
        'Profile updated successfully.'
      );
    } catch (requestError) {
      console.error(
        'Profile update error:',
        requestError
      );

      setError(
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        requestError?.message ||
        'Unable to update your profile.'
      );
    } finally {
      setSubmitting(false);
    }
  };


  // ==========================================================
  // SAVE STATUS
  // ==========================================================

  const handleSaveStatus = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setSuccess('');
    setError('');

    try {
      const newStatus =
        tempStatus.trim();

      await updateProfile({
        statusUpdate:
          newStatus,
      });

      setStatusMessage(
        newStatus
      );

      setTempStatus(
        newStatus
      );

      setIsEditingStatus(
        false
      );

      setSuccess(
        'Status updated successfully.'
      );
    } catch (requestError) {
      console.error(
        'Status update error:',
        requestError
      );

      setError(
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        'Unable to update your status.'
      );
    } finally {
      setSubmitting(false);
    }
  };


  // ==========================================================
  // UPDATE PASSWORD
  // ==========================================================

  const handleUpdatePassword = async (
    event
  ) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setError(
        'Please complete all password fields.'
      );
      return;
    }

    if (
      passwordData.newPassword.length < 6
    ) {
      setError(
        'New password must contain at least 6 characters.'
      );
      return;
    }

    if (
      passwordData.newPassword !==
      passwordData.confirmPassword
    ) {
      setError(
        'New password and confirmation password do not match.'
      );
      return;
    }

    setSubmitting(true);
    setSuccess('');
    setError('');

    try {
      await API.put(
        '/auth/update-password',
        {
          currentPassword:
            passwordData.currentPassword,

          newPassword:
            passwordData.newPassword,
        }
      );

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setSuccess(
        'Password updated successfully.'
      );
    } catch (requestError) {
      console.error(
        'Password update error:',
        requestError
      );

      setError(
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        'Unable to update your password.'
      );
    } finally {
      setSubmitting(false);
    }
  };


  // ==========================================================
  // PASSWORD VISIBILITY
  // ==========================================================

  const togglePasswordVisibility = (
    field
  ) => {
    setShowPasswords(
      (previous) => ({
        ...previous,
        [field]:
          !previous[field],
      })
    );
  };


  // ==========================================================
  // GAMIFICATION
  // ==========================================================

  const xpPoints =
    Number(
      user?.gamification?.xpPoints || 0
    );

  const starRank =
    user?.gamification?.starRank ||
    'Newcomer';


  // ==========================================================
  // FRIEND ONLINE STATUS
  // ==========================================================

  const getFriendOnlineStatus = (
    friend
  ) => {
    const id =
      getUserId(friend);

    if (!id) {
      return false;
    }

    return Boolean(
      onlineUsers?.[id] ??
      onlineUsers?.[String(id)] ??
      friend?.isOnline
    );
  };


  // ==========================================================
  // ROLE LABEL
  // ==========================================================

  const normalizedRole =
    String(
      user?.role || ''
    )
      .trim()
      .toLowerCase()
      .replace(/-/g, '_');

  const roleLabel =
    normalizedRole === 'superadmin' ||
    normalizedRole === 'super_admin'
      ? 'Super Admin'
      : user?.role
        ? String(user.role)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) =>
              char.toUpperCase()
            )
        : 'Member';


  // ==========================================================
  // DISPLAY VALUES
  // ==========================================================

  const displayName =
    user?.name ||
    formData.name ||
    'User';

  const displayUsername =
    user?.username
      ? `@${user.username}`
      : user?.email || '';

  const displayAvatar =
    avatarPreview ||
    getAvatar(user);


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <AppLayout>

      <div className="min-h-full bg-slate-50 transition-colors duration-200 dark:bg-slate-950">

        <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">

          {/* ==================================================
              ALERTS
          ================================================== */}

          {success && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">

              <Check className="mt-0.5 h-5 w-5 shrink-0" />

              <p className="text-sm font-medium">
                {success}
              </p>

            </div>
          )}


          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">

              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <p className="text-sm font-medium">
                {error}
              </p>

            </div>
          )}


          {/* ==================================================
              PROFILE HEADER
          ================================================== */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="relative h-32 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 sm:h-40">

              <div className="absolute inset-0 bg-black/5" />

            </div>


            <div className="relative px-4 pb-6 sm:px-7">

              <div className="grid grid-cols-1 gap-5 pt-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end sm:gap-6">

                {/* ==================================================
                    AVATAR
                ================================================== */}

                <div className="-mt-12 flex justify-center sm:-mt-16 sm:justify-start">

                  <div className="relative shrink-0">

                    {/* CLICKABLE PROFILE PICTURE */}

                    <button
                      type="button"
                      onClick={() =>
                        openPhotoPreview(
                          displayAvatar,
                          displayName
                        )
                      }
                      className="
                        block
                        h-24
                        w-24
                        overflow-hidden
                        rounded-full
                        border-4
                        border-white
                        bg-slate-100
                        shadow-xl
                        focus:outline-none
                        focus:ring-4
                        focus:ring-emerald-500/30
                        dark:border-slate-900
                        dark:bg-slate-800
                        sm:h-32
                        sm:w-32
                      "
                      title="Preview profile picture"
                      aria-label="Preview profile picture"
                    >

                      <img
                        src={displayAvatar}
                        alt={displayName}
                        className="
                          h-full
                          w-full
                          object-cover
                        "
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


                    {/* ==================================================
                        CHANGE PHOTO
                    ================================================== */}

                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="
                        absolute
                        bottom-0
                        left-0
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-full
                        border-2
                        border-white
                        bg-slate-900
                        text-white
                        shadow-md
                        transition
                        hover:bg-slate-700
                        dark:border-slate-900
                      "
                      title="Change profile photo"
                      aria-label="Change profile photo"
                    >

                      <Camera className="h-3.5 w-3.5" />

                    </button>


                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={
                        handleAvatarChange
                      }
                    />

                  </div>

                </div>


                {/* ==================================================
                    NAME + USERNAME + DETAILS
                ================================================== */}

                <div className="min-w-0 text-center sm:pb-1 sm:text-left">

                  <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">

                    <h1 className="max-w-full truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                      {displayName}
                    </h1>


                    {/* SINGLE PROFILE ONLINE INDICATOR */}

                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        isCurrentUserOnline
                          ? 'bg-emerald-500'
                          : 'bg-slate-400'
                      }`}
                      title={
                        isCurrentUserOnline
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


                {/* ==================================================
                    XP CARD
                ================================================== */}

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


              {/* ==================================================
                  STATUS
              ================================================== */}

              <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">

                {!isEditingStatus ? (

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div className="min-w-0">

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Status
                      </p>

                      <p className="mt-1 break-words text-sm text-slate-700 dark:text-slate-200">
                        {statusMessage ||
                          'No status update yet.'}
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setIsEditingStatus(true)
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >

                      <Edit3 className="h-4 w-4" />

                      Edit status

                    </button>

                  </div>

                ) : (

                  <div className="space-y-3">

                    <textarea
                      value={tempStatus}
                      onChange={(event) =>
                        setTempStatus(
                          event.target.value
                        )
                      }
                      rows={3}
                      maxLength={300}
                      placeholder="What are you up to?"
                      className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                    />

                    <div className="flex justify-end gap-2">

                      <button
                        type="button"
                        onClick={() => {
                          setTempStatus(
                            statusMessage
                          );

                          setIsEditingStatus(
                            false
                          );
                        }}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={
                          handleSaveStatus
                        }
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >

                        <Save className="h-4 w-4" />

                        {submitting
                          ? 'Saving...'
                          : 'Save status'}

                      </button>

                    </div>

                  </div>

                )}

              </div>


              {/* ==================================================
                  SELECTED PHOTO NOTICE
              ================================================== */}

              {avatarFile && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/20">

                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    New profile photo selected. Save your profile to upload it.
                  </p>

                  <button
                    type="button"
                    onClick={() => {

                      if (
                        avatarPreview?.startsWith(
                          'blob:'
                        )
                      ) {
                        URL.revokeObjectURL(
                          avatarPreview
                        );
                      }

                      setAvatarFile(null);

                      setAvatarPreview(
                        getAvatar(user)
                      );

                      if (
                        fileInputRef.current
                      ) {
                        fileInputRef.current.value =
                          '';
                      }

                    }}
                    className="shrink-0 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-200"
                    title="Cancel selected photo"
                  >
                    ×
                  </button>

                </div>
              )}

            </div>

          </section>


          {/* ==================================================
              TABS
          ================================================== */}

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

            <div className="flex min-w-max">

              {[
                {
                  id: 'profile',
                  label: 'Profile',
                  icon: UserIcon,
                },
                {
                  id: 'security',
                  label: 'Security',
                  icon: Lock,
                },
                {
                  id: 'friends',
                  label: 'Friends',
                  icon: Users,
                  count: friends.length,
                },
              ].map(
                ({
                  id,
                  label,
                  icon: Icon,
                  count,
                }) => (

                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setActiveTab(id)
                    }
                    className={`inline-flex items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-semibold transition ${
                      activeTab === id
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >

                    <Icon className="h-4 w-4" />

                    {label}

                    {typeof count === 'number' && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {count}
                      </span>
                    )}

                  </button>

                )
              )}

            </div>

          </div>


          {/* ==================================================
              PROFILE TAB
          ================================================== */}

          {activeTab === 'profile' && (

            <form
              onSubmit={
                handleSaveProfile
              }
              className="mt-4"
            >

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

                <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-7">

                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Personal information
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Keep your profile information up to date.
                  </p>

                </div>


                <div className="p-5 sm:p-7">

                  <div className="grid gap-5 sm:grid-cols-2">

                    <div className="sm:col-span-2">

                      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Full name
                      </label>

                      <div className="relative">

                        <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          name="name"
                          value={
                            formData.name
                          }
                          onChange={
                            handleInputChange
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        />

                      </div>

                    </div>


                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Email
                      </label>

                      <div className="relative">

                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          type="email"
                          name="email"
                          value={
                            formData.email
                          }
                          onChange={
                            handleInputChange
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        />

                      </div>

                    </div>


                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Username
                      </label>

                      <input
                        name="username"
                        value={
                          formData.username
                        }
                        onChange={
                          handleInputChange
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                      />

                    </div>


                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Phone
                      </label>

                      <div className="relative">

                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          name="phone"
                          value={
                            formData.phone
                          }
                          onChange={
                            handleInputChange
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        />

                      </div>

                    </div>


                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Location
                      </label>

                      <div className="relative">

                        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          name="location"
                          value={
                            formData.location
                          }
                          onChange={
                            handleInputChange
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        />

                      </div>

                    </div>


                    <div className="sm:col-span-2">

                      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Bio
                      </label>

                      <textarea
                        name="bio"
                        value={
                          formData.bio
                        }
                        onChange={
                          handleInputChange
                        }
                        rows={5}
                        maxLength={500}
                        placeholder="Tell people a little about yourself..."
                        className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                      />

                      <p className="mt-1 text-right text-xs text-slate-400">
                        {formData.bio.length}/500
                      </p>

                    </div>

                  </div>


                  <div className="mt-7 flex justify-end">

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >

                      <Save className="h-4 w-4" />

                      {submitting
                        ? 'Saving...'
                        : 'Save changes'}

                    </button>

                  </div>

                </div>

              </div>

            </form>

          )}


          {/* ==================================================
              SECURITY TAB
          ================================================== */}

          {activeTab === 'security' && (

            <div className="mt-4 max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">

              <div className="mb-6 flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">

                  <Shield className="h-5 w-5" />

                </div>

                <div>

                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Account security
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Change your account password.
                  </p>

                </div>

              </div>


              <form
                onSubmit={
                  handleUpdatePassword
                }
                className="space-y-5"
              >

                {[
                  {
                    key: 'currentPassword',
                    label: 'Current password',
                    field: 'current',
                  },
                  {
                    key: 'newPassword',
                    label: 'New password',
                    field: 'new',
                  },
                  {
                    key: 'confirmPassword',
                    label: 'Confirm new password',
                    field: 'confirm',
                  },
                ].map(
                  ({
                    key,
                    label,
                    field,
                  }) => (

                    <div key={key}>

                      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {label}
                      </label>

                      <div className="relative">

                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          type={
                            showPasswords[field]
                              ? 'text'
                              : 'password'
                          }
                          name={key}
                          value={
                            passwordData[key]
                          }
                          onChange={
                            handlePasswordChange
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            togglePasswordVisibility(
                              field
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          aria-label={
                            showPasswords[field]
                              ? 'Hide password'
                              : 'Show password'
                          }
                        >

                          {showPasswords[field] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}

                        </button>

                      </div>

                    </div>

                  )
                )}


                <div className="flex justify-end pt-2">

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    <Lock className="h-4 w-4" />

                    {submitting
                      ? 'Updating...'
                      : 'Update password'}

                  </button>

                </div>

              </form>

            </div>

          )}


          {/* ==================================================
              FRIENDS TAB
          ================================================== */}

          {activeTab === 'friends' && (

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">

              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    My friends
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {friends.length}{' '}
                    friend
                    {friends.length === 1
                      ? ''
                      : 's'}
                  </p>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    navigate('/people')
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >

                  <Search className="h-4 w-4" />

                  Find people

                </button>

              </div>


              {loadingFriends ? (

                <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Loading friends...
                </div>

              ) : friends.length === 0 ? (

                <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">

                  <Users className="mx-auto h-10 w-10 text-slate-400" />

                  <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
                    No friends yet
                  </p>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Find people and start building your network.
                  </p>

                </div>

              ) : (

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                  {friends.map(
                    (friend) => {

                      const friendId =
                        getUserId(friend);

                      const friendOnline =
                        getFriendOnlineStatus(
                          friend
                        );

                      const friendName =
                        friend.name ||
                        friend.username ||
                        'Friend';

                      return (

                        <div
                          key={
                            friendId ||
                            friend.email ||
                            friend.username
                          }
                          className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-slate-700 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
                        >

                          {/* ==================================================
                              FRIEND PROFILE PICTURE
                          ================================================== */}

                          <button
                            type="button"
                            onClick={() =>
                              openPhotoPreview(
                                friend,
                                friendName
                              )
                            }
                            className="
                              shrink-0
                              rounded-full
                              focus:outline-none
                              focus:ring-2
                              focus:ring-emerald-500/40
                            "
                            title="Preview profile picture"
                            aria-label={`Preview ${friendName}'s profile picture`}
                          >

                            <img
                              src={getAvatar(
                                friend
                              )}
                              alt={
                                friendName
                              }
                              className="
                                h-12
                                w-12
                                rounded-full
                                object-cover
                              "
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


                            {/* ONLINE INDICATOR */}

                            <span
                              className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                                friendOnline
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-400'
                              }`}
                            />

                          </button>


                          {/* ==================================================
                              FRIEND NAME
                          ================================================== */}

                          <button
                            type="button"
                            onClick={() =>
                              friendId &&
                              navigate(
                                `/profile/${friendId}`
                              )
                            }
                            className="min-w-0 flex-1 text-left"
                          >

                            <p className="truncate font-semibold text-slate-900 dark:text-white">
                              {friend.name ||
                                friend.username ||
                                'User'}
                            </p>

                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {friend.username
                                ? `@${friend.username}`
                                : friend.email ||
                                  'EAZY CHECK member'}
                            </p>

                          </button>


                          {/* ==================================================
                              MESSAGE BUTTON
                          ================================================== */}

                          {friendId && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/messages?user=${friendId}`
                                )
                              }
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                              title="Message"
                            >

                              <MessageCircle className="h-4 w-4" />

                            </button>
                          )}

                        </div>

                      );
                    }
                  )}

                </div>

              )}

            </div>

          )}

        </div>

      </div>


      {/* ========================================================
          PROFILE PHOTO PREVIEW MODAL
      ======================================================== */}

      {previewImage && (

        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/85
            p-4
            backdrop-blur-sm
            sm:p-8
          "
          role="dialog"
          aria-modal="true"
          aria-label="Profile picture preview"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closePhotoPreview();
            }
          }}
        >

          {/* ======================================================
              CLOSE BUTTON
          ====================================================== */}

          <button
            type="button"
            onClick={closePhotoPreview}
            className="
              absolute
              right-4
              top-4
              z-10
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-full
              border
              border-white/20
              bg-black/50
              text-white
              shadow-lg
              backdrop-blur
              transition
              hover:bg-white/20
              focus:outline-none
              focus:ring-2
              focus:ring-white/60
              sm:right-6
              sm:top-6
            "
            aria-label="Close profile picture preview"
            title="Close"
          >

            <X className="h-6 w-6" />

          </button>


          {/* ======================================================
              IMAGE AREA
          ====================================================== */}

          <div
            className="
              relative
              flex
              max-h-[90vh]
              max-w-[95vw]
              flex-col
              items-center
              justify-center
              sm:max-w-[90vw]
            "
          >

            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-white/10
                bg-white/5
                p-1
                shadow-2xl
                shadow-black/50
              "
            >

              <img
                src={previewImage}
                alt={
                  previewName ||
                  'Profile picture'
                }
                className="
                  block
                  max-h-[78vh]
                  max-w-[90vw]
                  rounded-xl
                  object-contain
                  sm:max-h-[82vh]
                  sm:max-w-[85vw]
                "
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


            {/* ==================================================
                IMAGE NAME
            ================================================== */}

            {previewName && (
              <div
                className="
                  mt-4
                  rounded-full
                  border
                  border-white/10
                  bg-black/50
                  px-5
                  py-2
                  text-center
                  text-sm
                  font-semibold
                  text-white
                  shadow-lg
                  backdrop-blur
                "
              >
                {previewName}
              </div>
            )}

          </div>

        </div>

      )}

    </AppLayout>
  );
}