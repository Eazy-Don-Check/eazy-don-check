const Verification = require("../models/Verification");
const User = require("../models/User");

const {
  extractTextFromImage,
} = require("../services/ocrService");

const {
  extractTextFromPDF,
} = require("../services/pdfService");

const {
  extractReceiptData,
} = require("../services/aiService");

const {
  normalizeReceiptData,
  validateReceiptData,
} = require("../utils/receiptUtils");

const {
  getEffectiveSubscription,
  getUserQuota,
  resetMonthlyUsageIfNeeded,
  expireSubscriptionIfNeeded,
} = require("../services/subscriptionService");

/**
 * Determine whether the uploaded file is a PDF.
 */
const isPDF = (file) => {
  if (!file) return false;

  return (
    file.mimetype === "application/pdf" ||
    file.originalname?.toLowerCase().endsWith(".pdf")
  );
};

/**
 * Determine the document type.
 */
const getDocumentType = (file) => {
  return isPDF(file) ? "invoice" : "receipt";
};

/**
 * Get the authenticated user's ID.
 */
const getAuthenticatedUserId = (req) => {
  return req.user?._id || req.user?.id || null;
};

/**
 * Build a frontend-friendly subscription response.
 */
const buildSubscriptionResponse = (user) => {
  const effective = getEffectiveSubscription(user);

  return {
    plan: effective.unlimited
      ? "unlimited"
      : effective.plan?.id || "free",

    planName: effective.unlimited
      ? "Unlimited"
      : effective.plan?.name || "Free",

    status: effective.unlimited
      ? "active"
      : effective.status || "inactive",

    expiresAt: effective.expiresAt || null,

    autoRenew: Boolean(effective.autoRenew),

    unlimited: Boolean(effective.unlimited),
  };
};

/**
 * Build a consistent quota response.
 */
const buildQuotaResponse = (user) => {
  const quota = getUserQuota(user);

  const scanLimit =
    quota.scans?.limit === undefined ||
    quota.scans?.limit === null
      ? null
      : Number(quota.scans.limit);

  const photoLimit =
    quota.photos?.limit === undefined ||
    quota.photos?.limit === null
      ? null
      : Number(quota.photos.limit);

  return {
    unlimited: Boolean(quota.unlimited),

    scansUsed: Number(quota.scans?.used || 0),

    maxScans: scanLimit,

    scansRemaining:
      quota.scans?.remaining === undefined ||
      quota.scans?.remaining === null
        ? "Unlimited"
        : quota.scans.remaining,

    photosUsed: Number(quota.photos?.used || 0),

    maxPhotos: photoLimit,

    photosRemaining:
      quota.photos?.remaining === undefined ||
      quota.photos?.remaining === null
        ? "Unlimited"
        : quota.photos.remaining,
  };
};

/**
 * Get the effective scan limit.
 *
 * Kept for backwards compatibility.
 *
 * -1 means unlimited.
 */
const getEffectiveScanLimit = (user) => {
  const effective = getEffectiveSubscription(user);

  if (effective.unlimited) {
    return -1;
  }

  const limit = Number(effective.scansLimit);

  if (Number.isFinite(limit) && limit >= 0) {
    return limit;
  }

  return 10;
};

/**
 * Get current scan quota.
 */
const getScanQuota = (user) => {
  const quota = getUserQuota(user);

  const used = Number(
    quota.scans?.used || 0
  );

  const unlimited =
    Boolean(quota.unlimited) ||
    getEffectiveScanLimit(user) === -1;

  if (unlimited) {
    return {
      unlimited: true,
      limit: -1,
      used,
      remaining: "Unlimited",
      reachedLimit: false,
    };
  }

  const limit = getEffectiveScanLimit(user);

  const remaining = Math.max(
    0,
    limit - used
  );

  return {
    unlimited: false,
    limit,
    used,
    remaining,
    reachedLimit: used >= limit,
  };
};

