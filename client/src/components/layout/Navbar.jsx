import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Bell,
  ChevronDown,
  FileCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import ThemeToggle from '../common/ThemeToggle';

/**
 * ============================================================
 * AVATAR HELPERS
 * ============================================================
 */

/**
 * Resolve the user's profile image from the possible
 * fields returned by the backend.
 */
const getRawAvatarUrl = (user) => {
  if (!user) {
    return null;
  }

  const possibleUrls = [
    user.avatarUrl,
    user.avatar,
    user.profilePicture,
    user.profilePhoto,
    user.photoUrl,
  ];

  const validUrl = possibleUrls.find(
    (value) =>
      typeof value === 'string' &&
      value.trim().length > 0
  );

  return validUrl
    ? validUrl.trim()
    : null;
};

/**
 * Add cache busting when the backend provides a
 * changing timestamp.
 *
 * This prevents the Navbar from continuing to display
 * an older cached profile image after an avatar update.
 */
const getAvatarUrl = (user) => {
  const rawUrl = getRawAvatarUrl(user);

  if (!rawUrl) {
    return null;
  }

  const version =
    user?.avatarUpdatedAt ||
    user?.updatedAt ||
    user?.profileUpdatedAt ||
    null;

  if (!version) {
    return rawUrl;
  }

  const separator = rawUrl.includes('?')
    ? '&'
    : '?';

  return `${rawUrl}${separator}v=${encodeURIComponent(
    version
  )}`;
};

/**
 * Get a reliable user identifier.
 */
const getUserId = (user) => {
  return (
    user?._id ||
    user?.id ||
    user?.userId ||
    null
  );
};

/**
 * Get user's display name.
 */
const getUserName = (user) => {
  return (
    user?.name ||
    user?.fullName ||
    user?.username ||
    'User'
  );
};

/**
 * Get user's first initial for avatar fallback.
 */
const getUserInitial = (user) => {
  const name = getUserName(user);

  return name
    ? name.trim().charAt(0).toUpperCase()
    : 'U';
};

/**
 * ============================================================
 * NAVBAR
 * ============================================================
 */

