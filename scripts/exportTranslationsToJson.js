/**
 * Export Translations to JSON Files
 *
 * Connects to MongoDB, runs the exact same getTranslationsForLanguage() logic
 * that the API uses, and writes one JSON file per language into:
 *   client/public/locales/{lang}/translation.json
 *
 * After running this script:
 *   1. Verify the files look correct.
 *   2. Update client/src/i18n/translationLoader.js to load from /locales/ (already done).
 *   3. Run deleteAllTranslations.js to remove translations from MongoDB.
 *
 * Usage:
 *   node server/scripts/exportTranslationsToJson.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Translation = require('../models/translation');

const LANGUAGES = ['en', 'en-GB', 'en-AU', 'ga', 'de', 'de-AT', 'es', 'it', 'no', 'fi', 'da', 'sv', 'fr', 'pt', 'nl'];

// Destination: client/public/locales/
const CLIENT_LOCALES_DIR = path.resolve(__dirname, '../../client/public/locales');

async function main() {
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌  No MongoDB URI found. Set MONGO_URL in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅  Connected to MongoDB\n');

  try {
    const totalDocs = await Translation.countDocuments();
    console.log(`📦  ${totalDocs} translation keys found in database.\n`);

    if (totalDocs === 0) {
      console.error('❌  No translations in database. Run the seed scripts first.');
      process.exit(1);
    }

    // Ensure base locales directory exists
    fs.mkdirSync(CLIENT_LOCALES_DIR, { recursive: true });

    for (const lang of LANGUAGES) {
      process.stdout.write(`  Exporting ${lang.padEnd(6)} ... `);

      // Uses the exact same method the API uses
      const translations = await Translation.getTranslationsForLanguage(lang);

      const keyCount = countKeys(translations);

      const langDir = path.join(CLIENT_LOCALES_DIR, lang);
      fs.mkdirSync(langDir, { recursive: true });

      const filePath = path.join(langDir, 'translation.json');
      fs.writeFileSync(filePath, JSON.stringify(translations, null, 2), 'utf8');

      console.log(`✅  ${keyCount} keys  →  client/public/locales/${lang}/translation.json`);
    }

    console.log('\n✅  All languages exported successfully!');
    console.log(`\n📁  Files written to: ${CLIENT_LOCALES_DIR}`);
    console.log('\nNext steps:');
    console.log('  1. The client translationLoader.js has been updated to read from /locales/.');
    console.log('  2. Deploy the client (new JSON files in public/locales/ will be served statically).');
    console.log('  3. To remove translations from MongoDB run:');
    console.log('     node server/scripts/deleteAllTranslations.js\n');

  } finally {
    await mongoose.disconnect();
  }
}

/** Recursively count leaf keys in a nested object */
function countKeys(obj) {
  if (typeof obj !== 'object' || obj === null) return 1;
  return Object.values(obj).reduce((sum, v) => sum + countKeys(v), 0);
}

main().catch((err) => {
  console.error('❌  Export failed:', err.message);
  process.exit(1);
});
