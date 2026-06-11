const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Rate limiting middleware
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
// TEMPORARILY DISABLED: Auth rate limiting - uncomment when login is working properly
// const authRateLimit = createRateLimit(
//   15 * 60 * 1000, // 15 minutes
//   5, // 5 attempts per window
//   'Too many authentication attempts, please try again later'
// );

// Temporary: No-op middleware for auth rate limit (allows unlimited attempts during development)
const authRateLimit = (req, res, next) => {
  next(); // Allow all requests - rate limiting disabled
};

// General rate limit - increased significantly to prevent false positives
const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  500, // 500 requests per window (increased from 100 to handle normal usage)
  'Too many requests from this IP, please try again later'
);

const strictRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  20, // 20 requests per window
  'Too many requests, please slow down'
);

// Email-triggering auth endpoints (verification resend, password reset)
const emailAuthRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 emails per IP per window
  'Too many email requests, please try again later'
);

// Higher rate limit for notification endpoints (frequent polling)
const notificationRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  200, // 200 requests per window (for polling)
  'Too many notification requests, please slow down'
);

// Data sanitization middleware
const sanitizeData = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized key: ${key} in request: ${req.method} ${req.path}`);
  }
});

// Prevent parameter pollution
const preventParameterPollution = hpp();

// Compression middleware
const compressResponse = compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow all localhost ports
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    
    const envOrigins = (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://dealcouponz.com',
      'https://www.dealcouponz.com',
      'https://admin.dealcouponz.com',
      'https://honeydew-hamster-965094.hostingersite.com',
      'https://joyful-kitsune-4ff266.netlify.app',
      ...envOrigins,
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

// Request size limiter
const requestSizeLimit = (req, res, next) => {
  const contentLength = parseInt(req.get('content-length') || '0');
  // Per-request cap (Vercel also enforces ~4.5MB on many plans — use sequential uploads for many images).
  const maxSize = 25 * 1024 * 1024; // 25MB

  if (contentLength > maxSize) {
    return res.status(413).json({
      error: 'Request entity too large',
      message: 'Request size exceeds limit. Try uploading gallery images one at a time or use smaller files.',
    });
  }

  next();
};

// IP whitelist for admin endpoints (optional)
const adminIPWhitelist = (req, res, next) => {
  const adminIPs = process.env.ADMIN_IP_WHITELIST?.split(',') || [];
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Skip whitelist check if no IPs configured
  if (adminIPs.length === 0) {
    return next();
  }
  
  if (adminIPs.includes(clientIP)) {
    next();
  } else {
    res.status(403).json({
      error: 'Access denied',
      message: 'Admin access restricted to whitelisted IPs'
    });
  }
};

module.exports = {
  securityHeaders,
  authRateLimit,
  generalRateLimit,
  strictRateLimit,
  emailAuthRateLimit,
  notificationRateLimit,
  sanitizeData,
  preventParameterPollution,
  compressResponse,
  corsOptions,
  requestSizeLimit,
  adminIPWhitelist
};


