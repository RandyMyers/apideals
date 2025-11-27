/**
 * Check Translations in Database
 * Lists all translations stored in the database
 * 
 * Usage: node server/scripts/checkTranslations.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const mongoose = require('mongoose');
const Translation = require('../models/translation');

// Connect to MongoDB using the same method as app.js
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('✓ Connected to MongoDB\n');
    return true;
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error.message);
    return false;
  }
};

const checkTranslations = async () => {
  try {
    // Get total count
    const totalCount = await Translation.countDocuments();
    console.log(`Total Translations: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('No translations found in database.');
      return;
    }

    // Get translations grouped by category
    const translations = await Translation.find({}).sort({ category: 1, key: 1 }).lean();
    
    // Group by category
    const byCategory = {};
    translations.forEach(t => {
      if (!byCategory[t.category]) {
        byCategory[t.category] = [];
      }
      byCategory[t.category].push(t);
    });

    // Display by category
    console.log('='.repeat(80));
    console.log('TRANSLATIONS BY CATEGORY');
    console.log('='.repeat(80));
    console.log();

    Object.keys(byCategory).sort().forEach(category => {
      const categoryTranslations = byCategory[category];
      console.log(`\n📁 ${category.toUpperCase()} (${categoryTranslations.length} keys)`);
      console.log('-'.repeat(80));
      
      categoryTranslations.forEach(t => {
        console.log(`\n  Key: ${t.key}`);
        console.log(`  Description: ${t.description || 'N/A'}`);
        console.log(`  Context: ${t.context || 'N/A'}`);
        console.log(`  Languages:`);
        
        // List all language translations
        const languages = ['en', 'ga', 'de', 'es', 'it', 'no', 'fi', 'da', 'sv'];
        languages.forEach(lang => {
          if (t[lang]) {
            console.log(`    ${lang.toUpperCase()}: ${t[lang]}`);
          }
        });
      });
    });

    // Summary by language
    console.log('\n\n' + '='.repeat(80));
    console.log('TRANSLATION COVERAGE BY LANGUAGE');
    console.log('='.repeat(80));
    console.log();

    const languages = ['en', 'ga', 'de', 'es', 'it', 'no', 'fi', 'da', 'sv'];
    const languageNames = {
      en: 'English',
      ga: 'Irish (Gaeilge)',
      de: 'German (Deutsch)',
      es: 'Spanish (Español)',
      it: 'Italian (Italiano)',
      no: 'Norwegian (Norsk)',
      fi: 'Finnish (Suomi)',
      da: 'Danish (Dansk)',
      sv: 'Swedish (Svenska)'
    };

    languages.forEach(lang => {
      const count = translations.filter(t => t[lang] && t[lang].trim() !== '').length;
      const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0;
      const bar = '█'.repeat(Math.floor(percentage / 2));
      console.log(`  ${languageNames[lang].padEnd(25)} ${count.toString().padStart(4)}/${totalCount} (${percentage.padStart(5)}%) ${bar}`);
    });

    // Missing translations
    console.log('\n\n' + '='.repeat(80));
    console.log('MISSING TRANSLATIONS');
    console.log('='.repeat(80));
    console.log();

    let hasMissing = false;
    languages.forEach(lang => {
      const missing = translations.filter(t => !t[lang] || t[lang].trim() === '');
      if (missing.length > 0) {
        hasMissing = true;
        console.log(`\n  ${languageNames[lang]} - Missing ${missing.length} translations:`);
        missing.slice(0, 10).forEach(t => {
          console.log(`    - ${t.key} (${t.category})`);
        });
        if (missing.length > 10) {
          console.log(`    ... and ${missing.length - 10} more`);
        }
      }
    });

    if (!hasMissing) {
      console.log('  ✓ All translations are complete!');
    }

    // Export option
    console.log('\n\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`  Total Keys: ${totalCount}`);
    console.log(`  Categories: ${Object.keys(byCategory).length}`);
    console.log(`  Languages: ${languages.length}`);

  } catch (error) {
    console.error('Error checking translations:', error);
  }
};

// Main execution
const main = async () => {
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }

  await checkTranslations();

  // Close connection
  await mongoose.connection.close();
  console.log('\n✓ Database connection closed');
  process.exit(0);
};

main();

