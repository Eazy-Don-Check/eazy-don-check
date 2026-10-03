import React, { useEffect, useMemo, useState } from 'react';

/*
 * ============================================================
 * EAZY DON CHECK — AUTOMATIC BACKGROUND SLIDER
 * ============================================================
 *
 * Background images live in:
 *
 *   client/public/backgrounds/
 *
 * Naming convention:
 *
 *   home-*.jpg / jpeg / png / webp   -> Home
 *   login-*.jpg / jpeg / png / webp  -> Login
 *   signup-*.jpg / jpeg / png / webp -> Signup
 *
 * The Vite predev/prebuild script generates:
 *
 *   /backgrounds/manifest.json
 *
 * This component reads that manifest automatically.
 *
 * You only need to drop new images into:
 *
 *   client/public/backgrounds/
 *
 * No JSX changes are required for new images.
 *
 * The named exports below are intentionally retained for
 * backwards compatibility with existing Home.jsx, Login.jsx
 * and Signup.jsx files.
 * ============================================================
 */

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

/*
 * ============================================================
 * DEFAULT REMOTE FALLBACKS
 * ============================================================
 */

export const DEFAULT_BACKGROUND_IMAGES = [
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=2200&q=85',
  'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=2200&q=85',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2200&q=85',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2200&q=85',
];

/*
 * ============================================================
 * BACKWARD-COMPATIBILITY FALLBACKS
 * ============================================================
 *
 * These are NOT the source of truth anymore.
 *
 * The generated manifest takes precedence whenever local
 * images exist.
 */

export const HOME_BACKGROUND_IMAGES = [
  '/backgrounds/home-1.jpg',
  '/backgrounds/home-2.jpg',
  '/backgrounds/home-3.jpg',
  '/backgrounds/home-4.jpg',
];

export const LOGIN_BACKGROUND_IMAGES = [
  '/backgrounds/login-1.jpg',
  '/backgrounds/login-2.jpg',
  '/backgrounds/login-3.jpg',
  '/backgrounds/login-4.jpg',
];

export const SIGNUP_BACKGROUND_IMAGES = [
  '/backgrounds/signup-1.jpg',
  '/backgrounds/signup-2.jpg',
  '/backgrounds/signup-3.jpg',
  '/backgrounds/signup-4.jpg',
];

const FALLBACKS_BY_PAGE = {
  home: HOME_BACKGROUND_IMAGES,
  login: LOGIN_BACKGROUND_IMAGES,
  signup: SIGNUP_BACKGROUND_IMAGES,
};

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

const normalizeImages = (images) => {
  if (!Array.isArray(images)) {
    return [];
  }

  return images.filter(
    (image) =>
      typeof image === 'string' &&
      image.trim()
  );
};

const normalizeManifestImages = (images) => {
  return normalizeImages(images).filter((image) => {
    const value = image.trim();

    return (
      value.startsWith('/backgrounds/') &&
      IMAGE_EXTENSIONS.test(value)
    );
  });
};

const sameArray = (a, b) => {
  if (a === b) {
    return true;
  }

  if (
    !Array.isArray(a) ||
    !Array.isArray(b) ||
    a.length !== b.length
  ) {
    return false;
  }

  return a.every(
    (value, index) => value === b[index]
  );
};

const inferPageFromImages = (images) => {
  if (sameArray(images, HOME_BACKGROUND_IMAGES)) {
    return 'home';
  }

  if (sameArray(images, LOGIN_BACKGROUND_IMAGES)) {
    return 'login';
  }

  if (sameArray(images, SIGNUP_BACKGROUND_IMAGES)) {
    return 'signup';
  }

  return null;
};

const getManifestCandidates = (
  manifest,
  page
) => {
  if (
    !manifest ||
    typeof manifest !== 'object'
  ) {
    return [];
  }

  if (
    page &&
    Array.isArray(manifest[page])
  ) {
    return normalizeManifestImages(
      manifest[page]
    );
  }

  return [];
};

