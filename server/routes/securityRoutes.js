const express = require('express');

const router = express.Router();

const {
  protect,
} = require('../middleware/authMiddleware');

const {
  getSecurityStatus,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  verifyTwoFactorLogin,
  beginBiometricRegistration,
  finishBiometricRegistration,
  beginBiometricLogin,
  finishBiometricLogin,
  removeBiometricCredential,
} = require('../controllers/securityController');

// ============================================================
// PUBLIC AUTHENTICATION SECURITY ROUTES
// These routes complete a login that has not yet received a
// normal authenticated JWT.
// ============================================================

router.post(
  '/2fa/login/verify',
  verifyTwoFactorLogin
);

router.post(
  '/biometric/login/options',
  beginBiometricLogin
);

router.post(
  '/biometric/login/verify',
  finishBiometricLogin
);

// ============================================================
// PROTECTED SECURITY MANAGEMENT ROUTES
// ============================================================

router.use(protect);

router.get(
  '/',
  getSecurityStatus
);

router.post(
  '/2fa/setup',
  setupTwoFactor
);

router.post(
  '/2fa/enable',
  enableTwoFactor
);

router.post(
  '/2fa/disable',
  disableTwoFactor
);

router.post(
  '/biometric/register/options',
  beginBiometricRegistration
);

router.post(
  '/biometric/register/verify',
  finishBiometricRegistration
);

router.delete(
  '/biometric/:credentialId',
  removeBiometricCredential
);

module.exports = router;