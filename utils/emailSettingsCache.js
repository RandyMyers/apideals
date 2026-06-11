let cached = null;
let cachedAt = 0;
const TTL_MS = 60 * 1000;

function invalidateEmailSettingsCache() {
  cached = null;
  cachedAt = 0;
}

async function getCachedEmailSettings(EmailSettings) {
  if (cached && Date.now() - cachedAt < TTL_MS) {
    return cached;
  }
  const doc = await EmailSettings.getSettings();
  cached = doc.toObject ? doc.toObject() : { ...doc };
  cachedAt = Date.now();
  return cached;
}

module.exports = { getCachedEmailSettings, invalidateEmailSettingsCache };
