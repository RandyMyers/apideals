/**
 * llms.txt Controller
 * Serves a DB-aware llms.txt for AI crawlers / answer engines.
 */

const { generateLlmsTxt } = require('../utils/llmsGenerator');

let SEOSettings;
try {
  SEOSettings = require('../models/seoSettings');
} catch (e) {
  SEOSettings = null;
}

exports.getLlmsTxt = async (req, res) => {
  try {
    const baseUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
    let siteName = 'DealCouponz';

    if (SEOSettings && typeof SEOSettings.getSettings === 'function') {
      try {
        const settings = await SEOSettings.getSettings();
        if (settings && settings.siteName) {
          siteName = settings.siteName;
        }
      } catch (dbError) {
        console.warn('Could not load SEO settings for llms.txt, using defaults:', dbError.message);
      }
    }

    const llms = generateLlmsTxt({ baseUrl, siteName });

    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=86400');
    res.status(200).send(llms);
  } catch (error) {
    console.error('Error generating llms.txt:', error);
    res.status(500).json({ error: 'Failed to generate llms.txt', message: error.message });
  }
};
