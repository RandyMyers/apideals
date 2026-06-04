const cron = require('node-cron');
const exchangeRateService = require('../services/exchangeRateService');
const ExchangeRateSnapshot = require('../models/exchangeRateSnapshot');
const { logger } = require('../utils/logger');

/** 06:00 and 18:00 UTC daily */
const syncExchangeRatesJob = cron.schedule('0 6,18 * * *', async () => {
  try {
    await exchangeRateService.syncExchangeRatesFromApi();
  } catch (error) {
    logger.error('[Exchange Rate Job] Sync failed', { error: error.message });
  }
}, { scheduled: false });

async function ensureInitialRates() {
  try {
    const latest = await ExchangeRateSnapshot.getLatest();
    if (!latest) {
      logger.info('[Exchange Rate Job] No snapshot found — running initial sync');
      await exchangeRateService.syncExchangeRatesFromApi();
    }
  } catch (error) {
    logger.warn('[Exchange Rate Job] Initial sync failed (will retry on schedule)', {
      error: error.message,
    });
  }
}

const startExchangeRateJobs = async () => {
  await ensureInitialRates();
  syncExchangeRatesJob.start();
  logger.info('[Exchange Rate Job] Scheduled (06:00 & 18:00 UTC)');
};

const stopExchangeRateJobs = () => {
  syncExchangeRatesJob.stop();
};

module.exports = {
  startExchangeRateJobs,
  stopExchangeRateJobs,
  syncExchangeRatesJob,
  ensureInitialRates,
};
