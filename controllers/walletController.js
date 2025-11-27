const Wallet = require('../models/wallet');
const Transaction = require('../models/transaction');
const User = require('../models/user');
const Payment = require('../models/payments');
const PaymentGateway = require('../models/paymentGateway');
const { logger } = require('../utils/logger');

// Get wallet balance for authenticated user
exports.getBalance = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const wallet = await Wallet.getOrCreateWallet(userId);
    
    // Calculate available balance (balance - reservedBalance)
    const availableBalance = (wallet.balance || 0) - (wallet.reservedBalance || 0);
    
    res.json({
      balance: wallet.balance || 0,
      availableBalance: Math.max(0, availableBalance), // Ensure non-negative
      reservedBalance: wallet.reservedBalance || 0,
      currency: wallet.currency || 'USD',
      totalDeposited: wallet.totalDeposited || 0,
      totalSpent: wallet.totalSpent || 0
    });
  } catch (error) {
    logger.error('Get balance error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ message: 'Failed to get wallet balance', error: error.message });
  }
};

// Initialize payment for wallet top-up (unified endpoint that routes to appropriate gateway)
exports.initializePayment = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    let { amount, paymentGateway = 'flutterwave' } = req.body;
    
    // Ensure amount is a number, not a string
    if (typeof amount === 'string') {
      amount = parseFloat(amount);
    }
    
    // Validate amount
    if (!amount || isNaN(amount) || !isFinite(amount) || amount < 5) {
      return res.status(400).json({ message: 'Minimum deposit is $5' });
    }
    
    amount = Number(amount);

    // Validate payment gateway is active
    const gateway = await PaymentGateway.findOne({ 
      name: paymentGateway,
      isActive: true,
      isEnabled: true 
    });

    if (!gateway) {
      return res.status(400).json({ 
        message: `Payment gateway "${paymentGateway}" is not available or inactive` 
      });
    }

    // Route to appropriate gateway controller
    if (paymentGateway === 'flutterwave') {
      const flutterwaveController = require('./flutterwaveController');
      return await flutterwaveController.initializeWalletPayment(req, res);
    } else if (paymentGateway === 'stripe') {
      // TODO: Implement Stripe initialization
      return res.status(501).json({ message: 'Stripe payment not yet implemented' });
    } else if (paymentGateway === 'crypto') {
      // TODO: Implement Crypto initialization
      return res.status(501).json({ message: 'Crypto payment not yet implemented' });
    } else if (paymentGateway === 'bank_transfer') {
      // TODO: Implement Bank Transfer initialization
      return res.status(501).json({ message: 'Bank transfer not yet implemented' });
    } else {
      return res.status(400).json({ message: 'Unsupported payment gateway' });
    }
  } catch (error) {
    logger.error('Initialize payment error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
    res.status(500).json({ 
      message: 'Failed to initialize payment', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get wallet transactions
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('paymentId', 'paymentStatus transactionId');

    const total = await Transaction.countDocuments({ userId });

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get transactions error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ message: 'Failed to get transactions', error: error.message });
  }
};

// Complete payment - called by gateway webhooks
exports.completePayment = async (req, res) => {
  try {
    const { paymentId, transactionId, amount, status } = req.body;
    
    if (!paymentId || !transactionId || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find the transaction and payment
    const transaction = await Transaction.findById(transactionId);
    const payment = await Payment.findById(paymentId);

    if (!transaction || !payment) {
      return res.status(404).json({ message: 'Transaction or payment not found' });
    }

    if (status === 'completed' || status === 'successful') {
      // Get wallet
      const wallet = await Wallet.findById(transaction.walletId);
      if (!wallet) {
        return res.status(404).json({ message: 'Wallet not found' });
      }

      // Add amount to wallet balance
      wallet.balance = (wallet.balance || 0) + amount;
      wallet.totalDeposited = (wallet.totalDeposited || 0) + amount;
      await wallet.save();

      // Update transaction
      transaction.status = 'completed';
      transaction.balanceAfter = wallet.balance;
      await transaction.save();

      // Update payment
      payment.paymentStatus = 'Success';
      await payment.save();

      logger.info('Wallet payment completed', {
        userId: transaction.userId,
        amount,
        newBalance: wallet.balance
      });

      return res.json({
        success: true,
        message: 'Payment completed successfully',
        balance: wallet.balance
      });
    } else {
      // Payment failed
      transaction.status = 'failed';
      payment.paymentStatus = 'Failed';
      await transaction.save();
      await payment.save();

      return res.json({
        success: false,
        message: 'Payment failed'
      });
    }
  } catch (error) {
    logger.error('Complete payment error', { error: error.message });
    return res.status(500).json({ 
      message: 'Failed to complete payment',
      error: error.message 
    });
  }
};
