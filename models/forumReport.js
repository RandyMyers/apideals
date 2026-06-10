const mongoose = require('mongoose');

const forumReportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: ['thread', 'post', 'profile'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    details: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminNotes: { type: String, trim: true, maxlength: 1000 },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

forumReportSchema.index({ targetType: 1, targetId: 1, status: 1 });

module.exports = mongoose.model('ForumReport', forumReportSchema);
