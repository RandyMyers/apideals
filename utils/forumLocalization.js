/**
 * Resolve forum category / thread / post fields for the requested locale.
 */
const LANG_FALLBACK = {
  'en-GB': 'en',
  'en-AU': 'en',
  'de-AT': 'de',
  'es-MX': 'es',
};

const SUPPORTED = new Set([
  'en', 'en-GB', 'en-AU', 'ga', 'de', 'de-AT', 'es', 'es-MX', 'ja', 'ko',
  'it', 'no', 'fi', 'da', 'sv', 'fr', 'pt', 'nl',
]);

function normalizeLang(lang) {
  const code = String(lang || 'en').trim();
  if (SUPPORTED.has(code)) return code;
  const base = code.split('-')[0];
  if (SUPPORTED.has(base)) return base;
  return 'en';
}

function getRequestLanguage(req) {
  return normalizeLang(req.query?.lang || req.headers['x-lang'] || req.headers['accept-language']?.split(',')[0]);
}

function pickLocalized(entity, lang, field) {
  if (!entity) return undefined;
  const lt = entity.languageTranslations;
  if (!lt || typeof lt !== 'object') return entity[field];
  const base = LANG_FALLBACK[lang] || lang;
  const block = lt[lang] || lt[base] || lt.en || {};
  if (block[field] !== undefined && block[field] !== null && String(block[field]).trim() !== '') {
    return block[field];
  }
  return entity[field];
}

function localizeCategory(category, lang) {
  if (!category) return category;
  const l = normalizeLang(lang);
  return {
    ...category,
    name: pickLocalized(category, l, 'name'),
    description: pickLocalized(category, l, 'description'),
    metaTitle: pickLocalized(category, l, 'metaTitle'),
    metaDescription: pickLocalized(category, l, 'metaDescription'),
  };
}

function localizeThread(thread, lang) {
  if (!thread) return thread;
  const l = normalizeLang(lang);
  return {
    ...thread,
    title: pickLocalized(thread, l, 'title'),
    metaTitle: pickLocalized(thread, l, 'metaTitle'),
    metaDescription: pickLocalized(thread, l, 'metaDescription'),
  };
}

function localizePost(post, lang) {
  if (!post) return post;
  const l = normalizeLang(lang);
  return {
    ...post,
    content: pickLocalized(post, l, 'content'),
  };
}

function localizeCategories(categories, lang) {
  return (categories || []).map((c) => localizeCategory(c, lang));
}

module.exports = {
  getRequestLanguage,
  normalizeLang,
  pickLocalized,
  localizeCategory,
  localizeThread,
  localizePost,
  localizeCategories,
};
