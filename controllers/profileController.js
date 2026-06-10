const User = require('../models/user');
const UserFollow = require('../models/userFollow');
const ProfileSlugRedirect = require('../models/profileSlugRedirect');
const CouponSubmission = require('../models/couponSubmission');
const ForumPost = require('../models/forumPost');
const notificationService = require('../services/notificationService');
const {
  normalizeSlug,
  isValidSlug,
  isValidHttpsUrl,
  sanitizeSocialLinks,
  isProfilePubliclyVisible,
  computeProfileCompletion,
  buildSafePublicProfile,
} = require('../utils/profileHelpers');

const PROFILE_COMPLETION_CREDITS = 10;

async function findUserBySlug(slug) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  return User.findOne({
    $or: [{ profileSlug: normalized }, { username: new RegExp(`^${normalized}$`, 'i') }],
    isActive: true,
    isSuspended: { $ne: true },
  }).select('-password -emailVerificationToken -passwordResetToken');
}

async function getPublicStats(userId) {
  const [approvedSubmissions, forumPosts] = await Promise.all([
    CouponSubmission.countDocuments({ userId, status: 'approved' }),
    ForumPost.countDocuments({
      authorId: userId,
      isDeleted: false,
      moderationStatus: 'visible',
    }),
  ]);
  return {
    approvedSubmissions,
    forumPosts,
    memberSince: null,
  };
}

exports.getPublicProfile = async (req, res) => {
  try {
    const normalized = normalizeSlug(req.params.slug);
    const redirect = normalized
      ? await ProfileSlugRedirect.findOne({ oldSlug: normalized }).lean()
      : null;

    if (redirect?.userId) {
      const redirectUser = await User.findById(redirect.userId);
      if (redirectUser && isProfilePubliclyVisible(redirectUser)) {
        const newSlug = redirectUser.profileSlug || redirectUser.username;
        return res.json({
          success: true,
          redirect: true,
          redirectSlug: newSlug,
          profile: null,
        });
      }
    }

    const user = await findUserBySlug(req.params.slug);
    if (!user || !isProfilePubliclyVisible(user)) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const stats = await getPublicStats(user._id);
    stats.memberSince = user.createdAt;

    return res.json({
      success: true,
      profile: buildSafePublicProfile(user, stats),
    });
  } catch (error) {
    console.error('[profileController.getPublicProfile]', error);
    return res.status(500).json({ success: false, message: 'Failed to load profile' });
  }
};

