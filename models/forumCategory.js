const mongoose = require('mongoose');

const forumCategorySchema = new mongoose.Schema(
  {
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 500 },
    icon: { type: String, trim: true, default: '💬' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    threadCount: { type: Number, default: 0 },
    lastActivityAt: { type: Date },
    metaTitle: { type: String, trim: true, maxlength: 120 },
    metaDescription: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

forumCategorySchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('ForumCategory', forumCategorySchema);
