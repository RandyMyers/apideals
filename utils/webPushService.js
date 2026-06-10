const webpush = require('web-push');
const PushDevice = require('../models/pushDevice');

let configured = false;

function configure() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@dealcouponz.com';
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

exports.getVapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

exports.saveSubscription = async (userId, subscription, userAgent = '') => {
  const endpoint = subscription?.endpoint;
  if (!endpoint) throw new Error('Invalid subscription');
  await PushDevice.findOneAndUpdate(
    { endpoint },
    {
      userId,
      endpoint,
      keys: subscription.keys,
      userAgent: String(userAgent).slice(0, 300),
      lastUsedAt: new Date(),
    },
    { upsert: true, new: true }
  );
};

exports.removeSubscription = async (userId, endpoint) => {
  await PushDevice.deleteOne({ userId, endpoint });
};

exports.sendPushToUser = async (userId, payload) => {
  if (!configure()) return { sent: 0, skipped: true };
  const devices = await PushDevice.find({ userId }).lean();
  let sent = 0;
  const body = JSON.stringify(payload);
  for (const device of devices) {
    try {
      await webpush.sendNotification(
        { endpoint: device.endpoint, keys: device.keys },
        body
      );
      sent += 1;
      await PushDevice.updateOne({ _id: device._id }, { lastUsedAt: new Date() });
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await PushDevice.deleteOne({ _id: device._id });
      }
    }
  }
  return { sent };
};
