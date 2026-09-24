const mongoose = require("mongoose");

const User = require("../models/User");

const SubscriptionTransaction =
  require("../models/SubscriptionTransaction");

const {
  SUBSCRIPTION_PLANS,
  getSubscriptionPlan,
} = require("../config/subscriptionPlans");

const {
  isSuperAdmin,
  getEffectiveSubscription,
  getUserQuota,
  activateSubscription,
  cancelSubscription,
  expireSubscriptionIfNeeded,
  resetMonthlyUsageIfNeeded,
  getSubscriptionSummary,
} = require("../services/subscriptionService");

const {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  nairaToKobo,
} = require("../services/paystackService");

/**
 * Generate a unique local payment reference.
 */
const generatePaymentReference = (
  userId,
  planId
) => {
  const timestamp =
    Date.now().toString(36);

  const random =
    cryptoRandomString(8);

  return `EDC-${planId.toUpperCase()}-${String(
    userId
  ).slice(-8)}-${timestamp}-${random}`;
};

/**
 * Small secure random reference component.
 */
const cryptoRandomString = (
  length = 8
) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let result = "";

  const bytes =
    require("crypto").randomBytes(
      length
    );

  for (
    let index = 0;
    index < length;
    index += 1
  ) {
    result +=
      chars[
        bytes[index] %
          chars.length
      ];
  }

  return result;
};

/**
 * Get all subscription plans.
 *
 * GET /api/v1/subscription/plans
 */
const getPlans = async (
  req,
  res
) => {
  try {
    const plans =
      Object.values(
        SUBSCRIPTION_PLANS
      ).map((plan) => ({
        id: plan.id,
        name: plan.name,
        description:
          plan.description,
        scans: plan.scans,
        photos: plan.photos,
        durationDays:
          plan.durationDays,
        price: plan.price,
        currency: "NGN",
        paystackConfigured:
          Boolean(
            plan.paystackPlanCode
          ),
      }));

    return res.status(200).json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error(
      "Get subscription plans error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load subscription plans.",
    });
  }
};

/**
 * Get current user's subscription.
 *
 * GET /api/v1/subscription/me
 */
const getMySubscription =
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user._id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
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

      return res.status(200).json({
        success: true,

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
      });
    } catch (error) {
      console.error(
        "Get my subscription error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load subscription information.",
      });
    }
  };

/**
 * Get current user's quota.
 *
 * GET /api/v1/subscription/quota
 */
const getMyQuota =
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user._id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      await expireSubscriptionIfNeeded(
        user
      );

      await resetMonthlyUsageIfNeeded(
        user
      );

      return res.status(200).json({
        success: true,

        quota:
          getUserQuota(user),
      });
    } catch (error) {
      console.error(
        "Get subscription quota error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load subscription quota.",
      });
    }
  };

/**
 * Initialize Paystack payment.
 *
 * POST /api/v1/subscription/paystack/initialize
 *
 * Body:
 * {
 *   "plan": "pro"
 * }
 */
