const ForumCategory = require('../models/forumCategory');
const ForumThread = require('../models/forumThread');
const ForumPost = require('../models/forumPost');
const CouponSubmission = require('../models/couponSubmission');
const ForumSubscription = require('../models/forumSubscription');
const ForumPostVote = require('../models/forumPostVote');
const ForumReport = require('../models/forumReport');
const User = require('../models/user');
const notificationService = require('../services/notificationService');
const { notifyMentionedUsers } = require('../utils/forumMentionNotify');
const {
  uniqueThreadSlug,
  sanitizeForumContent,
  AUTHOR_SELECT,
  authorDisplay,
  assertCanPost,
  isNewAccount,
  AUTO_HIDE_REPORT_THRESHOLD,
} = require('../utils/forumHelpers');
const { evaluateForumContent } = require('../utils/forumSpamService');
const { searchThreads, searchPosts } = require('../utils/forumSearch');

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_THREADS_PER_DAY = 5;
const MAX_POSTS_PER_DAY = 30;

const visibleThread = { moderationStatus: 'visible' };
const visiblePost = { isDeleted: false, moderationStatus: 'visible' };

async function countToday(model, userId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return model.countDocuments({ authorId: userId, createdAt: { $gte: start } });
}

async function notifyThreadParticipants(thread, post, authorId) {
  const clientBase = process.env.CLIENT_URL || 'https://dealcouponz.com';
  const threadUrl = `/forum/${thread.categoryId?.slug || 'general'}/${thread.slug}`;
  const author = await User.findById(authorId).select('username');

  const recipientIds = new Set();
  if (thread.authorId && String(thread.authorId) !== String(authorId)) {
    recipientIds.add(String(thread.authorId));
  }

  const subs = await ForumSubscription.find({ threadId: thread._id }).select('userId');
  subs.forEach((s) => {
    if (String(s.userId) !== String(authorId)) recipientIds.add(String(s.userId));
  });

  const snippet = sanitizeForumContent(post.content).slice(0, 120);

  await Promise.all(
    [...recipientIds].map((userId) =>
      notificationService
        .sendNotification(userId, {
          title: `New reply: ${thread.title}`,
          message: `${author?.username || 'Someone'} replied: ${snippet}${snippet.length >= 120 ? '…' : ''}`,
          category: 'forum',
          icon: 'FiMessageCircle',
          actionUrl: threadUrl,
          metadata: { threadId: thread._id, postId: post._id },
        })
        .catch((err) => console.error('[forum] notification failed', err))
    )
  );
}

exports.listCategories = async (req, res) => {
  try {
    const categories = await ForumCategory.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean();
    return res.json({ success: true, categories });
  } catch (error) {
    console.error('[forum.listCategories]', error);
    return res.status(500).json({ success: false, message: 'Failed to load categories' });
  }
};

