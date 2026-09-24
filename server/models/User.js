const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const {
  SUBSCRIPTION_PLANS,
} = require('../config/subscriptionPlans');

const UserSchema = new mongoose.Schema(
  {
    // ========================================================
    // BASIC ACCOUNT
    // ========================================================

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      maxlength: 30,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      default: '',
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    // ========================================================
    // ROLE
    // ========================================================

    role: {
      type: String,
      enum: [
        'user',
        'superadmin',
      ],
      default: 'user',
    },

    accountStatus: {
      type: String,
      enum: [
        'active',
        'suspended',
        'banned',
      ],
      default: 'active',
    },

    registrationVerified: {
      type: Boolean,
      default: true,
    },

    // ========================================================
    // SUBSCRIPTION
    // ========================================================
    //
    // IMPORTANT:
    //
    // Super Admin access is role-based and unlimited.
    //
    // Normal users use:
    //
    //   free
    //   basic
    //   pro
    //   business
    //
    // The subscription service remains the authoritative
    // entitlement calculator.
    //
    // ========================================================

    subscription: {
      plan: {
        type: String,
        enum: [
          'free',
          'basic',
          'pro',
          'business',
        ],
        default: 'free',
      },

      status: {
        type: String,
        enum: [
          'active',
          'inactive',
          'expired',
          'cancelled',
          'pending',
        ],
        default: 'inactive',
      },

      startedAt: {
        type: Date,
        default: null,
      },

      expiresAt: {
        type: Date,
        default: null,
      },

      autoRenew: {
        type: Boolean,
        default: false,
      },

      provider: {
        type: String,
        enum: [
          'none',
          'paystack',
          'flutterwave',
        ],
        default: 'none',
      },

      providerCustomerId: {
        type: String,
        default: '',
        trim: true,
      },

      providerSubscriptionId: {
        type: String,
        default: '',
        trim: true,
      },

      lastPaymentReference: {
        type: String,
        default: '',
        trim: true,
      },

      /**
       * Current entitlement limits.
       *
       * These are populated by subscriptionService.js when
       * a plan is activated.
       *
       * -1 means unlimited.
       */
      scansLimit: {
        type: Number,
        default: 10,
        min: -1,
      },

      photosLimit: {
        type: Number,
        default: 10,
        min: -1,
      },
    },

    // ========================================================
    // USAGE
    // ========================================================
    //
    // Canonical fields:
    //
    //   usage.scans
    //   usage.photos
    //
    // These are the fields that the new subscription system
    // should use for quota enforcement.
    //
    // Legacy fields are retained temporarily so existing
    // controllers do not lose information while they are
    // migrated to the new subscription service.
    //
    // ========================================================

    usage: {
      /**
       * ------------------------------------------------------
       * CANONICAL RECEIPT SCAN USAGE
       * ------------------------------------------------------
       */
      scans: {
        type: Number,
        default: 0,
        min: 0,
      },

      /**
       * ------------------------------------------------------
       * CANONICAL PHOTO ENHANCEMENT USAGE
       * ------------------------------------------------------
       */
      photos: {
        type: Number,
        default: 0,
        min: 0,
      },

      /**
       * ------------------------------------------------------
       * STORED CURRENT LIMITS
       * ------------------------------------------------------
       *
       * These are retained for backwards compatibility.
       *
       * The authoritative effective limits are calculated by
       * subscriptionService.js.
       */
      maxScans: {
        type: Number,
        default: 10,
        min: -1,
      },

      maxPhotos: {
        type: Number,
        default: 10,
        min: -1,
      },

      /**
       * ------------------------------------------------------
       * USAGE RESET DATE
       * ------------------------------------------------------
       */
      resetDate: {
        type: Date,
        default: null,
      },

      /**
       * ------------------------------------------------------
       * LEGACY PHOTO/SCAN COUNTERS
       * ------------------------------------------------------
       *
       * Older versions of photoController.js used these names.
       *
       * They are kept temporarily to prevent Mongoose from
       * silently discarding those values.
       *
       * New code should use:
       *
       *   usage.photos
       *   usage.scans
       *
       * instead.
       */
      photosEnhancedThisMonth: {
        type: Number,
        default: 0,
        min: 0,
      },

      scansThisMonth: {
        type: Number,
        default: 0,
        min: 0,
      },

      lastResetDate: {
        type: Date,
        default: null,
      },

      maxEnhancementsAllowed: {
        type: Number,
        default: 10,
        min: -1,
      },
    },

    // ========================================================
    // SOCIAL PROFILE
    // ========================================================

    avatarUrl: {
      type: String,
      default: '',
      trim: true,
    },

    avatarPublicId: {
      type: String,
      default: '',
      trim: true,
    },

    coverPhoto: {
      type: String,
      default: '',
      trim: true,
    },

    bio: {
      type: String,
      default: '',
      maxlength: 500,
      trim: true,
    },

    statusUpdate: {
      type: String,
      default: '',
      maxlength: 255,
      trim: true,
    },

    gender: {
      type: String,
      enum: [
        'Male',
        'Female',
        'Other',
        'Not specified',
        'Not Specified',
        '',
      ],
      default: 'Not specified',
    },

    age: {
      type: Number,
      min: 1,
      max: 120,
      default: null,
    },

    location: {
      type: String,
      default: '',
      trim: true,
    },

    socialLinks: {
      facebook: {
        type: String,
        default: '',
        trim: true,
      },

      instagram: {
        type: String,
        default: '',
        trim: true,
      },

      twitter: {
        type: String,
        default: '',
        trim: true,
      },

      linkedin: {
        type: String,
        default: '',
        trim: true,
      },

      website: {
        type: String,
        default: '',
        trim: true,
      },
    },

    relationshipStatus: {
      type: String,
      enum: [
        'Single',
        'In a relationship',
        'Engaged',
        'Married',
        'It’s complicated',
        'Separated',
        'Divorced',
        'Widowed',
        'Prefer not to say',
        'Not specified',
        'Not Specified',
        '',
      ],
      default: '',
    },

    // ========================================================
    // EDUCATION
    // ========================================================

    education: {
      highestQualification: {
        type: String,
        default: '',
        trim: true,
      },

      institution: {
        type: String,
        default: '',
        trim: true,
      },

      courseOfStudy: {
        type: String,
        default: '',
        trim: true,
      },

      graduationYear: {
        type: String,
        default: '',
        trim: true,
      },
    },

    // ========================================================
    // FRIENDS
    // ========================================================

    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ========================================================
    // GAMIFICATION
    // ========================================================

    gamification: {
      xpPoints: {
        type: Number,
        default: 0,
      },

      profileCompletion: {
        type: Number,
        default: 0,
      },

      emailVerified: {
        type: Boolean,
        default: false,
      },

      phoneVerified: {
        type: Boolean,
        default: false,
      },

      starRank: {
        type: String,
        default: 'Bronze',
      },
    },

    // ========================================================
    // PRESENCE
    // ========================================================

    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: null,
    },

    // ========================================================
    // LEGACY PASSWORD RESET
    // ========================================================

    passwordResetToken: {
      type: String,
      default: undefined,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      default: undefined,
      select: false,
    },
  },

  {
    timestamps: true,

    toJSON: {
      virtuals: true,

      transform: (doc, ret) => {
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;

        return ret;
      },
    },

    toObject: {
      virtuals: true,
    },
  }
);

