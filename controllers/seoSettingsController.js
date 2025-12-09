/**
 * SEO Settings Controller
 * Handles SEO settings management
 */

const SEOSettings = require('../models/seoSettings');

/**
 * Get public SEO settings (verification tags only)
 */
exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await SEOSettings.getSettings();
    
    // Only return meta verification tags (public data)
    res.status(200).json({
      metaVerification: settings.metaVerification || {
        google: '',
        bing: '',
        yandex: '',
        pinterest: '',
        facebook: '',
        custom: [],
      },
    });
  } catch (error) {
    console.error('Error fetching public SEO settings:', error);
    res.status(500).json({
      error: 'Failed to fetch SEO settings',
      message: error.message,
    });
  }
};

/**
 * Get SEO settings
 */
exports.getSettings = async (req, res) => {
  try {
    const settings = await SEOSettings.getSettings();
    
    // Don't send sensitive data (like refresh tokens) unless necessary
    const settingsToSend = {
      ...settings.toObject(),
      searchConsole: {
        ...settings.searchConsole,
        clientSecret: undefined, // Don't send client secret
        refreshToken: settings.searchConsole.enabled ? settings.searchConsole.refreshToken : undefined,
      },
    };

    res.status(200).json(settingsToSend);
  } catch (error) {
    console.error('Error fetching SEO settings:', error);
    res.status(500).json({
      error: 'Failed to fetch SEO settings',
      message: error.message,
    });
  }
};

/**
 * Update SEO settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    
    // Update settings
    const settings = await SEOSettings.updateSettings(updates);

    // Don't send sensitive data in response
    const settingsToSend = {
      ...settings.toObject(),
      searchConsole: {
        ...settings.searchConsole,
        clientSecret: undefined,
      },
    };

    res.status(200).json({
      message: 'SEO settings updated successfully',
      settings: settingsToSend,
    });
  } catch (error) {
    console.error('Error updating SEO settings:', error);
    res.status(500).json({
      error: 'Failed to update SEO settings',
      message: error.message,
    });
  }
};

