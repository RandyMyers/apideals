const mongoose = require('mongoose');

const forumSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumThread', required: true, index: true },
    notifyEmail: { type: Boolean, default: false },
  },
  { timestamps: true }
);

forumSubscriptionSchema.index({ userId: 1, threadId: 1 }, { unique: true });

module.exports = mongoose.model('ForumSubscription', forumSubscriptionSchema);
