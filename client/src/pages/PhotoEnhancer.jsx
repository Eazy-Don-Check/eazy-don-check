import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Sparkles,
  Upload,
  Download,
  RefreshCw,
  Sliders,
  AlertCircle,
  Zap,
  ArrowLeft,
  Crown,
  CreditCard,
} from 'lucide-react';

import {
  useNavigate,
} from 'react-router-dom';

import apiClient from '../utils/apiClient';

export default function PhotoEnhancer({
  userUsage,
  onEnhancementComplete,
}) {
  const navigate = useNavigate();

  // ==========================================================
  // STATE
  // ==========================================================

  const [selectedImage, setSelectedImage] =
    useState(null);

  const [enhancedImage, setEnhancedImage] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [quotaLoading, setQuotaLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [sliderPosition, setSliderPosition] =
    useState(50);

  const [isDragging, setIsDragging] =
    useState(false);

  // ==========================================================
  // SUBSCRIPTION / QUOTA
  // ==========================================================

  const [quota, setQuota] = useState(null);

  // ==========================================================
  // ENHANCEMENT SETTINGS
  // ==========================================================

  const [settings, setSettings] = useState({
    upscaleFactor: '2x',
    faceEnhance: true,
    bgEnhance: true,
  });

  const fileInputRef =
    useRef(null);

  const containerRef =
    useRef(null);

  // ==========================================================
  // NORMALIZE QUOTA RESPONSE
  // ==========================================================

  const normalizeQuota = useCallback(
    (data = {}) => {
      const source =
        data?.quota ||
        data?.data?.quota ||
        data;

      const subscription =
        data?.subscription ||
        data?.data?.subscription ||
        source?.subscription ||
        null;

      const photos =
        source?.photos ||
        data?.photos ||
        {};

      const used =
        Number(
          source?.photosUsed ??
          photos?.used ??
          userUsage?.photosEnhancedThisMonth ??
          0
        );

      const limitValue =
        source?.maxPhotos ??
        photos?.limit ??
        userUsage?.maxEnhancementsAllowed ??
        10;

      const limit =
        Number(limitValue);

      const unlimited =
        Boolean(
          source?.unlimited ??
          data?.unlimited ??
          subscription?.unlimited ??
          false
        );

      const remaining =
        unlimited || limit < 0
          ? -1
          : Math.max(
              0,
              Number(
                source?.photosRemaining ??
                photos?.remaining ??
                limit - used
              )
            );

      return {
        unlimited,
        used,
        limit,
        remaining,

        plan:
          subscription?.plan ||
          source?.plan ||
          null,

        status:
          subscription?.status ||
          source?.status ||
          null,

        expiresAt:
          subscription?.expiresAt ||
          source?.expiresAt ||
          null,

        subscription,
      };
    },
    [userUsage]
  );

  // ==========================================================
  // LOAD PHOTO QUOTA
  // ==========================================================

  const loadPhotoQuota = useCallback(
    async (silent = false) => {
      if (!silent) {
        setQuotaLoading(true);
      }

      try {
        const response =
          await apiClient.get(
            '/photos/quota'
          );

        const data =
          response?.data || {};

        setQuota(
          normalizeQuota(data)
        );
      } catch (err) {
        console.error(
          'Unable to load photo quota:',
          err
        );

        // ----------------------------------------------------
        // Keep compatibility with parent-provided usage if
        // the quota endpoint temporarily fails.
        // ----------------------------------------------------

        setQuota(
          normalizeQuota({
            photosUsed:
              userUsage?.photosEnhancedThisMonth || 0,

            maxPhotos:
              userUsage?.maxEnhancementsAllowed || 10,

            unlimited:
              userUsage?.unlimited || false,
          })
        );
      } finally {
        if (!silent) {
          setQuotaLoading(false);
        }
      }
    },
    [normalizeQuota, userUsage]
  );

  // ==========================================================
  // INITIAL QUOTA LOAD
  // ==========================================================

  useEffect(() => {
    loadPhotoQuota();
  }, [loadPhotoQuota]);

  // ==========================================================
  // REFRESH QUOTA WHEN SUBSCRIPTION CHANGES
  // ==========================================================

  useEffect(() => {
    const handleSubscriptionUpdated = () => {
      loadPhotoQuota(true);
    };

    window.addEventListener(
      'subscription:updated',
      handleSubscriptionUpdated
    );

    return () => {
      window.removeEventListener(
        'subscription:updated',
        handleSubscriptionUpdated
      );
    };
  }, [loadPhotoQuota]);

  // ==========================================================
  // EFFECTIVE QUOTA
  // ==========================================================

  const effectiveQuota =
    quota ||
    normalizeQuota({
      photosUsed:
        userUsage?.photosEnhancedThisMonth || 0,

      maxPhotos:
        userUsage?.maxEnhancementsAllowed || 10,

      unlimited:
        userUsage?.unlimited || false,
    });

  const isUnlimited =
    Boolean(
      effectiveQuota?.unlimited
    );

  const photosUsed =
    Number(
      effectiveQuota?.used || 0
    );

  const maxPhotos =
    Number(
      effectiveQuota?.limit ?? 10
    );

  const photosRemaining =
    isUnlimited || maxPhotos < 0
      ? -1
      : Math.max(
          0,
          Number(
            effectiveQuota?.remaining ??
            maxPhotos - photosUsed
          )
        );

  const quotaExhausted =
    !isUnlimited &&
    maxPhotos >= 0 &&
    photosRemaining <= 0;

  // ==========================================================
  // IMAGE FILE VALIDATION
  // ==========================================================

  const validateImageFile = (file) => {
    if (!file) {
      return false;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        'Please select a JPG, PNG, or WEBP image.'
      );

      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(
        'Image size should be less than 10MB.'
      );

      return false;
    }

    return true;
  };

  // ==========================================================
  // READ IMAGE
  // ==========================================================

  const loadImageFile = (file) => {
    if (!validateImageFile(file)) {
      return;
    }

    setError('');
    setEnhancedImage(null);
    setSliderPosition(50);

    const reader =
      new FileReader();

    reader.onloadend = () => {
      setSelectedImage(
        reader.result
      );
    };

    reader.onerror = () => {
      setError(
        'Unable to read the selected image.'
      );
    };

    reader.readAsDataURL(file);
  };

  // ==========================================================
  // FILE UPLOAD HANDLER
  // ==========================================================

  const handleFileSelect = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    loadImageFile(file);

    // Allow selecting the same file again.
    event.target.value = '';
  };

  // ==========================================================
  // DRAG AND DROP
  // ==========================================================

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    const file =
      event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    loadImageFile(file);
  };

  // ==========================================================
  // RESET WORKSPACE
  // ==========================================================

  const resetWorkspace = () => {
    setSelectedImage(null);
    setEnhancedImage(null);
    setError('');
    setSliderPosition(50);
    setIsDragging(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ==========================================================
  // GO TO SUBSCRIPTION
  // ==========================================================

  const handleSubscription = () => {
    if (loading) {
      return;
    }

    navigate('/subscription');
  };

  // ==========================================================
  // GO BACK
  // ==========================================================

  const handleBack = () => {
    if (loading) {
      return;
    }

    navigate(-1);
  };

  // ==========================================================
  // ENHANCE PHOTO
  // ==========================================================

  const handleEnhance = async () => {
    if (!selectedImage) {
      setError(
        'Please select an image first.'
      );

      return;
    }

    if (loading) {
      return;
    }

    // --------------------------------------------------------
    // Centralized subscription quota
    // --------------------------------------------------------

    if (quotaExhausted) {
      setError(
        'You have reached your photo enhancement limit. Please upgrade your subscription to continue.'
      );

      return;
    }

    setLoading(true);
    setError('');
    setEnhancedImage(null);

    try {
      const response =
        await apiClient.post(
          '/photos/enhance',
          {
            imageUrl: selectedImage,

            upscale:
              settings.upscaleFactor === '4x'
                ? 4
                : 2,

            faceEnhance:
              settings.faceEnhance,

            bgEnhance:
              settings.bgEnhance,
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
          'Failed to enhance image.'
        );
      }

      // ------------------------------------------------------
      // Support common response structures
      // ------------------------------------------------------

      const enhancedUrl =
        data.enhancedUrl ||
        data.enhancedImage ||
        data.image ||
        data.result ||
        data.data?.enhancedUrl ||
        data.data?.enhancedImage ||
        data.data?.url ||
        data.data?.image ||
        data.data?.result ||
        data.url;

      if (!enhancedUrl) {
        throw new Error(
          'The server completed the request but did not return an enhanced image URL.'
        );
      }

      setEnhancedImage(
        enhancedUrl
      );

      // ------------------------------------------------------
      // Update quota immediately from server response
      // ------------------------------------------------------

      if (
        data.quota ||
        data.subscription ||
        data.photosUsed !== undefined ||
        data.maxPhotos !== undefined ||
        data.photosRemaining !== undefined ||
        data.unlimited !== undefined
      ) {
        setQuota(
          normalizeQuota(data)
        );
      } else {
        // ----------------------------------------------------
        // Fallback: refresh quota from backend.
        // ----------------------------------------------------

        await loadPhotoQuota(true);
      }

      // ------------------------------------------------------
      // Notify parent
      // ------------------------------------------------------

      if (
        typeof onEnhancementComplete ===
        'function'
      ) {
        onEnhancementComplete({
          ...data,
          enhancedUrl,
        });
      }

      // ------------------------------------------------------
      // Broadcast quota update for other components.
      // ------------------------------------------------------

      window.dispatchEvent(
        new Event('subscription:updated')
      );
    } catch (err) {
      console.error(
        'Photo enhancement error:',
        err
      );

      const status =
        err?.response?.status;

      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error;

      // ------------------------------------------------------
      // Handle quota errors returned by backend.
      // ------------------------------------------------------

      if (
        status === 403 ||
        status === 429
      ) {
        const backendData =
          err?.response?.data || {};

        if (
          backendData.quota
        ) {
          setQuota(
            normalizeQuota(
              backendData
            )
          );
        }

        setError(
          serverMessage ||
          'You have reached your photo enhancement limit. Please upgrade your subscription to continue.'
        );

        return;
      }

      setError(
        serverMessage ||
        err?.message ||
        'An error occurred while enhancing the photo.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // SLIDER POSITION
  // ==========================================================

  const handleSliderMove = (event) => {
    if (!containerRef.current) {
      return;
    }

    const rect =
      containerRef.current.getBoundingClientRect();

    const clientX =
      event.clientX ??
      event.touches?.[0]?.clientX;

    if (
      typeof clientX !== 'number'
    ) {
      return;
    }

    const x =
      clientX - rect.left;

    let position =
      (x / rect.width) * 100;

    position =
      Math.max(
        0,
        Math.min(100, position)
      );

    setSliderPosition(
      position
    );
  };

  // ==========================================================
  // MOUSE SLIDER
  // ==========================================================

  const handleMouseDown = (event) => {
    event.preventDefault();

    setIsDragging(true);

    handleSliderMove(event);
  };

  const handleMouseMove = (event) => {
    if (!isDragging) {
      return;
    }

    handleSliderMove(event);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ==========================================================
  // TOUCH SLIDER
  // ==========================================================

  const handleTouchStart = (event) => {
    setIsDragging(true);

    handleSliderMove(event);
  };

  const handleTouchMove = (event) => {
    if (!isDragging) {
      return;
    }

    handleSliderMove(event);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        max-w-5xl
        mx-auto
        p-4
        sm:p-6
        text-slate-900
        dark:text-slate-100
        font-sans
      "
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchEnd={handleTouchEnd}
    >

      {/* ====================================================
          TOP NAVIGATION
      ==================================================== */}

      <div className="mb-5">

        <button
          type="button"
          onClick={handleBack}
          disabled={loading}
          className="
            inline-flex
            items-center
            gap-2
            px-3
            py-2
            rounded-xl
            border
            border-slate-200
            dark:border-dark-border
            bg-white
            dark:bg-dark-card
            text-slate-600
            dark:text-slate-300
            hover:text-slate-950
            dark:hover:text-white
            hover:bg-slate-50
            dark:hover:bg-dark-bg
            transition
            text-xs
            font-semibold
            shadow-sm
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          <ArrowLeft className="w-4 h-4" />

          Back
        </button>

      </div>

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div
        className="
          flex
          flex-col
          sm:flex-row
          justify-between
          items-start
          sm:items-center
          gap-4
          mb-6
        "
      >

        <div>

          <h1
            className="
              text-2xl
              sm:text-3xl
              font-extrabold
              text-slate-950
              dark:text-white
              flex
              items-center
              gap-2
            "
          >

            <Sparkles
              className="
                w-7
                h-7
                text-amber-500
                dark:text-amber-400
              "
            />

            AI Photo Enhancer

          </h1>

          <p
            className="
              text-xs
              sm:text-sm
              text-slate-500
              dark:text-slate-400
              mt-1
            "
          >
            Restore blurry photos,
            upscale resolution, and
            sharpen details instantly.
          </p>

        </div>

        {/* ==================================================
            USAGE
        ================================================== */}

        <div
          className="
            bg-white
            dark:bg-dark-card
            border
            border-slate-200
            dark:border-dark-border
            rounded-2xl
            px-4
            py-2
            flex
            items-center
            gap-3
            shadow-sm
            dark:shadow-xl
          "
        >

          {isUnlimited ? (
            <Crown
              className="
                w-4
                h-4
                text-amber-500
                dark:text-amber-400
              "
            />
          ) : (
            <Zap
              className="
                w-4
                h-4
                text-amber-500
                dark:text-amber-400
              "
            />
          )}

          <div className="text-xs">

            <p
              className="
                text-slate-500
                dark:text-slate-400
              "
            >
              {isUnlimited
                ? 'Photo Enhancement'
                : 'Photo Quota'}
            </p>

            <p
              className="
                font-mono
                font-bold
                text-slate-900
                dark:text-white
              "
            >

              {quotaLoading ? (
                'Loading...'
              ) : isUnlimited ? (
                'Unlimited'
              ) : (
                <>
                  {photosUsed.toLocaleString()}
                  {' / '}
                  {Math.max(
                    0,
                    maxPhotos
                  ).toLocaleString()}
                  {' '}Used
                </>
              )}

            </p>

          </div>

        </div>

      </div>

      {/* ====================================================
          QUOTA / SUBSCRIPTION STATUS
      ==================================================== */}

      {!quotaLoading && (
        <div
          className="
            mb-6
            bg-white
            dark:bg-dark-card
            border
            border-slate-200
            dark:border-dark-border
            rounded-2xl
            px-4
            py-3
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-3
            shadow-sm
          "
        >

          <div className="flex items-center gap-3">

            {isUnlimited ? (
              <div
                className="
                  w-9
                  h-9
                  rounded-xl
                  bg-amber-500/10
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >
                <Crown
                  className="
                    w-4
                    h-4
                    text-amber-500
                  "
                />
              </div>
            ) : (
              <div
                className="
                  w-9
                  h-9
                  rounded-xl
                  bg-slate-100
                  dark:bg-slate-800
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >
                <Zap
                  className="
                    w-4
                    h-4
                    text-amber-500
                  "
                />
              </div>
            )}

            <div>

              <p
                className="
                  text-xs
                  font-bold
                  text-slate-900
                  dark:text-white
                "
              >
                {isUnlimited
                  ? 'Unlimited Access'
                  : (
                    effectiveQuota?.plan?.name ||
                    effectiveQuota?.subscription?.plan ||
                    'Free Plan'
                  )}
              </p>

              <p
                className="
                  text-[11px]
                  text-slate-500
                  dark:text-slate-400
                "
              >
                {isUnlimited
                  ? 'Super Admin photo enhancement access'
                  : photosRemaining > 0
                    ? `${photosRemaining.toLocaleString()} enhancement${photosRemaining === 1 ? '' : 's'} remaining`
                    : 'No photo enhancements remaining'}
              </p>

            </div>

          </div>

          {!isUnlimited && quotaExhausted && (
            <button
              type="button"
              onClick={handleSubscription}
              disabled={loading}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                px-4
                py-2
                rounded-xl
                bg-amber-500
                hover:bg-amber-400
                text-slate-950
                text-xs
                font-bold
                transition
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              <CreditCard className="w-4 h-4" />

              Upgrade Plan
            </button>
          )}

        </div>
      )}

      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (
        <div
          className="
            mb-6
            bg-rose-50
            dark:bg-rose-950/80
            border
            border-rose-200
            dark:border-rose-500/50
            rounded-2xl
            p-4
            text-rose-700
            dark:text-rose-200
            text-xs
            sm:text-sm
            flex
            items-center
            gap-3
          "
        >

          <AlertCircle
            className="
              w-5
              h-5
              text-rose-500
              dark:text-rose-400
              shrink-0
            "
          />

          <span>
            {error}
          </span>

        </div>
      )}

      {/* ====================================================
          MAIN GRID
      ==================================================== */}

      <div
        className="
          grid
          grid-cols-1
          lg:grid-cols-3
          gap-6
        "
      >

        {/* ==================================================
            IMAGE WORKSPACE
        ================================================== */}

        <div
          className="
            lg:col-span-2
            space-y-4
          "
        >

          {/* =================================================
              UPLOAD
          ================================================= */}

          {!selectedImage ? (

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() =>
                fileInputRef.current?.click()
              }
              className={`
                h-[420px]
                rounded-3xl
                border-2
                border-dashed
                flex
                flex-col
                items-center
                justify-center
                p-6
                cursor-pointer
                transition
                text-center
                ${
                  isDragging
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-700'
                }
              `}
            >

              <div
                className="
                  w-16
                  h-16
                  rounded-2xl
                  bg-amber-500/10
                  border
                  border-amber-500/20
                  flex
                  items-center
                  justify-center
                  text-amber-500
                  dark:text-amber-400
                  mb-4
                "
              >
                <Upload className="w-8 h-8" />
              </div>

              <h3
                className="
                  text-base
                  font-bold
                  text-slate-900
                  dark:text-white
                  mb-1
                "
              >
                Upload Photo to Enhance
              </h3>

              <p
                className="
                  text-xs
                  text-slate-500
                  dark:text-slate-400
                  max-w-xs
                  mb-4
                "
              >
                Drag and drop your JPG,
                PNG or WEBP picture here,
                or click to browse files
                (Up to 10MB).
              </p>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();

                  fileInputRef.current?.click();
                }}
                className="
                  px-5
                  py-2.5
                  bg-slate-100
                  dark:bg-slate-800
                  border
                  border-slate-200
                  dark:border-slate-700
                  text-xs
                  font-semibold
                  text-slate-700
                  dark:text-slate-200
                  rounded-xl
                  hover:text-slate-950
                  dark:hover:text-white
                  hover:bg-slate-200
                  dark:hover:bg-slate-700
                  transition
                "
              >
                Browse File
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />

            </div>

          ) : enhancedImage ? (

            /* =================================================
               BEFORE / AFTER
            ================================================= */

            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              className="
                relative
                h-[420px]
                rounded-3xl
                overflow-hidden
                select-none
                border
                border-slate-300
                dark:border-slate-800
                bg-slate-950
                shadow-2xl
                cursor-ew-resize
                touch-none
              "
            >

              {/* AFTER */}

              <img
                src={enhancedImage}
                alt="Enhanced Result"
                className="
                  absolute
                  inset-0
                  w-full
                  h-full
                  object-cover
                "
              />

              <span
                className="
                  absolute
                  top-4
                  right-4
                  bg-amber-500/90
                  text-slate-950
                  font-bold
                  text-[10px]
                  uppercase
                  tracking-wider
                  px-2.5
                  py-1
                  rounded-lg
                  backdrop-blur-md
                  z-10
                  shadow
                "
              >
                Enhanced (After)
              </span>

              {/* BEFORE */}

              <div
                className="
                  absolute
                  inset-y-0
                  left-0
                  overflow-hidden
                  border-r-2
                  border-white
                  shadow-2xl
                "
                style={{
                  width: `${sliderPosition}%`,
                }}
              >

                <img
                  src={selectedImage}
                  alt="Original"
                  className="
                    absolute
                    inset-0
                    w-full
                    h-full
                    object-cover
                  "
                  style={{
                    width:
                      containerRef.current
                        ? `${containerRef.current.offsetWidth}px`
                        : '100%',
                  }}
                />

                <span
                  className="
                    absolute
                    top-4
                    left-4
                    bg-slate-950/80
                    text-slate-300
                    font-bold
                    text-[10px]
                    uppercase
                    tracking-wider
                    px-2.5
                    py-1
                    rounded-lg
                    backdrop-blur-md
                    z-10
                  "
                >
                  Original (Before)
                </span>

              </div>

              {/* SLIDER */}

              <div
                className="
                  absolute
                  top-0
                  bottom-0
                  w-1
                  bg-white
                  cursor-ew-resize
                  z-20
                "
                style={{
                  left: `${sliderPosition}%`,
                }}
              >

                <div
                  className="
                    absolute
                    top-1/2
                    -translate-y-1/2
                    -translate-x-1/2
                    w-8
                    h-8
                    bg-white
                    rounded-full
                    text-slate-950
                    shadow-xl
                    flex
                    items-center
                    justify-center
                    font-bold
                    text-xs
                  "
                >
                  ↔
                </div>

              </div>

            </div>

          ) : (

            /* =================================================
               SELECTED IMAGE
            ================================================= */

            <div
              className="
                relative
                h-[420px]
                rounded-3xl
                overflow-hidden
                border
                border-slate-300
                dark:border-slate-800
                bg-slate-950
              "
            >

              <img
                src={selectedImage}
                alt="Original Upload"
                className="
                  w-full
                  h-full
                  object-cover
                "
              />

              <span
                className="
                  absolute
                  top-4
                  left-4
                  bg-slate-950/80
                  text-slate-300
                  font-bold
                  text-[10px]
                  uppercase
                  tracking-wider
                  px-2.5
                  py-1
                  rounded-lg
                  backdrop-blur-md
                "
              >
                Ready for AI Enhancement
              </span>

              <button
                type="button"
                onClick={resetWorkspace}
                className="
                  absolute
                  top-4
                  right-4
                  p-2
                  rounded-xl
                  bg-slate-950/80
                  text-slate-300
                  hover:text-white
                  transition
                "
                title="Change Image"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

            </div>
          )}

          {/* =================================================
              ACTION STRIP
          ================================================= */}

          {selectedImage && (
            <div
              className="
                flex
                flex-col
                sm:flex-row
                justify-between
                items-center
                gap-3
                bg-white
                dark:bg-slate-900
                border
                border-slate-200
                dark:border-slate-800
                rounded-2xl
                p-4
                shadow-sm
                dark:shadow-xl
              "
            >

              <button
                type="button"
                onClick={resetWorkspace}
                className="
                  text-xs
                  text-slate-500
                  dark:text-slate-400
                  hover:text-slate-900
                  dark:hover:text-white
                  flex
                  items-center
                  gap-1.5
                  transition
                "
              >
                <RefreshCw className="w-3.5 h-3.5" />

                Upload Different Image
              </button>

              {enhancedImage && (
                <a
                  href={enhancedImage}
                  download="enhanced-photo.png"
                  target="_blank"
                  rel="noreferrer"
                  className="
                    px-4
                    py-2
                    bg-emerald-600
                    hover:bg-emerald-500
                    text-white
                    text-xs
                    font-bold
                    rounded-xl
                    flex
                    items-center
                    gap-2
                    transition
                    shadow-md
                    shadow-emerald-600/20
                  "
                >
                  <Download className="w-4 h-4" />

                  Download High-Res
                </a>
              )}

            </div>
          )}

        </div>

        {/* ==================================================
            CONTROL PANEL
        ================================================== */}

        <div
          className="
            space-y-6
          "
        >

          <div
            className="
              bg-white
              dark:bg-slate-900
              border
              border-slate-200
              dark:border-slate-800
              rounded-3xl
              p-6
              shadow-sm
              dark:shadow-xl
              space-y-6
            "
          >

            <h2
              className="
                text-lg
                font-bold
                text-slate-900
                dark:text-white
                border-b
                border-slate-200
                dark:border-slate-800
                pb-3
                flex
                items-center
                gap-2
              "
            >
              <Sliders
                className="
                  w-5
                  h-5
                  text-amber-500
                  dark:text-amber-400
                "
              />

              Enhancement Options
            </h2>

            {/* =================================================
                UPSCALE
            ================================================= */}

            <div className="space-y-2">

              <label
                className="
                  text-xs
                  font-semibold
                  text-slate-700
                  dark:text-slate-300
                  block
                "
              >
                Resolution Upscale
              </label>

              <div
                className="
                  grid
                  grid-cols-2
                  gap-2
                "
              >

                {['2x', '4x'].map(
                  (scale) => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() =>
                        setSettings(
                          (previous) => ({
                            ...previous,
                            upscaleFactor:
                              scale,
                          })
                        )
                      }
                      className={`
                        py-2
                        rounded-xl
                        border
                        text-xs
                        font-bold
                        transition
                        ${
                          settings.upscaleFactor ===
                          scale
                            ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-300'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }
                      `}
                    >
                      {scale} High-Def
                    </button>
                  )
                )}

              </div>

            </div>

            {/* =================================================
                AI OPTIONS
            ================================================= */}

            <div
              className="
                space-y-3
                pt-2
                border-t
                border-slate-200
                dark:border-slate-800/80
              "
            >

              {/* FACE */}

              <label
                className="
                  flex
                  items-center
                  justify-between
                  cursor-pointer
                  gap-4
                "
              >

                <span
                  className="
                    text-xs
                    text-slate-700
                    dark:text-slate-300
                    font-medium
                  "
                >
                  Face Clarity & Restoration
                </span>

                <input
                  type="checkbox"
                  checked={
                    settings.faceEnhance
                  }
                  onChange={(event) =>
                    setSettings(
                      (previous) => ({
                        ...previous,
                        faceEnhance:
                          event.target.checked,
                      })
                    )
                  }
                  className="
                    w-4
                    h-4
                    rounded
                    border-slate-300
                    dark:border-slate-800
                    bg-white
                    dark:bg-slate-950
                    text-amber-500
                    focus:ring-amber-500
                  "
                />

              </label>

              {/* BACKGROUND */}

              <label
                className="
                  flex
                  items-center
                  justify-between
                  cursor-pointer
                  gap-4
                "
              >

                <span
                  className="
                    text-xs
                    text-slate-700
                    dark:text-slate-300
                    font-medium
                  "
                >
                  Background Sharpening
                </span>

                <input
                  type="checkbox"
                  checked={
                    settings.bgEnhance
                  }
                  onChange={(event) =>
                    setSettings(
                      (previous) => ({
                        ...previous,
                        bgEnhance:
                          event.target.checked,
                      })
                    )
                  }
                  className="
                    w-4
                    h-4
                    rounded
                    border-slate-300
                    dark:border-slate-800
                    bg-white
                    dark:bg-slate-950
                    text-amber-500
                    focus:ring-amber-500
                  "
                />

              </label>

            </div>

            {/* =================================================
                ENHANCE
            ================================================= */}

            <button
              type="button"
              onClick={handleEnhance}
              disabled={
                !selectedImage ||
                loading ||
                quotaLoading ||
                quotaExhausted
              }
              className={` 
                w-full
                py-3
                rounded-2xl
                font-bold
                text-xs
                flex
                items-center
                justify-center
                gap-2
                transition
                shadow-xl
                ${
                  !selectedImage ||
                  loading ||
                  quotaLoading ||
                  quotaExhausted
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
                }
              `}
            >

              {loading ? (
                <>
                  <RefreshCw
                    className="
                      w-4
                      h-4
                      animate-spin
                    "
                  />

                  Enhancing Quality...
                </>
              ) : quotaLoading ? (
                <>
                  <RefreshCw
                    className="
                      w-4
                      h-4
                      animate-spin
                    "
                  />

                  Checking Quota...
                </>
              ) : quotaExhausted ? (
                <>
                  <CreditCard
                    className="
                      w-4
                      h-4
                    "
                  />

                  Enhancement Limit Reached
                </>
              ) : (
                <>
                  <Sparkles
                    className="
                      w-4
                      h-4
                    "
                  />

                  Process & Enhance Photo
                </>
              )}

            </button>

            {/* =================================================
                UPGRADE BUTTON
            ================================================= */}

            {!isUnlimited &&
              quotaExhausted && (
                <button
                  type="button"
                  onClick={handleSubscription}
                  disabled={loading}
                  className="
                    w-full
                    py-2.5
                    rounded-xl
                    border
                    border-amber-500/40
                    bg-amber-500/10
                    text-amber-700
                    dark:text-amber-300
                    font-bold
                    text-xs
                    flex
                    items-center
                    justify-center
                    gap-2
                    hover:bg-amber-500/20
                    transition
                    disabled:opacity-50
                  "
                >
                  <CreditCard className="w-4 h-4" />

                  View Subscription Plans
                </button>
              )}

          </div>

        </div>

      </div>

    </div>
  );
}