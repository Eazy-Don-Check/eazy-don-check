const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post('/enhance-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided.' });
    }

    // Apply Cloudinary AI Transformations: Enhance + Sharpen + Auto-Quality
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'eazy_check_enhanced_photos',
      transformation: [
        { effect: "enhance" },
        { effect: "sharpen:100" },
        { quality: "auto:best" },
        { fetch_format: "auto" }
      ]
    });

    return res.status(200).json({
      success: true,
      enhancedUrl: result.secure_url,
      format: result.format,
      dimensions: { width: result.width, height: result.height }
    });
  } catch (err) {
    console.error('Enhancement Error:', err);
    return res.status(500).json({ success: false, message: 'Image enhancement failed.' });
  }
});

module.exports = router;