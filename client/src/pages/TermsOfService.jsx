import React from 'react';
import { Link } from 'react-router-dom';

import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';


// ============================================================
// BRAND LOGO
// ============================================================

const LOGO_SRC = '/eazy-don-check-logo.png';


const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-dark-bg dark:text-white">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-slate-200 bg-white dark:border-dark-border dark:bg-dark-card">

        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">

          <Link
            to="/"
            className="flex items-center gap-3"
          >

            {/* ==================================================
                LOGO
            ================================================== */}

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
                  p-1
                "
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            </div>


            {/* ==================================================
                BRAND NAME
            ================================================== */}

            <div>

              <div className="font-black text-slate-900 dark:text-white">
                EAZY DON
                <span className="text-brand-500">
                  CHECK
                </span>
              </div>

              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Terms of Service
              </div>

            </div>

          </Link>


          {/* ==================================================
              BACK HOME
          ================================================== */}

          <Link
            to="/"
            className="
              inline-flex
              items-center
              gap-2
              text-sm
              font-semibold
              text-slate-600
              hover:text-brand-600
              dark:text-slate-400
              dark:hover:text-brand-400
            "
          >
            <ArrowLeft className="h-4 w-4" />
            Back Home
          </Link>

        </div>

      </header>


      {/* ======================================================
          CONTENT
      ====================================================== */}

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">

        <div className="mb-10">

          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
            <FileText className="h-4 w-4" />
            EAZY DON CHECK
          </div>


          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Terms of Service
          </h1>


          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Last updated: September 15, 2026
          </p>

        </div>


        <div className="space-y-8">

          {/* ==================================================
              1. ACCEPTANCE OF THESE TERMS
          ================================================== */}

          <section>

            <h2 className="text-xl font-bold">
              1. Acceptance of These Terms
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              By accessing or using EAZY DON CHECK, you agree to
              comply with these Terms of Service and any applicable
              policies referenced by them. If you do not agree with
              these terms, you should not use the platform.
            </p>

          </section>


          {/* ==================================================
              2. USER ACCOUNTS
          ================================================== */}

          <section>

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <UserCheck className="h-5 w-5" />
              </div>

              <h2 className="text-xl font-bold">
                2. User Accounts
              </h2>

            </div>


            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              You are responsible for the accuracy of information
              submitted during registration and for protecting your
              account credentials. You must not knowingly provide
              false information or use another person's account
              without authorization.
            </p>

          </section>


          {/* ==================================================
              3. ACCEPTABLE USE
          ================================================== */}

          <section>

            <h2 className="text-xl font-bold">
              3. Acceptable Use
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              You agree not to misuse EAZY DON CHECK, interfere with
              its operation, attempt unauthorized access, distribute
              malicious software, abuse other members, or use the
              platform for unlawful activities.
            </p>

          </section>


          {/* ==================================================
              4. COMMUNITY CONTENT
          ================================================== */}

          <section>

            <h2 className="text-xl font-bold">
              4. Community Content
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Users are responsible for content they publish through
              posts, comments, messages, profile information and
              other community features.
            </p>


            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Content that violates applicable law, threatens other
              users, contains malicious material, or materially
              interferes with the platform may be removed and may
              result in account restrictions.
            </p>

          </section>


          {/* ==================================================
              5. RECEIPT VERIFICATION
          ================================================== */}

          <section>

            <h2 className="text-xl font-bold">
              5. Receipt Verification
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Receipt verification and data extraction features are
              provided as digital assistance tools. Extracted
              information should be reviewed by the user before it
              is relied upon for financial, accounting, legal or
              business decisions.
            </p>

          </section>


          {/* ==================================================
              6. NO GUARANTEE OF PERFECT VERIFICATION
          ================================================== */}

          <section>

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <h2 className="text-xl font-bold">
                6. No Guarantee of Perfect Verification
              </h2>

            </div>


            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Automated document processing may produce incomplete,
              incorrect or ambiguous results. EAZY DON CHECK should
              not be treated as a substitute for appropriate human
              review, professional accounting judgment, legal advice
              or independent verification.
            </p>

          </section>


          {/* ==================================================
              7. INTELLECTUAL PROPERTY
          ================================================== */}

          <section>

            <h2 className="text-xl font-bold">
              7. Intellectual Property
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Platform software, branding, interface elements and
              other proprietary materials associated with EAZY DON
              CHECK remain protected by applicable intellectual
              property laws unless otherwise stated.
            </p>

          </section>


          {/* ==================================================
              8. ACCOUNT RESTRICTIONS
          ================================================== */}

          <section>

            <h2 className="text-xl font-bold">
              8. Account Restrictions
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Access may be restricted, suspended or terminated where
              reasonably necessary to protect the platform, other
              users, platform integrity or applicable legal
              requirements.
            </p>

          </section>


          {/* ==================================================
              9. SERVICE AVAILABILITY
          ================================================== */}

          <section>

            <h2 className="text-xl font-bold">
              9. Service Availability
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              EAZY DON CHECK may occasionally experience maintenance,
              technical problems, interruptions or changes to
              individual features. Reasonable efforts may be made to
              maintain availability and restore affected services.
            </p>

          </section>


          {/* ==================================================
              10. CHANGES TO THESE TERMS
          ================================================== */}

          <section>

            <h2 className="text-xl font-bold">
              10. Changes to These Terms
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              These Terms may be updated as the platform develops.
              Continued use of EAZY DON CHECK after an applicable
              update may constitute acceptance of the revised terms.
            </p>

          </section>

        </div>


        {/* ====================================================
            LEGAL NOTICE
        ==================================================== */}

        <div className="mt-12 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/20 dark:bg-brand-500/5">

          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            These terms are a general application framework and
            should be reviewed by an appropriately qualified legal
            professional before being adopted as the final legal
            terms for a production service.
          </p>

        </div>

      </main>

    </div>
  );
};


export default TermsOfService;