/**
 * Increment scan usage.
 *
 * Uses the User model method when available.
 * Falls back to direct usage mutation for
 * compatibility with older User documents.
 */
const incrementScanUsage = async (user) => {
  if (
    typeof user.incrementScanUsage === "function"
  ) {
    await user.incrementScanUsage();
    return;
  }

  if (!user.usage) {
    user.usage = {};
  }

  user.usage.scans =
    Number(user.usage.scans || 0) + 1;

  user.usage.scansThisMonth =
    Number(user.usage.scansThisMonth || 0) + 1;

  user.scansCount =
    Number(user.scansCount || 0) + 1;

  await user.save();
};

/**
 * Process an uploaded receipt/invoice.
 *
 * POST /api/v1/scan
 */
const processScan = async (req, res) => {
  try {
    // ============================================================
    // 1. FILE VALIDATION
    // ============================================================

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error:
          "Please upload a receipt or invoice document.",
      });
    }

    if (
      !req.file.buffer ||
      !req.file.buffer.length
    ) {
      return res.status(400).json({
        success: false,
        error:
          "The uploaded document is empty or could not be read.",
      });
    }

    // ============================================================
    // 2. AUTHENTICATION
    // ============================================================

    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    // ============================================================
    // 3. LOAD USER
    // ============================================================

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User account not found.",
      });
    }

    // ============================================================
    // 4. EXPIRE SUBSCRIPTION IF REQUIRED
    // ============================================================

    await expireSubscriptionIfNeeded(user);

    // ============================================================
    // 5. RESET USAGE IF REQUIRED
    // ============================================================

    await resetMonthlyUsageIfNeeded(user);

    // ============================================================
    // 6. CHECK CURRENT ENTITLEMENT
    // ============================================================

    const effectiveSubscription =
      getEffectiveSubscription(user);

    const quota =
      getScanQuota(user);

    console.log(
      "📊 Scan entitlement:",
      {
        userId: String(user._id),

        role: user.role,

        plan:
          effectiveSubscription.unlimited
            ? "unlimited"
            : effectiveSubscription.plan?.id ||
              "free",

        status:
          effectiveSubscription.status,

        scansUsed:
          quota.used,

        maxScans:
          quota.limit,

        scansRemaining:
          quota.remaining,

        unlimited:
          quota.unlimited,
      }
    );

    // ============================================================
    // 7. QUOTA REACHED
    // ============================================================

    if (quota.reachedLimit) {
      return res.status(403).json({
        success: false,

        error:
          "You have reached your scan limit. Please upgrade your subscription to continue scanning.",

        code:
          "SCAN_LIMIT_REACHED",

        scansUsed:
          quota.used,

        maxScans:
          quota.limit,

        scansRemaining:
          0,

        unlimited:
          false,

        subscription:
          buildSubscriptionResponse(user),

        quota:
          buildQuotaResponse(user),
      });
    }

    // ============================================================
    // 8. EXTRACT TEXT
    // ============================================================

    let extractedText = "";

    if (isPDF(req.file)) {
      console.log(
        `📄 Extracting text from PDF: ${req.file.originalname}`
      );

      extractedText =
        await extractTextFromPDF(
          req.file.buffer
        );
    } else {
      console.log(
        `🖼️ Running OCR on image: ${req.file.originalname}`
      );

      extractedText =
        await extractTextFromImage(
          req.file.buffer
        );
    }

    extractedText =
      String(
        extractedText || ""
      ).trim();

    if (!extractedText) {
      return res.status(422).json({
        success: false,
        error:
          "No readable text could be extracted from this document. Please upload a clearer image or a searchable PDF.",
      });
    }

    console.log(
      `✅ Text extraction completed. Characters: ${extractedText.length}`
    );

    // ============================================================
    // 9. AI EXTRACTION
    // ============================================================

    console.log(
      "🤖 Sending extracted document text to AI..."
    );

    const aiResult =
      await extractReceiptData(
        extractedText
      );

    // ============================================================
    // 10. NORMALIZE
    // ============================================================

    const normalizedData =
      normalizeReceiptData(
        aiResult
      );

    normalizedData.rawText =
      extractedText;

    // ============================================================
    // 11. VALIDATE
    // ============================================================

    const validation =
      validateReceiptData(
        normalizedData
      );

    const verificationStatus =
      validation.valid
        ? "success"
        : "flagged";

    // ============================================================
    // 12. SAVE VERIFICATION
    // ============================================================

    const verification =
      await Verification.create({
        userId: user._id,

        documentType:
          getDocumentType(req.file),

        fileName:
          req.file.originalname,

        extractedData: {
          vendorName:
            normalizedData.vendorName,

          merchantName:
            normalizedData.merchantName,

          invoiceNumber:
            normalizedData.invoiceNumber,

          date:
            normalizedData.date,

          currency:
            normalizedData.currency,

          category:
            normalizedData.category,

          subtotal:
            normalizedData.subtotal,

          taxAmount:
            normalizedData.taxAmount,

          totalAmount:
            normalizedData.totalAmount,

          confidenceScore:
            normalizedData.confidenceScore,

          lineItems:
            normalizedData.lineItems,

          rawText:
            normalizedData.rawText,

          rawJson:
            aiResult,
        },

        status:
          verificationStatus,
      });

    // ============================================================
    // 13. CONSUME ONE SCAN
    // ============================================================

    await incrementScanUsage(user);

    // ============================================================
    // 14. RECALCULATE QUOTA
    // ============================================================

    const updatedQuota =
      getScanQuota(user);

    const quotaResponse =
      buildQuotaResponse(user);

    const subscriptionResponse =
      buildSubscriptionResponse(user);

    // ============================================================
    // 15. RESPONSE
    // ============================================================

    return res.status(200).json({
      success: true,

      message:
        validation.valid
          ? "Document scanned and verified successfully."
          : "Document scanned, but some information could not be confidently verified.",

      data:
        verification,

      validation: {
        valid:
          validation.valid,

        problems:
          validation.problems || [],
      },

      subscription:
        subscriptionResponse,

      scansUsed:
        updatedQuota.used,

      maxScans:
        updatedQuota.limit,

      scansRemaining:
        updatedQuota.remaining,

      unlimited:
        updatedQuota.unlimited,

      quota:
        quotaResponse,
    });

  } catch (error) {
    console.error(
      "❌ Scan processing error:",
      error
    );

    // ============================================================
    // MULTER ERRORS
    // ============================================================

    if (
      error.name === "MulterError"
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          success: false,
          error:
            "File is too large. Maximum allowed size is 10 MB.",
        });
      }

      return res.status(400).json({
        success: false,
        error:
          error.message ||
          "File upload error.",
      });
    }

    // ============================================================
    // PROCESSING ERRORS
    // ============================================================

    const errorMessage =
      String(
        error?.message || ""
      );

    if (
      errorMessage
        .toLowerCase()
        .includes("ocr") ||
      errorMessage
        .toLowerCase()
        .includes("groq") ||
      errorMessage
        .toLowerCase()
        .includes("pdf")
    ) {
      return res.status(422).json({
        success: false,
        error:
          errorMessage ||
          "Unable to process the uploaded document.",
      });
    }

    // ============================================================
    // GENERAL ERROR
    // ============================================================

    return res.status(500).json({
      success: false,

      error:
        "Scan error: " +
        (
          error.message ||
          "Unknown server error."
        ),
    });
  }
};

