/**
 * Migrate/update the existing Loveable AI referral deal to the new referral offer schema.
 * Preserves existing content; updates dealType and adds referralOffer.
 *
 * Usage:
 *   node scripts/seedLoveableReferralDeal.js
 *
 * Env vars (optional):
 *   LOVEABLE_DEAL_ID     - Direct deal ID (e.g. 69c0384525c2d70568ed3522)
 *   LOVEABLE_STORE_NAME  - Store name (default: Loveable)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Deal = require('../models/deal');
const Store = require('../models/store');

const REFERRAL_OFFER = {
  refereeReward: {
    type: 'credits',
    value: 10,
    unit: 'credits',
    description: 'Extra 10 credits on sign-up',
  },
  referrerReward: {
    type: 'credits',
    value: 100,
    unit: 'credits',
    condition: 'subscribe_pro',
    conditionDescription: 'When they subscribe to Pro (100 credits/month or above)',
    description: '100 credits when they subscribe to Pro',
  },
  inviteLinkPlaceholder: 'Share your invite link to earn',
};

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB\n');

    let existing = null;

    if (process.env.LOVEABLE_DEAL_ID) {
      existing = await Deal.findById(process.env.LOVEABLE_DEAL_ID).lean();
      if (existing) {
        console.log('Found deal by LOVEABLE_DEAL_ID:', existing._id);
      }
    }

    if (!existing) {
      const store = await Store.findOne({
        name: new RegExp('loveable|lovable', 'i'),
      }).lean();

      if (store) {
        existing = await Deal.findOne({
          store: store._id,
          $or: [
            { name: /credits|invite|referral/i },
            { title: /credits|invite|referral/i },
          ],
        }).lean();
        if (existing) {
          console.log('Found deal by store + name match:', existing._id, '-', existing.name);
        }
      }
    }

    if (!existing) {
      console.error(
        'No Loveable deal found. Run npm run inspect:loveable to list deals, then set LOVEABLE_DEAL_ID=your_deal_id'
      );
      process.exit(1);
    }

    const update = {
      dealType: 'referral_credits',
      referralOffer: REFERRAL_OFFER,
      $unset: { discountType: 1, discountValue: 1 },
      updatedAt: new Date(),
    };

    const updated = await Deal.findByIdAndUpdate(
      existing._id,
      update,
      { new: true, runValidators: true }
    );

    console.log('\nUpdated deal:', updated._id);
    console.log('  dealType:', updated.dealType);
    console.log('  referralOffer.refereeReward:', updated.referralOffer?.refereeReward?.description);
    console.log('  referralOffer.referrerReward:', updated.referralOffer?.referrerReward?.description);
    console.log('\nDone. Content (title, description, highlights, etc.) was preserved.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected.');
  }
}

run();
