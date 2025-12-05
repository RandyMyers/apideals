/**
 * Add All Missing Translations for New Languages
 * Adds translations for fr, pt, nl, enGB, enAU, deAT to ALL existing keys
 * Uses fallback strategy:
 * - enGB/enAU: Use English (en) as fallback
 * - deAT: Use German (de) as fallback, or English if German missing
 * - fr/pt/nl: Use English (en) as fallback (better than nothing)
 * 
 * Usage: node server/scripts/addAllMissingTranslations.js
 */

const path = require('path');
// Load .env from server directory (one level up from this script)
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const Translation = require('../models/translation');

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URL) {
      throw new Error('MONGO_URL is not defined in environment variables');
    }
    await mongoose.connect(process.env.MONGO_URL, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('✅ Connected to MongoDB\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return false;
  }
};

const addAllMissingTranslations = async () => {
  try {
    console.log('🔍 Finding all translations with missing new language fields...\n');

    // Get all translations
    const allTranslations = await Translation.find({});
    console.log(`📊 Found ${allTranslations.length} translations in database\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    const stats = {
      fr: { added: 0, skipped: 0 },
      pt: { added: 0, skipped: 0 },
      nl: { added: 0, skipped: 0 },
      'en-GB': { added: 0, skipped: 0 },
      'en-AU': { added: 0, skipped: 0 },
      'de-AT': { added: 0, skipped: 0 },
    };

    // Process each translation
    for (const trans of allTranslations) {
      const updates = {};
      let hasUpdates = false;

      // Check each new language
      const newLanguages = [
        { code: 'fr', fallback: 'en', name: 'French' },
        { code: 'pt', fallback: 'en', name: 'Portuguese' },
        { code: 'nl', fallback: 'en', name: 'Dutch' },
        { code: 'en-GB', fallback: 'en', name: 'English (UK)' },
        { code: 'en-AU', fallback: 'en', name: 'English (Australia)' },
        { code: 'de-AT', fallback: 'de', name: 'German (Austria)' },
      ];

      for (const lang of newLanguages) {
        const fieldName = lang.code;
        const currentValue = trans[fieldName];
        
        // Skip if already has translation
        if (currentValue && currentValue.trim() !== '') {
          stats[fieldName].skipped++;
          continue;
        }

        // Get fallback value
        let fallbackValue = null;
        
        if (lang.fallback === 'en' && trans.en && trans.en.trim() !== '') {
          fallbackValue = trans.en;
        } else if (lang.fallback === 'de' && trans.de && trans.de.trim() !== '') {
          fallbackValue = trans.de;
        } else if (lang.fallback === 'de' && trans.en && trans.en.trim() !== '') {
          // If German is missing, use English as fallback for de-AT
          fallbackValue = trans.en;
        }

        if (fallbackValue) {
          updates[fieldName] = fallbackValue;
          stats[fieldName].added++;
          hasUpdates = true;
        } else {
          stats[fieldName].skipped++;
          console.log(`⚠️  No fallback for ${trans.key} in ${lang.name} (no ${lang.fallback} translation)`);
        }
      }

      // Update if there are changes
      if (hasUpdates) {
        await Translation.updateOne(
          { _id: trans._id },
          { $set: updates }
        );
        updatedCount++;
        
        if (updatedCount % 50 === 0) {
          console.log(`📝 Progress: Updated ${updatedCount} translations...`);
        }
      } else {
        skippedCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Updated: ${updatedCount} translations`);
    console.log(`⏭️  Skipped: ${skippedCount} translations (already complete)\n`);

    console.log('Breakdown by language:');
    Object.keys(stats).forEach(langCode => {
      const langName = langCode === 'en-GB' ? 'English (UK)' :
                      langCode === 'en-AU' ? 'English (Australia)' :
                      langCode === 'de-AT' ? 'German (Austria)' :
                      langCode === 'fr' ? 'French' :
                      langCode === 'pt' ? 'Portuguese' :
                      langCode === 'nl' ? 'Dutch' : langCode;
      console.log(`  ${langName} (${langCode}):`);
      console.log(`    ✅ Added: ${stats[langCode].added}`);
      console.log(`    ⏭️  Skipped: ${stats[langCode].skipped} (already had translation)`);
    });

    console.log('\n✨ Done! All missing translations have been added using fallback strategy.');
    console.log('Note: For fr/pt/nl, English was used as fallback. You may want to add proper translations later.');

  } catch (error) {
    console.error('❌ Error adding missing translations:', error);
    throw error;
  }
};

const main = async () => {
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }

  try {
    await addAllMissingTranslations();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }

  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
};

main();

