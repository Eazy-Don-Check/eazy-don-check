const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');

const uploadDir = path.join(__dirname, '../uploads/chat');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `attachment-${uniqueSuffix}${ext}`);
  }
});

const allowedMimeTypes = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/m4a'
]);

const allowedExtensions = /\.(jpe?g|png|gif|webp|webm|ogg|mp3|mpeg|mp4|m4a|wav|aac)$/i;

const fileFilter = (req, file, cb) => {
  // Browsers may send codec parameters, e.g. audio/webm;codecs=opus.
  const baseMimeType = String(file.mimetype || '').split(';')[0].trim().toLowerCase();
  if (allowedMimeTypes.has(baseMimeType) && allowedExtensions.test(file.originalname)) {
    return cb(null, true);
  }
  return cb(new Error('Only supported image and audio files are allowed.'));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter
});

const uploadChatAttachment = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const fileUrl = `/uploads/chat/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      message: 'Attachment uploaded successfully',
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: String(req.file.mimetype || '').split(';')[0].trim().toLowerCase(),
        size: req.file.size
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'File upload processing failed',
      error: error.message
    });
  }
};

router.post(
  '/',
  protect,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: `Multer Error: ${err.message}` });
      }
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  uploadChatAttachment
);

module.exports = router;