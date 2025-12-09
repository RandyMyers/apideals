# Server Environment Variables

Copy this content to `.env` file in the `server` directory:

```env
# Node Environment
NODE_ENV=development

# Server Port
PORT=5000

# MongoDB Connection
MONGO_URL=mongodb://localhost:27017/dealcouponz

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=15m

# Email Configuration (SendGrid)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
EMAIL_FROM=noreply@dealcouponz.com
SENDGRID_API_KEY=your-sendgrid-api-key

# Application URLs
CLIENT_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Flutterwave (Payment Gateway)
FLUTTERWAVE_PUBLIC_KEY=your-flutterwave-public-key
FLUTTERWAVE_SECRET_KEY=your-flutterwave-secret-key
FLUTTERWAVE_ENCRYPTION_KEY=your-flutterwave-encryption-key

# WooCommerce Integration
WOOCOMMERCE_URL=https://your-store.com
WOOCOMMERCE_CONSUMER_KEY=your-woocommerce-consumer-key
WOOCOMMERCE_CONSUMER_SECRET=your-woocommerce-consumer-secret

# Security
ADMIN_IP_WHITELIST=127.0.0.1,::1

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

