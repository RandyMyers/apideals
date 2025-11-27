/**
 * Robots.txt Controller
 * Handles robots.txt generation requests
 */

const { generateRobotsTxt, getDefaultRobotsConfig } = require('../utils/robotsGenerator');
const SEOSettings = require('../models/seoSettings');

/**
 * Get robots.txt
 */
exports.getRobotsTxt = async (req, res) => {
  try {
    const baseUrl = process.env.CLIENT_URL || req.protocol + '://' + req.get('host');

    // Try to get configuration from database
    let config = getDefaultRobotsConfig();
    
    try {
      const settings = await SEOSettings.getSettings();
      if (settings && settings.robotsTxt) {
        config = {
          allowAll: settings.robotsTxt.allowAll !== undefined ? settings.robotsTxt.allowAll : config.allowAll,
          disallowPaths: settings.robotsTxt.disallowPaths || config.disallowPaths,
          allowPaths: settings.robotsTxt.allowPaths || config.allowPaths,
          crawlDelay: settings.robotsTxt.crawlDelay || config.crawlDelay,
        };
      }
    } catch (dbError) {
      console.warn('Could not load SEO settings from database, using defaults:', dbError.message);
      // Continue with default config
    }

    config.sitemapUrl = `${baseUrl}/sitemap.xml`;
    config.baseUrl = baseUrl;

    const robotsTxt = generateRobotsTxt(config);

    res.set('Content-Type', 'text/plain');
    res.status(200).send(robotsTxt);
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    res.status(500).json({
      error: 'Failed to generate robots.txt',
      message: error.message,
    });
  }
};

