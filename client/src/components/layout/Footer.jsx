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
// ============================================================

const Footer = () => {
  return (
    <footer
      className="
        mt-auto
        border-t
        border-slate-200
        bg-white
        transition-colors
        duration-200
        dark:border-dark-border
        dark:bg-dark-card
      "
    >
      <div
        className="
          mx-auto
          max-w-7xl
          px-4
          py-12
          sm:px-6
          lg:px-8
        "
      >

        {/* ====================================================
            MAIN FOOTER
        ===================================================== */}

        <div
          className="
            mb-10
            grid
            grid-cols-1
            gap-10
            md:grid-cols-4
          "
        >

          {/* ==================================================
              BRAND
          =================================================== */}

          <div
            className="
              space-y-5
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
                  bg-white
                  border
                  border-slate-200
                  dark:border-slate-200
                  overflow-hidden
                  shadow-sm
                  transition-transform
                  duration-200
                  group-hover:scale-105
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
                    text-slate-900
                    dark:text-white
                  "
                >
                  EAZY DON
                  <span className="text-brand-500">
                    CHECK
                  </span>
                </div>

                <div
                  className="
                    text-[11px]
                    font-medium
                    uppercase
                    tracking-wider
                    text-slate-500
                    dark:text-slate-500
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
                leading-7
                text-slate-600
                dark:text-slate-400
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
                border-emerald-500/20
                bg-emerald-500/10
                px-3
                py-1.5
                text-xs
                font-medium
                text-emerald-600
                dark:text-emerald-400
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
                mb-5
                text-xs
                font-bold
                uppercase
                tracking-wider
                text-slate-900
                dark:text-slate-200
              "
            >
              Platform
            </h4>


            <ul
              className="
                space-y-3
                text-sm
                text-slate-600
                dark:text-slate-400
              "
            >

              <li>
                <Link
                  to="/"
                  className="
                    transition-colors
                    hover:text-brand-500
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
                    hover:text-brand-500
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
                    hover:text-brand-500
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
                    hover:text-brand-500
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
                    text-brand-500
                    transition-colors
                    hover:text-brand-600
                    dark:hover:text-brand-400
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
                mb-5
                text-xs
                font-bold
                uppercase
                tracking-wider
                text-slate-900
                dark:text-slate-200
              "
            >
              Security & Privacy
            </h4>


            <ul
              className="
                space-y-3
                text-sm
                text-slate-600
                dark:text-slate-400
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
                    hover:text-brand-500
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
                    hover:text-brand-500
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
                    hover:text-brand-500
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
            mb-8
            flex
            flex-col
            gap-4
            rounded-2xl
            border
            border-slate-200
            bg-slate-50
            p-5
            transition-colors
            duration-200
            dark:border-white/10
            dark:bg-white/[0.03]
            sm:flex-row
            sm:items-center
            sm:justify-between
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
                bg-brand-500/10
                text-brand-600
                dark:text-brand-400
              "
            >
              <LockKeyhole className="h-5 w-5" />
            </div>


            <div>

              <p
                className="
                  text-sm
                  font-semibold
                  text-slate-900
                  dark:text-white
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
                  text-slate-500
                  dark:text-slate-500
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
              border-slate-300
              px-4
              py-2
              text-xs
              font-semibold
              text-slate-700
              transition
              hover:border-brand-500/40
              hover:text-brand-500
              dark:border-white/10
              dark:text-slate-300
              dark:hover:text-brand-400
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
            gap-4
            border-t
            border-slate-200
            pt-7
            text-xs
            text-slate-500
            transition-colors
            duration-200
            dark:border-white/10
            sm:flex-row
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
                hover:text-slate-700
                dark:hover:text-slate-300
              "
            >
              Privacy
            </Link>


            <Link
              to="/terms-of-service"
              className="
                transition-colors
                hover:text-slate-700
                dark:hover:text-slate-300
              "
            >
              Terms
            </Link>


            <Link
              to="/security"
              className="
                transition-colors
                hover:text-slate-700
                dark:hover:text-slate-300
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