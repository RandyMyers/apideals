const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SettingsSchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  value: {
    type: Schema.Types.Mixed,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    default: 'general',
    enum: ['general', 'payment', 'email', 'analytics', 'integration'],
  },
  isPublic: {
    type: Boolean,
    default: false, // Public keys can be exposed to frontend
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

SettingsSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get a setting by key
SettingsSchema.statics.getSetting = async function (key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Static method to set a setting
SettingsSchema.statics.setSetting = async function (key, value, description = '', category = 'general', isPublic = false) {
  return await this.findOneAndUpdate(
    { key },
    { value, description, category, isPublic, updatedAt: Date.now() },
    { upsert: true, new: true }
  );
};

// Static method to get public settings (for frontend)
SettingsSchema.statics.getPublicSettings = async function () {
  const settings = await this.find({ isPublic: true });
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
};

const Settings = mongoose.model('Settings', SettingsSchema);

module.exports = Settings;

