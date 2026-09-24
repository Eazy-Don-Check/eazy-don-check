import React from 'react';

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  Heart,
  MessageCircle,
  Music,
  ShieldCheck,
  Smile,
  Star,
  Users,
  Zap,
} from 'lucide-react';

import { Link } from 'react-router-dom';

import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

import { useAuth } from '../context/AuthContext';


// ============================================================
// BRAND LOGO
// ============================================================

const LOGO_SRC = '/eazy-don-check-logo.png';


// ============================================================
// CHAT ROOMS
// ============================================================

const chatRooms = [
  {
    name: 'Global Lounge',
    description:
      'Meet people, connect and have conversations.',
    icon: Users,
    category: 'social',
    slug: 'general',
  },
  {
    name: 'Funny',
    description:
      'Jokes, entertainment, memes and fun conversations.',
    icon: Smile,
    category: 'entertainment',
    slug: 'funny',
  },
  {
    name: 'Dating',
    description:
      'Connect, chat and build meaningful relationships.',
    icon: MessageCircle,
    category: 'dating',
    slug: 'dating',
  },
  {
    name: 'Love',
    description:
      'Talk about love, relationships and life.',
    icon: Heart,
    category: 'romance',
    slug: 'love',
  },
  {
    name: 'Music',
    description:
      'Share music, artists, songs and entertainment.',
    icon: Music,
    category: 'entertainment',
    slug: 'music',
  },
  {
    name: 'Tutorial',
    description:
      'Learn, teach and exchange useful knowledge.',
    icon: Zap,
    category: 'education',
    slug: 'tutorial',
  },
  {
    name: 'Coders & Builders',
    description:
      'Technology, coding, AI and digital projects.',
    icon: Bot,
    category: 'technology',
    slug: 'tech',
  },
  {
    name: 'Entrepreneurs & Print',
    description:
      'Business, printing, design and entrepreneurship.',
    icon: FileCheck2,
    category: 'business',
    slug: 'business',
  },
];


// ============================================================
// FEATURES
// ============================================================

const features = [
  {
    icon: MessageCircle,
    title: 'Community & Chat',
    description:
      'Join conversations, chat with other members and discover active community rooms.',
  },
  {
    icon: Users,
    title: 'Profiles & Connections',
    description:
      'Create your profile, connect with people, discover friends and grow your network.',
  },
  {
    icon: FileCheck2,
    title: 'Receipt Verification',
    description:
      'Use EAZY DON CHECK to extract and verify important information from receipts.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Platform',
    description:
      'Your account and application data are protected with secure authentication and controlled access.',
  },
];


// ============================================================
// HOME
// ============================================================

