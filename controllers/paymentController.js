const Payment = require('../models/payments');
const cloudinary = require('cloudinary').v2; // Cloudinary configuration already set up
const notificationService = require('../services/notificationService');
const User = require('../models/user');

// Create a new payment and upload receipt
exports.createPayment = async (req, res) => {
    try {
      const {
        userId,
        subscriptionPlanId,
        paymentLinkId,
        amount,
        paymentMethod,
        paymentStatus,
        transactionId,
        creditsDeposited,
      } = req.body;
  
      let receiptUrl = '';
  
      // Check if a file is uploaded
      if (req.files && req.files.receipt) {
        const file = req.files.receipt;
  
        // Upload file to Cloudinary
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
          folder: 'receipts', // Specify folder in Cloudinary
        });
        receiptUrl = result.secure_url; // Get the secure URL of the uploaded receipt
      }
  
      // Create a new payment record
      const payment = new Payment({
        user: userId,
        subscriptionPlan: subscriptionPlanId,
        paymentLinkId,
        amount,
        paymentMethod,
        paymentStatus,
        transactionId,
        creditsDeposited,
        receiptUrl, // Save receipt URL
      });
  
      // Save to database
      await payment.save();

      // Send notification based on payment status (non-blocking)
      try {
        if (paymentStatus === 'success' || paymentStatus === 'completed') {
          await notificationService.createNotification(
            userId,
            'payment_success',
            { amount: `$${amount}` },
            { actionUrl: '/dashboard/payments' }
          );

          // Notify admins about payment (non-blocking)
          const adminUsers = await User.find({ 
            userType: { $in: ['superAdmin', 'couponManager'] } 
          }).select('_id');
          
          if (adminUsers.length > 0) {
            const adminIds = adminUsers.map(admin => admin._id.toString());
            const user = await User.findById(userId).select('username email');
            await notificationService.sendBulkNotifications(
              adminIds,
              'payment_received',
              { 
                amount: `$${amount}`,
                userName: user?.username || 'User',
                userEmail: user?.email || ''
              }
            );
          }
        } else if (paymentStatus === 'failed' || paymentStatus === 'rejected') {
          await notificationService.createNotification(
            userId,
            'payment_failed',
            { reason: 'Payment processing failed. Please try again or contact support.' },
            { actionUrl: '/dashboard/payments' }
          );
        }
      } catch (notifError) {
        console.error('Error sending payment notification:', notifError);
        // Don't fail payment creation if notification fails
      }

      res.status(201).json({
        message: 'Payment recorded successfully',
        payment,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  };

  // Get all payments
exports.getAllPayments = async (req, res) => {
    try {
      const payments = await Payment.find()
        .populate('user', 'name email') // Populate user details
        .populate('subscriptionPlan', 'name price') // Populate plan details
        .populate('paymentLinkId', 'details'); // Populate payment link details
  
      res.status(200).json(payments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  };

  // Get a single payment by ID
exports.getPaymentById = async (req, res) => {
    try {
      const { id } = req.params;
      const payment = await Payment.findById(id)
        .populate('user', 'name email')
        .populate('subscriptionPlan', 'name price')
        .populate('paymentLinkId', 'details');
  
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
  
      res.status(200).json(payment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  };
  
  // Update payment status
exports.updatePaymentStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentStatus, isRefunded, refundDate } = req.body;
  
      const payment = await Payment.findById(id);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      const oldStatus = payment.paymentStatus;
      const userId = payment.user?.toString() || payment.user;
  
      const updatedPayment = await Payment.findByIdAndUpdate(
        id,
        {
          paymentStatus,
          isRefunded,
          refundDate,
          updatedAt: Date.now(),
        },
        { new: true }
      );
  
      if (!updatedPayment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      // Send notification if status changed to success/failed (non-blocking)
      if (oldStatus !== paymentStatus && userId) {
        try {
          if ((paymentStatus === 'success' || paymentStatus === 'completed') && oldStatus !== 'success' && oldStatus !== 'completed') {
            await notificationService.createNotification(
              userId,
              'payment_success',
              { amount: `$${updatedPayment.amount}` },
              { actionUrl: '/dashboard/payments' }
            );
          } else if ((paymentStatus === 'failed' || paymentStatus === 'rejected') && oldStatus !== 'failed' && oldStatus !== 'rejected') {
            await notificationService.createNotification(
              userId,
              'payment_failed',
              { reason: 'Payment processing failed. Please try again or contact support.' },
              { actionUrl: '/dashboard/payments' }
            );
          }
        } catch (notifError) {
          console.error('Error sending payment status update notification:', notifError);
        }
      }
  
      res.status(200).json({ message: 'Payment updated successfully', payment: updatedPayment });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  };
  
// Delete a payment
exports.deletePayment = async (req, res) => {
    try {
      const { id } = req.params;
  
      const payment = await Payment.findByIdAndDelete(id);
  
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
  
      res.status(200).json({ message: 'Payment deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  };

// Get current user's payments
exports.getMyPayments = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const payments = await Payment.find({ user: userId })
      .populate('subscriptionPlan', 'name price')
      .populate('paymentLinkId')
      .sort({ paymentDate: -1 });

    res.status(200).json({ payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Initialize payment for sponsored store promotion (STANDALONE feature, NOT linked to subscription)
exports.initializeSponsorStorePayment = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { storeId, amount, description, duration } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Verify store belongs to user
    const Store = require('../models/store');
    const store = await Store.findById(storeId);
    if (!store || store.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Store not found or not owned by user' });
    }
    
    // Create payment record for sponsorship (separate from subscription payments)
    const payment = new Payment({
      user: userId,
      amount: amount || 29.99, // Default monthly sponsorship fee
      paymentMethod: 'Online',
      paymentStatus: 'Pending',
      transactionId: `SPONSOR-${Date.now()}-${storeId}`,
      creditsDeposited: 0,
    });
    
    await payment.save();
    
    // Here you would integrate with Flutterwave or your payment gateway
    // For now, return payment ID for frontend to handle payment flow
    res.status(200).json({
      message: 'Payment initialized',
      paymentId: payment._id,
      amount: payment.amount,
      description: description || `Sponsor ${store.name} for ${duration || 30} days`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
  