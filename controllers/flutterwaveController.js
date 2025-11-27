const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const Subscription = require('../models/subscriptions');
const SubscriptionPlan = require('../models/subscriptionPlan');
const Settings = require('../models/settings');

// Get Flutterwave keys from database or fallback to environment variables
const getFlutterwaveSecret = async () => {
  try {
    const secret = await Settings.getSetting('flutterwave_secret_key');
    return secret || process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST-REPLACE_WITH_YOUR_KEY';
  } catch (error) {
    logger.error('Error getting Flutterwave secret key:', error);
    return process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST-REPLACE_WITH_YOUR_KEY';
  }
};

const getFlutterwavePublic = async () => {
  try {
    const publicKey = await Settings.getSetting('flutterwave_public_key');
    return publicKey || process.env.FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-REPLACE_WITH_YOUR_KEY';
  } catch (error) {
    logger.error('Error getting Flutterwave public key:', error);
    return process.env.FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-REPLACE_WITH_YOUR_KEY';
  }
};

const generateTxRef = (userId, planId) => `DCZ_${planId}_${userId}_${Date.now()}`;
const generateWalletTxRef = (userId) => `WALLET_${userId}_${Date.now()}`;

exports.initialize = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId, billingPeriod = 'monthly' } = req.body;

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    // Handle price structure (could be object with monthly/yearly or single number)
    let amount;
    if (typeof plan.price === 'object' && plan.price !== null) {
      // Price is an object with monthly/yearly properties
      amount = billingPeriod === 'monthly' 
        ? (plan.price.monthly || plan.price.month || 0)
        : (plan.price.yearly || plan.price.year || plan.price.annual || 0);
    } else {
      // Price is a single number (legacy format)
      amount = plan.price || 0;
    }

    // Ensure amount is a valid number
    amount = Number(amount);
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({ message: 'Invalid plan price' });
    }

    const tx_ref = generateTxRef(userId, planId);
    res.json({
      tx_ref,
      amount: amount, // Amount in base currency (dollars for USD)
      currency: plan.currency || 'USD',
      customer: req.user?.email ? { 
        email: req.user.email,
        phone_number: req.user?.phone || '',
        name: req.user?.firstName && req.user?.lastName 
          ? `${req.user.firstName} ${req.user.lastName}` 
          : req.user?.username || 'Customer'
      } : undefined,
      plan: { id: plan._id, name: plan.name, interval: plan.interval },
      billingPeriod: billingPeriod
    });
  } catch (error) {
    logger.error('Flutterwave initialize error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to initialize payment' });
  }
};

