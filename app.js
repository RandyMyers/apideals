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

// Check if we're in a serverless environment (Vercel, AWS Lambda, etc.)
// Also check for /var/task which is Vercel's runtime directory
const isServerless = !!(
  process.env.VERCEL || 
  process.env.VERCEL_ENV || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  // Check if __dirname is in /var/task (Vercel deployment)
  (typeof __dirname !== 'undefined' && __dirname.includes('/var/task'))
);

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
const voteRoutes = require('./routes/voteRoutes');  // Vote Routes
const Vote = require('./models/vote');  // Import Vote model for index migration
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
const apiKeyRoutes = require('./routes/apiKeyRoutes');  // API Keys for external apps
const siteRoutes = require('./routes/siteRoutes');  // Sites (multi-tenant)

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

// Create logs directory if it doesn't exist (only in non-serverless environments)
// Serverless environments (Vercel, AWS Lambda) have read-only filesystems
if (!isServerless) {
  const logsDir = path.join(__dirname, 'logs');
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (error) {
    // If we can't create logs directory, just log a warning
    console.warn('Could not create logs directory, using console logging only:', error.message);
  }
}

const systemAlertService = require('./services/systemAlertService');

// Disable Mongoose command buffering globally — operations fail fast instead of
// silently queuing until the Vercel function timeout is hit.
mongoose.set('bufferCommands', false);

// ─── MongoDB connection with caching for serverless environments ──────────────
// In serverless (Vercel) each cold-start re-imports this module, so we cache
// the connection on the global object so it survives across warm invocations.
let cachedConnection = global._mongoConnection || null;
let connectionPromise = global._mongoConnectionPromise || null;


async function connectToDatabase() {
  // Already connected — reuse
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // Connection already in progress — wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      // Close stale connection before reconnecting
      if (mongoose.connection.readyState !== 0) {
        try {
          await mongoose.connection.close();
        } catch (err) {
          logger.warn('Error closing stale MongoDB connection:', err.message);
        }
      }

      const connectionOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        // Fail fast so we don't silently hang until Vercel's function timeout
        serverSelectionTimeoutMS: isServerless ? 8000 : 10000,
        connectTimeoutMS: isServerless ? 8000 : 15000,
        socketTimeoutMS: 45000,
        // Never buffer operations — throw immediately if not connected
        bufferCommands: false,
        // Keep pool tiny in serverless (each instance only handles one request at a time)
        maxPoolSize: isServerless ? 1 : 10,
        minPoolSize: 0,
        // Close idle connections faster in serverless to avoid Atlas IP-block issues
        maxIdleTimeMS: isServerless ? 10000 : 30000,
        heartbeatFrequencyMS: isServerless ? 30000 : 10000,
        retryWrites: true,
        retryReads: true,
      };

      await mongoose.connect(process.env.MONGO_URL, connectionOptions);

      // Reset caches on error / disconnect so the next request reconnects
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error', { error: err.message });
        cachedConnection = null;
        connectionPromise = null;
        global._mongoConnection = null;
        global._mongoConnectionPromise = null;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        cachedConnection = null;
        connectionPromise = null;
        global._mongoConnection = null;
        global._mongoConnectionPromise = null;
      });

      cachedConnection = mongoose.connection;
      global._mongoConnection = cachedConnection;

      logger.info('Connected to MongoDB', {
        environment: isServerless ? 'serverless' : 'traditional',
        readyState: cachedConnection.readyState,
      });

      // Run vote index migration (non-critical)
      try {
        const Vote = require('./models/vote');
        await Vote.migrateIndexes();
      } catch (error) {
        logger.warn('Vote index migration failed (non-critical):', error.message);
      }

      return cachedConnection;
    } catch (error) {
      logger.error('Failed to connect to MongoDB', { error: error.message });
      connectionPromise = null;
      global._mongoConnectionPromise = null;
      try {
        await systemAlertService.sendDatabaseAlert(error);
      } catch (alertError) {
        logger.error('Failed to send database alert', { error: alertError.message });
      }
      throw error;
    }
  })();

  global._mongoConnectionPromise = connectionPromise;
  return connectionPromise;
}

// Retry wrapper — useful for one-off operations, not needed for normal routes
// because the middleware below already ensures a connection before each request.
async function withDbConnection(operation, retries = 2) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await connectToDatabase();
      return await operation();
    } catch (error) {
      lastError = error;
      logger.warn(`DB operation failed (attempt ${attempt}/${retries})`, {
        error: error.message,
        code: error.code,
      });
      if (
        error.message?.includes('buffering timed out') ||
        error.message?.includes('topology was destroyed') ||
        error.code === 'ETIMEOUT'
      ) {
        cachedConnection = null;
        connectionPromise = null;
        global._mongoConnection = null;
        global._mongoConnectionPromise = null;
      }
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw lastError;
}

