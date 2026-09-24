const express = require('express');

const router = express.Router();

const {
  enhancePhoto,
  getPhotoQuotaInfo,
} = require('../controllers/photoController');

const { protect } = require('../middleware/authMiddleware');

// ============================================================
// PHOTO ROUTES
// Base path:
// /api/v1/photos
//
// All routes require a valid JWT.
// ============================================================

router.use(protect);

// ============================================================
// GET /api/v1/photos/quota
//
// Returns the authenticated user's current photo-enhancement
// subscription and usage quota.
// ============================================================

router.get('/quota', getPhotoQuotaInfo);

// ============================================================
// POST /api/v1/photos/enhance
//
// Enhance an image using AI / CodeFormer.
// Protected route — requires valid JWT.
// ============================================================

router.post('/enhance', enhancePhoto);

module.exports = router;