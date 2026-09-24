const User = require('../models/User');

const {
  SUBSCRIPTION_PLANS,
  getSubscriptionPlan,
} = require('../config/subscriptionPlans');

/**
 * ============================================================
 * SUPER ADMIN
 * ============================================================
 *
 * Super Admin access is role-based and permanently unlimited.
 * Super Admins do not need a subscription.
 */
const isSuperAdmin = (user) => {
  return user?.role === 'superadmin';
};

/**
 * ============================================================
 * NORMALIZE SUBSCRIPTION
 * ============================================================
 *
 * Safely handles older users whose subscription object may be
 * missing fields or may contain legacy values.
 */
const normalizeSubscription = (user) => {
  if (!user) {
    return {
      plan: 'free',
      status: 'inactive',
      startedAt: null,
      expiresAt: null,
      autoRenew: false,
      provider: 'none',
      providerCustomerId: '',
      providerSubscriptionId: '',
      lastPaymentReference: '',
      scansLimit: 10,
      photosLimit: 10,
    };
  }

  const rawSubscription = user.subscription || {};

  let planId = rawSubscription.plan || 'free';

  if (!SUBSCRIPTION_PLANS[planId]) {
    planId = 'free';
  }

  const plan = getSubscriptionPlan(planId);

  let status = rawSubscription.status || 'inactive';

  // Legacy values.
  if (status === 'pro' || status === 'premium') {
    status = 'active';
  }

  const validStatuses = [
    'active',
    'inactive',
    'expired',
    'cancelled',
    'pending',
  ];

  if (!validStatuses.includes(status)) {
    status = 'inactive';
  }

  return {
    plan: planId,
    status,

    startedAt:
      rawSubscription.startedAt || null,

    expiresAt:
      rawSubscription.expiresAt || null,

    autoRenew:
      Boolean(rawSubscription.autoRenew),

    provider:
      rawSubscription.provider || 'none',

    providerCustomerId:
      rawSubscription.providerCustomerId || '',

    providerSubscriptionId:
      rawSubscription.providerSubscriptionId || '',

    lastPaymentReference:
      rawSubscription.lastPaymentReference || '',

    scansLimit:
      Number.isFinite(
        Number(rawSubscription.scansLimit)
      )
        ? Number(rawSubscription.scansLimit)
        : plan.scans,

    photosLimit:
      Number.isFinite(
        Number(rawSubscription.photosLimit)
      )
        ? Number(rawSubscription.photosLimit)
        : plan.photos,
  };
};

/**
 * ============================================================
 * EXPIRY CHECK
 * ============================================================
 */
const isExpired = (subscription) => {
  if (!subscription?.expiresAt) {
    return false;
  }

  return (
    new Date(subscription.expiresAt).getTime() <=
    Date.now()
  );
};

/**
 * ============================================================
 * EFFECTIVE SUBSCRIPTION
 * ============================================================
 *
 * This is the AUTHORITATIVE entitlement calculation.
 *
 * Super Admin
 *   -> unlimited
 *
 * Active subscription
 *   -> receives subscribed plan
 *
 * Cancelled but not expired
 *   -> keeps subscribed plan until expiry
 *
 * Expired
 *   -> falls back to Free
 *
 * Inactive / pending
 *   -> Free
 *
 * Missing subscription
 *   -> Free
 */
