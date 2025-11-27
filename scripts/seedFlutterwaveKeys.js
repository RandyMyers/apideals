const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Settings = require('../models/settings');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const flutterwaveKeys = [
  {
    key: 'flutterwave_public_key',
    value: process.env.FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-REPLACE_WITH_YOUR_KEY',
    description: 'Flutterwave Public Key for payment processing',
    category: 'payment',
    isPublic: true, // Can be exposed to frontend
  },
  {
    key: 'flutterwave_secret_key',
    value: process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST-REPLACE_WITH_YOUR_KEY',
    description: 'Flutterwave Secret Key for webhook verification',
    category: 'payment',
    isPublic: false, // Never expose to frontend
  },
];

async function seedFlutterwaveKeys() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL;
    if (!mongoUrl) {
      console.error('Error: MongoDB connection string not found in environment variables');
      console.error('Please set MONGODB_URI, MONGO_URI, or MONGO_URL in your .env file');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Seed each key
    for (const keyData of flutterwaveKeys) {
      await Settings.setSetting(
        keyData.key,
        keyData.value,
        keyData.description,
        keyData.category,
        keyData.isPublic
      );
      console.log(`✅ Seeded setting: ${keyData.key}`);
    }

    console.log('\n✅ Successfully seeded Flutterwave keys:');
    console.log('  - flutterwave_public_key (public - can be used in frontend)');
    console.log('  - flutterwave_secret_key (private - server only)');
    console.log('\nNote: Update these keys in your admin panel or by running this script with environment variables.');

    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding Flutterwave keys:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedFlutterwaveKeys();

