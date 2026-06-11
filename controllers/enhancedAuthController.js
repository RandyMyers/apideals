const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const RefreshToken = require('../models/refreshToken');
const { logger, securityLogger } = require('../utils/logger');
const { userValidation } = require('../utils/validation');
const {
  sendVerificationEmail: deliverVerificationEmail,
  sendPasswordResetEmail: deliverPasswordResetEmail,
  isEmailConfigured,
} = require('../services/emailService');

if (process.env.VERIFY_EMAIL_CONFIG === 'true') {
  isEmailConfigured().then((ok) => {
    if (ok) logger.info('[auth] Email service is configured');
    else logger.warn('[auth] Email not configured — set SMTP in admin or .env');
  });
}

// Generate JWT tokens
const generateTokens = (user) => {
  const payload = {
    id: user._id,
    username: user.username,
    email: user.email,
    userType: user.userType
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m'
  });

  return { accessToken, payload };
};

// Generate email verification token
const generateEmailVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

async function sendVerificationEmail(email, token, username, locale) {
  const result = await deliverVerificationEmail({ email, username, token, locale });
  if (result.sent) {
    logger.info('Verification email sent', { email, username, locale });
  }
  return result;
}

async function sendPasswordResetEmail(email, token, username, app = 'client', locale) {
  const result = await deliverPasswordResetEmail({ email, username, token, app, locale });
  if (result.sent) {
    logger.info('Password reset email sent', { email, username, app, locale });
  }
  return result;
}

// Extract device info from request
const extractDeviceInfo = (req) => {
  const userAgent = req.get('User-Agent') || '';
  
  // Simple device detection (you might want to use a library like 'ua-parser-js' for better detection)
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
  const isTablet = /iPad|Tablet/.test(userAgent);
  
  let deviceType = 'desktop';
  if (isTablet) deviceType = 'tablet';
  else if (isMobile) deviceType = 'mobile';
  
  return {
    userAgent,
    ip: req.ip || req.connection.remoteAddress,
    deviceType,
    browser: userAgent.split(' ')[0] || 'unknown',
    os: 'unknown' // Could be enhanced with proper parsing
  };
};

// Register user
exports.register = async (req, res) => {
  try {
    const { username, email, password, phone, referral } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      securityLogger.suspiciousActivity(req.ip, 'duplicate_registration_attempt', { email, username });
      return res.status(400).json({
        error: 'User already exists',
        message: 'A user with this email or username already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate email verification token
    const emailVerificationToken = generateEmailVerificationToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      phone,
      referral,
      emailVerificationToken,
      emailVerificationExpires,
      isEmailVerified: false
    });

    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(email, emailVerificationToken, username);
    } catch (emailError) {
      logger.warn('User registered but verification email failed', { 
        userId: user._id, 
        email, 
        error: emailError.message 
      });
    }

    logger.info('User registered successfully', { 
      userId: user._id, 
      username, 
      email,
      ip: req.ip 
    });

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      userId: user._id,
      email: user.email,
      requiresVerification: true
    });

  } catch (error) {
    logger.error('Registration error', { 
      error: error.message, 
      stack: error.stack,
      ip: req.ip 
    });
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
};