export default function Navbar() {
  const {
    user,
    isAuthenticated,
    isSuperAdmin,
    logout,
  } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const {
    unreadCount = 0,
  } = useNotifications();

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const [
    avatarError,
    setAvatarError,
  ] = useState(false);

  const profileRef = useRef(null);
  const mobileRef = useRef(null);

  /**
   * ==========================================================
   * USER DATA
   * ==========================================================
   */

  const avatarUrl = useMemo(
    () => getAvatarUrl(user),
    [
      user?.avatarUrl,
      user?.avatar,
      user?.profilePicture,
      user?.profilePhoto,
      user?.photoUrl,
      user?.avatarUpdatedAt,
      user?.updatedAt,
      user?.profileUpdatedAt,
    ]
  );

  const userId = getUserId(user);

  const userName = getUserName(user);

  const userInitial = getUserInitial(user);

  /**
   * Reset avatar error whenever the avatar changes.
   */
  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

  /**
   * ==========================================================
   * CLOSE PROFILE DROPDOWN WHEN CLICKING OUTSIDE
   * ==========================================================
   */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(
          event.target
        )
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  /**
   * ==========================================================
   * CLOSE MOBILE MENU WHEN CLICKING OUTSIDE
   * ==========================================================
   */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mobileRef.current &&
        !mobileRef.current.contains(
          event.target
        )
      ) {
        setMobileOpen(false);
      }
    };

    if (mobileOpen) {
      document.addEventListener(
        'mousedown',
        handleClickOutside
      );
    }

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, [mobileOpen]);

  /**
   * ==========================================================
   * CLOSE MENUS WHEN ROUTE CHANGES
   * ==========================================================
   */

  useEffect(() => {
    setProfileOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  /**
   * ==========================================================
   * PREVENT BODY SCROLL WHILE MOBILE MENU IS OPEN
   * ==========================================================
   */

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  /**
   * ==========================================================
   * LOGOUT
   * ==========================================================
   */

  const handleLogout = async () => {
    try {
      setProfileOpen(false);
      setMobileOpen(false);

      await logout();

      navigate('/login');
    } catch (error) {
      console.error(
        'Logout error:',
        error
      );

      /**
       * Even if the backend logout request fails,
       * make sure the user is returned to login.
       */
      navigate('/login');
    }
  };

  /**
   * ==========================================================
   * NAVIGATION HELPER
   * ==========================================================
   */

  const goTo = (path) => {
    setProfileOpen(false);
    setMobileOpen(false);

    navigate(path);
  };

  /**
   * ==========================================================
   * ACTIVE ROUTE
   * ==========================================================
   */

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(
        `${path}/`
      )
    );
  };

  /**
   * ==========================================================
   * USER AVATAR COMPONENT
   * ==========================================================
   */

  const UserAvatar = ({
    sizeClass = 'w-8 h-8',
    textClass = 'text-sm',
  }) => {
    const avatarKey = [
      userId || 'user',
      avatarUrl || 'no-avatar',
      user?.avatarUpdatedAt || '',
      user?.updatedAt || '',
    ].join('-');

    const showImage =
      Boolean(avatarUrl) &&
      !avatarError;

    return (
      <div
        className={`
          ${sizeClass}
          rounded-full
          overflow-hidden
          bg-brand-500/20
          border
          border-brand-500/30
          flex
          items-center
          justify-center
          flex-shrink-0
        `}
      >
        {showImage ? (
          <img
            key={avatarKey}
            src={avatarUrl}
            alt={userName}
            className="
              w-full
              h-full
              object-cover
            "
            loading="eager"
            onError={() => {
              console.warn(
                'EAZY DON CHECK Navbar avatar failed to load:',
                avatarUrl
              );

              setAvatarError(true);
            }}
          />
        ) : (
          <span
            className={`
              ${textClass}
              font-semibold
              text-brand-600
              dark:text-brand-400
            `}
          >
            {userInitial}
          </span>
        )}
      </div>
    );
  };

  /**
   * ==========================================================
   * EAZY DON CHECK NAVIGATION
   * ==========================================================
   *
   * Feed is the primary/home page for the application.
   */

  const navItems = [
    {
      label: 'Home',
      path: '/',
    },
    {
      label: 'Feed',
      path: '/feed',
    },
    {
      label: 'Dashboard',
      path: '/dashboard',
    },
    {
      label: 'Verify Receipt',
      path: '/verify',
    },
  ];

  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <nav
      className="
        sticky
        top-0
        z-50
        w-full
        border-b
        border-gray-200/80
        dark:border-gray-800/80
        bg-white/95
        dark:bg-gray-950/95
        backdrop-blur-xl
      "
    >
      <div
        className="
          max-w-7xl
          mx-auto
          px-4
          sm:px-6
          lg:px-8
        "
      >
        <div
          className="
            h-16
            flex
            items-center
            justify-between
            gap-4
          "
        >

          {/* =================================================
              LEFT SIDE
          ================================================= */}

          <div
            className="
              flex
              items-center
              gap-4
              min-w-0
            "
          >

            {/* MOBILE MENU BUTTON */}

            <button
              type="button"
              onClick={() =>
                setMobileOpen(
                  (previous) =>
                    !previous
                )
              }
              className="
                lg:hidden
                inline-flex
                items-center
                justify-center
                w-10
                h-10
                rounded-xl
                text-gray-700
                dark:text-gray-200
                hover:bg-gray-100
                dark:hover:bg-gray-800
                transition-colors
              "
              aria-label={
                mobileOpen
                  ? 'Close navigation menu'
                  : 'Open navigation menu'
              }
              aria-expanded={
                mobileOpen
              }
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {/* BRAND */}

            <Link
              to="/"
              className="
                flex
                items-center
                gap-2.5
                min-w-0
                group
              "
              onClick={() => {
                setMobileOpen(false);
                setProfileOpen(false);
              }}
            >

              <div
                className="
                  w-10
                  h-10
                  rounded-xl
                  bg-white
                  border
                  border-gray-200
                  dark:border-gray-300
                  flex
                  items-center
                  justify-center
                  p-1
                  shadow-md
                  overflow-hidden
                  group-hover:scale-105
                  transition-transform
                "
              >
                <img
                  src="/eazy-don-check-logo.png"
                  alt="EAZY DON CHECK"
                  className="
                    w-full
                    h-full
                    object-contain
                    rounded-lg
                    bg-white
                  "
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              <div
                className="
                  hidden
                  sm:block
                  min-w-0
                "
              >
                <div
                  className="
                    font-bold
                    text-gray-900
                    dark:text-white
                    leading-none
                    truncate
                  "
                >
                  EAZY DON
                  <span className="text-brand-500">
                    {' '}
                    CHECK
                  </span>
                </div>

                <div
                  className="
                    text-[10px]
                    text-gray-500
                    dark:text-gray-400
                    mt-1
                    truncate
                    uppercase
                    tracking-wider
                  "
                >
                  Online Social & AI Verification Platform
                </div>
              </div>
            </Link>
          </div>

          {/* =================================================
              DESKTOP NAVIGATION
          ================================================= */}

          <div
            className="
              hidden
              lg:flex
              items-center
              gap-1
              flex-1
              justify-center
            "
          >
            {navItems.map((item) => {
              const active =
                isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={[
                    `
                      px-4
                      py-2
                      rounded-xl
                      text-sm
                      font-medium
                      transition-colors
                    `,
                    active
                      ? `
                        bg-brand-500/10
                        text-brand-600
                        dark:text-brand-400
                      `
                      : `
                        text-gray-600
                        dark:text-gray-300
                        hover:bg-gray-100
                        dark:hover:bg-gray-800
                        hover:text-gray-900
                        dark:hover:text-white
                      `,
                  ].join(' ')}
                >
                  {item.path ===
                    '/dashboard' && (
                    <LayoutDashboard
                      className="
                        inline
                        w-4
                        h-4
                        mr-1.5
                        -mt-0.5
                      "
                    />
                  )}

                  {item.path ===
                    '/verify' && (
                    <FileCheck
                      className="
                        inline
                        w-4
                        h-4
                        mr-1.5
                        -mt-0.5
                      "
                    />
                  )}

                  {item.label}
                </Link>
              );
            })}

            {/* SUPER ADMIN */}

            {isSuperAdmin && (
              <Link
                to="/admin"
                className={[
                  `
                    px-4
                    py-2
                    rounded-xl
                    text-sm
                    font-medium
                    transition-colors
                    flex
                    items-center
                    gap-2
                  `,
                  isActive('/admin')
                    ? `
                      bg-brand-500/10
                      text-brand-600
                      dark:text-brand-400
                    `
                    : `
                      text-gray-600
                      dark:text-gray-300
                      hover:bg-gray-100
                      dark:hover:bg-gray-800
                      hover:text-gray-900
                      dark:hover:text-white
                    `,
                ].join(' ')}
              >
                <ShieldCheck
                  className="w-4 h-4"
                />

                Admin
              </Link>
            )}
          </div>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <div
            className="
              flex
              items-center
              gap-1
              sm:gap-2
            "
          >

            {/* SEARCH */}

            {isAuthenticated && (
              <button
                type="button"
                onClick={() =>
                  goTo('/search')
                }
                className="
                  hidden
                  sm:inline-flex
                  items-center
                  justify-center
                  w-10
                  h-10
                  rounded-xl
                  text-gray-600
                  dark:text-gray-300
                  hover:bg-gray-100
                  dark:hover:bg-gray-800
                  transition-colors
                "
                aria-label="Search"
              >
                <Search
                  className="w-5 h-5"
                />
              </button>
            )}

            {/* MESSAGES */}

            {isAuthenticated && (
              <button
                type="button"
                onClick={() =>
                  goTo('/messages')
                }
                className="
                  hidden
                  sm:inline-flex
                  items-center
                  justify-center
                  w-10
                  h-10
                  rounded-xl
                  text-gray-600
                  dark:text-gray-300
                  hover:bg-gray-100
                  dark:hover:bg-gray-800
                  transition-colors
                "
                aria-label="Messages"
              >
                <MessageCircle
                  className="w-5 h-5"
                />
              </button>
            )}

            {/* NOTIFICATIONS */}

            {isAuthenticated && (
              <button
                type="button"
                onClick={() =>
                  goTo('/notifications')
                }
                className="
                  relative
                  inline-flex
                  items-center
                  justify-center
                  w-10
                  h-10
                  rounded-xl
                  text-gray-600
                  dark:text-gray-300
                  hover:bg-gray-100
                  dark:hover:bg-gray-800
                  transition-colors
                "
                aria-label="Notifications"
              >
                <Bell
                  className="w-5 h-5"
                />

                {unreadCount > 0 && (
                  <span
                    className="
                      absolute
                      top-1
                      right-1
                      min-w-[18px]
                      h-[18px]
                      px-1
                      rounded-full
                      bg-red-500
                      text-white
                      text-[10px]
                      font-bold
                      flex
                      items-center
                      justify-center
                      border-2
                      border-white
                      dark:border-gray-950
                    "
                  >
                    {unreadCount > 99
                      ? '99+'
                      : unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* THEME */}

            <ThemeToggle />

            {/* =================================================
                AUTHENTICATED PROFILE
            ================================================= */}

            {isAuthenticated &&
            user ? (
              <div
                ref={profileRef}
                className="
                  relative
                  ml-1
                "
              >
                <button
                  type="button"
                  onClick={() =>
                    setProfileOpen(
                      (previous) =>
                        !previous
                    )
                  }
                  className="
                    flex
                    items-center
                    gap-2
                    rounded-xl
                    px-1.5
                    py-1.5
                    hover:bg-gray-100
                    dark:hover:bg-gray-800
                    transition-colors
                  "
                  aria-haspopup="menu"
                  aria-expanded={
                    profileOpen
                  }
                  aria-label="Open profile menu"
                >
                  <UserAvatar />

                  <span
                    className="
                      hidden
                      md:block
                      max-w-[120px]
                      truncate
                      text-sm
                      font-medium
                      text-gray-800
                      dark:text-gray-100
                    "
                  >
                    {userName}
                  </span>

                  <ChevronDown
                    className={[
                      `
                        hidden
                        md:block
                        w-4
                        h-4
                        text-gray-500
                        transition-transform
                      `,
                      profileOpen
                        ? 'rotate-180'
                        : '',
                    ].join(' ')}
                  />
                </button>

                {/* =================================================
                    PROFILE DROPDOWN
                ================================================= */}

                {profileOpen && (
                  <div
                    className="
                      absolute
                      right-0
                      mt-2
                      w-72
                      rounded-2xl
                      border
                      border-gray-200
                      dark:border-gray-800
                      bg-white
                      dark:bg-gray-900
                      shadow-2xl
                      overflow-hidden
                    "
                  >

                    {/* PROFILE HEADER */}

                    <div
                      className="
                        px-4
                        py-4
                        border-b
                        border-gray-200
                        dark:border-gray-800
                      "
                    >
                      <div
                        className="
                          flex
                          items-center
                          gap-3
                        "
                      >
                        <UserAvatar
                          sizeClass="w-11 h-11"
                          textClass="text-base"
                        />

                        <div
                          className="
                            min-w-0
                            flex-1
                          "
                        >
                          <p
                            className="
                              font-semibold
                              text-gray-900
                              dark:text-white
                              truncate
                            "
                          >
                            {userName}
                          </p>

                          {user?.username && (
                            <p
                              className="
                                text-xs
                                text-gray-500
                                dark:text-gray-400
                                truncate
                              "
                            >
                              @{user.username}
                            </p>
                          )}

                          {user?.email && (
                            <p
                              className="
                                text-xs
                                text-gray-500
                                dark:text-gray-400
                                truncate
                                mt-0.5
                              "
                            >
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* MENU */}

                    <div className="p-2">

                      {/* PROFILE */}

                      <button
                        type="button"
                        onClick={() =>
                          goTo('/profile')
                        }
                        className="
                          w-full
                          flex
                          items-center
                          gap-3
                          px-3
                          py-2.5
                          rounded-xl
                          text-sm
                          text-gray-700
                          dark:text-gray-200
                          hover:bg-gray-100
                          dark:hover:bg-gray-800
                          transition-colors
                          text-left
                        "
                      >
                        <UserIcon
                          className="w-4 h-4"
                        />

                        <span>
                          My Profile
                        </span>
                      </button>

                      {/* DASHBOARD */}

                      <button
                        type="button"
                        onClick={() =>
                          goTo('/dashboard')
                        }
                        className="
                          w-full
                          flex
                          items-center
                          gap-3
                          px-3
                          py-2.5
                          rounded-xl
                          text-sm
                          text-gray-700
                          dark:text-gray-200
                          hover:bg-gray-100
                          dark:hover:bg-gray-800
                          transition-colors
                          text-left
                        "
                      >
                        <LayoutDashboard
                          className="w-4 h-4"
                        />

                        <span>
                          Dashboard
                        </span>
                      </button>

                      {/* VERIFY RECEIPT */}

                      <button
                        type="button"
                        onClick={() =>
                          goTo('/verify')
                        }
                        className="
                          w-full
                          flex
                          items-center
                          gap-3
                          px-3
                          py-2.5
                          rounded-xl
                          text-sm
                          text-gray-700
                          dark:text-gray-200
                          hover:bg-gray-100
                          dark:hover:bg-gray-800
                          transition-colors
                          text-left
                        "
                      >
                        <FileCheck
                          className="w-4 h-4"
                        />

                        <span>
                          Verify Receipt
                        </span>
                      </button>

                      {/* MESSAGES */}

                      <button
                        type="button"
                        onClick={() =>
                          goTo('/messages')
                        }
                        className="
                          w-full
                          flex
                          items-center
                          gap-3
                          px-3
                          py-2.5
                          rounded-xl
                          text-sm
                          text-gray-700
                          dark:text-gray-200
                          hover:bg-gray-100
                          dark:hover:bg-gray-800
                          transition-colors
                          text-left
                        "
                      >
                        <MessageCircle
                          className="w-4 h-4"
                        />

                        <span>
                          Messages
                        </span>
                      </button>

                      {/* NOTIFICATIONS */}

                      <button
                        type="button"
                        onClick={() =>
                          goTo('/notifications')
                        }
                        className="
                          w-full
                          flex
                          items-center
                          justify-between
                          px-3
                          py-2.5
                          rounded-xl
                          text-sm
                          text-gray-700
                          dark:text-gray-200
                          hover:bg-gray-100
                          dark:hover:bg-gray-800
                          transition-colors
                          text-left
                        "
                      >
                        <span
                          className="
                            flex
                            items-center
                            gap-3
                          "
                        >
                          <Bell
                            className="w-4 h-4"
                          />

                          <span>
                            Notifications
                          </span>
                        </span>

                        {unreadCount > 0 && (
                          <span
                            className="
                              min-w-[20px]
                              h-5
                              px-1.5
                              rounded-full
                              bg-red-500
                              text-white
                              text-[10px]
                              font-bold
                              flex
                              items-center
                              justify-center
                            "
                          >
                            {unreadCount > 99
                              ? '99+'
                              : unreadCount}
                          </span>
                        )}
                      </button>

                      {/* SETTINGS */}

                      <button
                        type="button"
                        onClick={() =>
                          goTo('/settings')
                        }
                        className="
                          w-full
                          flex
                          items-center
                          gap-3
                          px-3
                          py-2.5
                          rounded-xl
                          text-sm
                          text-gray-700
                          dark:text-gray-200
                          hover:bg-gray-100
                          dark:hover:bg-gray-800
                          transition-colors
                          text-left
                        "
                      >
                        <Settings
                          className="w-4 h-4"
                        />

                        <span>
                          Settings
                        </span>
                      </button>

                      {/* ADMIN */}

                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            goTo('/admin')
                          }
                          className="
                            w-full
                            flex
                            items-center
                            gap-3
                            px-3
                            py-2.5
                            rounded-xl
                            text-sm
                            text-gray-700
                            dark:text-gray-200
                            hover:bg-gray-100
                            dark:hover:bg-gray-800
                            transition-colors
                            text-left
                          "
                        >
                          <ShieldCheck
                            className="w-4 h-4"
                          />

                          <span>
                            Admin Panel
                          </span>
                        </button>
                      )}

                      <div
                        className="
                          my-2
                          border-t
                          border-gray-200
                          dark:border-gray-800
                        "
                      />

                      {/* LOGOUT */}

                      <button
                        type="button"
                        onClick={
                          handleLogout
                        }
                        className="
                          w-full
                          flex
                          items-center
                          gap-3
                          px-3
                          py-2.5
                          rounded-xl
                          text-sm
                          text-red-600
                          dark:text-red-400
                          hover:bg-red-50
                          dark:hover:bg-red-950/30
                          transition-colors
                          text-left
                        "
                      >
                        <LogOut
                          className="w-4 h-4"
                        />

                        <span>
                          Logout
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* =================================================
                 PUBLIC ACTIONS
              ================================================= */

              <div
                className="
                  hidden
                  sm:flex
                  items-center
                  gap-2
                "
              >
                <Link
                  to="/login"
                  className="
                    px-4
                    py-2
                    rounded-xl
                    text-sm
                    font-medium
                    text-gray-700
                    dark:text-gray-200
                    hover:bg-gray-100
                    dark:hover:bg-gray-800
                    transition-colors
                  "
                >
                  Login
                </Link>

                <Link
                  to="/signup"
                  className="
                    px-4
                    py-2
                    rounded-xl
                    text-sm
                    font-semibold
                    bg-brand-600
                    hover:bg-brand-700
                    text-white
                    transition-colors
                    shadow-sm
                  "
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* =====================================================
            MOBILE NAVIGATION
        ===================================================== */}

        {mobileOpen && (
          <div
            ref={mobileRef}
            className="
              lg:hidden
              border-t
              border-gray-200
              dark:border-gray-800
              bg-white
              dark:bg-gray-950
            "
          >
            <div
              className="
                px-4
                py-4
                space-y-2
              "
            >

              {/* NAVIGATION ITEMS */}

              {navItems.map((item) => {
                const active =
                  isActive(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() =>
                      setMobileOpen(false)
                    }
                    className={[
                      `
                        flex
                        items-center
                        gap-3
                        px-4
                        py-3
                        rounded-xl
                        text-sm
                        font-medium
                        transition-colors
                      `,
                      active
                        ? `
                          bg-brand-500/10
                          text-brand-600
                          dark:text-brand-400
                        `
                        : `
                          text-gray-700
                          dark:text-gray-200
                          hover:bg-gray-100
                          dark:hover:bg-gray-800
                        `,
                    ].join(' ')}
                  >
                    {item.path ===
                      '/dashboard' && (
                      <LayoutDashboard
                        className="w-5 h-5"
                      />
                    )}

                    {item.path ===
                      '/verify' && (
                      <FileCheck
                        className="w-5 h-5"
                      />
                    )}

                    {item.label}
                  </Link>
                );
              })}

              {isAuthenticated && (
                <>

                  {/* SEARCH */}

                  <button
                    type="button"
                    onClick={() =>
                      goTo('/search')
                    }
                    className="
                      w-full
                      flex
                      items-center
                      gap-3
                      px-4
                      py-3
                      rounded-xl
                      text-sm
                      font-medium
                      text-gray-700
                      dark:text-gray-200
                      hover:bg-gray-100
                      dark:hover:bg-gray-800
                      text-left
                    "
                  >
                    <Search
                      className="w-5 h-5"
                    />

                    Search
                  </button>

                  {/* MESSAGES */}

                  <button
                    type="button"
                    onClick={() =>
                      goTo('/messages')
                    }
                    className="
                      w-full
                      flex
                      items-center
                      gap-3
                      px-4
                      py-3
                      rounded-xl
                      text-sm
                      font-medium
                      text-gray-700
                      dark:text-gray-200
                      hover:bg-gray-100
                      dark:hover:bg-gray-800
                      text-left
                    "
                  >
                    <MessageCircle
                      className="w-5 h-5"
                    />

                    Messages
                  </button>

                  {/* NOTIFICATIONS */}

                  <button
                    type="button"
                    onClick={() =>
                      goTo('/notifications')
                    }
                    className="
                      w-full
                      flex
                      items-center
                      justify-between
                      px-4
                      py-3
                      rounded-xl
                      text-sm
                      font-medium
                      text-gray-700
                      dark:text-gray-200
                      hover:bg-gray-100
                      dark:hover:bg-gray-800
                      text-left
                    "
                  >
                    <span
                      className="
                        flex
                        items-center
                        gap-3
                      "
                    >
                      <Bell
                        className="w-5 h-5"
                      />

                      Notifications
                    </span>

                    {unreadCount > 0 && (
                      <span
                        className="
                          min-w-[22px]
                          h-5
                          px-1.5
                          rounded-full
                          bg-red-500
                          text-white
                          text-[10px]
                          font-bold
                          flex
                          items-center
                          justify-center
                        "
                      >
                        {unreadCount > 99
                          ? '99+'
                          : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* PROFILE */}

                  <button
                    type="button"
                    onClick={() =>
                      goTo('/profile')
                    }
                    className="
                      w-full
                      flex
                      items-center
                      gap-3
                      px-4
                      py-3
                      rounded-xl
                      text-sm
                      font-medium
                      text-gray-700
                      dark:text-gray-200
                      hover:bg-gray-100
                      dark:hover:bg-gray-800
                      text-left
                    "
                  >
                    <UserIcon
                      className="w-5 h-5"
                    />

                    My Profile
                  </button>

                  {/* SETTINGS */}

                  <button
                    type="button"
                    onClick={() =>
                      goTo('/settings')
                    }
                    className="
                      w-full
                      flex
                      items-center
                      gap-3
                      px-4
                      py-3
                      rounded-xl
                      text-sm
                      font-medium
                      text-gray-700
                      dark:text-gray-200
                      hover:bg-gray-100
                      dark:hover:bg-gray-800
                      text-left
                    "
                  >
                    <Settings
                      className="w-5 h-5"
                    />

                    Settings
                  </button>

                  {/* ADMIN */}

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() =>
                        goTo('/admin')
                      }
                      className="
                        w-full
                        flex
                        items-center
                        gap-3
                        px-4
                        py-3
                        rounded-xl
                        text-sm
                        font-medium
                        text-gray-700
                        dark:text-gray-200
                        hover:bg-gray-100
                        dark:hover:bg-gray-800
                        text-left
                      "
                    >
                      <ShieldCheck
                        className="w-5 h-5"
                      />

                      Admin Panel
                    </button>
                  )}

                  <div
                    className="
                      border-t
                      border-gray-200
                      dark:border-gray-800
                      my-3
                    "
                  />

                  {/* LOGOUT */}

                  <button
                    type="button"
                    onClick={
                      handleLogout
                    }
                    className="
                      w-full
                      flex
                      items-center
                      gap-3
                      px-4
                      py-3
                      rounded-xl
                      text-sm
                      font-medium
                      text-red-600
                      dark:text-red-400
                      hover:bg-red-50
                      dark:hover:bg-red-950/30
                      text-left
                    "
                  >
                    <LogOut
                      className="w-5 h-5"
                    />

                    Logout
                  </button>
                </>
              )}

              {/* PUBLIC MOBILE ACTIONS */}

              {!isAuthenticated && (
                <div
                  className="
                    grid
                    grid-cols-2
                    gap-2
                    pt-2
                  "
                >
                  <Link
                    to="/login"
                    onClick={() =>
                      setMobileOpen(false)
                    }
                    className="
                      flex
                      items-center
                      justify-center
                      px-4
                      py-3
                      rounded-xl
                      text-sm
                      font-medium
                      text-gray-700
                      dark:text-gray-200
                      bg-gray-100
                      dark:bg-gray-800
                    "
                  >
                    Login
                  </Link>

                  <Link
                    to="/signup"
                    onClick={() =>
                      setMobileOpen(false)
                    }
                    className="
                      flex
                      items-center
                      justify-center
                      px-4
                      py-3
                      rounded-xl
                      text-sm
                      font-semibold
                      bg-brand-600
                      hover:bg-brand-700
                      text-white
                    "
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}