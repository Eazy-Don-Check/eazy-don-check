const express = require('express');

const router = express.Router();

const {
  protect,
} = require('../middleware/authMiddleware');

const {
  getSettings,
  updateSettings,
  exportUserData,
} = require('../controllers/settingsController');


// ============================================================
// ALL SETTINGS ROUTES ARE PRIVATE
// ============================================================

router.use(protect);


// ============================================================
// GET CURRENT USER SETTINGS
// GET /api/v1/settings
// ============================================================

router.get(
  '/',
  getSettings
);


// ============================================================
// UPDATE CURRENT USER SETTINGS
// PUT /api/v1/settings
// ============================================================

router.put(
  '/',
  updateSettings
);


// ============================================================
// EXPORT CURRENT USER DATA
// GET /api/v1/settings/export
// ============================================================

router.get(
  '/export',
  exportUserData
);


module.exports = router;