const initializePaystackPayment =
  async (req, res) => {
    try {
      const {
        plan: planId,
      } = req.body;

      if (!planId) {
        return res.status(400).json({
          success: false,
          code: "PLAN_REQUIRED",
          message:
            "Subscription plan is required.",
        });
      }

      const user =
        await User.findById(
          req.user._id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User account not found.",
        });
      }

      if (isSuperAdmin(user)) {
        return res.status(403).json({
          success: false,
          code:
            "SUPERADMIN_UNLIMITED",
          message:
            "Super Admin already has unlimited access and does not need to make a payment.",
        });
      }

      const plan =
        getSubscriptionPlan(
          planId
        );

      if (!plan) {
        return res.status(400).json({
          success: false,
          code: "INVALID_PLAN",
          message:
            `Invalid subscription plan: ${planId}`,
        });
      }

      if (plan.id === "free") {
        return res.status(400).json({
          success: false,
          code:
            "FREE_PLAN_NO_PAYMENT",
          message:
            "The Free plan does not require payment.",
        });
      }

      const price =
        Number(plan.price);

      if (
        !Number.isFinite(price) ||
        price <= 0
      ) {
        return res.status(400).json({
          success: false,
          code:
            "PLAN_PRICE_NOT_CONFIGURED",
          message:
            `The ${plan.name} plan does not have a payment price configured yet. Set its price in subscriptionPlans.js before using Paystack.`,
        });
      }

      const reference =
        generatePaymentReference(
          user._id,
          plan.id
        );

      const callbackUrl =
        process.env.PAYSTACK_CALLBACK_URL ||
        null;

      const metadata = {
        userId:
          String(user._id),

        plan:
          plan.id,

        product:
          "EAZY_DON_CHECK_SUBSCRIPTION",

        application:
          "EAZY DON CHECK",
      };

      /*
       * Create our transaction record BEFORE calling Paystack.
       *
       * This gives us an internal record against which
       * Paystack's callback/webhook can be matched.
       */
      const transaction =
        await SubscriptionTransaction.create(
          {
            userId:
              user._id,

            plan:
              plan.id,

            reference,

            amount:
              nairaToKobo(
                price
              ),

            currency:
              "NGN",

            status:
              "initialized",

            provider:
              "paystack",

            customerEmail:
              user.email,

            metadata,
          }
        );

      try {
        const paystackResponse =
          await initializeTransaction({
            email:
              user.email,

            amount:
              price,

            reference,

            currency:
              "NGN",

            callbackUrl,

            metadata,
          });

        if (
          !paystackResponse?.status ||
          !paystackResponse?.data
        ) {
          throw new Error(
            paystackResponse?.message ||
              "Paystack failed to initialize the transaction."
          );
        }

        transaction.status =
          "pending";

        transaction.accessCode =
          paystackResponse.data
            .access_code ||
          "";

        transaction.authorizationUrl =
          paystackResponse.data
            .authorization_url ||
          "";

        await transaction.save();

        return res.status(200).json({
          success: true,

          message:
            "Paystack transaction initialized successfully.",

          payment: {
            reference,

            accessCode:
              paystackResponse.data
                .access_code,

            authorizationUrl:
              paystackResponse.data
                .authorization_url,

            amount:
              price,

            amountSubunit:
              nairaToKobo(
                price
              ),

            currency:
              "NGN",

            plan:
              plan.id,

            planName:
              plan.name,
          },
        });
      } catch (paystackError) {
        transaction.status =
          "failed";

        transaction.paystackData = {
          error:
            paystackError.message,
        };

        await transaction.save();

        throw paystackError;
      }
    } catch (error) {
      console.error(
        "Paystack initialization error:",
        error
      );

      return res.status(500).json({
        success: false,
        code:
          "PAYSTACK_INITIALIZATION_FAILED",
        message:
          error.message ||
          "Unable to initialize Paystack payment.",
      });
    }
  };

/**
 * Fulfill a successful transaction.
 *
 * This function is deliberately idempotent.
 *
 * If both:
 * - verify endpoint
 * - webhook
 *
 * attempt to fulfill the same transaction,
 * the second request will see fulfilledAt and
 * will NOT activate the subscription again.
 */
const fulfillSuccessfulTransaction =
  async (transaction, paystackData) => {
    if (!transaction) {
      throw new Error(
        "Subscription transaction not found."
      );
    }

    if (
      transaction.fulfilledAt
    ) {
      return {
        alreadyFulfilled: true,
        user:
          await User.findById(
            transaction.userId
          ),
      };
    }

    const user =
      await User.findById(
        transaction.userId
      );

    if (!user) {
      throw new Error(
        "User associated with this transaction no longer exists."
      );
    }

    if (isSuperAdmin(user)) {
      /*
       * Super Admin should never receive a paid
       * subscription because their role already grants
       * unlimited access.
       */
      transaction.status =
        "success";

      transaction.verifiedAt =
        new Date();

      transaction.fulfilledAt =
        new Date();

      transaction.providerTransactionId =
        String(
          paystackData?.id || ""
        );

      transaction.paystackData =
        paystackData;

      await transaction.save();

      return {
        alreadyFulfilled: false,
        superAdmin: true,
        user,
      };
    }

    const plan =
      getSubscriptionPlan(
        transaction.plan
      );

    if (!plan) {
      throw new Error(
        `Subscription plan "${transaction.plan}" no longer exists.`
      );
    }

    /*
     * Verify the amount stored in our system
     * against the Paystack transaction.
     */
    const expectedAmount =
      Number(
        transaction.amount
      );

    const paidAmount =
      Number(
        paystackData?.amount
      );

    if (
      !Number.isFinite(
        paidAmount
      ) ||
      paidAmount !==
        expectedAmount
    ) {
      throw new Error(
        "Paystack transaction amount does not match the expected subscription amount."
      );
    }

    if (
      String(
        paystackData?.currency ||
          "NGN"
      ).toUpperCase() !==
      "NGN"
    ) {
      throw new Error(
        "Paystack transaction currency does not match NGN."
      );
    }

    /*
     * Activate the subscription using our
     * centralized subscription service.
     */
    await activateSubscription({
      user,

      planId:
        transaction.plan,

      provider:
        "paystack",

      providerCustomerId:
        paystackData?.customer?.customer_code ||
        "",

      providerSubscriptionId:
        paystackData?.subscription_code ||
        "",

      paymentReference:
        transaction.reference,

      autoRenew:
        Boolean(
          paystackData?.plan
        ),
    });

    transaction.status =
      "success";

    transaction.verifiedAt =
      new Date();

    transaction.fulfilledAt =
      new Date();

    transaction.providerTransactionId =
      String(
        paystackData?.id || ""
      );

    transaction.paystackData =
      paystackData;

    await transaction.save();

    return {
      alreadyFulfilled: false,
      superAdmin: false,
      user:
        await User.findById(
          user._id
        ),
    };
  };

