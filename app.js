const express = require('express');
const http = require('http');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const fileUpload = require('express-fileupload');

// Import security middleware
const { 
  securityHeaders, 
  authRateLimit, 
  generalRateLimit, 
  strictRateLimit,
  notificationRateLimit,
  sanitizeData, 
  preventParameterPollution, 
  compressResponse, 
  corsOptions, 
  requestSizeLimit,
  adminIPWhitelist 
} = require('./middleware/security');

// Import logging
const { logger, requestLogger, errorLogger } = require('./utils/logger');

// Importing route files
const usersRoutes = require('./routes/userRoutes');
const policiesRoutes = require('./routes/policyRoutes');
const authRoutes = require('./routes/authRoutes');
const enhancedAuthRoutes = require('./routes/enhancedAuthRoutes');
const blogRoutes = require('./routes/blogRoutes');
const affiliateRoutes = require('./routes/affiliateRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const interactionRoutes = require('./routes/interactionRoutes');
const viewRoutes = require('./routes/viewRoutes');
const dealRoutes = require('./routes/dealRoutes');
const couponRoutes = require('./routes/couponRoutes');  // New Coupon Routes
const couponSubmissionRoutes = require('./routes/couponSubmissionRoutes');  // User Coupon Submissions
const couponBoostRoutes = require('./routes/couponBoostRoutes');  // Coupon Boosts
const storeRoutes = require('./routes/storeRoutes');
const savingTipsRoutes = require('./routes/savingTipsRoutes'); 
const productRoutes = require('./routes/productRoutes'); 
const categoryRoutes = require('./routes/categoryRoutes');  // New Category Routes
const reviewRoutes = require('./routes/rateAndReviewRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');  // New Subscription Routes
const discountRoutes = require('./routes/discountRoutes');  // New Discount Routes
const discountUsageRoutes = require('./routes/discountUsageRoutes');  // New Discount Usage Routes
const paymentRoutes = require('./routes/paymentRoutes');  // New Payment Routes
const subscriptionPlanRoutes = require('./routes/subscriptionPlanRoutes');  // New Subscription Plan Routes
const paymentLinkRoutes = require('./routes/paymentLinkRoutes');  // New Payment Link Routes
const woocommerceRoutes = require('./routes/woocommerceRoutes');  // WooCommerce Routes
const flutterwaveRoutes = require('./routes/flutterwaveRoutes');  // Flutterwave Routes
const campaignRoutes = require('./routes/campaignRoutes');  // Campaign Routes
const walletRoutes = require('./routes/walletRoutes');  // Wallet Routes
const settingsRoutes = require('./routes/settingsRoutes');  // Settings Routes
const paymentGatewayRoutes = require('./routes/paymentGatewayRoutes');  // Payment Gateway Routes
const analyticsRoutes = require('./routes/analyticsRoutes');  // Analytics Routes
const shareRoutes = require('./routes/shareRoutes');  // Share Routes
const couponUsageRoutes = require('./routes/couponUsageRoutes');  // Coupon Usage Routes

dotenv.config();

const cloudinary = require('cloudinary').v2;
const app = express();

// Cloudinary Configuration
const cloudinaryConfig = require('./config/cloudinary');

// Set Cloudinary configuration as a local variable
app.use((req, res, next) => {
  cloudinary.config(cloudinaryConfig);
  next();
});

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const systemAlertService = require('./services/systemAlertService');

mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((error) => {
    logger.error('Failed to connect to MongoDB', { error: error.message });
    // Send system alert for database connection failure
    systemAlertService.sendDatabaseAlert(error).catch(err => {
      logger.error('Failed to send database alert', { error: err.message });
    });
  });

// Trust proxy (for accurate IP addresses behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware (order matters!)
app.use(securityHeaders);
app.use(compressResponse);
app.use(requestSizeLimit);
app.use(sanitizeData);
app.use(preventParameterPollution);


// CORS configuration
app.use(cors(corsOptions));

// Body parsing middleware
// Keep raw body for webhook verification; for general JSON use body-parser
app.use((req, res, next) => {
  if (req.path.startsWith('/api/v1/woocommerce/webhook')) {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      req.rawBody = data;
      try {
        req.body = data ? JSON.parse(data) : {};
      } catch (e) {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
});
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Logging middleware
app.use(requestLogger);
app.use(morgan('combined', { stream: logger.stream })); 

app.use(
  fileUpload({
    useTempFiles: true, // Store files in memory instead of a temporary directory
    createParentPath: true, // Create the 'uploads' directory if not exists
    tempFileDir: '/tmp/',
    limits: { fileSize: 10 * 1024 * 1024 }
  })
);

// API versioning
app.use('/api/v1', (req, res, next) => {
  req.apiVersion = 'v1';
  next();
});

// Rate limiting for different endpoints
app.use('/api/v1/auth', authRateLimit);
app.use('/api/v1/admin', adminIPWhitelist, strictRateLimit);
// Higher rate limit for notifications (frequent polling)
app.use('/api/v1/notifications', notificationRateLimit);
app.use('/api/v1', generalRateLimit);

// Using imported routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth', enhancedAuthRoutes); // Enhanced auth routes
app.use('/api/v1/blog', blogRoutes);
app.use('/api/v1/policies', policiesRoutes);
app.use('/api/v1/faq', require('./routes/faqRoutes'));
app.use('/api/v1/help', require('./routes/helpArticleRoutes'));
app.use('/api/v1/contact', require('./routes/contactRoutes'));
app.use('/api/v1/feedback', require('./routes/feedbackRoutes'));
app.use('/api/v1/report-issue', require('./routes/reportIssueRoutes'));
app.use('/api/v1/affiliates', affiliateRoutes);
app.use('/api/v1/views', viewRoutes);
app.use('/api/v1/visitors', visitorRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/interactions', interactionRoutes); 
app.use('/api/v1/coupons', couponRoutes);  // New route for Coupons
app.use('/api/v1/coupon-submissions', couponSubmissionRoutes);  // User Coupon Submissions
app.use('/api/v1/coupon-boosts', couponBoostRoutes);  // Coupon Boosts
app.use('/api/v1/deals', dealRoutes);
app.use('/api/v1/store', storeRoutes);
app.use('/api/v1/stores', savingTipsRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/category', categoryRoutes);  // New route for Categories
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);  // New route for Subscriptions
app.use('/api/v1/discounts', discountRoutes);  // New route for Discounts
app.use('/api/v1/discountUsages', discountUsageRoutes);  // New route for Discount Usages
app.use('/api/v1/payments', paymentRoutes);  // New route for Payments
app.use('/api/v1/plans', subscriptionPlanRoutes);  // New route for Subscription Plans
app.use('/api/v1/paymentLinks', paymentLinkRoutes);  // New route for Payment Links
app.use('/api/v1/woocommerce', woocommerceRoutes);  // WooCommerce endpoints
app.use('/api/v1/flutterwave', flutterwaveRoutes);  // Flutterwave endpoints
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/wallet', walletRoutes); // Wallet routes
app.use('/api/v1/settings', settingsRoutes); // Settings routes (admin only)
app.use('/api/v1/payment-gateways', paymentGatewayRoutes); // Payment gateway routes (public active, admin all)
app.use('/api/v1/analytics', analyticsRoutes); // Analytics routes (admin only)
app.use('/api/public/settings', require('./routes/publicSettingsRoutes')); // Public settings (frontend can access)
app.use('/api/payment-gateways', paymentGatewayRoutes); // Public alias for payment gateways (accessible at /api/payment-gateways/active)

// SEO Routes (sitemap and robots.txt)
app.use('/', require('./routes/sitemapRoutes')); // Sitemap at /sitemap.xml
app.use('/', require('./routes/robotsRoutes')); // Robots.txt at /robots.txt
app.use('/api/v1/seo-settings', require('./routes/seoSettingsRoutes')); // SEO Settings (admin only)
app.use('/api/v1/search-console', require('./routes/searchConsoleRoutes')); // Google Search Console (admin only)
app.use('/api/v1/performance', require('./routes/performanceRoutes')); // Performance Metrics
app.use('/api/v1/language-settings', require('./routes/languageSettingsRoutes')); // Language Settings
app.use('/api/v1/translations', require('./routes/translationRoutes')); // Translation Management
app.use('/api/v1/search', require('./routes/searchRoutes')); // Search endpoints (suggestions, trending)
app.use('/api/v1/stats', require('./routes/statsRoutes')); // Statistics endpoints
app.use('/api/v1/activities', require('./routes/activityRoutes')); // Activity endpoints (admin only)
app.use('/api/v1/notifications', require('./routes/notificationRoutes')); // Notification endpoints
app.use('/api/v1/notification-templates', require('./routes/notificationTemplateRoutes')); // Notification Template Management (admin only)
app.use('/api/v1/share', shareRoutes); // Share routes
app.use('/api/v1/coupon-usage', couponUsageRoutes); // Coupon Usage routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Error handling middleware
app.use(errorLogger);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    correlationId: req.correlationId
  });

  // Send system alert for critical errors (500+ status codes)
  if (!err.status || err.status >= 500) {
    systemAlertService.sendCriticalErrorAlert(err, {
      url: req.url,
      method: req.method,
      ip: req.ip,
      correlationId: req.correlationId
    }).catch(alertError => {
      logger.error('Failed to send critical error alert', { error: alertError.message });
    });
  }

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId
  });
});

// Start campaign jobs
const { startCampaignJobs } = require('./jobs/campaignJobs');
startCampaignJobs();

// Start notification jobs
const { startNotificationJobs } = require('./jobs/notificationJobs');
startNotificationJobs();

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  // Send critical alert before exiting
  systemAlertService.sendCriticalErrorAlert(err, {
    type: 'uncaught_exception'
  }).catch(() => {
    // Ignore errors during shutdown
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  // Send critical alert before exiting
  const error = reason instanceof Error ? reason : new Error(String(reason));
  systemAlertService.sendCriticalErrorAlert(error, {
    type: 'unhandled_rejection',
    promise: promise.toString()
  }).catch(() => {
    // Ignore errors during shutdown
  });
  process.exit(1);
});
