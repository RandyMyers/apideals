const ForumSettings = require('../models/forumSettings');
const { invalidateForumSettingsCache } = require('../utils/forumSettingsCache');
const ForumCategory = require('../models/forumCategory');
const ForumThread = require('../models/forumThread');
const ForumPost = require('../models/forumPost');
const ForumReport = require('../models/forumReport');
const ForumSubscription = require('../models/forumSubscription');
const { slugify } = require('../utils/forumHelpers');
const { notifyMentionedUsers } = require('../utils/forumMentionNotify');

exports.listCategoriesAdmin = async (req, res) => {
  try {
    const categories = await ForumCategory.find().sort({ order: 1, name: 1 }).lean();
    return res.json({ success: true, categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description, icon, order, metaTitle, metaDescription } = req.body || {};
    const slug = slugify(req.body.slug || name);
    if (!name?.trim() || !slug) {
      return res.status(400).json({ success: false, message: 'Name required' });
    }
    const category = await ForumCategory.create({
      name: name.trim(),
      slug,
      description: description || '',
      icon: icon || '💬',
      order: order || 0,
      metaTitle,
      metaDescription,
    });
    return res.status(201).json({ success: true, category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Slug already exists' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.slug) updates.slug = slugify(updates.slug);
    const category = await ForumCategory.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!category) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, category });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const threadCount = await ForumThread.countDocuments({ categoryId: req.params.id });
    if (threadCount > 0) {
      return res.status(400).json({ success: false, message: 'Category has threads — deactivate instead.' });
    }
    await ForumCategory.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.listThreadsAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const filter = {};
    if (req.query.moderationStatus) filter.moderationStatus = req.query.moderationStatus;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    const [threads, total] = await Promise.all([
      ForumThread.find(filter)
        .sort({ lastPostAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('categoryId', 'name slug')
        .populate('authorId', 'username email')
        .lean(),
      ForumThread.countDocuments(filter),
    ]);

    return res.json({ success: true, threads, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateThreadAdmin = async (req, res) => {
  try {
    const threadBefore = await ForumThread.findById(req.params.id).populate('categoryId', 'slug');
    if (!threadBefore) return res.status(404).json({ success: false, message: 'Not found' });

    const allowed = ['status', 'isPinned', 'isFeatured', 'moderationStatus', 'title'];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    const thread = await ForumThread.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('categoryId', 'slug name');

    const approving =
      req.body.moderationStatus === 'visible' && threadBefore.moderationStatus === 'pending';

    if (approving) {
      const op = await ForumPost.findOneAndUpdate(
        { threadId: thread._id, isFirstPost: true },
        { moderationStatus: 'visible' },
        { new: true }
      );

      await ForumCategory.updateOne(
        { _id: thread.categoryId?._id || thread.categoryId },
        { $inc: { threadCount: 1 }, $set: { lastActivityAt: new Date() } }
      );

      const authorId = thread.authorId;
      const existingSub = await ForumSubscription.findOne({ userId: authorId, threadId: thread._id });
      if (!existingSub) {
        await ForumSubscription.create({ userId: authorId, threadId: thread._id });
      }

      if (op?.content && thread.categoryId?.slug) {
        const threadUrl = `/forum/${thread.categoryId.slug}/${thread.slug}`;
        notifyMentionedUsers({
          content: op.content,
          authorId,
          thread,
          actionUrl: threadUrl,
        }).catch(() => {});
      }
    }

    return res.json({ success: true, thread, approved: approving });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.listReports = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const filter = { status: req.query.status || 'open' };

    const [reports, total] = await Promise.all([
      ForumReport.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('reporterId', 'username email')
        .lean(),
      ForumReport.countDocuments(filter),
    ]);

    return res.json({ success: true, reports, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.resolveReport = async (req, res) => {
  try {
    const { status, adminNotes } = req.body || {};
    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const report = await ForumReport.findByIdAndUpdate(
      req.params.id,
      {
        status,
        adminNotes: adminNotes || '',
        resolvedBy: req.user.id || req.user._id,
        resolvedAt: new Date(),
      },
      { new: true }
    );
    if (!report) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, report });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.listPostsAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const filter = { isDeleted: false };
    if (req.query.moderationStatus) filter.moderationStatus = req.query.moderationStatus;
    if (req.query.isFirstPost === 'false') filter.isFirstPost = { $ne: true };

    const [posts, total] = await Promise.all([
      ForumPost.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('authorId', 'username email')
        .populate({
          path: 'threadId',
          select: 'title slug categoryId',
          populate: { path: 'categoryId', select: 'name slug' },
        })
        .lean(),
      ForumPost.countDocuments(filter),
    ]);

    return res.json({ success: true, posts, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePostAdmin = async (req, res) => {
  try {
    const postBefore = await ForumPost.findById(req.params.id);
    if (!postBefore) return res.status(404).json({ success: false, message: 'Not found' });

    const updates = {};
    if (req.body.moderationStatus) updates.moderationStatus = req.body.moderationStatus;
    if (req.body.isDeleted !== undefined) {
      updates.isDeleted = !!req.body.isDeleted;
      if (updates.isDeleted) updates.content = '[removed by moderator]';
    }
    const post = await ForumPost.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!post) return res.status(404).json({ success: false, message: 'Not found' });

    const approving =
      req.body.moderationStatus === 'visible' &&
      postBefore.moderationStatus === 'pending' &&
      !postBefore.isFirstPost;

    if (approving) {
      await ForumThread.updateOne(
        { _id: post.threadId },
        {
          $inc: { replyCount: 1 },
          $set: { lastPostAt: new Date(), lastPostUserId: post.authorId },
        }
      );
    }

    return res.json({ success: true, post, approved: approving });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getForumSettings = async (req, res) => {
  try {
    const settings = await ForumSettings.getSettings();
    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateForumSettings = async (req, res) => {
  try {
    const allowed = [
      'newAccountDays',
      'autoHideReportThreshold',
      'maxThreadsPerDay',
      'maxPostsPerDay',
      'spamPendingScore',
      'spamRejectScore',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) {
        const n = parseInt(req.body[key], 10);
        if (!Number.isNaN(n)) updates[key] = n;
      }
    }
    const settings = await ForumSettings.updateSettings(updates);
    invalidateForumSettingsCache();
    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
