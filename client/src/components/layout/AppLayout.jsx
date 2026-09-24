import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
} from 'react';

import {
  useNavigate,
  useLocation,
} from 'react-router-dom';

import Sidebar from './Sidebar';

import {
  Star,
  ShieldCheck,
  User as UserIcon,
  Settings,
  LogOut,
  ChevronDown,
  MessageCircle,
  Bell,
} from 'lucide-react';

import ThemeToggle from '../common/ThemeToggle';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  useNotifications,
} from '../../context/NotificationContext';

import {
  useChatUnread,
} from '../../context/ChatUnreadContext';


// ============================================================
// AVATAR HELPERS
// ============================================================

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


  const validUrl =
    possibleUrls.find(
      (value) =>
        typeof value === 'string' &&
        value.trim().length > 0
    );


  return validUrl
    ? validUrl.trim()
    : null;

};


const getAvatarUrl = (user) => {

  const rawUrl =
    getRawAvatarUrl(user);


  if (!rawUrl) {
    return null;
  }


  const version =
    user?.avatarUpdatedAt ||
    user?.profileUpdatedAt ||
    user?.updatedAt ||
    null;


  if (!version) {
    return rawUrl;
  }


  const separator =
    rawUrl.includes('?')
      ? '&'
      : '?';


  return `${rawUrl}${separator}v=${encodeURIComponent(
    version
  )}`;

};


// ============================================================
// COMPONENT
// ============================================================

