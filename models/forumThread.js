const mongoose = require('mongoose');

const forumThreadSchema = new mongoose.Schema(
  {
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumCategory', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: ['open', 'locked', 'resolved'], default: 'open' },
    isPinned: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    tags: [{ type: String, trim: true, maxlength: 40 }],
    attachedCouponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    attachedDealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
    viewCount: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    lastPostAt: { type: Date, default: Date.now },
    lastPostUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderationStatus: { type: String, enum: ['visible', 'hidden', 'pending'], default: 'visible' },
    metaTitle: { type: String, trim: true, maxlength: 120 },
    metaDescription: { type: String, trim: true, maxlength: 300 },
    languageTranslations: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

forumThreadSchema.index({ categoryId: 1, lastPostAt: -1 });
forumThreadSchema.index({ moderationStatus: 1, isPinned: -1, lastPostAt: -1 });
forumThreadSchema.index({ title: 'text', tags: 'text' });

module.exports = mongoose.model('ForumThread', forumThreadSchema);
