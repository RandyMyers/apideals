/**
 * XML Sitemap Generator
 * Generates dynamic XML sitemaps for search engines
 */

const xmlbuilder = require('xmlbuilder');
const LanguageSettings = require('../models/languageSettings');

/**
 * Helper function to generate language-specific URL
 */
const generateLanguageUrl = (path, langCode, defaultLang, baseUrl) => {
  if (langCode === defaultLang) {
    return `${baseUrl}${path}`;
  }
  return `${baseUrl}/${langCode}${path}`;
};

/**
 * Add hreflang links to a URL element
 */
const addHreflangLinks = (urlElement, path, languages, defaultLang, baseUrl) => {
  languages.forEach((lang) => {
    const link = urlElement.ele('xhtml:link');
    link.att('rel', 'alternate');
    link.att('hreflang', lang.locale || lang.code);
    link.att('href', generateLanguageUrl(path, lang.code, defaultLang, baseUrl));
  });
  
  // Add x-default
  const xDefaultLink = urlElement.ele('xhtml:link');
  xDefaultLink.att('rel', 'alternate');
  xDefaultLink.att('hreflang', 'x-default');
  xDefaultLink.att('href', `${baseUrl}${path}`);
};

/**
 * Generate XML sitemap
 */
const generateSitemap = async (models, baseUrl = 'https://dealcouponz.com') => {
  // Get language settings
  let languages = [];
  let defaultLang = 'en';
  let hreflangEnabled = false;
  
  try {
    const langSettings = await LanguageSettings.getSettings();
    if (langSettings && langSettings.hreflangEnabled) {
      languages = langSettings.enabledLanguages.filter(lang => lang.isActive);
      defaultLang = langSettings.defaultLanguage || 'en';
      hreflangEnabled = langSettings.hreflangEnabled;
    }
  } catch (error) {
    console.warn('Could not load language settings for sitemap, continuing without hreflang:', error.message);
  }

  const root = xmlbuilder.create('urlset', {
    version: '1.0',
    encoding: 'UTF-8',
  })
    .att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
    .att('xmlns:news', 'http://www.google.com/schemas/sitemap-news/0.9')
    .att('xmlns:xhtml', 'http://www.w3.org/1999/xhtml')
    .att('xmlns:image', 'http://www.google.com/schemas/sitemap-image/1.1')
    .att('xmlns:video', 'http://www.google.com/schemas/sitemap-video/1.1');

  // Static pages
  const staticPages = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/coupons/all', priority: '0.9', changefreq: 'daily' },
    { path: '/deals/all', priority: '0.9', changefreq: 'daily' },
    { path: '/stores', priority: '0.9', changefreq: 'daily' },
    { path: '/categories/all', priority: '0.8', changefreq: 'weekly' },
    { path: '/blog', priority: '0.8', changefreq: 'daily' },
    { path: '/about', priority: '0.7', changefreq: 'monthly' },
    { path: '/contact', priority: '0.7', changefreq: 'monthly' },
    { path: '/help', priority: '0.7', changefreq: 'weekly' },
    { path: '/faq', priority: '0.7', changefreq: 'weekly' },
    { path: '/pricing', priority: '0.6', changefreq: 'monthly' },
    { path: '/submit-coupon', priority: '0.6', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.5', changefreq: 'yearly' },
    { path: '/terms', priority: '0.5', changefreq: 'yearly' },
    { path: '/cookies', priority: '0.5', changefreq: 'yearly' },
  ];

  staticPages.forEach((page) => {
    const url = root.ele('url');
    url.ele('loc', `${baseUrl}${page.path}`);
    url.ele('lastmod', new Date().toISOString());
    url.ele('changefreq', page.changefreq);
    url.ele('priority', page.priority);
    
    // Add hreflang links if enabled
    if (hreflangEnabled && languages.length > 0) {
      addHreflangLinks(url, page.path, languages, defaultLang, baseUrl);
    }
  });

  try {
    // Dynamic pages - Coupons
    if (models.Coupon) {
      const coupons = await models.Coupon.find({ isActive: true })
        .select('slug updatedAt')
        .limit(10000)
        .lean();

      coupons.forEach((coupon) => {
        const path = `/coupons/${coupon.slug || coupon._id}`;
        const url = root.ele('url');
        url.ele('loc', `${baseUrl}${path}`);
        url.ele('lastmod', coupon.updatedAt ? new Date(coupon.updatedAt).toISOString() : new Date().toISOString());
        url.ele('changefreq', 'weekly');
        url.ele('priority', '0.8');
        
        // Add hreflang links if enabled
        if (hreflangEnabled && languages.length > 0) {
          addHreflangLinks(url, path, languages, defaultLang, baseUrl);
        }
      });
    }

    // Dynamic pages - Deals
    if (models.Deal) {
      const deals = await models.Deal.find({ isActive: true })
        .select('slug updatedAt')
        .limit(10000)
        .lean();

      deals.forEach((deal) => {
        const path = `/deals/${deal.slug || deal._id}`;
        const url = root.ele('url');
        url.ele('loc', `${baseUrl}${path}`);
        url.ele('lastmod', deal.updatedAt ? new Date(deal.updatedAt).toISOString() : new Date().toISOString());
        url.ele('changefreq', 'weekly');
        url.ele('priority', '0.8');
        
        // Add hreflang links if enabled
        if (hreflangEnabled && languages.length > 0) {
          addHreflangLinks(url, path, languages, defaultLang, baseUrl);
        }
      });
    }

    // Dynamic pages - Stores
    if (models.Store) {
      const stores = await models.Store.find({ isActive: true })
        .select('slug updatedAt')
        .limit(10000)
        .lean();

      stores.forEach((store) => {
        const path = `/stores/${store.slug || store._id}`;
        const url = root.ele('url');
        url.ele('loc', `${baseUrl}${path}`);
        url.ele('lastmod', store.updatedAt ? new Date(store.updatedAt).toISOString() : new Date().toISOString());
        url.ele('changefreq', 'weekly');
        url.ele('priority', '0.8');
        
        // Add hreflang links if enabled
        if (hreflangEnabled && languages.length > 0) {
          addHreflangLinks(url, path, languages, defaultLang, baseUrl);
        }
      });
    }

    // Dynamic pages - Categories
    if (models.Category) {
      const categories = await models.Category.find({ isActive: true })
        .select('slug updatedAt')
        .limit(1000)
        .lean();

      categories.forEach((category) => {
        const path = `/categories/${category.slug || category._id}`;
        const url = root.ele('url');
        url.ele('loc', `${baseUrl}${path}`);
        url.ele('lastmod', category.updatedAt ? new Date(category.updatedAt).toISOString() : new Date().toISOString());
        url.ele('changefreq', 'weekly');
        url.ele('priority', '0.7');
        
        // Add hreflang links if enabled
        if (hreflangEnabled && languages.length > 0) {
          addHreflangLinks(url, path, languages, defaultLang, baseUrl);
        }
      });
    }

    // Dynamic pages - Blog posts
    if (models.Blog) {
      const blogs = await models.Blog.find({ isPublished: true })
        .select('slug updatedAt')
        .limit(10000)
        .lean();

      blogs.forEach((blog) => {
        const path = `/blog/${blog.slug || blog._id}`;
        const url = root.ele('url');
        url.ele('loc', `${baseUrl}${path}`);
        url.ele('lastmod', blog.updatedAt ? new Date(blog.updatedAt).toISOString() : new Date().toISOString());
        url.ele('changefreq', 'monthly');
        url.ele('priority', '0.7');
        
        // Add hreflang links if enabled
        if (hreflangEnabled && languages.length > 0) {
          addHreflangLinks(url, path, languages, defaultLang, baseUrl);
        }
      });
    }

    // Dynamic pages - Help Articles
    if (models.HelpArticle) {
      const helpArticles = await models.HelpArticle.find({ isPublished: true })
        .select('slug updatedAt')
        .limit(1000)
        .lean();

      helpArticles.forEach((article) => {
        const path = `/help/${article.slug || article._id}`;
        const url = root.ele('url');
        url.ele('loc', `${baseUrl}${path}`);
        url.ele('lastmod', article.updatedAt ? new Date(article.updatedAt).toISOString() : new Date().toISOString());
        url.ele('changefreq', 'monthly');
        url.ele('priority', '0.6');
        
        // Add hreflang links if enabled
        if (hreflangEnabled && languages.length > 0) {
          addHreflangLinks(url, path, languages, defaultLang, baseUrl);
        }
      });
    }
  } catch (error) {
    console.error('Error generating dynamic sitemap entries:', error);
    // Continue with static pages even if dynamic pages fail
  }

  return root.end({ pretty: true });
};

