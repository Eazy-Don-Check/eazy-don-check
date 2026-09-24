const cleanString = (value, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const result = String(value).trim();

  return result || fallback;
};

// ============================================================
// NUMBER HELPERS
// ============================================================

const toNumber = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value
      .replace(/,/g, "")
      .replace(/[^\d.-]/g, "");

    if (!cleaned) {
      return fallback;
    }

    const parsed = Number(cleaned);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  return fallback;
};

const roundMoney = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.round((number + Number.EPSILON) * 100) / 100;
};

// ============================================================
// LINE ITEM NORMALIZATION
// ============================================================

const normalizeLineItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const description = cleanString(
        item?.description ||
        item?.name ||
        item?.item ||
        item?.product ||
        item?.title
      );

      let qty = toNumber(
        item?.qty ??
        item?.quantity ??
        item?.count,
        1
      );

      let unitPrice = toNumber(
        item?.unitPrice ??
        item?.price ??
        item?.unit_price ??
        item?.rate,
        0
      );

      const extractedTotal = toNumber(
        item?.total ??
        item?.amount ??
        item?.lineTotal ??
        item?.line_total,
        0
      );

      qty = Math.max(0, qty);
      unitPrice = Math.max(0, unitPrice);

      /*
       * The application calculation is authoritative:
       *
       * Qty × Unit Price = Line Total
       *
       * We intentionally do not trust an extracted line total
       * when quantity and unit price are available.
       */
      let total = 0;

      if (qty > 0 && unitPrice > 0) {
        total = qty * unitPrice;
      } else if (extractedTotal > 0) {
        /*
         * If OCR/AI could not identify both quantity and price,
         * retain the extracted amount so the item is not lost.
         */
        total = extractedTotal;

        if (qty <= 0) {
          qty = 1;
        }

        if (unitPrice <= 0 && qty > 0) {
          unitPrice = extractedTotal / qty;
        }
      }

      return {
        description,
        qty: roundMoney(qty),
        unitPrice: roundMoney(unitPrice),
        total: roundMoney(total),
      };
    })
    .filter(
      (item) =>
        item.description ||
        item.total > 0
    );
};

// ============================================================
// CALCULATE SUBTOTAL
// ============================================================

const calculateSubtotal = (lineItems = []) => {
  if (!Array.isArray(lineItems)) {
    return 0;
  }

  return roundMoney(
    lineItems.reduce(
      (sum, item) =>
        sum +
        (
          Number(item?.total) || 0
        ),
      0
    )
  );
};

// ============================================================
// CALCULATE TAX
// ============================================================

const calculateTax = (
  taxableAmount,
  taxRate = 0
) => {
  const amount = Math.max(
    0,
    toNumber(taxableAmount, 0)
  );

  const rate = Math.max(
    0,
    toNumber(taxRate, 0)
  );

  return roundMoney(
    amount * (rate / 100)
  );
};

// ============================================================
// CALCULATE GRAND TOTAL
// ============================================================

const calculateGrandTotal = ({
  subtotal = 0,
  taxAmount = 0,
  discountAmount = 0,
  serviceCharge = 0,
} = {}) => {
  const safeSubtotal = Math.max(
    0,
    toNumber(subtotal, 0)
  );

  const safeTax = Math.max(
    0,
    toNumber(taxAmount, 0)
  );

  const safeDiscount = Math.max(
    0,
    toNumber(discountAmount, 0)
  );

  const safeServiceCharge = Math.max(
    0,
    toNumber(serviceCharge, 0)
  );

  return roundMoney(
    Math.max(
      0,
      safeSubtotal +
        safeTax +
        safeServiceCharge -
        safeDiscount
    )
  );
};

// ============================================================
// BALANCE DUE
// ============================================================

const calculateBalanceDue = (
  grandTotal,
  amountPaid = 0
) => {
  const total = Math.max(
    0,
    toNumber(grandTotal, 0)
  );

  const paid = Math.max(
    0,
    toNumber(amountPaid, 0)
  );

  return roundMoney(
    Math.max(0, total - paid)
  );
};

// ============================================================
// COMPLETE INVOICE CALCULATION
// ============================================================

