const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Basic access for getting started.',
    scans: 5,
    photos: 5,
    durationDays: null,
    price: 0,
  },

  basic: {
    id: 'basic',
    name: 'Basic',
    description: 'More verification and photo enhancement capacity.',
    scans: 10,
    photos: 10,
    durationDays: 30,
    price: 800,
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Higher monthly limits for regular users.',
    scans: 20,
    photos: 20,
    durationDays: 30,
    price: 1500,
  },

  business: {
    id: 'business',
    name: 'Business',
    description: 'Large monthly capacity for businesses and teams.',
    scans: 30,
    photos: 30,
    durationDays: 30,
    price: 2000,
  },
};

const getSubscriptionPlan = (planId) => {
  return SUBSCRIPTION_PLANS[planId] || null;
};

const getPlanLimits = (planId) => {
  const plan = getSubscriptionPlan(planId);

  if (!plan) {
    return null;
  }

  return {
    scans: plan.scans,
    photos: plan.photos,
  };
};

module.exports = {
  SUBSCRIPTION_PLANS,
  getSubscriptionPlan,
  getPlanLimits,
};