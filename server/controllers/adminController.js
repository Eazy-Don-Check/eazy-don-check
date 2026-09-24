const User = require('../models/User');
const Verification = require('../models/Verification');
const Feedback = require('../models/Feedback');

// ======================================================
// HELPER: Map database accountStatus to UI Status
// ======================================================
const formatAccountStatus = (accountStatus) => {
  if (!accountStatus) return 'Active';
  const lower = accountStatus.toLowerCase();
  if (lower === 'suspended') return 'Suspended';
  if (lower === 'banned') return 'Banned';
  return 'Active';
};

// ======================================================
// @desc    Get global application statistics
// @route   GET /api/v1/admin/stats
// @route   GET /api/v1/admin/metrics
// @access  Private (Super Admin)
// ======================================================

const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const totalScans = await Verification.countDocuments();

    const flaggedCount = await Verification.countDocuments({
      status: {
        $in: [
          'flagged',
          'FLAGGED',
          'rejected',
          'REJECTED',
        ],
      },
    });

    res.status(200).json({
      success: true,

      totalUsers: totalUsers.toLocaleString(),
      userChange: '+12.5%',

      totalScans: totalScans.toLocaleString(),
      scanChange: '+24.1%',

      accuracy: '98.7%',
      accuracyChange: '+0.3%',

      flaggedCount: flaggedCount.toString(),
      flaggedChange: '-4.2%',

      stats: {
        totalUsers,
        totalScans,
        flaggedCount,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin metrics.',
      error: error.message,
    });
  }
};

// ======================================================
// @desc    Get all registered users
// @route   GET /api/v1/admin/users
// @access  Private (Super Admin)
// ======================================================

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({
        createdAt: -1,
      });

    const formattedUsers = users.map((user) => ({
      ...user.toObject(),

      status: formatAccountStatus(user.accountStatus),

      scansUsed:
        user.usage?.scansThisMonth ??
        user.scansUsed ??
        0,

      maxScans:
        user.usage?.maxScansAllowed ??
        user.maxScans ??
        5,
    }));

    res.status(200).json({
      success: true,
      count: formattedUsers.length,
      users: formattedUsers,
      data: formattedUsers,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch users.',
      error: error.message,
    });
  }
};

// ======================================================
// @desc    Get single user
// @route   GET /api/v1/admin/users/:id
// @access  Private (Super Admin)
// ======================================================

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const formattedUser = {
      ...user.toObject(),

      status: formatAccountStatus(user.accountStatus),

      scansUsed:
        user.usage?.scansThisMonth ??
        user.scansUsed ??
        0,

      maxScans:
        user.usage?.maxScansAllowed ??
        user.maxScans ??
        5,
    };

    res.status(200).json({
      success: true,
      user: formattedUser,
      data: formattedUser,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch user.',
      error: error.message,
    });
  }
};

// ======================================================
// @desc    Update User
// @route   PUT /api/v1/admin/users/:id
// @access  Private (Super Admin)
// ======================================================

const updateUser = async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      accountStatus,
      username,
      gender,
      location,
      bio,
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // ------------------------------------------
    // Prevent changing own role
    // ------------------------------------------

    if (
      String(req.user._id) === String(user._id) &&
      role &&
      role !== user.role
    ) {
      return res.status(400).json({
        success: false,
        message:
          'You cannot change your own role.',
      });
    }

    // ------------------------------------------
    // Email uniqueness
    // ------------------------------------------

    if (
      email &&
      email.toLowerCase() !== user.email
    ) {
      const exists = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: user._id },
      });

      if (exists) {
        return res.status(400).json({
          success: false,
          message:
            'Email address already exists.',
        });
      }

      user.email = email.toLowerCase();
    }

    // ------------------------------------------
    // Username uniqueness
    // ------------------------------------------

    if (
      username &&
      username !== user.username
    ) {
      const exists = await User.findOne({
        username: username.toLowerCase(),
        _id: { $ne: user._id },
      });

      if (exists) {
        return res.status(400).json({
          success: false,
          message:
            'Username already exists.',
        });
      }

      user.username =
        username.toLowerCase();
    }

    // ------------------------------------------
    // Update fields
    // ------------------------------------------

    if (name !== undefined)
      user.name = name;

    if (role !== undefined)
      user.role = role;

    if (accountStatus !== undefined)
      user.accountStatus =
        accountStatus;

    if (gender !== undefined)
      user.gender = gender;

    if (location !== undefined)
      user.location = location;

    if (bio !== undefined)
      user.bio = bio;

    await user.save();

    const updatedUser = {
      ...user.toObject(),

      status: formatAccountStatus(user.accountStatus),

      scansUsed:
        user.usage?.scansThisMonth ?? 0,

      maxScans:
        user.usage?.maxScansAllowed ??
        5,
    };

    res.status(200).json({
      success: true,
      message:
        'User updated successfully.',
      user: updatedUser,
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message:
        'Failed to update user.',
      error: error.message,
    });
  }
};

