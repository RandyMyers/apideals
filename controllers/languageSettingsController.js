/**
 * Language Settings Controller
 * Handles language settings API requests
 */

const LanguageSettings = require('../models/languageSettings');

/**
 * Get language settings
 */
exports.getLanguageSettings = async (req, res) => {
  try {
    const settings = await LanguageSettings.getSettings();
    
    // Don't send sensitive data
    const publicSettings = {
      enabledLanguages: settings.enabledLanguages.filter(lang => lang.isActive),
      defaultLanguage: settings.defaultLanguage,
      autoDetect: settings.autoDetect,
      urlStructure: settings.urlStructure,
      hreflangEnabled: settings.hreflangEnabled,
      xDefaultLanguage: settings.xDefaultLanguage,
    };

    res.json({
      success: true,
      settings: publicSettings,
    });
  } catch (error) {
    console.error('Error fetching language settings:', error);
    res.status(500).json({
      error: 'Failed to fetch language settings',
      message: error.message,
    });
  }
};

/**
 * Update language settings (admin only)
 */
exports.updateLanguageSettings = async (req, res) => {
  try {
    const settings = await LanguageSettings.getSettings();
    
    const {
      enabledLanguages,
      defaultLanguage,
      autoDetect,
      useBrowserLanguage,
      useGeolocation,
      urlStructure,
      hreflangEnabled,
      xDefaultLanguage,
      autoTranslate,
      translationProvider,
      translationApiKey,
    } = req.body;

    if (enabledLanguages) settings.enabledLanguages = enabledLanguages;
    if (defaultLanguage) settings.defaultLanguage = defaultLanguage;
    if (autoDetect !== undefined) settings.autoDetect = autoDetect;
    if (useBrowserLanguage !== undefined) settings.useBrowserLanguage = useBrowserLanguage;
    if (useGeolocation !== undefined) settings.useGeolocation = useGeolocation;
    if (urlStructure) settings.urlStructure = urlStructure;
    if (hreflangEnabled !== undefined) settings.hreflangEnabled = hreflangEnabled;
    if (xDefaultLanguage) settings.xDefaultLanguage = xDefaultLanguage;
    if (autoTranslate !== undefined) settings.autoTranslate = autoTranslate;
    if (translationProvider) settings.translationProvider = translationProvider;
    if (translationApiKey !== undefined) settings.translationApiKey = translationApiKey;

    await settings.save();

    res.json({
      success: true,
      message: 'Language settings updated successfully',
      settings: {
        enabledLanguages: settings.enabledLanguages.filter(lang => lang.isActive),
        defaultLanguage: settings.defaultLanguage,
        autoDetect: settings.autoDetect,
        urlStructure: settings.urlStructure,
        hreflangEnabled: settings.hreflangEnabled,
        xDefaultLanguage: settings.xDefaultLanguage,
      },
    });
  } catch (error) {
    console.error('Error updating language settings:', error);
    res.status(500).json({
      error: 'Failed to update language settings',
      message: error.message,
    });
  }
};

