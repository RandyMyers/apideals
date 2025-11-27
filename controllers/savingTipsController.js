/**
 * Saving Tips Controller
 * Handles CRUD operations for store-specific saving tips
 */

const Store = require('../models/store');
const adminMiddleware = require('../middleware/adminMiddleware');

/**
 * Get saving tips for a store
 * GET /api/v1/stores/:storeId/saving-tips
 */
exports.getSavingTips = async (req, res) => {
  try {
    const { storeId } = req.params;
    
    const store = await Store.findById(storeId).select('savingTips').lean();
    
    if (!store) {
      return res.status(404).json({ message: 'Store not found.' });
    }
    
    // Filter active tips and sort by order
    const activeTips = (store.savingTips || [])
      .filter(tip => tip.isActive !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(tip => ({
        _id: tip._id,
        tip: tip.tip,
        order: tip.order
      }));
    
    res.status(200).json({ tips: activeTips });
  } catch (error) {
    console.error('Error fetching saving tips:', error);
    res.status(500).json({
      message: 'Error fetching saving tips.',
      error: error.message,
    });
  }
};

/**
 * Add a saving tip to a store
 * POST /api/v1/stores/:storeId/saving-tips
 * Requires: auth + admin or store owner
 */
exports.addSavingTip = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { tip, order } = req.body;
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    
    if (!tip || tip.trim().length === 0) {
      return res.status(400).json({ message: 'Tip text is required.' });
    }
    
    if (tip.length > 500) {
      return res.status(400).json({ message: 'Tip text must be 500 characters or less.' });
    }
    
    const store = await Store.findById(storeId);
    
    if (!store) {
      return res.status(404).json({ message: 'Store not found.' });
    }
    
    // Check if user is admin or store owner
    const isAdmin = req.user?.userType === 'superAdmin' || req.user?.userType === 'admin';
    const isStoreOwner = store.userId?.toString() === userId?.toString();
    
    if (!isAdmin && !isStoreOwner) {
      return res.status(403).json({ message: 'Unauthorized. Only store owner or admin can add tips.' });
    }
    
    const newTip = {
      tip: tip.trim(),
      order: order || (store.savingTips?.length || 0),
      isActive: true,
      createdAt: new Date()
    };
    
    if (!store.savingTips) {
      store.savingTips = [];
    }
    
    store.savingTips.push(newTip);
    await store.save();
    
    res.status(201).json({
      message: 'Saving tip added successfully.',
      tip: newTip,
    });
  } catch (error) {
    console.error('Error adding saving tip:', error);
    res.status(500).json({
      message: 'Error adding saving tip.',
      error: error.message,
    });
  }
};

/**
 * Update a saving tip
 * PATCH /api/v1/stores/:storeId/saving-tips/:tipId
 * Requires: auth + admin or store owner
 */
exports.updateSavingTip = async (req, res) => {
  try {
    const { storeId, tipId } = req.params;
    const { tip, order, isActive } = req.body;
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    
    const store = await Store.findById(storeId);
    
    if (!store) {
      return res.status(404).json({ message: 'Store not found.' });
    }
    
    // Check if user is admin or store owner
    const isAdmin = req.user?.userType === 'superAdmin' || req.user?.userType === 'admin';
    const isStoreOwner = store.userId?.toString() === userId?.toString();
    
    if (!isAdmin && !isStoreOwner) {
      return res.status(403).json({ message: 'Unauthorized. Only store owner or admin can update tips.' });
    }
    
    const tipIndex = store.savingTips.findIndex(t => t._id.toString() === tipId);
    
    if (tipIndex === -1) {
      return res.status(404).json({ message: 'Saving tip not found.' });
    }
    
    if (tip !== undefined) {
      if (tip.trim().length === 0) {
        return res.status(400).json({ message: 'Tip text cannot be empty.' });
      }
      if (tip.length > 500) {
        return res.status(400).json({ message: 'Tip text must be 500 characters or less.' });
      }
      store.savingTips[tipIndex].tip = tip.trim();
    }
    
    if (order !== undefined) {
      store.savingTips[tipIndex].order = order;
    }
    
    if (isActive !== undefined) {
      store.savingTips[tipIndex].isActive = isActive;
    }
    
    await store.save();
    
    res.status(200).json({
      message: 'Saving tip updated successfully.',
      tip: store.savingTips[tipIndex],
    });
  } catch (error) {
    console.error('Error updating saving tip:', error);
    res.status(500).json({
      message: 'Error updating saving tip.',
      error: error.message,
    });
  }
};

