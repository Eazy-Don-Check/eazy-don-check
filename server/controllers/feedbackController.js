const Feedback = require('../models/Feedback');

// ======================================================
// @desc    Submit feedback
// @route   POST /api/v1/feedback
// @access  Private
// ======================================================

const createFeedback = async (req, res) => {
  try {
    const {
      rating,
      category,
      subject,
      message,
      suggestion,
    } = req.body;

    // --------------------------------------------------
    // Basic validation
    // --------------------------------------------------

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid rating between 1 and 5.',
      });
    }

    const allowedCategories = [
      'general',
      'bug',
      'feature',
      'verification',
      'community',
      'security',
      'other',
    ];

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid feedback category.',
      });
    }

    if (
      !subject ||
      subject.trim().length < 3
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Feedback subject must contain at least 3 characters.',
      });
    }

    if (
      !message ||
      message.trim().length < 10
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Feedback message must contain at least 10 characters.',
      });
    }

    // --------------------------------------------------
    // Create feedback
    // --------------------------------------------------

    const feedback = await Feedback.create({
      user: req.user._id,

      name:
        req.user.name ||
        req.user.fullName ||
        [
          req.user.firstName,
          req.user.middleName,
          req.user.lastName,
        ]
          .filter(Boolean)
          .join(' ') ||
        req.user.username ||
        'EAZY DON CHECK User',

      email: req.user.email || '',

      rating: numericRating,

      category,

      subject: subject.trim(),

      message: message.trim(),

      suggestion:
        suggestion
          ? suggestion.trim()
          : '',

      status: 'new',
    });

    res.status(201).json({
      success: true,
      message:
        'Thank you! Your feedback has been submitted successfully.',
      feedback: {
        id: feedback._id,
        rating: feedback.rating,
        category: feedback.category,
        subject: feedback.subject,
        status: feedback.status,
        createdAt: feedback.createdAt,
      },
      data: feedback,
    });
  } catch (error) {
    console.error(
      'Create Feedback Error:',
      error
    );

    res.status(500).json({
      success: false,
      message:
        'Failed to submit feedback.',
      error: error.message,
    });
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createFeedback,
};