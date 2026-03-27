/**
 * Validate visitor tracking flow end-to-end against local API.
 *
 * Usage:
 *   node scripts/validateVisitorTrackingFlow.js
 */
const axios = require('axios');

async function run() {
  const base = process.env.API_BASE || 'http://localhost:5000/api/v1';
  const now = Date.now();
  const trackingKey = `validation-${now}-${Math.random().toString(36).slice(2, 8)}`;
  const userAgent = `ValidationBot/${now}`;

  console.log('Base:', base);
  console.log('Tracking key:', trackingKey);

  // 1) Create visitor identity
  const visitorResp = await axios.post(`${base}/visitors/create`, {
    trackingKey,
    ip: `127.0.0.${Math.floor(Math.random() * 200) + 10}`,
    userAgent,
    browserLanguage: 'en-US',
    platform: 'Win32',
    deviceType: 'Desktop',
    country: 'United States',
    city: 'New York',
    region: 'New York',
    timezone: 'America/New_York',
    languages: ['en-US'],
    currency: 'USD',
    currencyName: 'US Dollar',
    zipCode: '10001',
  });

  const visitorId = visitorResp?.data?.visitor?._id;
  if (!visitorId) {
    throw new Error('Visitor create failed: no visitor id returned');
  }
  console.log('Visitor ID:', visitorId);

  // 2) Track a page journey (without sending visitorId intentionally; server should link by trackingKey)
  const journey = [
    '/deals/all',
    '/stores/trip-com',
    '/stores/trip-com/times-square',
    '/deal/doubletree-by-hilton-new-york-downtown-nightly-deal',
  ];

  for (const [idx, pagePath] of journey.entries()) {
    await axios.post(`${base}/views/create`, {
      trackingKey,
      pagePath,
      languageCode: 'en',
      referrer: idx === 0 ? 'direct' : journey[idx - 1],
      userAgent,
      browserLanguage: 'en-US',
      platform: 'Win32',
    });
  }

  // 3) Read back visitor timeline
  const activityResp = await axios.get(`${base}/visitors/${visitorId}/activity`, {
    params: { limit: 100 },
  });
  const data = activityResp.data || {};
  const timeline = data.timeline || [];
  const pagesVisited = data.pagesVisited || [];
  const firstLanding = timeline
    .filter((x) => x.type === 'view')
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .find((x) => x.raw?.isLandingPage);

  console.log('\nValidation summary:');
  console.log('- Total timeline items:', timeline.length);
  console.log('- Unique pages visited:', pagesVisited.length);
  console.log('- Landing detected:', firstLanding?.pagePath || '(none)');
  console.log('- Last 4 path events:');
  timeline
    .filter((x) => x.type === 'view')
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-4)
    .forEach((x) => {
      console.log(`  • ${x.pagePath} @ ${new Date(x.timestamp).toLocaleTimeString()}`);
    });

  const hasJourney = journey.every((p) => timeline.some((x) => x.type === 'view' && x.pagePath === p));
  if (!hasJourney) {
    throw new Error('Journey validation failed: some pages missing from timeline');
  }
  if (!firstLanding) {
    throw new Error('Landing page flag not detected in timeline');
  }
  console.log('\nValidation passed.');
}

run().catch((err) => {
  console.error('Validation failed:', err?.response?.data || err.message || err);
  process.exit(1);
});

