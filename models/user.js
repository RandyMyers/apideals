const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
      },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  userType: {
    type: String,
    enum: [
        'user',
        'superAdmin', // Full access
        'couponManager', // Manage coupons/deals
        'customerSupport', // Help with customer inquiries
        'contentEditor', // Edit content on the app
        'marketingManager' // Manage marketing campaigns
      ],
    default: 'user', // Default value is 'user'
  },
  firstName: {
    type: String,
    
  },
  lastName: {
    type: String,
    
  },
  profilePicture: {
    type: String, // URL or file path to the profile image
  },
  socialLogin: {
    google: {
      type: String,
      
    },
    facebook: {
      type: String,
      
    },
  },
  referralCode: {
    type: String,
    
    
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  credits: {
    type: Number,
    default: 0, // Store user credits for promotions
  },
  wallet: {
    type: Number,
    default: 0, // Amount in wallet (for credits and promotions)
  },

  FollowedCoupons: [
    {
      couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon', // Assuming there's a Coupon model
      },
      followedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  FollowedDeals: [
    {
      dealId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deal', // Assuming there's a Deal model
      },
      followedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
 
  // Email verification
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  
  // Password reset
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  
  // Login tracking
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  lastLoginIP: {
    type: String
  },
  loginCount: {
    type: Number,
    default: 0
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspensionReason: {
    type: String
  },
  suspensionExpires: {
    type: Date
  },
  
  // Profile
  phone: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    maxlength: 500
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say']
  },
  
  // Preferences
  emailNotifications: {
    type: Boolean,
    default: true
  },
  pushNotifications: {
    type: Boolean,
    default: true
  },
  newsletter: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ emailVerificationToken: 1 });
UserSchema.index({ passwordResetToken: 1 });
UserSchema.index({ isActive: 1, isSuspended: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ lastLoginAt: -1 });

// Pre-save middleware to update timestamps
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    const bcrypt = require('bcryptjs');
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get public profile
UserSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    profilePicture: this.profilePicture,
    userType: this.userType,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt
  };
};

// Static method to find by email or username
UserSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier },
      { username: identifier }
    ]
  });
};

const User = mongoose.model('User', UserSchema);
module.exports = User;