/**
 * Generate sitemap index (for large sites with multiple sitemaps)
 */
const generateSitemapIndex = (sitemaps, baseUrl = 'https://dealcouponz.com') => {
  const root = xmlbuilder.create('sitemapindex', {
    version: '1.0',
    encoding: 'UTF-8',
  })
    .att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

  sitemaps.forEach((sitemap) => {
    const sitemapElement = root.ele('sitemap');
    sitemapElement.ele('loc', `${baseUrl}${sitemap.path}`);
    sitemapElement.ele('lastmod', sitemap.lastmod || new Date().toISOString());
  });

  return root.end({ pretty: true });
};

/**
 * Generate image sitemap
 */
const generateImageSitemap = async (models, baseUrl = 'https://dealcouponz.com', maxItems = 10000) => {
  const root = xmlbuilder.create('urlset', {
    version: '1.0',
    encoding: 'UTF-8',
  })
    .att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
    .att('xmlns:image', 'http://www.google.com/schemas/sitemap-image/1.1');

  try {
    // Get images from coupons
    if (models.Coupon) {
      const coupons = await models.Coupon.find({ 
        isActive: true,
        imageUrl: { $exists: true, $ne: '' }
      })
        .select('slug imageUrl updatedAt')
        .limit(maxItems)
        .lean();

      coupons.forEach((coupon) => {
        if (coupon.imageUrl) {
          const url = root.ele('url');
          url.ele('loc', `${baseUrl}/coupons/${coupon.slug || coupon._id}`);
          url.ele('lastmod', coupon.updatedAt ? new Date(coupon.updatedAt).toISOString() : new Date().toISOString());
          const image = url.ele('image:image');
          image.ele('image:loc', coupon.imageUrl);
        }
      });
    }

    // Get images from stores
    if (models.Store) {
      const stores = await models.Store.find({ 
        isActive: true,
        logo: { $exists: true, $ne: '' }
      })
        .select('slug logo updatedAt')
        .limit(maxItems)
        .lean();

      stores.forEach((store) => {
        if (store.logo) {
          const url = root.ele('url');
          url.ele('loc', `${baseUrl}/stores/${store.slug || store._id}`);
          url.ele('lastmod', store.updatedAt ? new Date(store.updatedAt).toISOString() : new Date().toISOString());
          const image = url.ele('image:image');
          image.ele('image:loc', store.logo);
        }
      });
    }

    // Get images from blog posts
    if (models.Blog) {
      const blogs = await models.Blog.find({ 
        isPublished: true,
        featuredImage: { $exists: true, $ne: '' }
      })
        .select('slug featuredImage updatedAt')
        .limit(maxItems)
        .lean();

      blogs.forEach((blog) => {
        if (blog.featuredImage) {
          const url = root.ele('url');
          url.ele('loc', `${baseUrl}/blog/${blog.slug || blog._id}`);
          url.ele('lastmod', blog.updatedAt ? new Date(blog.updatedAt).toISOString() : new Date().toISOString());
          const image = url.ele('image:image');
          image.ele('image:loc', blog.featuredImage);
          if (blog.featuredImageAlt) {
            image.ele('image:title', blog.featuredImageAlt);
            image.ele('image:caption', blog.featuredImageAlt);
          }
        }
      });
    }
  } catch (error) {
    console.error('Error generating image sitemap entries:', error);
  }

  return root.end({ pretty: true });
};

