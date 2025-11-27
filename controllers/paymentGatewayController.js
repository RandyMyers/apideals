const PaymentGateway = require('../models/paymentGateway');
const { logger } = require('../utils/logger');

// Get all active payment gateways (public - for frontend)
exports.getActiveGateways = async (req, res) => {
  try {
    logger.info('Fetching active payment gateways');
    const gateways = await PaymentGateway.getActiveGateways();
    logger.info(`Found ${gateways.length} active payment gateways`);
    
    // Only return safe information (no metadata with sensitive data)
    const safeGateways = gateways.map(gw => ({
      name: gw.name,
      displayName: gw.displayName,
      icon: gw.icon,
      description: gw.description,
      supportedCurrencies: gw.supportedCurrencies
    }));
    
    logger.info('Returning gateways:', safeGateways.map(g => g.name).join(', '));
    
    res.status(200).json({
      success: true,
      gateways: safeGateways
    });
  } catch (error) {
    logger.error('Error getting active payment gateways:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch payment gateways',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all payment gateways (admin only)
exports.getAllGateways = async (req, res) => {
  try {
    const gateways = await PaymentGateway.getAllGateways();
    res.status(200).json({
      success: true,
      gateways
    });
  } catch (error) {
    logger.error('Error getting all payment gateways:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch payment gateways' 
    });
  }
};

// Update gateway status (admin only)
exports.updateGatewayStatus = async (req, res) => {
  try {
    const { gatewayName } = req.params;
    const { isActive, isEnabled } = req.body;

    const gateway = await PaymentGateway.findOne({ name: gatewayName });
    if (!gateway) {
      return res.status(404).json({ 
        success: false,
        message: 'Payment gateway not found' 
      });
    }

    if (isActive !== undefined) {
      gateway.isActive = isActive;
    }
    if (isEnabled !== undefined) {
      gateway.isEnabled = isEnabled;
    }

    await gateway.save();

    logger.info(`Payment gateway ${gatewayName} status updated`, {
      isActive: gateway.isActive,
      isEnabled: gateway.isEnabled
    });

    res.status(200).json({
      success: true,
      message: 'Gateway status updated successfully',
      gateway
    });
  } catch (error) {
    logger.error('Error updating gateway status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update gateway status' 
    });
  }
};

// Create or update gateway (admin only)
exports.createOrUpdateGateway = async (req, res) => {
  try {
    const { name, displayName, isActive, isEnabled, icon, description, supportedCurrencies, metadata } = req.body;

    if (!name || !displayName) {
      return res.status(400).json({ 
        success: false,
        message: 'Name and displayName are required' 
      });
    }

    const gateway = await PaymentGateway.findOneAndUpdate(
      { name },
      {
        displayName,
        isActive: isActive !== undefined ? isActive : true,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        icon: icon || '',
        description: description || '',
        supportedCurrencies: supportedCurrencies || [],
        metadata: metadata || {},
        updatedAt: Date.now()
      },
      { upsert: true, new: true }
    );

    logger.info(`Payment gateway ${name} created/updated`, gateway);

    res.status(200).json({
      success: true,
      message: 'Gateway created/updated successfully',
      gateway
    });
  } catch (error) {
    logger.error('Error creating/updating gateway:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create/update gateway' 
    });
  }
};


