const { normalizeCurrencyCode } = require('./currencyConstants');
const { computeUsageSavings } = require('./savingsCalculator');
const exchangeRateService = require('../services/exchangeRateService');

/**
 * Currency used for savings math on this usage event.
 */
function resolveTransactionCurrency(entity = {}, purchaseCurrency) {
  const fromUser = normalizeCurrencyCode(purchaseCurrency);
  if (fromUser) return fromUser;

  const fromEntity = normalizeCurrencyCode(entity.currency);
  if (fromEntity) return fromEntity;

  return null;
}

/**
 * Compute savings in transaction currency + USD canonical amount for aggregation.
 */
async function buildUsageSavingsFields({ entity = {}, purchaseAmount, purchaseCurrency } = {}) {
  const currency = resolveTransactionCurrency(entity, purchaseCurrency);
  const base = computeUsageSavings({ entity, purchaseAmount });

  const emptyUsd = {
    ...base,
    currency: currency || 'USD',
    purchaseCurrency: normalizeCurrencyCode(purchaseCurrency) || null,
    savingsAmountUsd: 0,
    exchangeRate: null,
    exchangeRateSnapshotAt: null,
    exchangeRateSource: 'failed',
  };

  if (!base.savingsKnown || base.savingsAmount <= 0) {
    return {
      ...emptyUsd,
      savingsKnown: base.savingsKnown,
      savingsSource: base.savingsSource,
      savingsAmountUsd: 0,
      exchangeRateSource: base.savingsSource === 'unknown' ? 'unknown' : 'failed',
    };
  }

  if (!currency) {
    return {
      ...emptyUsd,
      savingsKnown: false,
      savingsAmount: 0,
      savingsSource: 'unknown',
    };
  }

  const conv = await exchangeRateService.convertToUsd(base.savingsAmount, currency);
  if (!conv.success) {
    return {
      ...emptyUsd,
      currency,
      savingsKnown: false,
      savingsAmount: base.savingsAmount,
      savingsSource: base.savingsSource,
    };
  }

  return {
    ...base,
    currency,
    purchaseCurrency: normalizeCurrencyCode(purchaseCurrency) || (currency !== normalizeCurrencyCode(entity.currency) ? currency : null),
    savingsAmountUsd: conv.amountUsd,
    exchangeRate: conv.rate,
    exchangeRateSnapshotAt: conv.fetchedAt || null,
    exchangeRateSource: 'db-snapshot',
  };
}

/** Sum field for aggregations — prefers USD canonical column. */
const SAVINGS_USD_SUM = {
  $sum: {
    $cond: [
      { $and: [{ $eq: ['$savingsKnown', true] }, { $gt: [{ $ifNull: ['$savingsAmountUsd', 0] }, 0] }] },
      { $ifNull: ['$savingsAmountUsd', 0] },
      {
        $cond: [
          {
            $and: [
              { $eq: ['$savingsKnown', true] },
              { $in: [{ $ifNull: ['$currency', 'USD'] }, ['USD', null]] },
            ],
          },
          { $ifNull: ['$savingsAmount', 0] },
          0,
        ],
      },
    ],
  },
};

async function convertSavingsTotalForDisplay(totalUsd, displayCurrency) {
  const code = normalizeCurrencyCode(displayCurrency) || 'USD';
  if (totalUsd <= 0) {
    return { amount: 0, displayCurrency: code };
  }
  const conv = await exchangeRateService.convertFromUsd(totalUsd, code);
  return {
    amount: conv.success ? conv.amount : totalUsd,
    displayCurrency: conv.success ? conv.currency : 'USD',
    ratesUpdatedAt: conv.fetchedAt || null,
  };
}

module.exports = {
  resolveTransactionCurrency,
  buildUsageSavingsFields,
  SAVINGS_USD_SUM,
  convertSavingsTotalForDisplay,
};
