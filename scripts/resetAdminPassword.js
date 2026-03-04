/**
 * One-time script to reset super admin password
 * Run: node server/scripts/resetAdminPassword.js
 * 
 * Set NEW_PASSWORD and USERNAME below, or pass as env vars:
 * RESET_USERNAME=dennisreact16 NEW_PASSWORD=YourNewPassword123 node server/scripts/resetAdminPassword.js
 * (Use RESET_USERNAME - Windows sets USERNAME to current user)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/user');

const USERNAME = process.env.RESET_USERNAME || 'dennisreact16';
const NEW_PASSWORD = process.env.NEW_PASSWORD || 'Admin123!'; // Change this or use env var

async function resetPassword() {
  try {
    if (!process.env.MONGO_URL) {
      console.error('MONGO_URL not found in .env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ username: USERNAME });
    if (!user) {
      console.error(`User "${USERNAME}" not found`);
      process.exit(1);
    }

    user.password = NEW_PASSWORD; // Pre-save hook will hash it
    await user.save();

    console.log(`Password reset successfully for "${USERNAME}"`);
    console.log(`New password: ${NEW_PASSWORD}`);
    console.log('You can now login with this password.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

resetPassword();
