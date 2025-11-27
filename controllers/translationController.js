/**
 * Translation Controller
 * Handles translation API requests
 */

const Translation = require('../models/translation');

/**
 * Get translations for a specific language (public)
 * Returns formatted translations for react-i18next
 */
exports.getTranslations = async (req, res) => {
  try {
    const { lang } = req.params;
    
    // Validate language code
    const supportedLanguages = ['en', 'ga', 'de', 'es', 'it', 'no', 'fi', 'da', 'sv'];
    const language = supportedLanguages.includes(lang) ? lang : 'en';
    
    // Get translations formatted for react-i18next
    const translations = await Translation.getTranslationsForLanguage(language);
    
    res.json({
      success: true,
      language,
      translations,
    });
  } catch (error) {
    console.error('Error fetching translations:', error);
    res.status(500).json({
      error: 'Failed to fetch translations',
      message: error.message,
    });
  }
};

/**
 * Get all translations (admin)
 */
exports.getAllTranslations = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    
    const query = {};
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Search in key or English translation
    if (search) {
      query.$or = [
        { key: { $regex: search, $options: 'i' } },
        { en: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [translations, total] = await Promise.all([
      Translation.find(query)
        .sort({ category: 1, key: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Translation.countDocuments(query),
    ]);
    
    res.json({
      success: true,
      translations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching all translations:', error);
    res.status(500).json({
      error: 'Failed to fetch translations',
      message: error.message,
    });
  }
};

/**
 * Get single translation by key (admin)
 */
exports.getTranslationByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const translation = await Translation.getTranslationByKey(key);
    
    if (!translation) {
      return res.status(404).json({
        error: 'Translation not found',
      });
    }
    
    res.json({
      success: true,
      translation,
    });
  } catch (error) {
    console.error('Error fetching translation:', error);
    res.status(500).json({
      error: 'Failed to fetch translation',
      message: error.message,
    });
  }
};

/**
 * Create new translation (admin)
 */
exports.createTranslation = async (req, res) => {
  try {
    const {
      key,
      category,
      en,
      es,
      fr,
      de,
      it,
      pt,
      nl,
      ar,
      zh,
      ja,
      ko,
      ru,
      hi,
      description,
      context,
    } = req.body;
    
    // Validate required fields
    if (!key || !en) {
      return res.status(400).json({
        error: 'Key and English translation (en) are required',
      });
    }
    
    // Check if translation already exists
    const exists = await Translation.translationExists(key);
    if (exists) {
      return res.status(400).json({
        error: 'Translation key already exists',
      });
    }
    
    // Create translation
    const translation = await Translation.create({
      key: key.toLowerCase().trim(),
      category: category || 'common',
      en: en.trim(),
      es: es?.trim(),
      fr: fr?.trim(),
      de: de?.trim(),
      it: it?.trim(),
      pt: pt?.trim(),
      nl: nl?.trim(),
      ar: ar?.trim(),
      zh: zh?.trim(),
      ja: ja?.trim(),
      ko: ko?.trim(),
      ru: ru?.trim(),
      hi: hi?.trim(),
      description: description?.trim(),
      context: context?.trim(),
    });
    
    res.status(201).json({
      success: true,
      message: 'Translation created successfully',
      translation,
    });
  } catch (error) {
    console.error('Error creating translation:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Translation key already exists',
      });
    }
    
    res.status(500).json({
      error: 'Failed to create translation',
      message: error.message,
    });
  }
};

/**
 * Update translation (admin)
 */
exports.updateTranslation = async (req, res) => {
  try {
    const { key } = req.params;
    const updateData = req.body;
    
    // Remove key from update data (can't change key)
    delete updateData.key;
    
    // Normalize string fields
    const stringFields = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ar', 'zh', 'ja', 'ko', 'ru', 'hi', 'description', 'context'];
    stringFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateData[field] = updateData[field]?.trim();
      }
    });
    
    const translation = await Translation.findOneAndUpdate(
      { key: key.toLowerCase() },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!translation) {
      return res.status(404).json({
        error: 'Translation not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Translation updated successfully',
      translation,
    });
  } catch (error) {
    console.error('Error updating translation:', error);
    res.status(500).json({
      error: 'Failed to update translation',
      message: error.message,
    });
  }
};

/**
 * Delete translation (admin)
 */
exports.deleteTranslation = async (req, res) => {
  try {
    const { key } = req.params;
    
    const translation = await Translation.findOneAndDelete({ key: key.toLowerCase() });
    
    if (!translation) {
      return res.status(404).json({
        error: 'Translation not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Translation deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting translation:', error);
    res.status(500).json({
      error: 'Failed to delete translation',
      message: error.message,
    });
  }
};

/**
 * Bulk create/update translations (admin)
 */
exports.bulkUpdateTranslations = async (req, res) => {
  try {
    const { translations } = req.body;
    
    if (!Array.isArray(translations)) {
      return res.status(400).json({
        error: 'Translations must be an array',
      });
    }
    
    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };
    
    for (const trans of translations) {
      try {
        if (!trans.key || !trans.en) {
          results.errors.push({
            key: trans.key || 'unknown',
            error: 'Key and English translation required',
          });
          continue;
        }
        
        const exists = await Translation.translationExists(trans.key);
        
        if (exists) {
          await Translation.findOneAndUpdate(
            { key: trans.key.toLowerCase() },
            { $set: trans },
            { runValidators: true }
          );
          results.updated++;
        } else {
          await Translation.create({
            ...trans,
            key: trans.key.toLowerCase().trim(),
          });
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          key: trans.key || 'unknown',
          error: error.message,
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Bulk update completed',
      results,
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      error: 'Failed to bulk update translations',
      message: error.message,
    });
  }
};

/**
 * Get translation statistics (admin)
 */
exports.getTranslationStats = async (req, res) => {
  try {
    const stats = await Translation.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ]);
    
    const languageStats = await Translation.aggregate([
      {
        $project: {
          en: { $cond: [{ $ne: ['$en', null] }, 1, 0] },
          ga: { $cond: [{ $ne: ['$ga', null] }, 1, 0] },
          de: { $cond: [{ $ne: ['$de', null] }, 1, 0] },
          es: { $cond: [{ $ne: ['$es', null] }, 1, 0] },
          it: { $cond: [{ $ne: ['$it', null] }, 1, 0] },
          no: { $cond: [{ $ne: ['$no', null] }, 1, 0] },
          fi: { $cond: [{ $ne: ['$fi', null] }, 1, 0] },
          da: { $cond: [{ $ne: ['$da', null] }, 1, 0] },
          sv: { $cond: [{ $ne: ['$sv', null] }, 1, 0] },
        },
      },
      {
        $group: {
          _id: null,
          en: { $sum: '$en' },
          ga: { $sum: '$ga' },
          de: { $sum: '$de' },
          es: { $sum: '$es' },
          it: { $sum: '$it' },
          no: { $sum: '$no' },
          fi: { $sum: '$fi' },
          da: { $sum: '$da' },
          sv: { $sum: '$sv' },
        },
      },
    ]);
    
    const total = await Translation.countDocuments();
    
    res.json({
      success: true,
      stats: {
        total,
        byCategory: stats,
        byLanguage: languageStats[0] || {},
      },
    });
  } catch (error) {
    console.error('Error fetching translation stats:', error);
    res.status(500).json({
      error: 'Failed to fetch translation statistics',
      message: error.message,
    });
  }
};

