const mongoose = require('mongoose');

const ExchangeRateSnapshotSchema = new mongoose.Schema({
  baseCurrency: {
    type: String,
    default: 'USD',
    required: true,
  },
  /** USD-base rates from exchangerate-api: 1 USD = rates[HKD] HKD */
  rates: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  fetchedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  source: {
    type: String,
    default: 'exchangerate-api',
  },
}, {
  timestamps: true,
});

ExchangeRateSnapshotSchema.index({ fetchedAt: -1 });

ExchangeRateSnapshotSchema.statics.getLatest = function () {
  return this.findOne().sort({ fetchedAt: -1 }).lean();
};

module.exports = mongoose.model('ExchangeRateSnapshot', ExchangeRateSnapshotSchema);
