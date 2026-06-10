const mongoose = require('mongoose');

const forumPostVoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', required: true, index: true },
  },
  { timestamps: true }
);

forumPostVoteSchema.index({ userId: 1, postId: 1 }, { unique: true });

module.exports = mongoose.model('ForumPostVote', forumPostVoteSchema);
