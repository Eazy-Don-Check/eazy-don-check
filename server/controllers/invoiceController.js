const Invoice = require("../models/Invoice");
const User = require("../models/User");

const {
  cleanString,
  toNumber,
  roundMoney,
  normalizeInvoiceData,
  calculateInvoiceTotals,
} = require("../utils/receiptUtils");

// ============================================================
// AUTHENTICATED USER HELPER
// ============================================================

const getAuthenticatedUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.auth?.userId ||
    null
  );
};

// ============================================================
// ERROR RESPONSE
// ============================================================

const sendError = (
  res,
  status,
  message,
  code = "INVOICE_ERROR"
) => {
  return res.status(status).json({
    success: false,
    code,
    message,
  });
};

// ============================================================
// DATE HELPERS
// ============================================================

const getToday = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// ============================================================
// INVOICE NUMBER GENERATOR
// ============================================================

const generateInvoiceNumber = async (
  userId
) => {
  const year = new Date()
    .getFullYear();

  const prefix = `EDC-${year}-`;

  const latestInvoice =
    await Invoice.findOne({
      userId,
      invoiceNumber: {
        $regex: `^${prefix}`,
        $options: "i",
      },
    })
      .sort({
        createdAt: -1,
      })
      .select("invoiceNumber")
      .lean();

  let nextNumber = 1;

  if (
    latestInvoice?.invoiceNumber
  ) {
    const match =
      latestInvoice.invoiceNumber.match(
        /(\d+)$/
      );

    if (match) {
      nextNumber =
        Number(match[1]) + 1;
    }
  }

  return `${prefix}${String(
    nextNumber
  ).padStart(4, "0")}`;
};

// ============================================================
// ENSURE UNIQUE INVOICE NUMBER
// ============================================================

const ensureUniqueInvoiceNumber = async (
  userId,
  requestedNumber = ""
) => {
  let invoiceNumber =
    cleanString(
      requestedNumber
    ).toUpperCase();

  if (!invoiceNumber) {
    invoiceNumber =
      await generateInvoiceNumber(
        userId
      );
  }

  let existing =
    await Invoice.exists({
      userId,
      invoiceNumber,
    });

  if (!existing) {
    return invoiceNumber;
  }

  /*
   * If the requested number already exists, generate a new
   * sequential number instead of overwriting another invoice.
   */
  let attempts = 0;

  while (existing && attempts < 20) {
    invoiceNumber =
      await generateInvoiceNumber(
        userId
      );

    existing =
      await Invoice.exists({
        userId,
        invoiceNumber,
      });

    attempts += 1;
  }

  if (existing) {
    throw new Error(
      "Unable to generate a unique invoice number."
    );
  }

  return invoiceNumber;
};

// ============================================================
// BUILD BUSINESS PROFILE
// ============================================================

const buildBusinessProfile = (
  business = {},
  user = {}
) => {
  return {
    name: cleanString(
      business?.name ||
      user?.businessName ||
      user?.name ||
      ""
    ),

    logoUrl: cleanString(
      business?.logoUrl ||
      user?.avatarUrl ||
      ""
    ),

    address: cleanString(
      business?.address ||
      ""
    ),

    phone: cleanString(
      business?.phone ||
      user?.phone ||
      ""
    ),

    email: cleanString(
      business?.email ||
      user?.email ||
      ""
    ),

    website: cleanString(
      business?.website ||
      user?.socialLinks?.website ||
      ""
    ),

    taxNumber: cleanString(
      business?.taxNumber ||
      ""
    ),
  };
};

// ============================================================
// BUILD INVOICE RESPONSE
// ============================================================

const buildInvoiceResponse = (
  invoice
) => {
  if (!invoice) {
    return null;
  }

  return {
    ...invoice,

    id:
      invoice._id?.toString?.() ||
      invoice.id,

    invoiceId:
      invoice._id?.toString?.() ||
      invoice.id,
  };
};

// ============================================================
// CREATE INVOICE
// ============================================================

