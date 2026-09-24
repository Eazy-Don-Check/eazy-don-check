import React, {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  useAuth,
} from '../../context/AuthContext';

import apiClient from '../../utils/apiClient';

import {
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  Zap,
  MessageSquare,
  Users,
  Globe,
  Cpu,
  Briefcase,
  Music,
  Smile,
  Heart,
  BookOpen,
  Sparkles,
  Rss,
  Settings,
  FileCheck2,
  FilePlus2,
  History,
  MoreVertical,
  X,
} from 'lucide-react';

import ThemeToggle from '../common/ThemeToggle';


// ============================================================
// BRAND LOGO
// ============================================================

const LOGO_SRC =
  `${import.meta.env.BASE_URL}eazy-don-check-logo.png`;


// ============================================================
// COMPONENT
// ============================================================

const Sidebar = () => {

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    collapsed,
    setCollapsed,
  ] = useState(false);

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const [
    isChatRoomsOpen,
    setIsChatRoomsOpen,
  ] = useState(true);

  const [
    quota,
    setQuota,
  ] = useState(null);

  const [
    quotaLoading,
    setQuotaLoading,
  ] = useState(false);

  const [
    logoFailed,
    setLogoFailed,
  ] = useState(false);


  // ==========================================================
  // AUTH
  // ==========================================================

  const {
    user,
    isSuperAdmin,
    logout,
  } = useAuth();


  // ==========================================================
  // ROUTER
  // ==========================================================

  const location =
    useLocation();

  const navigate =
    useNavigate();


  // ==========================================================
  // MOBILE SIDEBAR
  // ==========================================================

  const closeMobileSidebar = () => {
    setMobileOpen(false);
  };


  const toggleMobileSidebar = () => {
    setMobileOpen(
      (previous) => !previous
    );
  };


  // ==========================================================
  // CLOSE MOBILE SIDEBAR WHEN ROUTE CHANGES
  // ==========================================================

  useEffect(() => {

    setMobileOpen(false);

  }, [
    location.pathname,
  ]);


  // ==========================================================
  // CLOSE MOBILE SIDEBAR WHEN SCREEN BECOMES DESKTOP
  // ==========================================================

  useEffect(() => {

    const handleResize = () => {

      if (
        window.innerWidth >= 768 &&
        mobileOpen
      ) {
        setMobileOpen(false);
      }

    };


    window.addEventListener(
      'resize',
      handleResize
    );


    return () => {

      window.removeEventListener(
        'resize',
        handleResize
      );

    };

  }, [
    mobileOpen,
  ]);


  // ==========================================================
  // PREVENT PAGE SCROLL WHILE MOBILE SIDEBAR IS OPEN
  // ==========================================================

  useEffect(() => {

    if (
      !mobileOpen ||
      window.innerWidth >= 768
    ) {
      document.body.style.overflow = '';
      return;
    }


    const previousOverflow =
      document.body.style.overflow;


    document.body.style.overflow =
      'hidden';


    return () => {

      document.body.style.overflow =
        previousOverflow;

    };

  }, [
    mobileOpen,
  ]);


  // ==========================================================
  // CLOSE MOBILE SIDEBAR WITH ESCAPE
  // ==========================================================

  useEffect(() => {

    const handleKeyDown = (event) => {

      if (
        event.key === 'Escape' &&
        mobileOpen
      ) {
        setMobileOpen(false);
      }

    };


    document.addEventListener(
      'keydown',
      handleKeyDown
    );


    return () => {

      document.removeEventListener(
        'keydown',
        handleKeyDown
      );

    };

  }, [
    mobileOpen,
  ]);


  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {

    closeMobileSidebar();

    logout();

    navigate('/login');

  };


  // ==========================================================
  // LOAD SUBSCRIPTION QUOTA
  // ==========================================================

  const loadQuota = async () => {

    if (!user) {

      setQuota(null);

      return;

    }


    // ========================================================
    // SUPER ADMIN
    // ========================================================

    if (
      isSuperAdmin ||
      user.role === 'superadmin'
    ) {

      setQuota({

        unlimited: true,

        plan: 'unlimited',

        subscriptionStatus:
          'active',

        scansUsed: 0,

        maxScans: -1,

        scansRemaining: -1,

        photosUsed: 0,

        maxPhotos: -1,

        photosRemaining: -1,

      });

      return;

    }


    // ========================================================
    // LOAD USER QUOTA
    // ========================================================

    try {

      setQuotaLoading(true);


      const response =
        await apiClient.get(
          '/subscription/quota'
        );


      const data =
        response?.data?.data ||
        response?.data ||
        {};


      setQuota(data);

    } catch (error) {

      console.error(
        'Failed to load subscription quota:',
        error
      );


      const scansUsed =
        user?.scansUsed ??
        user?.usage?.scans ??
        user?.usage?.scansThisMonth ??
        0;


      const maxScans =
        user?.maxScans ??
        user?.usage?.maxScans ??
        user?.usage?.maxScansAllowed ??
        5;


      const photosUsed =
        user?.photosUsed ??
        user?.usage?.photos ??
        0;


      const maxPhotos =
        user?.maxPhotos ??
        user?.usage?.maxPhotos ??
        5;


      setQuota({

        unlimited: false,

        plan:
          user?.subscription?.plan ||
          'free',

        subscriptionStatus:
          user?.subscription?.status ||
          'inactive',

        scansUsed,

        maxScans,

        scansRemaining:
          Math.max(
            0,
            maxScans - scansUsed
          ),

        photosUsed,

        maxPhotos,

        photosRemaining:
          Math.max(
            0,
            maxPhotos - photosUsed
          ),

      });

    } finally {

      setQuotaLoading(false);

    }

  };


  // ==========================================================
  // INITIAL QUOTA LOAD
  // ==========================================================

  useEffect(() => {

    loadQuota();

  }, [
    user?._id,
    user?.id,
    isSuperAdmin,
  ]);


  // ==========================================================
  // REFRESH QUOTA AFTER SUBSCRIPTION PAYMENT
  // ==========================================================

  useEffect(() => {

    const handleSubscriptionUpdate =
      () => {

        loadQuota();

      };


    window.addEventListener(
      'subscription:updated',
      handleSubscriptionUpdate
    );


    return () => {

      window.removeEventListener(
        'subscription:updated',
        handleSubscriptionUpdate
      );

    };

  }, [
    user?._id,
    user?.id,
    isSuperAdmin,
  ]);


  // ==========================================================
  // RESET LOGO ERROR
  // ==========================================================

  useEffect(() => {

    setLogoFailed(false);

  }, [
    LOGO_SRC,
  ]);


  // ==========================================================
  // CHAT ROOMS
  // ==========================================================

  const chatRoomItems = [

    {
      label: 'Global Lounge',
      path: '/chat/general',
      icon: Globe,
    },

    {
      label: 'Funny Room',
      path: '/chat/funny',
      icon: Smile,
    },

    {
      label: 'Dating Room',
      path: '/chat/dating',
      icon: Heart,
    },

    {
      label: 'Love Room',
      path: '/chat/love',
      icon: Heart,
    },

    {
      label: 'Music Room',
      path: '/chat/music',
      icon: Music,
    },

    {
      label: 'Tutorial Room',
      path: '/chat/tutorial',
      icon: BookOpen,
    },

    {
      label: 'Coders & Builders',
      path: '/chat/tech',
      icon: Cpu,
    },

    {
      label: 'Entrepreneurs & Print',
      path: '/chat/business',
      icon: Briefcase,
    },

  ];


  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const navSections = [

    {
      title: 'Main Workspace',

      items: [

        {
          label: 'Feed',
          path: '/feed',
          icon: Rss,

          roles: [
            'user',
            'superadmin',
          ],
        },

        {
          label: 'Dashboard',
          path: '/dashboard',
          icon: LayoutDashboard,

          roles: [
            'user',
            'superadmin',
          ],
        },

        {
          label: 'Receipt Verification',
          path: '/verify',
          icon: FileCheck2,

          roles: [
            'user',
            'superadmin',
          ],
        },

        {
          label: 'Photo Enhancer',
          path: '/photo-enhancer',
          icon: Sparkles,

          roles: [
            'user',
            'superadmin',
          ],
        },

      ],
    },


    {
      title: 'Invoicing',

      items: [

        {
          label: 'Invoice Generator',
          path: '/invoice-generator',
          icon: FilePlus2,

          roles: [
            'user',
            'superadmin',
          ],
        },

        {
          label: 'Invoice History',
          path: '/invoice-history',
          icon: History,

          roles: [
            'user',
            'superadmin',
          ],
        },

      ],
    },


    {
      title: 'Community & Chat',

      items: [

        {
          label: 'Direct Messages',
          path: '/messages',
          icon: MessageSquare,

          roles: [
            'user',
            'superadmin',
          ],
        },

      ],
    },


    {
      title: 'Administration',

      items: [

        {
          label: 'Admin Panel',
          path: '/admin',
          icon: ShieldCheck,

          roles: [
            'superadmin',
          ],
        },

      ],
    },

  ];


  // ==========================================================
  // QUOTA DISPLAY
  // ==========================================================

  const renderQuota = () => {

    if (
      isSuperAdmin ||
      user?.role === 'superadmin' ||
      quota?.unlimited
    ) {

      return 'Unlimited';

    }


    if (
      quotaLoading &&
      !quota
    ) {

      return 'Loading...';

    }


    const used =
      quota?.scansUsed ??
      user?.scansUsed ??
      user?.usage?.scans ??
      user?.usage?.scansThisMonth ??
      0;


    const limit =
      quota?.maxScans ??
      user?.maxScans ??
      user?.usage?.maxScans ??
      user?.usage?.maxScansAllowed ??
      5;


    return `${used} / ${limit}`;

  };


  // ==========================================================
  // NAVIGATION ITEM RENDERER
  // ==========================================================

  const renderNavItem = (
    item
  ) => {

    const Icon =
      item.icon;


    const isActive =
      location.pathname ===
      item.path;


    return (

      <Link
        key={item.path}
        to={item.path}
        onClick={closeMobileSidebar}

        className={`
          flex
          items-center
          gap-3
          px-3
          py-2.5
          rounded-lg
          text-xs
          font-semibold
          transition-colors
          min-h-[40px]

          ${
            isActive

              ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'

              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-bg/50 hover:text-slate-900 dark:hover:text-slate-200'
          }
        `}

        title={
          collapsed
            ? item.label
            : undefined
        }
      >

        <Icon
          className="
            w-4
            h-4
            shrink-0
          "
        />


        {!collapsed && (

          <span
            className="truncate"
          >
            {item.label}
          </span>

        )}

      </Link>

    );

  };


  // ==========================================================
  // DIRECT MESSAGES
  // ==========================================================

  const renderDirectMessages = () => {

    const item =
      navSections[2].items[0];

    const Icon =
      item.icon;

    const isActive =
      location.pathname ===
      item.path;


    return (

      <Link
        to={item.path}
        onClick={closeMobileSidebar}

        className={`
          flex
          items-center
          gap-3
          px-3
          py-2.5
          rounded-lg
          text-xs
          font-semibold
          transition-colors
          min-h-[40px]

          ${
            isActive

              ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'

              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-bg/50 hover:text-slate-900 dark:hover:text-slate-200'
          }
        `}

        title={
          collapsed
            ? item.label
            : undefined
        }
      >

        <Icon
          className="
            w-4
            h-4
            shrink-0
          "
        />


        {!collapsed && (

          <span className="truncate">
            {item.label}
          </span>

        )}

      </Link>

    );

  };


  // ==========================================================
  // SIDEBAR CONTENT
  // ==========================================================

  const sidebarContent = (

    <>

      {/* ====================================================
          TOP HEADER / BRAND
      ==================================================== */}

      <div
        className="
          relative
          p-3
          border-b
          border-slate-200
          dark:border-dark-border
          bg-white
          dark:bg-dark-card
          shrink-0
          space-y-3
          transition-colors
        "
      >

        <Link
          to="/feed"
          onClick={closeMobileSidebar}

          className="
            flex
            items-center
            gap-3
            px-1
            pr-12
            min-w-0
            min-h-[48px]
          "
        >

          {/* ==================================================
              LOGO
          ================================================== */}

          <div
            className="
              w-12
              h-12
              rounded-xl
              bg-white
              border
              border-slate-200
              flex
              items-center
              justify-center
              shrink-0
              overflow-hidden
              shadow-sm
            "
          >

            {!logoFailed ? (

              <img
                src={LOGO_SRC}
                alt="EAZY DON CHECK"

                className="
                  w-full
                  h-full
                  object-contain
                  p-1
                  bg-white
                  block
                "

                draggable="false"

                loading="eager"

                decoding="async"

                onError={(event) => {

                  console.error(
                    'EAZY DON CHECK Sidebar logo failed to load:',
                    event.currentTarget.src
                  );

                  setLogoFailed(true);

                }}
              />

            ) : (

              <div
                className="
                  w-full
                  h-full
                  flex
                  items-center
                  justify-center
                  bg-white
                "
              >

                <ShieldCheck
                  className="
                    w-6
                    h-6
                    text-brand-500
                  "
                />

              </div>

            )}

          </div>


          {!collapsed && (

            <div
              className="
                flex
                flex-col
                truncate
                min-w-0
              "
            >

              <span
                className="
                  font-bold
                  text-base
                  text-slate-900
                  dark:text-white
                  tracking-tight
                  leading-none
                  truncate
                "
              >
                EAZY DON CHECK
              </span>


              <span
                className="
                  text-[10px]
                  text-slate-500
                  dark:text-slate-400
                  font-medium
                  mt-1
                  truncate
                "
              >
                Receipt Verification
              </span>

            </div>

          )}

        </Link>


        {/* ==================================================
            SINGLE MOBILE CLOSE BUTTON
        ================================================== */}

        <button
          type="button"

          onClick={
            closeMobileSidebar
          }

          className="
            md:hidden
            absolute
            top-3
            right-3
            w-9
            h-9
            rounded-lg
            bg-slate-100
            dark:bg-dark-bg
            border
            border-slate-200
            dark:border-dark-border
            text-slate-600
            dark:text-slate-300
            hover:bg-slate-200
            dark:hover:bg-dark-border
            hover:text-slate-900
            dark:hover:text-white
            flex
            items-center
            justify-center
            transition-colors
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-brand-500/40
            z-10
          "

          aria-label="Close navigation sidebar"
        >

          <X
            className="
              w-5
              h-5
            "
          />

        </button>


        {/* ==================================================
            USER QUOTA
        ================================================== */}

        {!collapsed && user && (

          <div
            className="
              p-2.5
              bg-slate-100
              dark:bg-dark-bg/60
              border
              border-slate-200
              dark:border-dark-border
              rounded-xl
              space-y-1.5
              transition-colors
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                text-xs
                text-slate-600
                dark:text-slate-400
              "
            >

              <span
                className="
                  flex
                  items-center
                  gap-1
                  font-medium
                "
              >

                <Zap
                  className="
                    w-3.5
                    h-3.5
                    text-amber-500
                    dark:text-amber-400
                  "
                />

                Quota

              </span>


              <span
                className="
                  font-semibold
                  text-slate-900
                  dark:text-white
                "
              >
                {renderQuota()}
              </span>

            </div>


            {!isSuperAdmin &&
              user.role !== 'superadmin' &&
              quota && (

                <Link
                  to="/subscription"
                  onClick={closeMobileSidebar}

                  className="
                    flex
                    items-center
                    justify-between
                    text-[10px]
                    font-semibold
                    text-brand-600
                    dark:text-brand-400
                    hover:text-brand-700
                    dark:hover:text-brand-300
                    transition-colors
                  "
                >

                  <span className="capitalize">
                    {quota.plan || 'free'} plan
                  </span>


                  <span>
                    Manage Subscription →
                  </span>

                </Link>

              )}

          </div>

        )}

      </div>


      {/* ====================================================
          SCROLLABLE NAVIGATION

          IMPORTANT:
          min-h-0 allows this section to shrink properly on
          mobile instead of pushing the footer outside the
          viewport.
      ==================================================== */}

      <div
        className="
          flex-1
          min-h-0
          p-3
          sm:p-4
          space-y-5
          overflow-y-auto
          overflow-x-hidden
          overscroll-contain
          scrollbar-thin
          touch-pan-y
        "
      >

        <nav
          className="
            space-y-5
            pb-3
          "
        >

          {/* ==================================================
              MAIN WORKSPACE
          ================================================== */}

          <div className="space-y-1">

            {!collapsed && (

              <p
                className="
                  px-3
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-400
                  dark:text-slate-500
                  mb-1
                "
              >
                Main Workspace
              </p>

            )}


            {navSections[0].items.map(
              renderNavItem
            )}

          </div>


          {/* ==================================================
              INVOICING
          ================================================== */}

          <div className="space-y-1">

            {!collapsed && (

              <p
                className="
                  px-3
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-400
                  dark:text-slate-500
                  mb-1
                "
              >
                Invoicing
              </p>

            )}


            {navSections[1].items.map(
              renderNavItem
            )}

          </div>


          {/* ==================================================
              COMMUNITY & CHAT
          ================================================== */}

          <div className="space-y-1">

            {!collapsed && (

              <p
                className="
                  px-3
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-400
                  dark:text-slate-500
                  mb-1
                "
              >
                Community & Chat
              </p>

            )}


            {/* =================================================
                DIRECT MESSAGES
            ================================================= */}

            {renderDirectMessages()}


            {/* =================================================
                ALL CHAT ROOMS
            ================================================= */}

            <div className="pt-1">

              <div
                className="
                  flex
                  items-center
                "
              >

                <Link
                  to="/chat"
                  onClick={closeMobileSidebar}

                  className={` 
                    flex-1
                    flex
                    items-center
                    gap-3
                    px-3
                    py-2.5
                    rounded-l-lg
                    min-h-[40px]
                    text-xs
                    font-semibold
                    transition-colors

                    ${
                      location.pathname ===
                      '/chat'

                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/25 border-r-0'

                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-bg/50 hover:text-slate-900 dark:hover:text-slate-200'
                    }
                  `}
                >

                  <Users
                    className="
                      w-4
                      h-4
                      shrink-0
                    "
                  />


                  {!collapsed && (

                    <span className="truncate">
                      All Chat Rooms
                    </span>

                  )}

                </Link>


                {!collapsed && (

                  <button
                    type="button"

                    onClick={() =>
                      setIsChatRoomsOpen(
                        (previous) =>
                          !previous
                      )
                    }

                    className={` 
                      px-2.5
                      py-3
                      min-h-[40px]
                      rounded-r-lg
                      text-xs
                      transition-colors
                      border
                      border-l-0

                      ${
                        location.pathname.startsWith(
                          '/chat/'
                        ) ||
                        location.pathname ===
                          '/chat'

                          ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/25'

                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-bg/50 border-slate-200 dark:border-dark-border'
                      }
                    `}

                    aria-label="Toggle Chat Rooms"

                    aria-expanded={
                      isChatRoomsOpen
                    }
                  >

                    <ChevronDown
                      className={` 
                        w-3.5
                        h-3.5
                        transition-transform
                        duration-200

                        ${
                          isChatRoomsOpen
                            ? 'rotate-180'
                            : ''
                        }
                      `}
                    />

                  </button>

                )}

              </div>


              {/* =================================================
                  CHAT ROOM LIST
              ================================================= */}

              {!collapsed &&
                isChatRoomsOpen && (

                  <div
                    className="
                      ml-4
                      pl-3
                      mt-1
                      space-y-1
                      border-l-2
                      border-slate-200
                      dark:border-dark-border/80
                    "
                  >

                    {chatRoomItems.map(
                      (room) => {

                        const RoomIcon =
                          room.icon;

                        const isRoomActive =
                          location.pathname ===
                          room.path;


                        return (

                          <Link
                            key={room.path}
                            to={room.path}
                            onClick={
                              closeMobileSidebar
                            }

                            className={` 
                              flex
                              items-center
                              gap-2.5
                              px-2.5
                              py-2
                              min-h-[36px]
                              rounded-md
                              text-[11px]
                              font-medium
                              transition-colors

                              ${
                                isRoomActive

                                  ? 'text-brand-600 dark:text-brand-400 font-semibold bg-brand-500/10'

                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-bg/40'
                              }
                            `}
                          >

                            <RoomIcon
                              className="
                                w-3.5
                                h-3.5
                                shrink-0
                              "
                            />


                            <span
                              className="truncate"
                            >
                              {room.label}
                            </span>

                          </Link>

                        );

                      }
                    )}

                  </div>

                )}

            </div>

          </div>


          {/* ==================================================
              ADMINISTRATION
          ================================================== */}

          {isSuperAdmin && (

            <div className="space-y-1">

              {!collapsed && (

                <p
                  className="
                    px-3
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-slate-400
                    dark:text-slate-500
                    mb-1
                  "
                >
                  Administration
                </p>

              )}


              {navSections[3].items.map(
                (item) => {

                  const Icon =
                    item.icon;

                  const isActive =
                    location.pathname ===
                    item.path;


                  return (

                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={
                        closeMobileSidebar
                      }

                      className={` 
                        flex
                        items-center
                        gap-3
                        px-3
                        py-2.5
                        min-h-[40px]
                        rounded-lg
                        text-xs
                        font-semibold
                        transition-colors

                        ${
                          isActive

                            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'

                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-bg/50 hover:text-slate-900 dark:hover:text-slate-200'
                        }
                      `}
                    >

                      <Icon
                        className="
                          w-4
                          h-4
                          shrink-0
                        "
                      />


                      {!collapsed && (

                        <span className="truncate">
                          {item.label}
                        </span>

                      )}

                    </Link>

                  );

                }
              )}

            </div>

          )}

        </nav>

      </div>


      {/* ====================================================
          BOTTOM SECTION / FOOTER

          IMPORTANT MOBILE FIX:
          This section is shrink-0 and remains outside the
          scrollable navigation.

          100dvh + min-h-0 on the parent sidebar ensures this
          footer remains inside the real mobile viewport.
      ==================================================== */}

      <div
        className="
          flex-shrink-0
          w-full
          px-2.5
          pt-2
          pb-2
          md:pb-2
          border-t
          border-slate-200
          dark:border-dark-border
          space-y-1
          transition-colors
          bg-white
          dark:bg-dark-card
          safe-area-bottom
        "
        style={{
          paddingBottom:
            'max(0.5rem, env(safe-area-inset-bottom))',
        }}
      >

        {/* ==================================================
            THEME
        ================================================== */}

        <div
          className={` 
            flex
            items-center
            h-8

            ${
              collapsed
                ? 'justify-center'
                : 'justify-between px-2'
            }
          `}
        >

          {!collapsed && (

            <span
              className="
                text-[10px]
                font-medium
                text-slate-500
                dark:text-slate-400
              "
            >
              Theme
            </span>

          )}


          <ThemeToggle />

        </div>


        {/* ==================================================
            SETTINGS
        ================================================== */}

        <Link
          to="/settings"
          onClick={closeMobileSidebar}

          className={` 
            w-full
            flex
            items-center
            gap-2.5
            px-2.5
            py-1.5
            min-h-[34px]
            rounded-md
            text-[11px]
            font-semibold
            transition-colors

            ${
              location.pathname ===
              '/settings'

                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'

                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-bg/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
            }
          `}
        >

          <Settings
            className="
              w-3.5
              h-3.5
              shrink-0
            "
          />


          {!collapsed && (

            <span className="truncate">
              Settings
            </span>

          )}

        </Link>


        {/* ==================================================
            USER PROFILE
        ================================================== */}

        {user && (

          <Link
            to="/profile"
            onClick={closeMobileSidebar}

            className="
              flex
              items-center
              gap-2.5
              px-2
              py-1
              min-h-[34px]
              rounded-md
              hover:bg-slate-100
              dark:hover:bg-dark-bg/50
              transition-colors
              truncate
              group
            "
          >

            <div
              className="
                w-6
                h-6
                rounded-full
                bg-slate-200
                dark:bg-slate-800
                border
                border-slate-300
                dark:border-dark-border
                flex
                items-center
                justify-center
                text-slate-700
                dark:text-slate-300
                font-bold
                text-[10px]
                shrink-0
                overflow-hidden
              "
            >

              {(
                user.avatarUrl ||
                user.avatar ||
                user.profilePicture ||
                user.profilePhoto ||
                user.photoUrl
              ) ? (

                <img
                  src={
                    user.avatarUrl ||
                    user.avatar ||
                    user.profilePicture ||
                    user.profilePhoto ||
                    user.photoUrl
                  }

                  alt={
                    user.name ||
                    'User'
                  }

                  className="
                    w-full
                    h-full
                    object-cover
                  "

                  onError={(event) => {

                    event.currentTarget.style.display =
                      'none';

                  }}
                />

              ) : (

                user.name ? (

                  user.name
                    .charAt(0)
                    .toUpperCase()

                ) : (

                  <User
                    className="
                      w-3.5
                      h-3.5
                    "
                  />

                )

              )}

            </div>


            {!collapsed && (

              <div
                className="
                  flex
                  flex-col
                  truncate
                  leading-tight
                "
              >

                <span
                  className="
                    text-[11px]
                    font-semibold
                    text-slate-900
                    dark:text-white
                    truncate
                    group-hover:text-brand-600
                    dark:group-hover:text-brand-400
                    transition-colors
                  "
                >
                  {user.name ||
                    'Eazy User'}
                </span>


                <span
                  className="
                    text-[8px]
                    text-slate-500
                    dark:text-slate-400
                    truncate
                  "
                >
                  View Profile
                </span>

              </div>

            )}

          </Link>

        )}


        {/* ==================================================
            LOGOUT
        ================================================== */}

        <button
          type="button"
          onClick={handleLogout}

          className="
            w-full
            flex
            items-center
            gap-2.5
            px-2.5
            py-1.5
            min-h-[34px]
            rounded-md
            text-[11px]
            font-semibold
            text-red-600
            dark:text-red-400
            hover:bg-red-500/10
            border
            border-transparent
            hover:border-red-500/20
            transition-colors
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-red-500/30
          "
        >

          <LogOut
            className="
              w-3.5
              h-3.5
              shrink-0
            "
          />


          {!collapsed && (

            <span className="truncate">
              Log Out
            </span>

          )}

        </button>

      </div>

    </>

  );


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <>

      {/* ======================================================
          MOBILE 3-DOT MENU

          Replaced the old hamburger icon with a vertical
          three-dot menu.

          It disappears while the drawer is open because the
          drawer has its own X close button.
      ====================================================== */}

      {!mobileOpen && (

        <button
          type="button"

          onClick={
            toggleMobileSidebar
          }

          className="
            md:hidden
            fixed
            top-3
            left-3
            z-[80]
            w-11
            h-11
            rounded-xl
            bg-white
            dark:bg-dark-card
            border
            border-slate-200
            dark:border-dark-border
            text-slate-700
            dark:text-slate-200
            shadow-lg
            flex
            items-center
            justify-center
            transition-all
            duration-200
            hover:bg-slate-50
            dark:hover:bg-dark-bg
            active:scale-95
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-brand-500/40
          "

          aria-label="Open navigation menu"

          aria-expanded="false"
        >

          <MoreVertical
            className="
              w-5
              h-5
            "
          />

        </button>

      )}


      {/* ======================================================
          MOBILE BACKDROP
      ====================================================== */}

      {mobileOpen && (

        <button
          type="button"

          aria-label="Close navigation menu"

          onClick={
            closeMobileSidebar
          }

          className="
            md:hidden
            fixed
            inset-0
            z-[50]
            bg-slate-950/50
            backdrop-blur-[2px]
            cursor-default
            animate-in
            fade-in
            duration-200
          "
        />

      )}


      {/* ======================================================
          SIDEBAR

          MOBILE:
          - Uses 100dvh instead of h-screen.
          - min-h-0 allows the navigation to shrink.
          - Footer remains visible inside the viewport.

          DESKTOP:
          - Existing sticky/collapsible behavior preserved.
      ====================================================== */}

      <aside
        id="eazy-don-check-sidebar"

        className={`
          fixed
          inset-y-0
          left-0

          h-[100dvh]
          min-h-0
          w-[min(86vw,20rem)]

          bg-white
          dark:bg-dark-card

          border-r
          border-slate-200
          dark:border-dark-border

          flex
          flex-col
          min-h-0

          transition-transform
          duration-300
          ease-out

          z-[60]
          shrink-0

          ${
            mobileOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }

          shadow-2xl

          md:sticky
          md:top-0
          md:translate-x-0
          md:h-screen
          md:shadow-none
          md:transition-[width]
          md:duration-300

          ${
            collapsed
              ? 'md:w-20'
              : 'md:w-64'
          }
        `}
      >

        {/* ==================================================
            DESKTOP COLLAPSE BUTTON
        ================================================== */}

        <button
          type="button"

          onClick={() =>
            setCollapsed(
              (previous) =>
                !previous
            )
          }

          className="
            hidden
            md:flex
            absolute
            -right-3
            top-8
            bg-white
            dark:bg-dark-card
            border
            border-slate-200
            dark:border-dark-border
            text-slate-500
            dark:text-slate-400
            hover:text-slate-900
            dark:hover:text-white
            p-1
            rounded-full
            shadow-md
            transition-colors
            z-40
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-brand-500/40
          "

          aria-label={
            collapsed
              ? 'Expand Sidebar'
              : 'Collapse Sidebar'
          }
        >

          {collapsed ? (

            <ChevronRight
              className="
                w-4
                h-4
              "
            />

          ) : (

            <ChevronLeft
              className="
                w-4
                h-4
              "
            />

          )}

        </button>


        {sidebarContent}

      </aside>

    </>

  );

};


export default Sidebar;