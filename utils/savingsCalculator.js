/**
 * Savings calculator
 * ------------------
 * Single source of truth for turning an offer (coupon/deal) + an optional
 * user-reported purchase amount into an honest savings figure.
 *
 * It NEVER fabricates a number: a percentage offer with no known price and no
 * user-entered amount is recorded as "used" with savings 0 and savingsKnown=false,
 * so usage counts stay correct while the dollar total reflects only verifiable savings.
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * @param {Object} args
 * @param {Object} args.entity   - Coupon or Deal document (plain or mongoose doc)
 * @param {number} [args.purchaseAmount] - Amount the user spent (optional)
 * @returns {{ savingsAmount:number, savingsKnown:boolean, savingsSource:'price'|'fixed'|'userInput'|'unknown', discountType?:string, discountValue?:number, purchaseAmount:number }}
 */
function computeUsageSavings({ entity = {}, purchaseAmount } = {}) {
  const originalPrice = toNum(entity.originalPrice);
  const discountedPrice = toNum(entity.discountedPrice);
  const entitySavings = toNum(entity.savingsAmount);
  const discountType = entity.discountType;
  const discountValue = toNum(entity.discountValue);
  const spend = toNum(purchaseAmount);

  const base = {
    purchaseAmount: spend > 0 ? round2(spend) : 0,
    ...(discountType ? { discountType } : {}),
    ...(discountValue > 0 ? { discountValue } : {}),
  };

  // 1. Known price pair → savings is a verified fixed amount.
  if (originalPrice > 0 && discountedPrice > 0 && originalPrice > discountedPrice) {
    return { ...base, savingsAmount: round2(originalPrice - discountedPrice), savingsKnown: true, savingsSource: 'price' };
  }

  // 2. Pre-computed savingsAmount stored on the entity.
  if (entitySavings > 0) {
    return { ...base, savingsAmount: round2(entitySavings), savingsKnown: true, savingsSource: 'price' };
  }

  // 3. Fixed-amount discount → the discount IS the savings (capped at spend if known).
  if (discountType === 'fixed' && discountValue > 0) {
    const amount = spend > 0 ? Math.min(discountValue, spend) : discountValue;
    return { ...base, savingsAmount: round2(amount), savingsKnown: true, savingsSource: 'fixed' };
  }

  // 4. Percentage discount → needs the spend to be accurate.
  if (discountType === 'percentage' && discountValue > 0) {
    if (spend > 0) {
      return { ...base, savingsAmount: round2((spend * discountValue) / 100), savingsKnown: true, savingsSource: 'userInput' };
    }
    // No amount provided → honest unknown (do NOT estimate).
    return { ...base, savingsAmount: 0, savingsKnown: false, savingsSource: 'unknown' };
  }

  // 5. Free shipping / bundle / no discount metadata → unknown.
  return { ...base, savingsAmount: 0, savingsKnown: false, savingsSource: 'unknown' };
}

/**
 * Client-side parity helper: should we prompt the user for their spend?
 * True only when savings can't be derived without it (percentage, no known price).
 */
function offerNeedsPurchaseAmount(entity = {}) {
  const originalPrice = toNum(entity.originalPrice);
  const discountedPrice = toNum(entity.discountedPrice);
  const entitySavings = toNum(entity.savingsAmount);
  const hasKnownPrice = (originalPrice > 0 && discountedPrice > 0 && originalPrice > discountedPrice) || entitySavings > 0;
  return entity.discountType === 'percentage' && toNum(entity.discountValue) > 0 && !hasKnownPrice;
}

module.exports = { computeUsageSavings, offerNeedsPurchaseAmount };
