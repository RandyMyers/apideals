/**
 * ISO 4217 codes offered in user settings and the purchase-amount modal.
 * Full rate map lives in ExchangeRateSnapshot (synced from API).
 */
const DISPLAY_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'CHF', 'JPY', 'CNY',
  'HKD', 'TWD', 'SGD', 'INR', 'MXN', 'BRL', 'ZAR', 'AED', 'SAR',
  'KRW', 'THB', 'MYR', 'PHP', 'IDR', 'VND', 'PLN', 'SEK', 'NOK', 'DKK',
];

const INVALID_CURRENCY_TOKENS = new Set(['', 'VARIES', 'N/A', 'NA', 'UNKNOWN']);

function normalizeCurrencyCode(code) {
  if (code == null) return null;
  const c = String(code).trim().toUpperCase();
  if (!c || INVALID_CURRENCY_TOKENS.has(c)) return null;
  if (!/^[A-Z]{3}$/.test(c)) return null;
  return c;
}

module.exports = {
  DISPLAY_CURRENCIES,
  INVALID_CURRENCY_TOKENS,
  normalizeCurrencyCode,
};
