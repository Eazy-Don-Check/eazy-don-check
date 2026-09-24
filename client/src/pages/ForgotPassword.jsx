import React, {
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  Mail,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Loader2,
  Smartphone,
  KeyRound,
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

const ForgotPassword = () => {

  const navigate =
    useNavigate();


  const [
    identifier,
    setIdentifier,
  ] = useState('');


  const [
    channel,
    setChannel,
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


  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit =
    async (event) => {

      event.preventDefault();

      setError('');
      setSuccess('');

      if (
        !identifier.trim()
      ) {
        setError(
          'Please enter your registered email address or phone number.'
        );

        return;
      }

      if (!channel) {
        setError(
          'Please choose Email or Phone.'
        );

        return;
      }

      setLoading(true);

      try {

        const response =
          await apiClient.post(
            '/auth/forgot-password/send-otp',
            {
              identifier:
                identifier.trim(),

              channel,
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
              'Unable to send verification code.'
          );
        }


        const resetRequestId =
          data.data
            ?.resetRequestId;


        /*
         * If the account does not exist,
         * the server intentionally does not
         * expose that fact.
         */

        if (
          !resetRequestId
        ) {

          setSuccess(
            data.message ||
              'If an account exists, a verification code has been sent.'
          );

          return;
        }


        navigate(
          `/reset-password?requestId=${encodeURIComponent(
            resetRequestId
          )}&channel=${encodeURIComponent(
            channel
          )}&destination=${encodeURIComponent(
            data.data
              ?.destination ||
              ''
          )}`,
          {
            replace: true,
          }
        );

      } catch (requestError) {

        console.error(
          'Forgot password error:',
          requestError
        );

        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
            requestError?.message ||
            'Unable to send password reset code.'
        );

      } finally {

        setLoading(false);

      }
    };


  // ============================================================
  // RENDER
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
              Forgot Password?
            </h1>


            <p
              className="
                text-sm
                text-slate-500
                dark:text-slate-400
                mt-2
              "
            >
              Verify your identity and
              create a new password.
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
            className="space-y-5"
          >

            {/* IDENTIFIER */}

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
                Email or Phone Number
              </label>


              <div className="relative">

                <Mail
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
                  value={
                    identifier
                  }
                  onChange={(
                    event
                  ) => {

                    setIdentifier(
                      event.target.value
                    );

                    setError('');
                    setSuccess('');

                  }}
                  placeholder="name@example.com or +234..."
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


            {/* CHANNEL */}

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
                Send verification code via
              </label>


              <div
                className="
                  grid
                  grid-cols-2
                  gap-3
                "
              >

                {/* EMAIL */}

                <button
                  type="button"
                  onClick={() => {

                    setChannel(
                      'email'
                    );

                    setError('');

                  }}
                  className={`
                    p-4
                    rounded-xl
                    border
                    text-left
                    transition
                    ${
                      channel === 'email'
                        ? 'border-brand-500 bg-brand-500/10 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-brand-400'
                    }
                  `}
                >

                  <Mail
                    className="
                      w-5
                      h-5
                      text-brand-500
                      mb-2
                    "
                  />


                  <p
                    className="
                      text-xs
                      font-bold
                      text-slate-900
                      dark:text-white
                    "
                  >
                    Email
                  </p>


                  <p
                    className="
                      text-[10px]
                      text-slate-500
                      mt-1
                    "
                  >
                    Send code to email
                  </p>

                </button>


                {/* PHONE */}

                <button
                  type="button"
                  onClick={() => {

                    setChannel(
                      'phone'
                    );

                    setError('');

                  }}
                  className={`
                    p-4
                    rounded-xl
                    border
                    text-left
                    transition
                    ${
                      channel === 'phone'
                        ? 'border-brand-500 bg-brand-500/10 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-brand-400'
                    }
                  `}
                >

                  <Smartphone
                    className="
                      w-5
                      h-5
                      text-brand-500
                      mb-2
                    "
                  />


                  <p
                    className="
                      text-xs
                      font-bold
                      text-slate-900
                      dark:text-white
                    "
                  >
                    Phone
                  </p>


                  <p
                    className="
                      text-[10px]
                      text-slate-500
                      mt-1
                    "
                  >
                    Send code by SMS
                  </p>

                </button>

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

                  Sending Code...
                </>
              ) : (
                <>
                  Send Verification Code

                  <ArrowRight
                    className="w-4 h-4"
                  />
                </>
              )}

            </button>

          </form>


          {/* BACK TO LOGIN */}

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

export default ForgotPassword;