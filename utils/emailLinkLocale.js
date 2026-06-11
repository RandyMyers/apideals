/**
 * Build locale-prefixed client auth URLs for transactional emails.
 * Mirrors client languageConfig urlCode mapping.
 */
const TRANSLATION_TO_URL_CODE = {
  en: 'en',
  ga: 'ga',
  de: 'de',
  es: 'es',
  'es-MX': 'mx',
  ja: 'jp',
  ko: 'kr',
  it: 'it',
  no: 'no',
  fi: 'fi',
  da: 'da',
  sv: 'sv',
  fr: 'fr',
  pt: 'pt',
  nl: 'nl',
  'en-GB': 'uk',
  'en-AU': 'au',
  'de-AT': 'at',
};

function getUrlCode(translationCode) {
  if (!translationCode) return 'en';
  return TRANSLATION_TO_URL_CODE[translationCode] || translationCode.split('-')[0] || 'en';
}

/**
 * @param {string} clientUrl - e.g. https://dealcouponz.com
 * @param {string} path - e.g. /verify-email?token=abc
 * @param {string} [locale] - translation code e.g. de, en-GB
 */
function buildLocalizedClientUrl(clientUrl, path, locale) {
  const base = (clientUrl || '').replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const urlCode = getUrlCode(locale);
  if (!urlCode || urlCode === 'en') {
    return `${base}${cleanPath}`;
  }
  return `${base}/${urlCode}${cleanPath}`;
}

module.exports = {
  getUrlCode,
  buildLocalizedClientUrl,
};