const createInvoice = async (
  req,
  res
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return sendError(
        res,
        401,
        "Authentication is required.",
        "AUTH_REQUIRED"
      );
    }

    const user =
      await User.findById(
        userId
      );

    if (!user) {
      return sendError(
        res,
        404,
        "User account was not found.",
        "USER_NOT_FOUND"
      );
    }

    const body =
      req.body || {};

    /*
     * Normalize and calculate everything on the server.
     */
    const normalized =
      normalizeInvoiceData(
        body
      );

    /*
     * An invoice may be created as a draft with no items.
     *
     * However, a non-draft invoice should contain at least
     * one usable item.
     */
    const status =
      [
        "draft",
        "sent",
        "paid",
        "partially_paid",
        "overdue",
        "cancelled",
      ].includes(
        normalized.status
      )
        ? normalized.status
        : "draft";

    if (
      status !== "draft" &&
      normalized.items.length === 0
    ) {
      return sendError(
        res,
        400,
        "Add at least one invoice item before marking the invoice as sent or paid.",
        "INVOICE_ITEMS_REQUIRED"
      );
    }

    const invoiceNumber =
      await ensureUniqueInvoiceNumber(
        userId,
        normalized.invoiceNumber
      );

    const business =
      buildBusinessProfile(
        normalized.business,
        user
      );

    const invoice =
      await Invoice.create({
        userId,

        invoiceNumber,

        status,

        business,

        customer:
          normalized.customer,

        invoiceDate:
          normalized.invoiceDate ||
          getToday(),

        dueDate:
          normalized.dueDate,

        currency:
          normalized.currency,

        paymentTerms:
          normalized.paymentTerms,

        paymentDetails:
          normalized.paymentDetails,

        items:
          normalized.items,

        subtotal:
          normalized.subtotal,

        discountAmount:
          normalized.discountAmount,

        taxRate:
          normalized.taxRate,

        taxAmount:
          normalized.taxAmount,

        serviceCharge:
          normalized.serviceCharge,

        grandTotal:
          normalized.grandTotal,

        amountPaid:
          normalized.amountPaid,

        balanceDue:
          normalized.balanceDue,

        notes:
          normalized.notes,

        termsAndConditions:
          normalized.termsAndConditions,

        template:
          normalized.template,
      });

    return res.status(201).json({
      success: true,
      message:
        "Invoice created successfully.",
      data:
        buildInvoiceResponse(
          invoice.toObject()
        ),
    });
  } catch (error) {
    console.error(
      "CREATE INVOICE ERROR:",
      error
    );

    if (
      error?.code === 11000
    ) {
      return sendError(
        res,
        409,
        "An invoice with this number already exists.",
        "DUPLICATE_INVOICE_NUMBER"
      );
    }

    return sendError(
      res,
      500,
      error?.message ||
        "Failed to create invoice."
    );
  }
};

// ============================================================
// GET MY INVOICES
// ============================================================

const getMyInvoices = async (
  req,
  res
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return sendError(
        res,
        401,
        "Authentication is required.",
        "AUTH_REQUIRED"
      );
    }

    const {
      status,
      search,
      page = 1,
      limit = 50,
    } = req.query || {};

    const safePage =
      Math.max(
        1,
        Number(page) || 1
      );

    const safeLimit =
      Math.min(
        100,
        Math.max(
          1,
          Number(limit) || 50
        )
      );

    const query = {
      userId,
    };

    if (
      status &&
      [
        "draft",
        "sent",
        "paid",
        "partially_paid",
        "overdue",
        "cancelled",
      ].includes(status)
    ) {
      query.status = status;
    }

    if (
      search &&
      String(search).trim()
    ) {
      const searchText =
        String(search).trim();

      query.$or = [
        {
          invoiceNumber: {
            $regex:
              searchText,
            $options: "i",
          },
        },
        {
          "customer.name": {
            $regex:
              searchText,
            $options: "i",
          },
        },
        {
          "customer.companyName": {
            $regex:
              searchText,
            $options: "i",
          },
        },
      ];
    }

    const skip =
      (safePage - 1) *
      safeLimit;

    const [
      invoices,
      total,
    ] = await Promise.all([
      Invoice.find(query)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      Invoice.countDocuments(
        query
      ),
    ]);

    return res.json({
      success: true,

      count:
        invoices.length,

      total,

      page:
        safePage,

      limit:
        safeLimit,

      pages:
        Math.ceil(
          total /
            safeLimit
        ),

      data:
        invoices.map(
          buildInvoiceResponse
        ),
    });
  } catch (error) {
    console.error(
      "GET INVOICES ERROR:",
      error
    );

    return sendError(
      res,
      500,
      "Failed to retrieve invoices."
    );
  }
};

// ============================================================
// GET SINGLE INVOICE
// ============================================================