/**
 * Verify a Paystack payment.
 *
 * GET /api/v1/subscription/paystack/verify/:reference
 */
const verifyPaystackPayment =
  async (req, res) => {
    try {
      const {
        reference,
      } = req.params;

      if (!reference) {
        return res.status(400).json({
          success: false,
          code:
            "REFERENCE_REQUIRED",
          message:
            "Transaction reference is required.",
        });
      }

      const transaction =
        await SubscriptionTransaction.findOne(
          {
            reference,
          }
        );

      if (!transaction) {
        return res.status(404).json({
          success: false,
          code:
            "TRANSACTION_NOT_FOUND",
          message:
            "Subscription transaction was not found.",
        });
      }

      /*
       * Make sure the authenticated user owns
       * this transaction.
       */
      if (
        String(
          transaction.userId
        ) !==
        String(
          req.user._id
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to verify this transaction.",
        });
      }

      const verification =
        await verifyTransaction(
          reference
        );

      if (
        !verification?.status ||
        !verification?.data
      ) {
        return res.status(400).json({
          success: false,
          code:
            "PAYSTACK_VERIFICATION_FAILED",
          message:
            verification?.message ||
            "Paystack transaction verification failed.",
        });
      }

      const paystackData =
        verification.data;

      transaction.status =
        paystackData.status ||
        "pending";

      transaction.providerTransactionId =
        String(
          paystackData.id ||
            ""
        );

      transaction.paystackData =
        paystackData;

      transaction.verifiedAt =
        new Date();

      await transaction.save();

      /*
       * Only successful transactions can activate
       * a subscription.
       */
      if (
        paystackData.status !==
        "success"
      ) {
        return res.status(200).json({
          success: true,

          paid: false,

          status:
            paystackData.status,

          message:
            `Payment has not completed. Current Paystack status: ${paystackData.status}.`,
        });
      }

      const fulfillment =
        await fulfillSuccessfulTransaction(
          transaction,
          paystackData
        );

      const refreshedUser =
        await User.findById(
          transaction.userId
        );

      return res.status(200).json({
        success: true,

        paid: true,

        alreadyFulfilled:
          fulfillment.alreadyFulfilled,

        message:
          fulfillment.alreadyFulfilled
            ? "Payment was already processed."
            : "Payment verified and subscription activated.",

        subscription:
          getEffectiveSubscription(
            refreshedUser
          ),

        quota:
          getUserQuota(
            refreshedUser
          ),
      });
    } catch (error) {
      console.error(
        "Paystack verification error:",
        error
      );

      return res.status(500).json({
        success: false,
        code:
          "PAYSTACK_VERIFICATION_FAILED",
        message:
          error.message ||
          "Unable to verify Paystack payment.",
      });
    }
  };

/**
 * Paystack webhook.
 *
 * POST /api/v1/subscription/paystack/webhook
 *
 * IMPORTANT:
 * This endpoint must NOT require JWT authentication.
 *
 * Paystack calls it directly.
 */
