import React from 'react';
import { Link } from 'react-router-dom';

import {
  ArrowLeft,
  CheckCircle2,
  Database,
  KeyRound,
  LockKeyhole,
  Shield,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';


// ============================================================
// BRAND LOGO
// ============================================================

const LOGO_SRC = '/eazy-don-check-logo.png';


// ============================================================
// SECURITY FEATURES
// ============================================================

const securityFeatures = [
  {
    icon: KeyRound,
    title: 'Secure Authentication',
    description:
      'Account access is controlled through authenticated sessions and protected application routes.',
  },
  {
    icon: LockKeyhole,
    title: 'Protected Credentials',
    description:
      'Passwords should be handled using secure authentication mechanisms rather than exposed or stored as plain text.',
  },
  {
    icon: UserRoundCheck,
    title: 'Access Control',
    description:
      'Protected areas of EAZY DON CHECK require appropriate authentication and administrative privileges where applicable.',
  },
  {
    icon: Database,
    title: 'Controlled Data Processing',
    description:
      'Receipt and application data are processed according to the features requested by the user and the platform workflow.',
  },
];


const Security = () => {
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
                Security & Data Protection
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
          MAIN
      ====================================================== */}

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-12 text-white sm:px-10">

          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />

          <div className="relative max-w-3xl">

            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600">
              <Shield className="h-7 w-7" />
            </div>

            <p className="text-sm font-bold uppercase tracking-wider text-brand-400">
              EAZY DON CHECK
            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-4xl">
              Security & Data Protection
            </h1>

            <p className="mt-5 leading-7 text-slate-300">
              EAZY DON CHECK is designed with security and controlled
              access in mind. This page explains the principal
              security practices and protections associated with the
              application.
            </p>

          </div>

        </section>


        {/* ====================================================
            SECURITY FEATURES
        ==================================================== */}

        <section className="mt-12">

          <div className="grid gap-5 md:grid-cols-2">

            {securityFeatures.map((feature) => {

              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-6
                    dark:border-dark-border
                    dark:bg-dark-card
                  "
                >

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <Icon className="h-5 w-5" />
                  </div>


                  <h2 className="mt-5 text-lg font-bold">
                    {feature.title}
                  </h2>


                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>

                </div>
              );

            })}

          </div>

        </section>


        {/* ====================================================
            SECURITY BEST PRACTICES
        ==================================================== */}

        <section className="mt-12">

          <h2 className="text-2xl font-black">
            Security Best Practices
          </h2>


          <div className="mt-6 space-y-3">

            {[
              'Use a strong, unique password for your EAZY DON CHECK account.',
              'Never share your password or authentication codes with another person.',
              'Avoid posting sensitive financial or authentication information in public community areas.',
              'Review uploaded receipt and document content before submitting it for processing.',
              'Log out of shared or public devices after using the platform.',
              'Report suspicious account activity as soon as possible.',
            ].map((item) => (

              <div
                key={item}
                className="
                  flex
                  items-start
                  gap-3
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  p-4
                  dark:border-dark-border
                  dark:bg-dark-card
                "
              >

                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />

                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {item}
                </p>

              </div>

            ))}

          </div>

        </section>


        {/* ====================================================
            IMPORTANT NOTE
        ==================================================== */}

        <section className="mt-12 rounded-2xl border border-brand-200 bg-brand-50 p-6 dark:border-brand-500/20 dark:bg-brand-500/5">

          <h2 className="font-bold text-brand-900 dark:text-brand-300">
            Important
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Security is an ongoing process. EAZY DON CHECK may
            improve, change or replace security mechanisms as the
            application and its infrastructure evolve. Specific
            technical implementation details are intentionally not
            disclosed where doing so could weaken platform security.
          </p>

        </section>

      </main>

    </div>
  );
};


export default Security;