/**
 * Generate news sitemap (for blog posts published in last 2 days)
 */
const generateNewsSitemap = async (models, baseUrl = 'https://dealcouponz.com') => {
  const root = xmlbuilder.create('urlset', {
    version: '1.0',
    encoding: 'UTF-8',
  })
    .att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
    .att('xmlns:news', 'http://www.google.com/schemas/sitemap-news/0.9');

  try {
    if (models.Blog) {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const blogs = await models.Blog.find({
        isPublished: true,
        createdAt: { $gte: twoDaysAgo },
      })
        .select('slug title createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean();

      blogs.forEach((blog) => {
        const url = root.ele('url');
        url.ele('loc', `${baseUrl}/blog/${blog.slug || blog._id}`);
        
        const news = url.ele('news:news');
        const publication = news.ele('news:publication');
        publication.ele('news:name', 'DealCouponz');
        publication.ele('news:language', 'en');
        
        news.ele('news:publication_date', new Date(blog.createdAt).toISOString());
        news.ele('news:title', blog.title);
      });
    }
  } catch (error) {
    console.error('Error generating news sitemap entries:', error);
  }

  return root.end({ pretty: true });
};

module.exports = {
  generateSitemap,
  generateSitemapIndex,
  generateImageSitemap,
  generateNewsSitemap,
};

