const Replicate = require('replicate');
const User = require('../models/User');

const {
  getEffectiveSubscription,
  getUserQuota,
  resetMonthlyUsageIfNeeded,
  expireSubscriptionIfNeeded
} = require('../services/subscriptionService');

// ============================================================
// Replicate Configuration
// ============================================================

const REPLICATE_API_TOKEN =
  process.env.REPLICATE_API_TOKEN;

if (!REPLICATE_API_TOKEN) {
  console.warn(
    '⚠️ WARNING: REPLICATE_API_TOKEN is missing. Photo enhancement will not work until it is added to .env'
  );
}

const replicate = REPLICATE_API_TOKEN
  ? new Replicate({
      auth: REPLICATE_API_TOKEN
    })
  : null;

// ============================================================
// CodeFormer Model
// ============================================================
//
// Keep the existing working model/version.
// ============================================================

const CODEFORMER_MODEL =
  'sczhou/codeformer:cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2';

// ============================================================
// Helpers
// ============================================================

/**
 * Normalize boolean values coming from
 * JSON, forms, query strings, etc.
 */
const normalizeBoolean = (
  value,
  defaultValue = true
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return Boolean(value);
};

/**
 * Normalize upscale value.
 *
 * Supported range:
 * 1x - 4x
 */
const normalizeUpscale = (value) => {
  const upscale = Number(value);

  if (!Number.isFinite(upscale)) {
    return 2;
  }

  return Math.min(
    4,
    Math.max(1, upscale)
  );
};

/**
 * Get authenticated user ID.
 */
const getUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    null
  );
};

/**
 * Build a consistent subscription response.
 */
const buildSubscriptionResponse = (
  user
) => {
  const effective =
    getEffectiveSubscription(user);

  return {
    plan: effective.unlimited
      ? 'unlimited'
      : effective.plan?.id || 'free',

    planName: effective.unlimited
      ? 'Unlimited'
      : effective.plan?.name || 'Free',

    status: effective.unlimited
      ? 'active'
      : effective.status || 'inactive',

    expiresAt:
      effective.expiresAt || null,

    autoRenew:
      Boolean(effective.autoRenew),

    unlimited:
      Boolean(effective.unlimited)
  };
};

/**
 * Build a consistent quota response
 * for the frontend.
 */
const buildQuotaResponse = (
  user
) => {
  const quota =
    getUserQuota(user);

  const photosUsed =
    Number(
      quota.photos?.used || 0
    );

  const photosLimit =
    quota.photos?.limit === undefined ||
    quota.photos?.limit === null
      ? null
      : Number(
          quota.photos.limit
        );

  const photosRemaining =
    quota.photos?.remaining === undefined ||
    quota.photos?.remaining === null
      ? 'Unlimited'
      : quota.photos.remaining;

  const scansUsed =
    Number(
      quota.scans?.used || 0
    );

  const scansLimit =
    quota.scans?.limit === undefined ||
    quota.scans?.limit === null
      ? null
      : Number(
          quota.scans.limit
        );

  const scansRemaining =
    quota.scans?.remaining === undefined ||
    quota.scans?.remaining === null
      ? 'Unlimited'
      : quota.scans.remaining;

  return {
    unlimited:
      Boolean(quota.unlimited),

    photosUsed,

    maxPhotos:
      photosLimit,

    photosRemaining,

    scansUsed,

    maxScans:
      scansLimit,

    scansRemaining
  };
};

/**
 * Get current photo enhancement quota.
 */
const getPhotoQuota = (user) => {
  const quota =
    getUserQuota(user);

  const used =
    Number(
      quota.photos?.used || 0
    );

  /*
   * Super Admin and any other unlimited
   * entitlement receives unlimited access.
   */
  if (quota.unlimited) {
    return {
      unlimited: true,

      limit: -1,

      used,

      remaining: 'Unlimited',

      reachedLimit: false
    };
  }

  const rawLimit =
    quota.photos?.limit;

  const limit =
    Number(rawLimit);

  /*
   * A missing/invalid limit should not
   * accidentally block a user.
   *
   * The subscription service normally
   * supplies a valid limit.
   */
  if (
    !Number.isFinite(limit) ||
    limit < 0
  ) {
    return {
      unlimited: true,

      limit: -1,

      used,

      remaining: 'Unlimited',

      reachedLimit: false
    };
  }

  const remaining =
    Math.max(
      0,
      limit - used
    );

  return {
    unlimited: false,

    limit,

    used,

    remaining,

    reachedLimit:
      used >= limit
  };
};