exports.getPublicActivity = async (req, res) => {
  try {
    const user = await findUserBySlug(req.params.slug);
    if (!user || !isProfilePubliclyVisible(user)) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    const pp = user.publicProfile || {};
    if (pp.showActivity === false) {
      return res.json({ success: true, activity: [], total: 0 });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(20, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const fetchCount = skip + limit;
    const [subs, posts, subTotal, postTotal] = await Promise.all([
      CouponSubmission.find({ userId: user._id, status: 'approved' })
        .sort({ reviewedAt: -1, createdAt: -1 })
        .limit(fetchCount)
        .populate('storeId', 'name slug logo')
        .select('title code discountType discountValue reviewedAt createdAt storeId')
        .lean(),
      ForumPost.find({
        authorId: user._id,
        isDeleted: false,
        moderationStatus: 'visible',
      })
        .sort({ createdAt: -1 })
        .limit(fetchCount)
        .populate({
          path: 'threadId',
          select: 'title slug',
          populate: { path: 'categoryId', select: 'slug name' },
        })
        .select('content createdAt threadId')
        .lean(),
      CouponSubmission.countDocuments({ userId: user._id, status: 'approved' }),
      ForumPost.countDocuments({
        authorId: user._id,
        isDeleted: false,
        moderationStatus: 'visible',
      }),
    ]);

    const merged = [
      ...subs.map((sub) => ({
        type: 'coupon_submission',
        id: sub._id,
        title: sub.title,
        code: sub.code,
        discountType: sub.discountType,
        discountValue: sub.discountValue,
        store: sub.storeId
          ? { name: sub.storeId.name, slug: sub.storeId.slug, logo: sub.storeId.logo }
          : null,
        at: sub.reviewedAt || sub.createdAt,
      })),
      ...posts
        .filter((p) => p.threadId)
        .map((p) => ({
          type: 'forum_post',
          id: p._id,
          title: p.threadId.title,
          excerpt: String(p.content || '').slice(0, 160),
          threadSlug: p.threadId.slug,
          categorySlug: p.threadId.categoryId?.slug || 'general',
          categoryName: p.threadId.categoryId?.name,
          at: p.createdAt,
        })),
    ]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(skip, skip + limit);

    const total = subTotal + postTotal;

    return res.json({
      success: true,
      activity: merged,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[profileController.getPublicActivity]', error);
    return res.status(500).json({ success: false, message: 'Failed to load activity' });
  }
};

exports.getMySettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const completion = computeProfileCompletion(user);
    return res.json({
      success: true,
      profile: buildSafePublicProfile(user, { approvedSubmissions: 0 }),
      settings: {
        bio: user.bio || '',
        profileSlug: user.profileSlug || user.username,
        publicProfile: user.publicProfile || {},
        isEmailVerified: user.isEmailVerified,
      },
      completion,
    });
  } catch (error) {
    console.error('[profileController.getMySettings]', error);
    return res.status(500).json({ success: false, message: 'Failed to load profile settings' });
  }
};

exports.getCompletion = async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id).select('bio profilePicture publicProfile isEmailVerified');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, completion: computeProfileCompletion(user) });
  } catch (error) {
    console.error('[profileController.getCompletion]', error);
    return res.status(500).json({ success: false, message: 'Failed to load completion' });
  }
};

