/**
 * Backfill visitor links for historical activity data.
 *
 * What it does:
 * 1) Links View records missing visitorId using userId -> latest Visitor for that user.
 * 2) Links Interaction records missing visitorId using userId -> latest Visitor for that user.
 * 3) Recomputes isLandingPage per visitor in 30-minute sessions.
 *
 * Usage:
 *   node scripts/backfillVisitorActivityLinks.js
 *
 * Env:
 *   MONGO_URL | MONGODB_URI | MONGO_URI
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Visitor = require('../models/visitor');
const View = require('../models/view');
const Interaction = require('../models/interaction');

async function connect() {
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('Missing MONGO_URL / MONGODB_URI / MONGO_URI');
  }
  await mongoose.connect(mongoUri);
}

async function buildLatestVisitorByUserMap() {
  const rows = await Visitor.find({ userId: { $ne: null } })
    .sort({ visitedAt: -1 })
    .select('_id userId visitedAt')
    .lean();
  const map = new Map();
  for (const row of rows) {
    const uid = row.userId ? String(row.userId) : null;
    if (!uid) continue;
    if (!map.has(uid)) {
      map.set(uid, row._id);
    }
  }
  return map;
}

async function backfillViews(userToVisitorMap) {
  const missing = await View.find({
    $or: [{ visitorId: null }, { visitorId: { $exists: false } }],
    userId: { $ne: null },
  })
    .select('_id userId')
    .lean();

  let linked = 0;
  for (const row of missing) {
    const uid = row.userId ? String(row.userId) : null;
    const visitorId = uid ? userToVisitorMap.get(uid) : null;
    if (!visitorId) continue;
    const res = await View.updateOne(
      { _id: row._id, $or: [{ visitorId: null }, { visitorId: { $exists: false } }] },
      { $set: { visitorId } }
    );
    if (res.modifiedCount > 0) linked += 1;
  }
  return { scanned: missing.length, linked };
}

async function backfillInteractions(userToVisitorMap) {
  const missing = await Interaction.find({
    $or: [{ visitorId: null }, { visitorId: { $exists: false } }],
    userId: { $ne: null },
  })
    .select('_id userId')
    .lean();

  let linked = 0;
  for (const row of missing) {
    const uid = row.userId ? String(row.userId) : null;
    const visitorId = uid ? userToVisitorMap.get(uid) : null;
    if (!visitorId) continue;
    const res = await Interaction.updateOne(
      { _id: row._id, $or: [{ visitorId: null }, { visitorId: { $exists: false } }] },
      { $set: { visitorId } }
    );
    if (res.modifiedCount > 0) linked += 1;
  }
  return { scanned: missing.length, linked };
}

async function recomputeLandingFlags() {
  const views = await View.find({ visitorId: { $ne: null } })
    .sort({ visitorId: 1, viewedAt: 1, createdAt: 1 })
    .select('_id visitorId viewedAt createdAt isLandingPage')
    .lean();

  let updated = 0;
  let currentVisitor = null;
  let previousTs = null;
  for (const row of views) {
    const vid = String(row.visitorId);
    const ts = new Date(row.viewedAt || row.createdAt).getTime();
    let shouldBeLanding = false;

    if (vid !== currentVisitor) {
      shouldBeLanding = true;
      currentVisitor = vid;
      previousTs = ts;
    } else {
      const diffMs = ts - previousTs;
      // New session if gap > 30 minutes
      shouldBeLanding = diffMs > 30 * 60 * 1000;
      previousTs = ts;
    }

    if (Boolean(row.isLandingPage) !== shouldBeLanding) {
      const res = await View.updateOne({ _id: row._id }, { $set: { isLandingPage: shouldBeLanding } });
      if (res.modifiedCount > 0) updated += 1;
    }
  }
  return { scanned: views.length, updated };
}

async function run() {
  await connect();
  console.log('Connected to MongoDB');
  try {
    const userToVisitorMap = await buildLatestVisitorByUserMap();
    console.log('User->Visitor mappings:', userToVisitorMap.size);

    const viewStats = await backfillViews(userToVisitorMap);
    console.log('Views backfill:', viewStats);

    const interactionStats = await backfillInteractions(userToVisitorMap);
    console.log('Interactions backfill:', interactionStats);

    const landingStats = await recomputeLandingFlags();
    console.log('Landing flags recomputed:', landingStats);

    console.log('Backfill completed.');
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();

