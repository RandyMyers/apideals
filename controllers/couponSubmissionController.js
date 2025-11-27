const CouponSubmission = require('../models/couponSubmission');
const Coupon = require('../models/coupon');
const CouponBoost = require('../models/couponBoost');
const Store = require('../models/store');
const Category = require('../models/category');
const User = require('../models/user');
const { logger, securityLogger } = require('../utils/logger');
const { couponValidation } = require('../utils/validation');
const notificationService = require('../services/notificationService');

// Submit a new coupon
exports.submitCoupon = async (req, res) => {
  try {
    const userId = req.user.id;
    const submissionData = req.body;

    // Validate submission data
    const { error, value } = couponValidation.submit.validate(submissionData);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input and try again',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    // Check for duplicates
    const duplicates = await CouponSubmission.findDuplicates(
      value.code, 
      value.storeId
    );

    if (duplicates.length > 0) {
      return res.status(409).json({
        error: 'Duplicate submission',
        message: 'A similar coupon has already been submitted for this store',
        duplicateId: duplicates[0]._id
      });
    }

    // Check if store exists and is active
    const store = await Store.findById(value.storeId);
    if (!store || !store.isActive) {
      return res.status(400).json({
        error: 'Invalid store',
        message: 'The selected store is not available'
      });
    }

    // Check if category exists
    const category = await Category.findById(value.categoryId);
    if (!category) {
      return res.status(400).json({
        error: 'Invalid category',
        message: 'The selected category is not available'
      });
    }

    // Create submission
    const submission = new CouponSubmission({
      ...value,
      userId,
      submittedAt: new Date()
    });

    await submission.save();

    // Populate and return
    await submission.populate([
      { path: 'storeId', select: 'name logo' },
      { path: 'categoryId', select: 'name' }
    ]);

    logger.info('Coupon submitted', {
      submissionId: submission._id,
      userId,
      storeId: value.storeId,
      code: value.code
    });

    // Send notification to admins about new coupon submission (non-blocking)
    try {
      const adminUsers = await User.find({ 
        userType: { $in: ['superAdmin', 'couponManager'] } 
      }).select('_id');
      
      if (adminUsers.length > 0) {
        const adminIds = adminUsers.map(admin => admin._id.toString());
        const user = await User.findById(userId).select('username');
        await notificationService.sendBulkNotifications(
          adminIds,
          'coupon_submitted',
          { 
            couponCode: submission.code,
            userName: user?.username || 'User',
            storeName: submission.storeId?.name || 'Store'
          }
        );
      }
    } catch (notifError) {
      console.error('Error sending admin notification for coupon submission:', notifError);
      // Don't fail submission if notification fails
    }

    res.status(201).json({
      message: 'Coupon submitted successfully',
      submission: {
        id: submission._id,
        title: submission.title,
        code: submission.code,
        store: submission.storeId,
        category: submission.categoryId,
        status: submission.status,
        submittedAt: submission.submittedAt
      }
    });

  } catch (error) {
    logger.error('Coupon submission error', {
      error: error.message,
      userId: req.user.id,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Submission failed',
      message: 'An error occurred while submitting your coupon'
    });
  }
};

// Get user's submissions
exports.getUserSubmissions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const skip = (page - 1) * limit;
    let query = { userId };

    if (status) {
      query.status = status;
    }

    const submissions = await CouponSubmission.find(query)
      .populate('storeId', 'name logo')
      .populate('categoryId', 'name')
      .populate('reviewerId', 'username')
      .sort({ submittedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await CouponSubmission.countDocuments(query);

    res.json({
      submissions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Get user submissions error', {
      error: error.message,
      userId: req.user.id
    });

    res.status(500).json({
      error: 'Failed to fetch submissions',
      message: 'An error occurred while fetching your submissions'
    });
  }
};

// Get submission by ID
exports.getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const submission = await CouponSubmission.findOne({
      _id: id,
      userId
    }).populate([
      { path: 'storeId', select: 'name logo description' },
      { path: 'categoryId', select: 'name description' },
      { path: 'reviewerId', select: 'username' }
    ]);

    if (!submission) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Submission not found'
      });
    }

    res.json({ submission });

  } catch (error) {
    logger.error('Get submission error', {
      error: error.message,
      submissionId: req.params.id,
      userId: req.user.id
    });

    res.status(500).json({
      error: 'Failed to fetch submission',
      message: 'An error occurred while fetching the submission'
    });
  }
};

