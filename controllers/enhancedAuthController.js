const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const RefreshToken = require('../models/refreshToken');
const { logger, securityLogger } = require('../utils/logger');
const { userValidation } = require('../utils/validation');
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid if API key is provided
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Email configuration - SendGrid SMTP via nodemailer
// Supports both SendGrid API and SMTP methods
const createEmailTransporter = () => {
  // If SendGrid API key is provided and SMTP is not explicitly requested, use API
  if (process.env.SENDGRID_API_KEY && !process.env.SENDGRID_USE_SMTP) {
    // Use SendGrid API (more reliable, recommended)
    return null; // We'll use SendGrid API directly via sendEmail helper
  } else {
    // Use SendGrid SMTP via nodemailer
    if (!process.env.SENDGRID_API_KEY && !process.env.SENDGRID_SMTP_PASSWORD) {
      logger.warn('SendGrid not configured. Emails will not be sent. Set SENDGRID_API_KEY in .env');
      return null;
    }
    return nodemailer.createTransport({
      host: process.env.SENDGRID_SMTP_HOST || 'smtp.sendgrid.net',
      port: parseInt(process.env.SENDGRID_SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports (587)
      auth: {
        user: process.env.SENDGRID_SMTP_USER || 'apikey', // SendGrid uses 'apikey' as username
        pass: process.env.SENDGRID_API_KEY || process.env.SENDGRID_SMTP_PASSWORD // Your SendGrid API key
      },
      // Connection pool settings for better performance
      pool: true,
      maxConnections: 1,
      maxMessages: 3
    });
  }
};

const emailTransporter = createEmailTransporter();

// Helper function to send email (supports both SendGrid API and SMTP)
const sendEmail = async (mailOptions) => {
  // Use SendGrid API if configured and SMTP is not explicitly requested
  if (process.env.SENDGRID_API_KEY && !process.env.SENDGRID_USE_SMTP && !emailTransporter) {
    try {
      await sgMail.send({
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text || mailOptions.html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      });
      return true;
    } catch (error) {
      logger.error('SendGrid API error', { 
        error: error.message, 
        code: error.code,
        response: error.response?.body 
      });
      throw error;
    }
  } else {
    // Use SMTP (nodemailer)
    if (!emailTransporter) {
      throw new Error('Email transporter not configured. Please set SENDGRID_API_KEY or SENDGRID_SMTP settings in .env file');
    }
    return await emailTransporter.sendMail(mailOptions);
  }
};

// Verify email configuration on startup (only in development)
if (process.env.NODE_ENV !== 'production' && process.env.VERIFY_EMAIL_CONFIG === 'true') {
  if (emailTransporter) {
    emailTransporter.verify((error, success) => {
      if (error) {
        logger.warn('Email transporter (SMTP) verification failed', { error: error.message });
        logger.warn('Make sure SENDGRID_API_KEY or SENDGRID_SMTP settings are configured in your .env file');
      } else {
        logger.info('Email transporter (SendGrid SMTP) is ready to send emails');
      }
    });
  } else if (process.env.SENDGRID_API_KEY) {
    logger.info('SendGrid API is configured and ready to send emails');
  } else {
    logger.warn('SendGrid not configured. Set SENDGRID_API_KEY in .env file to enable email sending');
  }
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

// Send verification email
const sendVerificationEmail = async (email, token, username) => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@dealcouponz.com',
    to: email,
    subject: 'Verify Your DealCouponz Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to DealCouponz!</h2>
        <p>Hi ${username},</p>
        <p>Thank you for registering with DealCouponz. Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account with DealCouponz, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          © 2024 DealCouponz. All rights reserved.
        </p>
      </div>
    `
  };

  // Disable emails for local/dev if configured
  if (process.env.DISABLE_EMAIL === 'true' || process.env.NODE_ENV !== 'production') {
    logger.warn('Email sending disabled; skipping verification email', { email });
    return;
  }
  try {
    await sendEmail(mailOptions);
    logger.info('Verification email sent', { email, username });
  } catch (error) {
    logger.error('Failed to send verification email', { error: error.message, email });
    // Don't block registration in non-production when email fails
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Failed to send verification email');
    }
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, token, username) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@dealcouponz.com',
    to: email,
    subject: 'Reset Your DealCouponz Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hi ${username},</p>
        <p>We received a request to reset your password for your DealCouponz account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          © 2024 DealCouponz. All rights reserved.
        </p>
      </div>
    `
  };

  if (process.env.DISABLE_EMAIL === 'true' || process.env.NODE_ENV !== 'production') {
    logger.warn('Email sending disabled; skipping password reset email', { email });
    return;
  }
  try {
    await sendEmail(mailOptions);
    logger.info('Password reset email sent', { email, username });
  } catch (error) {
    logger.error('Failed to send password reset email', { error: error.message, email });
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Failed to send password reset email');
    }
  }
};

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
    const { email } = req.body;

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
      await sendPasswordResetEmail(email, resetToken, user.username);
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


