const jwt = require('jsonwebtoken');
const User = require('../models/user');
const ApiKey = require('../models/apiKey');

/**
 * Middleware that accepts EITHER:
 * - JWT: Authorization: Bearer <jwt_token>
 * - API Key: X-API-Key: <api_key>  OR  Authorization: Bearer dc_live_xxx / dc_test_xxx
 *
 * Sets req.user for downstream use. API keys inherit the userId's permissions.
 */
const authOrApiKeyMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const apiKeyHeader = req.header('X-API-Key');
  const bearerValue = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : null;
  const isApiKeyFormat = (val) => val && (val.startsWith('dc_live_') || val.startsWith('dc_test_'));

  // 1. X-API-Key header: treat as API key only
  if (apiKeyHeader) {
    if (!isApiKeyFormat(apiKeyHeader)) {
      return res.status(401).json({ message: 'Invalid API key format. Use dc_live_xxx or dc_test_xxx.' });
    }
    try {
      const keyDoc = await ApiKey.findByRawKey(apiKeyHeader);
      if (keyDoc) {
        ApiKey.findByIdAndUpdate(keyDoc._id, { lastUsedAt: new Date() }).catch(() => {});
        const user = keyDoc.userId;
        if (!user) return res.status(401).json({ message: 'API key user not found.' });
        req.user = user;
        req.user.id = user._id.toString();
        req.authType = 'api_key';
        return next();
      }
    } catch (err) {
      console.error('[authOrApiKey] API key error:', err.message);
    }
    return res.status(401).json({ message: 'Invalid or expired API key.' });
  }

  // 2. Authorization: Bearer - if API key format, try API key; else JWT
  if (!bearerValue || bearerValue === 'null' || bearerValue === 'undefined') {
    return res.status(401).json({ message: 'Authorization token or API key is required.' });
  }

  if (isApiKeyFormat(bearerValue)) {
    try {
      const keyDoc = await ApiKey.findByRawKey(bearerValue);
      if (keyDoc) {
        ApiKey.findByIdAndUpdate(keyDoc._id, { lastUsedAt: new Date() }).catch(() => {});
        const user = keyDoc.userId;
        if (!user) return res.status(401).json({ message: 'API key user not found.' });
        req.user = user;
        req.user.id = user._id.toString();
        req.authType = 'api_key';
        return next();
      }
    } catch (err) {
      console.error('[authOrApiKey] API key error:', err.message);
    }
    return res.status(401).json({ message: 'Invalid or expired API key.' });
  }

  // 3. JWT
  try {
    const decoded = jwt.verify(bearerValue, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found.', isAuthenticated: false });
    req.user = user;
    req.user.id = req.user._id ? req.user._id.toString() : req.user.id;
    req.authType = 'jwt';
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.', isAuthenticated: false });
  }
};

module.exports = authOrApiKeyMiddleware;
