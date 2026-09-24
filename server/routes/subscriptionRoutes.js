const express = require("express");

const {
  protect,
  restrictTo,
} = require("../middleware/authMiddleware");

const {
  getPlans,
  getMySubscription,
  getMyQuota,
  activateMySubscription,
  cancelMySubscription,

  initializePaystackPayment,
  verifyPaystackPayment,
  handlePaystackWebhook,

  getUserSubscriptionAdmin,
  updateUserSubscriptionAdmin,
  cancelUserSubscriptionAdmin,
} = require("../controllers/subscriptionController");

const router =
  express.Router();

/*
 * =========================================================
 * PAYSTACK WEBHOOK
 * =========================================================
 *
 * IMPORTANT:
 * This route must NOT use JWT authentication.
 *
 * Paystack calls this endpoint directly.
 */
router.post(
  "/paystack/webhook",
  handlePaystackWebhook
);

/*
 * =========================================================
 * AUTHENTICATED SUBSCRIPTION ROUTES
 * =========================================================
 */
router.use(protect);

/*
 * Available plans.
 */
router.get(
  "/plans",
  getPlans
);

/*
 * Current subscription.
 */
router.get(
  "/me",
  getMySubscription
);

/*
 * Current quota.
 */
router.get(
  "/quota",
  getMyQuota
);

/*
 * =========================================================
 * PAYSTACK PAYMENT
 * =========================================================
 */

/*
 * Initialize payment.
 *
 * POST:
 * /api/v1/subscription/paystack/initialize
 *
 * Body:
 * {
 *   "plan": "pro"
 * }
 */
router.post(
  "/paystack/initialize",
  initializePaystackPayment
);

/*
 * Verify payment.
 *
 * GET:
 * /api/v1/subscription/paystack/verify/:reference
 */
router.get(
  "/paystack/verify/:reference",
  verifyPaystackPayment
);

/*
 * Development-only free activation.
 *
 * Paid plans are blocked here and must go through Paystack.
 */
router.post(
  "/activate",
  activateMySubscription
);

/*
 * Current user cancellation.
 */
router.post(
  "/cancel",
  cancelMySubscription
);

/*
 * =========================================================
 * SUPER ADMIN SUBSCRIPTION MANAGEMENT
 * =========================================================
 */

router.get(
  "/admin/users/:userId",
  restrictTo("superadmin"),
  getUserSubscriptionAdmin
);

router.put(
  "/admin/users/:userId",
  restrictTo("superadmin"),
  updateUserSubscriptionAdmin
);

router.post(
  "/admin/users/:userId/cancel",
  restrictTo("superadmin"),
  cancelUserSubscriptionAdmin
);

module.exports =
  router;