const handlePaystackWebhook =
  async (req, res) => {
    /*
     * Acknowledge invalid/malformed events safely.
     *
     * Paystack expects a 200 response for acknowledged
     * webhook events. Signature validation happens first.
     */
    try {
      const signature =
        req.headers[
          "x-paystack-signature"
        ];

      const rawBody =
        req.rawBody;

      if (!rawBody) {
        console.error(
          "❌ Paystack webhook raw body is unavailable."
        );

        return res
          .status(400)
          .json({
            success: false,
            message:
              "Webhook raw body is required.",
          });
      }

      const validSignature =
        verifyWebhookSignature(
          rawBody,
          signature
        );

      if (!validSignature) {
        console.error(
          "❌ Invalid Paystack webhook signature."
        );

        return res
          .status(401)
          .json({
            success: false,
            message:
              "Invalid webhook signature.",
          });
      }

      const event =
        req.body;

      console.log(
        "📥 Paystack webhook:",
        event?.event
      );

      /*
       * We currently need successful payment events
       * to activate subscriptions.
       */
      if (
        event?.event ===
        "charge.success"
      ) {
        const reference =
          event?.data?.reference;

        if (!reference) {
          console.error(
            "❌ Paystack charge.success has no reference."
          );

          return res
            .status(200)
            .json({
              success: true,
            });
        }

        const transaction =
          await SubscriptionTransaction.findOne(
            {
              reference,
            }
          );

        /*
         * The webhook may arrive before our local
         * transaction record exists due to unusual
         * timing. We acknowledge it instead of
         * repeatedly failing the webhook.
         */
        if (!transaction) {
          console.warn(
            `⚠️ No local transaction found for Paystack reference: ${reference}`
          );

          return res
            .status(200)
            .json({
              success: true,
            });
        }

        transaction.webhookReceivedAt =
          new Date();

        await transaction.save();

        /*
         * Always verify the transaction with Paystack
         * before delivering subscription value.
         */
        const verification =
          await verifyTransaction(
            reference
          );

        if (
          !verification?.status ||
          !verification?.data
        ) {
          console.error(
            `❌ Could not verify webhook transaction: ${reference}`
          );

          return res
            .status(200)
            .json({
              success: true,
            });
        }

        const paystackData =
          verification.data;

        if (
          paystackData.status !==
          "success"
        ) {
          console.warn(
            `⚠️ Webhook transaction ${reference} is not successful.`
          );

          return res
            .status(200)
            .json({
              success: true,
            });
        }

        try {
          await fulfillSuccessfulTransaction(
            transaction,
            paystackData
          );

          console.log(
            `✅ Subscription payment fulfilled: ${reference}`
          );
        } catch (fulfillmentError) {
          console.error(
            `❌ Subscription fulfillment failed for ${reference}:`,
            fulfillmentError
          );

          /*
           * We still acknowledge the webhook.
           *
           * The transaction remains recorded and can be
           * reconciled/reprocessed rather than causing
           * uncontrolled webhook retries.
           */
        }
      }

      /*
       * Other Paystack events can be handled here later:
       *
       * subscription.create
       * subscription.disable
       * invoice.create
       * invoice.update
       * charge.failed
       *
       * We will add recurring subscription handling when
       * Paystack recurring plans are configured.
       */

      return res
        .status(200)
        .json({
          success: true,
        });
    } catch (error) {
      console.error(
        "❌ Paystack webhook error:",
        error
      );

      /*
       * Return 200 after the event has been authenticated
       * so Paystack does not repeatedly resend an event
       * because of an application-level processing error.
       */
      return res
        .status(200)
        .json({
          success: true,
        });
    }
  };

/**
 * Manual activation.
 *
 * Kept for development/admin testing.
 *
 * Production paid activation should happen through
 * Paystack verification/webhook.
 */
const activateMySubscription =
  async (req, res) => {
    try {
      const {
        plan,
        autoRenew = false,
      } = req.body;

      if (!plan) {
        return res.status(400).json({
          success: false,
          message:
            "Subscription plan is required.",
        });
      }

      const user =
        await User.findById(
          req.user._id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      if (isSuperAdmin(user)) {
        return res.status(403).json({
          success: false,
          code:
            "SUPERADMIN_UNLIMITED",
          message:
            "Super Admin already has unlimited access and does not need a subscription.",
        });
      }

      const selectedPlan =
        getSubscriptionPlan(
          plan
        );

      if (!selectedPlan) {
        return res.status(400).json({
          success: false,
          code:
            "INVALID_PLAN",
          message:
            `Invalid subscription plan: ${plan}`,
        });
      }

      /*
       * Do not allow this development endpoint to
       * activate paid plans without payment.
       */
      if (
        selectedPlan.id !==
        "free"
      ) {
        return res.status(403).json({
          success: false,
          code:
            "PAYMENT_REQUIRED",
          message:
            "Paid plans must be activated through Paystack payment.",
        });
      }

      const subscription =
        await activateSubscription({
          user,
          planId:
            plan,
          provider:
            "none",
          autoRenew,
        });

      return res.status(200).json({
        success: true,
        message:
          `${selectedPlan.name} plan activated successfully.`,
        subscription,
        quota:
          getUserQuota(user),
      });
    } catch (error) {
      console.error(
        "Activate subscription error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to activate subscription.",
      });
    }
  };