/**
 * Delete a saving tip
 * DELETE /api/v1/stores/:storeId/saving-tips/:tipId
 * Requires: auth + admin or store owner
 */
exports.deleteSavingTip = async (req, res) => {
  try {
    const { storeId, tipId } = req.params;
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    
    const store = await Store.findById(storeId);
    
    if (!store) {
      return res.status(404).json({ message: 'Store not found.' });
    }
    
    // Check if user is admin or store owner
    const isAdmin = req.user?.userType === 'superAdmin' || req.user?.userType === 'admin';
    const isStoreOwner = store.userId?.toString() === userId?.toString();
    
    if (!isAdmin && !isStoreOwner) {
      return res.status(403).json({ message: 'Unauthorized. Only store owner or admin can delete tips.' });
    }
    
    const tipIndex = store.savingTips.findIndex(t => t._id.toString() === tipId);
    
    if (tipIndex === -1) {
      return res.status(404).json({ message: 'Saving tip not found.' });
    }
    
    store.savingTips.splice(tipIndex, 1);
    await store.save();
    
    res.status(200).json({ message: 'Saving tip deleted successfully.' });
  } catch (error) {
    console.error('Error deleting saving tip:', error);
    res.status(500).json({
      message: 'Error deleting saving tip.',
      error: error.message,
    });
  }
};

/**
 * Reorder saving tips
 * PATCH /api/v1/stores/:storeId/saving-tips/reorder
 * Requires: auth + admin or store owner
 */
exports.reorderSavingTips = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { tipIds } = req.body; // Array of tip IDs in desired order
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    
    if (!Array.isArray(tipIds)) {
      return res.status(400).json({ message: 'tipIds must be an array.' });
    }
    
    const store = await Store.findById(storeId);
    
    if (!store) {
      return res.status(404).json({ message: 'Store not found.' });
    }
    
    // Check if user is admin or store owner
    const isAdmin = req.user?.userType === 'superAdmin' || req.user?.userType === 'admin';
    const isStoreOwner = store.userId?.toString() === userId?.toString();
    
    if (!isAdmin && !isStoreOwner) {
      return res.status(403).json({ message: 'Unauthorized. Only store owner or admin can reorder tips.' });
    }
    
    // Reorder tips based on provided order
    const tipsMap = new Map(store.savingTips.map(tip => [tip._id.toString(), tip]));
    const reorderedTips = tipIds
      .map(id => tipsMap.get(id.toString()))
      .filter(Boolean); // Remove any not found
    
    // Add any tips not in the reorder list at the end
    const reorderedIds = new Set(tipIds.map(id => id.toString()));
    store.savingTips.forEach(tip => {
      if (!reorderedIds.has(tip._id.toString())) {
        reorderedTips.push(tip);
      }
    });
    
    // Update order values
    reorderedTips.forEach((tip, index) => {
      tip.order = index;
    });
    
    store.savingTips = reorderedTips;
    await store.save();
    
    res.status(200).json({
      message: 'Saving tips reordered successfully.',
      tips: store.savingTips,
    });
  } catch (error) {
    console.error('Error reordering saving tips:', error);
    res.status(500).json({
      message: 'Error reordering saving tips.',
      error: error.message,
    });
  }
};