// ======================================================
// @desc    Delete User
// @route   DELETE /api/v1/admin/users/:id
// @access  Private (Super Admin)
// ======================================================

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(
      req.params.id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // ------------------------------------------
    // Prevent deleting yourself
    // ------------------------------------------

    if (
      String(user._id) ===
      String(req.user._id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'You cannot delete your own account.',
      });
    }

    // ------------------------------------------
    // Prevent deleting last Super Admin
    // ------------------------------------------

    if (user.role === 'superadmin') {
      const totalSuperAdmins =
        await User.countDocuments({
          role: 'superadmin',
        });

      if (totalSuperAdmins <= 1) {
        return res.status(400).json({
          success: false,
          message:
            'The last Super Admin cannot be deleted.',
        });
      }
    }

    // ------------------------------------------
    // Delete user
    // ------------------------------------------

    await User.findByIdAndDelete(
      req.params.id
    );

    // ------------------------------------------
    // Optional cleanup of verifications
    // ------------------------------------------

    await Verification.deleteMany({
      userId: user._id,
    });

    res.status(200).json({
      success: true,
      message:
        'User deleted successfully.',
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message:
        'Failed to delete user.',
      error: error.message,
    });
  }
};

// ======================================================
// @desc    Suspend / Activate User
// @route   PATCH /api/v1/admin/users/:id/status
// @access  Private (Super Admin)
// ======================================================

const updateUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Prevent suspending yourself
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own account status.',
      });
    }

    // If explicit status provided in body, use it. Otherwise, cycle active <-> suspended
    if (req.body.accountStatus) {
      user.accountStatus = req.body.accountStatus;
    } else {
      user.accountStatus =
        user.accountStatus === 'suspended' || user.accountStatus === 'banned'
          ? 'active'
          : 'suspended';
    }

    await user.save();

    const updatedUser = {
      ...user.toObject(),
      status: formatAccountStatus(user.accountStatus),
      scansUsed:
        user.usage?.scansThisMonth ?? 0,
      maxScans:
        user.usage?.maxScansAllowed ?? 5,
    };

    res.status(200).json({
      success: true,
      message: 'User status updated.',
      user: updatedUser,
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Failed to update user status.',
      error: error.message,
    });
  }
};

// ======================================================
// @desc    Increase User Scan Quota
// @route   PATCH /api/v1/admin/users/:id/quota
// @access  Private (Super Admin)
// ======================================================

const updateUserQuota = async (req, res) => {
  try {
    const increment =
      Number(req.body.increment) || 10;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (!user.usage) {
      user.usage = {};
    }

    user.usage.maxScansAllowed =
      (user.usage.maxScansAllowed || 5) +
      increment;

    await user.save();

    const updatedUser = {
      ...user.toObject(),
      status: formatAccountStatus(user.accountStatus),
      scansUsed:
        user.usage?.scansThisMonth ?? 0,
      maxScans:
        user.usage?.maxScansAllowed ?? 5,
    };

    res.status(200).json({
      success: true,
      message:
        'User quota updated successfully.',
      user: updatedUser,
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message:
        'Failed to update quota.',
      error: error.message,
    });
  }
};

