const ForumThread = require('../models/forumThread');
const ForumCategory = require('../models/forumCategory');
const User = require('../models/user');
const { sendMail } = require('../utils/mailSender');

const CLIENT = (process.env.CLIENT_URL || 'https://dealcouponz.com').replace(/\/$/, '');

async function getTrendingThreads(limit = 8) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const threads = await ForumThread.find({
    moderationStatus: 'visible',
    lastPostAt: { $gte: weekAgo },
  })
    .sort({ replyCount: -1, viewCount: -1, lastPostAt: -1 })
    .limit(limit)
    .populate('categoryId', 'slug name')
    .select('title slug replyCount viewCount categoryId')
    .lean();

  return threads.map((t) => ({
    title: t.title,
    url: `${CLIENT}/forum/${t.categoryId?.slug || 'savings-tips'}/${t.slug}`,
    replies: t.replyCount,
    category: t.categoryId?.name || 'Forum',
  }));
}

function buildDigestHtml(threads) {
  const items = threads
    .map(
      (t) =>
        `<li style="margin-bottom:12px;"><a href="${t.url}">${t.title}</a><br/><span style="color:#64748b;font-size:13px;">${t.category} · ${t.replies} replies</span></li>`
    )
    .join('');
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#0f172a;">Trending forum topics this week</h2>
      <p style="color:#475569;">Here are the hottest discussions on DealCouponz:</p>
      <ul style="padding-left:18px;">${items}</ul>
      <p><a href="${CLIENT}/forum">Visit the forum →</a></p>
    </div>`;
}

async function sendWeeklyForumDigest() {
  const threads = await getTrendingThreads(8);
  if (!threads.length) {
    return { sent: 0, skipped: true, reason: 'no_threads' };
  }

  const users = await User.find({
    isActive: true,
    isSuspended: { $ne: true },
    emailNotifications: { $ne: false },
    email: { $exists: true, $ne: '' },
  })
    .select('email username')
    .limit(5000)
    .lean();

  const html = buildDigestHtml(threads);
  let sent = 0;

  for (const user of users) {
    try {
      const ok = await sendMail({
        to: user.email,
        subject: 'Trending forum topics this week | DealCouponz',
        html,
      });
      if (ok) sent += 1;
    } catch (err) {
      console.error('[forumDigest] email failed', user.email, err.message);
    }
  }

  return { sent, threads: threads.length };
}

module.exports = { getTrendingThreads, sendWeeklyForumDigest };
