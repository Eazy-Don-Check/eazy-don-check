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
  ShieldCheck,
  KeyRound,
  Lock,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import apiClient from '../utils/apiClient';


// ============================================================
// BRAND LOGO
// ============================================================

const LOGO_SRC = '/eazy-don-check-logo.png';


// ============================================================
// COMPONENT
// ============================================================

const ResetPassword = () => {

  const location =
    useLocation();

  const navigate =
    useNavigate();


  // ============================================================
  // QUERY PARAMETERS
  // ============================================================

  const query =
    new URLSearchParams(
      location.search
    );


  const resetRequestId =
    query.get(
      'requestId'
    );


  const channel =
    query.get(
      'channel'
    );


  const destination =
    query.get(
      'destination'
    );


  // ============================================================
  // FORM STATE
  // ============================================================

  const [
    otp,
    setOtp,
  ] = useState('');


  const [
    password,
    setPassword,
  ] = useState('');


  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState('');


  const [
    success,
    setSuccess,
  ] = useState('');


  const [
    completed,
    setCompleted,
  ] = useState(false);


  // ============================================================
  // VALIDATE RESET SESSION
  // ============================================================

  useEffect(() => {

    if (
      !resetRequestId ||
      !['email', 'phone'].includes(
        channel
      )
    ) {

      setError(
        'This password reset session is invalid or incomplete.'
      );

    }

  }, [
    resetRequestId,
    channel,
  ]);


  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit =
    async (event) => {

      event.preventDefault();

      setError('');
      setSuccess('');


      if (
        !resetRequestId
      ) {

        setError(
          'Password reset session is missing.'
        );

        return;
      }


      if (
        !['email', 'phone'].includes(
          channel
        )
      ) {

        setError(
          'Invalid recovery method.'
        );

        return;
      }


      if (
        !/^\d{6}$/.test(
          otp.trim()
        )
      ) {

        setError(
          'Enter the 6-digit verification code.'
        );

        return;
      }


      if (
        password.length < 6
      ) {

        setError(
          'Password must be at least 6 characters long.'
        );

        return;
      }


      if (
        password !==
        confirmPassword
      ) {

        setError(
          'Passwords do not match.'
        );

        return;
      }


      setLoading(true);


      try {

        const response =
          await apiClient.post(
            '/auth/forgot-password/reset',
            {
              resetRequestId,
              channel,
              otp:
                otp.trim(),
              password,
              confirmPassword,
            }
          );


        const data =
          response?.data || {};


        if (
          data.success === false
        ) {

          throw new Error(
            data.message ||
              data.error ||
              'Unable to reset password.'
          );

        }


        setCompleted(true);


        setSuccess(
          data.message ||
            'Password reset successful.'
        );


        window.setTimeout(
          () => {

            navigate(
              '/login',
              {
                replace: true,
              }
            );

          },
          1800
        );

      } catch (requestError) {

        console.error(
          'Reset password error:',
          requestError
        );


        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
            requestError?.message ||
            'Unable to reset password.'
        );

      } finally {

        setLoading(false);

      }

    };


  // ============================================================
  // SUCCESS SCREEN
  // ============================================================

  if (completed) {

    return (
      <div
        className="
          min-h-screen
          flex
          flex-col
          bg-slate-50
          dark:bg-dark-bg
          text-slate-800
          dark:text-slate-100
        "
      >

        <Navbar />


        <main
          className="
            flex-1
            flex
            items-center
            justify-center
            px-4
            py-12
          "
        >

          <div
            className="
              w-full
              max-w-md
              bg-white
              dark:bg-slate-900
              border
              border-slate-200
              dark:border-slate-800
              rounded-2xl
              shadow-xl
              p-8
              text-center
            "
          >

            {/* LOGO */}

            <div
              className="
                w-16
                h-16
                rounded-2xl
                bg-brand-500/10
                border
                border-brand-500/20
                flex
                items-center
                justify-center
                mx-auto
                mb-4
                overflow-hidden
              "
            >

              <img
                src={LOGO_SRC}
                alt="EAZY DON CHECK"
                className="
                  w-full
                  h-full
                  object-contain
                  p-2
                  block
                "
                draggable="false"
              />

            </div>


            <div
              className="
                w-14
                h-14
                rounded-full
                bg-emerald-500/10
                border
                border-emerald-500/30
                flex
                items-center
                justify-center
                mx-auto
                mb-4
              "
            >

              <CheckCircle2
                className="
                  w-8
                  h-8
                  text-emerald-500
                "
              />

            </div>


            <h1
              className="
                text-2xl
                font-bold
                text-slate-900
                dark:text-white
              "
            >
              Password Reset
            </h1>


            <p
              className="
                text-sm
                text-slate-500
                dark:text-slate-400
                mt-2
              "
            >
              {success}
            </p>


            <p
              className="
                text-xs
                text-slate-400
                mt-4
              "
            >
              Redirecting to login...
            </p>

          </div>

        </main>


        <Footer />

      </div>
    );
  }


  // ============================================================
  // RESET FORM
  // ============================================================

  return (
    <div
      className="
        min-h-screen
        flex
        flex-col
        bg-slate-50
        dark:bg-dark-bg
        text-slate-800
        dark:text-slate-100
      "
    >

      <Navbar />


      <main
        className="
          flex-1
          flex
          items-center
          justify-center
          px-4
          py-12
          relative
          overflow-hidden
        "
      >

        {/* BACKGROUND GLOW */}

        <div
          className="
            absolute
            top-1/4
            left-1/2
            -translate-x-1/2
            w-[450px]
            h-[450px]
            bg-brand-500/10
            dark:bg-brand-500/15
            rounded-full
            blur-[140px]
            pointer-events-none
          "
        />


        <div
          className="
            w-full
            max-w-md
            bg-white/90
            dark:bg-slate-900/80
            backdrop-blur-md
            border
            border-slate-200
            dark:border-slate-800
            shadow-xl
            rounded-2xl
            p-8
            relative
            z-10
          "
        >

          {/* ==================================================
              HEADER
          ================================================== */}

          <div
            className="
              text-center
              mb-7
            "
          >

            {/* LOGO */}

            <div
              className="
                w-16
                h-16
                rounded-2xl
                bg-brand-500/10
                border
                border-brand-500/20
                flex
                items-center
                justify-center
                mx-auto
                mb-4
                overflow-hidden
              "
            >

              <img
                src={LOGO_SRC}
                alt="EAZY DON CHECK"
                className="
                  w-full
                  h-full
                  object-contain
                  p-2
                  block
                "
                draggable="false"
              />

            </div>


            <h1
              className="
                text-2xl
                font-bold
                text-slate-900
                dark:text-white
              "
            >
              Reset Your Password
            </h1>


            <p
              className="
                text-sm
                text-slate-500
                dark:text-slate-400
                mt-2
              "
            >
              Enter the OTP sent to{' '}

              <strong>
                {destination ||
                  channel}
              </strong>
            </p>

          </div>


          {/* ERROR */}

          {error && (
            <div
              className="
                mb-5
                p-3
                rounded-xl
                bg-red-500/10
                border
                border-red-500/30
                text-red-600
                dark:text-red-400
                text-xs
                flex
                gap-2
              "
            >

              <AlertCircle
                className="
                  w-4
                  h-4
                  shrink-0
                "
              />

              <span>
                {error}
              </span>

            </div>
          )}


          {/* SUCCESS */}

          {success && (
            <div
              className="
                mb-5
                p-3
                rounded-xl
                bg-emerald-500/10
                border
                border-emerald-500/30
                text-emerald-600
                dark:text-emerald-400
                text-xs
              "
            >
              {success}
            </div>
          )}


          {/* FORM */}

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-4"
          >

            {/* OTP */}

            <div>

              <label
                className="
                  block
                  text-xs
                  font-semibold
                  text-slate-700
                  dark:text-slate-300
                  mb-2
                "
              >
                Verification Code
              </label>


              <div className="relative">

                <KeyRound
                  className="
                    w-4
                    h-4
                    text-slate-400
                    absolute
                    left-3.5
                    top-1/2
                    -translate-y-1/2
                  "
                />


                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(
                    event
                  ) => {

                    setOtp(
                      event.target
                        .value
                        .replace(
                          /\D/g,
                          ''
                        )
                        .slice(
                          0,
                          6
                        )
                    );

                    setError('');

                  }}
                  placeholder="000000"
                  className="
                    w-full
                    pl-10
                    pr-4
                    py-3
                    tracking-[0.35em]
                    text-center
                    font-black
                    text-lg
                    bg-white
                    dark:bg-dark-bg
                    border
                    border-slate-300
                    dark:border-dark-border
                    rounded-xl
                    text-slate-900
                    dark:text-white
                    focus:outline-none
                    focus:border-brand-500
                    focus:ring-2
                    focus:ring-brand-500/20
                  "
                />

              </div>

            </div>


            {/* NEW PASSWORD */}

            <div>

              <label
                className="
                  block
                  text-xs
                  font-semibold
                  text-slate-700
                  dark:text-slate-300
                  mb-2
                "
              >
                New Password
              </label>


              <div className="relative">

                <Lock
                  className="
                    w-4
                    h-4
                    text-slate-400
                    absolute
                    left-3.5
                    top-1/2
                    -translate-y-1/2
                  "
                />


                <input
                  type="password"
                  value={
                    password
                  }
                  onChange={(
                    event
                  ) => {

                    setPassword(
                      event.target.value
                    );

                    setError('');

                  }}
                  placeholder="At least 6 characters"
                  className="
                    w-full
                    pl-10
                    pr-4
                    py-3
                    bg-white
                    dark:bg-dark-bg
                    border
                    border-slate-300
                    dark:border-dark-border
                    rounded-xl
                    text-sm
                    text-slate-900
                    dark:text-white
                    focus:outline-none
                    focus:border-brand-500
                    focus:ring-2
                    focus:ring-brand-500/20
                  "
                />

              </div>

            </div>


            {/* CONFIRM PASSWORD */}

            <div>

              <label
                className="
                  block
                  text-xs
                  font-semibold
                  text-slate-700
                  dark:text-slate-300
                  mb-2
                "
              >
                Confirm New Password
              </label>


              <div className="relative">

                <Lock
                  className="
                    w-4
                    h-4
                    text-slate-400
                    absolute
                    left-3.5
                    top-1/2
                    -translate-y-1/2
                  "
                />


                <input
                  type="password"
                  value={
                    confirmPassword
                  }
                  onChange={(
                    event
                  ) => {

                    setConfirmPassword(
                      event.target.value
                    );

                    setError('');

                  }}
                  placeholder="Repeat your new password"
                  className="
                    w-full
                    pl-10
                    pr-4
                    py-3
                    bg-white
                    dark:bg-dark-bg
                    border
                    border-slate-300
                    dark:border-dark-border
                    rounded-xl
                    text-sm
                    text-slate-900
                    dark:text-white
                    focus:outline-none
                    focus:border-brand-500
                    focus:ring-2
                    focus:ring-brand-500/20
                  "
                />

              </div>

            </div>


            {/* SUBMIT */}

            <button
              type="submit"
              disabled={
                loading
              }
              className="
                w-full
                py-3
                rounded-xl
                bg-brand-600
                hover:bg-brand-500
                text-white
                font-bold
                text-sm
                transition
                disabled:opacity-50
                disabled:cursor-not-allowed
                flex
                items-center
                justify-center
                gap-2
                shadow-lg
                shadow-brand-600/20
              "
            >

              {loading ? (
                <>
                  <Loader2
                    className="
                      w-4
                      h-4
                      animate-spin
                    "
                  />

                  Resetting Password...
                </>
              ) : (
                <>
                  Reset Password

                  <CheckCircle2
                    className="w-4 h-4"
                  />
                </>
              )}

            </button>

          </form>


          {/* BACK */}

          <div
            className="
              mt-6
              text-center
            "
          >

            <Link
              to="/login"
              className="
                inline-flex
                items-center
                gap-1.5
                text-xs
                font-semibold
                text-brand-600
                dark:text-brand-400
                hover:underline
              "
            >

              <ArrowLeft
                className="w-3.5 h-3.5"
              />

              Back to Login

            </Link>

          </div>

        </div>

      </main>


      <Footer />

    </div>
  );
};

export default ResetPassword;