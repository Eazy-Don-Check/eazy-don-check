require("dotenv").config();

const Groq = require("groq-sdk");

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.warn(
    "⚠️ WARNING: GROQ_API_KEY is missing. AI extraction will not work until it is added to .env"
  );
}

const groq = GROQ_API_KEY
  ? new Groq({
      apiKey: GROQ_API_KEY,
      timeout: 30000,
      maxRetries: 0
    })
  : null;


/*
|--------------------------------------------------------------------------
| JSON PARSER
|--------------------------------------------------------------------------
*/

const parseAIJson = (content) => {
  if (!content || typeof content !== "string") {
    throw new Error("Groq returned an empty response.");
  }

  let cleaned = content.trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (
      firstBrace !== -1 &&
      lastBrace !== -1 &&
      lastBrace > firstBrace
    ) {
      const possibleJson = cleaned.substring(
        firstBrace,
        lastBrace + 1
      );

      try {
        return JSON.parse(possibleJson);
      } catch (secondError) {
        throw new Error(
          "Groq returned invalid JSON."
        );
      }
    }

    throw new Error("Groq returned invalid JSON.");
  }
};


/*
|--------------------------------------------------------------------------
| NUMBER NORMALIZATION
|--------------------------------------------------------------------------
*/

const normalizeNumber = (value, fallback = 0) => {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value
      .replace(/,/g, "")
      .replace(/[^\d.-]/g, "")
      .trim();

    const number = Number(cleaned);

    return Number.isFinite(number)
      ? number
      : fallback;
  }

  return fallback;
};


/*
|--------------------------------------------------------------------------
| LINE ITEM NORMALIZATION
|--------------------------------------------------------------------------
*/

const normalizeLineItem = (item) => {
  if (!item || typeof item !== "object") {
    return null;
  }

  const description = String(
    item.description ||
      item.name ||
      item.item ||
      ""
  ).trim();

  const qty = Math.max(
    0,
    normalizeNumber(
      item.qty ??
        item.quantity ??
        1,
      1
    )
  );

  const unitPrice = Math.max(
    0,
    normalizeNumber(
      item.unitPrice ??
        item.price ??
        item.unit_price ??
        0,
      0
    )
  );

  let total = normalizeNumber(
    item.total ??
      item.amount ??
      0,
    0
  );

  if (
    total === 0 &&
    qty > 0 &&
    unitPrice > 0
  ) {
    total = qty * unitPrice;
  }

  return {
    description,
    qty,
    unitPrice,
    total
  };
};


/*
|--------------------------------------------------------------------------
| AI RESULT NORMALIZATION
|--------------------------------------------------------------------------
*/

const normalizeExtractedData = (data) => {
  if (!data || typeof data !== "object") {
    throw new Error(
      "Invalid structured data returned by Groq."
    );
  }

  const lineItems = Array.isArray(data.lineItems)
    ? data.lineItems
        .map(normalizeLineItem)
        .filter(Boolean)
    : [];

  const subtotalFromItems =
    lineItems.reduce(
      (sum, item) =>
        sum + item.total,
      0
    );

  let subtotal = normalizeNumber(
    data.subtotal,
    subtotalFromItems
  );

  let taxAmount = normalizeNumber(
    data.taxAmount,
    0
  );

  let totalAmount = normalizeNumber(
    data.totalAmount,
    0
  );

  if (
    totalAmount === 0 &&
    subtotal > 0
  ) {
    totalAmount =
      subtotal + taxAmount;
  }

  if (
    subtotal === 0 &&
    totalAmount > 0 &&
    taxAmount > 0
  ) {
    subtotal = Math.max(
      0,
      totalAmount - taxAmount
    );
  }

  let confidenceScore =
    normalizeNumber(
      data.confidenceScore,
      0
    );

  if (
    confidenceScore > 0 &&
    confidenceScore <= 1
  ) {
    confidenceScore *= 100;
  }

  confidenceScore = Math.min(
    100,
    Math.max(
      0,
      confidenceScore
    )
  );

  const vendorName = String(
    data.vendorName ||
      data.merchantName ||
      "Unknown Vendor"
  ).trim();

  return {
    vendorName,

    merchantName:
      vendorName,

    invoiceNumber: String(
      data.invoiceNumber ||
        data.receiptNumber ||
        data.referenceNumber ||
        ""
    ).trim(),

    date: String(
      data.date || ""
    ).trim(),

    totalAmount,

    taxAmount,

    subtotal,

    currency: String(
      data.currency ||
        "NGN"
    )
      .trim()
      .toUpperCase(),

    category: String(
      data.category ||
        "General"
    ).trim(),

    confidenceScore,

    lineItems,

    rawJson: data
  };
};


