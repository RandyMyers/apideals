const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Settings = require('../models/settings');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const FLUTTERWAVE_PUBLIC_KEY = "FLWPUBK_TEST-0cfc4338858cd764a92d3749fa39fde4-X";
const FLUTTERWAVE_SECRET_KEY = "FLWSECK_TEST-c80cd8fb027f63d8315c6a20c3b0ac1e-X";

async function updateFlutterwaveKeys() {
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

    // Update public key
    await Settings.setSetting(
      'flutterwave_public_key',
      FLUTTERWAVE_PUBLIC_KEY,
      'Flutterwave Public Key for payment processing',
      'payment',
      true // isPublic
    );
    console.log('✅ Updated flutterwave_public_key');

    // Update secret key
    await Settings.setSetting(
      'flutterwave_secret_key',
      FLUTTERWAVE_SECRET_KEY,
      'Flutterwave Secret Key for webhook verification',
      'payment',
      false // isPublic - never expose to frontend
    );
    console.log('✅ Updated flutterwave_secret_key');

    console.log('\n✅ Successfully updated Flutterwave keys!');
    console.log('   Public Key:', FLUTTERWAVE_PUBLIC_KEY.substring(0, 20) + '...');
    console.log('   Secret Key:', FLUTTERWAVE_SECRET_KEY.substring(0, 20) + '...');
    console.log('\nYou can now test the payment functionality.');

    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error updating Flutterwave keys:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

updateFlutterwaveKeys();