// Webhook verification uses header 'verif-hash' matching FLW secret key
exports.webhook = async (req, res) => {
  try {
    const signature = req.headers['verif-hash'];
    const FLW_SECRET = await getFlutterwaveSecret();
    
    if (!signature || signature !== FLW_SECRET) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const event = req.body?.event;
    const data = req.body?.data;
    logger.info('Flutterwave webhook', { event });

    if (event === 'charge.completed' && data?.status === 'successful') {
      const tx_ref = data.tx_ref;
      
      // Check if it's a wallet top-up payment
      if (tx_ref?.startsWith('WALLET_')) {
        // tx_ref format: WALLET_userId_timestamp
        const parts = tx_ref?.split('_') || [];
        const userId = parts[1];

        if (userId) {
          const walletController = require('./walletController');
          const Payment = require('../models/payments');
          const Transaction = require('../models/transaction');

          // Find payment by tx_ref
          const payment = await Payment.findOne({ transactionId: tx_ref });
          
          if (payment && payment.metadata?.transactionId) {
            // Complete the wallet transaction
            await walletController.completePayment({
              body: {
                paymentId: payment._id,
                transactionId: payment.metadata.transactionId,
                amount: data.amount || payment.amount,
                status: 'completed'
              }
            }, {
              json: (data) => data,
              status: () => ({ json: () => {} })
            });

            logger.info('Wallet top-up completed via webhook', { userId, amount: payment.amount, tx_ref });
          }
        }
      } else {
        // Original subscription payment logic
        // tx_ref format: DCZ_planId_userId_timestamp
        const parts = tx_ref?.split('_') || [];
        const planId = parts[1];
        const userId = parts[2];

        if (planId && userId) {
          const plan = await SubscriptionPlan.findById(planId);
          if (plan) {
            const Subscription = require('../models/subscriptions');
            const now = new Date();
            
            // Determine billing period from tx_ref or default to monthly
            // For now, default to monthly (30 days)
            const end = new Date(now);
            end.setMonth(end.getMonth() + 1);
            
            // Update or create subscription
            const subscription = await Subscription.findOneAndUpdate(
              { userId, status: { $in: ['active', 'inactive'] } },
              {
                userId,
                planId,
                status: 'active',
                startDate: now,
                endDate: end,
                nextBillingDate: end,
                lastPaymentDate: now,
                couponLimit: plan.couponLimit,
                dealLimit: plan.dealLimit,
                storeLimit: plan.storeLimit,
                couponCount: 0,
                dealCount: 0,
                storeCount: 0,
                updatedAt: now,
              },
              { upsert: true, new: true }
            );

            logger.info('Subscription created/updated via Flutterwave webhook', {
              userId,
              planId,
              subscriptionId: subscription._id
            });
          }
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Flutterwave webhook error', { error: error.message });
    res.status(400).json({ message: 'Invalid webhook' });
  }
};

// Initialize wallet top-up payment
exports.initializeWalletPayment = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    let { amount } = req.body;
    
    // Ensure amount is a number, not a string
    if (typeof amount === 'string') {
      amount = parseFloat(amount);
    }
    
    // Validate amount
    if (!amount || isNaN(amount) || !isFinite(amount) || amount < 5) {
      return res.status(400).json({ message: 'Minimum deposit is $5' });
    }
    
    // Ensure amount is a valid number
    amount = Number(amount);

    const tx_ref = generateWalletTxRef(userId);
    
    // Create pending transaction and payment record
    const walletController = require('./walletController');
    const Transaction = require('../models/transaction');
    const Payment = require('../models/payments');
    const Wallet = require('../models/wallet');

    const wallet = await Wallet.getOrCreateWallet(userId);
    
    // Create transaction
    const transaction = new Transaction({
      userId,
      walletId: wallet._id,
      type: 'deposit',
      amount,
      balanceAfter: wallet.balance,
      status: 'pending',
      description: `Wallet top-up of $${amount}`
    });
    await transaction.save();

    // Create payment record for wallet deposit
    const payment = new Payment({
      user: userId,
      amount,
      currency: 'USD',
      type: 'wallet_deposit',
      paymentStatus: 'Pending',
      transactionId: tx_ref,
      paymentMethod: 'Flutterwave',
      creditsDeposited: 0,
      metadata: {
        description: 'Wallet top-up',
        walletId: wallet._id,
        transactionId: transaction._id
      }
    });
    await payment.save();
    
    transaction.paymentId = payment._id;
    await transaction.save();

    // Amount is already validated and converted to number above
    // Ensure it's still valid before sending response
    if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
      throw new Error('Invalid amount');
    }

    // Return amount in dollars (base currency) for Flutterwave React v3
    // The React library expects amount in base currency, not cents
    res.json({
      tx_ref,
      amount: Number(amount), // Amount in dollars (base currency)
      currency: 'USD',
      paymentId: payment._id,
      transactionId: transaction._id,
      customer: req.user?.email ? { 
        email: req.user.email,
        phone_number: req.user?.phone || '',
        name: req.user?.firstName && req.user?.lastName 
          ? `${req.user.firstName} ${req.user.lastName}` 
          : req.user?.username || 'Customer'
      } : undefined,
      paymentGateway: 'flutterwave'
    });
  } catch (error) {
    logger.error('Flutterwave wallet initialize error', { 
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId || req.user?.id
    });
    res.status(500).json({ 
      message: 'Failed to initialize wallet payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


