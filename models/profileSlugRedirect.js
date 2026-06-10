const mongoose = require('mongoose');

const ProfileSlugRedirectSchema = new mongoose.Schema(
  {
    oldSlug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    newSlug: { type: String, required: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

ProfileSlugRedirectSchema.index({ userId: 1 });

module.exports = mongoose.model('ProfileSlugRedirect', ProfileSlugRedirectSchema);