/**
 * Get authenticated user's scan history.
 *
 * GET /api/v1/scan
 * GET /api/v1/scan/history
 * GET /api/v1/scan/receipts
 */
const getUserScanHistory =
  async (req, res) => {
    try {
      const userId =
        getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error:
            "Authentication required.",
        });
      }

      const history =
        await Verification.find({
          userId,
        })
          .sort({
            createdAt: -1,
          })
          .limit(50)
          .lean();

      return res.status(200).json({
        success: true,

        count:
          history.length,

        data:
          history,
      });

    } catch (error) {
      console.error(
        "❌ Scan history error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Failed to retrieve scan history.",
      });
    }
  };

/**
 * Update an existing scan record.
 *
 * PUT /api/v1/scan/:id
 */
const updateScanRecord =
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      const userId =
        getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error:
            "Authentication required.",
        });
      }

      if (!id) {
        return res.status(400).json({
          success: false,
          error:
            "Scan record ID is required.",
        });
      }

      const normalizedData =
        normalizeReceiptData(
          req.body
        );

      const record =
        await Verification.findOneAndUpdate(
          {
            _id: id,
            userId,
          },
          {
            $set: {
              extractedData: {
                vendorName:
                  normalizedData.vendorName,

                merchantName:
                  normalizedData.merchantName,

                invoiceNumber:
                  normalizedData.invoiceNumber,

                date:
                  normalizedData.date,

                currency:
                  normalizedData.currency,

                category:
                  normalizedData.category,

                subtotal:
                  normalizedData.subtotal,

                taxAmount:
                  normalizedData.taxAmount,

                totalAmount:
                  normalizedData.totalAmount,

                confidenceScore:
                  normalizedData.confidenceScore,

                lineItems:
                  normalizedData.lineItems,

                rawText:
                  req.body.rawText ||
                  "",

                rawJson:
                  req.body.rawJson ||
                  undefined,
              },
            },
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!record) {
        return res.status(404).json({
          success: false,
          error:
            "Scan record not found.",
        });
      }

      return res.status(200).json({
        success: true,

        message:
          "Record updated successfully.",

        data:
          record,
      });

    } catch (error) {
      console.error(
        "❌ Update scan error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Server error updating record: " +
          (
            error.message ||
            "Unknown error."
          ),
      });
    }
  };

