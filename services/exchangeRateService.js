/**
 * Exchange rates — reads MongoDB snapshots only (no HTTP on vote/statistics paths).
 * Sync job: server/jobs/syncExchangeRates.js
 */

const https = require('https');
const ExchangeRateSnapshot = require('../models/exchangeRateSnapshot');
const { DISPLAY_CURRENCIES, normalizeCurrencyCode } = require('../utils/currencyConstants');
const { logger } = require('../utils/logger');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

let memoryCache = null;
let memoryCacheExpiry = 0;
const MEMORY_TTL_MS = 5 * 60 * 1000;

function getConfig() {
  const baseUrl = (process.env.EXCHANGE_RATE_API_URL || 'https://v6.exchangerate-api.com/v6').replace(/\/$/, '');
  const apiKey = process.env.EXCHANGE_RATE_API_KEY || '';
  return { baseUrl, apiKey };
}

function fetchRatesFromApi() {
  const { baseUrl, apiKey } = getConfig();
  if (!apiKey) {
    return Promise.reject(new Error('EXCHANGE_RATE_API_KEY not set'));
  }
  const url = `${baseUrl}/${apiKey}/latest/USD`;
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (ch) => { data += ch; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.result !== 'success' || !json.conversion_rates) {
            reject(new Error(json['error-type'] || 'Invalid exchange rate API response'));
            return;
          }
          resolve(json.conversion_rates);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Exchange rate request timeout'));
    });
  });
}

/**
 * Pull latest rates from API and persist (called by cron / startup / admin script).
 */
async function syncExchangeRatesFromApi() {
  const rates = await fetchRatesFromApi();
  const snapshot = await ExchangeRateSnapshot.create({
    baseCurrency: 'USD',
    rates,
    fetchedAt: new Date(),
    source: 'exchangerate-api',
  });
  memoryCache = { rates, fetchedAt: snapshot.fetchedAt };
  memoryCacheExpiry = Date.now() + MEMORY_TTL_MS;
  logger.info('Exchange rates synced', { currencies: Object.keys(rates).length, fetchedAt: snapshot.fetchedAt });
  return snapshot;
}

async function loadRates() {
  const now = Date.now();
  if (memoryCache && memoryCacheExpiry > now) {
    return memoryCache;
  }
  const snapshot = await ExchangeRateSnapshot.getLatest();
  if (!snapshot || !snapshot.rates) {
    return null;
  }
  memoryCache = { rates: snapshot.rates, fetchedAt: snapshot.fetchedAt };
  memoryCacheExpiry = now + MEMORY_TTL_MS;
  return memoryCache;
}

function ratePerUsd(rates, currency) {
  const code = normalizeCurrencyCode(currency);
  if (!code || code === 'USD') return 1;
  const r = Number(rates[code]);
  return Number.isFinite(r) && r > 0 ? r : null;
}

/**
 * Convert foreign amount → USD (API base USD: amount_foreign / rate).
 */
async function convertToUsd(amount, fromCurrency) {
  const code = normalizeCurrencyCode(fromCurrency);
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return { success: false, amountUsd: 0, rate: null, reason: 'invalid_amount' };
  }
  if (!code || code === 'USD') {
    return { success: true, amountUsd: round2(amt), rate: 1, currency: 'USD', fetchedAt: null };
  }

  const loaded = await loadRates();
  if (!loaded) {
    return { success: false, amountUsd: 0, rate: null, reason: 'no_rates' };
  }

  const rate = ratePerUsd(loaded.rates, code);
  if (rate == null) {
    return { success: false, amountUsd: 0, rate: null, reason: 'unknown_currency' };
  }

  return {
    success: true,
    amountUsd: round2(amt / rate),
    rate,
    currency: code,
    fetchedAt: loaded.fetchedAt,
  };
}

/**
 * Convert USD → display currency for dashboard.
 */
async function convertFromUsd(amountUsd, toCurrency) {
  const code = normalizeCurrencyCode(toCurrency) || 'USD';
  const amt = Number(amountUsd);
  if (!Number.isFinite(amt)) {
    return { success: false, amount: 0 };
  }
  if (code === 'USD') {
    return { success: true, amount: round2(amt), currency: 'USD' };
  }

  const loaded = await loadRates();
  if (!loaded) {
    return { success: false, amount: 0, reason: 'no_rates' };
  }

  const rate = ratePerUsd(loaded.rates, code);
  if (rate == null) {
    return { success: false, amount: 0, reason: 'unknown_currency' };
  }

  return { success: true, amount: round2(amt * rate), currency: code, fetchedAt: loaded.fetchedAt };
}

async function convertAmount(amount, fromCurrency, toCurrency) {
  const toUsd = await convertToUsd(amount, fromCurrency);
  if (!toUsd.success) return toUsd;
  if (normalizeCurrencyCode(toCurrency) === 'USD') {
    return { success: true, amount: toUsd.amountUsd, currency: 'USD' };
  }
  return convertFromUsd(toUsd.amountUsd, toCurrency);
}

async function getSupportedCurrencies() {
  const loaded = await loadRates();
  const rateKeys = loaded?.rates ? new Set(Object.keys(loaded.rates)) : new Set();
  const curated = DISPLAY_CURRENCIES.filter((c) => rateKeys.has(c) || c === 'USD');
  return {
    currencies: curated.length ? curated : DISPLAY_CURRENCIES,
    ratesUpdatedAt: loaded?.fetchedAt || null,
  };
}

async function getRatesMeta() {
  const loaded = await loadRates();
  return {
    baseCurrency: 'USD',
    fetchedAt: loaded?.fetchedAt || null,
    currencyCount: loaded?.rates ? Object.keys(loaded.rates).length : 0,
  };
}

module.exports = {
  syncExchangeRatesFromApi,
  convertToUsd,
  convertFromUsd,
  convertAmount,
  getSupportedCurrencies,
  getRatesMeta,
  loadRates,
  getConfig,
};
