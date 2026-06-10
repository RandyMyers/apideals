function slugify(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function uniqueThreadSlug(ThreadModel, base) {
  let slug = slugify(base) || 'thread';
  if (slug.length < 3) slug = `thread-${Date.now()}`;
  let candidate = slug;
  let n = 1;
  while (await ThreadModel.exists({ slug: candidate })) {
    candidate = `${slug}-${n}`;
    n++;
  }
  return candidate;
}

function sanitizeForumContent(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, 10000);
}

const AUTHOR_SELECT = 'username profilePicture profileSlug firstName lastName publicProfile.displayName';

const NEW_ACCOUNT_DAYS = 7;
const AUTO_HIDE_REPORT_THRESHOLD = 3;

function isNewAccount(user) {
  if (!user?.createdAt) return false;
  const ageMs = Date.now() - new Date(user.createdAt).getTime();
  return ageMs < NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000;
}

function assertCanPost(user) {
  if (!user?.isEmailVerified) {
    return { ok: false, status: 403, message: 'Verify your email before posting.' };
  }
  if (user.isSuspended) {
    return { ok: false, status: 403, message: 'Account suspended.' };
  }
  const pp = user.publicProfile || {};
  if (isNewAccount(user) && !pp.trustedContributor) {
    return {
      ok: false,
      status: 403,
      message: `New accounts can post after ${NEW_ACCOUNT_DAYS} days. Complete your profile and stay active!`,
    };
  }
  return { ok: true };
}

function extractMentions(content) {
  if (!content) return [];
  const matches = content.match(/@([a-zA-Z0-9_-]{3,30})/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

function checkSpamContent(content) {
  if (!content) return { ok: true };
  const links = (content.match(/https?:\/\//gi) || []).length;
  if (links > 5) {
    return { ok: false, message: 'Too many links in one post.' };
  }
  if (/(.)\1{12,}/.test(content)) {
    return { ok: false, message: 'Content looks like spam.' };
  }
  if (content.length > 8000) {
    return { ok: false, message: 'Post is too long.' };
  }
  return { ok: true };
}

function authorDisplay(user) {
  if (!user) return { username: 'Member', displayName: 'Member' };
  const pp = user.publicProfile || {};
  const displayName =
    pp.displayName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.username;
  return {
    id: user._id,
    username: user.username,
    profileSlug: user.profileSlug || user.username,
    displayName,
    profilePicture: user.profilePicture || null,
  };
}

module.exports = {
  slugify,
  uniqueThreadSlug,
  sanitizeForumContent,
  AUTHOR_SELECT,
  authorDisplay,
  NEW_ACCOUNT_DAYS,
  AUTO_HIDE_REPORT_THRESHOLD,
  isNewAccount,
  assertCanPost,
  extractMentions,
  checkSpamContent,
};
