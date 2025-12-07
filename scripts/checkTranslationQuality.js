/**
 * Check Translation Quality
 * Identifies translations that are just English copies instead of proper translations
 * 
 * Usage: node server/scripts/checkTranslationQuality.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Translation = require('../models/translation');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('✅ Connected to MongoDB\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
    return false;
  }
};

const checkQuality = async () => {
  const translations = await Translation.find({}).lean();
  
  const newLangs = ['fr', 'pt', 'nl'];
  const issues = {
    fr: [],
    pt: [],
    nl: []
  };
  
  console.log('🔍 Checking translation quality...\n');
  
  translations.forEach(trans => {
    newLangs.forEach(lang => {
      const langValue = trans[lang];
      const enValue = trans.en;
      
      // Check if translation is just English copy
      if (langValue && enValue && langValue.trim() === enValue.trim()) {
        issues[lang].push({
          key: trans.key,
          english: enValue.substring(0, 50),
          translation: langValue.substring(0, 50)
        });
      }
    });
  });
  
  console.log('='.repeat(80));
  console.log('TRANSLATION QUALITY REPORT');
  console.log('='.repeat(80));
  console.log();
  
  newLangs.forEach(lang => {
    const langName = lang === 'fr' ? 'French' : lang === 'pt' ? 'Portuguese' : 'Dutch';
    console.log(`\n📊 ${langName} (${lang}):`);
    console.log(`   ❌ ${issues[lang].length} keys are just English copies`);
    
    if (issues[lang].length > 0) {
      console.log(`\n   Sample keys needing translation:`);
      issues[lang].slice(0, 20).forEach(item => {
        console.log(`   - ${item.key}: "${item.english}"`);
      });
      if (issues[lang].length > 20) {
        console.log(`   ... and ${issues[lang].length - 20} more`);
      }
    }
  });
  
  const totalIssues = issues.fr.length + issues.pt.length + issues.nl.length;
  console.log(`\n\n📊 Total: ${totalIssues} keys need proper translations`);
  console.log(`   French: ${issues.fr.length}`);
  console.log(`   Portuguese: ${issues.pt.length}`);
  console.log(`   Dutch: ${issues.nl.length}`);
  
  return issues;
};

const main = async () => {
  if (await connectDB()) {
    await checkQuality();
    await mongoose.connection.close();
  }
  process.exit(0);
};

main();







