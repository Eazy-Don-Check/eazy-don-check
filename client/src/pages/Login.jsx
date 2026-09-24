import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  useAuth,
} from '../context/AuthContext';

import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  Fingerprint,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';


// ============================================================
// BRAND LOGO
// ============================================================

const LOGO_SRC = '/eazy-don-check-logo.png';


// ============================================================
// COMPONENT
// ============================================================

const Login = () => {

  const [
    formData,
    setFormData,
  ] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });


  const [
    showPassword,
    setShowPassword,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState('');


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    biometricLoading,
    setBiometricLoading,
  ] = useState(false);


  const [
    twoFactorMode,
    setTwoFactorMode,
  ] = useState(false);


  const [
    twoFactorCode,
    setTwoFactorCode,
  ] = useState('');


  const [
    useRecoveryCode,
    setUseRecoveryCode,
  ] = useState(false);


  const twoFactorInputRef =
    useRef(null);


  const {
    login,
    verifyTwoFactorLogin,
    cancelTwoFactorLogin,
    biometricLogin,
  } = useAuth();


  const navigate =
    useNavigate();


  // ============================================================
  // BIOMETRIC AVAILABILITY
  // ============================================================

  const isBiometricAvailable = () => {
    return (
      typeof window !== 'undefined' &&
      window.isSecureContext &&
      !!window.PublicKeyCredential
    );
  };


  // ============================================================
  // FOCUS 2FA INPUT
  // ============================================================

  useEffect(() => {
    if (twoFactorMode) {
      const timer = window.setTimeout(() => {
        twoFactorInputRef.current?.focus();
      }, 50);

      return () => window.clearTimeout(timer);
    }
  }, [
    twoFactorMode,
    useRecoveryCode,
  ]);


  // ============================================================
  // HANDLE INPUT CHANGES
  // ============================================================

  const handleChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }));

    if (error) {
      setError('');
    }
  };


  // ============================================================
  // NORMAL LOGIN
  // ============================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.email.trim() ||
      !formData.password
    ) {
      setError(
        'Please provide both your email address and password.'
      );

      return;
    }

    setLoading(true);
    setError('');

    try {
      const result =
        await login(
          formData.email.trim(),
          formData.password,
          formData.rememberMe
        );

      if (
        result?.requiresTwoFactor
      ) {
        setTwoFactorMode(true);
        setTwoFactorCode('');
        setUseRecoveryCode(false);
        setLoading(false);

        return;
      }

      if (
        result?.success
      ) {
        navigate(
          '/feed',
          {
            replace: true,
          }
        );

        return;
      }

      setError(
        result?.error ||
          'Invalid email or password. Please try again.'
      );

      setLoading(false);

    } catch (err) {
      console.error(
        'Login error:',
        err
      );

      setError(
        'An unexpected error occurred. Please check your network connection.'
      );

      setLoading(false);
    }
  };


  // ============================================================
  // TWO-FACTOR LOGIN
  // ============================================================

  const handleTwoFactorSubmit =
    async (e) => {

      e.preventDefault();

      const code =
        String(
          twoFactorCode || ''
        ).trim();

      if (!code) {
        setError(
          useRecoveryCode
            ? 'Enter one of your recovery codes.'
            : 'Enter the 6-digit authentication code.'
        );

        return;
      }

      if (
        !useRecoveryCode &&
        !/^\d{6}$/.test(code)
      ) {
        setError(
          'Your authentication code must contain 6 digits.'
        );

        return;
      }

      setLoading(true);
      setError('');

      try {
        const result =
          await verifyTwoFactorLogin(
            code
          );

        if (
          result?.success
        ) {
          navigate(
            '/feed',
            {
              replace: true,
            }
          );

          return;
        }

        setError(
          result?.error ||
            'Two-factor verification failed.'
        );

        setLoading(false);

      } catch (err) {
        console.error(
          'Two-factor verification error:',
          err
        );

        setError(
          'Unable to verify your authentication code. Please try again.'
        );

        setLoading(false);
      }
    };


  // ============================================================
  // CANCEL TWO-FACTOR
  // ============================================================

  const handleCancelTwoFactor = () => {

    cancelTwoFactorLogin();

    setTwoFactorMode(false);
    setTwoFactorCode('');
    setUseRecoveryCode(false);
    setError('');
  };


  // ============================================================
  // BIOMETRIC LOGIN
  // ============================================================

  const handleBiometricLogin =
    async () => {

      if (
        !formData.email.trim()
      ) {
        setError(
          'Enter your email address or username before using biometric login.'
        );

        return;
      }

      if (
        !isBiometricAvailable()
      ) {
        setError(
          'Biometric login requires a supported browser in a secure context (HTTPS or localhost).'
        );

        return;
      }

      setBiometricLoading(true);
      setError('');

      try {
        const result =
          await biometricLogin(
            formData.email.trim()
          );

        if (
          result?.success
        ) {
          navigate(
            '/feed',
            {
              replace: true,
            }
          );

          return;
        }

        setError(
          result?.error ||
            'Biometric login failed.'
        );

      } catch (err) {

        console.error(
          'Biometric login error:',
          err
        );

        setError(
          'Unable to complete biometric login. Please try again.'
        );

      } finally {
        setBiometricLoading(false);
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
        bg-gray-50
        dark:bg-dark-bg
        text-gray-900
        dark:text-gray-100
        transition-colors
        duration-300
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
          py-10
          sm:px-6
          lg:px-8
        "
      >

        <div
          className="
            w-full
            max-w-md
          "
        >

          {/* ==================================================
              LOGIN CARD
          ================================================== */}

          <div
            className="
              bg-white
              dark:bg-dark-card
              border
              border-gray-200
              dark:border-dark-border
              rounded-2xl
              shadow-xl
              overflow-hidden
            "
          >

            {/* ==================================================
                HEADER
            ================================================== */}

            <div
              className="
                px-6
                pt-8
                pb-6
                text-center
              "
            >

              {/* LOGO */}

              <div
                className="
                  mx-auto
                  mb-4
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-white
                  border
                  border-slate-200
                  dark:border-slate-200
                  overflow-hidden
                  shadow-sm
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
                  text-gray-900
                  dark:text-white
                "
              >
                Welcome Back
              </h1>


              <p
                className="
                  mt-2
                  text-sm
                  text-gray-500
                  dark:text-gray-400
                "
              >
                Sign in to your EAZY DON CHECK account
              </p>

            </div>


            <div
              className="
                px-6
                pb-7
              "
            >

              {/* ERROR */}

              {error && (
                <div
                  className="
                    mb-5
                    flex
                    items-start
                    gap-3
                    rounded-lg
                    border
                    border-red-200
                    dark:border-red-900/50
                    bg-red-50
                    dark:bg-red-950/30
                    px-4
                    py-3
                    text-sm
                    text-red-700
                    dark:text-red-300
                  "
                >

                  <AlertCircle
                    className="
                      mt-0.5
                      h-5
                      w-5
                      flex-shrink-0
                    "
                  />

                  <p className="leading-5">
                    {error}
                  </p>

                </div>
              )}


              {/* =================================================
                  TWO-FACTOR AUTHENTICATION
              ================================================= */}

              {twoFactorMode ? (

                <form
                  onSubmit={
                    handleTwoFactorSubmit
                  }
                  className="space-y-5"
                >

                  <div
                    className="
                      text-center
                      mb-6
                    "
                  >

                    <div
                      className="
                        mx-auto
                        mb-3
                        flex
                        h-12
                        w-12
                        items-center
                        justify-center
                        rounded-full
                        bg-brand-600/10
                        dark:bg-brand-500/10
                      "
                    >
                      <KeyRound
                        className="
                          w-6
                          h-6
                          text-brand-600
                          dark:text-brand-400
                        "
                      />
                    </div>


                    <h2
                      className="
                        text-lg
                        font-semibold
                        text-gray-900
                        dark:text-white
                      "
                    >
                      Two-Factor Authentication
                    </h2>


                    <p
                      className="
                        mt-1
                        text-sm
                        text-gray-500
                        dark:text-gray-400
                      "
                    >
                      {useRecoveryCode
                        ? 'Enter one of your recovery codes.'
                        : 'Enter the authentication code from your authenticator app.'}
                    </p>

                  </div>


                  {/* 2FA INPUT */}

                  <div>

                    <label
                      htmlFor="twoFactorCode"
                      className="
                        block
                        mb-2
                        text-sm
                        font-medium
                        text-gray-700
                        dark:text-gray-300
                      "
                    >
                      {useRecoveryCode
                        ? 'Recovery Code'
                        : 'Authentication Code'}
                    </label>


                    <input
                      ref={twoFactorInputRef}
                      id="twoFactorCode"
                      name="twoFactorCode"
                      type="text"
                      inputMode={
                        useRecoveryCode
                          ? 'text'
                          : 'numeric'
                      }
                      autoComplete="one-time-code"
                      value={twoFactorCode}
                      onChange={(e) => {
                        setTwoFactorCode(
                          e.target.value
                        );

                        if (error) {
                          setError('');
                        }
                      }}
                      placeholder={
                        useRecoveryCode
                          ? 'Enter recovery code'
                          : '000000'
                      }
                      maxLength={
                        useRecoveryCode
                          ? 64
                          : 6
                      }
                      className="
                        w-full
                        rounded-lg
                        border
                        border-gray-300
                        dark:border-dark-border
                        bg-white
                        dark:bg-dark-bg
                        px-4
                        py-3
                        text-sm
                        text-gray-900
                        dark:text-white
                        placeholder-gray-400
                        dark:placeholder-gray-500
                        outline-none
                        transition
                        focus:border-brand-500
                        focus:ring-2
                        focus:ring-brand-500/20
                      "
                    />

                  </div>


                  {/* SUBMIT */}

                  <button
                    type="submit"
                    disabled={loading}
                    className="
                      w-full
                      py-3
                      px-4
                      bg-brand-600
                      hover:bg-brand-500
                      text-white
                      font-semibold
                      rounded-lg
                      shadow-lg
                      shadow-brand-600/20
                      transition-all
                      flex
                      items-center
                      justify-center
                      gap-2
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                    "
                  >

                    {loading ? (
                      <>
                        <Loader2
                          className="
                            w-5
                            h-5
                            animate-spin
                          "
                        />

                        <span>
                          Verifying...
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          Verify & Continue
                        </span>

                        <ArrowRight
                          className="w-4 h-4"
                        />
                      </>
                    )}

                  </button>


                  {/* RECOVERY SWITCH */}

                  <button
                    type="button"
                    onClick={() => {
                      setUseRecoveryCode(
                        (prev) => !prev
                      );

                      setTwoFactorCode('');
                      setError('');
                    }}
                    className="
                      w-full
                      text-sm
                      text-brand-600
                      dark:text-brand-400
                      hover:text-brand-500
                      font-medium
                      transition-colors
                    "
                  >
                    {useRecoveryCode
                      ? 'Use authenticator code instead'
                      : 'Use a recovery code instead'}
                  </button>


                  {/* BACK */}

                  <button
                    type="button"
                    onClick={
                      handleCancelTwoFactor
                    }
                    className="
                      w-full
                      flex
                      items-center
                      justify-center
                      gap-2
                      text-sm
                      text-gray-500
                      dark:text-gray-400
                      hover:text-gray-700
                      dark:hover:text-gray-200
                      transition-colors
                    "
                  >

                    <ArrowLeft
                      className="w-4 h-4"
                    />

                    Back to sign in

                  </button>

                </form>

              ) : (

                /* =================================================
                   NORMAL LOGIN
                ================================================= */

                <form
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >

                  {/* EMAIL / USERNAME */}

                  <div>

                    <label
                      htmlFor="email"
                      className="
                        block
                        mb-2
                        text-sm
                        font-medium
                        text-gray-700
                        dark:text-gray-300
                      "
                    >
                      Email or Username
                    </label>


                    <div className="relative">

                      <Mail
                        className="
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          w-5
                          h-5
                          text-gray-400
                          dark:text-gray-500
                          pointer-events-none
                        "
                      />


                      <input
                        id="email"
                        name="email"
                        type="text"
                        autoComplete="username"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email or username"
                        className="
                          w-full
                          rounded-lg
                          border
                          border-gray-300
                          dark:border-dark-border
                          bg-white
                          dark:bg-dark-bg
                          pl-11
                          pr-4
                          py-3
                          text-sm
                          text-gray-900
                          dark:text-white
                          placeholder-gray-400
                          dark:placeholder-gray-500
                          outline-none
                          transition
                          focus:border-brand-500
                          focus:ring-2
                          focus:ring-brand-500/20
                        "
                      />

                    </div>

                  </div>


                  {/* PASSWORD */}

                  <div>

                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        mb-2
                      "
                    >

                      <label
                        htmlFor="password"
                        className="
                          text-sm
                          font-medium
                          text-gray-700
                          dark:text-gray-300
                        "
                      >
                        Password
                      </label>


                      <Link
                        to="/forgot-password"
                        className="
                          text-xs
                          font-medium
                          text-brand-600
                          dark:text-brand-400
                          hover:text-brand-500
                          transition-colors
                        "
                      >
                        Forgot password?
                      </Link>

                    </div>


                    <div className="relative">

                      <Lock
                        className="
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          w-5
                          h-5
                          text-gray-400
                          dark:text-gray-500
                          pointer-events-none
                        "
                      />


                      <input
                        id="password"
                        name="password"
                        type={
                          showPassword
                            ? 'text'
                            : 'password'
                        }
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        className="
                          w-full
                          rounded-lg
                          border
                          border-gray-300
                          dark:border-dark-border
                          bg-white
                          dark:bg-dark-bg
                          pl-11
                          pr-11
                          py-3
                          text-sm
                          text-gray-900
                          dark:text-white
                          placeholder-gray-400
                          dark:placeholder-gray-500
                          outline-none
                          transition
                          focus:border-brand-500
                          focus:ring-2
                          focus:ring-brand-500/20
                        "
                      />


                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (prev) => !prev
                          )
                        }
                        className="
                          absolute
                          right-3
                          top-1/2
                          -translate-y-1/2
                          text-gray-400
                          dark:text-gray-500
                          hover:text-gray-700
                          dark:hover:text-gray-200
                          transition-colors
                        "
                        aria-label={
                          showPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                      >
                        {showPassword ? (
                          <EyeOff
                            className="w-5 h-5"
                          />
                        ) : (
                          <Eye
                            className="w-5 h-5"
                          />
                        )}
                      </button>

                    </div>

                  </div>


                  {/* REMEMBER ME */}

                  <div
                    className="
                      flex
                      items-center
                    "
                  >

                    <label
                      className="
                        flex
                        items-center
                        gap-2
                        cursor-pointer
                        select-none
                      "
                    >

                      <input
                        type="checkbox"
                        name="rememberMe"
                        checked={
                          formData.rememberMe
                        }
                        onChange={handleChange}
                        className="
                          h-4
                          w-4
                          rounded
                          border-gray-300
                          dark:border-dark-border
                          text-brand-600
                          focus:ring-brand-500
                          bg-white
                          dark:bg-dark-bg
                        "
                      />

                      <span
                        className="
                          text-sm
                          text-gray-600
                          dark:text-gray-400
                        "
                      >
                        Remember me
                      </span>

                    </label>

                  </div>


                  {/* SIGN IN + BIOMETRIC */}

                  <div
                    className="
                      flex
                      gap-2
                      pt-1
                    "
                  >

                    {/* SIGN IN */}

                    <button
                      type="submit"
                      disabled={
                        loading ||
                        biometricLoading
                      }
                      className="
                        flex-1
                        py-2.5
                        px-4
                        bg-brand-600
                        hover:bg-brand-500
                        text-white
                        font-semibold
                        text-sm
                        rounded-lg
                        shadow-lg
                        shadow-brand-600/30
                        hover:scale-[1.01]
                        active:scale-[0.99]
                        transition-all
                        flex
                        items-center
                        justify-center
                        gap-2
                        disabled:opacity-50
                        disabled:cursor-not-allowed
                        disabled:hover:scale-100
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

                          <span>
                            Authenticating...
                          </span>
                        </>
                      ) : (
                        <>
                          <span>
                            Sign In
                          </span>

                          <ArrowRight
                            className="w-4 h-4"
                          />
                        </>
                      )}

                    </button>


                    {/* BIOMETRIC */}

                    {isBiometricAvailable() && (
                      <button
                        type="button"
                        onClick={
                          handleBiometricLogin
                        }
                        disabled={
                          loading ||
                          biometricLoading
                        }
                        className="
                          w-[52px]
                          flex-shrink-0
                          py-2.5
                          px-3
                          border
                          border-brand-500/30
                          bg-brand-500/5
                          text-brand-700
                          dark:text-brand-300
                          rounded-lg
                          hover:bg-brand-500/10
                          hover:border-brand-500/50
                          transition-all
                          flex
                          items-center
                          justify-center
                          disabled:opacity-50
                          disabled:cursor-not-allowed
                        "
                        title="Login with fingerprint or device biometric"
                        aria-label="Login with fingerprint or biometric"
                      >

                        {biometricLoading ? (
                          <Loader2
                            className="
                              w-5
                              h-5
                              animate-spin
                            "
                          />
                        ) : (
                          <Fingerprint
                            className="w-5 h-5"
                          />
                        )}

                      </button>
                    )}

                  </div>


                  {/* BIOMETRIC NOTE */}

                  {isBiometricAvailable() && (
                    <p
                      className="
                        text-center
                        text-xs
                        text-gray-400
                        dark:text-gray-500
                      "
                    >
                      Use your device's secure biometric authenticator.
                    </p>
                  )}


                  {/* REGISTER */}

                  <div
                    className="
                      pt-3
                      border-t
                      border-gray-200
                      dark:border-dark-border
                      text-center
                    "
                  >

                    <p
                      className="
                        text-sm
                        text-gray-500
                        dark:text-gray-400
                      "
                    >
                      Don't have an account?{' '}

                      <Link
                        to="/signup"
                        className="
                          font-semibold
                          text-brand-600
                          dark:text-brand-400
                          hover:text-brand-500
                          transition-colors
                        "
                      >
                        Create an account
                      </Link>

                    </p>

                  </div>

                </form>

              )}

            </div>

          </div>

        </div>

      </main>


      <Footer />

    </div>
  );
};

export default Login;