const getInvoiceById = async (
  req,
  res
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return sendError(
        res,
        401,
        "Authentication is required.",
        "AUTH_REQUIRED"
      );
    }

    const invoice =
      await Invoice.findOne({
        _id:
          req.params.id,
        userId,
      }).lean();

    if (!invoice) {
      return sendError(
        res,
        404,
        "Invoice was not found.",
        "INVOICE_NOT_FOUND"
      );
    }

    return res.json({
      success: true,
      data:
        buildInvoiceResponse(
          invoice
        ),
    });
  } catch (error) {
    console.error(
      "GET INVOICE ERROR:",
      error
    );

    if (
      error?.name ===
      "CastError"
    ) {
      return sendError(
        res,
        400,
        "Invalid invoice ID.",
        "INVALID_INVOICE_ID"
      );
    }

    return sendError(
      res,
      500,
      "Failed to retrieve invoice."
    );
  }
};

// ============================================================
// UPDATE INVOICE
// ============================================================

const updateInvoice = async (
  req,
  res
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return sendError(
        res,
        401,
        "Authentication is required.",
        "AUTH_REQUIRED"
      );
    }

    const invoice =
      await Invoice.findOne({
        _id:
          req.params.id,
        userId,
      });

    if (!invoice) {
      return sendError(
        res,
        404,
        "Invoice was not found.",
        "INVOICE_NOT_FOUND"
      );
    }

    const body =
      req.body || {};

    /*
     * Recalculate from the submitted item values.
     */
    const normalized =
      normalizeInvoiceData({
        ...invoice.toObject(),
        ...body,

        /*
         * Support frontend naming.
         */
        items:
          body.items ??
          body.lineItems ??
          invoice.items,
      });

    const requestedStatus =
      cleanString(
        body.status,
        invoice.status
      );

    const allowedStatuses = [
      "draft",
      "sent",
      "paid",
      "partially_paid",
      "overdue",
      "cancelled",
    ];

    const status =
      allowedStatuses.includes(
        requestedStatus
      )
        ? requestedStatus
        : invoice.status;

    if (
      status !== "draft" &&
      status !== "cancelled" &&
      normalized.items.length === 0
    ) {
      return sendError(
        res,
        400,
        "Add at least one invoice item.",
        "INVOICE_ITEMS_REQUIRED"
      );
    }

    /*
     * Invoice number can be changed, but it must remain unique
     * for this user.
     */
    let invoiceNumber =
      cleanString(
        body.invoiceNumber,
        invoice.invoiceNumber
      ).toUpperCase();

    if (
      invoiceNumber !==
      invoice.invoiceNumber
    ) {
      const duplicate =
        await Invoice.exists({
          userId,
          invoiceNumber,
          _id: {
            $ne:
              invoice._id,
          },
        });

      if (duplicate) {
        return sendError(
          res,
          409,
          "Another invoice already uses this invoice number.",
          "DUPLICATE_INVOICE_NUMBER"
        );
      }
    }

    invoice.invoiceNumber =
      invoiceNumber;

    invoice.status =
      status;

    invoice.business =
      buildBusinessProfile(
        normalized.business,
        await User.findById(
          userId
        ).lean()
      );

    invoice.customer =
      normalized.customer;

    invoice.invoiceDate =
      normalized.invoiceDate ||
      invoice.invoiceDate ||
      getToday();

    invoice.dueDate =
      normalized.dueDate;

    invoice.currency =
      normalized.currency;

    invoice.paymentTerms =
      normalized.paymentTerms;

    invoice.paymentDetails =
      normalized.paymentDetails;

    invoice.items =
      normalized.items;

    /*
     * Server-authoritative calculations.
     */
    invoice.subtotal =
      normalized.subtotal;

    invoice.discountAmount =
      normalized.discountAmount;

    invoice.taxRate =
      normalized.taxRate;

    invoice.taxAmount =
      normalized.taxAmount;

    invoice.serviceCharge =
      normalized.serviceCharge;

    invoice.grandTotal =
      normalized.grandTotal;

    invoice.amountPaid =
      normalized.amountPaid;

    invoice.balanceDue =
      normalized.balanceDue;

    invoice.notes =
      normalized.notes;

    invoice.termsAndConditions =
      normalized.termsAndConditions;

    invoice.template =
      normalized.template;

    /*
     * Payment status helpers.
     */
    if (
      invoice.amountPaid >=
      invoice.grandTotal &&
      invoice.grandTotal > 0
    ) {
      invoice.amountPaid =
        invoice.grandTotal;

      invoice.balanceDue = 0;

      if (
        invoice.status !==
        "cancelled"
      ) {
        invoice.status =
          "paid";

        if (!invoice.paidAt) {
          invoice.paidAt =
            new Date();
        }
      }
    } else if (
      invoice.amountPaid > 0 &&
      invoice.amountPaid <
        invoice.grandTotal &&
      invoice.status !==
        "cancelled"
    ) {
      invoice.status =
        "partially_paid";

      invoice.paidAt =
        null;
    } else if (
      invoice.status ===
      "paid"
    ) {
      invoice.status =
        "sent";

      invoice.paidAt =
        null;
    }

    await invoice.save();

    return res.json({
      success: true,

      message:
        "Invoice updated successfully.",

      data:
        buildInvoiceResponse(
          invoice.toObject()
        ),
    });
  } catch (error) {
    console.error(
      "UPDATE INVOICE ERROR:",
      error
    );

    if (
      error?.name ===
      "CastError"
    ) {
      return sendError(
        res,
        400,
        "Invalid invoice ID.",
        "INVALID_INVOICE_ID"
      );
    }

    if (
      error?.code === 11000
    ) {
      return sendError(
        res,
        409,
        "An invoice with this number already exists.",
        "DUPLICATE_INVOICE_NUMBER"
      );
    }

    return sendError(
      res,
      500,
      error?.message ||
        "Failed to update invoice."
    );
  }
};

