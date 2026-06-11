const mongoose = require('mongoose');

const emailSettingsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    sendInDevelopment: { type: Boolean, default: false },
    provider: { type: String, enum: ['smtp', 'sendgrid_api'], default: 'smtp' },
    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 587 },
    smtpSecure: { type: Boolean, default: false },
    smtpUser: { type: String, default: '' },
    smtpPassword: { type: String, default: '', select: false },
    sendgridApiKey: { type: String, default: '', select: false },
    fromEmail: { type: String, default: '' },
    fromName: { type: String, default: 'DealCouponz' },
    replyTo: { type: String, default: '' },
    clientUrl: { type: String, default: '' },
    adminUrl: { type: String, default: '' },
    requireEmailVerification: { type: Boolean, default: true },
    verificationExpiryHours: { type: Number, default: 24, min: 1, max: 168 },
    resetExpiryHours: { type: Number, default: 1, min: 1, max: 72 },
    lastTestedAt: { type: Date },
    lastTestStatus: { type: String, enum: ['success', 'failed', ''], default: '' },
    lastTestError: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

emailSettingsSchema.statics.getSettings = async function getSettings() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

emailSettingsSchema.statics.updateSettings = async function updateSettings(updates) {
  let settings = await this.findOne().select('+smtpPassword +sendgridApiKey');
  if (!settings) {
    settings = await this.create(updates);
  } else {
    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) return;
      if ((key === 'smtpPassword' || key === 'sendgridApiKey') && updates[key] === '') return;
      settings[key] = updates[key];
    });
    settings.lastUpdated = new Date();
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model('EmailSettings', emailSettingsSchema);
