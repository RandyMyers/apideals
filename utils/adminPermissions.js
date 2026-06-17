/** Role helpers — mirror admin/src/utils/roles.js */

const AFFILIATE_ROLES = new Set(['superAdmin', 'couponManager', 'marketingManager']);

function canManageAffiliates(userType) {
  return AFFILIATE_ROLES.has(userType);
}

function stripAffiliateFromStore(store) {
  if (!store) return store;
  const copy = { ...store };
  delete copy.affiliate;
  delete copy.affiliateId;
  return copy;
}

function stripAffiliateFromStores(stores) {
  if (!Array.isArray(stores)) return stores;
  return stores.map(stripAffiliateFromStore);
}

module.exports = {
  canManageAffiliates,
  stripAffiliateFromStore,
  stripAffiliateFromStores,
};