/**
 * Increment photo usage.
 *
 * The updated User model provides
 * incrementPhotoUsage().
 *
 * A compatibility fallback is included
 * for older documents/model versions.
 */
const incrementPhotoUsage = async (
  user
) => {
  if (
    typeof user.incrementPhotoUsage ===
    'function'
  ) {
    await user.incrementPhotoUsage();
    return;
  }

  /*
   * Compatibility fallback.
   */
  if (!user.usage) {
    user.usage = {};
  }

  user.usage.photos =
    Number(
      user.usage.photos || 0
    ) + 1;

  /*
   * Keep the old field synchronized
   * where it exists.
   */
  user.usage.photosEnhancedThisMonth =
    Number(
      user.usage
        .photosEnhancedThisMonth || 0
    ) + 1;

  await user.save();
};

// ============================================================
// Enhance Photo
// ============================================================

/**
 * @desc    Enhance photo resolution and face quality using CodeFormer
 * @route   POST /api/v1/photos/enhance
 * @access  Private
 */
const enhancePhoto = async (
  req,
  res
) => {
  try {
    // ==========================================================
    // 1. Check Replicate configuration
    // ==========================================================

    if (!replicate) {
      return res.status(503).json({
        success: false,

        message:
          'AI photo enhancement is temporarily unavailable. REPLICATE_API_TOKEN is not configured on the server.'
      });
    }

    // ==========================================================
    // 2. Validate authenticated user
    // ==========================================================

    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          'Authentication required.'
      });
    }

    // ==========================================================
    // 3. Validate request body
    // ==========================================================

    const {
      imageUrl,
      upscale = 2,
      faceEnhance = true,
      bgEnhance = true
    } = req.body || {};

    if (
      !imageUrl ||
      typeof imageUrl !== 'string'
    ) {
      return res.status(400).json({
        success: false,

        message:
          'Please provide a valid image URL or base64 image data.'
      });
    }

    const trimmedImageUrl =
      imageUrl.trim();

    if (!trimmedImageUrl) {
      return res.status(400).json({
        success: false,

        message:
          'Image data cannot be empty.'
      });
    }

    // ==========================================================
    // 4. Fetch current user
    // ==========================================================

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,

        message:
          'User not found.'
      });
    }

    // ==========================================================
    // 5. Expire subscription if necessary
    // ==========================================================

    /*
     * This makes sure an expired paid subscription
     * cannot continue receiving paid photo limits.
     *
     * Super Admin remains permanently unlimited.
     */
    await expireSubscriptionIfNeeded(
      user
    );

    // ==========================================================
    // 6. Reset usage when the current entitlement
    //    requires a new usage period
    // ==========================================================

    await resetMonthlyUsageIfNeeded(
      user
    );

    // ==========================================================
    // 7. Determine effective subscription
    // ==========================================================

    const effectiveSubscription =
      getEffectiveSubscription(
        user
      );

    // ==========================================================
    // 8. Determine photo quota
    // ==========================================================

    const photoQuota =
      getPhotoQuota(user);

    console.log(
      '📸 Photo enhancement entitlement:',
      {
        userId:
          String(user._id),

        role:
          user.role,

        plan:
          effectiveSubscription.unlimited
            ? 'unlimited'
            : effectiveSubscription.plan?.id ||
              'free',

        status:
          effectiveSubscription.status,

        photosUsed:
          photoQuota.used,

        maxPhotos:
          photoQuota.limit,

        photosRemaining:
          photoQuota.remaining,

        unlimited:
          photoQuota.unlimited
      }
    );

    // ==========================================================
    // 9. Enforce photo enhancement quota
    // ==========================================================

    if (
      photoQuota.reachedLimit
    ) {
      return res.status(403).json({
        success: false,

        message:
          'You have reached your photo enhancement limit. Please upgrade your subscription to continue.',

        error:
          'You have reached your photo enhancement limit. Please upgrade your subscription to continue.',

        code:
          'PHOTO_LIMIT_REACHED',

        photosUsed:
          photoQuota.used,

        maxPhotos:
          photoQuota.limit,

        photosRemaining:
          0,

        unlimited:
          false,

        subscription:
          buildSubscriptionResponse(
            user
          ),

        quota:
          buildQuotaResponse(
            user
          ),

        usage: {
          photosEnhancedThisMonth:
            photoQuota.used,

          maxEnhancementsAllowed:
            photoQuota.limit,

          remaining:
            0
        }
      });
    }

    // ==========================================================
    // 10. Normalize AI settings
    // ==========================================================

    const normalizedUpscale =
      normalizeUpscale(
        upscale
      );

    const normalizedFaceEnhance =
      normalizeBoolean(
        faceEnhance,
        true
      );

    const normalizedBgEnhance =
      normalizeBoolean(
        bgEnhance,
        true
      );

    // ==========================================================
    // 11. Run CodeFormer AI enhancement
    // ==========================================================

    console.log(
      '🖼️ Starting AI photo enhancement...'
    );

    const output =
      await replicate.run(
        CODEFORMER_MODEL,
        {
          input: {
            image:
              trimmedImageUrl,

            upscale:
              normalizedUpscale,

            face_upsample:
              normalizedFaceEnhance,

            background_enhance:
              normalizedBgEnhance,

            codeformer_fidelity:
              0.7
          }
        }
      );

    // ==========================================================
    // 12. Validate Replicate output
    // ==========================================================

    if (!output) {
      throw new Error(
        'Replicate returned an empty enhancement result.'
      );
    }

    /*
     * Replicate can return different output
     * formats depending on model/version.
     */
    let enhancedUrl =
      output;

    /*
     * Replicate File/URL-like objects
     * can expose a url() function.
     */
    if (
      typeof output === 'object' &&
      typeof output.url === 'function'
    ) {
      enhancedUrl =
        output.url();
    }

    /*
     * Some integrations can return
     * { url: '...' }.
     */
    else if (
      typeof output === 'object' &&
      typeof output.url === 'string'
    ) {
      enhancedUrl =
        output.url;
    }

    /*
     * Some models return an array.
     */
    else if (
      Array.isArray(output)
    ) {
      const firstOutput =
        output[0];

      if (
        firstOutput &&
        typeof firstOutput.url ===
          'function'
      ) {
        enhancedUrl =
          firstOutput.url();
      } else if (
        firstOutput &&
        typeof firstOutput.url ===
          'string'
      ) {
        enhancedUrl =
          firstOutput.url;
      } else {
        enhancedUrl =
          firstOutput;
      }
    }

    /*
     * Convert URL/File-like output
     * into something JSON serializable.
     */
    if (
      typeof enhancedUrl !==
        'string' &&
      !Buffer.isBuffer(
        enhancedUrl
      )
    ) {
      enhancedUrl =
        String(
          enhancedUrl
        );
    }

    if (!enhancedUrl) {
      throw new Error(
        'Replicate returned an invalid enhancement result.'
      );
    }

    // ==========================================================
    // 13. Consume ONE photo enhancement
    // ==========================================================

    /*
     * IMPORTANT:
     *
     * Usage is incremented ONLY after Replicate
     * successfully returns an enhancement.
     *
     * Failed AI processing therefore does not
     * consume the user's photo quota.
     */
    await incrementPhotoUsage(
      user
    );

    // ==========================================================
    // 14. Award XP
    // ==========================================================

    if (!user.gamification) {
      user.gamification = {};
    }

    if (
      typeof user.gamification
        .xpPoints !== 'number'
    ) {
      user.gamification.xpPoints = 0;
    }

    const XP_EARNED = 25;

    user.gamification.xpPoints +=
      XP_EARNED;

    /*
     * incrementPhotoUsage() may already
     * have saved the user.
     *
     * Save again here so XP is persisted.
     */
    await user.save();

    // ==========================================================
    // 15. Calculate updated quota
    // ==========================================================

    const updatedQuota =
      getPhotoQuota(user);

    const quotaResponse =
      buildQuotaResponse(
        user
      );

    const subscriptionResponse =
      buildSubscriptionResponse(
        user
      );

    // ==========================================================
    // 16. Legacy-compatible usage response
    // ==========================================================

    /*
     * Keep these fields so the current
     * PhotoEnhancer.jsx does not immediately
     * break if it still reads the old usage object.
     *
     * The values now come from the NEW
     * subscription quota system.
     */
    const usageResponse = {
      photosEnhancedThisMonth:
        updatedQuota.used,

      maxEnhancementsAllowed:
        updatedQuota.limit,

      remaining:
        updatedQuota.remaining
    };

    // ==========================================================
    // 17. Log successful enhancement
    // ==========================================================

    console.log(
      '✅ AI photo enhancement completed.',
      {
        userId:
          String(user._id),

        plan:
          subscriptionResponse.plan,

        photosUsed:
          updatedQuota.used,

        maxPhotos:
          updatedQuota.limit,

        photosRemaining:
          updatedQuota.remaining
      }
    );

    // ==========================================================
    // 18. Return response
    // ==========================================================

    return res.status(200).json({
      success: true,

      message:
        'Photo enhanced successfully.',

      /*
       * Primary result expected by the
       * existing frontend.
       */
      enhancedUrl,

      /*
       * Additional aliases for compatibility
       * with different frontend implementations.
       */
      enhancedImage:
        enhancedUrl,

      image:
        enhancedUrl,

      result:
        enhancedUrl,

      // --------------------------------------------------------
      // Subscription information
      // --------------------------------------------------------

      subscription:
        subscriptionResponse,

      // --------------------------------------------------------
      // New canonical quota information
      // --------------------------------------------------------

      photosUsed:
        updatedQuota.used,

      maxPhotos:
        updatedQuota.limit,

      photosRemaining:
        updatedQuota.remaining,

      unlimited:
        updatedQuota.unlimited,

      quota:
        quotaResponse,

      // --------------------------------------------------------
      // Legacy-compatible usage information
      // --------------------------------------------------------

      usage:
        usageResponse,

      // --------------------------------------------------------
      // Enhancement settings
      // --------------------------------------------------------

      enhancement: {
        upscale:
          normalizedUpscale,

        faceEnhance:
          normalizedFaceEnhance,

        backgroundEnhance:
          normalizedBgEnhance
      },

      // --------------------------------------------------------
      // Gamification
      // --------------------------------------------------------

      xpEarned:
        XP_EARNED,

      currentXp:
        user.gamification
          .xpPoints
    });

  } catch (error) {
    // ==========================================================
    // Error handling
    // ==========================================================

    console.error(
      '❌ Replicate Photo Enhancement Error:',
      error
    );

    /*
     * Preserve meaningful client errors where
     * possible while avoiding internal details
     * in production.
     */
    return res.status(500).json({
      success: false,

      message:
        'Failed to process AI photo enhancement.',

      error:
        process.env.NODE_ENV ===
        'production'
          ? 'AI photo enhancement failed.'
          : error.message
    });
  }
};