/**
 * Cancel current user's subscription.
 *
 * POST /api/v1/subscription/cancel
 */
const cancelMySubscription =
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user._id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      if (isSuperAdmin(user)) {
        return res.status(403).json({
          success: false,
          code:
            "SUPERADMIN_UNLIMITED",
          message:
            "Super Admin has unlimited access and cannot cancel a subscription.",
        });
      }

      const subscription =
        await cancelSubscription(
          user
        );

      return res.status(200).json({
        success: true,
        message:
          "Subscription cancellation has been processed.",
        subscription,
        quota:
          getUserQuota(user),
      });
    } catch (error) {
      console.error(
        "Cancel subscription error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to cancel subscription.",
      });
    }
  };

/**
 * Super Admin: inspect user's subscription.
 */
const getUserSubscriptionAdmin =
  async (req, res) => {
    try {
      const {
        userId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          userId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user ID.",
        });
      }

      const summary =
        await getSubscriptionSummary(
          userId
        );

      return res.status(200).json({
        success: true,
        ...summary,
      });
    } catch (error) {
      console.error(
        "Get user subscription admin error:",
        error
      );

      if (
        error.message ===
        "User not found."
      ) {
        return res.status(404).json({
          success: false,
          message:
            error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to load user subscription information.",
      });
    }
  };

/**
 * Super Admin: manually assign a subscription.
 */
const updateUserSubscriptionAdmin =
  async (req, res) => {
    try {
      const {
        userId,
      } = req.params;

      const {
        plan,
        autoRenew = false,
        durationDays,
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          userId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user ID.",
        });
      }

      const targetUser =
        await User.findById(
          userId
        );

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      if (
        isSuperAdmin(
          targetUser
        )
      ) {
        return res.status(400).json({
          success: false,
          code:
            "TARGET_IS_SUPERADMIN",
          message:
            "Super Admin users already have unlimited access and should not be assigned a subscription plan.",
        });
      }

      if (!plan) {
        return res.status(400).json({
          success: false,
          message:
            "Subscription plan is required.",
        });
      }

      const selectedPlan =
        getSubscriptionPlan(
          plan
        );

      if (!selectedPlan) {
        return res.status(400).json({
          success: false,
          code:
            "INVALID_PLAN",
          message:
            `Invalid subscription plan: ${plan}`,
        });
      }

      const subscription =
        await activateSubscription({
          user:
            targetUser,

          planId:
            plan,

          provider:
            "none",

          autoRenew,

          durationDays,
        });

      return res.status(200).json({
        success: true,

        message:
          `${selectedPlan.name} subscription assigned successfully.`,

        user: {
          id:
            targetUser._id,

          name:
            targetUser.name,

          username:
            targetUser.username,

          email:
            targetUser.email,
        },

        subscription,

        quota:
          getUserQuota(
            targetUser
          ),
      });
    } catch (error) {
      console.error(
        "Admin update subscription error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update user subscription.",
      });
    }
  };

/**
 * Super Admin: cancel user's subscription.
 */
const cancelUserSubscriptionAdmin =
  async (req, res) => {
    try {
      const {
        userId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          userId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user ID.",
        });
      }

      const targetUser =
        await User.findById(
          userId
        );

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      if (
        isSuperAdmin(
          targetUser
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Super Admin already has unlimited access.",
        });
      }

      const subscription =
        await cancelSubscription(
          targetUser
        );

      return res.status(200).json({
        success: true,

        message:
          "User subscription cancellation processed.",

        subscription,

        quota:
          getUserQuota(
            targetUser
          ),
      });
    } catch (error) {
      console.error(
        "Admin cancel subscription error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to cancel user subscription.",
      });
    }
  };

module.exports = {
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
};