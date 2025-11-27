const mongoose = require('mongoose');

const reportIssueSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: ['coupon', 'deal', 'store', 'user', 'content', 'other'],
      required: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    relatedType: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    evidence: {
      type: [String], // URLs to screenshots or evidence
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'under-review', 'resolved', 'rejected', 'closed'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReportIssue', reportIssueSchema);

