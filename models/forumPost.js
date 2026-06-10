const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema(
  {
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', index: true },
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumThread', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, maxlength: 10000 },
    parentPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', index: true },
    attachedCouponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    attachedDealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
    isFirstPost: { type: Boolean, default: false },
    upvoteCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedAt: { type: Date },
    moderationStatus: { type: String, enum: ['visible', 'hidden', 'pending'], default: 'visible' },
  },
  { timestamps: true }
);

forumPostSchema.index({ threadId: 1, createdAt: 1 });
forumPostSchema.index({ content: 'text' });

module.exports = mongoose.model('ForumPost', forumPostSchema);
