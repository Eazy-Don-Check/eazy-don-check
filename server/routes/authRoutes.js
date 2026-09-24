const express = require('express');

const router =
express.Router();

const {
registerUser,
startRegistration,
sendSignupOtp,
verifySignupOtp,
loginUser,
getMe,
forgotPassword,
resetPassword,
updatePassword,
logoutUser,
} = require('../controllers/authController');

const {
protect,
} = require('../middleware/authMiddleware');

const {
authLimiter,
sensitiveActionLimiter,
} = require('../middleware/rateLimiters');

// ============================================================
// VALIDATION MIDDLEWARE
// ============================================================

const validateLoginInput = (
req,
res,
next
) => {
const {
password,
} = req.body;

const identifier =
req.body.identifier ||
req.body.email;

if (
!identifier ||
!password
) {
return res.status(400).json({
success: false,
message:
'Please provide your email/username and password.',
});
}

next();
};

const validateRegisterInput = (
req,
res,
next
) => {
const {
email,
password,
} = req.body;

if (
!email ||
!password
) {
return res.status(400).json({
success: false,
message:
'Please provide both email and password.',
});
}

next();
};

const validateSignupOtpInput = (
req,
res,
next
) => {
const {
registrationId,
channel,
} = req.body;

if (
!registrationId ||
!channel
) {
return res.status(400).json({
success: false,
message:
'Registration ID and verification method are required.',
});
}

next();
};

const validateSignupVerificationInput =
(
req,
res,
next
) => {
const {
registrationId,
channel,
otp,
} = req.body;

if (
  !registrationId ||
  !channel ||
  !otp
) {
  return res.status(400).json({
    success: false,
    message:
      'Registration ID, verification method and OTP are required.',
  });
}

next();

};

const validateForgotPasswordInput = (
req,
res,
next
) => {
const {
identifier,
email,
channel,
} = req.body;

const value =
identifier || email;

if (
!value ||
typeof value !==
'string'
) {
return res.status(400).json({
success: false,
message:
'Please provide your email address or phone number.',
});
}

if (
!['email', 'phone'].includes(
channel
)
) {
return res.status(400).json({
success: false,
message:
'Please select Email or Phone verification.',
});
}

next();
};

const validateResetPasswordInput =
(
req,
res,
next
) => {
const {
resetRequestId,
channel,
otp,
password,
confirmPassword,
} = req.body;

if (
  !resetRequestId ||
  !channel ||
  !otp ||
  !password
) {
  return res.status(400).json({
    success: false,
    message:
      'Reset request, verification method, OTP and new password are required.',
  });
}

if (
  password.length < 6
) {
  return res.status(400).json({
    success: false,
    message:
      'Password must be at least 6 characters long.',
  });
}

if (
  password !==
  confirmPassword
) {
  return res.status(400).json({
    success: false,
    message:
      'Passwords do not match.',
  });
}

next();

};

// ============================================================
// PUBLIC AUTH ROUTES
// ============================================================

// ------------------------------------------------------------
// REGISTER
// ------------------------------------------------------------

// New OTP registration flow.
router.post(
'/register/start',
authLimiter,
validateRegisterInput,
startRegistration
);

// Send signup OTP.
router.post(
'/register/send-otp',
sensitiveActionLimiter,
validateSignupOtpInput,
sendSignupOtp
);

// Verify signup OTP and create account.
router.post(
'/register/verify-otp',
sensitiveActionLimiter,
validateSignupVerificationInput,
verifySignupOtp
);

/*

* Backward-compatible /register endpoint.
*
* It no longer creates an authenticated account.
* It starts the verification process.
  */
  router.post(
  '/register',
  authLimiter,
  validateRegisterInput,
  registerUser
  );

// ------------------------------------------------------------
// LOGIN
// ------------------------------------------------------------

router.post(
'/login',
authLimiter,
validateLoginInput,
loginUser
);

// ------------------------------------------------------------
// PASSWORD RECOVERY
// ------------------------------------------------------------

// Send password reset OTP.
router.post(
'/forgot-password',
sensitiveActionLimiter,
validateForgotPasswordInput,
forgotPassword
);

router.post(
'/forgot-password/send-otp',
sensitiveActionLimiter,
validateForgotPasswordInput,
forgotPassword
);

// Reset password using OTP.
router.post(
'/forgot-password/reset',
sensitiveActionLimiter,
validateResetPasswordInput,
resetPassword
);

// ------------------------------------------------------------
// PROTECTED AUTH ROUTES
// ------------------------------------------------------------

// Current user.
router.get(
'/me',
protect,
getMe
);

// Update password while authenticated.
router.put(
'/update-password',
protect,
updatePassword
);

// Logout.
router.post(
'/logout',
protect,
logoutUser
);

module.exports = router;