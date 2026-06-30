/**
 * Resolve where users should go to redeem a coupon or deal.
 * Internal DB markers (e.g. __all_products__) are never exposed as visit URLs.
 */

const INTERNAL_PRODUCT_URL_PREFIX = '__all_products__';
const PLACEHOLDER_URLS = new Set(['', '...', 'n/a', '#']);

function isInternalProductUrl(value) {
  if (!value || typeof value !== 'string') return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (PLACEHOLDER_URLS.has(trimmed.toLowerCase())) return true;
  if (trimmed.startsWith(INTERNAL_PRODUCT_URL_PREFIX)) return true;
  return false;
}

function getStoreExternalUrl(store) {
  if (!store || typeof store !== 'object') return null;
  const raw = store.url || store.website || null;
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || PLACEHOLDER_URLS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

function resolveOfferVisitUrl(productUrl, store) {
  if (!isInternalProductUrl(productUrl)) {
    return String(productUrl).trim();
  }
  return getStoreExternalUrl(store);
}

function resolvePublicProductUrl(productUrl) {
  if (isInternalProductUrl(productUrl)) return null;
  return String(productUrl).trim();
}

function normalizeStoreForApi(store) {
  if (!store || typeof store !== 'object') return store;
  const externalUrl = getStoreExternalUrl(store);
  return {
    ...store,
    url: store.url || externalUrl || undefined,
    website: externalUrl || store.website || store.url || undefined,
  };
}

function attachVisitUrlToOffer(offer, store) {
  if (!offer || typeof offer !== 'object') return offer;
  const normalizedStore = normalizeStoreForApi(store);
  const visitUrl = resolveOfferVisitUrl(offer.productUrl, normalizedStore);
  return {
    ...offer,
    productUrl: resolvePublicProductUrl(offer.productUrl),
    visitUrl: visitUrl || null,
    store: normalizedStore || offer.store,
  };
}

module.exports = {
  isInternalProductUrl,
  getStoreExternalUrl,
  resolveOfferVisitUrl,
  resolvePublicProductUrl,
  normalizeStoreForApi,
  attachVisitUrlToOffer,
};
