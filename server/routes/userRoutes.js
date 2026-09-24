const express = require('express');

const router = express.Router();

const {
  protect,
} = require('../middleware/authMiddleware');

const {
  getUsers,
  getUserById,
} = require('../controllers/userController');


// ============================================================
// ALL USER ROUTES REQUIRE AUTHENTICATION
// ============================================================

router.use(protect);


// ============================================================
// PEOPLE / SEARCH
// GET /api/v1/users
// ============================================================

router.get(
  '/',
  getUsers
);


// ============================================================
// PUBLIC USER PROFILE
// GET /api/v1/users/:userId
// ============================================================

router.get(
  '/:userId',
  getUserById
);


module.exports = router;