const calculateInvoiceTotals = ({
  lineItems = [],
  taxRate = 0,
  taxAmount,
  discountAmount = 0,
  serviceCharge = 0,
  amountPaid = 0,
} = {}) => {
  const normalizedItems =
    normalizeLineItems(lineItems);

  const subtotal =
    calculateSubtotal(
      normalizedItems
    );

  let calculatedTax;

  /*
   * If an explicit tax amount exists, preserve it.
   * Otherwise calculate it from the supplied tax rate.
   *
   * This prevents the system from automatically assuming
   * 7.5% VAT or any other tax rate.
   */
  if (
    taxAmount !== undefined &&
    taxAmount !== null &&
    String(taxAmount).trim() !== ""
  ) {
    calculatedTax = Math.max(
      0,
      toNumber(taxAmount, 0)
    );
  } else {
    calculatedTax =
      calculateTax(
        subtotal -
          Math.max(
            0,
            toNumber(
              discountAmount,
              0
            )
          ),
        taxRate
      );
  }

  calculatedTax =
    roundMoney(calculatedTax);

  const discount =
    roundMoney(
      Math.max(
        0,
        toNumber(
          discountAmount,
          0
        )
      )
    );

  const charge =
    roundMoney(
      Math.max(
        0,
        toNumber(
          serviceCharge,
          0
        )
      )
    );

  const grandTotal =
    calculateGrandTotal({
      subtotal,
      taxAmount: calculatedTax,
      discountAmount: discount,
      serviceCharge: charge,
    });

  const paid =
    roundMoney(
      Math.max(
        0,
        toNumber(
          amountPaid,
          0
        )
      )
    );

  const balanceDue =
    calculateBalanceDue(
      grandTotal,
      paid
    );

  return {
    lineItems:
      normalizedItems,

    subtotal,

    taxRate:
      roundMoney(
        toNumber(
          taxRate,
          0
        )
      ),

    taxAmount:
      calculatedTax,

    discountAmount:
      discount,

    serviceCharge:
      charge,

    grandTotal,

    amountPaid:
      paid,

    balanceDue,
  };
};

// ============================================================
// RECEIPT TOTAL COMPARISON
// ============================================================

const compareReceiptTotal = (
  calculatedGrandTotal,
  originalReceiptTotal
) => {
  const calculated =
    roundMoney(
      calculatedGrandTotal
    );

  const original =
    roundMoney(
      originalReceiptTotal
    );

  /*
   * No original total means there is nothing reliable to
   * compare against.
   */
  if (original <= 0) {
    return {
      status: "incomplete",
      difference: 0,
      calculatedTotal: calculated,
      originalTotal: original,
      matches: false,
    };
  }

  const difference =
    roundMoney(
      calculated - original
    );

  /*
   * Two decimal places are used because the system works
   * with normal monetary values.
   */
  const matches =
    Math.abs(difference) <= 0.01;

  return {
    status: matches
      ? "verified"
      : "discrepancy",

    difference,

    calculatedTotal:
      calculated,

    originalTotal:
      original,

    matches,
  };
};

// ============================================================
// RECEIPT NORMALIZATION
// ============================================================

const normalizeReceiptData = (
  data
) => {
  const lineItems =
    normalizeLineItems(
      data?.lineItems
    );

  const extractedSubtotal =
    toNumber(
      data?.subtotal,
      0
    );

  const extractedTax =
    toNumber(
      data?.taxAmount,
      0
    );

  const extractedDiscount =
    toNumber(
      data?.discountAmount,
      0
    );

  const extractedServiceCharge =
    toNumber(
      data?.serviceCharge,
      0
    );

  const extractedTotal =
    toNumber(
      data?.totalAmount,
      0
    );

  const calculated =
    calculateInvoiceTotals({
      lineItems,

      taxRate:
        toNumber(
          data?.taxRate,
          0
        ),

      /*
       * Preserve the extracted tax amount if AI/OCR found one.
       * If none exists, the calculation engine will use taxRate.
       */
      taxAmount:
        extractedTax > 0
          ? extractedTax
          : undefined,

      discountAmount:
        extractedDiscount,

      serviceCharge:
        extractedServiceCharge,
    });

  /*
   * The subtotal calculated from line items is authoritative.
   *
   * If no usable line items exist, preserve the extracted
   * subtotal so incomplete receipts are not destroyed.
   */
  let calculatedSubtotal =
    calculated.subtotal;

  if (
    calculatedSubtotal <= 0 &&
    extractedSubtotal > 0
  ) {
    calculatedSubtotal =
      roundMoney(
        extractedSubtotal
      );
  }

  const finalCalculatedTotal =
    calculateGrandTotal({
      subtotal:
        calculatedSubtotal,

      taxAmount:
        calculated.taxAmount,

      discountAmount:
        calculated.discountAmount,

      serviceCharge:
        calculated.serviceCharge,
    });

  const comparison =
    compareReceiptTotal(
      finalCalculatedTotal,
      extractedTotal
    );

  return {
    vendorName: cleanString(
      data?.vendorName ||
      data?.merchantName,
      "Unknown Vendor"
    ),

    merchantName: cleanString(
      data?.merchantName ||
      data?.vendorName,
      "Unknown Vendor"
    ),

    invoiceNumber:
      cleanString(
        data?.invoiceNumber
      ),

    date:
      cleanString(
        data?.date
      ),

    currency:
      cleanString(
        data?.currency,
        "NGN"
      ).toUpperCase(),

    category:
      cleanString(
        data?.category,
        "General"
      ),

    lineItems:
      calculated.lineItems,

    subtotal:
      roundMoney(
        calculatedSubtotal
      ),

    calculatedSubtotal:
      roundMoney(
        calculatedSubtotal
      ),

    taxRate:
      roundMoney(
        toNumber(
          data?.taxRate,
          0
        )
      ),

    taxAmount:
      roundMoney(
        calculated.taxAmount
      ),

    discountAmount:
      roundMoney(
        calculated.discountAmount
      ),

    serviceCharge:
      roundMoney(
        calculated.serviceCharge
      ),

    /*
     * totalAmount remains the original extracted receipt total.
     *
     * This is important because we must not overwrite the
     * actual amount printed on the customer's receipt.
     */
    totalAmount:
      roundMoney(
        extractedTotal
      ),

    originalReceiptTotal:
      roundMoney(
        extractedTotal
      ),

    calculatedGrandTotal:
      roundMoney(
        finalCalculatedTotal
      ),

    calculationDifference:
      comparison.difference,

    calculationStatus:
      comparison.status,

    confidenceScore:
      Math.min(
        100,
        Math.max(
          0,
          toNumber(
            data?.confidenceScore,
            0
          )
        )
      ),
  };
};