const AppLayout = ({
  children,
}) => {

  // ==========================================================
  // ROUTER
  // ==========================================================

  const navigate =
    useNavigate();

  const location =
    useLocation();


  // ==========================================================
  // AUTH
  // ==========================================================

  const {
    user: authUser,
    logout,
  } = useAuth();


  // ==========================================================
  // NOTIFICATIONS
  // ==========================================================

  const {
    unreadCount,
  } = useNotifications();


  // ==========================================================
  // CHAT UNREAD
  // ==========================================================

  const {
    totalUnreadMessages,
  } = useChatUnread();


  // ==========================================================
  // PROFILE DROPDOWN
  // ==========================================================

  const [
    profileDropdownOpen,
    setProfileDropdownOpen,
  ] = useState(false);


  const dropdownRef =
    useRef(null);


  // ==========================================================
  // CURRENT USER
  // ==========================================================

  const currentUser =
    authUser || {

      name: 'Eazy User',
      username: 'user',

      gamification: {
        starRank: 'Pro',
        xpPoints: 1250,
      },

      usage: {
        scansThisMonth: 0,
        maxScansAllowed: 5,
      },

    };


  // ==========================================================
  // AVATAR
  // ==========================================================

  const avatarUrl =
    useMemo(
      () =>
        getAvatarUrl(
          currentUser
        ),

      [
        currentUser?.avatarUrl,
        currentUser?.avatar,
        currentUser?.profilePicture,
        currentUser?.profilePhoto,
        currentUser?.photoUrl,
        currentUser?.avatarUpdatedAt,
        currentUser?.profileUpdatedAt,
        currentUser?.updatedAt,
      ]
    );


  const avatarKey =
    useMemo(
      () => [

        currentUser?._id ||
          currentUser?.id ||
          'user',

        avatarUrl ||
          'no-avatar',

        currentUser?.avatarUpdatedAt ||
          '',

        currentUser?.profileUpdatedAt ||
          '',

        currentUser?.updatedAt ||
          '',

      ].join('-'),

      [
        currentUser?._id,
        currentUser?.id,
        avatarUrl,
        currentUser?.avatarUpdatedAt,
        currentUser?.profileUpdatedAt,
        currentUser?.updatedAt,
      ]
    );


  // ==========================================================
  // USER INITIAL
  // ==========================================================

  const userInitial =
    currentUser?.name
      ? currentUser.name
          .charAt(0)
          .toUpperCase()
      : 'U';


  // ==========================================================
  // SAFE COUNTS
  // ==========================================================

  const safeUnreadMessages =
    Number(
      totalUnreadMessages
    ) || 0;


  const safeUnreadNotifications =
    Number(
      unreadCount
    ) || 0;


  // ==========================================================
  // SAFE SCAN QUOTA
  // ==========================================================

  const scansUsed =
    currentUser?.scansUsed ??
    currentUser?.usage?.scansThisMonth ??
    currentUser?.usage?.scans ??
    0;


  const maxScans =
    currentUser?.maxScans ??
    currentUser?.usage?.maxScansAllowed ??
    currentUser?.usage?.maxScans ??
    5;


  // ==========================================================
  // UNLIMITED ACCOUNT
  // ==========================================================

  const isUnlimited =
    currentUser?.role === 'superadmin' ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.isSuperAdmin === true ||
    (
      currentUser?.subscription?.status === 'active' &&
      currentUser?.subscription?.plan === 'unlimited'
    ) ||
    currentUser?.subscription?.plan === 'unlimited';


  // ==========================================================
  // CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  // ==========================================================

  useEffect(() => {

    const handleClickOutside =
      (event) => {

        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(
            event.target
          )
        ) {

          setProfileDropdownOpen(
            false
          );

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


  // ==========================================================
  // CLOSE DROPDOWN WHEN ROUTE CHANGES
  // ==========================================================

  useEffect(() => {

    setProfileDropdownOpen(
      false
    );

  }, [
    location.pathname,
  ]);


  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {

    setProfileDropdownOpen(
      false
    );

    logout();

    navigate('/login');

  };


  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const handleMessagesClick = () => {

    setProfileDropdownOpen(
      false
    );

    navigate('/messages');

  };


  const handleNotificationsClick = () => {

    setProfileDropdownOpen(
      false
    );

    navigate('/notifications');

  };


  const handleProfileClick = () => {

    setProfileDropdownOpen(
      false
    );

    navigate('/profile');

  };


  const handleSettingsClick = () => {

    setProfileDropdownOpen(
      false
    );

    navigate('/settings');

  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div
      className="
        fixed
        inset-0
        w-full
        h-full
        flex

        bg-slate-50
        dark:bg-dark-bg

        text-slate-900
        dark:text-slate-100

        overflow-hidden

        transition-colors
        duration-200
      "
    >

      {/* ====================================================
          SIDEBAR
      ==================================================== */}

      <Sidebar />


      {/* ====================================================
          MAIN WORKSPACE
      ==================================================== */}

      <div
        className="
          flex-1
          min-w-0
          min-h-0
          h-full
          flex
          flex-col
          overflow-hidden
        "
      >

        {/* ==================================================
            TOP NAVBAR
        ================================================== */}

        <header
          className="
            relative
            z-40

            h-16
            min-h-16
            shrink-0
            w-full

            border-b
            border-slate-200
            dark:border-dark-border

            bg-white
            dark:bg-dark-card

            px-3
            sm:px-5

            pl-16
            sm:pl-16
            md:pl-5

            flex
            items-center
            justify-between

            shadow-sm

            transition-colors
            duration-200
          "
        >

          {/* =================================================
              LEFT SIDE
          ================================================= */}

          <div
            className="
              flex
              items-center
              gap-2.5
              sm:gap-3
              min-w-0
              overflow-hidden
            "
          >

            <span
              className="
                text-xs
                font-bold
                px-2.5
                py-1.5
                rounded-full

                bg-brand-500/10
                text-brand-600
                dark:text-brand-400

                border
                border-brand-500/20

                flex
                items-center
                gap-1.5

                whitespace-nowrap

                max-w-full
                sm:max-w-none
              "
            >

              <ShieldCheck
                className="
                  w-3.5
                  h-3.5
                  shrink-0
                "
              />


              <span className="hidden sm:inline">
                Online Social & AI Verification Platform
              </span>


              <span className="sm:hidden">
                EAZY DON CHECK
              </span>

            </span>

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
              lg:gap-3
              shrink-0
            "
          >

            {/* =================================================
                MESSAGES
            ================================================= */}

            <button
              type="button"
              onClick={
                handleMessagesClick
              }

              className="
                relative
                w-9
                h-9

                rounded-xl

                flex
                items-center
                justify-center

                text-slate-500
                dark:text-slate-400

                hover:text-brand-500
                hover:bg-brand-500/10

                transition

                focus:outline-none
                focus-visible:ring-2
                focus-visible:ring-brand-500/30
              "

              title="Messages"

              aria-label={
                safeUnreadMessages > 0
                  ? `Messages, ${safeUnreadMessages} unread`
                  : 'Messages'
              }
            >

              <MessageCircle
                className="
                  w-[18px]
                  h-[18px]
                "
              />


              {safeUnreadMessages > 0 && (

                <span
                  className="
                    absolute
                    -top-1
                    -right-1

                    min-w-[18px]
                    h-[18px]
                    px-1

                    rounded-full

                    bg-brand-600
                    text-white

                    text-[9px]
                    font-bold

                    flex
                    items-center
                    justify-center

                    border-2
                    border-white
                    dark:border-dark-card

                    leading-none
                  "
                >
                  {safeUnreadMessages > 99
                    ? '99+'
                    : safeUnreadMessages}
                </span>

              )}

            </button>


            {/* =================================================
                NOTIFICATIONS
            ================================================= */}

            <button
              type="button"
              onClick={
                handleNotificationsClick
              }

              className="
                relative
                w-9
                h-9

                rounded-xl

                flex
                items-center
                justify-center

                text-slate-500
                dark:text-slate-400

                hover:text-brand-500
                hover:bg-brand-500/10

                transition

                focus:outline-none
                focus-visible:ring-2
                focus-visible:ring-brand-500/30
              "

              title="Notifications"

              aria-label={
                safeUnreadNotifications > 0
                  ? `Notifications, ${safeUnreadNotifications} unread`
                  : 'Notifications'
              }
            >

              <Bell
                className="
                  w-[18px]
                  h-[18px]
                "
              />


              {safeUnreadNotifications > 0 && (

                <span
                  className="
                    absolute
                    -top-1
                    -right-1

                    min-w-[18px]
                    h-[18px]
                    px-1

                    rounded-full

                    bg-red-500
                    text-white

                    text-[9px]
                    font-bold

                    flex
                    items-center
                    justify-center

                    border-2
                    border-white
                    dark:border-dark-card

                    leading-none
                  "
                >
                  {safeUnreadNotifications > 99
                    ? '99+'
                    : safeUnreadNotifications}
                </span>

              )}

            </button>


            {/* =================================================
                SCAN QUOTA
            ================================================= */}

            <div
              className="
                hidden
                lg:flex
                items-center
                gap-2

                text-xs

                bg-slate-100
                dark:bg-dark-bg

                px-3
                py-1.5

                rounded-lg

                border
                border-slate-200
                dark:border-dark-border

                transition-colors
              "
            >

              <span
                className="
                  text-slate-500
                  dark:text-slate-400
                "
              >
                Scans:
              </span>


              <span
                className="
                  font-bold
                  text-slate-800
                  dark:text-slate-200
                "
              >

                {isUnlimited
                  ? 'Unlimited'
                  : `${scansUsed} / ${maxScans}`}

              </span>

            </div>


            {/* =================================================
                STAR RANK
            ================================================= */}

            <div
              className="
                hidden
                xl:flex
                items-center
                gap-1.5

                text-xs

                bg-amber-500/10
                text-amber-600
                dark:text-amber-400

                border
                border-amber-500/20

                px-3
                py-1.5

                rounded-lg

                font-semibold
              "
            >

              <Star
                className="
                  w-3.5
                  h-3.5
                  fill-amber-500
                  text-amber-500
                "
              />


              <span>
                {currentUser?.gamification?.starRank ||
                  currentUser?.starRank ||
                  'Novice'}
              </span>

            </div>


            {/* =================================================
                PROFILE
            ================================================= */}

            <div
              className="
                relative
                pl-1.5
                sm:pl-2

                border-l
                border-slate-200
                dark:border-dark-border
              "

              ref={dropdownRef}
            >

              <button
                type="button"

                onClick={() =>
                  setProfileDropdownOpen(
                    (previous) =>
                      !previous
                  )
                }

                className="
                  flex
                  items-center
                  gap-2
                  sm:gap-2.5

                  group

                  py-1
                  px-1.5
                  sm:px-2

                  rounded-lg

                  hover:bg-slate-100
                  dark:hover:bg-dark-bg/60

                  transition-colors

                  focus:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-brand-500/30
                "

                aria-expanded={
                  profileDropdownOpen
                }

                aria-haspopup="menu"

                aria-label="Open profile menu"
              >

                {/* AVATAR */}

                <div
                  className="
                    w-8
                    h-8
                    rounded-full

                    bg-brand-600
                    text-white

                    flex
                    items-center
                    justify-center

                    font-bold
                    text-xs

                    shadow-sm

                    overflow-hidden
                    shrink-0
                  "
                >

                  {avatarUrl ? (

                    <img
                      key={avatarKey}

                      src={avatarUrl}

                      alt={
                        currentUser?.name ||
                        'User avatar'
                      }

                      className="
                        w-full
                        h-full
                        object-cover
                        block
                      "

                      loading="eager"

                      decoding="async"

                      onError={(event) => {

                        console.error(
                          'Avatar failed to load:',
                          event.currentTarget.src
                        );

                        event.currentTarget.style.display =
                          'none';

                      }}
                    />

                  ) : (

                    currentUser?.name
                      ? userInitial
                      : (
                        <UserIcon
                          className="
                            w-4
                            h-4
                          "
                        />
                      )

                  )}

                </div>


                {/* NAME */}

                <div
                  className="
                    hidden
                    md:block
                    text-left
                  "
                >

                  <p
                    className="
                      text-xs
                      font-bold

                      text-slate-800
                      dark:text-slate-200

                      leading-tight

                      group-hover:text-brand-500

                      transition-colors

                      max-w-[120px]
                      truncate
                    "
                  >
                    {currentUser?.name ||
                      'Eazy User'}
                  </p>


                  <p
                    className="
                      text-[10px]
                      text-slate-500
                      dark:text-slate-400
                      truncate
                      max-w-[120px]
                    "
                  >
                    @{currentUser?.username ||
                      'user'}
                  </p>

                </div>


                <ChevronDown
                  className={`
                    w-3.5
                    h-3.5

                    text-slate-400

                    transition-transform
                    duration-200

                    ${
                      profileDropdownOpen
                        ? 'rotate-180'
                        : ''
                    }
                  `}
                />

              </button>


              {/* =================================================
                  PROFILE DROPDOWN
              ================================================= */}

              {profileDropdownOpen && (

                <div
                  className="
                    absolute
                    right-0
                    top-full
                    mt-2

                    w-56
                    max-w-[calc(100vw-1.5rem)]

                    bg-white
                    dark:bg-dark-card

                    border
                    border-slate-200
                    dark:border-dark-border

                    rounded-xl

                    shadow-xl

                    py-2

                    z-[100]
                  "

                  role="menu"
                >

                  {/* USER INFO */}

                  <div
                    className="
                      px-4
                      py-2

                      border-b
                      border-slate-100
                      dark:border-dark-border
                    "
                  >

                    <p
                      className="
                        text-xs
                        font-medium

                        text-slate-900
                        dark:text-white

                        truncate
                      "
                    >
                      {currentUser?.name ||
                        'Eazy User'}
                    </p>


                    <p
                      className="
                        text-[11px]
                        text-slate-500
                        dark:text-slate-400
                        truncate
                      "
                    >
                      @{currentUser?.username ||
                        'user'}
                    </p>

                  </div>


                  {/* ACTIONS */}

                  <div className="py-1">

                    {/* THEME */}

                    <div
                      className="
                        flex
                        items-center
                        justify-between

                        px-4
                        py-2

                        text-xs
                        font-medium

                        text-slate-700
                        dark:text-slate-300

                        hover:bg-slate-50
                        dark:hover:bg-dark-border/40

                        transition-colors
                      "
                    >

                      <span>
                        Theme Toggle
                      </span>


                      <ThemeToggle />

                    </div>


                    {/* PROFILE */}

                    <button
                      type="button"
                      onClick={
                        handleProfileClick
                      }

                      className="
                        w-full
                        flex
                        items-center
                        gap-2.5

                        px-4
                        py-2

                        text-xs
                        font-medium

                        text-slate-700
                        dark:text-slate-300

                        hover:bg-slate-50
                        dark:hover:bg-dark-border/40

                        transition-colors

                        text-left
                      "

                      role="menuitem"
                    >

                      <UserIcon
                        className="
                          w-4
                          h-4
                          text-slate-400
                        "
                      />

                      My Profile

                    </button>


                    {/* SETTINGS */}

                    <button
                      type="button"
                      onClick={
                        handleSettingsClick
                      }

                      className="
                        w-full
                        flex
                        items-center
                        gap-2.5

                        px-4
                        py-2

                        text-xs
                        font-medium

                        text-slate-700
                        dark:text-slate-300

                        hover:bg-slate-50
                        dark:hover:bg-dark-border/40

                        transition-colors

                        text-left
                      "

                      role="menuitem"
                    >

                      <Settings
                        className="
                          w-4
                          h-4
                          text-slate-400
                        "
                      />

                      Settings

                    </button>

                  </div>


                  {/* LOGOUT */}

                  <div
                    className="
                      pt-1

                      border-t
                      border-slate-100
                      dark:border-dark-border
                    "
                  >

                    <button
                      type="button"
                      onClick={
                        handleLogout
                      }

                      className="
                        w-full
                        flex
                        items-center
                        gap-2.5

                        px-4
                        py-2

                        text-xs
                        font-medium

                        text-red-600
                        dark:text-red-400

                        hover:bg-red-500/10

                        transition-colors

                        text-left
                      "

                      role="menuitem"
                    >

                      <LogOut
                        className="
                          w-4
                          h-4
                        "
                      />

                      Log Out

                    </button>

                  </div>

                </div>

              )}

            </div>

          </div>

        </header>


        {/* ====================================================
            SCROLLABLE PAGE AREA
        ==================================================== */}

        <main
          className="
            flex-1
            min-h-0
            min-w-0

            overflow-y-auto
            overflow-x-hidden

            bg-slate-50
            dark:bg-dark-bg

            transition-colors
            duration-200

            overscroll-contain

            touch-pan-y
          "
        >

          {children}

        </main>

      </div>

    </div>

  );

};


export default AppLayout;