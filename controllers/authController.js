const User = require('../models/user');  // User model
const Subscription = require('../models/subscriptions'); // Adjust the path
const SubscriptionPlan = require('../models/subscriptionPlan'); // Adjust the path
const bcrypt = require('bcryptjs'); // Use bcryptjs to match User model
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');  // For generating JWT tokens
const notificationService = require('../services/notificationService');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to generate JWT token
const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    username: user.username, // Include username in the payload
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });  // Token expiry in 1 hour
};

function generateReferralCode() {
  const timestamp = Date.now().toString(36); // Converts timestamp to base-36
  const randomChars = Math.random().toString(36).substring(2, 10); // Random string
  return `${timestamp}-${randomChars}`.toUpperCase();
}


exports.registerAdmin = async (req, res) => {
  try {
    const { username, email, password, userType } = req.body;

    // Validate password length before creating user
    if (!password || password.length < 8) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long',
        error: 'PASSWORD_TOO_SHORT'
      });
    }

    // Allow only predefined userTypes, e.g., 'superAdmin'
    if (userType !== 'superAdmin') {
      return res.status(403).json({ message: 'Unauthorized userType assignment' });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Password will be automatically hashed by User model pre-save hook
    // No need to hash manually

    // Create new user
    const newUser = new User({
      email,
      username, // Include username
      password: password, // Pass plain password, pre-save hook will hash it with bcryptjs
      userType
    });

    // Save user to DB
    await newUser.save();

    // Generate JWT token
    const token = generateToken(newUser);

    res.status(201).json({ message: 'Admin registered successfully!', token, userId: newUser._id, username: newUser.username });
  } catch (error) {
    console.error('Admin registration error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = [];
      for (const field in error.errors) {
        const err = error.errors[field];
        if (field === 'password') {
          if (err.kind === 'minlength') {
            messages.push('Password must be at least 8 characters long');
          } else {
            messages.push(`Password: ${err.message}`);
          }
        } else if (field === 'email') {
          if (err.kind === 'unique') {
            messages.push('This email is already registered');
          } else {
            messages.push(`Email: ${err.message}`);
          }
        } else if (field === 'username') {
          if (err.kind === 'unique') {
            messages.push('This username is already taken');
          } else {
            messages.push(`Username: ${err.message}`);
          }
        } else {
          messages.push(`${field}: ${err.message}`);
        }
      }
      return res.status(400).json({ 
        message: messages.join('. ') || 'Validation error',
        error: 'VALIDATION_ERROR',
        details: messages
      });
    }
    
    // Handle duplicate key errors (MongoDB)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'email' ? 'Email' : 'Username';
      return res.status(400).json({ 
        message: `${fieldName} is already registered`,
        error: 'DUPLICATE_ENTRY'
      });
    }
    
    res.status(500).json({ 
      message: 'Server error during registration. Please try again.',
      error: 'SERVER_ERROR'
    });
  }
};