// ============================================================
// AVATAR VIRTUAL
// ============================================================

UserSchema.virtual('avatar').get(function () {
  return this.avatarUrl || '';
});

// ============================================================
// INTERNAL SUBSCRIPTION HELPERS
// ============================================================

/**
 * Determine whether the stored subscription is expired.
 *
 * This helper is intentionally kept inside User.js only for
 * virtual compatibility.
 *
 * The authoritative entitlement logic remains in
 * subscriptionService.js.
 */
const userSubscriptionIsExpired = function () {
  if (!this.subscription?.expiresAt) {
    return false;
  }

  return (
    new Date(
      this.subscription.expiresAt
    ).getTime() <= Date.now()
  );
};

/**
 * Determine whether this user currently has a paid
 * subscription according to the stored document.
 *
 * This is NOT the authoritative security check.
 */
const userHasStoredActiveSubscription =
  function () {
    if (
      this.role === 'superadmin'
    ) {
      return true;
    }

    if (
      !this.subscription
    ) {
      return false;
    }

    if (
      this.subscription.status !==
      'active'
    ) {
      return false;
    }

    if (
      userSubscriptionIsExpired.call(
        this
      )
    ) {
      return false;
    }

    return (
      this.subscription.plan !==
      'free'
    );
  };

// ============================================================
// SUBSCRIPTION VIRTUALS
// ============================================================