// ============================================================
// DELETE INVOICE
// ============================================================

const deleteInvoice = async (
  req,
  res
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return sendError(
        res,
        401,
        "Authentication is required.",
        "AUTH_REQUIRED"
      );
    }

    const invoice =
      await Invoice.findOneAndDelete({
        _id:
          req.params.id,
        userId,
      });

    if (!invoice) {
      return sendError(
        res,
        404,
        "Invoice was not found.",
        "INVOICE_NOT_FOUND"
      );
    }

    return res.json({
      success: true,

      message:
        "Invoice deleted successfully.",

      data: {
        id:
          invoice._id.toString(),
      },
    });
  } catch (error) {
    console.error(
      "DELETE INVOICE ERROR:",
      error
    );

    if (
      error?.name ===
      "CastError"
    ) {
      return sendError(
        res,
        400,
        "Invalid invoice ID.",
        "INVALID_INVOICE_ID"
      );
    }

    return sendError(
      res,
      500,
      "Failed to delete invoice."
    );
  }
};

// ============================================================
// DUPLICATE INVOICE
// ============================================================

const duplicateInvoice = async (
  req,
  res
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return sendError(
        res,
        401,
        "Authentication is required.",
        "AUTH_REQUIRED"
      );
    }

    const original =
      await Invoice.findOne({
        _id:
          req.params.id,
        userId,
      }).lean();

    if (!original) {
      return sendError(
        res,
        404,
        "Invoice was not found.",
        "INVOICE_NOT_FOUND"
      );
    }

    const invoiceNumber =
      await ensureUniqueInvoiceNumber(
        userId
      );

    const duplicateData = {
      ...original,

      _id: undefined,

      invoiceNumber,

      status:
        "draft",

      createdAt:
        undefined,

      updatedAt:
        undefined,

      paidAt:
        null,

      lastExportedAt:
        null,

      amountPaid:
        0,

      balanceDue:
        original.grandTotal || 0,
    };

    const duplicated =
      await Invoice.create(
        duplicateData
      );

    return res.status(201).json({
      success: true,

      message:
        "Invoice duplicated successfully.",

      data:
        buildInvoiceResponse(
          duplicated.toObject()
        ),
    });
  } catch (error) {
    console.error(
      "DUPLICATE INVOICE ERROR:",
      error
    );

    return sendError(
      res,
      500,
      error?.message ||
        "Failed to duplicate invoice."
    );
  }
};

// ============================================================
// RECALCULATE INVOICE
// ============================================================

const calculateInvoice = async (
  req,
  res
) => {
  try {
    const body =
      req.body || {};

    const result =
      calculateInvoiceTotals({
        lineItems:
          body.items ||
          body.lineItems ||
          [],

        taxRate:
          body.taxRate ||
          0,

        taxAmount:
          body.taxAmount,

        discountAmount:
          body.discountAmount ||
          0,

        serviceCharge:
          body.serviceCharge ||
          0,

        amountPaid:
          body.amountPaid ||
          0,
      });

    return res.json({
      success: true,

      data: {
        items:
          result.lineItems,

        subtotal:
          result.subtotal,

        discountAmount:
          result.discountAmount,

        taxRate:
          result.taxRate,

        taxAmount:
          result.taxAmount,

        serviceCharge:
          result.serviceCharge,

        grandTotal:
          result.grandTotal,

        amountPaid:
          result.amountPaid,

        balanceDue:
          result.balanceDue,
      },
    });
  } catch (error) {
    console.error(
      "CALCULATE INVOICE ERROR:",
      error
    );

    return sendError(
      res,
      500,
      "Failed to calculate invoice."
    );
  }
};

