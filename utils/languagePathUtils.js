/**
 * Language URL path helpers (mirror client languageConfig urlCode mapping).
 */

const URL_CODE_BY_LANG = {
  en: null,
  'en-GB': 'uk',
  'en-AU': 'au',
  ga: 'ga',
  de: 'de',
  'de-AT': 'at',
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
};

const URL_CODES = new Set(Object.values(URL_CODE_BY_LANG).filter(Boolean));

function stripLanguagePrefix(pathname = '') {
  if (!pathname || pathname === '/') return '/';
  let clean = pathname.toLowerCase().trim();
  if (!clean.startsWith('/')) clean = `/${clean}`;
  const segments = clean.split('/').filter(Boolean);
  if (segments.length > 0 && URL_CODES.has(segments[0])) {
    const rest = segments.slice(1).join('/');
    return rest ? `/${rest}` : '/';
  }
  return clean.replace(/\/+$/, '') || '/';
}

function getUrlCodeForLang(langCode) {
  if (!langCode) return null;
  if (Object.prototype.hasOwnProperty.call(URL_CODE_BY_LANG, langCode)) {
    return URL_CODE_BY_LANG[langCode];
  }
  return langCode;
}

function generateLanguageUrl(path, langCode, defaultLang, baseUrl) {
  const urlCode = getUrlCodeForLang(langCode);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!urlCode || langCode === defaultLang) {
    return `${baseUrl}${cleanPath}`;
  }
  return `${baseUrl}/${urlCode}${cleanPath}`;
}

module.exports = {
  URL_CODE_BY_LANG,
  URL_CODES,
  stripLanguagePrefix,
  getUrlCodeForLang,
  generateLanguageUrl,
};
