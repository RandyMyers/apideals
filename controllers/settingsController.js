const Settings = require('../models/settings');

// Get a setting by key (admin only)
exports.getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Settings.findOne({ key });
    
    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    // Don't expose secret keys
    if (setting.key.includes('secret') || setting.key.includes('password')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all settings (admin only)
exports.getAllSettings = async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    
    const settings = await Settings.find(query).sort({ key: 1 });
    
    // Filter out secret keys
    const safeSettings = settings.map(setting => {
      const settingObj = setting.toObject();
      if (setting.key.includes('secret') || setting.key.includes('password')) {
        settingObj.value = '***HIDDEN***';
      }
      return settingObj;
    });

    res.status(200).json(safeSettings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get public settings (for frontend)
exports.getPublicSettings = async (req, res) => {
  try {
    const publicSettings = await Settings.getPublicSettings();
    res.status(200).json(publicSettings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a setting (admin only)
exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description, category, isPublic } = req.body;

    const setting = await Settings.findOneAndUpdate(
      { key },
      { value, description, category, isPublic, updatedAt: Date.now() },
      { new: true, upsert: true }
    );

    res.status(200).json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new setting (admin only)
exports.createSetting = async (req, res) => {
  try {
    const { key, value, description, category, isPublic } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ message: 'Key and value are required' });
    }

    const setting = new Settings({
      key,
      value,
      description: description || '',
      category: category || 'general',
      isPublic: isPublic || false,
    });

    await setting.save();
    res.status(201).json(setting);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Setting with this key already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

