const crypto = require('crypto');

/**

* Generate a cryptographically secure 6-digit OTP.
  */
  const generateOtp = () => {
  return crypto
  .randomInt(100000, 1000000)
  .toString();
  };

/**

* Hash an OTP before storing it in MongoDB.
  */
  const hashOtp = (otp) => {
  return crypto
  .createHash('sha256')
  .update(String(otp))
  .digest('hex');
  };

/**

* Compare a supplied OTP with the stored hash.
  */
  const compareOtp = (otp, storedHash) => {
  const suppliedHash = hashOtp(otp);

if (
!storedHash ||
suppliedHash.length !== storedHash.length
) {
return false;
}

return crypto.timingSafeEqual(
Buffer.from(suppliedHash),
Buffer.from(storedHash)
);
};

/**

* OTP expiry.
  */
  const getOtpExpiry = () => {
  const minutes =
  Number(
  process.env.OTP_EXPIRES_MINUTES || 10
  );

return new Date(
Date.now() +
Math.max(minutes, 1) * 60 * 1000
);
};

/**

* Resend cooldown.
  */
  const getResendCooldownMs = () => {
  const seconds =
  Number(
  process.env.OTP_RESEND_SECONDS || 60
  );

return Math.max(seconds, 10) * 1000;
};

/**

* Maximum verification attempts.
  */
  const getMaxAttempts = () => {
  return Math.max(
  Number(
  process.env.OTP_MAX_ATTEMPTS || 5
  ),
  1
  );
  };

module.exports = {
generateOtp,
hashOtp,
compareOtp,
getOtpExpiry,
getResendCooldownMs,
getMaxAttempts,
};