const express = require('express');

const {
  getFeed,
  createPost,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  getComments,
  deleteComment,
  sharePost,
} = require('../controllers/feedController');

const {
  protect,
} = require('../middleware/authMiddleware');

const router = express.Router();

// ==========================================
// FEED
// ==========================================

// GET /api/v1/feed
router.get('/', protect, getFeed);

// POST /api/v1/feed
router.post('/', protect, createPost);

// ==========================================
// SINGLE POST
// ==========================================

// GET /api/v1/feed/:id
router.get('/:id', protect, getPost);

// PUT /api/v1/feed/:id
router.put('/:id', protect, updatePost);

// DELETE /api/v1/feed/:id
router.delete('/:id', protect, deletePost);

// ==========================================
// LIKE
// ==========================================

// POST /api/v1/feed/:id/like
router.post('/:id/like', protect, toggleLike);

// ==========================================
// COMMENTS
// ==========================================

// POST /api/v1/feed/:id/comments
router.post('/:id/comments', protect, addComment);

// GET /api/v1/feed/:id/comments
router.get('/:id/comments', protect, getComments);

// DELETE /api/v1/feed/:id/comments/:commentId
router.delete(
  '/:id/comments/:commentId',
  protect,
  deleteComment
);

// ==========================================
// SHARE
// ==========================================

// POST /api/v1/feed/:id/share
router.post('/:id/share', protect, sharePost);

module.exports = router;