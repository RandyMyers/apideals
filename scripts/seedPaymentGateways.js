const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PaymentGateway = require('../models/paymentGateway');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const paymentGateways = [
  {
    name: 'flutterwave',
    displayName: 'Flutterwave',
    isActive: true,
    isEnabled: true,
    icon: 'FiCreditCard',
    description: 'Pay with card, mobile money, or bank transfer',
    supportedCurrencies: ['USD', 'NGN', 'KES', 'GHS', 'ZAR', 'UGX', 'TZS', 'SLL'],
    metadata: {
      supportsRecurring: true,
      supportsPartialPayment: false
    }
  },
  {
    name: 'stripe',
    displayName: 'Stripe',
    isActive: false, // Disabled until configured
    isEnabled: false,
    icon: 'FiCreditCard',
    description: 'Pay with credit or debit card',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    metadata: {
      supportsRecurring: true,
      supportsPartialPayment: false
    }
  },
  {
    name: 'crypto',
    displayName: 'Cryptocurrency',
    isActive: false, // Disabled until configured
    isEnabled: false,
    icon: 'FiZap', // Using FiZap as Bitcoin icon (FiBitcoin doesn't exist in react-icons/fi)
    description: 'Pay with Bitcoin, Ethereum, or other cryptocurrencies',
    supportedCurrencies: ['USD', 'BTC', 'ETH', 'USDT'],
    metadata: {
      supportsRecurring: false,
      supportsPartialPayment: true
    }
  },
  {
    name: 'bank_transfer',
    displayName: 'Bank Transfer',
    isActive: false, // Disabled until configured
    isEnabled: false,
    icon: 'FiDollarSign',
    description: 'Direct bank transfer',
    supportedCurrencies: ['USD', 'NGN'],
    metadata: {
      supportsRecurring: false,
      supportsPartialPayment: true
    }
  }
];

async function seedPaymentGateways() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL;
    if (!mongoUrl) {
      console.error('Error: MongoDB connection string not found in environment variables');
      console.error('Please set MONGODB_URI, MONGO_URI, or MONGO_URL in your .env file');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');

    // Seed each gateway
    for (const gatewayData of paymentGateways) {
      await PaymentGateway.findOneAndUpdate(
        { name: gatewayData.name },
        gatewayData,
        { upsert: true, new: true }
      );
      console.log(`✅ Seeded payment gateway: ${gatewayData.displayName} (${gatewayData.name})`);
    }

    console.log('\n✅ Successfully seeded payment gateways');
    console.log('   - Flutterwave: Active (configured)');
    console.log('   - Stripe: Inactive (needs configuration)');
    console.log('   - Crypto: Inactive (needs configuration)');
    console.log('   - Bank Transfer: Inactive (needs configuration)');
    console.log('\nNote: Only Flutterwave is active. Enable others via admin panel after configuration.');

    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding payment gateways:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedPaymentGateways();


