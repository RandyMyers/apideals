const EmailSettings = require('../models/emailSettings');
const {
  sendTestEmail,
  maskSettings,
  invalidateEmailSettingsCache,
  isEmailConfigured,
} = require('../services/emailService');

exports.getEmailSettings = async (req, res) => {
  try {
    const settings = await EmailSettings.getSettings();
    const withSecrets = await EmailSettings.findOne().select('+smtpPassword +sendgridApiKey');
    const masked = maskSettings(withSecrets || settings);
    const configured = await isEmailConfigured();
    return res.json({ success: true, settings: masked, configured });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateEmailSettings = async (req, res) => {
  try {
    const allowed = [
      'enabled', 'sendInDevelopment', 'provider',
      'smtpHost', 'smtpPort', 'smtpSecure', 'smtpUser', 'smtpPassword',
      'sendgridApiKey', 'fromEmail', 'fromName', 'replyTo',
      'clientUrl', 'adminUrl', 'requireEmailVerification',
      'verificationExpiryHours', 'resetExpiryHours',
    ];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    const settings = await EmailSettings.updateSettings(updates);
    invalidateEmailSettingsCache();
    const withSecrets = await EmailSettings.findOne().select('+smtpPassword +sendgridApiKey');
    return res.json({ success: true, settings: maskSettings(withSecrets || settings) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.testEmailSettings = async (req, res) => {
  try {
    const to = String(req.body?.to || req.user?.email || '').trim();
    if (!to) {
      return res.status(400).json({ success: false, message: 'Recipient email required' });
    }
    const result = await sendTestEmail(to);
    const status = result.sent ? 'success' : 'failed';
    const errorMsg = result.sent ? '' : (result.reason || 'Send failed');
    await EmailSettings.updateSettings({
      lastTestedAt: new Date(),
      lastTestStatus: status,
      lastTestError: errorMsg,
    });
    invalidateEmailSettingsCache();
    if (!result.sent) {
      return res.status(400).json({
        success: false,
        message: errorMsg === 'dev_skipped'
          ? 'Email skipped in development. Enable “Send in development” in settings or set EMAIL_SEND_IN_DEV=true.'
          : errorMsg === 'not_configured'
            ? 'SMTP is not configured. Save host, port, and credentials first.'
            : 'Test email was not sent.',
        result,
      });
    }
    return res.json({ success: true, message: `Test email sent to ${to}` });
  } catch (error) {
    await EmailSettings.updateSettings({
      lastTestedAt: new Date(),
      lastTestStatus: 'failed',
      lastTestError: error.message,
    }).catch(() => {});
    invalidateEmailSettingsCache();
    return res.status(500).json({ success: false, message: error.message });
  }
};
