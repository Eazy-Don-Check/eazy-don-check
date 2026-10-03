import React, {
  useRef,
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
} from 'lucide-react';

import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import BackgroundSlider from '../components/layout/BackgroundSlider';
import apiClient from '../utils/apiClient';

const Signup = () => {
  const totalSteps = 5;

  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
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

  const fileInputRef = useRef(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ==========================================================
  // FORM CHANGE
  // ==========================================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError('');
    setSuccess('');
  };

  // ==========================================================
  // PROFILE PICTURE
  // ==========================================================

  const handleAvatarSelect = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Profile picture must be 10 MB or smaller.');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setFormData((previous) => ({
        ...previous,
        avatarUrl: String(reader.result || ''),
      }));

      setError('');
      setSuccess('Profile picture selected successfully.');
    };

    reader.onerror = () => {
      setError('Unable to read the selected picture.');
    };

    reader.readAsDataURL(file);
  };

  const openAvatarPicker = () => {
    fileInputRef.current?.click();
  };

  // ==========================================================
  // STEP VALIDATION
  // ==========================================================

  const validateStep = () => {
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

      if (formData.password.length < 6) {
        setError(
          'Password must be at least 6 characters long.'
        );

        return false;
      }

      if (
        formData.password !==
        formData.confirmPassword
      ) {
        setError('Passwords do not match.');
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

    setStep((previous) =>
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
    setError('');

    setStep((previous) =>
      Math.max(
        previous - 1,
        1
      )
    );
  };

  // ==========================================================
  // CREATE ACCOUNT
  // ==========================================================

  const startRegistration = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.post(
        '/auth/register',
        {
          name: formData.name.trim(),

          username:
            formData.username.trim(),

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
            formData.avatarUrl,
        }
      );

      const data =
        response?.data || {};

      if (data.success === false) {
        throw new Error(
          data.message ||
          data.error ||
          'Registration failed.'
        );
      }

      setSuccess(
        'Your account has been created successfully. Redirecting you to login...'
      );

      window.setTimeout(() => {
        navigate(
          '/login',
          {
            replace: true,

            state: {
              message:
                'Account created successfully. You can now log in.',
            },
          }
        );
      }, 1000);
    } catch (requestError) {
      console.error(
        'Registration error:',
        requestError
      );

      setError(
        requestError
          ?.response
          ?.data
          ?.message ||
        requestError?.message ||
        'Registration failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (step < totalSteps) {
      nextStep();
      return;
    }

    await startRegistration();
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <BackgroundSlider
      page="signup"
      interval={6200}
      overlay="dark"
    >
      <div
        className="
          min-h-screen
          flex
          flex-col
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
            px-3
            sm:px-4
            py-6
            sm:py-8
            relative
            overflow-hidden
          "
        >
          {/* ==================================================
              AMBIENT GLASS GLOW
          ================================================== */}

          <div
            className="
              absolute
              top-1/4
              left-1/2
              -translate-x-1/2
              w-[280px]
              h-[280px]
              sm:w-[380px]
              sm:h-[380px]
              bg-brand-500/10
              dark:bg-brand-500/15
              rounded-full
              blur-[120px]
              pointer-events-none
            "
          />

          {/* ==================================================
              COMPACT GLASS SIGNUP CARD
          ================================================== */}

          <div
            className="
              w-full
              max-w-sm
              bg-white/[0.08]
              dark:bg-slate-950/[0.28]
              backdrop-blur-3xl
              border
              border-white/[0.22]
              dark:border-white/[0.12]
              shadow-[0_25px_80px_rgba(0,0,0,0.30)]
              rounded-2xl
              ring-1
              ring-white/[0.08]
              p-4
              sm:p-5
              relative
              z-10
              overflow-hidden
            "
          >
            {/* Subtle glass highlight */}
            <div
              className="
                absolute
                inset-x-0
                top-0
                h-px
                bg-gradient-to-r
                from-transparent
                via-white/50
                to-transparent
                pointer-events-none
              "
            />

            {/* ==================================================
                HEADER
            ================================================== */}

            <div
              className="
                text-center
                mb-3
              "
            >
              {/* LOGO */}

              <div
                className="
                  w-9
                  h-9
                  rounded-xl
                  bg-white/85
                  border
                  border-white/40
                  flex
                  items-center
                  justify-center
                  mx-auto
                  mb-1.5
                  overflow-hidden
                  shadow-lg
                  shadow-black/10
                  backdrop-blur-md
                "
              >
                <img
                  src="/eazy-don-check-logo.png"
                  alt="EAZY DON CHECK"
                  className="
                    w-6
                    h-6
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
                  text-lg
                  sm:text-xl
                  font-bold
                  text-white
                  tracking-tight
                "
              >
                Create Your Profile
              </h2>

              <p
                className="
                  text-[11px]
                  text-white/55
                  mt-0.5
                "
              >
                Step{' '}
                <span
                  className="
                    font-bold
                    text-brand-300
                  "
                >
                  {step}
                </span>{' '}
                of {totalSteps}
              </p>

              {/* PROGRESS BAR */}

              <div
                className="
                  w-full
                  bg-white/[0.08]
                  border
                  border-white/[0.08]
                  h-1
                  rounded-full
                  mt-2.5
                  overflow-hidden
                "
              >
                <div
                  className="
                    bg-brand-500
                    h-full
                    transition-all
                    duration-300
                    shadow-sm
                    shadow-brand-500/50
                  "
                  style={{
                    width: `${
                      (step / totalSteps) * 100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
              <div
                className="
                  mb-2.5
                  p-2
                  rounded-lg
                  bg-red-500/[0.10]
                  border
                  border-red-400/[0.25]
                  backdrop-blur-xl
                  text-red-200
                  text-[11px]
                  flex
                  items-start
                  gap-2
                "
              >
                <AlertCircle
                  className="
                    w-3.5
                    h-3.5
                    shrink-0
                    mt-0.5
                  "
                />

                <span>
                  {error}
                </span>
              </div>
            )}

            {/* ==================================================
                SUCCESS
            ================================================== */}

            {success && (
              <div
                className="
                  mb-2.5
                  p-2
                  rounded-lg
                  bg-emerald-500/[0.10]
                  border
                  border-emerald-400/[0.25]
                  backdrop-blur-xl
                  text-emerald-200
                  text-[11px]
                  flex
                  items-start
                  gap-2
                "
              >
                <CheckCircle2
                  className="
                    w-3.5
                    h-3.5
                    shrink-0
                  "
                />

                <span>
                  {success}
                </span>
              </div>
            )}

            {/* ==================================================
                FORM
            ================================================== */}

            <form
              onSubmit={handleSubmit}
            >
              {/* ==================================================
                  STEP 1
              ================================================== */}

              {step === 1 && (
                <div
                  className="
                    space-y-2.5
                    animate-fadeIn
                  "
                >
                  <h3
                    className="
                      text-[11px]
                      font-black
                      uppercase
                      tracking-wider
                      text-white/50
                    "
                  >
                    1. Basic Information
                  </h3>

                  {/* FULL NAME */}

                  <div>
                    <label
                      className="
                        block
                        text-[11px]
                        font-medium
                        text-white/70
                        mb-1
                      "
                    >
                      Full Name
                    </label>

                    <div className="relative">
                      <User
                        className="
                          w-3.5
                          h-3.5
                          text-white/40
                          absolute
                          left-3
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
                          pl-9
                          pr-3
                          py-2.5
                          bg-white/[0.08]
                          dark:bg-white/[0.04]
                          border
                          border-white/[0.16]
                          dark:border-white/[0.10]
                          backdrop-blur-xl
                          rounded-lg
                          text-xs
                          text-white
                          placeholder:text-white/35
                          focus:outline-none
                          focus:border-brand-400/70
                          focus:ring-1
                          focus:ring-brand-400/30
                          transition
                        "
                      />
                    </div>
                  </div>

                  {/* USERNAME */}

                  <div>
                    <label
                      className="
                        block
                        text-[11px]
                        font-medium
                        text-white/70
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
                        px-3
                        py-2.5
                        bg-white/[0.08]
                        dark:bg-white/[0.04]
                        border
                        border-white/[0.16]
                        dark:border-white/[0.10]
                        backdrop-blur-xl
                        rounded-lg
                        text-xs
                        text-white
                        placeholder:text-white/35
                        focus:outline-none
                        focus:border-brand-400/70
                        focus:ring-1
                        focus:ring-brand-400/30
                        transition
                      "
                    />
                  </div>

                  {/* EMAIL */}

                  <div>
                    <label
                      className="
                        block
                        text-[11px]
                        font-medium
                        text-white/70
                        mb-1
                      "
                    >
                      Email Address
                    </label>

                    <div className="relative">
                      <Mail
                        className="
                          w-3.5
                          h-3.5
                          text-white/40
                          absolute
                          left-3
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
                          pl-9
                          pr-3
                          py-2.5
                          bg-white/[0.08]
                          dark:bg-white/[0.04]
                          border
                          border-white/[0.16]
                          dark:border-white/[0.10]
                          backdrop-blur-xl
                          rounded-lg
                          text-xs
                          text-white
                          placeholder:text-white/35
                          focus:outline-none
                          focus:border-brand-400/70
                          focus:ring-1
                          focus:ring-brand-400/30
                          transition
                        "
                      />
                    </div>
                  </div>

                  {/* PASSWORDS */}

                  <div
                    className="
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      gap-2.5
                    "
                  >
                    {/* PASSWORD */}

                    <div>
                      <label
                        className="
                          block
                          text-[11px]
                          font-medium
                          text-white/70
                          mb-1
                        "
                      >
                        Password
                      </label>

                      <div className="relative">
                        <Lock
                          className="
                            w-3.5
                            h-3.5
                            text-white/40
                            absolute
                            left-3
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
                            pl-9
                            pr-2.5
                            py-2.5
                            bg-white/[0.08]
                            dark:bg-white/[0.04]
                            border
                            border-white/[0.16]
                            dark:border-white/[0.10]
                            backdrop-blur-xl
                            rounded-lg
                            text-xs
                            text-white
                            placeholder:text-white/35
                            focus:outline-none
                            focus:border-brand-400/70
                            focus:ring-1
                            focus:ring-brand-400/30
                            transition
                          "
                        />
                      </div>
                    </div>

                    {/* CONFIRM PASSWORD */}

                    <div>
                      <label
                        className="
                          block
                          text-[11px]
                          font-medium
                          text-white/70
                          mb-1
                        "
                      >
                        Confirm Password
                      </label>

                      <div className="relative">
                        <Lock
                          className="
                            w-3.5
                            h-3.5
                            text-white/40
                            absolute
                            left-3
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
                            pl-9
                            pr-2.5
                            py-2.5
                            bg-white/[0.08]
                            dark:bg-white/[0.04]
                            border
                            border-white/[0.16]
                            dark:border-white/[0.10]
                            backdrop-blur-xl
                            rounded-lg
                            text-xs
                            text-white
                            placeholder:text-white/35
                            focus:outline-none
                            focus:border-brand-400/70
                            focus:ring-1
                            focus:ring-brand-400/30
                            transition
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
                    space-y-2.5
                    animate-fadeIn
                  "
                >
                  <h3
                    className="
                      text-[11px]
                      font-black
                      uppercase
                      tracking-wider
                      text-white/50
                    "
                  >
                    2. Contact & Address Details
                  </h3>

                  {/* PHONE */}

                  <div>
                    <label
                      className="
                        block
                        text-[11px]
                        font-medium
                        text-white/70
                        mb-1
                      "
                    >
                      Phone Number
                    </label>

                    <div className="relative">
                      <Phone
                        className="
                          w-3.5
                          h-3.5
                          text-white/40
                          absolute
                          left-3
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
                          pl-9
                          pr-3
                          py-2.5
                          bg-white/[0.08]
                          dark:bg-white/[0.04]
                          border
                          border-white/[0.16]
                          dark:border-white/[0.10]
                          backdrop-blur-xl
                          rounded-lg
                          text-xs
                          text-white
                          placeholder:text-white/35
                          focus:outline-none
                          focus:border-brand-400/70
                          focus:ring-1
                          focus:ring-brand-400/30
                          transition
                        "
                      />
                    </div>
                  </div>

                  {/* LOCATION */}

                  <div>
                    <label
                      className="
                        block
                        text-[11px]
                        font-medium
                        text-white/70
                        mb-1
                      "
                    >
                      Location / City
                    </label>

                    <div className="relative">
                      <MapPin
                        className="
                          w-3.5
                          h-3.5
                          text-white/40
                          absolute
                          left-3
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
                          pl-9
                          pr-3
                          py-2.5
                          bg-white/[0.08]
                          dark:bg-white/[0.04]
                          border
                          border-white/[0.16]
                          dark:border-white/[0.10]
                          backdrop-blur-xl
                          rounded-lg
                          text-xs
                          text-white
                          placeholder:text-white/35
                          focus:outline-none
                          focus:border-brand-400/70
                          focus:ring-1
                          focus:ring-brand-400/30
                          transition
                        "
                      />
                    </div>
                  </div>

                  {/* GENDER + RELATIONSHIP */}

                  <div
                    className="
                      grid
                      grid-cols-2
                      gap-2.5
                    "
                  >
                    {/* GENDER */}

                    <div>
                      <label
                        className="
                          block
                          text-[11px]
                          font-medium
                          text-white/70
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
                          px-2.5
                          py-2.5
                          bg-slate-900/55
                          border
                          border-white/[0.16]
                          dark:border-white/[0.10]
                          backdrop-blur-xl
                          rounded-lg
                          text-xs
                          text-white
                          focus:outline-none
                          focus:border-brand-400/70
                          focus:ring-1
                          focus:ring-brand-400/30
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

                    {/* RELATIONSHIP */}

                    <div>
                      <label
                        className="
                          block
                          text-[11px]
                          font-medium
                          text-white/70
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
                          px-2.5
                          py-2.5
                          bg-slate-900/55
                          border
                          border-white/[0.16]
                          dark:border-white/[0.10]
                          backdrop-blur-xl
                          rounded-lg
                          text-xs
                          text-white
                          focus:outline-none
                          focus:border-brand-400/70
                          focus:ring-1
                          focus:ring-brand-400/30
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
                    space-y-2.5
                    animate-fadeIn
                  "
                >
                  <h3
                    className="
                      text-[11px]
                      font-black
                      uppercase
                      tracking-wider
                      text-white/50
                    "
                  >
                    3. Educational Background
                  </h3>

                  {/* QUALIFICATION */}

                  <div>
                    <label
                      className="
                        block
                        text-[11px]
                        font-medium
                        text-white/70
                        mb-1
                      "
                    >
                      Highest Qualification
                    </label>

                    <div className="relative">
                      <GraduationCap
                        className="
                          w-3.5
                          h-3.5
                          text-white/40
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          pointer-events-none
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
                          pl-9
                          pr-3
                          py-2.5
                          bg-slate-900/55
                          border
                          border-white/[0.16]
                          dark:border-white/[0.10]
                          backdrop-blur-xl
                          rounded-lg
                          text-xs
                          text-white
                          focus:outline-none
                          focus:border-brand-400/70
                          focus:ring-1
                          focus:ring-brand-400/30
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

                  {/* INSTITUTION */}

                  <div>
                    <label
                      className="
                        block
                        text-[11px]
                        font-medium
                        text-white/70
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
                        bg-white/[0.08]
                        dark:bg-white/[0.04]
                        border
                        border-white/[0.16]
                        dark:border-white/[0.10]
                        backdrop-blur-xl
                        rounded-lg
                        text-xs
                        text-white
                        placeholder:text-white/35
                        focus:outline-none
                        focus:border-brand-400/70
                        focus:ring-1
                        focus:ring-brand-400/30
                        transition
                      "
                    />
                  </div>

                  {/* COURSE + YEAR */}

                  <div
                    className="
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      gap-2.5
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
                        bg-white/[0.08]
                        dark:bg-white/[0.04]
                        border
                        border-white/[0.16]
                        dark:border-white/[0.10]
                        backdrop-blur-xl
                        rounded-lg
                        text-xs
                        text-white
                        placeholder:text-white/35
                        focus:outline-none
                        focus:border-brand-400/70
                        focus:ring-1
                        focus:ring-brand-400/30
                        transition
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
                        bg-white/[0.08]
                        dark:bg-white/[0.04]
                        border
                        border-white/[0.16]
                        dark:border-white/[0.10]
                        backdrop-blur-xl
                        rounded-lg
                        text-xs
                        text-white
                        placeholder:text-white/35
                        focus:outline-none
                        focus:border-brand-400/70
                        focus:ring-1
                        focus:ring-brand-400/30
                        transition
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
                    space-y-2.5
                    animate-fadeIn
                    text-center
                    py-1
                  "
                >
                  <h3
                    className="
                      text-[11px]
                      font-black
                      uppercase
                      tracking-wider
                      text-white/50
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
                      space-y-2.5
                    "
                  >
                    {/* AVATAR */}

                    <div
                      className="
                        w-20
                        h-20
                        rounded-full
                        border-2
                        border-dashed
                        border-white/25
                        flex
                        items-center
                        justify-center
                        bg-white/[0.08]
                        backdrop-blur-xl
                        overflow-hidden
                        shadow-lg
                        shadow-black/10
                        ring-1
                        ring-white/[0.08]
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
                            w-6
                            h-6
                            text-white/35
                          "
                        />
                      )}
                    </div>

                    {/* FILE INPUT */}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={
                        handleAvatarSelect
                      }
                      className="hidden"
                    />

                    {/* PICKER BUTTON */}

                    <button
                      type="button"
                      onClick={
                        openAvatarPicker
                      }
                      disabled={loading}
                      className="
                        w-full
                        max-w-[220px]
                        px-4
                        py-2.5
                        rounded-lg
                        bg-brand-600/90
                        hover:bg-brand-500
                        border
                        border-white/10
                        text-white
                        text-xs
                        font-semibold
                        transition
                        flex
                        items-center
                        justify-center
                        gap-2
                        shadow-lg
                        shadow-brand-600/20
                        backdrop-blur-md
                        disabled:opacity-50
                      "
                    >
                      <Camera className="w-3.5 h-3.5" />

                      Choose Picture
                    </button>

                    <p
                      className="
                        text-[10px]
                        text-white/45
                        max-w-xs
                      "
                    >
                      Click to open your device
                      Gallery and select a profile
                      picture.
                    </p>
                  </div>
                </div>
              )}

              {/* ==================================================
                  STEP 5
              ================================================== */}

              {step === 5 && (
                <div
                  className="
                    space-y-2.5
                    animate-fadeIn
                  "
                >
                  <h3
                    className="
                      text-[11px]
                      font-black
                      uppercase
                      tracking-wider
                      text-white/50
                    "
                  >
                    5. Review & Create Account
                  </h3>

                  {/* REVIEW */}

                  <div
                    className="
                      bg-white/[0.07]
                      dark:bg-white/[0.035]
                      backdrop-blur-xl
                      p-2.5
                      rounded-xl
                      border
                      border-white/[0.15]
                      space-y-2
                      text-[11px]
                    "
                  >
                    <div className="flex justify-between gap-3">
                      <span className="text-white/40">
                        Name:
                      </span>

                      <span
                        className="
                          font-semibold
                          text-white/85
                          text-right
                        "
                      >
                        {formData.name}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-white/40">
                        Username:
                      </span>

                      <span
                        className="
                          font-semibold
                          text-white/85
                        "
                      >
                        @{formData.username}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-white/40">
                        Email:
                      </span>

                      <span
                        className="
                          font-semibold
                          text-white/85
                          text-right
                          break-all
                        "
                      >
                        {formData.email}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-white/40">
                        Phone:
                      </span>

                      <span
                        className="
                          font-semibold
                          text-white/85
                        "
                      >
                        {formData.phone}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-white/40">
                        Location:
                      </span>

                      <span
                        className="
                          font-semibold
                          text-white/85
                          text-right
                        "
                      >
                        {formData.location}
                      </span>
                    </div>
                  </div>

                  {/* READY MESSAGE */}

                  <div
                    className="
                      p-2.5
                      rounded-xl
                      bg-brand-500/[0.08]
                      backdrop-blur-xl
                      border
                      border-brand-400/[0.18]
                      text-[11px]
                      text-white/65
                    "
                  >
                    <div
                      className="
                        flex
                        items-start
                        gap-2.5
                      "
                    >
                      <ShieldCheck
                        className="
                          w-4
                          h-4
                          text-brand-400
                          shrink-0
                          mt-0.5
                        "
                      />

                      <div>
                        <p
                          className="
                            font-bold
                            text-white
                            mb-0.5
                          "
                        >
                          Ready to create your account
                        </p>

                        <p>
                          Review the information above,
                          then click Create Account to
                          finish your registration. No
                          verification code is required.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================
                  NAVIGATION
              ================================================== */}

              {step <= totalSteps && (
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-2.5
                    mt-3
                    pt-2.5
                    border-t
                    border-white/[0.12]
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
                        px-3
                        py-1.5
                        bg-white/[0.08]
                        hover:bg-white/[0.13]
                        border
                        border-white/[0.12]
                        text-white/75
                        font-semibold
                        text-[11px]
                        rounded-lg
                        transition
                        flex
                        items-center
                        gap-1.5
                        backdrop-blur-xl
                        disabled:opacity-50
                      "
                    >
                      <ArrowLeft
                        className="w-3.5 h-3.5"
                      />

                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {step < totalSteps ? (
                    <button
                      type="button"
                      onClick={
                        nextStep
                      }
                      disabled={
                        loading
                      }
                      className="
                        px-4
                        py-1.5
                        bg-brand-600/90
                        hover:bg-brand-500
                        border
                        border-white/[0.08]
                        text-white
                        font-semibold
                        text-[11px]
                        rounded-lg
                        shadow-lg
                        shadow-brand-600/25
                        transition
                        flex
                        items-center
                        gap-1.5
                        ml-auto
                        backdrop-blur-md
                        disabled:opacity-50
                      "
                    >
                      Next

                      <ArrowRight
                        className="w-3.5 h-3.5"
                      />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={
                        loading
                      }
                      className="
                        px-4
                        py-1.5
                        bg-brand-600/90
                        hover:bg-brand-500
                        border
                        border-white/[0.08]
                        text-white
                        font-semibold
                        text-[11px]
                        rounded-lg
                        shadow-lg
                        shadow-brand-600/25
                        transition
                        flex
                        items-center
                        gap-1.5
                        ml-auto
                        backdrop-blur-md
                        disabled:opacity-50
                      "
                    >
                      {loading ? (
                        <>
                          <Loader2
                            className="
                              w-3.5
                              h-3.5
                              animate-spin
                            "
                          />

                          Creating Account...
                        </>
                      ) : (
                        <>
                          Create Account
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </form>

            {/* ==================================================
                LOGIN LINK
            ================================================== */}

            <div
              className="
                mt-3
                text-center
                pt-2.5
                border-t
                border-white/[0.12]
              "
            >
              <p
                className="
                  text-[11px]
                  text-white/45
                "
              >
                Already have an account?{' '}

                <Link
                  to="/login"
                  className="
                    text-brand-300
                    hover:text-brand-200
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
    </BackgroundSlider>
  );
};

export default Signup;