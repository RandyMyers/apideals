/**
 * Fix Footer Translation Keys
 * Converts lowercase footer keys to camelCase to match component usage
 * 
 * Usage: node server/scripts/fixFooterTranslationKeys.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Translation = require('../models/translation');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    return false;
  }
};

// Map of lowercase keys to camelCase keys
const keyMappings = {
  'footer.brandtagline': 'footer.brandTagline',
  'footer.branddescription': 'footer.brandDescription',
  'footer.trust.verified': 'footer.trust.verified', // Already correct
  'footer.trust.trusted': 'footer.trust.trusted', // Already correct
  'footer.trust.dailyupdates': 'footer.trust.dailyUpdates',
  'footer.sections.popularstores': 'footer.sections.popularStores',
  'footer.sections.categories': 'footer.sections.categories', // Already correct
  'footer.sections.support': 'footer.sections.support', // Already correct
  'footer.sections.company': 'footer.sections.company', // Already correct
  'footer.links.helpcenter': 'footer.links.helpCenter',
  'footer.links.contactus': 'footer.links.contactUs',
  'footer.links.faqs': 'footer.links.faqs', // Already correct
  'footer.links.submitcoupon': 'footer.links.submitCoupon',
  'footer.links.reportissue': 'footer.links.reportIssue',
  'footer.links.feedback': 'footer.links.feedback', // Already correct
  'footer.links.aboutus': 'footer.links.aboutUs',
  'footer.links.blog': 'footer.links.blog', // Already correct
  'footer.links.partners': 'footer.links.partners', // Already correct
  'footer.newsletter.title': 'footer.newsletter.title', // Already correct
  'footer.newsletter.description': 'footer.newsletter.description', // Already correct
  'footer.newsletter.placeholder': 'footer.newsletter.placeholder', // Already correct
  'footer.newsletter.subscribe': 'footer.newsletter.subscribe', // Already correct
  'footer.social.followus': 'footer.social.followUs',
  'footer.copyright': 'footer.copyright', // Already correct
  'footer.legal.privacy': 'footer.legal.privacy', // Already correct
  'footer.legal.terms': 'footer.legal.terms', // Already correct
  'footer.legal.cookies': 'footer.legal.cookies', // Already correct
  'footer.legal.sitemap': 'footer.legal.sitemap', // Already correct
  'footer.nostores': 'footer.noStores',
  'footer.nocategories': 'footer.noCategories',
};

const fixFooterKeys = async () => {
  try {
    const connected = await connectDB();
    if (!connected) {
      process.exit(1);
    }

    console.log('Fixing footer translation keys...\n');
    let updated = 0;
    let skipped = 0;
    let deleted = 0;

    // Get all footer translations
    const footerTranslations = await Translation.find({ key: /^footer\./i }).lean();

    for (const translation of footerTranslations) {
      const oldKey = translation.key;
      const newKey = keyMappings[oldKey.toLowerCase()] || oldKey;

      // Skip if key is already correct
      if (oldKey === newKey) {
        skipped++;
        continue;
      }

      // Check if camelCase version already exists
      const existing = await Translation.findOne({ key: newKey });
      
      if (existing) {
        // Update existing camelCase version with data from lowercase version
        Object.keys(translation).forEach(key => {
          if (key !== '_id' && key !== '__v' && key !== 'key' && key !== 'createdAt' && key !== 'updatedAt') {
            existing[key] = translation[key];
          }
        });
        await existing.save();
        
        // Delete lowercase version
        await Translation.deleteOne({ _id: translation._id });
        deleted++;
        updated++;
        console.log(`✓ Updated: ${oldKey} → ${newKey}`);
      } else {
        // Rename the key
        await Translation.updateOne(
          { _id: translation._id },
          { $set: { key: newKey } }
        );
        updated++;
        console.log(`✓ Renamed: ${oldKey} → ${newKey}`);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Updated/Renamed: ${updated}`);
    console.log(`Deleted duplicates: ${deleted}`);
    console.log(`Skipped (already correct): ${skipped}`);
    console.log('\n✓ Footer translation keys fixed!');

    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing footer keys:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

fixFooterKeys();