/*
|--------------------------------------------------------------------------
| GROQ EXTRACTION
|--------------------------------------------------------------------------
*/

const extractReceiptData = async (
  receiptText
) => {
  if (!groq) {
    throw new Error(
      "GROQ_API_KEY is not configured on the server."
    );
  }

  if (
    !receiptText ||
    typeof receiptText !== "string" ||
    !receiptText.trim()
  ) {
    throw new Error(
      "OCR did not produce any readable text."
    );
  }

  /*
   * Prevent unnecessarily large prompts.
   */
  const cleanedText = receiptText
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, 30000);

  console.log(
    `📤 Groq request text length: ${cleanedText.length} characters`
  );

  const systemPrompt = `
You are an expert financial document extraction engine.

Your task is to convert OCR text from receipts and invoices into
accurate structured financial data.

IMPORTANT RULES:

1. Return ONLY valid JSON.
2. Do not return markdown.
3. Do not explain your answer.
4. Never invent information.
5. If a field cannot be determined, use an empty string or 0.
6. Preserve the actual currency shown.
7. If no currency is visible, use NGN only when the document
   strongly indicates Nigerian currency.
8. Prefer YYYY-MM-DD for dates.
9. Identify the merchant/vendor carefully.
10. Identify invoice, receipt, reference, or transaction numbers.
11. Extract genuine purchased items only.
12. Do not treat subtotal, tax, discount, payment method,
    cashier information, or totals as line items.
13. qty must be numeric.
14. unitPrice must be numeric.
15. total must be numeric.
16. If quantity is missing, use 1.
17. Never manufacture tax amounts.
18. Preserve explicit subtotal, tax, and total values.
19. Calculate line-item totals only when reliable.
20. confidenceScore must be a number from 0 to 100.
`;

  const userPrompt = `
Extract the financial information from the following OCR text.

Return EXACTLY this JSON structure:

{
  "vendorName": "",
  "merchantName": "",
  "invoiceNumber": "",
  "date": "",
  "subtotal": 0,
  "totalAmount": 0,
  "taxAmount": 0,
  "currency": "NGN",
  "category": "General",
  "confidenceScore": 0,
  "lineItems": [
    {
      "description": "",
      "qty": 1,
      "unitPrice": 0,
      "total": 0
    }
  ]
}

Possible categories:

- Office Supplies
- Utilities
- Logistics
- Meals
- Travel
- Retail
- Groceries
- Fuel
- Healthcare
- Electronics
- Construction
- Services
- General

OCR TEXT:

${cleanedText}
`;

  const startedAt = Date.now();

  try {
    console.log(
      "⏳ Waiting for Groq response..."
    );

    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",

        temperature: 0.1,

        max_completion_tokens: 2500,

        response_format: {
          type: "json_object"
        },

        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ]
      });

    const elapsed =
      Date.now() - startedAt;

    console.log(
      `✅ Groq response received in ${elapsed} ms`
    );

    const content =
      completion?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(
        "Groq returned no message content."
      );
    }

    console.log(
      `📥 Groq response length: ${content.length} characters`
    );

    const parsed =
      parseAIJson(content);

    return normalizeExtractedData(
      parsed
    );
  } catch (error) {
    const elapsed =
      Date.now() - startedAt;

    console.error(
      `❌ Groq request failed after ${elapsed} ms`
    );

    console.error(
      "Groq error status:",
      error.status || "unknown"
    );

    console.error(
      "Groq error code:",
      error.code || "unknown"
    );

    console.error(
      "Groq error message:",
      error.message || error
    );

    /*
     * Provide a much clearer timeout message.
     */
    if (
      error.name === "AbortError" ||
      error.code === "ETIMEDOUT" ||
      error.code === "TIMEOUT"
    ) {
      throw new Error(
        "Groq request timed out after 30 seconds."
      );
    }

    throw new Error(
      "Groq extraction failed: " +
        (error.message || "Unknown Groq error.")
    );
  }
};


module.exports = {
  extractReceiptData,
  normalizeExtractedData
};