exports.adminLogin = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Define the allowed user types
    const allowedUserTypes = [
      'superAdmin', // Full access
      'couponManager', // Manage coupons/deals
      'customerSupport', // Help with customer inquiries
      'contentEditor', // Edit content on the app
      'marketingManager', // Manage marketing campaigns
    ];

    // Ensure the user's userType is allowed
    if (!allowedUserTypes.includes(user.userType)) {
      return res.status(403).json({ message: 'Access denied: Unauthorized user type' });
    }

    // Verify password using User model's method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Send response with token
    res.json({
      message: 'Admin login successful',
      token,
      userId: user._id,
      username: user.username,
      userType: user.userType, // Include userType in the response for client-side handling
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.register = async (req, res) => {
  const { username, email, password, referral } = req.body;

  // Validate required fields
  if (!username || !email || !password) {
    return res.status(400).json({ 
      message: 'Username, email, and password are required',
      error: 'MISSING_FIELDS'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      message: 'Please enter a valid email address',
      error: 'INVALID_EMAIL'
    });
  }

  // Validate username length
  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ 
      message: 'Username must be between 3 and 30 characters long',
      error: 'INVALID_USERNAME_LENGTH'
    });
  }

  try {
    // Validate password length before creating user
    if (!password || password.length < 8) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long',
        error: 'PASSWORD_TOO_SHORT'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Note: Password will be hashed automatically by User model pre-save hook
    // No need to hash manually here

    let referralCode;
    let isUnique = false;
    while (!isUnique) {
      referralCode = generateReferralCode();
      isUnique = !(await User.findOne({ referralCode }));
    }

     // Check referral code and fetch referring user
     let referredBy = null;
     if (referral) {
       const referrer = await User.findOne({ referralCode: referral });
       if (!referrer) {
         return res.status(400).json({ message: 'Invalid referral code' });
       }
       referredBy = referrer._id;
 
       // Add referral credits to the referring user
       const referralCredits = 10; // Example value
       referrer.credits = (referrer.credits || 0) + referralCredits;
 
       // Save the updated referrer
       await referrer.save();

       // Send referral bonus notification to referrer (non-blocking)
       try {
         await notificationService.createNotification(
           referrer._id,
           'referral_bonus',
           { amount: referralCredits },
           { actionUrl: '/dashboard/referrals' }
         );
       } catch (notifError) {
         console.error('Error sending referral bonus notification:', notifError);
         // Don't fail registration if notification fails
       }
     }

    // Create a new user
    // Password will be automatically hashed by the User model pre-save hook
    const newUser = new User({
      email,
      username,
      password: password, // Pass plain password, pre-save hook will hash it
      referralCode,
      referredBy,
    });

    // Save user to the database
    await newUser.save();

    // Assign the Free Plan to the new user
    const freePlan = await SubscriptionPlan.findOne({ name: 'Free' });
    if (!freePlan) {
      return res.status(500).json({ message: 'Free plan is not defined in the system' });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(startDate.getMonth() + 1); // Assuming 1-month validity for Free Plan

    const freeSubscription = new Subscription({
      userId: newUser._id,
      planId: freePlan._id,
      paymentLinkId: null, // Free plan does not require payment
      paymentId: null, // Free plan does not have payments
      startDate,
      endDate,
      status: 'active',
      nextBillingDate: endDate,
      couponLimit: freePlan.couponLimit,
      dealLimit: freePlan.dealLimit,
      storeLimit: freePlan.storeLimit,
    });

    // Save the subscription to the database
    await freeSubscription.save();

    // Send welcome notification to new user (non-blocking)
    try {
      await notificationService.createNotification(
        newUser._id,
        'welcome',
        { userName: newUser.username },
        { actionUrl: '/dashboard' }
      );
    } catch (notifError) {
      console.error('Error sending welcome notification:', notifError);
      // Don't fail registration if notification fails
    }

    // Send notification to admins about new user (non-blocking)
    try {
      const adminUsers = await User.find({ 
        userType: { $in: ['superAdmin', 'couponManager', 'customerSupport'] } 
      }).select('_id');
      
      if (adminUsers.length > 0) {
        const adminIds = adminUsers.map(admin => admin._id.toString());
        await notificationService.sendBulkNotifications(
          adminIds,
          'new_user_registered',
          { 
            userName: newUser.username,
            userEmail: newUser.email 
          }
        );
      }
    } catch (notifError) {
      console.error('Error sending admin notification:', notifError);
      // Don't fail registration if notification fails
    }

    // Generate JWT token
    const token = generateToken(newUser);

    // Send response with token and user info
    res.status(201).json({
      token,
      userId: newUser._id,
      username: newUser.username,
      userType: newUser.userType,
      subscriptionId: freeSubscription._id,
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = [];
      for (const field in error.errors) {
        const err = error.errors[field];
        if (field === 'password') {
          if (err.kind === 'minlength') {
            messages.push('Password must be at least 8 characters long');
          } else {
            messages.push(`Password: ${err.message}`);
          }
        } else if (field === 'email') {
          if (err.kind === 'unique') {
            messages.push('This email is already registered');
          } else {
            messages.push(`Email: ${err.message}`);
          }
        } else if (field === 'username') {
          if (err.kind === 'unique') {
            messages.push('This username is already taken');
          } else {
            messages.push(`Username: ${err.message}`);
          }
        } else {
          messages.push(`${field}: ${err.message}`);
        }
      }
      return res.status(400).json({ 
        message: messages.join('. ') || 'Validation error',
        error: 'VALIDATION_ERROR',
        details: messages
      });
    }
    
    // Handle duplicate key errors (MongoDB)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'email' ? 'Email' : 'Username';
      return res.status(400).json({ 
        message: `${fieldName} is already registered`,
        error: 'DUPLICATE_ENTRY'
      });
    }
    
    // Generic server error
    res.status(500).json({ 
      message: 'Server error during registration. Please try again.',
      error: 'SERVER_ERROR'
    });
  }
};


