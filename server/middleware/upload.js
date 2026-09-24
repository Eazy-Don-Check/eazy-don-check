const multer = require("multer");

// Store uploads in memory.
// This allows:
// 1. Direct Cloudinary uploads
// 2. OCR processing
// 3. PDF parsing
const storage = multer.memoryStorage();

// Allowed MIME types
const allowedMimeTypes = new Set([
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",

    // Documents
    "application/pdf",
]);

const fileFilter = (req, file, cb) => {
    if (!file) {
        return cb(new Error("No file uploaded."), false);
    }

    if (!file.mimetype) {
        return cb(new Error("Unable to determine file type."), false);
    }

    if (!allowedMimeTypes.has(file.mimetype)) {
        return cb(
            new Error(
                `Unsupported file type (${file.mimetype}).

Allowed types:
• JPG
• JPEG
• PNG
• WEBP
• GIF
• PDF`
            ),
            false
        );
    }

    cb(null, true);
};

const upload = multer({
    storage,

    fileFilter,

    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
        files: 1,
    },
});

module.exports = upload;