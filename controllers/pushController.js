const webPushService = require('../utils/webPushService');

exports.getVapidPublicKey = (req, res) => {
  const publicKey = webPushService.getVapidPublicKey();
  if (!publicKey) {
    return res.json({ success: true, enabled: false });
  }
  return res.json({ success: true, enabled: true, publicKey });
};

exports.subscribe = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { subscription } = req.body || {};
    await webPushService.saveSubscription(userId, subscription, req.headers['user-agent']);
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { endpoint } = req.body || {};
    await webPushService.removeSubscription(userId, endpoint);
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
