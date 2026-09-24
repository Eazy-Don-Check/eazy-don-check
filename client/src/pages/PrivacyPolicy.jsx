import React from 'react';
import { Link } from 'react-router-dom';

import {
  ArrowLeft,
  ShieldCheck,
  LockKeyhole,
  Database,
  UserCheck,
} from 'lucide-react';


// ============================================================
// BRAND LOGO
// ============================================================

const LOGO_SRC = '/eazy-don-check-logo.png';


const PrivacyPolicy = () => {
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
                Privacy Policy
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
            <ShieldCheck className="h-4 w-4" />
            EAZY DON CHECK
          </div>


          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>


          <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Last updated: September 15, 2026
          </p>

        </div>


        <div className="space-y-8">

          {/* ==================================================
              1. INTRODUCTION
          ================================================== */}

          <section>

            <h2 className="text-xl font-bold">
              1. Introduction
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              EAZY DON CHECK respects your privacy and is committed
              to protecting information associated with your account
              and use of the platform. This Privacy Policy explains
              what information may be collected, how it may be used,
              and the measures applied to protect it.
            </p>

          </section>


          {/* ==================================================
              2. INFORMATION WE COLLECT
          ================================================== */}

          <section>

            <h2 className="text-xl font-bold">
              2. Information We Collect
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Depending on the features you use, EAZY DON CHECK may
              process information such as your name, email address,
              telephone number, account credentials, profile
              information, uploaded files, receipt information,
              messages, posts and application activity.
            </p>

          </section>


          {/* ==================================================
              3. HOW WE USE INFORMATION
          ================================================== */}

          <section>

            <h2 className="text-xl font-bold">
              3. How We Use Information
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Information may be used to provide and operate platform
              features, authenticate users, process receipt
              verification requests, maintain account security,
              provide community functionality, communicate with
              users and improve the reliability and performance of
              EAZY DON CHECK.
            </p>

          </section>


          {/* ==================================================
              4. UPLOADED RECEIPT DATA
          ================================================== */}

          <section>

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <Database className="h-5 w-5" />
              </div>

              <h2 className="text-xl font-bold">
                4. Uploaded Receipt Data
              </h2>

            </div>


            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              When you submit a receipt or other supported document
              for verification, the platform may process the file
              and extracted information in order to provide the
              requested verification or analysis functionality.
            </p>


            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Users should avoid uploading information that is not
              necessary for the requested service, particularly
              highly sensitive personal information belonging to
              another person.
            </p>

          </section>


          {/* ==================================================
              5. ACCOUNT SECURITY
          ================================================== */}

          <section>

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <LockKeyhole className="h-5 w-5" />
              </div>

              <h2 className="text-xl font-bold">
                5. Account Security
              </h2>

            </div>


            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              EAZY DON CHECK uses authentication and access-control
              mechanisms designed to limit unauthorized access to
              protected areas of the application. Users are
              responsible for keeping their passwords, authentication
              codes and account access information confidential.
            </p>

          </section>


          {/* ==================================================
              6. COMMUNITY CONTENT
          ================================================== */}

          <section>

            <h2 className="text-xl font-bold">
              6. Community Content
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Posts, comments, profile information and other content
              intentionally shared through community features may be
              visible to other authorized members according to the
              functionality of the platform.
            </p>


            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Do not publish passwords, financial authentication
              credentials or other confidential information in public
              community areas.
            </p>

          </section>


          {/* ==================================================
              7. DATA RETENTION
          ================================================== */}

          <section>

            <h2 className="text-xl font-bold">
              7. Data Retention
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Information may be retained for as long as reasonably
              necessary to provide services, maintain account
              records, satisfy legitimate operational requirements,
              resolve disputes, maintain security and comply with
              applicable obligations.
            </p>

          </section>


          {/* ==================================================
              8. YOUR RESPONSIBILITIES
          ================================================== */}

          <section>

            <h2 className="text-xl font-bold">
              8. Your Responsibilities
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              You are responsible for providing accurate account
              information and for maintaining the confidentiality of
              your login credentials. You should promptly report
              suspected unauthorized access or account compromise.
            </p>

          </section>


          {/* ==================================================
              9. PRIVACY CHOICES
          ================================================== */}

          <section>

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <UserCheck className="h-5 w-5" />
              </div>

              <h2 className="text-xl font-bold">
                9. Privacy Choices
              </h2>

            </div>


            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Depending on the applicable functionality and
              requirements, users may request access to, correction
              of, or other appropriate action concerning their
              account information.
            </p>

          </section>


          {/* ==================================================
              10. POLICY UPDATES
          ================================================== */}

          <section>

            <h2 className="text-xl font-bold">
              10. Policy Updates
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              This Privacy Policy may be updated as EAZY DON CHECK
              evolves. Updated versions will be made available
              through the platform and will indicate the applicable
              revision date.
            </p>

          </section>

        </div>


        {/* ====================================================
            NOTICE
        ==================================================== */}

        <div className="mt-12 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/20 dark:bg-brand-500/5">

          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            This page provides the platform's general privacy
            framework. It should be reviewed and finalized against
            the actual data-processing practices and applicable legal
            requirements before production publication.
          </p>

        </div>

      </main>

    </div>
  );
};


export default PrivacyPolicy;