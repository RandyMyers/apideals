const ForumSettings = require('../models/forumSettings');

const DEFAULTS = {
  newAccountDays: 7,
  autoHideReportThreshold: 3,
  maxThreadsPerDay: 5,
  maxPostsPerDay: 30,
  spamPendingScore: 50,
  spamRejectScore: 80,
};

let cache = null;
let cacheAt = 0;
const TTL_MS = 60 * 1000;

function toPlain(doc) {
  if (!doc) return { ...DEFAULTS };
  return {
    newAccountDays: doc.newAccountDays ?? DEFAULTS.newAccountDays,
    autoHideReportThreshold: doc.autoHideReportThreshold ?? DEFAULTS.autoHideReportThreshold,
    maxThreadsPerDay: doc.maxThreadsPerDay ?? DEFAULTS.maxThreadsPerDay,
    maxPostsPerDay: doc.maxPostsPerDay ?? DEFAULTS.maxPostsPerDay,
    spamPendingScore: doc.spamPendingScore ?? DEFAULTS.spamPendingScore,
    spamRejectScore: doc.spamRejectScore ?? DEFAULTS.spamRejectScore,
  };
}

async function getForumSettings() {
  const now = Date.now();
  if (cache && now - cacheAt < TTL_MS) {
    return cache;
  }
  try {
    const doc = await ForumSettings.getSettings();
    cache = toPlain(doc);
  } catch {
    cache = { ...DEFAULTS };
  }
  cacheAt = now;
  return cache;
}

function invalidateForumSettingsCache() {
  cache = null;
  cacheAt = 0;
}

module.exports = {
  getForumSettings,
  invalidateForumSettingsCache,
  DEFAULTS,
};
