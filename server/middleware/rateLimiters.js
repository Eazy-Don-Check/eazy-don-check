const rateLimit = require('express-rate-limit');

/**
 * Strict Rate Limiter for Auth Routes
 * Limits each IP to 5 requests per 15 minutes for authentication endpoints.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 5, // Limit each IP to 5 auth attempts per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count failed and successful attempts
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  },
  handler: (req, res, next, options) => {
    console.warn(`🔒 Auth Rate Limit Exceeded for IP: ${req.ip} on route ${req.originalUrl}`);
    res.status(429).json(options.message);
  }
});

/**
 * Moderate Rate Limiter for Sensitive Actions (e.g., password reset requests)
 * Limits each IP to 3 requests per hour.
 */
const sensitiveActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please check your email or try again in an hour.'
  }
});

module.exports = {
  authLimiter,
  sensitiveActionLimiter
};