const express = require('express');
const multer = require('multer');
const path = require('path');

const cloudinary = require('../config/cloudinary');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
]);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new Error(
          'Unsupported file type. Please upload an image, video, or audio file.'
        )
      );
    }

    cb(null, true);
  },
});

const getResourceType = (mimetype) => {
  if (mimetype.startsWith('video/')) {
    return 'video';
  }

  if (mimetype.startsWith('audio/')) {
    return 'video';
  }

  return 'image';
};

const getMediaType = (mimetype) => {
  if (mimetype.startsWith('video/')) {
    return 'video';
  }

  if (mimetype.startsWith('audio/')) {
    return 'audio';
  }

  if (mimetype.startsWith('image/')) {
    return 'image';
  }

  return 'file';
};

const uploadBufferToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });

router.post(
  '/',
  protect,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please select a file to upload.',
        });
      }

      const resourceType = getResourceType(req.file.mimetype);
      const mediaType = getMediaType(req.file.mimetype);

      const result = await uploadBufferToCloudinary(
        req.file.buffer,
        {
          folder: 'eazy-don-check/feed',
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        }
      );

      return res.status(201).json({
        success: true,
        message: 'Feed media uploaded successfully.',
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          type: mediaType,
          resourceType,
          width: result.width || null,
          height: result.height || null,
          duration: result.duration || null,
          format: result.format || path.extname(req.file.originalname).replace('.', ''),
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
      });
    } catch (error) {
      console.error('Feed media upload error:', error);

      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            message: 'File is too large. Maximum Feed media size is 50MB.',
          });
        }

        return res.status(400).json({
          success: false,
          message: error.message || 'Upload failed.',
        });
      }

      return res.status(500).json({
        success: false,
        message:
          error.message || 'Unable to upload Feed media at this time.',
      });
    }
  }
);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File is too large. Maximum Feed media size is 50MB.',
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || 'Upload failed.',
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Unsupported or invalid Feed media file.',
    });
  }

  next();
});

module.exports = router;