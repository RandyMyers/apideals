/**
 * Static UI locale coverage from committed manifest (web/public/locales snapshot).
 */
const manifest = require('../data/uiLocaleManifest.json');

function normalizeStaticPath(neutralPath) {
  if (!neutralPath || neutralPath === '/') return '/';
  return neutralPath.startsWith('/') ? neutralPath : `/${neutralPath}`;
}

function staticPathKey(neutralPath) {
  const normalized = normalizeStaticPath(neutralPath);
  return normalized === '/' ? '' : normalized.replace(/^\//, '');
}

function staticPageHasUiTranslation(langCode, neutralPath) {
  const entry = manifest[langCode];
  if (!entry?.hasFile) {
    return { hasUi: false, reason: 'missing locale file' };
  }
  const key = staticPathKey(neutralPath);
  if (!key) {
    return { hasUi: Boolean(entry.hasHome), reason: entry.hasHome ? 'ok' : 'empty home bundle' };
  }
  const hasUi = Array.isArray(entry.pages) && entry.pages.includes(key);
  return { hasUi, reason: hasUi ? 'ok' : 'empty or missing section' };
}

function listUiLocalesForStaticPath(neutralPath) {
  const langs = ['en'];
  const key = staticPathKey(neutralPath);
  for (const [lang, entry] of Object.entries(manifest)) {
    if (lang === 'en') continue;
    if (!key) {
      if (entry.hasHome) langs.push(lang);
      continue;
    }
    if (entry.pages?.includes(key)) langs.push(lang);
  }
  return langs;
}

function localeHasAnyUiBundle(langCode) {
  return Boolean(manifest[langCode]?.hasFile && manifest[langCode]?.hasHome);
}

module.exports = {
  staticPageHasUiTranslation,
  listUiLocalesForStaticPath,
  localeHasAnyUiBundle,
};
