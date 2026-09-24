const express = require("express");

const router = express.Router();

const {
  createInvoice,
  getMyInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  duplicateInvoice,
  calculateInvoice,
  updateInvoiceStatus,
  recordInvoicePayment,
  markInvoiceExported,
} = require("../controllers/invoiceController");

const {
  protect,
} = require("../middleware/authMiddleware");

// ============================================================
// AUTHENTICATION
// ============================================================

router.use(protect);

// ============================================================
// CALCULATION
// ============================================================

/*
 * Must come before /:id so "calculate" is not interpreted
 * as an invoice ID.
 */
router.post(
  "/calculate",
  calculateInvoice
);

// ============================================================
// INVOICE COLLECTION
// ============================================================

router.post(
  "/",
  createInvoice
);

router.get(
  "/",
  getMyInvoices
);

// ============================================================
// SINGLE INVOICE
// ============================================================

router.get(
  "/:id",
  getInvoiceById
);

router.put(
  "/:id",
  updateInvoice
);

router.delete(
  "/:id",
  deleteInvoice
);

// ============================================================
// INVOICE ACTIONS
// ============================================================

router.post(
  "/:id/duplicate",
  duplicateInvoice
);

router.patch(
  "/:id/status",
  updateInvoiceStatus
);

router.post(
  "/:id/payment",
  recordInvoicePayment
);

router.post(
  "/:id/exported",
  markInvoiceExported
);

module.exports = router;