// ============================================================
// UPDATE INVOICE STATUS
// ============================================================

const updateInvoiceStatus =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        getAuthenticatedUserId(
          req
        );

      if (!userId) {
        return sendError(
          res,
          401,
          "Authentication is required.",
          "AUTH_REQUIRED"
        );
      }

      const allowedStatuses = [
        "draft",
        "sent",
        "paid",
        "partially_paid",
        "overdue",
        "cancelled",
      ];

      const status =
        cleanString(
          req.body?.status
        );

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return sendError(
          res,
          400,
          "Invalid invoice status.",
          "INVALID_STATUS"
        );
      }

      const invoice =
        await Invoice.findOne({
          _id:
            req.params.id,
          userId,
        });

      if (!invoice) {
        return sendError(
          res,
          404,
          "Invoice was not found.",
          "INVOICE_NOT_FOUND"
        );
      }

      invoice.status =
        status;

      if (
        status === "paid"
      ) {
        invoice.amountPaid =
          invoice.grandTotal;

        invoice.balanceDue =
          0;

        invoice.paidAt =
          new Date();
      }

      if (
        status !== "paid" &&
        invoice.paidAt
      ) {
        invoice.paidAt =
          null;
      }

      await invoice.save();

      return res.json({
        success: true,

        message:
          "Invoice status updated successfully.",

        data:
          buildInvoiceResponse(
            invoice.toObject()
          ),
      });
    } catch (error) {
      console.error(
        "UPDATE INVOICE STATUS ERROR:",
        error
      );

      return sendError(
        res,
        500,
        "Failed to update invoice status."
      );
    }
  };

// ============================================================
// RECORD PAYMENT
// ============================================================

const recordInvoicePayment =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        getAuthenticatedUserId(
          req
        );

      if (!userId) {
        return sendError(
          res,
          401,
          "Authentication is required.",
          "AUTH_REQUIRED"
        );
      }

      const invoice =
        await Invoice.findOne({
          _id:
            req.params.id,
          userId,
        });

      if (!invoice) {
        return sendError(
          res,
          404,
          "Invoice was not found.",
          "INVOICE_NOT_FOUND"
        );
      }

      const requestedPayment =
        toNumber(
          req.body?.amount,
          0
        );

      if (
        requestedPayment <= 0
      ) {
        return sendError(
          res,
          400,
          "Payment amount must be greater than zero.",
          "INVALID_PAYMENT_AMOUNT"
        );
      }

      const newAmountPaid =
        roundMoney(
          Math.min(
            invoice.grandTotal,
            invoice.amountPaid +
              requestedPayment
          )
        );

      invoice.amountPaid =
        newAmountPaid;

      invoice.balanceDue =
        roundMoney(
          Math.max(
            0,
            invoice.grandTotal -
              newAmountPaid
          )
        );

      if (
        invoice.balanceDue ===
        0
      ) {
        invoice.status =
          "paid";

        invoice.paidAt =
          new Date();
      } else {
        invoice.status =
          "partially_paid";

        invoice.paidAt =
          null;
      }

      await invoice.save();

      return res.json({
        success: true,

        message:
          "Invoice payment recorded successfully.",

        data:
          buildInvoiceResponse(
            invoice.toObject()
          ),
      });
    } catch (error) {
      console.error(
        "RECORD PAYMENT ERROR:",
        error
      );

      return sendError(
        res,
        500,
        "Failed to record invoice payment."
      );
    }
  };

// ============================================================
// MARK EXPORT
// ============================================================

const markInvoiceExported =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        getAuthenticatedUserId(
          req
        );

      if (!userId) {
        return sendError(
          res,
          401,
          "Authentication is required.",
          "AUTH_REQUIRED"
        );
      }

      const invoice =
        await Invoice.findOneAndUpdate(
          {
            _id:
              req.params.id,
            userId,
          },
          {
            $set: {
              lastExportedAt:
                new Date(),
            },
          },
          {
            new: true,
          }
        ).lean();

      if (!invoice) {
        return sendError(
          res,
          404,
          "Invoice was not found.",
          "INVOICE_NOT_FOUND"
        );
      }

      return res.json({
        success: true,

        data:
          buildInvoiceResponse(
            invoice
          ),
      });
    } catch (error) {
      console.error(
        "MARK EXPORT ERROR:",
        error
      );

      return sendError(
        res,
        500,
        "Failed to update invoice export information."
      );
    }
  };

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
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
};