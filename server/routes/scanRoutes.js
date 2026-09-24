const express = require("express");

const router = express.Router();

const upload =
  require("../middleware/upload");

const {
  protect
} = require("../middleware/authMiddleware");

const {
  processScan,
  getUserScanHistory,
  updateScanRecord,
  getScanQuotaInfo
} = require("../controllers/scanController");

/*
 * All scan endpoints require authentication.
 */
router.use(protect);

/*
 * GET /api/v1/scan/quota
 *
 * Current subscription and scan entitlement.
 */
router.get(
  "/quota",
  getScanQuotaInfo
);

/*
 * POST /api/v1/scan
 */
router.post(
  "/",
  upload.single("document"),
  processScan
);

/*
 * GET /api/v1/scan
 */
router.get(
  "/",
  getUserScanHistory
);

/*
 * GET /api/v1/scan/history
 */
router.get(
  "/history",
  getUserScanHistory
);

/*
 * GET /api/v1/scan/receipts
 */
router.get(
  "/receipts",
  getUserScanHistory
);

/*
 * PUT /api/v1/scan/:id
 */
router.put(
  "/:id",
  updateScanRecord
);

module.exports = router;