const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AffiliateSchema = new Schema({
  name: {
    type: String,
    required: true, // Name of the affiliate network (e.g., "Amazon Associates")
    unique: true, // Ensure affiliate network names are unique
  },
  website: {
    type: String,
    required: true, // Official website of the affiliate network
  },
  description: {
    type: String,
    default: '', // Optional description of the affiliate network
  },
  affiliateId: {
    type: String,
    required: false, // Unique ID assigned to the user by the affiliate network
  },
  username: {
    type: String,
    required: true, // Username for the affiliate account
  },
  password: {
    type: String,
    required: true, // Password for the affiliate account
  },
  
  createdAt: {
    type: Date,
    default: Date.now, // Timestamp for when the affiliate network was added
  },
  updatedAt: {
    type: Date,
    default: Date.now, // Timestamp for the last update
  },
});

// Automatically update the `updatedAt` field before saving
AffiliateSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Affiliate = mongoose.model('Affiliate', AffiliateSchema);

module.exports = Affiliate;