// ======================================================
// @desc    Get Verification Logs
// @route   GET /api/v1/admin/verifications
// @route   GET /api/v1/admin/logs
// @access  Private (Super Admin)
// ======================================================

const getAllVerifications = async (
  req,
  res
) => {
  try {
    const verifications =
      await Verification.find()
        .populate(
          'userId',
          'name email'
        )
        .sort({
          createdAt: -1,
        })
        .limit(200);

    const logs = verifications.map((v) => ({
      ...v.toObject(),

      user: v.userId || {
        name: 'Unknown User',
        email: '',
      },

      merchant:
        v.merchant ||
        v.merchantName ||
        'N/A',

      confidence:
        v.confidenceScore != null
          ? `${v.confidenceScore}%`
          : v.confidence || '0%',
    }));

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
      data: logs,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message:
        'Failed to load verification logs.',
      error: error.message,
    });
  }
};

// ======================================================
// @desc    Get Feedback Statistics
// @route   GET /api/v1/admin/feedback/stats
// @access  Private (Super Admin)
// ======================================================

const getFeedbackStats = async (req, res) => {
  try {
    const [
      total,
      newCount,
      reviewedCount,
      resolvedCount,
    ] = await Promise.all([
      Feedback.countDocuments(),

      Feedback.countDocuments({
        status: 'new',
      }),

      Feedback.countDocuments({
        status: 'reviewed',
      }),

      Feedback.countDocuments({
        status: 'resolved',
      }),
    ]);

    const ratingSummary = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          averageRating: {
            $avg: '$rating',
          },
          totalRatings: {
            $sum: 1,
          },
        },
      },
    ]);

    const averageRating =
      ratingSummary.length
        ? Number(
            ratingSummary[0].averageRating.toFixed(2)
          )
        : 0;

    res.status(200).json({
      success: true,

      stats: {
        total,
        new: newCount,
        reviewed: reviewedCount,
        resolved: resolvedCount,
        averageRating,
      },

      data: {
        total,
        new: newCount,
        reviewed: reviewedCount,
        resolved: resolvedCount,
        averageRating,
      },
    });
  } catch (error) {
    console.error(
      'Get Feedback Stats Error:',
      error
    );

    res.status(500).json({
      success: false,
      message:
        'Failed to fetch feedback statistics.',
      error: error.message,
    });
  }
};

// ======================================================
// @desc    Get All Feedback
// @route   GET /api/v1/admin/feedback
// @access  Private (Super Admin)
// ======================================================

const getAllFeedback = async (req, res) => {
  try {
    const {
      status,
      category,
      rating,
      search,
    } = req.query;

    const filter = {};

    // --------------------------------------------------
    // Status filter
    // --------------------------------------------------

    if (
      status &&
      ['new', 'reviewed', 'resolved'].includes(status)
    ) {
      filter.status = status;
    }

    // --------------------------------------------------
    // Category filter
    // --------------------------------------------------

    if (
      category &&
      [
        'general',
        'bug',
        'feature',
        'verification',
        'community',
        'security',
        'other',
      ].includes(category)
    ) {
      filter.category = category;
    }

    // --------------------------------------------------
    // Rating filter
    // --------------------------------------------------

    if (rating) {
      const numericRating = Number(rating);

      if (
        Number.isInteger(numericRating) &&
        numericRating >= 1 &&
        numericRating <= 5
      ) {
        filter.rating = numericRating;
      }
    }

    // --------------------------------------------------
    // Search
    // --------------------------------------------------

    if (search && search.trim()) {
      const searchRegex = new RegExp(
        search.trim(),
        'i'
      );

      filter.$or = [
        {
          name: searchRegex,
        },
        {
          email: searchRegex,
        },
        {
          subject: searchRegex,
        },
        {
          message: searchRegex,
        },
      ];
    }

    const feedback = await Feedback.find(filter)
      .populate(
        'user',
        'name email username role'
      )
      .populate(
        'reviewedBy',
        'name email username'
      )
      .sort({
        createdAt: -1,
      })
      .limit(500);

    const formattedFeedback =
      feedback.map((item) => ({
        ...item.toObject(),

        user: item.user || {
          name:
            item.name ||
            'Unknown User',
          email:
            item.email || '',
        },

        reviewer:
          item.reviewedBy || null,
      }));

    res.status(200).json({
      success: true,
      count: formattedFeedback.length,
      feedback: formattedFeedback,
      data: formattedFeedback,
    });
  } catch (error) {
    console.error(
      'Get All Feedback Error:',
      error
    );

    res.status(500).json({
      success: false,
      message:
        'Failed to fetch feedback.',
      error: error.message,
    });
  }
};

