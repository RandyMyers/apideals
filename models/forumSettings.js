const mongoose = require('mongoose');

const forumSettingsSchema = new mongoose.Schema(
  {
    newAccountDays: { type: Number, default: 7, min: 0, max: 90 },
    autoHideReportThreshold: { type: Number, default: 3, min: 1, max: 50 },
    maxThreadsPerDay: { type: Number, default: 5, min: 1, max: 100 },
    maxPostsPerDay: { type: Number, default: 30, min: 1, max: 500 },
    spamPendingScore: { type: Number, default: 50, min: 10, max: 100 },
    spamRejectScore: { type: Number, default: 80, min: 20, max: 100 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

forumSettingsSchema.statics.getSettings = async function getSettings() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

forumSettingsSchema.statics.updateSettings = async function updateSettings(updates) {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(updates);
  } else {
    Object.assign(settings, updates);
    settings.lastUpdated = new Date();
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model('ForumSettings', forumSettingsSchema);
