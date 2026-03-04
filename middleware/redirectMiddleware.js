const UrlRedirect = require('../models/urlRedirect');

/**
 * Common WordPress URL patterns that should redirect to homepage if not specifically mapped
 * These patterns indicate old WordPress URLs that should be caught
 */
const WORDPRESS_PATTERNS = [
  /^\/wp-/i,                    // WordPress admin/API paths: /wp-admin, /wp-content, /wp-includes, /wp-json
  /^\/wp\.php$/i,                // WordPress core file
  /^\/feed/i,                    // WordPress RSS feeds: /feed, /feed/rss, /feed/atom
  /\/feed\/?$/i,                 // WordPress feed URLs at end of paths: /product/xxx/feed/, /blog/xxx/feed
  /^\/author\//i,                // WordPress author pages: /author/username
  /^\/tag\//i,                   // WordPress tag pages: /tag/tagname
  /^\/date\//i,                  // WordPress date archives: /date/2024/01
  /^\/page\/\d+/i,               // WordPress pagination: /page/2, /page/3
  /^\/attachment\//i,            // WordPress attachment pages
  /^\/?index\.php/i,             // WordPress index.php
  /^\/?wp-login\.php/i,          // WordPress login
  /^\/?xmlrpc\.php/i,            // WordPress XML-RPC
];

/**
 * Check if a path matches WordPress patterns
 */
const isWordPressUrl = (path) => {
  return WORDPRESS_PATTERNS.some(pattern => pattern.test(path));
};

/**
 * Middleware to check for URL redirects before serving React app
 * This should be placed AFTER API routes but BEFORE the React app catch-all
 * 
 * SEO Strategy:
 * 1. Check database for specific redirects (highest priority)
 * 2. If no database redirect found, check if it's a WordPress URL pattern
 * 3. WordPress URLs without specific mappings redirect to homepage (preserves SEO link equity)
 * 4. All other URLs continue to React Router
 */
const redirectMiddleware = async (req, res, next) => {
  // Skip API routes, static files, and health checks
  if (
    req.path.startsWith('/api/') ||
    req.path.startsWith('/static/') ||
    req.path.startsWith('/_next/') ||
    req.path === '/health' ||
    req.path === '/robots.txt' ||
    req.path === '/sitemap.xml' ||
    req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)
  ) {
    return next();
  }
  
  try {
    // Normalize the path - try multiple variations to match database entries
    const pathLower = req.path.toLowerCase().trim();
    // Remove multiple leading slashes, ensure single leading slash
    let cleanPath = pathLower.replace(/^\/+/, '/');
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }
    // Create variations: with and without trailing slash
    const pathWithoutTrailingSlash = cleanPath.replace(/\/+$/, '');
    const pathWithTrailingSlash = pathWithoutTrailingSlash + '/';
    
    // Step 1: Check database for specific redirect (highest priority)
    // Try multiple variations to handle database entries stored in different formats
    const redirect = await UrlRedirect.findOne({
      $or: [
        { oldPath: pathWithoutTrailingSlash, isActive: true },
        { oldPath: pathWithTrailingSlash, isActive: true },
        { oldPath: cleanPath, isActive: true },
        { oldPath: pathLower, isActive: true }
      ]
    });
    
    if (redirect) {
      // Validate redirect has required fields (defensive programming)
      if (!redirect.newPath || !redirect.redirectType) {
        console.warn(`[Redirect] Invalid redirect found (missing newPath or redirectType): ${redirect._id}`);
        return next();
      }
      
      // Record the hit (async, don't await to avoid blocking the redirect)
      redirect.recordHit().catch(err => {
        console.error('[Redirect] Error recording hit:', err.message);
      });
      
      // Perform redirect immediately
      return res.redirect(redirect.redirectType, redirect.newPath);
    }
    
    // Step 2: Check if this is a WordPress URL pattern without a specific mapping
    // Redirect unknown WordPress URLs to homepage to preserve SEO link equity
    if (isWordPressUrl(req.path)) {
      console.log(`[Redirect] WordPress URL pattern detected, redirecting to homepage: ${req.path}`);
      return res.redirect(301, '/');
    }
    
    // Step 3: No redirect found - continue to next middleware (React Router)
    next();
  } catch (error) {
    console.error('Error in redirect middleware:', error);
    // On error, continue to next middleware (don't break the app)
    next();
  }
};

module.exports = redirectMiddleware;