// ======================================================
// @desc    Get Single Feedback
// @route   GET /api/v1/admin/feedback/:id
// @access  Private (Super Admin)
// ======================================================

const getFeedbackById = async (req, res) => {
  try {
    const feedback =
      await Feedback.findById(
        req.params.id
      )
        .populate(
          'user',
          'name email username role'
        )
        .populate(
          'reviewedBy',
          'name email username'
        );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message:
          'Feedback not found.',
      });
    }

    res.status(200).json({
      success: true,
      feedback,
      data: feedback,
    });
  } catch (error) {
    console.error(
      'Get Feedback Error:',
      error
    );

    res.status(500).json({
      success: false,
      message:
        'Failed to fetch feedback.',
      error: error.message,
    });
  }
};

// ======================================================
// @desc    Update Feedback Status
// @route   PATCH /api/v1/admin/feedback/:id/status
// @access  Private (Super Admin)
// ======================================================

const updateFeedbackStatus = async (
  req,
  res
) => {
  try {
    const {
      status,
      adminNote,
    } = req.body;

    const allowedStatuses = [
      'new',
      'reviewed',
      'resolved',
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid feedback status.',
      });
    }

    const feedback =
      await Feedback.findById(
        req.params.id
      );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message:
          'Feedback not found.',
      });
    }

    feedback.status = status;

    if (adminNote !== undefined) {
      feedback.adminNote =
        String(adminNote).trim();
    }

    if (
      status === 'reviewed'
    ) {
      feedback.reviewedBy =
        req.user._id;

      feedback.reviewedAt =
        new Date();
    }

    if (
      status === 'resolved'
    ) {
      if (!feedback.reviewedBy) {
        feedback.reviewedBy =
          req.user._id;
      }

      if (!feedback.reviewedAt) {
        feedback.reviewedAt =
          new Date();
      }

      feedback.resolvedAt =
        new Date();
    }

    if (
      status === 'new'
    ) {
      feedback.reviewedBy = null;
      feedback.reviewedAt = null;
      feedback.resolvedAt = null;
    }

    await feedback.save();

    const updatedFeedback =
      await Feedback.findById(
        feedback._id
      )
        .populate(
          'user',
          'name email username role'
        )
        .populate(
          'reviewedBy',
          'name email username'
        );

    res.status(200).json({
      success: true,
      message:
        'Feedback status updated successfully.',
      feedback: updatedFeedback,
      data: updatedFeedback,
    });
  } catch (error) {
    console.error(
      'Update Feedback Status Error:',
      error
    );

    res.status(500).json({
      success: false,
      message:
        'Failed to update feedback status.',
      error: error.message,
    });
  }
};

// ======================================================
// @desc    Delete Feedback
// @route   DELETE /api/v1/admin/feedback/:id
// @access  Private (Super Admin)
// ======================================================

const deleteFeedback = async (
  req,
  res
) => {
  try {
    const feedback =
      await Feedback.findById(
        req.params.id
      );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message:
          'Feedback not found.',
      });
    }

    await Feedback.findByIdAndDelete(
      req.params.id
    );

    res.status(200).json({
      success: true,
      message:
        'Feedback deleted successfully.',
    });
  } catch (error) {
    console.error(
      'Delete Feedback Error:',
      error
    );

    res.status(500).json({
      success: false,
      message:
        'Failed to delete feedback.',
      error: error.message,
    });
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getAdminStats,

  getAllUsers,
  getUserById,

  updateUser,
  deleteUser,

  updateUserStatus,
  updateUserQuota,

  getAllVerifications,

  // Feedback
  getFeedbackStats,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
};