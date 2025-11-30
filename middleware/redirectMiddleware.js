const UrlRedirect = require('../models/urlRedirect');

/**
 * Middleware to check for URL redirects before serving React app
 * This should be placed AFTER API routes but BEFORE the React app catch-all
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
    // Normalize the path
    const oldPath = req.path.toLowerCase().replace(/^\/+|\/+$/g, '');
    const normalizedPath = oldPath.startsWith('/') ? oldPath : '/' + oldPath;
    
    // Find active redirect
    const redirect = await UrlRedirect.findOne({
      oldPath: normalizedPath,
      isActive: true
    });
    
    if (redirect) {
      // Record the hit
      await redirect.recordHit();
      
      // Perform redirect
      return res.redirect(redirect.redirectType, redirect.newPath);
    }
    
    // No redirect found - continue to next middleware (React Router)
    next();
  } catch (error) {
    console.error('Error in redirect middleware:', error);
    // On error, continue to next middleware (don't break the app)
    next();
  }
};

module.exports = redirectMiddleware;