const getEffectiveSubscription = (user) => {
  /**
   * ----------------------------------------------------------
   * SUPER ADMIN
   * ----------------------------------------------------------
   */
  if (isSuperAdmin(user)) {
    return {
      unlimited: true,

      plan: {
        ...getSubscriptionPlan('business'),

        id: 'unlimited',
        name: 'Unlimited',
        description:
          'Super Admin unlimited access.',
        scans: -1,
        photos: -1,
        durationDays: null,
        price: 0,
      },

      status: 'active',
      expired: false,
      expiresAt: null,
      autoRenew: false,

      scansLimit: -1,
      photosLimit: -1,
    };
  }

  /**
   * ----------------------------------------------------------
   * NO USER
   * ----------------------------------------------------------
   */
  if (!user) {
    const freePlan =
      getSubscriptionPlan('free');

    return {
      unlimited: false,
      plan: freePlan,
      status: 'inactive',
      expired: false,
      expiresAt: null,
      autoRenew: false,

      scansLimit: freePlan.scans,
      photosLimit: freePlan.photos,
    };
  }

  const subscription =
    normalizeSubscription(user);

  const expired =
    isExpired(subscription);

  const freePlan =
    getSubscriptionPlan('free');

  /**
   * ----------------------------------------------------------
   * EXPIRED
   * ----------------------------------------------------------
   */
  if (
    expired ||
    subscription.status === 'expired'
  ) {
    return {
      unlimited: false,
      plan: freePlan,
      status: 'expired',
      expired: true,
      expiresAt: subscription.expiresAt,
      autoRenew: false,

      scansLimit: freePlan.scans,
      photosLimit: freePlan.photos,
    };
  }

  /**
   * ----------------------------------------------------------
   * CANCELLED
   * ----------------------------------------------------------
   *
   * Cancellation means auto-renewal is disabled.
   *
   * The user keeps the paid entitlement until the existing
   * expiry date.
   */
  if (
    subscription.status === 'cancelled'
  ) {
    const hasRemainingAccess =
      subscription.expiresAt &&
      new Date(
        subscription.expiresAt
      ).getTime() > Date.now();

    if (hasRemainingAccess) {
      const plan =
        getSubscriptionPlan(
          subscription.plan
        ) || freePlan;

      return {
        unlimited: false,
        plan,
        status: 'cancelled',
        expired: false,
        expiresAt:
          subscription.expiresAt,
        autoRenew: false,

        scansLimit:
          subscription.scansLimit ??
          plan.scans,

        photosLimit:
          subscription.photosLimit ??
          plan.photos,
      };
    }

    return {
      unlimited: false,
      plan: freePlan,
      status: 'expired',
      expired: true,
      expiresAt:
        subscription.expiresAt,
      autoRenew: false,

      scansLimit: freePlan.scans,
      photosLimit: freePlan.photos,
    };
  }

  /**
   * ----------------------------------------------------------
   * INACTIVE / PENDING
   * ----------------------------------------------------------
   *
   * Do NOT grant paid access simply because the plan field
   * contains "basic", "pro", or "business".
   */
  if (
    subscription.status !== 'active'
  ) {
    return {
      unlimited: false,
      plan: freePlan,
      status: subscription.status,
      expired: false,
      expiresAt:
        subscription.expiresAt,
      autoRenew: false,

      scansLimit: freePlan.scans,
      photosLimit: freePlan.photos,
    };
  }

  /**
   * ----------------------------------------------------------
   * ACTIVE SUBSCRIPTION
   * ----------------------------------------------------------
   */
  const plan =
    getSubscriptionPlan(
      subscription.plan
    ) || freePlan;

  return {
    unlimited: false,
    plan,

    status: 'active',

    expired: false,

    expiresAt:
      subscription.expiresAt,

    autoRenew:
      subscription.autoRenew,

    scansLimit:
      subscription.scansLimit ??
      plan.scans,

    photosLimit:
      subscription.photosLimit ??
      plan.photos,
  };
};

/**
 * ============================================================
 * USAGE RESET
 * ============================================================
 *
 * Usage is tied to the subscription period rather than simply
 * the calendar month.
 *
 * This prevents:
 *
 *   Activate on Sept 29
 *   Calendar changes on Oct 1
 *   User receives another full quota after only 2 days.
 *
 * Free users continue to use a monthly reset.
 */