// Update submission (only if pending)
exports.updateSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    const submission = await CouponSubmission.findOne({
      _id: id,
      userId,
      status: 'pending'
    });

    if (!submission) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Submission not found or cannot be updated'
      });
    }

    // Validate update data
    const { error, value } = couponValidation.submit.validate(updateData, {
      allowUnknown: false
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input and try again',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    // Check for duplicates (excluding current submission)
    const duplicates = await CouponSubmission.findDuplicates(
      value.code,
      value.storeId,
      id
    );

    if (duplicates.length > 0) {
      return res.status(409).json({
        error: 'Duplicate submission',
        message: 'A similar coupon has already been submitted for this store'
      });
    }

    // Update submission
    Object.assign(submission, value);
    await submission.save();

    logger.info('Submission updated', {
      submissionId: id,
      userId
    });

    res.json({
      message: 'Submission updated successfully',
      submission
    });

  } catch (error) {
    logger.error('Update submission error', {
      error: error.message,
      submissionId: req.params.id,
      userId: req.user.id
    });

    res.status(500).json({
      error: 'Update failed',
      message: 'An error occurred while updating the submission'
    });
  }
};

// Delete submission (only if pending)
exports.deleteSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const submission = await CouponSubmission.findOneAndDelete({
      _id: id,
      userId,
      status: 'pending'
    });

    if (!submission) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Submission not found or cannot be deleted'
      });
    }

    logger.info('Submission deleted', {
      submissionId: id,
      userId
    });

    res.json({
      message: 'Submission deleted successfully'
    });

  } catch (error) {
    logger.error('Delete submission error', {
      error: error.message,
      submissionId: req.params.id,
      userId: req.user.id
    });

    res.status(500).json({
      error: 'Delete failed',
      message: 'An error occurred while deleting the submission'
    });
  }
};

// Get submission statistics for user
exports.getUserSubmissionStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await CouponSubmission.getUserStats(userId);
    
    const statsMap = {
      pending: 0,
      approved: 0,
      rejected: 0,
      expired: 0
    };

    stats.forEach(stat => {
      statsMap[stat._id] = stat.count;
    });

    // Get recent activity
    const recentSubmissions = await CouponSubmission.find({ userId })
      .populate('storeId', 'name')
      .sort({ submittedAt: -1 })
      .limit(5);

    res.json({
      stats: statsMap,
      recentSubmissions
    });

  } catch (error) {
    logger.error('Get user stats error', {
      error: error.message,
      userId: req.user.id
    });

    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: 'An error occurred while fetching your statistics'
    });
  }
};

// Admin: Get pending submissions
exports.getPendingSubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'submittedAt', sortOrder = 'asc' } = req.query;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const submissions = await CouponSubmission.find({ status: 'pending' })
      .populate('userId', 'username email')
      .populate('storeId', 'name logo')
      .populate('categoryId', 'name')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await CouponSubmission.countDocuments({ status: 'pending' });

    res.json({
      submissions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Get pending submissions error', {
      error: error.message,
      userId: req.user.id
    });

    res.status(500).json({
      error: 'Failed to fetch pending submissions',
      message: 'An error occurred while fetching pending submissions'
    });
  }
};

