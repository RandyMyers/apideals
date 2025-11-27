/**
 * Search Console Controller
 * Handles Search Console API requests
 */

const searchConsoleService = require('../services/searchConsoleService');
const SearchConsoleSettings = require('../models/searchConsoleSettings');

/**
 * Get OAuth authorization URL
 */
exports.getAuthUrl = async (req, res) => {
  try {
    // Initialize service first
    await searchConsoleService.initialize();
    const url = searchConsoleService.getAuthorizationUrl();
    res.json({ authUrl: url });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to generate auth URL',
      message: error.message,
    });
  }
};

/**
 * Handle OAuth callback
 */
exports.handleOAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        error: 'Authorization code is required',
      });
    }

    // Initialize service first
    await searchConsoleService.initialize();
    await searchConsoleService.exchangeCodeForTokens(code);
    
    // Redirect to admin settings page
    const adminUrl = process.env.ADMIN_URL || 'http://localhost:3000';
    res.redirect(`${adminUrl}/seo-settings?searchConsole=connected`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const adminUrl = process.env.ADMIN_URL || 'http://localhost:3000';
    res.redirect(`${adminUrl}/seo-settings?searchConsole=error&message=${encodeURIComponent(error.message)}`);
  }
};

/**
 * Get Search Console settings
 */
exports.getSettings = async (req, res) => {
  try {
    const settings = await SearchConsoleSettings.getOrCreateSettings();
    
    // Don't send sensitive data
    res.json({
      isConfigured: settings.isOAuthConfigured(),
      isAuthenticated: settings.isAuthenticated(),
      autoSubmitSitemap: settings.autoSubmitSitemap,
      syncEnabled: settings.syncEnabled,
      syncFrequency: settings.syncFrequency,
      verifiedSites: settings.verifiedSites,
      sitemapUrls: settings.sitemapUrls,
      lastSyncAt: settings.lastSyncAt,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch settings',
      message: error.message,
    });
  }
};

/**
 * Update Search Console settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const settings = await SearchConsoleSettings.getOrCreateSettings();
    
    const {
      clientId,
      clientSecret,
      autoSubmitSitemap,
      syncEnabled,
      syncFrequency,
    } = req.body;

    if (clientId) settings.clientId = clientId;
    if (clientSecret) settings.clientSecret = clientSecret;
    if (autoSubmitSitemap !== undefined) settings.autoSubmitSitemap = autoSubmitSitemap;
    if (syncEnabled !== undefined) settings.syncEnabled = syncEnabled;
    if (syncFrequency) settings.syncFrequency = syncFrequency;

    await settings.save();

    res.json({
      message: 'Settings updated successfully',
      settings: {
        isConfigured: settings.isOAuthConfigured(),
        autoSubmitSitemap: settings.autoSubmitSitemap,
        syncEnabled: settings.syncEnabled,
        syncFrequency: settings.syncFrequency,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update settings',
      message: error.message,
    });
  }
};

/**
 * Disconnect Search Console
 */
exports.disconnect = async (req, res) => {
  try {
    const settings = await SearchConsoleSettings.getOrCreateSettings();
    
    settings.accessToken = null;
    settings.refreshToken = null;
    settings.tokenExpiry = null;
    settings.isActive = false;
    await settings.save();

    res.json({ message: 'Disconnected successfully' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to disconnect',
      message: error.message,
    });
  }
};

/**
 * Get verified sites
 */
exports.getSites = async (req, res) => {
  try {
    const sites = await searchConsoleService.getSites();
    res.json({ sites });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch sites',
      message: error.message,
    });
  }
};

/**
 * Get search analytics
 */
exports.getSearchAnalytics = async (req, res) => {
  try {
    const { siteUrl } = req.params;
    const {
      startDate,
      endDate,
      dimensions,
      rowLimit,
      startRow,
    } = req.query;

    const options = {
      startDate,
      endDate,
      dimensions: dimensions ? dimensions.split(',') : undefined,
      rowLimit: rowLimit ? parseInt(rowLimit) : undefined,
      startRow: startRow ? parseInt(startRow) : undefined,
    };

    const data = await searchConsoleService.getSearchAnalytics(siteUrl, options);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch search analytics',
      message: error.message,
    });
  }
};

/**
 * Submit sitemap
 */
exports.submitSitemap = async (req, res) => {
  try {
    const { siteUrl } = req.params;
    const { sitemapUrl } = req.body;

    if (!sitemapUrl) {
      return res.status(400).json({
        error: 'Sitemap URL is required',
      });
    }

    const result = await searchConsoleService.submitSitemap(siteUrl, sitemapUrl);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to submit sitemap',
      message: error.message,
    });
  }
};

/**
 * List sitemaps
 */
exports.listSitemaps = async (req, res) => {
  try {
    const { siteUrl } = req.params;
    const sitemaps = await searchConsoleService.listSitemaps(siteUrl);
    res.json({ sitemaps });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to list sitemaps',
      message: error.message,
    });
  }
};

/**
 * Delete sitemap
 */
exports.deleteSitemap = async (req, res) => {
  try {
    const { siteUrl, feedpath } = req.params;
    const result = await searchConsoleService.deleteSitemap(siteUrl, feedpath);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete sitemap',
      message: error.message,
    });
  }
};