// ─── Connect / register DB middleware ────────────────────────────────────────
if (isServerless) {
  logger.info('Serverless mode — MongoDB will connect on first request');
} else {
  // Traditional server: connect eagerly at startup
  connectToDatabase().catch((error) => {
    logger.error('Failed to connect to MongoDB at startup', { error: error.message });
    process.exit(1);
  });
}

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

// ─── DB connection middleware (serverless: connect before every API request) ──
app.use(async (req, res, next) => {
  // Skip the health-check — it must respond even when DB is down
  if (req.path === '/health' || req.path === '/robots.txt' || req.path.startsWith('/sitemap')) {
    return next();
  }
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    logger.error('DB connection middleware error', { error: error.message });
    return res.status(503).json({
      error: 'Database Unavailable',
      message: 'Service temporarily unavailable. Please try again shortly.',
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── Tenant resolution (multi-site) ────────────────────────────────────────
const { resolveTenant } = require('./middleware/tenantMiddleware');
app.use('/api/v1', resolveTenant);

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
app.use('/api/v1/sites', siteRoutes);
app.use('/api/v1/store', storeRoutes);
app.use('/api/v1/stores', savingTipsRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/category', categoryRoutes);  // New route for Categories
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/votes', voteRoutes);  // Vote routes
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
app.get('/api/v1/sitemap/slugs', require('./controllers/sitemapController').getSitemapSlugs);
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
app.use('/api/v1/api-keys', apiKeyRoutes); // API Keys (admin only - create/list/revoke)
app.use('/api/v1', require('./routes/urlRedirectRoutes')); // URL Redirect routes (admin endpoints)

// URL Redirect Middleware - Check for redirects before serving React app
// This must be AFTER API routes but BEFORE the React app catch-all
const redirectMiddleware = require('./middleware/redirectMiddleware');
app.use(redirectMiddleware);

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

// Only start background jobs if NOT in serverless environment
// Serverless functions are stateless and short-lived, so background jobs won't work
if (!isServerless) {
  // Start campaign jobs
  try {
    const { startCampaignJobs } = require('./jobs/campaignJobs');
    startCampaignJobs();
  } catch (error) {
    logger.warn('Failed to start campaign jobs (non-critical):', error.message);
  }

  // Start notification jobs
  try {
    const { startNotificationJobs } = require('./jobs/notificationJobs');
    startNotificationJobs();
  } catch (error) {
    logger.warn('Failed to start notification jobs (non-critical):', error.message);
  }
} else {
  // In serverless, you might want to use Vercel Cron Jobs or external services
  // for scheduled tasks instead of node-cron
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Background jobs disabled in serverless environment - consider using Vercel Cron Jobs');
  }
}

// Only start HTTP server if NOT in serverless environment
// In serverless (Vercel), the platform handles the HTTP server
if (!isServerless) {
  // Create HTTP server for Socket.IO
  const server = http.createServer(app);

  // Initialize Socket.IO (only in non-serverless environments)
  try {
    const socketService = require('./services/socketService');
    socketService.initSocket(server);
    logger.info('Socket.IO server initialized', { namespace: '/admin' });
  } catch (error) {
    logger.warn('Socket.IO initialization failed (non-critical):', error.message);
  }

  // Start the server
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });
} else {
  // In serverless environment, log that we're ready
  logger.info('Serverless function initialized', {
    environment: process.env.NODE_ENV || 'production',
    platform: process.env.VERCEL ? 'Vercel' : 'Unknown',
    timestamp: new Date().toISOString()
  });
  
  // Note: Socket.IO and background jobs won't work in serverless
  // Consider using external services for real-time features and scheduled tasks
  if (process.env.NODE_ENV !== 'production') {
    logger.warn('Running in serverless mode - Socket.IO and background jobs are disabled');
  }
}

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
  // Log full error to console so it's visible even if Winston formatting hides details
  // This is especially helpful in development to see the real cause of crashes
  // eslint-disable-next-line no-console
  console.error('UNCAUGHT EXCEPTION:', err);

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

// Export app + connection helpers for serverless entry-points (api/index.js)
module.exports = { app, connectToDatabase, withDbConnection };

// Keep backward-compat: some files do `require('../app')` and call it directly
module.exports.default = app;