const resetMonthlyUsageIfNeeded = async (user) => {
  if (!user) {
    return false;
  }

  const now = new Date();

  /**
   * Make sure usage exists for legacy users.
   */
  if (!user.usage) {
    user.usage = {
      scans: 0,
      photos: 0,
      maxScans: 10,
      maxPhotos: 10,
      resetDate: now,
    };

    await user.save();

    return true;
  }

  if (!user.usage.resetDate) {
    user.usage.scans = 0;
    user.usage.photos = 0;
    user.usage.resetDate = now;

    await user.save();

    return true;
  }

  const resetDate =
    new Date(
      user.usage.resetDate
    );

  const subscription =
    normalizeSubscription(user);

  /**
   * For an active paid subscription, usage follows the
   * subscription start/renewal period.
   */
  if (
    subscription.status === 'active' &&
    subscription.startedAt
  ) {
    const startedAt =
      new Date(
        subscription.startedAt
      );

    const durationDays =
      getSubscriptionPlan(
        subscription.plan
      )?.durationDays;

    if (
      Number.isFinite(
        Number(durationDays)
      ) &&
      Number(durationDays) > 0
    ) {
      const periodEnd =
        new Date(startedAt);

      periodEnd.setDate(
        periodEnd.getDate() +
          Number(durationDays)
      );

      if (
        now >= periodEnd &&
        resetDate < periodEnd
      ) {
        user.usage.scans = 0;
        user.usage.photos = 0;
        user.usage.resetDate = now;

        await user.save();

        return true;
      }

      return false;
    }
  }

  /**
   * Free users use a calendar-month reset.
   */
  const currentMonth =
    now.getMonth();

  const currentYear =
    now.getFullYear();

  const resetMonth =
    resetDate.getMonth();

  const resetYear =
    resetDate.getFullYear();

  if (
    currentMonth !== resetMonth ||
    currentYear !== resetYear
  ) {
    user.usage.scans = 0;
    user.usage.photos = 0;
    user.usage.resetDate = now;

    await user.save();

    return true;
  }

  return false;
};

/**
 * ============================================================
 * PLAN CHANGE USAGE RESET
 * ============================================================
 */
const resetUsageForPlanChange = (
  user
) => {
  if (!user.usage) {
    user.usage = {
      scans: 0,
      photos: 0,
      maxScans: 10,
      maxPhotos: 10,
      resetDate: new Date(),
    };
  }

  user.usage.scans = 0;
  user.usage.photos = 0;
  user.usage.resetDate = new Date();
};

/**
 * ============================================================
 * USER QUOTA
 * ============================================================
 */
const getUserQuota = (user) => {
  const effective =
    getEffectiveSubscription(user);

  const scansUsed =
    Number(
      user?.usage?.scans || 0
    );

  const photosUsed =
    Number(
      user?.usage?.photos || 0
    );

  const scanLimit =
    effective.scansLimit;

  const photoLimit =
    effective.photosLimit;

  const scansRemaining =
    effective.unlimited ||
    scanLimit < 0
      ? null
      : Math.max(
          scanLimit - scansUsed,
          0
        );

  const photosRemaining =
    effective.unlimited ||
    photoLimit < 0
      ? null
      : Math.max(
          photoLimit - photosUsed,
          0
        );

  return {
    unlimited:
      effective.unlimited,

    plan: {
      id:
        effective.plan.id,

      name:
        effective.plan.name,

      description:
        effective.plan.description,

      scans:
        effective.plan.scans,

      photos:
        effective.plan.photos,

      durationDays:
        effective.plan.durationDays,

      price:
        effective.plan.price,
    },

    status:
      effective.status,

    expiresAt:
      effective.expiresAt,

    autoRenew:
      effective.autoRenew,

    /**
     * Flat fields are useful for Sidebar/UI.
     */
    scansUsed,
    maxScans:
      effective.unlimited
        ? -1
        : scanLimit,

    scansRemaining,

    photosUsed,
    maxPhotos:
      effective.unlimited
        ? -1
        : photoLimit,

    photosRemaining,

    /**
     * Keep the nested representation too for
     * backwards compatibility.
     */
    scans: {
      used: scansUsed,
      limit:
        effective.unlimited
          ? null
          : scanLimit,
      remaining:
        scansRemaining,
    },

    photos: {
      used: photosUsed,
      limit:
        effective.unlimited
          ? null
          : photoLimit,
      remaining:
        photosRemaining,
    },
  };
};

/**
 * ============================================================
 * ACTIVATE SUBSCRIPTION
 * ============================================================
 */
