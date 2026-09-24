const crypto = require("crypto");

const PAYSTACK_BASE_URL =
  "https://api.paystack.co";

/**
 * Get the Paystack secret key.
 */
const getSecretKey = () => {
  const key =
    process.env.PAYSTACK_SECRET_KEY;

  if (!key) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not configured."
    );
  }

  return key;
};

/**
 * Make an authenticated request to Paystack.
 */
const paystackRequest = async (
  endpoint,
  options = {}
) => {
  const secretKey =
    getSecretKey();

  const response =
    await fetch(
      `${PAYSTACK_BASE_URL}${endpoint}`,
      {
        ...options,

        headers: {
          Authorization:
            `Bearer ${secretKey}`,

          "Content-Type":
            "application/json",

          ...(options.headers || {}),
        },
      }
    );

  let data;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      `Paystack request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return data;
};

/**
 * Convert NGN to kobo.
 *
 * Paystack expects amounts in the currency subunit.
 *
 * Example:
 * ₦5,000 -> 500000
 */
const nairaToKobo = (amount) => {
  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount < 0
  ) {
    throw new Error(
      "Invalid payment amount."
    );
  }

  return Math.round(
    numericAmount * 100
  );
};

/**
 * Initialize a Paystack transaction.
 */
const initializeTransaction = async ({
  email,
  amount,
  reference,
  currency = "NGN",
  callbackUrl,
  metadata = {},
}) => {
  if (!email) {
    throw new Error(
      "Customer email is required."
    );
  }

  if (!reference) {
    throw new Error(
      "Transaction reference is required."
    );
  }

  const payload = {
    email,

    amount:
      String(
        nairaToKobo(amount)
      ),

    currency,

    reference,

    metadata:
      JSON.stringify(
        metadata
      ),
  };

  if (callbackUrl) {
    payload.callback_url =
      callbackUrl;
  }

  return paystackRequest(
    "/transaction/initialize",
    {
      method: "POST",
      body:
        JSON.stringify(
          payload
        ),
    }
  );
};

/**
 * Verify a Paystack transaction.
 */
const verifyTransaction =
  async (reference) => {
    if (!reference) {
      throw new Error(
        "Transaction reference is required."
      );
    }

    return paystackRequest(
      `/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        method: "GET",
      }
    );
  };

/**
 * Validate Paystack webhook signature.
 *
 * Paystack signs the raw request payload with HMAC SHA512
 * using the secret key.
 */
const verifyWebhookSignature = (
  rawBody,
  signature
) => {
  if (!rawBody) {
    return false;
  }

  if (!signature) {
    return false;
  }

  const secretKey =
    getSecretKey();

  const expectedSignature =
    crypto
      .createHmac(
        "sha512",
        secretKey
      )
      .update(rawBody)
      .digest("hex");

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      "utf8"
    );

  const receivedBuffer =
    Buffer.from(
      String(signature),
      "utf8"
    );

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
};

module.exports = {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  nairaToKobo,
};