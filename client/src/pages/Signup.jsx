import React, {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  MapPin,
  Phone,
  GraduationCap,
  Camera,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Smartphone,
  RefreshCw,
  KeyRound,
} from 'lucide-react';

import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

import apiClient from '../utils/apiClient';


const Signup = () => {

  const totalSteps = 6;

  const [step, setStep] =
    useState(1);

  const [formData, setFormData] =
    useState({
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      location: '',
      gender: 'Not Specified',
      relationshipStatus: 'Single',
      highestQualification: '',
      institution: '',
      courseOfStudy: '',
      graduationYear: '',
      avatarUrl: '',
    });

  const [
    registrationId,
    setRegistrationId,
  ] = useState('');

  const [
    verificationChannel,
    setVerificationChannel,
  ] = useState('');

  const [
    maskedDestination,
    setMaskedDestination,
  ] = useState('');

  const [
    otp,
    setOtp,
  ] = useState('');

  const [
    otpSent,
    setOtpSent,
  ] = useState(false);

  const [
    resendAvailableAt,
    setResendAvailableAt,
  ] = useState(null);

  const [
    countdown,
    setCountdown,
  ] = useState(0);

  const [
    verified,
    setVerified,
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
    loading,
    setLoading,
  ] = useState(false);

  const navigate =
    useNavigate();


  // ==========================================================
  // COUNTDOWN
  // ==========================================================

  useEffect(() => {

    if (!resendAvailableAt) {
      setCountdown(0);
      return undefined;
    }

    const timer =
      window.setInterval(() => {

        const remaining =
          Math.max(
            0,
            Math.ceil(
              (resendAvailableAt -
                Date.now()) /
                1000
            )
          );

        setCountdown(
          remaining
        );

        if (remaining <= 0) {

          window.clearInterval(
            timer
          );

          setResendAvailableAt(
            null
          );
        }

      }, 1000);

    return () =>
      window.clearInterval(
        timer
      );

  }, [
    resendAvailableAt,
  ]);


  // ==========================================================
  // FORM CHANGE
  // ==========================================================

  const handleChange = (
    event
  ) => {

    const {
      name,
      value,
    } = event.target;

    setFormData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    setError('');
    setSuccess('');
  };


  // ==========================================================
  // STEP VALIDATION
  // ==========================================================

  const validateStep =
    () => {

      setError('');

      if (step === 1) {

        if (
          !formData.name.trim() ||
          !formData.username.trim() ||
          !formData.email.trim() ||
          !formData.password ||
          !formData.confirmPassword
        ) {

          setError(
            'Please fill out all basic information fields.'
          );

          return false;
        }

        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            formData.email.trim()
          )
        ) {

          setError(
            'Please provide a valid email address.'
          );

          return false;
        }

        if (
          formData.password.length <
          6
        ) {

          setError(
            'Password must be at least 6 characters long.'
          );

          return false;
        }

        if (
          formData.password !==
          formData.confirmPassword
        ) {

          setError(
            'Passwords do not match.'
          );

          return false;
        }
      }

      if (step === 2) {

        if (
          !formData.phone.trim() ||
          !formData.location.trim()
        ) {

          setError(
            'Please fill out your phone number and location.'
          );

          return false;
        }
      }

      if (step === 3) {

        if (
          !formData.highestQualification ||
          !formData.institution.trim()
        ) {

          setError(
            'Please provide your educational qualifications.'
          );

          return false;
        }
      }

      return true;
    };


  // ==========================================================
  // NEXT STEP
  // ==========================================================

  const nextStep = () => {

    if (!validateStep()) {
      return;
    }

    setStep(
      (previous) =>
        Math.min(
          previous + 1,
          totalSteps
        )
    );
  };


  // ==========================================================
  // PREVIOUS STEP
  // ==========================================================

  const prevStep = () => {

    if (step === 6) {

      /*
       * Do not allow going backward after
       * the OTP registration request has started.
       *
       * This prevents changing registration data
       * after the backend has created the pending
       * registration.
       */

      if (registrationId) {

        setError(
          'Please complete identity verification before leaving this step.'
        );

        return;
      }
    }

    setError('');

    setStep(
      (previous) =>
        Math.max(
          previous - 1,
          1
        )
    );
  };


  // ==========================================================
  // START REGISTRATION
  // ==========================================================

  const startRegistration =
    async () => {

      setLoading(true);
      setError('');
      setSuccess('');

      try {

        const response =
          await apiClient.post(
            '/auth/register/start',
            {
              name:
                formData.name.trim(),

              username:
                formData.username
                  .trim(),

              email:
                formData.email
                  .trim()
                  .toLowerCase(),

              password:
                formData.password,

              phone:
                formData.phone.trim(),

              location:
                formData.location.trim(),

              gender:
                formData.gender,

              relationshipStatus:
                formData.relationshipStatus,

              education: {
                highestQualification:
                  formData.highestQualification,

                institution:
                  formData.institution,

                courseOfStudy:
                  formData.courseOfStudy,

                graduationYear:
                  formData.graduationYear,
              },

              avatarUrl:
                formData.avatarUrl
                  .trim(),
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
              'Unable to start registration.'
          );
        }

        const registration =
          data.data || {};

        if (
          !registration.registrationId
        ) {

          throw new Error(
            'The server did not return a registration ID.'
          );
        }

        setRegistrationId(
          registration.registrationId
        );

        setMaskedDestination(
          ''
        );

        setStep(6);

        setSuccess(
          'Your registration details are ready. Choose where you want to receive your verification code.'
        );

      } catch (requestError) {

        console.error(
          'Start registration error:',
          requestError
        );

        setError(
          requestError
            ?.response?.data
            ?.message ||
            requestError?.message ||
            'Unable to start registration.'
        );

      } finally {

        setLoading(false);
      }
    };


  // ==========================================================
  // SEND OTP
  // ==========================================================

  const sendOtp = async (
    channel,
    force = false
  ) => {

    if (
      !registrationId
    ) {

      setError(
        'Your registration session is missing. Please start signup again.'
      );

      return;
    }

    if (
      !force &&
      countdown > 0
    ) {

      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {

      const response =
        await apiClient.post(
          '/auth/register/send-otp',
          {
            registrationId,
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

      setVerificationChannel(
        channel
      );

      setMaskedDestination(
        data.data?.destination ||
          ''
      );

      setOtpSent(true);

      setOtp('');

      const seconds =
        Number(
          data.data?.expiresAt
            ? 60
            : 60
        );

      setResendAvailableAt(
        Date.now() +
          seconds * 1000
      );

      setSuccess(
        channel === 'email'
          ? 'A verification code has been sent to your email.'
          : 'A verification code has been sent to your phone.'
      );

    } catch (requestError) {

      console.error(
        'Send signup OTP error:',
        requestError
      );

      setError(
        requestError
          ?.response?.data
          ?.message ||
          requestError?.message ||
          'Unable to send verification code.'
      );

    } finally {

      setLoading(false);
    }
  };


  // ==========================================================
  // VERIFY OTP
  // ==========================================================

  const verifyOtp =
    async () => {

      if (
        !registrationId
      ) {

        setError(
          'Registration session not found.'
        );

        return;
      }

      if (
        !verificationChannel
      ) {

        setError(
          'Please select Email or Phone first.'
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

      setLoading(true);
      setError('');
      setSuccess('');

      try {

        const response =
          await apiClient.post(
            '/auth/register/verify-otp',
            {
              registrationId,

              channel:
                verificationChannel,

              otp:
                otp.trim(),
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
              'Verification failed.'
          );
        }

        setVerified(true);

        setOtpSent(false);

        setSuccess(
          'Your identity has been verified and your account has been created successfully.'
        );

        window.setTimeout(
          () => {

            navigate(
              '/login',
              {
                replace: true,

                state: {
                  message:
                    'Account verified successfully. You can now log in.',
                },
              }
            );

          },
          1800
        );

      } catch (requestError) {

        console.error(
          'Verify signup OTP error:',
          requestError
        );

        setError(
          requestError
            ?.response?.data
            ?.message ||
            requestError?.message ||
            'Verification failed.'
        );

      } finally {

        setLoading(false);
      }
    };


  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit =
    async (event) => {

      event.preventDefault();

      if (step < 5) {

        nextStep();

        return;
      }

      if (step === 5) {

        await startRegistration();
      }
    };


  // ==========================================================
  // RENDER
  // ==========================================================

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
        transition-colors
        duration-200
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
            max-w-lg
            bg-white/90
            dark:bg-slate-900/80
            backdrop-blur-md
            border
            border-slate-200
            dark:border-slate-800
            shadow-xl
            dark:shadow-2xl
            rounded-2xl
            p-8
            relative
            z-10
          "
        >

          {/* HEADER */}

          <div
            className="
              text-center
              mb-6
            "
          >

            {/* LOGO */}

            <div
              className="
                w-12
                h-12
                rounded-xl
                bg-white
                border
                border-slate-200
                dark:border-slate-200
                flex
                items-center
                justify-center
                mx-auto
                mb-3
                overflow-hidden
                shadow-sm
              "
            >

              <img
                src="/eazy-don-check-logo.png"
                alt="EAZY DON CHECK"
                className="
                  w-9
                  h-9
                  object-contain
                  rounded-lg
                  block
                "
                onError={(event) => {
                  event.currentTarget.style.display =
                    'none';
                }}
              />

            </div>


            <h2
              className="
                text-2xl
                font-bold
                text-slate-900
                dark:text-white
              "
            >
              {step === 6
                ? 'Verify Your Identity'
                : 'Create Your Profile'}
            </h2>


            <p
              className="
                text-xs
                text-slate-500
                dark:text-slate-400
                mt-1
              "
            >
              Step{' '}

              <span
                className="
                  font-bold
                  text-brand-600
                  dark:text-brand-500
                "
              >
                {step}
              </span>{' '}

              of {totalSteps}
            </p>


            <div
              className="
                w-full
                bg-slate-200
                dark:bg-slate-800
                h-1.5
                rounded-full
                mt-4
                overflow-hidden
              "
            >

              <div
                className="
                  bg-brand-600
                  dark:bg-brand-500
                  h-full
                  transition-all
                  duration-300
                "
                style={{
                  width: `${
                    (step /
                      totalSteps) *
                    100
                  }%`,
                }}
              />

            </div>

          </div>


          {/* ERROR */}

          {error && (
            <div
              className="
                mb-4
                p-3
                rounded-lg
                bg-red-500/10
                border
                border-red-500/30
                text-red-600
                dark:text-red-400
                text-xs
                flex
                items-start
                gap-2
              "
            >

              <AlertCircle
                className="
                  w-4
                  h-4
                  shrink-0
                  mt-0.5
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
                mb-4
                p-3
                rounded-lg
                bg-emerald-500/10
                border
                border-emerald-500/30
                text-emerald-600
                dark:text-emerald-400
                text-xs
                flex
                items-start
                gap-2
              "
            >

              <CheckCircle2
                className="
                  w-4
                  h-4
                  shrink-0
                "
              />

              <span>
                {success}
              </span>

            </div>
          )}


          <form
            onSubmit={
              handleSubmit
            }
          >

            {/* ==================================================
                STEP 1
            ================================================== */}

            {step === 1 && (
              <div
                className="
                  space-y-4
                  animate-fadeIn
                "
              >

                <h3
                  className="
                    text-xs
                    font-black
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  1. Basic Information
                </h3>


                <div>

                  <label
                    className="
                      block
                      text-xs
                      font-medium
                      text-slate-700
                      dark:text-slate-300
                      mb-1
                    "
                  >
                    Full Name
                  </label>


                  <div className="relative">

                    <User
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
                      name="name"
                      value={
                        formData.name
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="John Doe"
                      className="
                        w-full
                        pl-10
                        pr-4
                        py-2.5
                        bg-white
                        dark:bg-dark-bg/80
                        border
                        border-slate-300
                        dark:border-dark-border
                        rounded-lg
                        text-sm
                        text-slate-900
                        dark:text-white
                        focus:outline-none
                        focus:border-brand-500
                      "
                    />

                  </div>

                </div>


                <div>

                  <label
                    className="
                      block
                      text-xs
                      font-medium
                      text-slate-700
                      dark:text-slate-300
                      mb-1
                    "
                  >
                    Username
                  </label>


                  <input
                    type="text"
                    name="username"
                    value={
                      formData.username
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="johndoe"
                    className="
                      w-full
                      px-4
                      py-2.5
                      bg-white
                      dark:bg-dark-bg/80
                      border
                      border-slate-300
                      dark:border-dark-border
                      rounded-lg
                      text-sm
                      text-slate-900
                      dark:text-white
                      focus:outline-none
                      focus:border-brand-500
                    "
                  />

                </div>


                <div>

                  <label
                    className="
                      block
                      text-xs
                      font-medium
                      text-slate-700
                      dark:text-slate-300
                      mb-1
                    "
                  >
                    Email Address
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
                      type="email"
                      name="email"
                      value={
                        formData.email
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="name@example.com"
                      className="
                        w-full
                        pl-10
                        pr-4
                        py-2.5
                        bg-white
                        dark:bg-dark-bg/80
                        border
                        border-slate-300
                        dark:border-dark-border
                        rounded-lg
                        text-sm
                        text-slate-900
                        dark:text-white
                        focus:outline-none
                        focus:border-brand-500
                      "
                    />

                  </div>

                </div>


                <div
                  className="
                    grid
                    grid-cols-1
                    sm:grid-cols-2
                    gap-3
                  "
                >

                  <div>

                    <label
                      className="
                        block
                        text-xs
                        font-medium
                        text-slate-700
                        dark:text-slate-300
                        mb-1
                      "
                    >
                      Password
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
                        name="password"
                        value={
                          formData.password
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="6+ chars"
                        className="
                          w-full
                          pl-10
                          pr-3
                          py-2.5
                          bg-white
                          dark:bg-dark-bg/80
                          border
                          border-slate-300
                          dark:border-dark-border
                          rounded-lg
                          text-sm
                          text-slate-900
                          dark:text-white
                          focus:outline-none
                          focus:border-brand-500
                        "
                      />

                    </div>

                  </div>


                  <div>

                    <label
                      className="
                        block
                        text-xs
                        font-medium
                        text-slate-700
                        dark:text-slate-300
                        mb-1
                      "
                    >
                      Confirm Password
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
                        name="confirmPassword"
                        value={
                          formData.confirmPassword
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Re-enter"
                        className="
                          w-full
                          pl-10
                          pr-3
                          py-2.5
                          bg-white
                          dark:bg-dark-bg/80
                          border
                          border-slate-300
                          dark:border-dark-border
                          rounded-lg
                          text-sm
                          text-slate-900
                          dark:text-white
                          focus:outline-none
                          focus:border-brand-500
                        "
                      />

                    </div>

                  </div>

                </div>

              </div>
            )}


            {/* ==================================================
                STEP 2
            ================================================== */}

            {step === 2 && (
              <div
                className="
                  space-y-4
                  animate-fadeIn
                "
              >

                <h3
                  className="
                    text-xs
                    font-black
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  2. Contact & Address Details
                </h3>


                <div>

                  <label
                    className="
                      block
                      text-xs
                      font-medium
                      text-slate-700
                      dark:text-slate-300
                      mb-1
                    "
                  >
                    Phone Number
                  </label>


                  <div className="relative">

                    <Phone
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
                      name="phone"
                      value={
                        formData.phone
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="+234 800 000 0000"
                      className="
                        w-full
                        pl-10
                        pr-4
                        py-2.5
                        bg-white
                        dark:bg-dark-bg/80
                        border
                        border-slate-300
                        dark:border-dark-border
                        rounded-lg
                        text-sm
                        text-slate-900
                        dark:text-white
                        focus:outline-none
                        focus:border-brand-500
                      "
                    />

                  </div>

                </div>


                <div>

                  <label
                    className="
                      block
                      text-xs
                      font-medium
                      text-slate-700
                      dark:text-slate-300
                      mb-1
                    "
                  >
                    Location / City
                  </label>


                  <div className="relative">

                    <MapPin
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
                      name="location"
                      value={
                        formData.location
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Jos, Plateau State"
                      className="
                        w-full
                        pl-10
                        pr-4
                        py-2.5
                        bg-white
                        dark:bg-dark-bg/80
                        border
                        border-slate-300
                        dark:border-dark-border
                        rounded-lg
                        text-sm
                        text-slate-900
                        dark:text-white
                        focus:outline-none
                        focus:border-brand-500
                      "
                    />

                  </div>

                </div>


                <div
                  className="
                    grid
                    grid-cols-2
                    gap-3
                  "
                >

                  <div>

                    <label
                      className="
                        block
                        text-xs
                        font-medium
                        text-slate-700
                        dark:text-slate-300
                        mb-1
                      "
                    >
                      Gender
                    </label>


                    <select
                      name="gender"
                      value={
                        formData.gender
                      }
                      onChange={
                        handleChange
                      }
                      className="
                        w-full
                        px-3
                        py-2.5
                        bg-white
                        dark:bg-dark-bg/80
                        border
                        border-slate-300
                        dark:border-dark-border
                        rounded-lg
                        text-sm
                        text-slate-900
                        dark:text-white
                        focus:outline-none
                        focus:border-brand-500
                      "
                    >

                      <option value="Not Specified">
                        Not Specified
                      </option>

                      <option value="Male">
                        Male
                      </option>

                      <option value="Female">
                        Female
                      </option>

                      <option value="Other">
                        Other
                      </option>

                    </select>

                  </div>


                  <div>

                    <label
                      className="
                        block
                        text-xs
                        font-medium
                        text-slate-700
                        dark:text-slate-300
                        mb-1
                      "
                    >
                      Relationship
                    </label>


                    <select
                      name="relationshipStatus"
                      value={
                        formData.relationshipStatus
                      }
                      onChange={
                        handleChange
                      }
                      className="
                        w-full
                        px-3
                        py-2.5
                        bg-white
                        dark:bg-dark-bg/80
                        border
                        border-slate-300
                        dark:border-dark-border
                        rounded-lg
                        text-sm
                        text-slate-900
                        dark:text-white
                        focus:outline-none
                        focus:border-brand-500
                      "
                    >

                      <option value="Single">
                        Single
                      </option>

                      <option value="In a relationship">
                        In a relationship
                      </option>

                      <option value="Engaged">
                        Engaged
                      </option>

                      <option value="Married">
                        Married
                      </option>

                      <option value="Prefer not to say">
                        Prefer not to say
                      </option>

                    </select>

                  </div>

                </div>

              </div>
            )}


            {/* ==================================================
                STEP 3
            ================================================== */}

            {step === 3 && (
              <div
                className="
                  space-y-4
                  animate-fadeIn
                "
              >

                <h3
                  className="
                    text-xs
                    font-black
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  3. Educational Background
                </h3>


                <div>

                  <label
                    className="
                      block
                      text-xs
                      font-medium
                      text-slate-700
                      dark:text-slate-300
                      mb-1
                    "
                  >
                    Highest Qualification
                  </label>


                  <div className="relative">

                    <GraduationCap
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


                    <select
                      name="highestQualification"
                      value={
                        formData.highestQualification
                      }
                      onChange={
                        handleChange
                      }
                      className="
                        w-full
                        pl-10
                        pr-4
                        py-2.5
                        bg-white
                        dark:bg-dark-bg/80
                        border
                        border-slate-300
                        dark:border-dark-border
                        rounded-lg
                        text-sm
                        text-slate-900
                        dark:text-white
                        focus:outline-none
                        focus:border-brand-500
                      "
                    >

                      <option value="">
                        Select Qualification
                      </option>

                      <option value="ND / HND">
                        ND / HND
                      </option>

                      <option value="BSc / BA">
                        BSc / BA
                      </option>

                      <option value="Masters">
                        Masters Degree
                      </option>

                      <option value="Ph.D">
                        Ph.D
                      </option>

                      <option value="Secondary School">
                        Secondary School
                      </option>

                      <option value="Other">
                        Other Certification
                      </option>

                    </select>

                  </div>

                </div>


                <div>

                  <label
                    className="
                      block
                      text-xs
                      font-medium
                      text-slate-700
                      dark:text-slate-300
                      mb-1
                    "
                  >
                    Institution Name
                  </label>


                  <input
                    type="text"
                    name="institution"
                    value={
                      formData.institution
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Plateau State Polytechnic"
                    className="
                      w-full
                      px-3
                      py-2.5
                      bg-white
                      dark:bg-dark-bg/80
                      border
                      border-slate-300
                      dark:border-dark-border
                      rounded-lg
                      text-sm
                      text-slate-900
                      dark:text-white
                      focus:outline-none
                      focus:border-brand-500
                    "
                  />

                </div>


                <div
                  className="
                    grid
                    grid-cols-1
                    sm:grid-cols-2
                    gap-3
                  "
                >

                  <input
                    type="text"
                    name="courseOfStudy"
                    value={
                      formData.courseOfStudy
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Course of Study"
                    className="
                      w-full
                      px-3
                      py-2.5
                      bg-white
                      dark:bg-dark-bg/80
                      border
                      border-slate-300
                      dark:border-dark-border
                      rounded-lg
                      text-sm
                      text-slate-900
                      dark:text-white
                      focus:outline-none
                      focus:border-brand-500
                    "
                  />


                  <input
                    type="text"
                    name="graduationYear"
                    value={
                      formData.graduationYear
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Graduation Year"
                    className="
                      w-full
                      px-3
                      py-2.5
                      bg-white
                      dark:bg-dark-bg/80
                      border
                      border-slate-300
                      dark:border-dark-border
                      rounded-lg
                      text-sm
                      text-slate-900
                      dark:text-white
                      focus:outline-none
                      focus:border-brand-500
                    "
                  />

                </div>

              </div>
            )}


            {/* ==================================================
                STEP 4
            ================================================== */}

            {step === 4 && (
              <div
                className="
                  space-y-4
                  animate-fadeIn
                  text-center
                  py-4
                "
              >

                <h3
                  className="
                    text-xs
                    font-black
                    uppercase
                    tracking-wider
                    text-slate-400
                    text-left
                  "
                >
                  4. Profile Picture
                </h3>


                <div
                  className="
                    flex
                    flex-col
                    items-center
                    justify-center
                    space-y-4
                  "
                >

                  <div
                    className="
                      w-28
                      h-28
                      rounded-full
                      border-2
                      border-dashed
                      border-slate-400
                      dark:border-slate-700
                      flex
                      items-center
                      justify-center
                      bg-slate-100
                      dark:bg-slate-800
                      overflow-hidden
                    "
                  >

                    {formData.avatarUrl ? (

                      <img
                        src={
                          formData.avatarUrl
                        }
                        alt="Preview"
                        className="
                          w-full
                          h-full
                          object-cover
                        "
                      />

                    ) : (

                      <Camera
                        className="
                          w-8
                          h-8
                          text-slate-400
                        "
                      />

                    )}

                  </div>


                  <div
                    className="
                      w-full
                      max-w-xs
                      space-y-2
                    "
                  >

                    <label
                      className="
                        block
                        text-xs
                        font-medium
                        text-slate-700
                        dark:text-slate-300
                      "
                    >
                      Avatar Image URL
                    </label>


                    <input
                      type="url"
                      name="avatarUrl"
                      value={
                        formData.avatarUrl
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="https://example.com/photo.jpg"
                      className="
                        w-full
                        px-3
                        py-2
                        bg-white
                        dark:bg-dark-bg/80
                        border
                        border-slate-300
                        dark:border-dark-border
                        rounded-lg
                        text-xs
                        text-slate-900
                        dark:text-white
                        focus:outline-none
                        focus:border-brand-500
                      "
                    />


                    <p
                      className="
                        text-[11px]
                        text-slate-500
                      "
                    >
                      You can add a profile image URL.
                    </p>

                  </div>

                </div>

              </div>
            )}


            {/* ==================================================
                STEP 5
            ================================================== */}

            {step === 5 && (
              <div
                className="
                  space-y-4
                  animate-fadeIn
                "
              >

                <h3
                  className="
                    text-xs
                    font-black
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  5. Review & Verify
                </h3>


                <div
                  className="
                    bg-slate-50
                    dark:bg-slate-950/60
                    p-4
                    rounded-xl
                    border
                    border-slate-200
                    dark:border-slate-800
                    space-y-3
                    text-xs
                  "
                >

                  <div className="flex justify-between gap-4">

                    <span className="text-slate-400">
                      Name:
                    </span>

                    <span
                      className="
                        font-semibold
                        text-slate-700
                        dark:text-slate-200
                        text-right
                      "
                    >
                      {formData.name}
                    </span>

                  </div>


                  <div className="flex justify-between gap-4">

                    <span className="text-slate-400">
                      Username:
                    </span>

                    <span
                      className="
                        font-semibold
                        text-slate-700
                        dark:text-slate-200
                      "
                    >
                      @{formData.username}
                    </span>

                  </div>


                  <div className="flex justify-between gap-4">

                    <span className="text-slate-400">
                      Email:
                    </span>

                    <span
                      className="
                        font-semibold
                        text-slate-700
                        dark:text-slate-200
                        text-right
                        break-all
                      "
                    >
                      {formData.email}
                    </span>

                  </div>


                  <div className="flex justify-between gap-4">

                    <span className="text-slate-400">
                      Phone:
                    </span>

                    <span
                      className="
                        font-semibold
                        text-slate-700
                        dark:text-slate-200
                      "
                    >
                      {formData.phone}
                    </span>

                  </div>


                  <div className="flex justify-between gap-4">

                    <span className="text-slate-400">
                      Location:
                    </span>

                    <span
                      className="
                        font-semibold
                        text-slate-700
                        dark:text-slate-200
                      "
                    >
                      {formData.location}
                    </span>

                  </div>

                </div>


                <div
                  className="
                    p-4
                    rounded-xl
                    bg-brand-500/10
                    border
                    border-brand-500/20
                    text-xs
                    text-slate-600
                    dark:text-slate-300
                  "
                >

                  <div
                    className="
                      flex
                      items-start
                      gap-3
                    "
                  >

                    <ShieldCheck
                      className="
                        w-5
                        h-5
                        text-brand-500
                        shrink-0
                      "
                    />


                    <div>

                      <p
                        className="
                          font-bold
                          text-slate-900
                          dark:text-white
                          mb-1
                        "
                      >
                        Identity verification required
                      </p>

                      <p>
                        On the next step, choose either
                        your email or registered phone
                        number to receive a secure OTP.
                      </p>

                    </div>

                  </div>

                </div>

              </div>
            )}


            {/* ==================================================
                STEP 6
            ================================================== */}

            {step === 6 && (
              <div
                className="
                  space-y-5
                  animate-fadeIn
                "
              >

                {!verified ? (

                  <>

                    <div className="text-center">

                      <p
                        className="
                          text-sm
                          text-slate-600
                          dark:text-slate-300
                        "
                      >
                        Confirm that you own at least
                        one of the contact methods
                        registered with this account.
                      </p>

                    </div>


                    {/* CHANNEL BUTTONS */}

                    <div
                      className="
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        gap-3
                      "
                    >

                      <button
                        type="button"
                        onClick={() =>
                          sendOtp(
                            'email'
                          )
                        }
                        disabled={
                          loading
                        }
                        className={`
                          p-4
                          rounded-xl
                          border
                          text-left
                          transition
                          ${
                            verificationChannel ===
                            'email'
                              ? 'border-brand-500 bg-brand-500/10'
                              : 'border-slate-200 dark:border-slate-700 hover:border-brand-400'
                          }
                        `}
                      >

                        <Mail
                          className="
                            w-6
                            h-6
                            text-brand-500
                            mb-3
                          "
                        />

                        <p
                          className="
                            text-sm
                            font-bold
                            text-slate-900
                            dark:text-white
                          "
                        >
                          Verify by Email
                        </p>

                        <p
                          className="
                            text-[11px]
                            text-slate-500
                            dark:text-slate-400
                            mt-1
                          "
                        >
                          {formData.email}
                        </p>

                      </button>


                      <button
                        type="button"
                        onClick={() =>
                          sendOtp(
                            'phone'
                          )
                        }
                        disabled={
                          loading
                        }
                        className={`
                          p-4
                          rounded-xl
                          border
                          text-left
                          transition
                          ${
                            verificationChannel ===
                            'phone'
                              ? 'border-brand-500 bg-brand-500/10'
                              : 'border-slate-200 dark:border-slate-700 hover:border-brand-400'
                          }
                        `}
                      >

                        <Smartphone
                          className="
                            w-6
                            h-6
                            text-brand-500
                            mb-3
                          "
                        />

                        <p
                          className="
                            text-sm
                            font-bold
                            text-slate-900
                            dark:text-white
                          "
                        >
                          Verify by Phone
                        </p>

                        <p
                          className="
                            text-[11px]
                            text-slate-500
                            dark:text-slate-400
                            mt-1
                          "
                        >
                          {formData.phone}
                        </p>

                      </button>

                    </div>


                    {otpSent && (

                      <div
                        className="
                          p-4
                          rounded-xl
                          bg-slate-50
                          dark:bg-slate-950/60
                          border
                          border-slate-200
                          dark:border-slate-800
                        "
                      >

                        <div
                          className="
                            flex
                            items-center
                            gap-2
                            mb-3
                          "
                        >

                          {verificationChannel ===
                          'email' ? (

                            <Mail
                              className="
                                w-4
                                h-4
                                text-brand-500
                              "
                            />

                          ) : (

                            <Smartphone
                              className="
                                w-4
                                h-4
                                text-brand-500
                              "
                            />

                          )}

                          <p
                            className="
                              text-xs
                              text-slate-600
                              dark:text-slate-300
                            "
                          >
                            Code sent to{' '}

                            <strong>
                              {maskedDestination}
                            </strong>
                          </p>

                        </div>


                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={otp}
                          onChange={(event) => {

                            const value =
                              event.target.value
                                .replace(
                                  /\D/g,
                                  ''
                                )
                                .slice(
                                  0,
                                  6
                                );

                            setOtp(
                              value
                            );

                            setError('');

                          }}
                          placeholder="000000"
                          className="
                            w-full
                            text-center
                            tracking-[0.6em]
                            text-2xl
                            font-black
                            px-4
                            py-4
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
                          "
                        />


                        <button
                          type="button"
                          onClick={
                            verifyOtp
                          }
                          disabled={
                            loading ||
                            otp.length !==
                              6
                          }
                          className="
                            w-full
                            mt-3
                            px-4
                            py-3
                            bg-brand-600
                            hover:bg-brand-500
                            text-white
                            font-bold
                            text-sm
                            rounded-xl
                            transition
                            disabled:opacity-50
                          "
                        >

                          {loading ? (

                            <span
                              className="
                                flex
                                items-center
                                justify-center
                                gap-2
                              "
                            >

                              <Loader2
                                className="
                                  w-4
                                  h-4
                                  animate-spin
                                "
                              />

                              Verifying...

                            </span>

                          ) : (

                            <span
                              className="
                                flex
                                items-center
                                justify-center
                                gap-2
                              "
                            >

                              <CheckCircle2
                                className="
                                  w-4
                                  h-4
                                "
                              />

                              Verify OTP

                            </span>

                          )}

                        </button>


                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            gap-3
                            mt-3
                          "
                        >

                          <button
                            type="button"
                            disabled={
                              loading ||
                              countdown >
                                0
                            }
                            onClick={() =>
                              sendOtp(
                                verificationChannel,
                                true
                              )
                            }
                            className="
                              text-xs
                              font-semibold
                              text-brand-600
                              dark:text-brand-400
                              disabled:opacity-50
                            "
                          >

                            <span
                              className="
                                inline-flex
                                items-center
                                gap-1
                              "
                            >

                              <RefreshCw
                                className="w-3 h-3"
                              />

                              Resend Code

                            </span>

                          </button>


                          {countdown >
                            0 && (

                            <span
                              className="
                                text-[11px]
                                text-slate-500
                              "
                            >
                              Resend in{' '}
                              {countdown}s
                            </span>

                          )}

                        </div>

                      </div>

                    )}

                  </>

                ) : (

                  <div
                    className="
                      text-center
                      py-8
                    "
                  >

                    <div
                      className="
                        w-16
                        h-16
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


                    <h3
                      className="
                        text-xl
                        font-bold
                        text-slate-900
                        dark:text-white
                      "
                    >
                      Account Verified
                    </h3>


                    <p
                      className="
                        text-sm
                        text-slate-500
                        dark:text-slate-400
                        mt-2
                      "
                    >
                      Your EAZY DON CHECK account
                      has been created successfully.
                    </p>


                    <p
                      className="
                        text-xs
                        text-slate-500
                        mt-4
                      "
                    >
                      Redirecting you to login...
                    </p>

                  </div>

                )}

              </div>
            )}


            {/* ==================================================
                NAVIGATION
            ================================================== */}

            {step < 6 && (

              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  mt-6
                  pt-4
                  border-t
                  border-slate-200
                  dark:border-dark-border
                "
              >

                {step > 1 ? (

                  <button
                    type="button"
                    onClick={
                      prevStep
                    }
                    disabled={
                      loading
                    }
                    className="
                      px-4
                      py-2.5
                      bg-slate-200
                      dark:bg-slate-800
                      text-slate-700
                      dark:text-slate-300
                      font-semibold
                      text-xs
                      rounded-lg
                      hover:bg-slate-300
                      dark:hover:bg-slate-700
                      transition
                      flex
                      items-center
                      gap-1.5
                    "
                  >

                    <ArrowLeft
                      className="w-4 h-4"
                    />

                    Back

                  </button>

                ) : (

                  <div />

                )}


                {step < 5 ? (

                  <button
                    type="button"
                    onClick={
                      nextStep
                    }
                    disabled={
                      loading
                    }
                    className="
                      px-5
                      py-2.5
                      bg-brand-600
                      hover:bg-brand-500
                      text-white
                      font-semibold
                      text-xs
                      rounded-lg
                      shadow-lg
                      shadow-brand-600/30
                      transition
                      flex
                      items-center
                      gap-1.5
                      ml-auto
                      disabled:opacity-50
                    "
                  >

                    Next

                    <ArrowRight
                      className="w-4 h-4"
                    />

                  </button>

                ) : (

                  <button
                    type="submit"
                    disabled={
                      loading
                    }
                    className="
                      px-6
                      py-2.5
                      bg-brand-600
                      hover:bg-brand-500
                      text-white
                      font-semibold
                      text-xs
                      rounded-lg
                      shadow-lg
                      shadow-brand-600/30
                      transition
                      flex
                      items-center
                      gap-1.5
                      ml-auto
                      disabled:opacity-50
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

                        Preparing Verification...

                      </>

                    ) : (

                      <>

                        Continue to Verification

                        <KeyRound
                          className="w-4 h-4"
                        />

                      </>

                    )}

                  </button>

                )}

              </div>

            )}

          </form>


          <div
            className="
              mt-6
              text-center
              pt-4
              border-t
              border-slate-200
              dark:border-dark-border
            "
          >

            <p
              className="
                text-xs
                text-slate-500
                dark:text-slate-400
              "
            >
              Already have an account?{' '}

              <Link
                to="/login"
                className="
                  text-brand-600
                  dark:text-brand-500
                  hover:underline
                  font-medium
                "
              >
                Log In
              </Link>

            </p>

          </div>

        </div>

      </main>


      <Footer />

    </div>
  );
};

export default Signup;