const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'MONGO_URL',
  'JWT_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Environment configuration
const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 5000,
  
  // Database
  mongoUrl: process.env.MONGO_URL,
  
  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '15m',
  
  // Email
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'noreply@dealcouponz.com'
  },
  
  // URLs
  urls: {
    client: process.env.CLIENT_URL || 'http://localhost:3000',
    admin: process.env.ADMIN_URL || 'http://localhost:3001'
  },
  
  // Security
  security: {
    adminIpWhitelist: process.env.ADMIN_IP_WHITELIST?.split(',') || [],
    corsOrigins: [
      process.env.CLIENT_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3001'
    ]
  },
  
  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  
  // Flutterwave
  flutterwave: {
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
    encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY
  },
  
  // WooCommerce
  wooCommerce: {
    webhookSecret: process.env.WOOCOMMERCE_WEBHOOK_SECRET
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

// Validate configuration
const validateConfig = () => {
  const errors = [];
  
  if (!config.mongoUrl) {
    errors.push('MONGO_URL is required');
  }
  
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }
  
  if (!config.email.user || !config.email.pass) {
    errors.push('EMAIL_USER and EMAIL_PASS are required for email functionality');
  }
  
  if (errors.length > 0) {
    console.error('Configuration validation failed:');
    errors.forEach(error => console.error(`- ${error}`));
    process.exit(1);
  }
};

// Run validation
validateConfig();

module.exports = config;


