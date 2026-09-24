const mongoose = require('mongoose');

const FeedPost = require('../models/FeedPost');
const FeedComment = require('../models/FeedComment');
const Notification = require('../models/Notification');

// ==========================================
// HELPERS
// ==========================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const getUserId = (req) => {
  return req.user?._id || req.user?.id;
};

const sanitizeContent = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const populatePost = (query) => {
  return query
    .populate({
      path: 'author',
      select:
        'name username avatarUrl avatar bio statusUpdate role accountStatus',
    })
    .populate({
      path: 'sharedFrom',
      populate: {
        path: 'author',
        select:
          'name username avatarUrl avatar bio statusUpdate role accountStatus',
      },
    });
};

// ==========================================
// GET FEED
// GET /api/v1/feed
// ==========================================

const getFeed = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      50
    );

    const skip = (page - 1) * limit;

    const filter = {
      status: 'published',
      visibility: 'public',
    };

    const [posts, total] = await Promise.all([
      populatePost(
        FeedPost.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
      ).lean(),

      FeedPost.countDocuments(filter),
    ]);

    const currentUserId = getUserId(req);

    const data = posts.map((post) => ({
      ...post,

      likedByMe: currentUserId
        ? post.likedBy?.some(
            (id) => String(id) === String(currentUserId)
          )
        : false,

      sharedByMe: currentUserId
        ? post.sharedBy?.some(
            (id) => String(id) === String(currentUserId)
          )
        : false,

      likedBy: undefined,
      sharedBy: undefined,
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Get Feed Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load feed.',
      error: error.message,
    });
  }
};

// ==========================================
// CREATE POST
// POST /api/v1/feed
// ==========================================

const createPost = async (req, res) => {
  try {
    const userId = getUserId(req);

    const content = sanitizeContent(req.body.content);

    let media = req.body.media || [];

    if (typeof media === 'string') {
      try {
        media = JSON.parse(media);
      } catch {
        media = [];
      }
    }

    if (!Array.isArray(media)) {
      media = [];
    }

    const visibility =
      req.body.visibility === 'friends'
        ? 'friends'
        : 'public';

    if (!content && media.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A post must contain text or media.',
      });
    }

    if (content.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Post content cannot exceed 5,000 characters.',
      });
    }

    if (media.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'A post cannot contain more than 10 media items.',
      });
    }

    const post = await FeedPost.create({
      author: userId,
      content,
      media,
      visibility,
      status: 'published',
    });

    const populatedPost = await populatePost(
      FeedPost.findById(post._id)
    ).lean();

    return res.status(201).json({
      success: true,
      message: 'Post created successfully.',
      data: {
        ...populatedPost,

        likedByMe: false,
        sharedByMe: false,

        likedBy: undefined,
        sharedBy: undefined,
      },
    });
  } catch (error) {
    console.error('Create Feed Post Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create post.',
      error: error.message,
    });
  }
};

// ==========================================
// GET SINGLE POST
// GET /api/v1/feed/:id
// ==========================================

const getPost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID.',
      });
    }

    const post = await populatePost(
      FeedPost.findOne({
        _id: id,
        status: 'published',
      })
    ).lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const currentUserId = getUserId(req);

    return res.status(200).json({
      success: true,
      data: {
        ...post,

        likedByMe: currentUserId
          ? post.likedBy?.some(
              (userId) =>
                String(userId) === String(currentUserId)
            )
          : false,

        sharedByMe: currentUserId
          ? post.sharedBy?.some(
              (userId) =>
                String(userId) === String(currentUserId)
            )
          : false,

        likedBy: undefined,
        sharedBy: undefined,
      },
    });
  } catch (error) {
    console.error('Get Feed Post Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load post.',
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE POST
// PUT /api/v1/feed/:id
// ==========================================

const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID.',
      });
    }

    const post = await FeedPost.findOne({
      _id: id,
      status: 'published',
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const isOwner =
      String(post.author) === String(userId);

    const isAdmin =
      req.user?.role === 'superadmin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to edit this post.',
      });
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        'content'
      )
    ) {
      const content = sanitizeContent(req.body.content);

      if (!content && post.media.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'A post must contain text or media.',
        });
      }

      if (content.length > 5000) {
        return res.status(400).json({
          success: false,
          message: 'Post content cannot exceed 5,000 characters.',
        });
      }

      post.content = content;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        'visibility'
      )
    ) {
      if (!['public', 'friends'].includes(req.body.visibility)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid visibility option.',
        });
      }

      post.visibility = req.body.visibility;
    }

    await post.save();

    const updatedPost = await populatePost(
      FeedPost.findById(post._id)
    ).lean();

    return res.status(200).json({
      success: true,
      message: 'Post updated successfully.',
      data: updatedPost,
    });
  } catch (error) {
    console.error('Update Feed Post Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update post.',
      error: error.message,
    });
  }
};

// ==========================================
// DELETE POST
// DELETE /api/v1/feed/:id
// ==========================================

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID.',
      });
    }

    const post = await FeedPost.findById(id);

    if (!post || post.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const isOwner =
      String(post.author) === String(userId);

    const isAdmin =
      req.user?.role === 'superadmin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to delete this post.',
      });
    }

    post.status = 'deleted';

    await post.save();

    await FeedComment.updateMany(
      {
        post: post._id,
        status: 'published',
      },
      {
        $set: {
          status: 'deleted',
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Post deleted successfully.',
    });
  } catch (error) {
    console.error('Delete Feed Post Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete post.',
      error: error.message,
    });
  }
};

// ==========================================
// LIKE / UNLIKE
// POST /api/v1/feed/:id/like
// ==========================================