const getAllManifestImages = (manifest) => {
  if (
    !manifest ||
    typeof manifest !== 'object'
  ) {
    return [];
  }

  const allImages = [
    ...(Array.isArray(manifest.home)
      ? manifest.home
      : []),

    ...(Array.isArray(manifest.login)
      ? manifest.login
      : []),

    ...(Array.isArray(manifest.signup)
      ? manifest.signup
      : []),
  ];

  return normalizeManifestImages(
    allImages
  ).filter(
    (image, index, list) =>
      list.indexOf(image) === index
  );
};

/*
 * ============================================================
 * BACKGROUND SLIDER
 * ============================================================
 */

const BackgroundSlider = ({
  images = DEFAULT_BACKGROUND_IMAGES,
  page = null,
  interval = 6500,
  overlay = 'dark',
  className = '',
  children,
  showControls = false,
}) => {
  const [
    manifest,
    setManifest,
  ] = useState(null);

  const [
    manifestLoaded,
    setManifestLoaded,
  ] = useState(false);

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  /*
   * If the caller explicitly supplies page="home",
   * page="login", or page="signup", use that.
   *
   * Otherwise infer the page from the existing named
   * background arrays for backwards compatibility.
   */

  const inferredPage = useMemo(
    () =>
      page ||
      inferPageFromImages(images),
    [page, images]
  );

  /*
   * ==========================================================
   * LOAD GENERATED MANIFEST
   * ==========================================================
   */

  useEffect(() => {
    let cancelled = false;

    const loadManifest = async () => {
      try {
        const cacheSuffix =
          import.meta.env.DEV
            ? `?t=${Date.now()}`
            : '';

        const response =
          await fetch(
            `/backgrounds/manifest.json${cacheSuffix}`,
            {
              cache: 'no-store',
            }
          );

        if (!response.ok) {
          throw new Error(
            `Background manifest request failed: ${response.status}`
          );
        }

        const data =
          await response.json();

        if (!cancelled) {
          setManifest(data);
        }
      } catch (error) {
        /*
         * A missing manifest must NEVER crash
         * Home, Login or Signup.
         *
         * The component will use the fallback
         * images below.
         */

        if (!cancelled) {
          setManifest(null);
        }
      } finally {
        if (!cancelled) {
          setManifestLoaded(true);
        }
      }
    };

    loadManifest();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ==========================================================
   * DETERMINE ACTIVE SLIDES
   * ==========================================================
   */

  const slides = useMemo(() => {
    const requestedImages =
      normalizeImages(images);

    /*
     * Preferred automatic path:
     *
     * Home  -> manifest.home
     * Login -> manifest.login
     * Signup -> manifest.signup
     */

    if (inferredPage) {
      const localImages =
        getManifestCandidates(
          manifest,
          inferredPage
        );

      if (localImages.length > 0) {
        return localImages;
      }

      /*
       * If local images are not available yet,
       * use the page-specific compatibility
       * fallback.
       */

      const pageFallback =
        FALLBACKS_BY_PAGE[
          inferredPage
        ];

      if (
        pageFallback &&
        pageFallback.length
      ) {
        return pageFallback;
      }
    }

    /*
     * Preserve existing images prop behavior.
     */

    if (requestedImages.length > 0) {
      /*
       * DEFAULT_BACKGROUND_IMAGES is treated
       * specially.
       *
       * If local backgrounds exist, use all
       * discovered images instead of remote
       * Unsplash images.
       */

      if (
        sameArray(
          images,
          DEFAULT_BACKGROUND_IMAGES
        )
      ) {
        const allLocalImages =
          getAllManifestImages(
            manifest
          );

        if (
          allLocalImages.length > 0
        ) {
          return allLocalImages;
        }
      }

      return requestedImages;
    }

    /*
     * Last-resort local discovery.
     */

    if (manifestLoaded) {
      const allLocalImages =
        getAllManifestImages(
          manifest
        );

      if (
        allLocalImages.length > 0
      ) {
        return allLocalImages;
      }
    }

    /*
     * Final fallback.
     */

    return DEFAULT_BACKGROUND_IMAGES;
  }, [
    images,
    inferredPage,
    manifest,
    manifestLoaded,
  ]);

  /*
   * ==========================================================
   * RESET ACTIVE SLIDE
   * ==========================================================
   */

  useEffect(() => {
    setActiveIndex(0);
  }, [
    slides.length,
    inferredPage,
  ]);

  /*
   * ==========================================================
   * AUTOMATIC SLIDE ROTATION
   * ==========================================================
   */

  useEffect(() => {
    if (slides.length <= 1) {
      return undefined;
    }

    const safeInterval = Math.max(
      Number(interval) || 6500,
      1000
    );

    const timer =
      window.setInterval(() => {
        setActiveIndex(
          (previous) =>
            (previous + 1) %
            slides.length
        );
      }, safeInterval);

    return () =>
      window.clearInterval(timer);
  }, [
    slides.length,
    interval,
  ]);

  /*
   * ==========================================================
   * MANUAL NAVIGATION
   * ==========================================================
   */

  const goTo = (index) => {
    if (!slides.length) {
      return;
    }

    setActiveIndex(
      (index + slides.length) %
        slides.length
    );
  };

  /*
   * ==========================================================
   * OVERLAY
   * ==========================================================
   */

  const overlayClass =
    overlay === 'light'
      ? 'bg-slate-950/35'
      : overlay === 'soft'
        ? 'bg-slate-950/25'
        : 'bg-slate-950/55';

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div
      className={`relative min-h-screen overflow-hidden ${className}`}
    >

      {/* ======================================================
          BACKGROUND IMAGES
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0">

        {slides.map(
          (image, index) => (
            <div
              key={`${image}-${index}`}
              className={`
                absolute
                inset-0
                bg-cover
                bg-center
                bg-no-repeat
                transition-all
                duration-[1800ms]
                ease-in-out
                ${
                  index === activeIndex
                    ? 'scale-105 opacity-100'
                    : 'scale-100 opacity-0'
                }
              `}
              style={{
                backgroundImage:
                  `url("${image}")`,
              }}
              aria-hidden="true"
            />
          )
        )}

        {/* ==================================================
            CINEMATIC OVERLAY
        ================================================== */}

        <div
          className={`
            absolute
            inset-0
            ${overlayClass}
          `}
        />

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-b
            from-black/30
            via-black/10
            to-black/45
          "
        />

        <div
          className="
            absolute
            inset-0
            bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.16),transparent_32%),radial-gradient(circle_at_80%_75%,rgba(14,165,233,0.14),transparent_35%)]
          "
        />

      </div>

      {/* ======================================================
          PAGE CONTENT
      ====================================================== */}

      <div
        className="
          relative
          z-10
          min-h-screen
        "
      >
        {children}
      </div>

      {/* ======================================================
          SLIDER CONTROLS
      ====================================================== */}

      {showControls &&
        slides.length > 1 && (
          <div
            className="
              pointer-events-none
              fixed
              bottom-5
              left-1/2
              z-[60]
              flex
              -translate-x-1/2
              items-center
              gap-2
              rounded-full
              border
              border-white/20
              bg-black/35
              px-3
              py-2
              backdrop-blur-md
            "
          >

            {slides.map(
              (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() =>
                    goTo(index)
                  }
                  className={`
                    pointer-events-auto
                    h-1.5
                    rounded-full
                    transition-all
                    ${
                      index ===
                      activeIndex
                        ? 'w-7 bg-white'
                        : 'w-1.5 bg-white/50 hover:bg-white/80'
                    }
                  `}
                  aria-label={`Show background ${index + 1}`}
                  aria-current={
                    index ===
                    activeIndex
                      ? 'true'
                      : undefined
                  }
                />
              )
            )}

          </div>
        )}

    </div>
  );
};

export default BackgroundSlider;