// ============================================================
// VALIDATE RECEIPT DATA
// ============================================================

const validateReceiptData = (
  data
) => {
  const problems = [];

  if (
    !data ||
    typeof data !== "object"
  ) {
    problems.push(
      "No structured receipt data was returned."
    );

    return {
      valid: false,
      problems,
    };
  }

  if (
    !data.vendorName ||
    data.vendorName ===
      "Unknown Vendor"
  ) {
    problems.push(
      "Vendor name could not be confidently identified."
    );
  }

  if (
    !Array.isArray(
      data.lineItems
    ) ||
    data.lineItems.length === 0
  ) {
    problems.push(
      "No receipt line items could be identified."
    );
  }

  if (
    !data.calculatedGrandTotal ||
    Number(
      data.calculatedGrandTotal
    ) <= 0
  ) {
    problems.push(
      "A valid calculated grand total could not be determined."
    );
  }

  if (
    data.calculationStatus ===
    "discrepancy"
  ) {
    problems.push(
      "The calculated total does not match the total printed on the receipt."
    );
  }

  return {
    valid:
      problems.length === 0,

    problems,
  };
};

// ============================================================
// INVOICE DATA NORMALIZATION
// ============================================================

const normalizeInvoiceData = (
  data = {}
) => {
  const calculated =
    calculateInvoiceTotals({
      lineItems:
        data.items ||
        data.lineItems ||
        [],

      taxRate:
        data.taxRate || 0,

      taxAmount:
        data.taxAmount,

      discountAmount:
        data.discountAmount ||
        0,

      serviceCharge:
        data.serviceCharge ||
        0,

      amountPaid:
        data.amountPaid ||
        0,
    });

  return {
    invoiceNumber:
      cleanString(
        data.invoiceNumber
      ),

    status:
      cleanString(
        data.status,
        "draft"
      ),

    business:
      data.business || {},

    customer:
      data.customer || {},

    invoiceDate:
      cleanString(
        data.invoiceDate
      ),

    dueDate:
      cleanString(
        data.dueDate
      ),

    currency:
      cleanString(
        data.currency,
        "NGN"
      ).toUpperCase(),

    paymentTerms:
      cleanString(
        data.paymentTerms
      ),

    paymentDetails:
      cleanString(
        data.paymentDetails
      ),

    items:
      calculated.lineItems,

    subtotal:
      calculated.subtotal,

    discountAmount:
      calculated.discountAmount,

    taxRate:
      calculated.taxRate,

    taxAmount:
      calculated.taxAmount,

    serviceCharge:
      calculated.serviceCharge,

    grandTotal:
      calculated.grandTotal,

    amountPaid:
      calculated.amountPaid,

    balanceDue:
      calculated.balanceDue,

    notes:
      cleanString(
        data.notes
      ),

    termsAndConditions:
      cleanString(
        data.termsAndConditions
      ),

    template:
      cleanString(
        data.template,
        "professional"
      ),
  };
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  cleanString,
  toNumber,
  roundMoney,

  normalizeLineItems,

  calculateSubtotal,
  calculateTax,
  calculateGrandTotal,
  calculateBalanceDue,

  calculateInvoiceTotals,

  compareReceiptTotal,

  normalizeReceiptData,
  validateReceiptData,

  normalizeInvoiceData,
};