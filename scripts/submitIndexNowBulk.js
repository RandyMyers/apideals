/**
 * Submit sitemap URLs to IndexNow (one-time or after major deploys).
 *
 * Usage:
 *   node scripts/submitIndexNowBulk.js
 *   node scripts/submitIndexNowBulk.js --dry-run
 *   node scripts/submitIndexNowBulk.js --limit 500
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { submitUrls } = require('../utils/indexNow');
const { generateSitemap } = require('../utils/sitemapGenerator');

const BATCH_SIZE = 10_000;

const parseArgs = () => {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    limit: (() => {
      const i = args.indexOf('--limit');
      if (i === -1) return null;
      const n = parseInt(args[i + 1], 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    })(),
  };
};

const extractLocUrls = (xml) => {
  const urls = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let match;
  while ((match = re.exec(xml)) !== null) {
    urls.push(match[1].trim());
  }
  return urls;
};

async function main() {
  const { dryRun, limit } = parseArgs();
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!mongoUrl) {
    console.error('MONGO_URL is required');
    process.exit(1);
  }

  await mongoose.connect(mongoUrl);

  const Store = require('../models/store');
  const Category = require('../models/category');
  const Coupon = require('../models/coupon');
  const Deal = require('../models/deal');
  const Blog = require('../models/blog');

  const baseUrl = (process.env.CLIENT_URL || 'https://dealcouponz.com').replace(/\/$/, '');
  const models = { Store, Category, Coupon, Deal, Blog };

  console.log(`Generating sitemap URLs for ${baseUrl}…`);
  const xml = await generateSitemap(models, baseUrl);
  let urls = extractLocUrls(xml);
  if (limit) urls = urls.slice(0, limit);

  console.log(`Found ${urls.length} URL(s)${dryRun ? ' (dry run — no submit)' : ''}.`);

  if (dryRun) {
    urls.slice(0, 10).forEach((u) => console.log('  ', u));
    if (urls.length > 10) console.log(`  … and ${urls.length - 10} more`);
    await mongoose.disconnect();
    return;
  }

  let ok = 0;
  let failed = 0;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const result = await submitUrls(batch);
    if (result.skipped) {
      console.error('IndexNow skipped:', result.error);
      console.error('Set INDEXNOW_API_KEY or indexNow.apiKey in Admin → SEO Settings.');
      process.exit(1);
    }
    if (result.ok) {
      ok += batch.length;
      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: submitted ${batch.length} URL(s) (HTTP ${result.status})`);
    } else {
      failed += batch.length;
      console.warn(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: failed (HTTP ${result.status || 'n/a'}${result.error ? ` — ${result.error}` : ''})`);
    }
  }

  console.log(`Done. Submitted: ${ok}, failed: ${failed}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