// Resend verification email
exports.resendVerification = async (req, res) => {
  try {
    const email = (req.body?.email || req.user?.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationExpires');
    if (!user) {
      return res.json({ message: 'If an account exists, a verification email has been sent.' });
    }
    if (user.isEmailVerified) {
      return res.json({ message: 'Email is already verified.' });
    }

    const emailVerificationToken = generateEmailVerificationToken();
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const locale = req.body.lang || req.body.locale;
    await sendVerificationEmail(user.email, emailVerificationToken, user.username, locale);

    return res.json({ message: 'If an account exists, a verification email has been sent.' });
  } catch (error) {
    logger.error('Resend verification error', { error: error.message });
    return res.status(500).json({ message: 'Could not resend verification email' });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired token',
        message: 'Email verification token is invalid or has expired'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    logger.info('Email verified successfully', { userId: user._id, email: user.email });

    res.json({
      message: 'Email verified successfully',
      email: user.email
    });

  } catch (error) {
    logger.error('Email verification error', { error: error.message });
    res.status(500).json({
      error: 'Verification failed',
      message: 'An error occurred during email verification'
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      securityLogger.loginAttempt(req.ip, username, false, 'user_not_found');
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      securityLogger.loginAttempt(req.ip, username, false, 'account_inactive');
      return res.status(401).json({
        error: 'Account inactive',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      securityLogger.loginAttempt(req.ip, username, false, 'invalid_password');
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    // Generate tokens
    const { accessToken, payload } = generateTokens(user);

    // Create refresh token
    const deviceInfo = extractDeviceInfo(req);
    const refreshToken = await RefreshToken.generateToken(user._id, deviceInfo);

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    securityLogger.loginAttempt(req.ip, username, true);

    logger.info('User logged in successfully', { 
      userId: user._id, 
      username, 
      ip: req.ip 
    });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken: refreshToken.token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    logger.error('Login error', { error: error.message, ip: req.ip });
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
};

// Refresh access token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        message: 'Refresh token is required'
      });
    }

    // Find valid refresh token
    const tokenDoc = await RefreshToken.findValidToken(refreshToken);
    if (!tokenDoc) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired'
      });
    }

    // Check if user is still active
    if (!tokenDoc.userId.isActive) {
      await tokenDoc.revoke();
      return res.status(401).json({
        error: 'Account inactive',
        message: 'Your account has been deactivated'
      });
    }

    // Generate new access token
    const { accessToken } = generateTokens(tokenDoc.userId);

    // Update last used
    await tokenDoc.updateLastUsed();

    logger.info('Token refreshed successfully', { 
      userId: tokenDoc.userId._id, 
      ip: req.ip 
    });

    res.json({
      message: 'Token refreshed successfully',
      accessToken
    });

  } catch (error) {
    logger.error('Token refresh error', { error: error.message, ip: req.ip });
    res.status(500).json({
      error: 'Token refresh failed',
      message: 'An error occurred during token refresh'
    });
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke specific refresh token
      const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
      if (tokenDoc) {
        await tokenDoc.revoke();
      }
    } else if (req.user) {
      // Revoke all user tokens
      await RefreshToken.revokeAllUserTokens(req.user.id);
    }

    logger.info('User logged out', { 
      userId: req.user?.id, 
      ip: req.ip 
    });

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error', { error: error.message, ip: req.ip });
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
};

// Request password reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email, app } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = generateEmailVerificationToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Send reset email
    try {
      const locale = req.body.lang || req.body.locale;
      await sendPasswordResetEmail(email, resetToken, user.username, app === 'admin' ? 'admin' : 'client', locale);
    } catch (emailError) {
      logger.warn('Password reset requested but email failed', { 
        userId: user._id, 
        email, 
        error: emailError.message 
      });
    }

    logger.info('Password reset requested', { 
      userId: user._id, 
      email, 
      ip: req.ip 
    });

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent'
    });

  } catch (error) {
    logger.error('Password reset request error', { error: error.message, ip: req.ip });
    res.status(500).json({
      error: 'Password reset failed',
      message: 'An error occurred while processing your request'
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired token',
        message: 'Password reset token is invalid or has expired'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Revoke all user tokens
    await RefreshToken.revokeAllUserTokens(user._id);

    logger.info('Password reset successfully', { 
      userId: user._id, 
      email: user.email, 
      ip: req.ip 
    });

    res.json({
      message: 'Password reset successfully'
    });

  } catch (error) {
    logger.error('Password reset error', { error: error.message, ip: req.ip });
    res.status(500).json({
      error: 'Password reset failed',
      message: 'An error occurred while resetting your password'
    });
  }
};

// Get user sessions
exports.getSessions = async (req, res) => {
  try {
    const sessions = await RefreshToken.find({
      userId: req.user.id,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    }).select('deviceInfo lastUsedAt createdAt');

    res.json({
      sessions: sessions.map(session => ({
        id: session._id,
        device: session.deviceInfo,
        lastUsed: session.lastUsedAt,
        createdAt: session.createdAt
      }))
    });

  } catch (error) {
    logger.error('Get sessions error', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: 'Failed to fetch sessions',
      message: 'An error occurred while fetching your sessions'
    });
  }
};

// Revoke session
exports.revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await RefreshToken.findOne({
      _id: sessionId,
      userId: req.user.id,
      isRevoked: false
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session not found or already revoked'
      });
    }

    await session.revoke();

    logger.info('Session revoked', { 
      userId: req.user.id, 
      sessionId, 
      ip: req.ip 
    });

    res.json({
      message: 'Session revoked successfully'
    });

  } catch (error) {
    logger.error('Revoke session error', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: 'Failed to revoke session',
      message: 'An error occurred while revoking the session'
    });
  }
};

module.exports = exports;