UserSchema.virtual('isUnlimited').get(
  function () {
    return this.role === 'superadmin';
  }
);

UserSchema.virtual('subscriptionPlan').get(
  function () {
    if (
      this.role === 'superadmin'
    ) {
      return 'unlimited';
    }

    /**
     * Do not expose an expired paid plan as the effective
     * subscription plan.
     */
    if (
      userSubscriptionIsExpired.call(
        this
      )
    ) {
      return 'free';
    }

    if (
      this.subscription?.status ===
      'expired'
    ) {
      return 'free';
    }

    if (
      this.subscription?.status ===
      'inactive'
    ) {
      return 'free';
    }

    if (
      this.subscription?.status ===
      'pending'
    ) {
      return 'free';
    }

    return (
      this.subscription?.plan ||
      'free'
    );
  }
);

// ============================================================
// USAGE VIRTUALS
// ============================================================

UserSchema.virtual('scansUsed').get(
  function () {
    return Number(
      this.usage?.scans || 0
    );
  }
);

UserSchema.virtual('photosUsed').get(
  function () {
    return Number(
      this.usage?.photos || 0
    );
  }
);

// ============================================================
// EFFECTIVE SCAN LIMIT VIRTUAL
// ============================================================

UserSchema.virtual('maxScans').get(
  function () {
    /**
     * Super Admin is always unlimited.
     */
    if (
      this.role === 'superadmin'
    ) {
      return -1;
    }

    /**
     * Expired/inactive/pending subscriptions fall back
     * to the Free plan.
     */
    if (
      userSubscriptionIsExpired.call(
        this
      ) ||
      this.subscription?.status ===
        'expired' ||
      this.subscription?.status ===
        'inactive' ||
      this.subscription?.status ===
        'pending'
    ) {
      return Number(
        SUBSCRIPTION_PLANS.free.scans
      );
    }

    /**
     * Cancelled subscription:
     *
     * retain the paid limit while it has not expired.
     */
    if (
      this.subscription?.status ===
      'cancelled'
    ) {
      const expiresAt =
        this.subscription?.expiresAt;

      if (
        expiresAt &&
        new Date(
          expiresAt
        ).getTime() > Date.now()
      ) {
        return Number(
          this.subscription?.scansLimit ??
          SUBSCRIPTION_PLANS.free.scans
        );
      }

      return Number(
        SUBSCRIPTION_PLANS.free.scans
      );
    }

    return Number(
      this.subscription?.scansLimit ??
      this.usage?.maxScans ??
      SUBSCRIPTION_PLANS.free.scans
    );
  }
);

// ============================================================
// EFFECTIVE PHOTO LIMIT VIRTUAL
// ============================================================

UserSchema.virtual('maxPhotos').get(
  function () {
    /**
     * Super Admin is always unlimited.
     */
    if (
      this.role === 'superadmin'
    ) {
      return -1;
    }

    /**
     * Expired/inactive/pending subscriptions fall back
     * to Free.
     */
    if (
      userSubscriptionIsExpired.call(
        this
      ) ||
      this.subscription?.status ===
        'expired' ||
      this.subscription?.status ===
        'inactive' ||
      this.subscription?.status ===
        'pending'
    ) {
      return Number(
        SUBSCRIPTION_PLANS.free.photos
      );
    }

    /**
     * Cancelled subscription retains its entitlement until
     * the expiry date.
     */
    if (
      this.subscription?.status ===
      'cancelled'
    ) {
      const expiresAt =
        this.subscription?.expiresAt;

      if (
        expiresAt &&
        new Date(
          expiresAt
        ).getTime() > Date.now()
      ) {
        return Number(
          this.subscription?.photosLimit ??
          SUBSCRIPTION_PLANS.free.photos
        );
      }

      return Number(
        SUBSCRIPTION_PLANS.free.photos
      );
    }

    return Number(
      this.subscription?.photosLimit ??
      this.usage?.maxPhotos ??
      SUBSCRIPTION_PLANS.free.photos
    );
  }
);