// ============================================================
// Get Photo Quota
// ============================================================

/**
 * @desc    Get current user's photo enhancement quota
 * @route   GET /api/v1/photos/quota
 * @access  Private
 */
const getPhotoQuotaInfo =
  async (req, res) => {
    try {
      // --------------------------------------------------------
      // 1. Authentication
      // --------------------------------------------------------

      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,

          message:
            'Authentication required.'
        });
      }

      // --------------------------------------------------------
      // 2. Load user
      // --------------------------------------------------------

      const user =
        await User.findById(
          userId
        );

      if (!user) {
        return res.status(404).json({
          success: false,

          message:
            'User not found.'
        });
      }

      // --------------------------------------------------------
      // 3. Expire subscription if necessary
      // --------------------------------------------------------

      await expireSubscriptionIfNeeded(
        user
      );

      // --------------------------------------------------------
      // 4. Synchronize usage period
      // --------------------------------------------------------

      await resetMonthlyUsageIfNeeded(
        user
      );

      // --------------------------------------------------------
      // 5. Get current entitlement
      // --------------------------------------------------------

      const effectiveSubscription =
        getEffectiveSubscription(
          user
        );

      const photoQuota =
        getPhotoQuota(user);

      const quotaResponse =
        buildQuotaResponse(
          user
        );

      const subscriptionResponse =
        buildSubscriptionResponse(
          user
        );

      // --------------------------------------------------------
      // 6. Return quota
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,

        data: {
          unlimited:
            photoQuota.unlimited,

          photosUsed:
            photoQuota.used,

          maxPhotos:
            photoQuota.limit,

          photosRemaining:
            photoQuota.remaining,

          plan:
            effectiveSubscription.unlimited
              ? 'unlimited'
              : effectiveSubscription.plan?.id ||
                'free',

          planName:
            effectiveSubscription.unlimited
              ? 'Unlimited'
              : effectiveSubscription.plan?.name ||
                'Free',

          subscriptionStatus:
            effectiveSubscription.unlimited
              ? 'active'
              : effectiveSubscription.status ||
                'inactive',

          expiresAt:
            effectiveSubscription.expiresAt ||
            null,

          autoRenew:
            Boolean(
              effectiveSubscription.autoRenew
            ),

          subscription:
            subscriptionResponse,

          quota:
            quotaResponse
        }
      });

    } catch (error) {
      console.error(
        '❌ Photo quota error:',
        error
      );

      return res.status(500).json({
        success: false,

        message:
          'Failed to retrieve photo enhancement quota.'
      });
    }
  };

// ============================================================
// Export Controller
// ============================================================

module.exports = {
  enhancePhoto,
  getPhotoQuotaInfo,
  getPhotoQuota
};