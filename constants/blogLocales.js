/** Non-English blog translation keys — keep in sync with admin contentLocales.js */
const BLOG_TRANSLATION_LOCALES = [
  'ga',
  'de',
  'es',
  'es-MX',
  'ja',
  'ko',
  'it',
  'no',
  'fi',
  'da',
  'sv',
  'fr',
  'pt',
  'nl',
  'en-GB',
  'en-AU',
  'de-AT',
];

function buildStringLocaleSchema({ trim = true } = {}) {
  const shape = {};
  for (const code of BLOG_TRANSLATION_LOCALES) {
    shape[code] = trim ? { type: String, trim: true } : { type: String };
  }
  return shape;
}

module.exports = {
  BLOG_TRANSLATION_LOCALES,
  buildStringLocaleSchema,
};
