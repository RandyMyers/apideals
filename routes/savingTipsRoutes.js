const express = require('express');
const router = express.Router();
const savingTipsController = require('../controllers/savingTipsController');
const authMiddleware = require('../middleware/authMiddleware');

// Get saving tips for a store (public)
router.get('/:storeId/saving-tips', savingTipsController.getSavingTips);

// Add saving tip (authenticated + admin/store owner)
router.post('/:storeId/saving-tips', authMiddleware, savingTipsController.addSavingTip);

// Update saving tip (authenticated + admin/store owner)
router.patch('/:storeId/saving-tips/:tipId', authMiddleware, savingTipsController.updateSavingTip);

// Delete saving tip (authenticated + admin/store owner)
router.delete('/:storeId/saving-tips/:tipId', authMiddleware, savingTipsController.deleteSavingTip);

// Reorder saving tips (authenticated + admin/store owner)
router.patch('/:storeId/saving-tips/reorder', authMiddleware, savingTipsController.reorderSavingTips);

module.exports = router;

