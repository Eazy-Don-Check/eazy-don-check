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

import BackgroundSlider from '../components/layout/BackgroundSlider';

import {
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

      return () =>
        window.clearTimeout(timer);
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
    <BackgroundSlider
      page="login"
      interval={6000}
      overlay="dark"
    >

      <div
        className="
          min-h-screen
          flex
          flex-col
          text-slate-100
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
            py-6
            sm:px-6
            sm:py-8
            lg:px-8
            relative
            overflow-hidden
          "
        >

          {/* ==================================================
              BACKGROUND GLOW
          ================================================== */}

          <div
            className="
              absolute
              top-1/4
              left-1/2
              -translate-x-1/2
              w-[360px]
              h-[360px]
              sm:w-[420px]
              sm:h-[420px]
              bg-brand-500/10
              rounded-full
              blur-[120px]
              pointer-events-none
            "
          />

          <div
            className="
              w-full
              max-w-[360px]
              relative
              z-10
            "
          >

            {/* ==================================================
                LOGIN CARD
            ================================================== */}

            <div
              className="
                w-full
                rounded-3xl
                border
                border-white/25
                bg-white/10
                dark:bg-slate-950/25
                backdrop-blur-2xl
                shadow-[0_20px_70px_rgba(0,0,0,0.28)]
                ring-1
                ring-white/10
                overflow-hidden
              "
            >

              {/* ==================================================
                  HEADER
              ================================================== */}

              <div
                className="
                  px-5
                  pt-5
                  pb-3
                  sm:px-6
                  sm:pt-6
                "
              >

                {/* LOGO */}

                <div
                  className="
                    mx-auto
                    mb-2.5
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-xl
                    bg-white/90
                    border
                    border-white/40
                    overflow-hidden
                    shadow-lg
                    shadow-black/10
                  "
                >

                  <img
                    src={LOGO_SRC}
                    alt="EAZY DON CHECK"
                    className="
                      w-8
                      h-8
                      object-contain
                      block
                    "
                    draggable="false"
                  />

                </div>

                <h1
                  className="
                    text-lg
                    sm:text-xl
                    font-bold
                    text-white
                    text-center
                  "
                >
                  Welcome Back
                </h1>

                <p
                  className="
                    mt-1
                    text-[11px]
                    sm:text-xs
                    text-white/60
                    text-center
                  "
                >
                  Sign in to your EAZY DON CHECK account
                </p>

              </div>

              <div
                className="
                  px-5
                  pb-5
                  sm:px-6
                  sm:pb-6
                "
              >

                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (
                  <div
                    className="
                      mb-3.5
                      flex
                      items-start
                      gap-2
                      rounded-xl
                      border
                      border-red-400/30
                      bg-red-500/10
                      backdrop-blur-md
                      px-3
                      py-2.5
                      text-xs
                      text-red-200
                    "
                  >

                    <AlertCircle
                      className="
                        mt-0.5
                        h-4
                        w-4
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
                    className="space-y-3.5"
                  >

                    <div
                      className="
                        text-center
                        mb-3
                      "
                    >

                      <div
                        className="
                          mx-auto
                          mb-2
                          flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-full
                          bg-brand-500/10
                          border
                          border-brand-400/20
                          backdrop-blur-md
                        "
                      >

                        <KeyRound
                          className="
                            w-4.5
                            h-4.5
                            text-brand-300
                          "
                        />

                      </div>

                      <h2
                        className="
                          text-sm
                          font-semibold
                          text-white
                        "
                      >
                        Two-Factor Authentication
                      </h2>

                      <p
                        className="
                          mt-1
                          text-[11px]
                          leading-4
                          text-white/55
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
                          mb-1.5
                          text-xs
                          font-medium
                          text-white/75
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
                          rounded-xl
                          border
                          border-white/20
                          bg-white/10
                          backdrop-blur-md
                          px-3.5
                          py-2.5
                          text-sm
                          text-white
                          placeholder-white/35
                          outline-none
                          transition
                          focus:border-brand-400
                          focus:ring-1
                          focus:ring-brand-400/40
                        "
                      />

                    </div>

                    {/* SUBMIT */}

                    <button
                      type="submit"
                      disabled={loading}
                      className="
                        w-full
                        py-2.5
                        px-4
                        bg-brand-600
                        hover:bg-brand-500
                        text-white
                        font-semibold
                        text-sm
                        rounded-xl
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
                              w-4
                              h-4
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
                        text-xs
                        text-brand-300
                        hover:text-brand-200
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
                        text-xs
                        text-white/50
                        hover:text-white/80
                        transition-colors
                      "
                    >

                      <ArrowLeft
                        className="w-3.5 h-3.5"
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
                    className="space-y-3.5"
                  >

                    {/* EMAIL / USERNAME */}

                    <div>

                      <label
                        htmlFor="email"
                        className="
                          block
                          mb-1.5
                          text-xs
                          font-medium
                          text-white/75
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
                            w-4
                            h-4
                            text-white/40
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
                            rounded-xl
                            border
                            border-white/20
                            bg-white/10
                            backdrop-blur-md
                            pl-10
                            pr-3
                            py-2.5
                            text-sm
                            text-white
                            placeholder-white/35
                            outline-none
                            transition
                            focus:border-brand-400
                            focus:ring-1
                            focus:ring-brand-400/40
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
                          mb-1.5
                        "
                      >

                        <label
                          htmlFor="password"
                          className="
                            text-xs
                            font-medium
                            text-white/75
                          "
                        >
                          Password
                        </label>

                        <Link
                          to="/forgot-password"
                          className="
                            text-[11px]
                            font-medium
                            text-brand-300
                            hover:text-brand-200
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
                            w-4
                            h-4
                            text-white/40
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
                            rounded-xl
                            border
                            border-white/20
                            bg-white/10
                            backdrop-blur-md
                            pl-10
                            pr-10
                            py-2.5
                            text-sm
                            text-white
                            placeholder-white/35
                            outline-none
                            transition
                            focus:border-brand-400
                            focus:ring-1
                            focus:ring-brand-400/40
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
                            text-white/40
                            hover:text-white/80
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
                              className="w-4 h-4"
                            />
                          ) : (
                            <Eye
                              className="w-4 h-4"
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
                            h-3.5
                            w-3.5
                            rounded
                            border-white/30
                            text-brand-600
                            focus:ring-brand-500
                            bg-white/10
                          "
                        />

                        <span
                          className="
                            text-xs
                            text-white/55
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
                        pt-0.5
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
                          rounded-xl
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
                            w-[46px]
                            flex-shrink-0
                            py-2.5
                            px-2.5
                            border
                            border-brand-400/30
                            bg-brand-500/10
                            backdrop-blur-md
                            text-brand-200
                            rounded-xl
                            hover:bg-brand-500/20
                            hover:border-brand-400/50
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
                                w-4.5
                                h-4.5
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
                          text-[10px]
                          text-white/40
                        "
                      >
                        Use your device's secure biometric authenticator.
                      </p>
                    )}

                    {/* REGISTER */}

                    <div
                      className="
                        pt-2.5
                        border-t
                        border-white/15
                        text-center
                      "
                    >

                      <p
                        className="
                          text-xs
                          text-white/50
                        "
                      >
                        Don't have an account?{' '}

                        <Link
                          to="/signup"
                          className="
                            font-semibold
                            text-brand-300
                            hover:text-brand-200
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

    </BackgroundSlider>
  );
};

export default Login;