/**
 * Notification Template Controller
 * Handles notification template CRUD operations (admin only)
 */

const NotificationTemplate = require('../models/notificationTemplate');

/**
 * Get all notification templates
 * GET /api/v1/notification-templates
 */
exports.getAllTemplates = async (req, res) => {
  try {
    const { type, category, isActive } = req.query;
    const query = {};

    if (type) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const templates = await NotificationTemplate.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      templates,
      count: templates.length,
    });
  } catch (error) {
    console.error('Error getting notification templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification templates',
      error: error.message,
    });
  }
};

/**
 * Get template by ID
 * GET /api/v1/notification-templates/:id
 */
exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await NotificationTemplate.findById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    res.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching template',
      error: error.message,
    });
  }
};

/**
 * Create notification template
 * POST /api/v1/notification-templates
 */
exports.createTemplate = async (req, res) => {
  try {
    const {
      name,
      title,
      message,
      type,
      category,
      placeholders,
      icon,
      color,
      priority,
      description,
    } = req.body;

    // Validate required fields
    if (!name || !title || !message || !type || !category) {
      return res.status(400).json({
        success: false,
        message: 'name, title, message, type, and category are required',
      });
    }

    // Check if template name already exists
    const existingTemplate = await NotificationTemplate.findOne({ name });
    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Template with this name already exists',
      });
    }

    const template = new NotificationTemplate({
      name,
      title,
      message,
      type,
      category,
      placeholders: placeholders || [],
      icon: icon || 'FiInfo',
      color: color || '#3B82F6',
      priority: priority || 'medium',
      description: description || '',
    });

    await template.save();

    res.status(201).json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating template',
      error: error.message,
    });
  }
};

/**
 * Update notification template
 * PUT /api/v1/notification-templates/:id
 */
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow updating the name (it's used as identifier)
    if (updateData.name) {
      delete updateData.name;
    }

    const template = await NotificationTemplate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    res.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating template',
      error: error.message,
    });
  }
};

/**
 * Delete notification template
 * DELETE /api/v1/notification-templates/:id
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await NotificationTemplate.findByIdAndDelete(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting template',
      error: error.message,
    });
  }
};

/**
 * Seed default notification templates
 * POST /api/v1/notification-templates/seed
 */
exports.seedTemplates = async (req, res) => {
  try {
    // This will be implemented in the seed script
    res.json({
      success: true,
      message: 'Use the seed script: node scripts/seedNotificationTemplates.js',
    });
  } catch (error) {
    console.error('Error seeding templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error seeding templates',
      error: error.message,
    });
  }
};