exports.checkSlug = async (req, res) => {
  try {
    const slug = normalizeSlug(req.params.slug);
    if (!isValidSlug(slug)) {
      return res.json({ success: true, available: false, reason: 'invalid' });
    }
    const userId = req.user.id || req.user._id;
    const existing = await User.findOne({ profileSlug: slug, _id: { $ne: userId } });
    return res.json({ success: true, available: !existing, slug });
  } catch (error) {
    console.error('[profileController.checkSlug]', error);
    return res.status(500).json({ success: false, message: 'Failed to check slug' });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const {
      bio,
      profileSlug,
      publicProfile,
      profilePicture,
      firstName,
      lastName,
    } = req.body || {};

    if (bio !== undefined) {
      user.bio = String(bio).slice(0, 500);
    }
    if (firstName !== undefined) user.firstName = String(firstName).trim().slice(0, 60);
    if (lastName !== undefined) user.lastName = String(lastName).trim().slice(0, 60);
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    if (profileSlug !== undefined) {
      const slug = normalizeSlug(profileSlug);
      if (!isValidSlug(slug)) {
        return res.status(400).json({ success: false, message: 'Invalid profile URL. Use 3–30 letters, numbers, or hyphens.' });
      }
      const taken = await User.findOne({ profileSlug: slug, _id: { $ne: userId } });
      if (taken) {
        return res.status(409).json({ success: false, message: 'That profile URL is already taken.' });
      }
      const previousSlug = user.profileSlug || user.username;
      if (previousSlug && normalizeSlug(previousSlug) !== slug) {
        await ProfileSlugRedirect.findOneAndUpdate(
          { oldSlug: normalizeSlug(previousSlug) },
          { oldSlug: normalizeSlug(previousSlug), userId, newSlug: slug },
          { upsert: true, new: true }
        );
      }
      user.profileSlug = slug;
    }

    if (publicProfile && typeof publicProfile === 'object') {
      const pp = user.publicProfile || {};
      const incoming = publicProfile;
      const wasEnabled = pp.isEnabled !== false;

      if (incoming.isEnabled !== undefined) pp.isEnabled = !!incoming.isEnabled;
      if (incoming.visibility !== undefined) {
        const allowed = ['public', 'unlisted', 'private'];
        if (allowed.includes(incoming.visibility)) pp.visibility = incoming.visibility;
      }
      if (incoming.displayName !== undefined) pp.displayName = String(incoming.displayName).trim().slice(0, 60);
      if (incoming.headline !== undefined) pp.headline = String(incoming.headline).trim().slice(0, 120);
      if (incoming.location !== undefined) pp.location = String(incoming.location).trim().slice(0, 80);
      if (incoming.showStats !== undefined) pp.showStats = !!incoming.showStats;
      if (incoming.showActivity !== undefined) pp.showActivity = !!incoming.showActivity;

      if (incoming.websiteUrl !== undefined) {
        const url = String(incoming.websiteUrl).trim();
        if (!url) {
          pp.websiteUrl = '';
        } else if (!user.isEmailVerified) {
          return res.status(400).json({
            success: false,
            message: 'Verify your email before adding a website link.',
          });
        } else if (!isValidHttpsUrl(url)) {
          return res.status(400).json({ success: false, message: 'Website must be a valid https:// URL.' });
        } else {
          pp.websiteUrl = url;
        }
      }

      if (incoming.socialLinks !== undefined) {
        if (!user.isEmailVerified) {
          return res.status(400).json({
            success: false,
            message: 'Verify your email before adding social links.',
          });
        }
        pp.socialLinks = sanitizeSocialLinks(incoming.socialLinks);
      }

      user.publicProfile = pp;

      if (!wasEnabled && pp.isEnabled !== false && pp.visibility !== 'private') {
        const slug = user.profileSlug || user.username;
        notificationService
          .createNotification(userId, 'profile_live', { profileSlug: slug }, { actionUrl: '/profile?tab=public' })
          .catch(() => {});
      }
    }

    const completion = computeProfileCompletion(user);
    let creditsAwarded = 0;
    if (completion.isComplete && !user.publicProfile?.completedAt) {
      user.publicProfile = user.publicProfile || {};
      user.publicProfile.completedAt = new Date();
      if (!user.publicProfile.completionRewardGranted) {
        user.credits = (user.credits || 0) + PROFILE_COMPLETION_CREDITS;
        user.publicProfile.completionRewardGranted = true;
        creditsAwarded = PROFILE_COMPLETION_CREDITS;
      }
    }

    user.updatedAt = new Date();
    await user.save();

    const stats = await getPublicStats(user._id);
    return res.json({
      success: true,
      message: 'Profile updated',
      profile: buildSafePublicProfile(user, stats),
      completion: computeProfileCompletion(user),
      creditsAwarded,
    });
  } catch (error) {
    console.error('[profileController.updateMyProfile]', error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Profile URL already taken.' });
    }
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

exports.followUser = async (req, res) => {
  try {
    const followerId = req.user.id || req.user._id;
    const target = await findUserBySlug(req.params.slug);
    if (!target || !isProfilePubliclyVisible(target)) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    if (String(target._id) === String(followerId)) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }
    await UserFollow.findOneAndUpdate(
      { followerId, followingId: target._id },
      { followerId, followingId: target._id },
      { upsert: true, new: true }
    );
    return res.json({ success: true, following: true });
  } catch (error) {
    console.error('[profileController.followUser]', error);
    return res.status(500).json({ success: false, message: 'Failed to follow' });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const followerId = req.user.id || req.user._id;
    const target = await findUserBySlug(req.params.slug);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    await UserFollow.deleteOne({ followerId, followingId: target._id });
    return res.json({ success: true, following: false });
  } catch (error) {
    console.error('[profileController.unfollowUser]', error);
    return res.status(500).json({ success: false, message: 'Failed to unfollow' });
  }
};

exports.getFollowStatus = async (req, res) => {
  try {
    const viewerId = req.user?.id || req.user?._id;
    const target = await findUserBySlug(req.params.slug);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    let following = false;
    if (viewerId) {
      following = !!(await UserFollow.exists({ followerId: viewerId, followingId: target._id }));
    }
    const followerCount = await UserFollow.countDocuments({ followingId: target._id });
    const followingCount = await UserFollow.countDocuments({ followerId: target._id });
    return res.json({ success: true, following, followerCount, followingCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyFollowingFeed = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const follows = await UserFollow.find({ followerId: userId }).select('followingId').lean();
    const ids = follows.map((f) => f.followingId);
    if (!ids.length) {
      return res.json({ success: true, activity: [] });
    }
    const posts = await ForumPost.find({
      authorId: { $in: ids },
      isDeleted: false,
      moderationStatus: 'visible',
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('authorId', 'username profileSlug profilePicture publicProfile')
      .populate({ path: 'threadId', select: 'title slug', populate: { path: 'categoryId', select: 'slug' } })
      .lean();
    return res.json({ success: true, activity: posts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.listPublicProfilesAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();

    const filter = {
      isActive: true,
      'publicProfile.isEnabled': { $ne: false },
    };
    if (req.query.visibility && ['public', 'unlisted', 'private'].includes(req.query.visibility)) {
      filter['publicProfile.visibility'] = req.query.visibility;
    }
    if (search) {
      filter.$or = [
        { username: new RegExp(search, 'i') },
        { profileSlug: new RegExp(search, 'i') },
        { 'publicProfile.displayName': new RegExp(search, 'i') },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('username profileSlug profilePicture bio publicProfile isSuspended createdAt')
        .sort({ 'publicProfile.completedAt': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const profiles = users.map((u) => ({
      _id: u._id,
      username: u.username,
      profileSlug: u.profileSlug || u.username,
      displayName: u.publicProfile?.displayName || u.username,
      visibility: u.publicProfile?.visibility || 'public',
      isEnabled: u.publicProfile?.isEnabled !== false,
      trustedContributor: !!u.publicProfile?.trustedContributor,
      completedAt: u.publicProfile?.completedAt,
      isSuspended: !!u.isSuspended,
      createdAt: u.createdAt,
    }));

    return res.json({ success: true, profiles, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    console.error('[profileController.listPublicProfilesAdmin]', error);
    return res.status(500).json({ success: false, message: 'Failed to load profiles' });
  }
};

/** Admin: disable profile, grant trusted contributor */
exports.adminUpdateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { publicProfile, profileSlug, isSuspended, suspensionReason } = req.body || {};

    if (publicProfile && typeof publicProfile === 'object') {
      const pp = user.publicProfile || {};
      if (publicProfile.isEnabled !== undefined) pp.isEnabled = !!publicProfile.isEnabled;
      if (publicProfile.visibility !== undefined && ['public', 'unlisted', 'private'].includes(publicProfile.visibility)) {
        pp.visibility = publicProfile.visibility;
      }
      if (publicProfile.trustedContributor !== undefined) pp.trustedContributor = !!publicProfile.trustedContributor;
      user.publicProfile = pp;
    }

    if (profileSlug !== undefined) {
      const slug = normalizeSlug(profileSlug);
      if (slug && isValidSlug(slug)) {
        const taken = await User.findOne({ profileSlug: slug, _id: { $ne: user._id } });
        if (taken) {
          return res.status(409).json({ success: false, message: 'Profile URL taken' });
        }
        user.profileSlug = slug;
      }
    }

    if (isSuspended !== undefined) {
      user.isSuspended = !!isSuspended;
      if (suspensionReason !== undefined) user.suspensionReason = suspensionReason;
    }

    user.updatedAt = new Date();
    await user.save();

    return res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        profileSlug: user.profileSlug,
        publicProfile: user.publicProfile,
        isSuspended: user.isSuspended,
      },
    });
  } catch (error) {
    console.error('[profileController.adminUpdateProfile]', error);
    return res.status(500).json({ success: false, message: 'Failed to update user profile' });
  }
};
