/**
 * Helpers for checking whether dynamic entities have real locale content.
 */

const STORE_CONTENT_KEYS = ['seo', 'description', 'aboutSummary', 'pageContent', 'name'];
const OFFER_CONTENT_KEYS = ['title', 'description', 'seoTitle', 'seoDescription', 'name'];
const CATEGORY_CONTENT_KEYS = ['name', 'description', 'seoTitle', 'seoDescription', 'h1', 'intro'];

function isNonEmptyObject(val) {
  return val && typeof val === 'object' && Object.keys(val).length > 0;
}

function hasAnyKey(obj, keys) {
  if (!obj || typeof obj !== 'object') return false;
  return keys.some((k) => {
    const v = obj[k];
    if (v == null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'object') return Object.keys(v).length > 0;
    return Boolean(v);
  });
}

function hasStoreTranslation(entity, locale) {
  const block = entity?.languageTranslations?.[locale];
  return hasAnyKey(block, STORE_CONTENT_KEYS) || hasAnyKey(block?.seo, ['title', 'metaDescription', 'h1', 'intro']);
}

function hasOfferTranslation(entity, locale) {
  const block = entity?.languageTranslations?.[locale];
  return hasAnyKey(block, OFFER_CONTENT_KEYS);
}

function hasCategoryTranslation(entity, locale) {
  const block = entity?.languageTranslations?.[locale];
  return hasAnyKey(block, CATEGORY_CONTENT_KEYS) || hasAnyKey(block?.seo, ['title', 'metaDescription']);
}

function hasBlogTranslation(entity, locale) {
  const title = entity?.titleTranslations?.[locale];
  const content = entity?.contentTranslations?.[locale];
  const excerpt = entity?.excerptTranslations?.[locale];
  const meta = entity?.metaDescriptionTranslations?.[locale];
  return Boolean(
    (title && String(title).trim())
    || (content && String(content).trim())
    || (excerpt && String(excerpt).trim())
    || (meta && String(meta).trim())
  );
}

function listEntityTranslationLocales(entity, type = 'store') {
  if (!entity) return [];
  if (type === 'blog') {
    const keys = new Set([
      ...Object.keys(entity.titleTranslations || {}),
      ...Object.keys(entity.contentTranslations || {}),
      ...Object.keys(entity.excerptTranslations || {}),
    ]);
    return [...keys].filter((loc) => hasBlogTranslation(entity, loc));
  }
  const lt = entity.languageTranslations;
  if (!lt || typeof lt !== 'object') return [];
  const checker = {
    store: hasStoreTranslation,
    coupon: hasOfferTranslation,
    deal: hasOfferTranslation,
    category: hasCategoryTranslation,
  }[type] || hasStoreTranslation;
  return Object.keys(lt).filter((loc) => checker(entity, loc));
}

module.exports = {
  hasStoreTranslation,
  hasOfferTranslation,
  hasCategoryTranslation,
  hasBlogTranslation,
  listEntityTranslationLocales,
};
