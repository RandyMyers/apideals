/**
 * Locales with seeded dynamic content — safe for hreflang, sitemap alternates, and switcher.
 * Updated by scripts/seedDynamicEntityTranslations.js --apply
 */
const DEFAULT_CONTENT_READY_LOCALES = ['en'];

/** @type {string[]} */
let cached = [...DEFAULT_CONTENT_READY_LOCALES];

function setContentReadyLocales(locales) {
  cached = Array.isArray(locales) && locales.length ? [...locales] : ['en'];
  if (!cached.includes('en')) cached.unshift('en');
}

function getContentReadyLocales() {
  return [...cached];
}

function isContentReadyLocale(code) {
  if (!code) return false;
  return cached.includes(code) || cached.includes(String(code).split('-')[0]);
}

function filterLanguagesForHreflang(allLanguages, contentReadyLocales = cached) {
  const ready = new Set(contentReadyLocales);
  return (allLanguages || []).filter((lang) => {
    const code = lang.code || lang;
    return ready.has(code) || ready.has(String(code).split('-')[0]);
  });
}

module.exports = {
  DEFAULT_CONTENT_READY_LOCALES,
  setContentReadyLocales,
  getContentReadyLocales,
  isContentReadyLocale,
  filterLanguagesForHreflang,
};
