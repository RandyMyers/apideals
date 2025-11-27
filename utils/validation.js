const Joi = require('joi');

// Common validation patterns
const commonPatterns = {
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters long'
    }),
  username: Joi.string().alphanum().min(3).max(30).required(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  url: Joi.string().uri().optional(),
  currency: Joi.string().valid('USD', 'EUR', 'GBP', 'NGN', 'CAD', 'AUD').default('USD'),
  boolean: Joi.boolean().default(false)
};

// User validation schemas
const userValidation = {
  register: Joi.object({
    username: commonPatterns.username,
    email: commonPatterns.email,
    password: commonPatterns.password,
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({ 'any.only': 'Passwords do not match' }),
    phone: commonPatterns.phone,
    referral: Joi.string().optional()
  }),
  
  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonPatterns.password,
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
      .messages({ 'any.only': 'Passwords do not match' })
  }),
  
  resetPassword: Joi.object({
    email: commonPatterns.email
  }),
  
  updateProfile: Joi.object({
    username: commonPatterns.username.optional(),
    email: commonPatterns.email.optional(),
    phone: commonPatterns.phone,
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    bio: Joi.string().max(500).optional()
  })
};

// Coupon validation schemas
const couponValidation = {
  create: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    code: Joi.string().min(3).max(50).required(),
    description: Joi.string().max(1000).optional(),
    terms: Joi.string().max(2000).optional(),
    discountType: Joi.string().valid('percentage', 'fixed').required(),
    discountValue: Joi.number().positive().required(),
    minPurchaseAmount: Joi.number().min(0).optional(),
    maxPurchaseAmount: Joi.number().min(0).optional(),
    startDate: Joi.date().min('now').required(),
    endDate: Joi.date().min(Joi.ref('startDate')).required(),
    usageLimit: Joi.number().integer().min(1).optional(),
    storeId: commonPatterns.objectId,
    categoryId: commonPatterns.objectId,
    productId: commonPatterns.objectId.optional(),
    imageUrl: commonPatterns.url.optional()
  }),
  
  update: Joi.object({
    title: Joi.string().min(3).max(200).optional(),
    code: Joi.string().min(3).max(50).optional(),
    description: Joi.string().max(1000).optional(),
    terms: Joi.string().max(2000).optional(),
    discountType: Joi.string().valid('percentage', 'fixed').optional(),
    discountValue: Joi.number().positive().optional(),
    minPurchaseAmount: Joi.number().min(0).optional(),
    maxPurchaseAmount: Joi.number().min(0).optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    usageLimit: Joi.number().integer().min(1).optional(),
    isActive: commonPatterns.boolean
  }),
  
  submit: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    code: Joi.string().min(3).max(50).required(),
    description: Joi.string().max(1000).required(),
    terms: Joi.string().max(2000).optional(),
    storeId: commonPatterns.objectId,
    categoryId: commonPatterns.objectId,
    proof: commonPatterns.url.optional()
  })
};

// Store validation schemas
const storeValidation = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(1000).optional(),
    logo: commonPatterns.url.optional(),
    url: commonPatterns.url.required(),
    apiKey: Joi.string().min(10).optional(),
    secretKey: Joi.string().min(10).optional(),
    syncDirection: Joi.string().valid('pull', 'push', 'bidirectional').default('pull')
  }),
  
  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(1000).optional(),
    logo: commonPatterns.url.optional(),
    url: commonPatterns.url.optional(),
    isActive: commonPatterns.boolean
  })
};

// Subscription validation schemas
const subscriptionValidation = {
  create: Joi.object({
    planId: commonPatterns.objectId,
    paymentMethod: Joi.string().valid('card', 'bank_transfer', 'mobile_money').required(),
    currency: commonPatterns.currency
  }),
  
  update: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'cancelled', 'expired').optional(),
    autoRenew: commonPatterns.boolean
  })
};

// WooCommerce validation schemas
const wooCommerceValidation = {
  connect: Joi.object({
    url: commonPatterns.url.required(),
    consumerKey: Joi.string().min(10).required(),
    consumerSecret: Joi.string().min(10).required(),
    syncDirection: Joi.string().valid('pull', 'push', 'bidirectional').default('pull'),
    webhookSecret: Joi.string().optional().allow(''),
    categoryId: commonPatterns.objectId.optional(),
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(1000).optional()
    // Note: logo is handled as file upload (req.files.logo), not in body validation
  }),
  
  webhook: Joi.object({
    topic: Joi.string().valid('coupon.created', 'coupon.updated', 'coupon.deleted').required(),
    resource: Joi.string().required(),
    event: Joi.string().required()
  })
};

// Flutterwave validation schemas
const flutterwaveValidation = {
  payment: Joi.object({
    tx_ref: Joi.string().required(),
    amount: Joi.number().positive().required(),
    currency: commonPatterns.currency,
    customer: Joi.object({
      email: commonPatterns.email,
      name: Joi.string().min(2).max(100).required(),
      phone_number: commonPatterns.phone.optional()
    }).required(),
    customizations: Joi.object({
      title: Joi.string().max(100).required(),
      description: Joi.string().max(200).required(),
      logo: commonPatterns.url.optional()
    }).required()
  }),
  
  webhook: Joi.object({
    event: Joi.string().required(),
    data: Joi.object().required()
  })
};

// Generic validation middleware
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input and try again',
        details: errors
      });
    }
    
    // Replace the request property with the validated and sanitized value
    req[property] = value;
    next();
  };
};

// Pagination validation
const paginationValidation = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().optional(),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

// Search validation
const searchValidation = Joi.object({
  q: Joi.string().min(1).max(100).optional(),
  category: commonPatterns.objectId.optional(),
  store: commonPatterns.objectId.optional(),
  verified: commonPatterns.boolean.optional(),
  active: commonPatterns.boolean.optional(),
  ...paginationValidation.describe().keys
});

module.exports = {
  commonPatterns,
  userValidation,
  couponValidation,
  storeValidation,
  subscriptionValidation,
  wooCommerceValidation,
  flutterwaveValidation,
  paginationValidation,
  searchValidation,
  validate
};


