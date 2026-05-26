const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * GET /api/v1/geo/ip
 * Proxy geolocation lookup (avoids browser CORS blocks on ipapi.co).
 */
router.get('/ip', async (req, res) => {
  try {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded)?.trim() || req.ip;
    const isLocal =
      !clientIp ||
      clientIp === '::1' ||
      clientIp === '127.0.0.1' ||
      clientIp.startsWith('::ffff:127.');

    const url = isLocal ? 'https://ipapi.co/json/' : `https://ipapi.co/${clientIp}/json/`;
    const { data } = await axios.get(url, { timeout: 8000 });

    res.json(data);
  } catch (error) {
    res.status(502).json({
      message: 'Geolocation lookup failed',
      error: error.message,
    });
  }
});

module.exports = router;
