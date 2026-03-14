const jwt = require('jsonwebtoken');
const User = require('../models/user');
const ApiKey = require('../models/apiKey');

/**
 * Optional auth: sets req.user when valid JWT or API key is provided.
 * Does NOT return 401 when no auth is provided - just continues without req.user.
 * Use for routes that accept either authenticated (API key) or unauthenticated (with userId in body) requests.
 */
const authOrApiKeyOptionalMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const apiKeyHeader = req.header('X-API-Key');
  const bearerValue = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : null;
  const isApiKeyFormat = (val) => val && (val.startsWith('dc_live_') || val.startsWith('dc_test_'));

  const tryApiKey = async (rawKey) => {
    if (!isApiKeyFormat(rawKey)) return null;
    const keyDoc = await ApiKey.findByRawKey(rawKey);
    if (keyDoc && keyDoc.userId) {
      ApiKey.findByIdAndUpdate(keyDoc._id, { lastUsedAt: new Date() }).catch(() => {});
      return {
        user: keyDoc.userId,
        storeId: keyDoc.storeId?._id || keyDoc.storeId,
        categoryId: keyDoc.categoryId?._id || keyDoc.categoryId,
      };
    }
    return null;
  };

  // No auth provided - continue without req.user
  if (!apiKeyHeader && !bearerValue) {
    return next();
  }

  const setApiKeyAuth = (result) => {
    const user = result.user;
    req.user = user;
    req.user.id = (user._id && user._id.toString) ? user._id.toString() : String(user._id || user.id);
    req.authType = 'api_key';
    req.apiKeyStoreId = result.storeId ? (result.storeId.toString ? result.storeId.toString() : result.storeId) : null;
    req.apiKeyCategoryId = result.categoryId ? (result.categoryId.toString ? result.categoryId.toString() : result.categoryId) : null;
  };

  // X-API-Key header
  if (apiKeyHeader) {
    try {
      const result = await tryApiKey(apiKeyHeader);
      if (result) {
        setApiKeyAuth(result);
        return next();
      }
      return res.status(401).json({ message: 'Invalid or expired API key.' });
    } catch (err) {
      console.error('[authOrApiKeyOptional] API key error:', err.message);
      return res.status(401).json({ message: 'Invalid API key.' });
    }
  }

  // Bearer - API key or JWT
  if (isApiKeyFormat(bearerValue)) {
    try {
      const result = await tryApiKey(bearerValue);
      if (result) {
        setApiKeyAuth(result);
        return next();
      }
      return res.status(401).json({ message: 'Invalid or expired API key.' });
    } catch (err) {
      console.error('[authOrApiKeyOptional] API key error:', err.message);
      return res.status(401).json({ message: 'Invalid API key.' });
    }
  }

  // JWT
  try {
    const decoded = jwt.verify(bearerValue, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user) {
      req.user = user;
      req.user.id = req.user._id ? req.user._id.toString() : req.user.id;
      req.authType = 'jwt';
    }
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  next();
};

module.exports = authOrApiKeyOptionalMiddleware;
