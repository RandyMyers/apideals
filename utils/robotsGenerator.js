/**
 * Robots.txt Generator
 * Generates dynamic robots.txt file
 */

// Canonical list of AI crawlers / answer engines we expose a policy for.
const AI_CRAWLERS = [
  'GPTBot', // OpenAI / ChatGPT
  'OAI-SearchBot', // OpenAI SearchGPT
  'ChatGPT-User', // ChatGPT browsing
  'ClaudeBot', // Anthropic
  'Claude-Web', // Anthropic
  'anthropic-ai', // Anthropic
  'PerplexityBot', // Perplexity
  'Perplexity-User', // Perplexity browsing
  'Google-Extended', // Google Gemini / Vertex
  'Applebot-Extended', // Apple Intelligence
  'CCBot', // Common Crawl (feeds many LLMs)
  'Bytespider', // TikTok / Doubao
  'cohere-ai', // Cohere
];

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
    aiCrawlers = { allowAll: true, blockedBots: [] },
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

  // Sitemap (both the main sitemap and the sitemap index)
  if (sitemapUrl) {
    robots += `\nSitemap: ${sitemapUrl}\n`;
  } else {
    robots += `\nSitemap: ${baseUrl}/sitemap.xml\n`;
  }
  robots += `Sitemap: ${baseUrl}/sitemap-index.xml\n`;

  const appendDisallows = () => {
    disallowPaths.forEach((path) => {
      robots += `Disallow: ${path}\n`;
    });
  };

  // Mirror disallow rules for major crawlers (blanket Allow: / was letting Google index auth flows)
  robots += '\nUser-agent: Googlebot\n';
  robots += 'Allow: /\n';
  appendDisallows();

  robots += '\nUser-agent: Bingbot\n';
  robots += 'Allow: /\n';
  appendDisallows();

  // AI crawlers / answer engines — policy is admin-configurable. By default we
  // ALLOW for citation visibility (GEO/AIO) while keeping private/auth paths
  // disallowed. Admins can block the whole class or specific bots.
  const aiAllowAll = aiCrawlers.allowAll !== false;
  const blockedAiBots = new Set(
    (aiCrawlers.blockedBots || []).map((b) => String(b).toLowerCase())
  );
  AI_CRAWLERS.forEach((bot) => {
    robots += `\nUser-agent: ${bot}\n`;
    if (!aiAllowAll || blockedAiBots.has(bot.toLowerCase())) {
      robots += 'Disallow: /\n';
    } else {
      robots += 'Allow: /\n';
      appendDisallows();
    }
  });

  // Block aggressive SEO scrapers
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
      '/forgot-password',
      '/reset-password',
      '/submit-coupon',
      '/search',
      '/*/login',
      '/*/register',
      '/*/forgot-password',
      '/*/reset-password',
      '/*/submit-coupon',
      '/*/search',
      '/billing/',
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
  AI_CRAWLERS,
};