const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID.',
      });
    }

    const post = await FeedPost.findOne({
      _id: id,
      status: 'published',
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const alreadyLiked = post.likedBy.some(
      (id) => String(id) === String(userId)
    );

    if (alreadyLiked) {
      post.likedBy.pull(userId);
      post.likesCount = Math.max(
        post.likesCount - 1,
        0
      );
    } else {
      post.likedBy.addToSet(userId);
      post.likesCount += 1;

      // ==========================================
      // NOTIFICATION
      // ==========================================
      if (String(post.author) !== String(userId)) {
        try {
          await Notification.create({
            recipient: post.author,
            sender: userId,
            type: 'like',
            title: 'New reaction',
            message: `${req.user.name || 'Someone'} liked your post.`,
            metadata: {
              postId: post._id,
            },
          });
        } catch (notificationError) {
          console.error(
            'Like Notification Error:',
            notificationError
          );
        }
      }
    }

    await post.save();

    return res.status(200).json({
      success: true,
      liked: !alreadyLiked,
      likesCount: post.likesCount,
      message: alreadyLiked
        ? 'Post unliked.'
        : 'Post liked.',
    });
  } catch (error) {
    console.error('Toggle Feed Like Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update like.',
      error: error.message,
    });
  }
};

// ==========================================
// ADD COMMENT
// POST /api/v1/feed/:id/comments
// ==========================================

const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID.',
      });
    }

    const content = sanitizeContent(req.body.content);

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot be empty.',
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot exceed 2,000 characters.',
      });
    }

    const post = await FeedPost.findOne({
      _id: id,
      status: 'published',
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const comment = await FeedComment.create({
      post: post._id,
      author: userId,
      content,
      status: 'published',
    });

    post.commentsCount += 1;
    await post.save();

    const populatedComment =
      await FeedComment.findById(comment._id)
        .populate({
          path: 'author',
          select:
            'name username avatarUrl avatar role accountStatus',
        })
        .lean();

    // ==========================================
    // NOTIFICATION
    // ==========================================

    if (String(post.author) !== String(userId)) {
      try {
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'comment',
          title: 'New comment',
          message: `${req.user.name || 'Someone'} commented on your post.`,
          metadata: {
            postId: post._id,
            commentId: comment._id,
          },
        });
      } catch (notificationError) {
        console.error(
          'Comment Notification Error:',
          notificationError
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      data: populatedComment,
      commentsCount: post.commentsCount,
    });
  } catch (error) {
    console.error('Add Feed Comment Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to add comment.',
      error: error.message,
    });
  }
};

// ==========================================
// GET COMMENTS
// GET /api/v1/feed/:id/comments
// ==========================================

const getComments = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID.',
      });
    }

    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        parseInt(req.query.limit, 10) || 20,
        1
      ),
      50
    );

    const skip = (page - 1) * limit;

    const filter = {
      post: id,
      status: 'published',
    };

    const [comments, total] = await Promise.all([
      FeedComment.find(filter)
        .populate({
          path: 'author',
          select:
            'name username avatarUrl avatar role accountStatus',
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      FeedComment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNextPage:
          page < Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get Feed Comments Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load comments.',
      error: error.message,
    });
  }
};

// ==========================================
// DELETE COMMENT
// DELETE /api/v1/feed/:id/comments/:commentId
// ==========================================

const deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const userId = getUserId(req);

    if (
      !isValidObjectId(id) ||
      !isValidObjectId(commentId)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post or comment ID.',
      });
    }

    const [post, comment] = await Promise.all([
      FeedPost.findById(id),
      FeedComment.findOne({
        _id: commentId,
        post: id,
        status: 'published',
      }),
    ]);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    const isCommentOwner =
      String(comment.author) === String(userId);

    const isPostOwner =
      String(post.author) === String(userId);

    const isAdmin =
      req.user?.role === 'superadmin';

    if (
      !isCommentOwner &&
      !isPostOwner &&
      !isAdmin
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to delete this comment.',
      });
    }

    comment.status = 'deleted';
    await comment.save();

    post.commentsCount = Math.max(
      post.commentsCount - 1,
      0
    );

    await post.save();

    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully.',
      commentsCount: post.commentsCount,
    });
  } catch (error) {
    console.error('Delete Feed Comment Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete comment.',
      error: error.message,
    });
  }
};

// ==========================================
// SHARE POST
// POST /api/v1/feed/:id/share
// ==========================================

const sharePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID.',
      });
    }

    const post = await FeedPost.findOne({
      _id: id,
      status: 'published',
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const alreadyShared = post.sharedBy.some(
      (id) => String(id) === String(userId)
    );

    if (alreadyShared) {
      return res.status(200).json({
        success: true,
        shared: true,
        sharesCount: post.sharesCount,
        message: 'You have already shared this post.',
      });
    }

    post.sharedBy.addToSet(userId);
    post.sharesCount += 1;

    await post.save();

    // ==========================================
    // NOTIFICATION
    // ==========================================

    if (String(post.author) !== String(userId)) {
      try {
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'system',
          title: 'Post shared',
          message: `${req.user.name || 'Someone'} shared your post.`,
          metadata: {
            postId: post._id,
            action: 'share',
          },
        });
      } catch (notificationError) {
        console.error(
          'Share Notification Error:',
          notificationError
        );
      }
    }

    return res.status(200).json({
      success: true,
      shared: true,
      sharesCount: post.sharesCount,
      message: 'Post shared successfully.',
    });
  } catch (error) {
    console.error('Share Feed Post Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to share post.',
      error: error.message,
    });
  }
};

module.exports = {
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
};