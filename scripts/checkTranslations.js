/**
 * Check Translations in Database
 * Analyzes what translations exist and what's missing for each language
 * 
 * Usage: node server/scripts/checkTranslations.js
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

// All supported languages (using database field names)
const supportedLanguages = ['en', 'ga', 'de', 'es', 'it', 'no', 'fi', 'da', 'sv', 'fr', 'pt', 'nl', 'en-GB', 'en-AU', 'de-AT'];

// Language display names
const languageNames = {
  en: 'English',
  ga: 'Irish',
  de: 'German',
  es: 'Spanish',
  it: 'Italian',
  no: 'Norwegian',
  fi: 'Finnish',
  da: 'Danish',
  sv: 'Swedish',
  fr: 'French',
  pt: 'Portuguese',
  nl: 'Dutch',
  'en-GB': 'English (UK)',
  'en-AU': 'English (Australia)',
  'de-AT': 'German (Austria)'
};

const checkTranslations = async () => {
  try {
    // Get all translations
    const allTranslations = await Translation.find({});
    console.log(`📊 Total translations in database: ${allTranslations.length}\n`);

    // Group by language
    const byLanguage = {};
    const allKeys = new Set();

    // Initialize language objects
    supportedLanguages.forEach(lang => {
      byLanguage[lang] = {
        keys: new Set(),
        count: 0
      };
    });

    // Process each translation
    allTranslations.forEach(trans => {
      allKeys.add(trans.key);
      
      supportedLanguages.forEach(lang => {
        const fieldName = lang; // Use language code directly (already in correct format)
        
        if (trans[fieldName] && trans[fieldName].trim() !== '') {
          byLanguage[lang].keys.add(trans.key);
          byLanguage[lang].count++;
        }
      });
    });

    console.log('='.repeat(80));
    console.log('TRANSLATION COVERAGE BY LANGUAGE');
    console.log('='.repeat(80));
    console.log(`Total unique keys: ${allKeys.size}\n`);

    // Report for each language
    supportedLanguages.forEach(lang => {
      const langData = byLanguage[lang];
      const coverage = ((langData.count / allKeys.size) * 100).toFixed(1);
      const missing = allKeys.size - langData.count;
      
      console.log(`${languageNames[lang]} (${lang}):`);
      console.log(`  ✅ Translated: ${langData.count}/${allKeys.size} (${coverage}%)`);
      console.log(`  ❌ Missing: ${missing} keys`);
      
      // Show missing keys (limit to first 20)
      if (missing > 0) {
        const missingKeys = Array.from(allKeys).filter(key => !langData.keys.has(key));
        console.log(`  Missing keys (showing first 20):`);
        missingKeys.slice(0, 20).forEach(key => {
          console.log(`    - ${key}`);
        });
        if (missingKeys.length > 20) {
          console.log(`    ... and ${missingKeys.length - 20} more`);
        }
      }
      console.log('');
    });

    // Find keys that are missing in new languages
    console.log('='.repeat(80));
    console.log('MISSING TRANSLATIONS FOR NEW LANGUAGES');
    console.log('='.repeat(80));
    const newLanguages = ['fr', 'pt', 'nl', 'en-GB', 'en-AU', 'de-AT'];
    
    newLanguages.forEach(lang => {
      const langData = byLanguage[lang];
      const missingKeys = Array.from(allKeys).filter(key => !langData.keys.has(key));
      
      if (missingKeys.length > 0) {
        console.log(`\n${languageNames[lang]} (${lang}) - Missing ${missingKeys.length} keys:`);
        
        // Group by category if possible
        const byCategory = {};
        missingKeys.forEach(key => {
          const category = key.split('.')[0] || 'other';
          if (!byCategory[category]) {
            byCategory[category] = [];
          }
          byCategory[category].push(key);
        });
        
        Object.keys(byCategory).sort().forEach(category => {
          console.log(`  ${category}: ${byCategory[category].length} missing`);
          byCategory[category].slice(0, 5).forEach(key => {
            console.log(`    - ${key}`);
          });
          if (byCategory[category].length > 5) {
            console.log(`    ... and ${byCategory[category].length - 5} more`);
          }
        });
      } else {
        console.log(`\n✅ ${languageNames[lang]} (${lang}) - All keys translated!`);
      }
    });

    // Check specific missing keys mentioned in console
    console.log('\n' + '='.repeat(80));
    console.log('CHECKING SPECIFIC MISSING KEYS FROM CONSOLE');
    console.log('='.repeat(80));
    const specificKeys = [
      'deals.filter.activeOnly',
      'deals.resultsInfo',
      'footer.brandTagline',
      'footer.brandDescription'
    ];

    specificKeys.forEach(key => {
      const trans = allTranslations.find(t => t.key === key);
      if (!trans) {
        console.log(`❌ Key "${key}" does not exist in database`);
      } else {
        console.log(`\nKey: ${key}`);
        newLanguages.forEach(lang => {
          const fieldName = lang === 'enGB' ? 'enGB' : 
                           lang === 'enAU' ? 'enAU' : 
                           lang === 'deAT' ? 'deAT' : lang;
          const value = trans[fieldName];
          if (value && value.trim() !== '') {
            console.log(`  ✅ ${lang}: "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);
          } else {
            console.log(`  ❌ ${lang}: MISSING`);
          }
        });
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total keys in database: ${allKeys.size}`);
    newLanguages.forEach(lang => {
      const langData = byLanguage[lang];
      const missing = allKeys.size - langData.count;
      console.log(`${languageNames[lang]}: ${langData.count}/${allKeys.size} (${missing} missing)`);
    });

  } catch (error) {
    console.error('❌ Error checking translations:', error);
  }
};

const main = async () => {
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }

  await checkTranslations();

  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
};

main();
