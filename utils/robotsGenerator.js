/**
 * Robots.txt Generator
 * Generates dynamic robots.txt file
 */

/**
 * Generate robots.txt content
 */
const generateRobotsTxt = (options = {}) => {
  const {
    allowAll = true,
    disallowPaths = [],
    allowPaths = [],
    sitemapUrl = null,
    crawlDelay = null,
    baseUrl = 'https://dealcouponz.com',
  } = options;

  let robots = '';

  // User-agent rules
  robots += 'User-agent: *\n';

  if (allowAll && disallowPaths.length === 0) {
    robots += 'Allow: /\n';
  } else {
    // Add allow paths
    if (allowPaths.length > 0) {
      allowPaths.forEach((path) => {
        robots += `Allow: ${path}\n`;
      });
    } else {
      // Default allow if no specific paths
      robots += 'Allow: /\n';
    }

    // Add disallow paths
    disallowPaths.forEach((path) => {
      robots += `Disallow: ${path}\n`;
    });
  }

  if (crawlDelay) {
    robots += `Crawl-delay: ${crawlDelay}\n`;
  }

  // Sitemap
  if (sitemapUrl) {
    robots += `\nSitemap: ${sitemapUrl}\n`;
  } else {
    robots += `\nSitemap: ${baseUrl}/sitemap.xml\n`;
  }

  // Specific user agents
  robots += '\nUser-agent: Googlebot\n';
  robots += 'Allow: /\n';

  robots += '\nUser-agent: Bingbot\n';
  robots += 'Allow: /\n';

  // Block bad bots
  robots += '\nUser-agent: AhrefsBot\n';
  robots += 'Disallow: /\n';

  robots += '\nUser-agent: SemrushBot\n';
  robots += 'Disallow: /\n';

  robots += '\nUser-agent: DotBot\n';
  robots += 'Disallow: /\n';

  return robots;
};

/**
 * Get default robots.txt configuration
 */
const getDefaultRobotsConfig = () => {
  return {
    allowAll: true,
    disallowPaths: [
      '/api/',
      '/admin/',
      '/dashboard/',
      '/profile/',
      '/my-submissions/',
      '/auth/',
      '/login',
      '/register',
      '/_next/',
      '/static/',
    ],
    allowPaths: [],
    sitemapUrl: null,
    crawlDelay: null,
  };
};

module.exports = {
  generateRobotsTxt,
  getDefaultRobotsConfig,
};

