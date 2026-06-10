const User = require('../models/user');
const notificationService = require('../services/notificationService');
const { extractMentions, authorDisplay } = require('./forumHelpers');

async function notifyMentionedUsers({ content, authorId, thread, actionUrl }) {
  const usernames = extractMentions(content);
  if (!usernames.length) return;

  const [users, author] = await Promise.all([
    User.find({
      username: { $in: usernames.map((u) => new RegExp(`^${u}$`, 'i')) },
      isActive: true,
      isSuspended: { $ne: true },
    }).select('_id username'),
    User.findById(authorId).select('username firstName lastName publicProfile profileSlug').lean(),
  ]);

  const authorName = authorDisplay(author).displayName;

  await Promise.all(
    users
      .filter((u) => String(u._id) !== String(authorId))
      .map(async (u) => {
        try {
          await notificationService.createNotification(
            u._id,
            'forum_mention',
            { authorName, threadTitle: thread.title },
            { actionUrl, metadata: { threadId: thread._id } }
          );
        } catch {
          await notificationService.sendNotification(u._id, {
            title: 'You were mentioned',
            message: `${authorName} mentioned you in "${thread.title}"`,
            category: 'forum',
            icon: 'FiAtSign',
            actionUrl,
            metadata: { threadId: thread._id },
          });
        }
      })
  );
}

module.exports = { notifyMentionedUsers };
