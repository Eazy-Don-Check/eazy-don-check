import React from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  ShieldCheck,
  CheckCircle2,
  LockKeyhole,
  FileText,
  Shield,
  ArrowRight,
} from 'lucide-react';


// ============================================================
// EAZY DON CHECK FOOTER
// ============================================================
//
// Theme behavior:
// - Theme is controlled centrally by AppLayout / ThemeToggle.
// - This component does NOT manage theme state.
// - Tailwind dark: classes automatically follow the global
//   `dark` class applied by the application's theme system.
//
// Visual behavior:
// - Transparent glassmorphism design
// - Allows BackgroundSlider imagery to remain visible
// - Works consistently on Home, Login and Signup pages
// - Preserves existing navigation and functionality
//
// ============================================================

const Footer = () => {
  return (
    <footer
      className="
        mt-auto
        relative
        overflow-hidden
        border-t
        border-white/15
        bg-white/[0.06]
        backdrop-blur-2xl
        shadow-[0_-12px_40px_rgba(0,0,0,0.12)]
        transition-colors
        duration-200
        dark:border-white/10
        dark:bg-slate-950/[0.18]
      "
    >

      {/* ====================================================
          SUBTLE GLASS HIGHLIGHT
      ===================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          inset-x-0
          top-0
          h-px
          bg-white/30
          dark:bg-white/15
        "
      />

      <div
        className="
          mx-auto
          max-w-7xl
          px-4
          py-8
          sm:px-6
          sm:py-10
          lg:px-8
        "
      >

        {/* ====================================================
            MAIN FOOTER
        ===================================================== */}

        <div
          className="
            mb-8
            grid
            grid-cols-1
            gap-8
            md:grid-cols-4
          "
        >

          {/* ==================================================
              BRAND
          =================================================== */}

          <div
            className="
              space-y-4
              md:col-span-2
            "
          >

            <Link
              to="/"
              className="
                inline-flex
                items-center
                gap-3
                group
              "
              aria-label="EAZY DON CHECK Home"
            >

              {/* ==================================================
                  BRAND LOGO
              =================================================== */}

              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-white/80
                  border
                  border-white/50
                  overflow-hidden
                  shadow-lg
                  backdrop-blur-md
                  transition-transform
                  duration-200
                  group-hover:scale-105
                  dark:bg-white/10
                  dark:border-white/20
                "
              >
                <img
                  src="/eazy-don-check-logo.png"
                  alt="EAZY DON CHECK"
                  className="
                    h-8
                    w-8
                    object-contain
                  "
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>


              {/* Brand Name */}

              <div>

                <div
                  className="
                    text-lg
                    font-black
                    tracking-tight
                    text-white
                    drop-shadow-sm
                  "
                >
                  EAZY DON
                  <span className="text-brand-400">
                    CHECK
                  </span>
                </div>

                <div
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-white/65
                  "
                >
                  Smart Verification & Social Community
                </div>

              </div>

            </Link>


            {/* Description */}

            <p
              className="
                max-w-md
                text-sm
                leading-6
                text-white/70
              "
            >
              EAZY DON CHECK is a smart digital platform combining
              receipt verification, structured data extraction,
              social community conversations, messaging and secure
              digital collaboration tools.
            </p>


            {/* System Status */}

            <div
              className="
                flex
                w-fit
                items-center
                gap-2
                rounded-full
                border
                border-emerald-300/25
                bg-emerald-400/10
                px-3
                py-1.5
                text-xs
                font-medium
                text-emerald-300
                backdrop-blur-md
              "
            >
              <CheckCircle2 className="h-3.5 w-3.5" />

              <span>
                System Status: Operational
              </span>
            </div>

          </div>


          {/* ==================================================
              PLATFORM
          =================================================== */}

          <div>

            <h4
              className="
                mb-4
                text-xs
                font-bold
                uppercase
                tracking-wider
                text-white
              "
            >
              Platform
            </h4>


            <ul
              className="
                space-y-2.5
                text-sm
                text-white/65
              "
            >

              <li>
                <Link
                  to="/"
                  className="
                    transition-colors
                    hover:text-brand-300
                  "
                >
                  Home
                </Link>
              </li>


              <li>
                <Link
                  to="/feed"
                  className="
                    transition-colors
                    hover:text-brand-300
                  "
                >
                  Community Feed
                </Link>
              </li>


              <li>
                <Link
                  to="/dashboard"
                  className="
                    transition-colors
                    hover:text-brand-300
                  "
                >
                  Receipt Dashboard
                </Link>
              </li>


              <li>
                <Link
                  to="/verify"
                  className="
                    transition-colors
                    hover:text-brand-300
                  "
                >
                  Verify Receipt
                </Link>
              </li>


              <li>
                <Link
                  to="/signup"
                  className="
                    inline-flex
                    items-center
                    gap-1
                    font-medium
                    text-brand-300
                    transition-colors
                    hover:text-brand-200
                  "
                >
                  Get Started

                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>

            </ul>

          </div>


          {/* ==================================================
              SECURITY & PRIVACY
          =================================================== */}

          <div>

            <h4
              className="
                mb-4
                text-xs
                font-bold
                uppercase
                tracking-wider
                text-white
              "
            >
              Security & Privacy
            </h4>


            <ul
              className="
                space-y-2.5
                text-sm
                text-white/65
              "
            >

              {/* Privacy Policy */}

              <li>
                <Link
                  to="/privacy-policy"
                  className="
                    inline-flex
                    items-center
                    gap-2
                    transition-colors
                    hover:text-brand-300
                  "
                >
                  <Shield className="h-4 w-4" />

                  <span>
                    Privacy Policy
                  </span>
                </Link>
              </li>


              {/* Terms */}

              <li>
                <Link
                  to="/terms-of-service"
                  className="
                    inline-flex
                    items-center
                    gap-2
                    transition-colors
                    hover:text-brand-300
                  "
                >
                  <FileText className="h-4 w-4" />

                  <span>
                    Terms of Service
                  </span>
                </Link>
              </li>


              {/* Security */}

              <li>
                <Link
                  to="/security"
                  className="
                    inline-flex
                    items-center
                    gap-2
                    transition-colors
                    hover:text-brand-300
                  "
                >
                  <LockKeyhole className="h-4 w-4" />

                  <span>
                    Security & Data Protection
                  </span>
                </Link>
              </li>

            </ul>

          </div>

        </div>


        {/* ====================================================
            SECURITY NOTICE
        ===================================================== */}

        <div
          className="
            mb-7
            flex
            flex-col
            gap-4
            rounded-2xl
            border
            border-white/15
            bg-white/[0.06]
            p-4
            backdrop-blur-xl
            shadow-lg
            transition-colors
            duration-200
            sm:flex-row
            sm:items-center
            sm:justify-between
            dark:border-white/10
            dark:bg-white/[0.035]
          "
        >

          <div
            className="
              flex
              items-start
              gap-3
            "
          >

            <div
              className="
                mt-0.5
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-brand-300/15
                bg-brand-500/10
                text-brand-300
                backdrop-blur-md
              "
            >
              <LockKeyhole className="h-5 w-5" />
            </div>


            <div>

              <p
                className="
                  text-sm
                  font-semibold
                  text-white
                "
              >
                Your security matters
              </p>

              <p
                className="
                  mt-1
                  max-w-2xl
                  text-xs
                  leading-5
                  text-white/55
                "
              >
                EAZY DON CHECK is designed with authentication,
                controlled access and secure handling of application
                data in mind.
              </p>

            </div>

          </div>


          <Link
            to="/security"
            className="
              inline-flex
              shrink-0
              items-center
              justify-center
              gap-2
              rounded-lg
              border
              border-white/20
              bg-white/[0.05]
              px-4
              py-2
              text-xs
              font-semibold
              text-white/80
              backdrop-blur-md
              transition
              hover:border-brand-300/40
              hover:bg-white/10
              hover:text-brand-300
            "
          >
            Learn More

            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

        </div>


        {/* ====================================================
            BOTTOM BAR
        ===================================================== */}

        <div
          className="
            flex
            flex-col
            items-center
            justify-between
            gap-3
            border-t
            border-white/15
            pt-5
            text-xs
            text-white/45
            transition-colors
            duration-200
            sm:flex-row
            dark:border-white/10
          "
        >

          <p>
            © {new Date().getFullYear()} EAZY DON CHECK.
            All rights reserved.
          </p>


          <div
            className="
              flex
              items-center
              gap-4
            "
          >

            <Link
              to="/privacy-policy"
              className="
                transition-colors
                hover:text-white/80
              "
            >
              Privacy
            </Link>


            <Link
              to="/terms-of-service"
              className="
                transition-colors
                hover:text-white/80
              "
            >
              Terms
            </Link>


            <Link
              to="/security"
              className="
                transition-colors
                hover:text-white/80
              "
            >
              Security
            </Link>

          </div>

        </div>

      </div>

    </footer>
  );
};

export default Footer;