exports.login = async (req, res) => {
  // Log the entire request body for debugging
  console.log('=== LOGIN REQUEST DEBUG ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body keys:', Object.keys(req.body || {}));
  
  const { username, password } = req.body;

  // Log incoming request for debugging
  console.log('Extracted values:', { 
    hasUsername: !!username, 
    hasPassword: !!password,
    usernameType: typeof username,
    usernameLength: username?.length,
    username: username,
    passwordLength: password?.length
  });

  // Validate input
  if (!username || !password) {
    console.log('Validation failed: Missing username or password');
    return res.status(400).json({ 
      message: 'Username/Email and password are required',
      error: 'MISSING_CREDENTIALS'
    });
  }

  // Trim and validate username/password are not just whitespace
  const trimmedUsername = username.trim();
  const trimmedPassword = password.trim();

  if (!trimmedUsername || !trimmedPassword) {
    console.log('Validation failed: Username or password is empty after trim');
    return res.status(400).json({ 
      message: 'Username/Email and password cannot be empty',
      error: 'EMPTY_CREDENTIALS'
    });
  }

  try {
    // Check if user exists by username OR email
    const user = await User.findOne({
      $or: [
        { username: trimmedUsername },
        { email: trimmedUsername.toLowerCase() }
      ]
    });

    if (!user) {
      console.log('User not found for:', trimmedUsername);
      return res.status(400).json({ 
        message: 'Invalid credentials',
        error: 'USER_NOT_FOUND'
      });
    }

    // Check if password is correct
    // Use the User model's comparePassword method OR bcryptjs directly
    let isMatch = false;
    try {
      // Try using the User model's method first
      if (typeof user.comparePassword === 'function') {
        isMatch = await user.comparePassword(trimmedPassword);
      } else {
        // Fallback to direct bcryptjs comparison
        isMatch = await bcrypt.compare(trimmedPassword, user.password);
      }
      
      // Debug log password comparison
      console.log('Password comparison result:', isMatch);
      console.log('Stored password hash (first 20 chars):', user.password?.substring(0, 20));
      console.log('Password hash length:', user.password?.length);
    } catch (compareError) {
      console.error('Error comparing passwords:', compareError);
      return res.status(500).json({ 
        message: 'Error verifying password',
        error: 'PASSWORD_COMPARE_ERROR'
      });
    }
    
    if (!isMatch) {
      console.log('Password mismatch for user:', user.username);
      return res.status(400).json({ 
        message: 'Invalid credentials',
        error: 'INVALID_PASSWORD'
      });
    }

    // Retrieve the active subscription
    const activeSubscription = await Subscription.findOne({
      userId: user._id,
      status: 'active',
    }).sort({ endDate: -1 }); // Sort by most recent end date

    // Generate JWT token
    const token = generateToken(user);

    // Send response with token, user info, and subscription ID
    res.json({
      token,
      userId: user._id,
      username: user.username,
      userType: user.userType,
      subscriptionId: activeSubscription ? activeSubscription._id : null, // Include active subscription ID
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

 // Function to change password
 exports.changePassword = async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;

    // Find the user
    const user = await User.findById(userId);

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if the old password is correct
    // Use User model's comparePassword method
    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid old password' });
    }

    // Update the user's password (will be automatically hashed by User model pre-save hook)
    user.password = newPassword; // Pass plain password, pre-save hook will hash it
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Password Reset Request function (send reset email)
exports.passwordResetRequest = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Generate password reset token (you can use JWT or random string)
    const resetToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

    // Send reset email (you can use any email service like SendGrid, NodeMailer, etc.)
    //const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    //await sendEmail(user.email, 'Password Reset Request', resetLink);

    res.status(200).json({ message: 'Password reset link sent to your email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Password Reset function (update password using token)
exports.passwordReset = async (req, res) => {
  const { resetToken, newPassword } = req.body;

  try {
    // Verify the reset token
    const decoded = jwt.verify(resetToken, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update the password (will be automatically hashed by User model pre-save hook)
    user.password = newPassword; // Pass plain password, pre-save hook will hash it
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify token and check if it's expired
exports.verifyToken = async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        valid: false, 
        message: 'Token is missing',
        isAuthenticated: false 
      });
    }

    try {
      // Verify token using secret key
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Find the user associated with the token
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ 
          valid: false, 
          message: 'User not found',
          isAuthenticated: false 
        });
      }

      // Token is valid and user exists
      res.status(200).json({ 
        valid: true,
        isAuthenticated: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          userType: user.userType
        }
      });
    } catch (jwtError) {
      // Token is invalid or expired
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          valid: false, 
          message: 'Token has expired',
          isAuthenticated: false,
          expired: true
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          valid: false, 
          message: 'Invalid token',
          isAuthenticated: false
        });
      }
      throw jwtError;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      valid: false, 
      message: 'Server error during token verification',
      isAuthenticated: false 
    });
  }
};


