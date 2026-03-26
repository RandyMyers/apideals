/**
 * Read-only: fetch a deal by id from the public GET endpoint and print maxUsage / usedCount.
 *
 * Usage:
 *   node scripts/checkDealMaxUsage.js 69c411b0bcc34f30a4e4ea33
 *   API_BASE=https://apideals.vercel.app/api/v1 node scripts/checkDealMaxUsage.js 69c411b0bcc34f30a4e4ea33
 */
const dealId = process.argv[2];
const base =
  process.env.API_BASE ||
  process.env.REACT_APP_API_URL ||
  'https://apideals.vercel.app/api/v1';

if (!dealId || !/^[0-9a-fA-F]{24}$/.test(dealId)) {
  console.error('Usage: node scripts/checkDealMaxUsage.js <24-char Mongo ObjectId>');
  process.exit(1);
}

const url = `${base.replace(/\/$/, '')}/deals/get/${dealId}`;

fetch(url)
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then((deal) => {
    console.log(JSON.stringify({
      _id: deal._id,
      title: deal.title || deal.name,
      maxUsage: deal.maxUsage,
      usedCount: deal.usedCount,
      updatedAt: deal.updatedAt,
    }, null, 2));
  })
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
