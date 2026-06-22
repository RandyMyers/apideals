/**
 * Serves the IndexNow key verification file at /{key}.txt
 * (backup when the API host serves the public site root).
 */

const express = require('express');

const router = express.Router();

router.get('/:key.txt', async (req, res) => {
  let key = process.env.INDEXNOW_API_KEY || null;
  if (!key) {
    try {
      const SEOSettings = require('../models/seoSettings');
      const settings = await SEOSettings.getSettings();
      if (settings?.indexNow?.enabled !== false) {
        key = settings.indexNow.apiKey || null;
      }
    } catch (e) {
      // fall through to 404
    }
  }

  if (!key || req.params.key !== key) {
    return res.status(404).type('text/plain').send('Not found');
  }

  res.type('text/plain; charset=utf-8').send(key);
});

module.exports = router;
