/**
 * Publish validation gates
 * Ensures content meets a minimum AI/SEO quality bar before it can be published.
 * Returns { ok: boolean, errors: string[] }.
 */

const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * Validate a store before publishing.
 * Bar: intro + meta title/description + >=3 FAQs + logo alt.
 */
const validateStorePublish = (store = {}) => {
  const errors = [];
  const seo = store.seo || {};
  const intro = store.intro || seo.intro;
  const metaTitle = store.seoTitle || seo.title || seo.metaTitle;
  const metaDescription = store.seoDescription || seo.metaDescription || seo.description;
  const faqs = Array.isArray(store.faqs) ? store.faqs : [];
  const logoAlt = store.logoAlt || seo.logoAlt;

  if (!nonEmpty(intro)) errors.push('An intro / overview paragraph is required.');
  if (!nonEmpty(metaTitle)) errors.push('An SEO meta title is required.');
  if (!nonEmpty(metaDescription)) errors.push('An SEO meta description is required.');
  if (faqs.filter((f) => nonEmpty(f.question) && nonEmpty(f.answer)).length < 3) {
    errors.push('At least 3 complete FAQs are required.');
  }
  if (!nonEmpty(logoAlt)) errors.push('A logo alt text is required.');

  return { ok: errors.length === 0, errors };
};

/**
 * Validate a coupon before publishing.
 * Bar: expiry date + (when verified flag is set, a lastVerifiedAt date).
 */
const validateCouponPublish = (coupon = {}) => {
  const errors = [];
  if (!coupon.endDate) errors.push('An expiry (end) date is required.');
  if (coupon.verified && !coupon.lastVerifiedAt) {
    errors.push('A "last verified" date is required when the coupon is marked verified.');
  }
  return { ok: errors.length === 0, errors };
};

/**
 * Validate a deal before publishing.
 * Bar: title + (when verified flag is set, a lastVerifiedAt date).
 */
const validateDealPublish = (deal = {}) => {
  const errors = [];
  if (!nonEmpty(deal.title)) errors.push('A deal title is required.');
  if (deal.verified && !deal.lastVerifiedAt) {
    errors.push('A "last verified" date is required when the deal is marked verified.');
  }
  return { ok: errors.length === 0, errors };
};

module.exports = { validateStorePublish, validateCouponPublish, validateDealPublish };