const activateSubscription = async ({
  user,
  planId,
  provider = 'none',
  providerCustomerId = '',
  providerSubscriptionId = '',
  paymentReference = '',
  autoRenew = false,
  durationDays,
}) => {
  if (!user) {
    throw new Error(
      'User is required.'
    );
  }

  if (isSuperAdmin(user)) {
    throw new Error(
      'Super Admin already has unlimited access and does not need a subscription.'
    );
  }

  const plan =
    getSubscriptionPlan(planId);

  if (!plan) {
    throw new Error(
      `Invalid subscription plan: ${planId}`
    );
  }

  const now = new Date();

  let expiresAt = null;

  const effectiveDuration =
    durationDays !== undefined &&
    durationDays !== null
      ? Number(durationDays)
      : plan.durationDays;

  if (
    Number.isFinite(
      effectiveDuration
    ) &&
    effectiveDuration > 0
  ) {
    expiresAt = new Date(now);

    expiresAt.setDate(
      expiresAt.getDate() +
        effectiveDuration
    );
  }

  /**
   * Ensure nested objects exist for legacy documents.
   */
  if (!user.subscription) {
    user.subscription = {};
  }

  if (!user.usage) {
    user.usage = {
      scans: 0,
      photos: 0,
      maxScans: 10,
      maxPhotos: 10,
      resetDate: now,
    };
  }

  user.subscription.plan =
    plan.id;

  user.subscription.status =
    'active';

  user.subscription.startedAt =
    now;

  user.subscription.expiresAt =
    expiresAt;

  user.subscription.autoRenew =
    Boolean(autoRenew);

  user.subscription.provider =
    provider || 'none';

  user.subscription.providerCustomerId =
    providerCustomerId || '';

  user.subscription.providerSubscriptionId =
    providerSubscriptionId || '';

  user.subscription.lastPaymentReference =
    paymentReference || '';

  user.subscription.scansLimit =
    plan.scans;

  user.subscription.photosLimit =
    plan.photos;

  user.usage.maxScans =
    plan.scans;

  user.usage.maxPhotos =
    plan.photos;

  resetUsageForPlanChange(user);

  await user.save();

  return getEffectiveSubscription(
    user
  );
};

/**
 * ============================================================
 * CANCEL SUBSCRIPTION
 * ============================================================
 *
 * Cancellation disables renewal but does NOT immediately remove
 * the user's already-paid entitlement.
 */
const cancelSubscription = async (
  user
) => {
  if (!user) {
    throw new Error(
      'User is required.'
    );
  }

  if (isSuperAdmin(user)) {
    throw new Error(
      'Super Admin has unlimited access and cannot cancel a subscription.'
    );
  }

  const subscription =
    normalizeSubscription(user);

  if (
    subscription.plan === 'free'
  ) {
    return getEffectiveSubscription(
      user
    );
  }

  if (!user.subscription) {
    user.subscription = {};
  }

  user.subscription.autoRenew =
    false;

  if (
    subscription.expiresAt &&
    new Date(
      subscription.expiresAt
    ).getTime() > Date.now()
  ) {
    user.subscription.status =
      'cancelled';
  } else {
    user.subscription.status =
      'expired';
  }

  await user.save();

  return getEffectiveSubscription(
    user
  );
};

/**
 * ============================================================
 * EXPIRE SUBSCRIPTION
 * ============================================================
 */
const expireSubscriptionIfNeeded =
  async (user) => {
    if (
      !user ||
      isSuperAdmin(user)
    ) {
      return false;
    }

    const subscription =
      normalizeSubscription(user);

    if (
      !subscription.expiresAt ||
      !isExpired(subscription)
    ) {
      return false;
    }

    if (
      user.subscription &&
      user.subscription.status !==
        'expired'
    ) {
      user.subscription.status =
        'expired';

      user.subscription.autoRenew =
        false;

      await user.save();

      return true;
    }

    return false;
  };

/**
 * ============================================================
 * SUBSCRIPTION SUMMARY
 * ============================================================
 */
const getSubscriptionSummary =
  async (userId) => {
    const user =
      await User.findById(
        userId
      );

    if (!user) {
      throw new Error(
        'User not found.'
      );
    }

    await expireSubscriptionIfNeeded(
      user
    );

    await resetMonthlyUsageIfNeeded(
      user
    );

    const effective =
      getEffectiveSubscription(
        user
      );

    const quota =
      getUserQuota(user);

    return {
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },

      subscription: {
        plan:
          effective.plan.id,

        planName:
          effective.plan.name,

        status:
          effective.status,

        expiresAt:
          effective.expiresAt,

        autoRenew:
          effective.autoRenew,

        unlimited:
          effective.unlimited,
      },

      quota,
    };
  };

module.exports = {
  isSuperAdmin,
  normalizeSubscription,
  isExpired,
  getEffectiveSubscription,
  resetMonthlyUsageIfNeeded,
  resetUsageForPlanChange,
  getUserQuota,
  activateSubscription,
  cancelSubscription,
  expireSubscriptionIfNeeded,
  getSubscriptionSummary,
};