const ApiKey = require('../models/apiKey');

/**
 * Create a new API key (admin only - JWT required)
 * Raw key is returned ONLY once - store it securely
 */
exports.createApiKey = async (req, res) => {
  try {
    const { name, expiresAt, storeId, categoryId } = req.body;
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    if (!storeId || !categoryId) {
      return res.status(400).json({ message: 'Store and Category are required. Select the store and category this key will use for coupons/deals.' });
    }

    const prefix = process.env.NODE_ENV === 'production' ? 'dc_live_' : 'dc_test_';
    const rawKey = ApiKey.generateKey(prefix);
    const keyHash = ApiKey.hashKey(rawKey);

    const apiKey = new ApiKey({
      keyHash,
      keyPrefix: prefix,
      userId,
      name: name.trim(),
      storeId,
      categoryId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    await apiKey.save();

    return res.status(201).json({
      message: 'API key created. Store it securely - it will not be shown again.',
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        storeId: apiKey.storeId,
        categoryId: apiKey.categoryId,
        createdAt: apiKey.createdAt,
      },
      key: rawKey, // Shown only once
    });
  } catch (error) {
    console.error('[apiKeyController] create error:', error);
    const errMsg = error.message || 'Unknown error';
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(500).json({
      message: 'Failed to create API key.',
      error: errMsg,
      ...(isDev && { stack: error.stack }),
    });
  }
};

/**
 * List API keys for the current user (admin only)
 * Raw keys are never returned
 */
exports.listApiKeys = async (req, res) => {
  try {
    const userId = req.user._id;

    const keys = await ApiKey.find({ userId })
      .select('-keyHash')
      .populate('storeId', 'name url')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ apiKeys: keys });
  } catch (error) {
    console.error('[apiKeyController] list error:', error);
    return res.status(500).json({ message: 'Failed to list API keys.', error: error.message });
  }
};

/**
 * Update API key store/category (admin only)
 */
exports.updateApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { storeId, categoryId } = req.body;
    const userId = req.user._id;

    const apiKey = await ApiKey.findOne({ _id: id, userId });
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found.' });
    }

    if (storeId) apiKey.storeId = storeId;
    if (categoryId) apiKey.categoryId = categoryId;
    await apiKey.save();

    return res.status(200).json({ message: 'API key updated.', apiKey });
  } catch (error) {
    console.error('[apiKeyController] update error:', error);
    return res.status(500).json({ message: 'Failed to update API key.', error: error.message });
  }
};

/**
 * Revoke (delete) an API key (admin only)
 */
exports.revokeApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const apiKey = await ApiKey.findOne({ _id: id, userId });
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found.' });
    }

    await ApiKey.findByIdAndDelete(id);
    return res.status(200).json({ message: 'API key revoked successfully.' });
  } catch (error) {
    console.error('[apiKeyController] revoke error:', error);
    return res.status(500).json({ message: 'Failed to revoke API key.', error: error.message });
  }
};