exports.listRecentThreads = async (req, res) => {
  try {
    const limit = Math.min(20, parseInt(req.query.limit, 10) || 8);
    const threads = await ForumThread.find(visibleThread)
      .sort({ isPinned: -1, lastPostAt: -1 })
      .limit(limit)
      .populate('categoryId', 'name slug')
      .populate('authorId', AUTHOR_SELECT)
      .populate('lastPostUserId', AUTHOR_SELECT)
      .lean();

    return res.json({
      success: true,
      threads: threads.map((t) => ({
        ...t,
        author: authorDisplay(t.authorId),
        category: t.categoryId,
        lastPostUser: authorDisplay(t.lastPostUserId),
      })),
    });
  } catch (error) {
    console.error('[forum.listRecentThreads]', error);
    return res.status(500).json({ success: false, message: 'Failed to load recent threads' });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const category = await ForumCategory.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, parseInt(req.query.limit, 10) || 20);
    const sort = req.query.sort === 'new' ? { createdAt: -1 } : { isPinned: -1, lastPostAt: -1 };

    const filter = { categoryId: category._id, ...visibleThread };
    const [threads, total] = await Promise.all([
      ForumThread.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('authorId', AUTHOR_SELECT)
        .populate('lastPostUserId', AUTHOR_SELECT)
        .lean(),
      ForumThread.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      category,
      threads: threads.map((t) => ({
        ...t,
        author: authorDisplay(t.authorId),
        lastPostUser: authorDisplay(t.lastPostUserId),
      })),
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('[forum.getCategory]', error);
    return res.status(500).json({ success: false, message: 'Failed to load category' });
  }
};

exports.getThread = async (req, res) => {
  try {
    const thread = await ForumThread.findOne({ slug: req.params.slug, ...visibleThread })
      .populate('categoryId', 'name slug')
      .populate('authorId', AUTHOR_SELECT)
      .populate('attachedDealId', 'title slug discountType discountValue')
      .populate('attachedCouponId', 'title slug code discountType discountValue')
      .lean();

    if (!thread) {
      return res.status(404).json({ success: false, message: 'Thread not found' });
    }

    await ForumThread.updateOne({ _id: thread._id }, { $inc: { viewCount: 1 } });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);

    const [posts, total] = await Promise.all([
      ForumPost.find({ threadId: thread._id, ...visiblePost })
        .sort({ createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('authorId', AUTHOR_SELECT)
        .populate('attachedDealId', 'title slug')
        .populate('attachedCouponId', 'title slug code')
        .lean(),
      ForumPost.countDocuments({ threadId: thread._id, ...visiblePost }),
    ]);

    const userId = req.user?.id || req.user?._id;
    let votedPostIds = new Set();
    if (userId && posts.length) {
      const votes = await ForumPostVote.find({
        userId,
        postId: { $in: posts.map((p) => p._id) },
      }).select('postId');
      votedPostIds = new Set(votes.map((v) => String(v.postId)));
    }

    return res.json({
      success: true,
      thread: {
        ...thread,
        author: authorDisplay(thread.authorId),
        category: thread.categoryId,
      },
      posts: posts.map((p) => ({
        ...p,
        author: authorDisplay(p.authorId),
        upvotedByMe: votedPostIds.has(String(p._id)),
      })),
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('[forum.getThread]', error);
    return res.status(500).json({ success: false, message: 'Failed to load thread' });
  }
};

exports.createThread = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);
    const gate = assertCanPost(user);
    if (!gate.ok) return res.status(gate.status).json({ success: false, message: gate.message });

    const threadsToday = await countToday(ForumThread, userId);
    if (threadsToday >= MAX_THREADS_PER_DAY) {
      return res.status(429).json({ success: false, message: 'Daily thread limit reached. Try again tomorrow.' });
    }

    if (req.body?._hp) {
      return res.status(400).json({ success: false, message: 'Request blocked.' });
    }

    const { categoryId, categorySlug, title, content, tags, storeSlug, attachedCouponId, attachedDealId } = req.body || {};
    const body = sanitizeForumContent(content);
    const threadTitle = String(title || '').trim().slice(0, 200);

    if (!threadTitle || body.length < 10) {
      return res.status(400).json({ success: false, message: 'Title and message (10+ chars) are required.' });
    }

    const spam = await evaluateForumContent(body, { user, isNewAccount: isNewAccount(user) });
    if (!spam.ok) return res.status(400).json({ success: false, message: spam.message });

    const tagSet = new Set();
    if (Array.isArray(tags)) {
      tags.forEach((t) => {
        const v = String(t).trim().toLowerCase().slice(0, 40);
        if (v) tagSet.add(v);
      });
    }
    if (storeSlug) {
      const s = String(storeSlug).trim().toLowerCase().slice(0, 40);
      if (s) tagSet.add(s);
    }
    const tagList = [...tagSet].slice(0, 5);

    let category;
    if (categoryId) {
      category = await ForumCategory.findOne({ _id: categoryId, isActive: true });
    } else if (categorySlug) {
      category = await ForumCategory.findOne({ slug: categorySlug, isActive: true });
    }
    if (!category) {
      return res.status(400).json({ success: false, message: 'Valid category required.' });
    }

    const slug = await uniqueThreadSlug(ForumThread, threadTitle);
    const modStatus = spam.action === 'pending' ? 'pending' : 'visible';
    const thread = await ForumThread.create({
      categoryId: category._id,
      authorId: userId,
      title: threadTitle,
      slug,
      tags: tagList,
      attachedCouponId: attachedCouponId || undefined,
      attachedDealId: attachedDealId || undefined,
      replyCount: 0,
      lastPostAt: new Date(),
      lastPostUserId: userId,
      moderationStatus: modStatus,
    });

    const post = await ForumPost.create({
      threadId: thread._id,
      authorId: userId,
      content: body,
      isFirstPost: true,
      moderationStatus: modStatus,
    });

    if (modStatus === 'visible') {
      await ForumCategory.updateOne(
        { _id: category._id },
        { $inc: { threadCount: 1 }, $set: { lastActivityAt: new Date() } }
      );
      await ForumSubscription.create({ userId, threadId: thread._id });
      const threadUrl = `/forum/${category.slug}/${thread.slug}`;
      notifyMentionedUsers({ content: body, authorId: userId, thread, actionUrl: threadUrl }).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      pendingModeration: modStatus === 'pending',
      message: spam.message || undefined,
      thread: { ...thread.toObject(), categorySlug: category.slug },
      post,
    });
  } catch (error) {
    console.error('[forum.createThread]', error);
    return res.status(500).json({ success: false, message: 'Failed to create thread' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);
    const gate = assertCanPost(user);
    if (!gate.ok) return res.status(gate.status).json({ success: false, message: gate.message });

    const postsToday = await countToday(ForumPost, userId);
    if (postsToday >= MAX_POSTS_PER_DAY) {
      return res.status(429).json({ success: false, message: 'Daily reply limit reached.' });
    }

    const thread = await ForumThread.findOne({
      _id: req.params.threadId,
      ...visibleThread,
      status: { $ne: 'locked' },
    }).populate('categoryId', 'slug');

    if (!thread) {
      return res.status(404).json({ success: false, message: 'Thread not found or locked.' });
    }

    const body = sanitizeForumContent(req.body?.content);
    if (body.length < 2) {
      return res.status(400).json({ success: false, message: 'Reply is too short.' });
    }

    const spam = await evaluateForumContent(body, { user, isNewAccount: isNewAccount(user) });
    if (!spam.ok) return res.status(400).json({ success: false, message: spam.message });

    let parentPostId = req.body?.parentPostId || null;
    if (parentPostId) {
      const parent = await ForumPost.findOne({ _id: parentPostId, threadId: thread._id, isDeleted: false });
      if (!parent) parentPostId = null;
    }

    const modStatus = spam.action === 'pending' ? 'pending' : 'visible';
    const post = await ForumPost.create({
      threadId: thread._id,
      authorId: userId,
      content: body,
      parentPostId: parentPostId || undefined,
      attachedCouponId: req.body?.attachedCouponId || undefined,
      attachedDealId: req.body?.attachedDealId || undefined,
      moderationStatus: modStatus,
    });

    if (modStatus === 'pending') {
      return res.status(201).json({
        success: true,
        pendingModeration: true,
        message: spam.message || 'Your reply is awaiting moderation.',
        post,
      });
    }

    await ForumThread.updateOne(
      { _id: thread._id },
      {
        $inc: { replyCount: 1 },
        $set: { lastPostAt: new Date(), lastPostUserId: userId },
      }
    );

    await ForumCategory.updateOne({ _id: thread.categoryId._id || thread.categoryId }, {
      $set: { lastActivityAt: new Date() },
    });

    notifyThreadParticipants(thread, post, userId).catch(() => {});

    const catSlug = thread.categoryId?.slug || 'general';
    notifyMentionedUsers({
      content: body,
      authorId: userId,
      thread,
      actionUrl: `/forum/${catSlug}/${thread.slug}`,
    }).catch(() => {});

    const populated = await ForumPost.findById(post._id).populate('authorId', AUTHOR_SELECT).lean();

    return res.status(201).json({
      success: true,
      post: { ...populated, author: authorDisplay(populated.authorId) },
    });
  } catch (error) {
    console.error('[forum.createPost]', error);
    return res.status(500).json({ success: false, message: 'Failed to post reply' });
  }
};

exports.editPost = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const post = await ForumPost.findById(req.params.postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    if (String(post.authorId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    if (Date.now() - new Date(post.createdAt).getTime() > EDIT_WINDOW_MS) {
      return res.status(403).json({ success: false, message: 'Edit window expired (15 minutes).' });
    }

    const body = sanitizeForumContent(req.body?.content);
    if (body.length < 2) {
      return res.status(400).json({ success: false, message: 'Content too short.' });
    }

    post.content = body;
    post.editedAt = new Date();
    await post.save();

    return res.json({ success: true, post });
  } catch (error) {
    console.error('[forum.editPost]', error);
    return res.status(500).json({ success: false, message: 'Failed to edit post' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const isAdmin = ['superAdmin', 'contentEditor', 'customerSupport'].includes(req.user.userType);
    const post = await ForumPost.findById(req.params.postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    if (!isAdmin && String(post.authorId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    post.isDeleted = true;
    post.deletedAt = new Date();
    post.deletedBy = userId;
    post.content = '[removed]';
    await post.save();

    return res.json({ success: true });
  } catch (error) {
    console.error('[forum.deletePost]', error);
    return res.status(500).json({ success: false, message: 'Failed to delete post' });
  }
};

exports.votePost = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const post = await ForumPost.findOne({ _id: req.params.postId, ...visiblePost });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const existing = await ForumPostVote.findOne({ userId, postId: post._id });
    if (existing) {
      await existing.deleteOne();
      await ForumPost.updateOne({ _id: post._id }, { $inc: { upvoteCount: -1 } });
      const updated = await ForumPost.findById(post._id).select('upvoteCount');
      return res.json({ success: true, upvoted: false, upvoteCount: Math.max(0, updated.upvoteCount) });
    }

    await ForumPostVote.create({ userId, postId: post._id });
    await ForumPost.updateOne({ _id: post._id }, { $inc: { upvoteCount: 1 } });
    const updated = await ForumPost.findById(post._id).select('upvoteCount');
    return res.json({ success: true, upvoted: true, upvoteCount: updated.upvoteCount });
  } catch (error) {
    console.error('[forum.votePost]', error);
    return res.status(500).json({ success: false, message: 'Failed to vote' });
  }
};

exports.reportContent = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { targetType, targetId, reason, details } = req.body || {};
    const allowed = ['thread', 'post', 'profile'];
    if (!allowed.includes(targetType) || !targetId || !reason?.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid report' });
    }

    await ForumReport.create({
      reporterId: userId,
      targetType,
      targetId,
      reason: String(reason).trim().slice(0, 500),
      details: details ? String(details).trim().slice(0, 1000) : '',
    });

    if (targetType === 'post') {
      const post = await ForumPost.findByIdAndUpdate(
        targetId,
        { $inc: { reportCount: 1 } },
        { new: true }
      );
      if (post && post.reportCount >= AUTO_HIDE_REPORT_THRESHOLD) {
        post.moderationStatus = 'hidden';
        await post.save();
      }
    } else if (targetType === 'thread') {
      const openReports = await ForumReport.countDocuments({
        targetType: 'thread',
        targetId,
        status: 'open',
      });
      if (openReports >= AUTO_HIDE_REPORT_THRESHOLD) {
        await ForumThread.updateOne({ _id: targetId }, { moderationStatus: 'hidden' });
      }
    }

    return res.status(201).json({ success: true, message: 'Report submitted' });
  } catch (error) {
    console.error('[forum.reportContent]', error);
    return res.status(500).json({ success: false, message: 'Failed to submit report' });
  }
};

exports.subscribeThread = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const thread = await ForumThread.findOne({ _id: req.params.threadId, ...visibleThread });
    if (!thread) {
      return res.status(404).json({ success: false, message: 'Thread not found' });
    }

    await ForumSubscription.findOneAndUpdate(
      { userId, threadId: thread._id },
      { userId, threadId: thread._id, notifyEmail: !!req.body?.notifyEmail },
      { upsert: true, new: true }
    );

    return res.json({ success: true, subscribed: true });
  } catch (error) {
    console.error('[forum.subscribeThread]', error);
    return res.status(500).json({ success: false, message: 'Failed to subscribe' });
  }
};

exports.listPopularTags = async (req, res) => {
  try {
    const limit = Math.min(30, parseInt(req.query.limit, 10) || 15);
    const tags = await ForumThread.aggregate([
      { $match: { moderationStatus: 'visible', tags: { $exists: true, $not: { $size: 0 } } } },
      { $unwind: '$tags' },
      { $group: { _id: { $toLower: '$tags' }, count: { $sum: 1 }, tag: { $first: '$tags' } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, tag: 1, count: 1 } },
    ]);
    return res.json({ success: true, tags });
  } catch (error) {
    console.error('[forum.listPopularTags]', error);
    return res.status(500).json({ success: false, message: 'Failed to load tags' });
  }
};

async function mapThreadsResponse(threads) {
  return threads.map((t) => ({
    ...t,
    author: authorDisplay(t.authorId),
    lastPostUser: authorDisplay(t.lastPostUserId),
    category: t.categoryId,
  }));
}

exports.getThreadsByTag = async (req, res) => {
  try {
    const tag = String(req.params.tag || '').trim().toLowerCase();
    if (!tag) {
      return res.status(400).json({ success: false, message: 'Tag required' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, parseInt(req.query.limit, 10) || 20);
    const filter = { ...visibleThread, tags: tag };

    const [threads, total] = await Promise.all([
      ForumThread.find(filter)
        .sort({ isPinned: -1, lastPostAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('authorId', AUTHOR_SELECT)
        .populate('lastPostUserId', AUTHOR_SELECT)
        .populate('categoryId', 'name slug')
        .lean(),
      ForumThread.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      tag,
      threads: await mapThreadsResponse(threads),
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('[forum.getThreadsByTag]', error);
    return res.status(500).json({ success: false, message: 'Failed to load tag' });
  }
};

exports.getStoreDiscussions = async (req, res) => {
  try {
    const storeSlug = String(req.params.storeSlug || '').trim().toLowerCase();
    if (!storeSlug) {
      return res.status(400).json({ success: false, message: 'Store slug required' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, parseInt(req.query.limit, 10) || 10);
    const filter = { ...visibleThread, tags: storeSlug };

    const [threads, total] = await Promise.all([
      ForumThread.find(filter)
        .sort({ lastPostAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('authorId', AUTHOR_SELECT)
        .populate('categoryId', 'name slug')
        .lean(),
      ForumThread.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      storeSlug,
      threads: await mapThreadsResponse(threads),
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('[forum.getStoreDiscussions]', error);
    return res.status(500).json({ success: false, message: 'Failed to load store discussions' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(25, parseInt(req.query.limit, 10) || 10);
    const days = parseInt(req.query.days, 10) || 0;
    const since = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

    const postMatch = { isDeleted: false, moderationStatus: 'visible' };
    const subMatch = { status: 'approved' };
    if (since) {
      postMatch.createdAt = { $gte: since };
      subMatch.$or = [{ reviewedAt: { $gte: since } }, { reviewedAt: null, createdAt: { $gte: since } }];
    }

    const [forumScores, subScores] = await Promise.all([
      ForumPost.aggregate([
        { $match: postMatch },
        {
          $group: {
            _id: '$authorId',
            forumPosts: { $sum: 1 },
            upvotes: { $sum: '$upvoteCount' },
          },
        },
      ]),
      CouponSubmission.aggregate([
        { $match: subMatch },
        { $group: { _id: '$userId', submissions: { $sum: 1 } } },
      ]),
    ]);

    const scoreMap = new Map();
    forumScores.forEach((row) => {
      scoreMap.set(String(row._id), {
        userId: row._id,
        forumPosts: row.forumPosts,
        upvotes: row.upvotes || 0,
        submissions: 0,
        score: row.forumPosts * 2 + (row.upvotes || 0),
      });
    });
    subScores.forEach((row) => {
      const key = String(row._id);
      const existing = scoreMap.get(key) || {
        userId: row._id,
        forumPosts: 0,
        upvotes: 0,
        submissions: 0,
        score: 0,
      };
      existing.submissions = row.submissions;
      existing.score += row.submissions * 3;
      scoreMap.set(key, existing);
    });

    const ranked = [...scoreMap.values()]
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const userIds = ranked.map((r) => r.userId);
    const users = await User.find({
      _id: { $in: userIds },
      isActive: true,
      isSuspended: { $ne: true },
      'publicProfile.isEnabled': { $ne: false },
      'publicProfile.visibility': { $ne: 'private' },
    })
      .select('username profileSlug profilePicture publicProfile')
      .lean();

    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const contributors = ranked
      .map((r) => {
        const user = userMap.get(String(r.userId));
        if (!user) return null;
        return {
          ...r,
          profileSlug: user.profileSlug || user.username,
          username: user.username,
          displayName: user.publicProfile?.displayName || user.username,
          profilePicture: user.profilePicture,
          trustedContributor: !!user.publicProfile?.trustedContributor,
        };
      })
      .filter(Boolean);

    return res.json({ success: true, contributors, days: days || null });
  } catch (error) {
    console.error('[forum.getLeaderboard]', error);
    return res.status(500).json({ success: false, message: 'Failed to load leaderboard' });
  }
};

exports.searchForum = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      return res.status(400).json({ success: false, message: 'Query too short' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, parseInt(req.query.limit, 10) || 20);

    const [{ threads, total, mode: threadMode }, { posts: postHits, mode: postMode }] =
      await Promise.all([
        searchThreads({
          ForumThread,
          visibleFilter: visibleThread,
          q,
          page,
          limit,
        }),
        searchPosts({ ForumPost, q, limit: 10 }),
      ]);

    return res.json({
      success: true,
      query: q,
      searchMode: threadMode || postMode || 'regex',
      threads: threads.map((t) => ({
        ...t,
        author: authorDisplay(t.authorId),
        category: t.categoryId,
      })),
      postHits: postHits.map((p) => ({
        ...p,
        author: authorDisplay(p.authorId),
        thread: p.threadId,
      })),
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('[forum.searchForum]', error);
    return res.status(500).json({ success: false, message: 'Search failed' });
  }
};

exports.getCategoryRss = async (req, res) => {
  try {
    const category = await ForumCategory.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!category) {
      return res.status(404).send('Category not found');
    }

    const threads = await ForumThread.find({ categoryId: category._id, ...visibleThread })
      .sort({ lastPostAt: -1 })
      .limit(25)
      .lean();

    const clientBase = (process.env.CLIENT_URL || 'https://dealcouponz.com').replace(/\/$/, '');
    const channelUrl = `${clientBase}/forum/${category.slug}`;
    const esc = (s) =>
      String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const items = threads
      .map(
        (t) => `
    <item>
      <title>${esc(t.title)}</title>
      <link>${clientBase}/forum/${category.slug}/${t.slug}</link>
      <guid isPermaLink="true">${clientBase}/forum/${category.slug}/${t.slug}</guid>
      <pubDate>${new Date(t.lastPostAt || t.createdAt).toUTCString()}</pubDate>
    </item>`
      )
      .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(category.name)} | DealCouponz Forum</title>
    <link>${channelUrl}</link>
    <description>${esc(category.description || category.name)}</description>${items}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    return res.send(xml);
  } catch (error) {
    console.error('[forum.getCategoryRss]', error);
    return res.status(500).send('Failed to generate feed');
  }
};