// Admin: Approve submission
exports.approveSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user.id;
    const { adminNotes = '' } = req.body;

    const submission = await CouponSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Submission not found'
      });
    }

    if (submission.status !== 'pending') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Submission has already been processed'
      });
    }

    // Create actual coupon
    const coupon = new Coupon({
      title: submission.title,
      code: submission.code,
      description: submission.description,
      terms: submission.terms,
      discountType: submission.discountType,
      discountValue: submission.discountValue,
      minPurchaseAmount: submission.minPurchaseAmount,
      maxPurchaseAmount: submission.maxPurchaseAmount,
      startDate: submission.startDate,
      endDate: submission.endDate,
      usageLimit: submission.usageLimit,
      storeId: submission.storeId,
      categoryId: submission.categoryId,
      userId: submission.userId,
      isActive: true,
      isVerified: true
    });

    await coupon.save();

    // Approve submission
    await submission.approve(reviewerId, adminNotes);

    // Update submission with coupon reference
    submission.couponId = coupon._id;
    await submission.save();

    // Attempt push to WooCommerce (non-blocking)
    try {
      const { pushCoupon } = require('./woocommerceController');
      pushCoupon(coupon._id);
    } catch (e) {
      // Log and continue
      console.warn('Push to Woo failed', e.message);
    }

    logger.info('Submission approved', {
      submissionId: id,
      couponId: coupon._id,
      reviewerId,
      userId: submission.userId
    });

    // Send notification to user about coupon approval (non-blocking)
    try {
      await notificationService.createNotification(
        submission.userId,
        'coupon_approved',
        { couponCode: submission.code },
        { actionUrl: `/coupons/${coupon._id}` }
      );
    } catch (notifError) {
      console.error('Error sending approval notification:', notifError);
      // Don't fail approval if notification fails
    }

    // Send notification to admins about coupon approval (non-blocking)
    try {
      const adminUsers = await User.find({ 
        userType: { $in: ['superAdmin', 'couponManager'] } 
      }).select('_id');
      
      if (adminUsers.length > 0) {
        const adminIds = adminUsers.map(admin => admin._id.toString());
        await notificationService.sendBulkNotifications(
          adminIds,
          'coupon_approved',
          { couponCode: submission.code }
        );
      }
    } catch (notifError) {
      console.error('Error sending admin notification for coupon approval:', notifError);
    }

    // Notify store followers about new coupon (non-blocking)
    try {
      const Store = require('../models/store');
      const store = await Store.findById(coupon.storeId).select('name followers').lean();
      
      if (store && store.followers && store.followers.length > 0) {
        const discountText = coupon.discountType === 'percentage' 
          ? `${coupon.discountValue}% off`
          : `$${coupon.discountValue} off`;
        
        await notificationService.sendBulkNotifications(
          store.followers.map(f => f.toString()),
          'new_coupon_available',
          {
            storeName: store.name,
            couponCode: coupon.code,
            discount: discountText
          },
          { actionUrl: `/coupons/${coupon._id}` }
        );
      }
    } catch (notifError) {
      console.error('Error sending follower notification for new coupon:', notifError);
      // Don't fail approval if notification fails
    }

    res.json({
      message: 'Submission approved successfully',
      coupon: {
        id: coupon._id,
        title: coupon.title,
        code: coupon.code
      }
    });

  } catch (error) {
    logger.error('Approve submission error', {
      error: error.message,
      submissionId: req.params.id,
      reviewerId: req.user.id,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Approval failed',
      message: 'An error occurred while approving the submission'
    });
  }
};

// Admin: Reject submission
exports.rejectSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user.id;
    const { rejectionReason, adminNotes = '' } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        error: 'Rejection reason required',
        message: 'Please provide a reason for rejection'
      });
    }

    const submission = await CouponSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Submission not found'
      });
    }

    if (submission.status !== 'pending') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Submission has already been processed'
      });
    }

    await submission.reject(reviewerId, rejectionReason, adminNotes);

    logger.info('Submission rejected', {
      submissionId: id,
      reviewerId,
      userId: submission.userId,
      rejectionReason
    });

    // Send notification to user about coupon rejection (non-blocking)
    try {
      await notificationService.createNotification(
        submission.userId,
        'coupon_rejected',
        { 
          couponCode: submission.code,
          reason: rejectionReason
        },
        { actionUrl: '/dashboard/submissions' }
      );
    } catch (notifError) {
      console.error('Error sending rejection notification:', notifError);
      // Don't fail rejection if notification fails
    }

    res.json({
      message: 'Submission rejected successfully'
    });

  } catch (error) {
    logger.error('Reject submission error', {
      error: error.message,
      submissionId: req.params.id,
      reviewerId: req.user.id
    });

    res.status(500).json({
      error: 'Rejection failed',
      message: 'An error occurred while rejecting the submission'
    });
  }
};

// Admin: Get submission statistics
exports.getSubmissionStats = async (req, res) => {
  try {
    const stats = await CouponSubmission.getStats();
    
    const statsMap = {};
    stats.forEach(stat => {
      statsMap[stat._id] = {
        count: stat.count,
        avgQualityScore: stat.avgQualityScore
      };
    });

    // Get recent activity
    const recentSubmissions = await CouponSubmission.find()
      .populate('userId', 'username')
      .populate('storeId', 'name')
      .sort({ submittedAt: -1 })
      .limit(10);

    res.json({
      stats: statsMap,
      recentSubmissions
    });

  } catch (error) {
    logger.error('Get submission stats error', {
      error: error.message,
      userId: req.user.id
    });

    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: 'An error occurred while fetching statistics'
    });
  }
};

module.exports = exports;