// ============================================================
// PASSWORD HASHING
// ============================================================

UserSchema.pre(
  'save',
  async function (next) {
    if (
      !this.isModified(
        'password'
      )
    ) {
      return next();
    }

    if (
      this.$locals &&
      this.$locals
        .passwordAlreadyHashed
    ) {
      return next();
    }

    const salt =
      await bcrypt.genSalt(10);

    this.password =
      await bcrypt.hash(
        this.password,
        salt
      );

    next();
  }
);

// ============================================================
// USERNAME
// ============================================================

UserSchema.pre(
  'save',
  function (next) {
    if (
      !this.username &&
      this.email
    ) {
      this.username =
        this.email
          .split('@')[0]
          .toLowerCase()
          .replace(
            /[^a-z0-9_]/g,
            ''
          )
          .slice(0, 30);
    }

    next();
  }
);

// ============================================================
// PASSWORD COMPARE
// ============================================================

UserSchema.methods.matchPassword =
  async function (
    enteredPassword
  ) {
    return bcrypt.compare(
      enteredPassword,
      this.password
    );
  };

// ============================================================
// PASSWORD RESET TOKEN
// ============================================================

UserSchema.methods.getResetPasswordToken =
  function () {
    const resetToken =
      crypto
        .randomBytes(32)
        .toString('hex');

    this.passwordResetToken =
      crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.passwordResetExpires =
      Date.now() +
      10 * 60 * 1000;

    return resetToken;
  };

// ============================================================
// SUBSCRIPTION METHODS
// ============================================================

/**
 * Super Admin has unlimited access.
 */
UserSchema.methods.hasUnlimitedAccess =
  function () {
    return (
      this.role === 'superadmin'
    );
  };

/**
 * Returns whether the stored subscription is currently active.
 *
 * Note:
 * subscriptionService.js remains the authoritative
 * entitlement layer.
 */
UserSchema.methods.hasActiveSubscription =
  function () {
    if (
      this.role === 'superadmin'
    ) {
      return true;
    }

    return userHasStoredActiveSubscription.call(
      this
    );
  };

/**
 * Effective scan limit.
 */
UserSchema.methods.getScanLimit =
  function () {
    return this.maxScans;
  };

/**
 * Effective photo limit.
 */
UserSchema.methods.getPhotoLimit =
  function () {
    return this.maxPhotos;
  };

/**
 * Check whether the user can perform another scan.
 *
 * This is a convenience method only.
 * For controller-level authorization, use
 * subscriptionService.getUserQuota() because it can also
 * normalize/expire the subscription.
 */
UserSchema.methods.canPerformScan =
  function () {
    if (
      this.role === 'superadmin'
    ) {
      return true;
    }

    const limit =
      this.maxScans;

    if (limit < 0) {
      return true;
    }

    return (
      Number(
        this.usage?.scans || 0
      ) < limit
    );
  };

/**
 * Check whether the user can perform another photo
 * enhancement.
 *
 * Canonical usage field:
 *   usage.photos
 */
UserSchema.methods.canEnhancePhoto =
  function () {
    if (
      this.role === 'superadmin'
    ) {
      return true;
    }

    const limit =
      this.maxPhotos;

    if (limit < 0) {
      return true;
    }

    return (
      Number(
        this.usage?.photos || 0
      ) < limit
    );
  };

/**
 * Increment canonical scan usage.
 */
UserSchema.methods.incrementScanUsage =
  function () {
    if (!this.usage) {
      this.usage = {};
    }

    this.usage.scans =
      Number(
        this.usage.scans || 0
      ) + 1;
  };

/**
 * Increment canonical photo enhancement usage.
 */
UserSchema.methods.incrementPhotoUsage =
  function () {
    if (!this.usage) {
      this.usage = {};
    }

    this.usage.photos =
      Number(
        this.usage.photos || 0
      ) + 1;
  };

// ============================================================
// MODEL EXPORT
// ============================================================

module.exports =
  mongoose.models.User ||
  mongoose.model(
    'User',
    UserSchema
  );