function Home() {
  const { user } = useAuth();

  const isAuthenticated = Boolean(user);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-dark-bg dark:text-white">

      <Navbar />


      {/* ======================================================
          HERO
      ====================================================== */}

      <main>

        <section
          className="
            relative
            overflow-hidden
            border-b
            border-slate-200
            bg-gradient-to-br
            from-white
            via-slate-50
            to-brand-50/40
            dark:border-dark-border
            dark:from-dark-bg
            dark:via-dark-bg
            dark:to-dark-card
          "
        >

          {/* BACKGROUND EFFECTS */}

          <div className="pointer-events-none absolute inset-0">

            <div
              className="
                absolute
                -left-32
                -top-32
                h-80
                w-80
                rounded-full
                bg-brand-500/10
                blur-3xl
              "
            />

            <div
              className="
                absolute
                -right-32
                top-20
                h-96
                w-96
                rounded-full
                bg-blue-500/10
                blur-3xl
              "
            />

          </div>


          <div
            className="
              relative
              mx-auto
              max-w-7xl
              px-4
              py-14
              sm:px-6
              sm:py-18
              lg:px-8
              lg:py-24
            "
          >

            <div
              className="
                grid
                items-center
                gap-12
                lg:grid-cols-2
                lg:gap-16
              "
            >

              {/* ==================================================
                  HERO CONTENT
              ================================================== */}

              <div>

                {/* BRAND BADGE */}

                <div
                  className="
                    mb-6
                    inline-flex
                    max-w-full
                    flex-wrap
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-brand-200
                    bg-brand-50
                    px-3.5
                    py-1.5
                    text-[11px]
                    font-bold
                    tracking-[0.02em]
                    text-brand-700
                    dark:border-brand-500/20
                    dark:bg-brand-500/10
                    dark:text-brand-400
                  "
                >

                  {/* LOGO CARD */}

                  <div
                    className="
                      flex
                      h-6
                      w-6
                      shrink-0
                      items-center
                      justify-center
                      overflow-hidden
                      rounded-md
                      border
                      border-slate-200
                      bg-white
                      shadow-sm
                      dark:border-slate-200
                      dark:bg-white
                    "
                  >

                    <img
                      src={LOGO_SRC}
                      alt="EAZY DON CHECK"
                      className="
                        block
                        h-full
                        w-full
                        object-contain
                        p-0.5
                      "
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />

                  </div>


                  <span>
                    EAZY DON CHECK
                  </span>

                  <span className="h-1 w-1 shrink-0 rounded-full bg-current" />

                  <span className="font-medium">
                    Smart Verification & Social Community Platform
                  </span>

                </div>


                {/* HEADING */}

                <h1
                  className="
                    max-w-2xl
                    text-[2.15rem]
                    font-extrabold
                    leading-[1.05]
                    tracking-[-0.045em]
                    text-slate-950
                    sm:text-5xl
                    lg:text-[3.35rem]
                    dark:text-white
                  "
                >

                  Connect, Chat &

                  <span
                    className="
                      mt-1
                      block
                      bg-gradient-to-r
                      from-brand-600
                      to-brand-500
                      bg-clip-text
                      text-brand-600
                      dark:from-brand-400
                      dark:to-brand-300
                      dark:text-brand-400
                    "
                  >
                    Verify with EAZY DON CHECK
                  </span>

                </h1>


                {/* DESCRIPTION */}

                <p
                  className="
                    mt-5
                    max-w-xl
                    text-[15px]
                    leading-7
                    text-slate-600
                    dark:text-slate-300
                  "
                >
                  A smart digital platform where you can connect with
                  people and loved ones, join community conversations,
                  build relationships and use intelligent receipt
                  verification tools in one secure place.
                </p>


                {/* ACTION BUTTONS */}

                <div
                  className="
                    mt-7
                    flex
                    flex-col
                    gap-3
                    sm:flex-row
                  "
                >

                  {isAuthenticated ? (

                    <Link
                      to="/feed"
                      className="
                        inline-flex
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        bg-brand-600
                        px-5
                        py-3
                        text-sm
                        font-bold
                        text-white
                        shadow-lg
                        shadow-brand-600/20
                        transition
                        hover:bg-brand-700
                      "
                    >
                      Open My Feed

                      <ArrowRight className="h-4 w-4" />

                    </Link>

                  ) : (

                    <Link
                      to="/signup"
                      className="
                        inline-flex
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        bg-brand-600
                        px-5
                        py-3
                        text-sm
                        font-bold
                        text-white
                        shadow-lg
                        shadow-brand-600/20
                        transition
                        hover:bg-brand-700
                      "
                    >
                      Get Started Free

                      <ArrowRight className="h-4 w-4" />

                    </Link>

                  )}


                  <Link
                    to={
                      isAuthenticated
                        ? '/verify'
                        : '/login'
                    }
                    className="
                      inline-flex
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-slate-300
                      bg-white
                      px-5
                      py-3
                      text-sm
                      font-bold
                      text-slate-800
                      transition
                      hover:border-brand-400
                      hover:text-brand-600
                      dark:border-dark-border
                      dark:bg-dark-card
                      dark:text-white
                      dark:hover:border-brand-500
                      dark:hover:text-brand-400
                    "
                  >

                    <FileCheck2 className="h-4 w-4" />

                    {isAuthenticated
                      ? 'Verify Receipt'
                      : 'Sign In to Verify'}

                  </Link>

                </div>


                {/* BENEFITS */}

                <div
                  className="
                    mt-7
                    flex
                    flex-wrap
                    items-center
                    gap-x-5
                    gap-y-2.5
                    text-xs
                    font-medium
                    text-slate-600
                    dark:text-slate-400
                  "
                >

                  <div className="flex items-center gap-1.5">

                    <CheckCircle2
                      className="h-4 w-4 text-green-500"
                    />

                    Secure account access

                  </div>


                  <div className="flex items-center gap-1.5">

                    <CheckCircle2
                      className="h-4 w-4 text-green-500"
                    />

                    Social chat rooms

                  </div>


                  <div className="flex items-center gap-1.5">

                    <CheckCircle2
                      className="h-4 w-4 text-green-500"
                    />

                    AI-powered verification

                  </div>

                </div>

              </div>


              {/* ==================================================
                  HERO CARD
              ================================================== */}

              <div className="relative mx-auto w-full max-w-xl">

                <div
                  className="
                    rounded-3xl
                    border
                    border-slate-200
                    bg-white
                    p-3
                    shadow-2xl
                    shadow-slate-900/10
                    dark:border-dark-border
                    dark:bg-dark-card
                  "
                >

                  <div
                    className="
                      rounded-2xl
                      bg-slate-950
                      p-5
                      text-white
                      sm:p-6
                    "
                  >

                    {/* CARD BRAND HEADER */}

                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-3">

                        {/* LOGO CARD */}

                        <div
                          className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            overflow-hidden
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            p-1
                            shadow-sm
                            dark:border-slate-200
                            dark:bg-white
                          "
                        >

                          <img
                            src={LOGO_SRC}
                            alt="EAZY DON CHECK"
                            className="
                              block
                              h-full
                              w-full
                              object-contain
                            "
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />

                        </div>


                        <div>

                          <p className="text-sm font-bold tracking-[-0.01em]">
                            EAZY DON CHECK
                          </p>

                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Smart digital workspace
                          </p>

                        </div>

                      </div>


                      <div
                        className="
                          rounded-full
                          bg-green-500/10
                          px-2.5
                          py-1
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-wider
                          text-green-400
                        "
                      >
                        Online
                      </div>

                    </div>


                    {/* VERIFICATION CARD */}

                    <div
                      className="
                        mt-6
                        rounded-2xl
                        border
                        border-white/10
                        bg-white/5
                        p-4
                      "
                    >

                      <div className="flex items-center gap-3">

                        <div
                          className="
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-brand-500/20
                          "
                        >

                          <Bot
                            className="
                              h-[18px]
                              w-[18px]
                              text-brand-400
                            "
                          />

                        </div>


                        <div>

                          <p className="text-sm font-semibold tracking-[-0.01em]">
                            AI Receipt Verification
                          </p>

                          <p className="mt-0.5 text-[11px] leading-5 text-slate-400">
                            Extract, analyze and verify receipt information
                          </p>

                        </div>

                      </div>


                      <div className="mt-4 space-y-2.5">

                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            rounded-xl
                            bg-white/5
                            px-3.5
                            py-2.5
                          "
                        >

                          <span className="text-xs text-slate-300">
                            Receipt analysis
                          </span>

                          <CheckCircle2
                            className="h-[18px] w-[18px] text-green-400"
                          />

                        </div>


                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            rounded-xl
                            bg-white/5
                            px-3.5
                            py-2.5
                          "
                        >

                          <span className="text-xs text-slate-300">
                            Social access
                          </span>

                          <CheckCircle2
                            className="h-[18px] w-[18px] text-green-400"
                          />

                        </div>


                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            rounded-xl
                            bg-white/5
                            px-3.5
                            py-2.5
                          "
                        >

                          <span className="text-xs text-slate-300">
                            Secure authentication
                          </span>

                          <CheckCircle2
                            className="h-[18px] w-[18px] text-green-400"
                          />

                        </div>

                      </div>

                    </div>


                    {/* SERVICE CARDS */}

                    <div className="mt-4 grid grid-cols-2 gap-2.5">

                      <div className="rounded-xl bg-white/5 p-3.5">

                        <MessageCircle
                          className="
                            mb-2
                            h-[18px]
                            w-[18px]
                            text-brand-400
                          "
                        />

                        <p className="text-xs font-semibold">
                          Social
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          Chat & connect
                        </p>

                      </div>


                      <div className="rounded-xl bg-white/5 p-3.5">

                        <FileCheck2
                          className="
                            mb-2
                            h-[18px]
                            w-[18px]
                            text-brand-400
                          "
                        />

                        <p className="text-xs font-semibold">
                          Verification
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          Smart receipt tools
                        </p>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* ======================================================
            FEATURES
        ====================================================== */}

        <section
          className="
            bg-white
            py-14
            dark:bg-dark-bg
            sm:py-18
          "
        >

          <div
            className="
              mx-auto
              max-w-7xl
              px-4
              sm:px-6
              lg:px-8
            "
          >

            <div className="mx-auto max-w-2xl text-center">

              <span
                className="
                  text-[11px]
                  font-bold
                  uppercase
                  tracking-[0.14em]
                  text-brand-600
                  dark:text-brand-400
                "
              >
                One platform
              </span>


              <h2
                className="
                  mt-2.5
                  text-2xl
                  font-extrabold
                  leading-tight
                  tracking-[-0.035em]
                  sm:text-3xl
                "
              >
                More than Just Receipt Verification
              </h2>


              <p
                className="
                  mt-3
                  text-sm
                  leading-6
                  text-slate-600
                  dark:text-slate-400
                "
              >
                EAZY DON CHECK combines smart verification tools
                with useful social and community features.
              </p>

            </div>


            <div
              className="
                mt-10
                grid
                gap-5
                md:grid-cols-2
                lg:grid-cols-4
              "
            >

              {features.map((feature) => {

                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="
                      group
                      rounded-2xl
                      border
                      border-slate-200
                      bg-white
                      p-5
                      transition
                      hover:-translate-y-1
                      hover:border-brand-300
                      hover:shadow-xl
                      hover:shadow-slate-900/5
                      dark:border-dark-border
                      dark:bg-dark-card
                      dark:hover:border-brand-500/40
                    "
                  >

                    <div
                      className="
                        flex
                        h-11
                        w-11
                        items-center
                        justify-center
                        rounded-xl
                        bg-brand-50
                        text-brand-600
                        dark:bg-brand-500/10
                        dark:text-brand-400
                      "
                    >

                      <Icon className="h-5 w-5" />

                    </div>


                    <h3
                      className="
                        mt-4
                        text-[15px]
                        font-bold
                        tracking-[-0.015em]
                      "
                    >
                      {feature.title}
                    </h3>


                    <p
                      className="
                        mt-2
                        text-[13px]
                        leading-6
                        text-slate-600
                        dark:text-slate-400
                      "
                    >
                      {feature.description}
                    </p>

                  </div>
                );

              })}

            </div>

          </div>

        </section>


        {/* ======================================================
            CHAT ROOMS
        ====================================================== */}

        <section
          className="
            border-y
            border-slate-200
            bg-slate-50
            py-14
            dark:border-dark-border
            dark:bg-dark-card/40
            sm:py-18
          "
        >

          <div
            className="
              mx-auto
              max-w-7xl
              px-4
              sm:px-6
              lg:px-8
            "
          >

            <div
              className="
                flex
                flex-col
                justify-between
                gap-5
                sm:flex-row
                sm:items-end
              "
            >

              <div>

                <span
                  className="
                    text-[11px]
                    font-bold
                    uppercase
                    tracking-[0.14em]
                    text-brand-600
                    dark:text-brand-400
                  "
                >
                  Community
                </span>


                <h2
                  className="
                    mt-2
                    text-2xl
                    font-extrabold
                    leading-tight
                    tracking-[-0.035em]
                    sm:text-3xl
                  "
                >
                  Find your conversation
                </h2>


                <p
                  className="
                    mt-2.5
                    max-w-2xl
                    text-sm
                    leading-6
                    text-slate-600
                    dark:text-slate-400
                  "
                >
                  Join a room that matches your interests and
                  start connecting with other EAZY DON CHECK members.
                </p>

              </div>


              <Link
                to={
                  isAuthenticated
                    ? '/chat/general'
                    : '/signup'
                }
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  text-sm
                  font-bold
                  text-brand-600
                  hover:text-brand-700
                  dark:text-brand-400
                "
              >

                {isAuthenticated
                  ? 'Open Chat Rooms'
                  : 'Join the Community'}

                <ArrowRight className="h-4 w-4" />

              </Link>

            </div>


            <div
              className="
                mt-9
                grid
                gap-4
                sm:grid-cols-2
                lg:grid-cols-4
              "
            >

              {chatRooms.map((room) => {

                const Icon = room.icon;

                return (
                  <Link
                    key={room.name}
                    to={
                      isAuthenticated
                        ? `/chat/${room.slug}`
                        : '/signup'
                    }
                    className="
                      group
                      rounded-2xl
                      border
                      border-slate-200
                      bg-white
                      p-4.5
                      transition
                      hover:border-brand-300
                      hover:shadow-lg
                      dark:border-dark-border
                      dark:bg-dark-card
                      dark:hover:border-brand-500/40
                    "
                  >

                    <div className="flex items-start justify-between">

                      <div
                        className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-xl
                          bg-brand-50
                          text-brand-600
                          dark:bg-brand-500/10
                          dark:text-brand-400
                        "
                      >

                        <Icon className="h-[18px] w-[18px]" />

                      </div>


                      <ChevronRight
                        className="
                          h-[18px]
                          w-[18px]
                          text-slate-300
                          transition
                          group-hover:translate-x-1
                          group-hover:text-brand-500
                        "
                      />

                    </div>


                    <h3
                      className="
                        mt-4
                        text-sm
                        font-bold
                        tracking-[-0.01em]
                      "
                    >
                      {room.name}
                    </h3>


                    <p
                      className="
                        mt-1.5
                        text-[12px]
                        leading-5
                        text-slate-500
                        dark:text-slate-400
                      "
                    >
                      {room.description}
                    </p>

                  </Link>
                );

              })}

            </div>

          </div>

        </section>


        {/* ======================================================
            FEEDBACK
        ====================================================== */}

        <section
          className="
            bg-white
            py-14
            dark:bg-dark-bg
            sm:py-18
          "
        >

          <div
            className="
              mx-auto
              max-w-7xl
              px-4
              sm:px-6
              lg:px-8
            "
          >

            <div
              className="
                relative
                overflow-hidden
                rounded-3xl
                border
                border-slate-200
                bg-gradient-to-br
                from-brand-50
                via-white
                to-slate-50
                p-7
                shadow-sm
                dark:border-dark-border
                dark:from-brand-500/10
                dark:via-dark-card
                dark:to-dark-bg
                sm:p-10
              "
            >

              {/* DECORATIVE BACKGROUND */}

              <div
                className="
                  pointer-events-none
                  absolute
                  -right-24
                  -top-24
                  h-72
                  w-72
                  rounded-full
                  bg-brand-500/10
                  blur-3xl
                "
              />

              <div
                className="
                  pointer-events-none
                  absolute
                  -bottom-24
                  -left-24
                  h-64
                  w-64
                  rounded-full
                  bg-blue-500/10
                  blur-3xl
                "
              />


              <div
                className="
                  relative
                  grid
                  items-center
                  gap-10
                  lg:grid-cols-[1fr_auto]
                "
              >

                {/* FEEDBACK CONTENT */}

                <div>

                  <div
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-full
                      border
                      border-brand-200
                      bg-white
                      px-3.5
                      py-1.5
                      text-xs
                      font-bold
                      text-brand-700
                      shadow-sm
                      dark:border-brand-500/20
                      dark:bg-dark-card
                      dark:text-brand-400
                    "
                  >

                    <MessageCircle className="h-3.5 w-3.5" />

                    We value your feedback

                  </div>


                  <h2
                    className="
                      mt-4
                      text-2xl
                      font-extrabold
                      leading-tight
                      tracking-[-0.035em]
                      text-slate-950
                      sm:text-3xl
                      dark:text-white
                    "
                  >
                    Help us make EAZY DON CHECK better
                  </h2>


                  <p
                    className="
                      mt-3
                      max-w-2xl
                      text-sm
                      leading-6
                      text-slate-600
                      dark:text-slate-400
                    "
                  >
                    Tell us what you think about your experience.
                    Whether you have a suggestion, found something
                    that needs improvement, or simply want to share
                    what you enjoy, your feedback helps us improve
                    the platform.
                  </p>


                  {/* RATING VISUAL */}

                  <div
                    className="
                      mt-5
                      flex
                      flex-wrap
                      items-center
                      gap-3
                    "
                  >

                    <div className="flex items-center gap-0.5">

                      {[1, 2, 3, 4, 5].map((star) => (

                        <Star
                          key={star}
                          className="
                            h-[17px]
                            w-[17px]
                            fill-amber-400
                            text-amber-400
                          "
                        />

                      ))}

                    </div>


                    <span
                      className="
                        text-xs
                        font-medium
                        text-slate-600
                        dark:text-slate-400
                      "
                    >
                      Your opinion matters to us
                    </span>

                  </div>


                  {/* FEEDBACK BUTTON */}

                  <div
                    className="
                      mt-7
                      flex
                      flex-col
                      gap-3
                      sm:flex-row
                    "
                  >

                    <Link
                      to={
                        isAuthenticated
                          ? '/feedback'
                          : '/login'
                      }
                      className="
                        inline-flex
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        bg-brand-600
                        px-5
                        py-3
                        text-sm
                        font-bold
                        text-white
                        shadow-lg
                        shadow-brand-600/20
                        transition
                        hover:bg-brand-700
                        dark:hover:bg-brand-500
                      "
                    >

                      Share Your Feedback

                      <ArrowRight className="h-4 w-4" />

                    </Link>


                    {!isAuthenticated && (

                      <Link
                        to="/signup"
                        className="
                          inline-flex
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          border
                          border-slate-300
                          bg-white
                          px-5
                          py-3
                          text-sm
                          font-bold
                          text-slate-800
                          transition
                          hover:border-brand-400
                          hover:text-brand-600
                          dark:border-dark-border
                          dark:bg-dark-card
                          dark:text-white
                          dark:hover:border-brand-500
                          dark:hover:text-brand-400
                        "
                      >

                        Create an Account

                        <ArrowRight className="h-4 w-4" />

                      </Link>

                    )}

                  </div>

                </div>


                {/* FEEDBACK CARD */}

                <div
                  className="
                    w-full
                    max-w-sm
                    rounded-3xl
                    border
                    border-slate-200
                    bg-white
                    p-5
                    shadow-xl
                    shadow-slate-900/5
                    dark:border-dark-border
                    dark:bg-dark-card
                  "
                >

                  <div
                    className="
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center
                      rounded-2xl
                      bg-brand-50
                      text-brand-600
                      dark:bg-brand-500/10
                      dark:text-brand-400
                    "
                  >

                    <MessageCircle className="h-6 w-6" />

                  </div>


                  <h3
                    className="
                      mt-4
                      text-lg
                      font-extrabold
                      tracking-[-0.02em]
                    "
                  >
                    Got something to say?
                  </h3>


                  <p
                    className="
                      mt-2
                      text-xs
                      leading-5
                      text-slate-600
                      dark:text-slate-400
                    "
                  >
                    Let us know how EAZY DON CHECK is working
                    for you and what you would like to see next.
                  </p>


                  <div className="mt-5 space-y-2.5">

                    <div
                      className="
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        bg-slate-50
                        px-3.5
                        py-2.5
                        dark:bg-white/5
                      "
                    >

                      <CheckCircle2
                        className="
                          h-[18px]
                          w-[18px]
                          shrink-0
                          text-green-500
                        "
                      />

                      <span
                        className="
                          text-xs
                          text-slate-700
                          dark:text-slate-300
                        "
                      >
                        Suggest a new feature
                      </span>

                    </div>


                    <div
                      className="
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        bg-slate-50
                        px-3.5
                        py-2.5
                        dark:bg-white/5
                      "
                    >

                      <CheckCircle2
                        className="
                          h-[18px]
                          w-[18px]
                          shrink-0
                          text-green-500
                        "
                      />

                      <span
                        className="
                          text-xs
                          text-slate-700
                          dark:text-slate-300
                        "
                      >
                        Report an issue
                      </span>

                    </div>


                    <div
                      className="
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        bg-slate-50
                        px-3.5
                        py-2.5
                        dark:bg-white/5
                      "
                    >

                      <CheckCircle2
                        className="
                          h-[18px]
                          w-[18px]
                          shrink-0
                          text-green-500
                        "
                      />

                      <span
                        className="
                          text-xs
                          text-slate-700
                          dark:text-slate-300
                        "
                      >
                        Share your experience
                      </span>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* ======================================================
            CTA
        ====================================================== */}

        <section className="py-14 sm:py-18">

          <div
            className="
              mx-auto
              max-w-5xl
              px-4
              sm:px-6
              lg:px-8
            "
          >

            <div
              className="
                relative
                overflow-hidden
                rounded-3xl
                bg-slate-950
                px-6
                py-10
                text-center
                text-white
                sm:px-10
                sm:py-14
              "
            >

              <div
                className="
                  absolute
                  -left-20
                  -top-20
                  h-64
                  w-64
                  rounded-full
                  bg-brand-500/20
                  blur-3xl
                "
              />

              <div
                className="
                  absolute
                  -bottom-20
                  -right-20
                  h-64
                  w-64
                  rounded-full
                  bg-blue-500/20
                  blur-3xl
                "
              />


              <div className="relative">

                {/* LOGO CARD */}

                <div
                  className="
                    mx-auto
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-1.5
                    shadow-lg
                    dark:border-slate-200
                    dark:bg-white
                  "
                >

                  <img
                    src={LOGO_SRC}
                    alt="EAZY DON CHECK"
                    className="
                      block
                      h-full
                      w-full
                      object-contain
                    "
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />

                </div>


                <h2
                  className="
                    mt-5
                    text-2xl
                    font-extrabold
                    leading-tight
                    tracking-[-0.035em]
                    sm:text-3xl
                  "
                >
                  Ready to experience EAZY DON CHECK?
                </h2>


                <p
                  className="
                    mx-auto
                    mt-3
                    max-w-2xl
                    text-sm
                    leading-6
                    text-slate-300
                  "
                >
                  Create your account and start connecting,
                  chatting and using smart receipt verification tools.
                </p>


                <div className="mt-7">

                  <Link
                    to={
                      isAuthenticated
                        ? '/feed'
                        : '/signup'
                    }
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-xl
                      bg-brand-600
                      px-6
                      py-3
                      text-sm
                      font-bold
                      text-white
                      transition
                      hover:bg-brand-500
                    "
                  >

                    {isAuthenticated
                      ? 'Go to My Feed'
                      : 'Create Free Account'}

                    <ArrowRight className="h-4 w-4" />

                  </Link>

                </div>

              </div>

            </div>

          </div>

        </section>

      </main>


      <Footer />

    </div>
  );
}


export default Home;