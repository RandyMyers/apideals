const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which logs to print
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define different log formats
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: logFormat,
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
  exitOnError: false,
});

// Create a stream object with a 'write' function for Morgan
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const correlationId = req.headers['x-correlation-id'] || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add correlation ID to request
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Log request
  logger.info('Incoming request', {
    correlationId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    logger.info('Outgoing response', {
      correlationId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  const correlationId = req.correlationId || 'unknown';
  
  logger.error('Request error', {
    correlationId,
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  next(err);
};

// Security event logging
const securityLogger = {
  loginAttempt: (ip, username, success, reason = null) => {
    logger.warn('Login attempt', {
      event: 'login_attempt',
      ip,
      username,
      success,
      reason,
      timestamp: new Date().toISOString()
    });
  },
  
  suspiciousActivity: (ip, activity, details = {}) => {
    logger.error('Suspicious activity', {
      event: 'suspicious_activity',
      ip,
      activity,
      details,
      timestamp: new Date().toISOString()
    });
  },
  
  rateLimitExceeded: (ip, endpoint, limit) => {
    logger.warn('Rate limit exceeded', {
      event: 'rate_limit_exceeded',
      ip,
      endpoint,
      limit,
      timestamp: new Date().toISOString()
    });
  },
  
  dataAccess: (userId, resource, action, details = {}) => {
    logger.info('Data access', {
      event: 'data_access',
      userId,
      resource,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  securityLogger
};


