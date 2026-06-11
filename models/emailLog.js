const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    subject: { type: String, default: '' },
    type: {
      type: String,
      enum: ['verification', 'password_reset', 'test', 'digest', 'other'],
      default: 'other',
    },
    status: { type: String, enum: ['sent', 'failed', 'skipped'], required: true },
    reason: { type: String, default: '' }, // skip reason or error message
    provider: { type: String, default: '' },
    smtpHost: { type: String, default: '' },
  },
  { timestamps: true }
);

emailLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
