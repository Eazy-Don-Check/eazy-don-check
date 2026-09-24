const express = require("express");

const router = express.Router();

const upload = require("../middleware/upload");

// ✅ Correct import
const { protect } = require("../middleware/authMiddleware");

const {
    getProfile,
    updateProfile,
} = require("../controllers/profileController");

// GET logged-in user's profile
router.get(
    "/",
    protect,
    getProfile
);

// UPDATE profile
router.put(
    "/",
    protect,
    upload.single("avatar"),
    updateProfile
);

module.exports = router;