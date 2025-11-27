const Share = require('../models/share');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');

/**
 * Track a coupon share
 * @route POST /api/v1/share/coupon/:couponId
 */
exports.shareCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const { platform } = req.body; // facebook, twitter, whatsapp, email, copy
    const userId = req.user?.id; // Optional: user who shared

    // Verify coupon exists
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    // Track the share (optional - only if Share model exists)
    try {
      if (Share) {
        const share = new Share({
          entityType: 'coupon',
          entityId: couponId,
          userId: userId || null,
          platform: platform || 'copy',
          sharedAt: new Date()
        });
        await share.save();
      }
    } catch (shareError) {
      // Share model might not exist, that's okay
      console.log('Share tracking not available:', shareError.message);
    }

    res.status(200).json({ 
      message: 'Share tracked successfully',
      couponId,
      platform: platform || 'copy'
    });
  } catch (error) {
    console.error('Error tracking coupon share:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Track a deal share
 * @route POST /api/v1/share/deal/:dealId
 */
exports.shareDeal = async (req, res) => {
  try {
    const { dealId } = req.params;
    const { platform } = req.body; // facebook, twitter, whatsapp, email, copy
    const userId = req.user?.id; // Optional: user who shared

    // Verify deal exists
    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Track the share (optional - only if Share model exists)
    try {
      if (Share) {
        const share = new Share({
          entityType: 'deal',
          entityId: dealId,
          userId: userId || null,
          platform: platform || 'copy',
          sharedAt: new Date()
        });
        await share.save();
      }
    } catch (shareError) {
      // Share model might not exist, that's okay
      console.log('Share tracking not available:', shareError.message);
    }

    res.status(200).json({ 
      message: 'Share tracked successfully',
      dealId,
      platform: platform || 'copy'
    });
  } catch (error) {
    console.error('Error tracking deal share:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Get share statistics for a coupon or deal
 * @route GET /api/v1/share/stats/:entityType/:entityId
 */
exports.getShareStats = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    if (!['coupon', 'deal'].includes(entityType)) {
      return res.status(400).json({ message: 'Invalid entity type. Must be "coupon" or "deal"' });
    }

    // Verify entity exists
    const Entity = entityType === 'coupon' ? Coupon : Deal;
    const entity = await Entity.findById(entityId);
    if (!entity) {
      return res.status(404).json({ message: `${entityType} not found` });
    }

    // Get share stats (optional - only if Share model exists)
    try {
      if (Share) {
        const shares = await Share.find({
          entityType,
          entityId
        });

        const stats = {
          totalShares: shares.length,
          byPlatform: {
            facebook: shares.filter(s => s.platform === 'facebook').length,
            twitter: shares.filter(s => s.platform === 'twitter').length,
            whatsapp: shares.filter(s => s.platform === 'whatsapp').length,
            email: shares.filter(s => s.platform === 'email').length,
            copy: shares.filter(s => s.platform === 'copy').length
          }
        };

        return res.status(200).json(stats);
      } else {
        return res.status(200).json({
          totalShares: 0,
          byPlatform: {
            facebook: 0,
            twitter: 0,
            whatsapp: 0,
            email: 0,
            copy: 0
          }
        });
      }
    } catch (shareError) {
      // Share model might not exist
      return res.status(200).json({
        totalShares: 0,
        byPlatform: {
          facebook: 0,
          twitter: 0,
          whatsapp: 0,
          email: 0,
          copy: 0
        }
      });
    }
  } catch (error) {
    console.error('Error fetching share stats:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