/**
 * Get current scan quota.
 *
 * GET /api/v1/scan/quota
 */
const getScanQuotaInfo =
  async (req, res) => {
    try {
      const userId =
        getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error:
            "Authentication required.",
        });
      }

      const user =
        await User.findById(
          userId
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          error:
            "User account not found.",
        });
      }

      // Expire outdated subscription first.
      await expireSubscriptionIfNeeded(
        user
      );

      // Synchronize usage period.
      await resetMonthlyUsageIfNeeded(
        user
      );

      const quota =
        getScanQuota(user);

      const effectiveSubscription =
        getEffectiveSubscription(
          user
        );

      const quotaResponse =
        buildQuotaResponse(user);

      return res.status(200).json({
        success: true,

        data: {
          unlimited:
            quota.unlimited,

          scansUsed:
            quota.used,

          maxScans:
            quota.limit,

          scansRemaining:
            quota.remaining,

          plan:
            effectiveSubscription.unlimited
              ? "unlimited"
              : effectiveSubscription.plan?.id ||
                "free",

          planName:
            effectiveSubscription.unlimited
              ? "Unlimited"
              : effectiveSubscription.plan?.name ||
                "Free",

          subscriptionStatus:
            effectiveSubscription.unlimited
              ? "active"
              : effectiveSubscription.status ||
                "inactive",

          expiresAt:
            effectiveSubscription.expiresAt ||
            null,

          autoRenew:
            Boolean(
              effectiveSubscription.autoRenew
            ),

          quota:
            quotaResponse,
        },
      });

    } catch (error) {
      console.error(
        "❌ Scan quota error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Failed to retrieve scan quota.",
      });
    }
  };

module.exports = {
  processScan,
  getUserScanHistory,
  updateScanRecord,
  getScanQuotaInfo,

  getEffectiveScanLimit,
  getScanQuota,
};