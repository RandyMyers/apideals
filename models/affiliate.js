const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AffiliateSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  website: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  affiliateId: {
    type: String,
    required: false,
  },

  // How you log in to this affiliate network's dashboard
  authMethod: {
    type: String,
    enum: ['password', 'google', 'facebook', 'apple', 'sso', 'none'],
    default: 'password',
  },

  // Optional — only relevant when authMethod === 'password'
  username: {
    type: String,
    default: '',
  },
  password: {
    type: String,
    default: '',
  },

  // Extra notes (e.g. "log in via Google account: user@gmail.com")
  notes: {
    type: String,
    default: '',
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

AffiliateSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Affiliate = mongoose.model('Affiliate', AffiliateSchema);

module.exports = Affiliate;
